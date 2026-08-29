// 網頁版（QR code 入口）：不經 LINE，試算全在前端完成，不呼叫後端、不寫入 Google Sheets。
// 到期後整頁改顯示失效畫面；要延期只需改這個時間並重新 push。
const EXPIRE_AT = new Date('2026-09-05T23:59:59+08:00');

const MAX_AGE = 100;
const INTEREST_RATE = 0.015;
const INFLATION_RATE = 0.03;

document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById('main-container');
    const expiredContainer = document.getElementById('expired-container');

    if (new Date() > EXPIRE_AT) {
        mainContainer.classList.add('hidden');
        expiredContainer.classList.remove('hidden');
        return;
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        btn.classList.add('loading');
        btn.disabled = true;

        const payload = {
            current_age: parseInt(document.getElementById('current_age').value, 10),
            retire_age: parseInt(document.getElementById('retire_age').value, 10),
            monthly_basic_expense: parseFloat(document.getElementById('monthly_basic_expense').value),
            monthly_fun_expense: parseFloat(document.getElementById('monthly_fun_expense').value) || 0,
            monthly_saving: parseFloat(document.getElementById('monthly_saving').value),
            current_saving: parseFloat(document.getElementById('current_saving').value)
        };

        // 保留短暫 loading 感，避免結果瞬間跳出來像沒算過
        setTimeout(() => {
            showResult(calculateRetirementPlan(payload));
            btn.classList.remove('loading');
            btn.disabled = false;
        }, 300);
    });

    closeBtn.addEventListener('click', restart);
    finalCloseBtn.addEventListener('click', restart);

    // === 第二階段：投資理財偏好 ===

    nextStepBtn.addEventListener('click', () => {
        resultContainer.classList.add('hidden');
        prefContainer.classList.remove('hidden');
        prefContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    prefBackBtn.addEventListener('click', () => {
        prefContainer.classList.add('hidden');
        profileResultContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    prefForm.addEventListener('submit', (e) => {
        e.preventDefault();

        prefSubmitBtn.classList.add('loading');
        prefSubmitBtn.disabled = true;
        prefError.classList.add('hidden');

        const stock = parseFloat(document.getElementById('pref_stock').value) || 0;
        const fund = parseFloat(document.getElementById('pref_fund').value) || 0;
        const insurance = parseFloat(document.getElementById('pref_insurance').value) || 0;
        const demand = parseFloat(document.getElementById('pref_demand').value) || 0;
        const time = parseFloat(document.getElementById('pref_time').value) || 0;
        const crypto = parseFloat(document.getElementById('pref_crypto').value) || 0;

        const total = stock + fund + insurance + demand + time + crypto;

        setTimeout(() => {
            prefSubmitBtn.classList.remove('loading');
            prefSubmitBtn.disabled = false;

            if (Math.abs(total - 100) > 0.01) {
                prefError.classList.remove('hidden');
                return;
            }

            const highRisk = stock + fund + crypto;
            const lowRisk = insurance + demand + time;

            let profileName = "穩健型";
            let profileColor = "var(--primary)";
            let profileBgColor = "rgba(245, 158, 11, 0.1)";
            let profileImgSrc = "./images/robust.jpg";

            if (highRisk >= 60 && lowRisk <= 40) {
                profileName = "積極型";
                profileColor = "var(--danger)";
                profileBgColor = "rgba(239, 68, 68, 0.1)";
                profileImgSrc = "./images/aggressive.jpg";
            } else if (highRisk <= 40 && lowRisk >= 60) {
                profileName = "保守型";
                profileColor = "var(--accent)";
                profileBgColor = "rgba(16, 185, 129, 0.1)";
                profileImgSrc = "./images/conservative.jpg";
            }

            const resProfileEl = document.getElementById('res-profile');
            const profileCard = document.getElementById('profile-card');
            const profileImg = document.getElementById('profile-img');

            resProfileEl.innerText = profileName;
            resProfileEl.style.color = profileColor;
            profileCard.style.borderColor = profileColor;
            profileCard.style.backgroundColor = profileBgColor;

            profileImg.src = profileImgSrc;
            profileImg.classList.remove('hidden');

            prefContainer.classList.add('hidden');
            profileResultContainer.classList.remove('hidden');
            profileResultContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 500);
    });

    // 回到最上方的表單重新輸入
    function restart() {
        resultContainer.classList.add('hidden');
        prefContainer.classList.add('hidden');
        profileResultContainer.classList.add('hidden');
        form.reset();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

let myChart = null;

// 與後端 calculator.py 同一套邏輯：通膨 3%、存款利率 1.5%、活到 100 歲，
// 存款只在工作期間持續投入，通膨從退休後才開始累積。
function calculateRetirementPlan(p) {
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
        const currentYearAge = p.current_age + y;

        totalFund *= (1 + INTEREST_RATE);
        if (y <= yearsToRetire) totalFund += p.monthly_saving * 12;

        if (y > yearsToRetire) {
            const yearsInRetirement = y - yearsToRetire;
            const inf = Math.pow(1 + INFLATION_RATE, yearsInRetirement);
            const basicExp = (p.monthly_basic_expense * 12) * inf;
            const funExp = (p.monthly_fun_expense * 12) * inf;

            totalNeedBasic += basicExp;
            totalNeedWithFun += (basicExp + funExp);
        }

        history_ages.push(currentYearAge);
        history_funds.push(Math.round(totalFund));
        history_needs_basic.push(Math.round(totalNeedBasic));
        history_needs_with_fun.push(Math.round(totalNeedWithFun));
    }

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

function showResult(data) {
    const formatCurrency = (num) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(num);

    document.getElementById('res-need-basic').innerText = formatCurrency(data.total_need_basic);
    document.getElementById('res-need-all').innerText = formatCurrency(data.total_need_with_fun);
    document.getElementById('res-fund').innerText = formatCurrency(data.total_fund);
    document.getElementById('res-gap').innerText = formatCurrency(data.gap);

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

    const hintEl = document.getElementById('chart-hint-text');
    if (data.crossover_age) {
        hintEl.innerText = `當綠色線（存款）與橘色線（需求）交叉時，代表存款即將用盡。依您目前的規劃，約在 ${data.crossover_age} 歲時存款將不足以支應退休開銷。`;
    } else {
        hintEl.innerText = '恭喜！依您目前的規劃，存款預估可支撐退休生活至 100 歲。';
    }

    document.getElementById('result-container').classList.remove('hidden');
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
