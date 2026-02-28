// 模擬後端 API (如果在本地測試沒有開 FastAPI，可以先用假資料，若有則 fetch)
const API_URL = 'https://line-oa-backend-api.onrender.com/api/calculate'; // 修改成實際後端網址
// 之後請換成真實的 LIFF ID (例如 1234567890-abcdefg)
const LIFF_ID = '2009193152-ydz5o3uz';

let userLineId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 初始化 LIFF
    try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            userLineId = profile.userId;
            console.log("登入成功，User ID:", userLineId);
        } else {
            console.log("未登入 LINE (例如在外部瀏覽器開啟)");
            // 視需求可呼叫 liff.login() 強制登入
        }
    } catch (err) {
        console.warn("LIFF 初始化失敗 (請確認是否在 HTTPS 或正確綁定 ID):", err);
    }

    const form = document.getElementById('calc-form');
    const btn = document.getElementById('submit-btn');
    const resultContainer = document.getElementById('result-container');
    const closeBtn = document.getElementById('close-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 進入 loading 狀態
        btn.classList.add('loading');
        btn.disabled = true;

        // 取出表單資料
        const payload = {
            current_age: parseInt(document.getElementById('current_age').value, 10),
            retire_age: parseInt(document.getElementById('retire_age').value, 10),
            monthly_expense: parseFloat(document.getElementById('monthly_expense').value),
            monthly_saving: parseFloat(document.getElementById('monthly_saving').value),
            current_saving: parseFloat(document.getElementById('current_saving').value),
            user_id: userLineId // 若有成功取得就會送出字串，負責給後端 push_message
        };

        try {
            // 呼叫後端 API
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let data;
            if (response.ok) {
                data = await response.json();
            } else {
                // 如果後端沒開，先用假計算邏輯展示 UI
                throw new Error("API failed");
            }

            showResult(data);
        } catch (error) {
            console.warn("無法連接後端，使用前端預設計算作為展示備案", error);
            // Fallback 前端簡易計算 (供開發中展示使用)
            const mockData = fallbackCalculate(payload);
            showResult(mockData);
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    });

    // 3. 關閉按鈕 (回傳或結束)
    closeBtn.addEventListener('click', () => {
        // 若在 LINE App 內開啟，直接關閉 LIFF 視窗回到對話
        if (liff.isInClient()) {
            liff.closeWindow();
        } else {
            // 若為一般瀏覽器，則暫時隱藏結果展示區塊讓使用者能繼續點擊
            resultContainer.classList.add('hidden');
        }
    });
});

let myChart = null; // 儲存圖表實例

function showResult(data) {
    const formatCurrency = (num) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(num);

    document.getElementById('res-need').innerText = formatCurrency(data.total_need);
    document.getElementById('res-fund').innerText = formatCurrency(data.total_fund);
    document.getElementById('res-gap').innerText = formatCurrency(data.gap);

    // 依據缺口狀況換顏色
    const gapCard = document.getElementById('res-gap').parentElement;
    if (data.gap <= 0) {
        gapCard.classList.remove('highlight');
        gapCard.style.borderColor = "var(--accent)";
        gapCard.style.background = "rgba(16, 185, 129, 0.1)";
        document.getElementById('res-gap').style.color = "var(--accent)";
    } else {
        gapCard.classList.add('highlight');
        gapCard.style.borderColor = "";
        gapCard.style.background = "";
        document.getElementById('res-gap').style.color = "";
    }

    renderChart(data);

    document.getElementById('result-container').classList.remove('hidden');
    // 捲動至結果
    setTimeout(() => {
        document.getElementById('result-container').scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
}

function renderChart(data) {
    const ctx = document.getElementById('resultChart').getContext('2d');

    // 如果圖表已存在，需要先銷毀才能重新繪製
    if (myChart) {
        myChart.destroy();
    }

    const hist = data.history || { ages: [], funds: [], needs: [] };

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hist.ages,
            datasets: [
                {
                    label: '預估實際存款累積',
                    data: hist.funds,
                    borderColor: 'rgba(16, 185, 129, 1)', /* --accent color */
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4 /* slightly more wavy */
                },
                {
                    label: '退休總需求累積',
                    data: hist.needs,
                    borderColor: 'rgba(245, 158, 11, 1)', /* --primary color */
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderWidth: 3,
                    borderDash: [5, 5], /* sketchy dashed line */
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#4a4036', font: { family: "'Mali', 'Noto Sans TC', sans-serif", weight: 'bold' } }
                },
                tooltip: {
                    titleFont: { family: "'Mali', 'Noto Sans TC', sans-serif" },
                    bodyFont: { family: "'Mali', 'Noto Sans TC', sans-serif" },
                    callbacks: {
                        label: function (context) {
                            let value = context.raw || 0;
                            return context.dataset.label + ': NT$ ' + new Intl.NumberFormat('zh-TW').format(value);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(74, 64, 54, 0.05)', borderDash: [4, 4] },
                    ticks: {
                        color: '#8c7e6c',
                        font: { family: "'Mali', sans-serif" },
                        callback: function (value) {
                            if (value >= 100000000) return (value / 100000000).toFixed(1) + ' 億';
                            if (value >= 10000) return (value / 10000).toFixed(0) + ' 萬';
                            return value;
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#8c7e6c',
                        font: { family: "'Mali', sans-serif" },
                        maxTicksLimit: 10,
                        callback: function (value, index, values) {
                            return this.getLabelForValue(value) + ' 歲';
                        }
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

function fallbackCalculate(p) {
    const MAX_AGE = 100;
    const yearsAlive = MAX_AGE - p.current_age;
    const yearsToRetire = p.retire_age - p.current_age;

    let history_ages = [p.current_age];
    let history_funds = [p.current_saving];
    let history_needs = [0];

    let totalFund = p.current_saving;
    let totalNeed = 0;

    for (let y = 1; y <= yearsAlive; y++) {
        let currentYearAge = p.current_age + y;

        totalFund *= 1.015;
        if (y <= yearsToRetire) totalFund += p.monthly_saving * 12;

        if (y > yearsToRetire) {
            let yearsInRetirement = y - yearsToRetire;
            totalNeed += (p.monthly_expense * 12) * Math.pow(1.03, yearsInRetirement);
        }

        history_ages.push(currentYearAge);
        history_funds.push(Math.round(totalFund));
        history_needs.push(Math.round(totalNeed));
    }

    return {
        total_need: Math.round(totalNeed),
        total_fund: Math.round(totalFund),
        gap: Math.round(Math.max(0, totalNeed - totalFund)),
        history: {
            ages: history_ages,
            funds: history_funds,
            needs: history_needs
        }
    };
}
