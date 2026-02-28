// 模擬後端 API (如果在本地測試沒有開 FastAPI，可以先用假資料，若有則 fetch)
const API_URL = 'https://line-oa-backend-api.onrender.com/api/calculate'; // 修改成實際後端網址
// 之後請換成真實的 LIFF ID (例如 1234567890-abcdefg)
const LIFF_ID = '2009193152-ydz5o3uz';

let userLineId = null;
let lastCalculationResult = null; // 儲存最後一次試算的完整資料，供關閉時回傳用

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

    // 第二階段相關
    const nextStepBtn = document.getElementById('next-step-btn');
    const prefContainer = document.getElementById('preference-container');
    const prefForm = document.getElementById('pref-form');
    const prefSubmitBtn = document.getElementById('pref-submit-btn');
    const prefBackBtn = document.getElementById('pref-back-btn');
    const prefError = document.getElementById('pref-error');
    const profileResultContainer = document.getElementById('profile-result-container');
    const finalCloseBtn = document.getElementById('final-close-btn');

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
                    gap: data.gap
                },
                history: data.history
            })
        })
            .then(res => console.log("Chart push status:", res.status))
            .catch(err => console.warn("推送折線圖失敗", err));
    }

    // 3. 關閉按鈕 (第一階段)
    closeBtn.addEventListener('click', async () => {
        await closeLiffOrHide();
    });

    // === 第二階段：投資理財偏好 ===

    // 點擊「進一步了解」，隱藏結果，顯示投資表單
    nextStepBtn.addEventListener('click', () => {
        resultContainer.classList.add('hidden');
        prefContainer.classList.remove('hidden');
        prefContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // 點擊「返回上一步」，隱藏投資表單，顯示原本結果
    prefBackBtn.addEventListener('click', () => {
        prefContainer.classList.add('hidden');
        profileResultContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // 送出投資理財偏好表單
    prefForm.addEventListener('submit', (e) => {
        e.preventDefault();

        prefSubmitBtn.classList.add('loading');
        prefSubmitBtn.disabled = true;
        prefError.classList.add('hidden');

        // 取得輸入值
        const stock = parseFloat(document.getElementById('pref_stock').value) || 0;
        const fund = parseFloat(document.getElementById('pref_fund').value) || 0;
        const insurance = parseFloat(document.getElementById('pref_insurance').value) || 0;
        const demand = parseFloat(document.getElementById('pref_demand').value) || 0;
        const time = parseFloat(document.getElementById('pref_time').value) || 0;

        const total = stock + fund + insurance + demand + time;

        // 模擬短暫 loading 感
        setTimeout(() => {
            prefSubmitBtn.classList.remove('loading');
            prefSubmitBtn.disabled = false;

            if (Math.abs(total - 100) > 0.01) {
                // 檢查是否為 100%
                prefError.classList.remove('hidden');
                return;
            }

            // 計算邏輯
            const highRisk = stock + fund;
            const lowRisk = insurance + demand + time;

            let profileName = "穩健型";
            let profileColor = "var(--primary)"; // 橘黃色
            let profileBgColor = "rgba(245, 158, 11, 0.1)";
            let profileImgSrc = "./images/robust.jpg";

            if (highRisk >= 60 && lowRisk <= 40) {
                profileName = "積極型";
                profileColor = "var(--danger)"; // 紅色
                profileBgColor = "rgba(239, 68, 68, 0.1)";
                profileImgSrc = "./images/aggressive.jpg";
            } else if (highRisk <= 40 && lowRisk >= 60) {
                profileName = "保守型";
                profileColor = "var(--accent)"; // 綠色
                profileBgColor = "rgba(16, 185, 129, 0.1)";
                profileImgSrc = "./images/conservative.jpg";
            }

            // 顯示結果
            const resProfileEl = document.getElementById('res-profile');
            const profileCard = document.getElementById('profile-card');
            const profileImg = document.getElementById('profile-img');

            resProfileEl.innerText = profileName;
            resProfileEl.style.color = profileColor;
            profileCard.style.borderColor = profileColor;
            profileCard.style.backgroundColor = profileBgColor;

            // 顯示圖片
            profileImg.src = profileImgSrc;
            profileImg.classList.remove('hidden');

            prefContainer.classList.add('hidden');
            profileResultContainer.classList.remove('hidden');
            profileResultContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });

            // 若有 user ID，則呼叫後端 API 傳送圖片給 User
            if (userLineId) {
                const profilePayload = {
                    user_id: userLineId,
                    profile_type: profileName,
                    image_url: `https://bill8345.github.io/line-oa-insurance-development/images/${profileImgSrc.split('/').pop()}`
                };

                const SEND_PROFILE_API = API_URL.replace('/calculate', '/send_profile');

                fetch(SEND_PROFILE_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profilePayload)
                }).catch(err => console.warn("Failed to push profile to LINE", err));
            }

        }, 500);
    });

    // 關閉按鈕 (最終階段)
    finalCloseBtn.addEventListener('click', async () => {
        await closeLiffOrHide();
    });

    async function closeLiffOrHide() {
        if (liff.isInClient()) {
            liff.closeWindow();
        } else {
            resultContainer.classList.add('hidden');
            prefContainer.classList.add('hidden');
            profileResultContainer.classList.add('hidden');
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
    const MAX_AGE = 100;
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

        totalFund *= 1.015;
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

    return {
        total_need_basic: Math.round(totalNeedBasic),
        total_need_with_fun: Math.round(totalNeedWithFun),
        total_fund: Math.round(totalFund),
        gap: Math.round(Math.max(0, totalNeedWithFun - totalFund)),
        history: {
            ages: history_ages,
            funds: history_funds,
            needs_basic: history_needs_basic,
            needs_with_fun: history_needs_with_fun
        }
    };
}
