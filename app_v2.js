// 模擬後端 API (如果在本地測試沒有開 FastAPI，可以先用假資料，若有則 fetch)
const API_URL = 'https://line-oa-backend-api.onrender.com/api/calculate'; // 修改成實際後端網址
// 之後請換成真實的 LIFF ID (例如 1234567890-abcdefg)
const LIFF_ID = '2009266916-K37D2gsC';

let userLineId = null;
let userLineName = null; // 新增：用來記錄 LINE 暱稱
let lastCalculationResult = null; // 儲存最後一次試算的完整資料，供關閉時回傳用

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 初始化 LIFF
    try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            userLineId = profile.userId;
            userLineName = profile.displayName;
            console.log("登入成功，User ID:", userLineId, "User Name:", userLineName);
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
            monthly_basic_expense: parseFloat(document.getElementById('monthly_basic_expense').value),
            monthly_fun_expense: parseFloat(document.getElementById('monthly_fun_expense').value) || 0,
            monthly_saving: parseFloat(document.getElementById('monthly_saving').value),
            current_saving: parseFloat(document.getElementById('current_saving').value),
            user_id: userLineId, // 若有成功取得就會送出字串，負責給後端 push_message
            user_name: userLineName, // LINE 暱稱
            max_age: 90,
            interest_rate: 0.017
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
                lastCalculationResult = data; // 備存結果
            } else {
                throw new Error("API failed");
            }

            showResult(data);
            // 立即將折線圖推送給 LINE （不等關閉按鈕）
            sendChartToLine(data);
        } catch (error) {
            console.warn("無法連接後端，使用前端預設計算作為展示備案", error);
            const mockData = fallbackCalculate(payload);
            lastCalculationResult = mockData;
            showResult(mockData);
            // Fallback 時也嘗試推送
            sendChartToLine(mockData);
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    });

    // 將折線圖試算結果 push 給 LINE
    function sendChartToLine(data) {
        if (!userLineId || !data) return;
        const SEND_RESULT_API = API_URL.replace('/calculate', '/send_result');
        fetch(SEND_RESULT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userLineId,
                result: {
                    total_need_basic: data.total_need_basic,
                    total_need_with_fun: data.total_need_with_fun,
                    total_fund: data.total_fund,
                    gap: data.gap,
                    crossover_age: data.crossover_age || null
                },
                history: data.history,
                max_age: 90,
                interest_rate: 0.017
            })
        })
            .then(res => console.log("Chart push status:", res.status))
            .catch(err => console.warn("推送折線圖失敗", err));
    }

    // 3. 關閉按鈕 (第一階段)
    closeBtn.addEventListener('click', async () => {
        await closeLiffOrHide();
    });



    async function closeLiffOrHide() {
        if (liff.isInClient()) {
            liff.closeWindow();
        } else {
            resultContainer.classList.add('hidden');
        }
    }
});

let myChart = null; // 儲存圖表實例

function showResult(data) {
    const formatCurrency = (num) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(num);

    document.getElementById('res-need-basic').innerText = formatCurrency(data.total_need_basic);
    document.getElementById('res-need-all').innerText = formatCurrency(data.total_need_with_fun);
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

    // 更新圖表提示文字（顯示交叉點年齡）
    const hintEl = document.getElementById('chart-hint-text');
    if (data.crossover_age) {
        hintEl.innerText = `當綠色線（存款）與橘色線（需求）交叉時，代表存款即將用盡。依您目前的規劃，約在 ${data.crossover_age} 歲時存款將不足以支應退休開銷。`;
    } else {
        hintEl.innerText = '恭喜！依您目前的規劃，存款預估可支撐退休生活至 90 歲。';
    }

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
                    borderColor: 'rgba(16, 185, 129, 1)', /* --accent color (Green) */
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: '退休總需求 (僅生活)',
                    data: hist.needs_basic,
                    borderColor: 'rgba(59, 130, 246, 1)', /* Blue */
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderWidth: 3,
                    borderDash: [3, 3],
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: '退休總需求 (含娛樂)',
                    data: hist.needs_with_fun,
                    borderColor: 'rgba(245, 158, 11, 1)', /* --primary color (Orange) */
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderWidth: 3,
                    borderDash: [5, 5],
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
    const MAX_AGE = 90;
    const yearsAlive = MAX_AGE - p.current_age;
    const yearsToRetire = p.retire_age - p.current_age;

    let history_ages = [p.current_age];
    let history_funds = [p.current_saving];
    let history_needs_basic = [0];
    let history_needs_with_fun = [0];

    let totalFund = p.current_saving;
    let totalNeedBasic = 0;
    let totalNeedWithFun = 0;

    for (let y = 1; y <= yearsAlive; y++) {
        let currentYearAge = p.current_age + y;

        totalFund *= 1.017;
        if (y <= yearsToRetire) totalFund += p.monthly_saving * 12;

        if (y > yearsToRetire) {
            let yearsInRetirement = y - yearsToRetire;
            let inf = Math.pow(1.03, yearsInRetirement);
            let basicExp = (p.monthly_basic_expense * 12) * inf;
            let funExp = (p.monthly_fun_expense * 12) * inf;

            totalNeedBasic += basicExp;
            totalNeedWithFun += (basicExp + funExp);
        }

        history_ages.push(currentYearAge);
        history_funds.push(Math.round(totalFund));
        history_needs_basic.push(Math.round(totalNeedBasic));
        history_needs_with_fun.push(Math.round(totalNeedWithFun));
    }

    // 找出交叉點年齡
    let crossoverAge = null;
    for (let i = 1; i < history_ages.length; i++) {
        if (history_needs_with_fun[i] > 0 && history_needs_with_fun[i] >= history_funds[i]) {
            crossoverAge = history_ages[i];
            break;
        }
    }

    return {
        total_need_basic: Math.round(totalNeedBasic),
        total_need_with_fun: Math.round(totalNeedWithFun),
        total_fund: Math.round(totalFund),
        gap: Math.round(Math.max(0, totalNeedWithFun - totalFund)),
        crossover_age: crossoverAge,
        history: {
            ages: history_ages,
            funds: history_funds,
            needs_basic: history_needs_basic,
            needs_with_fun: history_needs_with_fun
        }
    };
}
