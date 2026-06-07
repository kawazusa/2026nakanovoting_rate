/**
 * Nakano Ward Election Early Voting Dashboard
 * Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let state = {
        station: 'ALL',
        theme: document.documentElement.getAttribute('data-theme') || 'dark'
    };

    // Chart.js Instances
    let charts = {
        daily: null,
        cumulative: null,
        station: null,
        gender: null,
        past: null,
        today: null
    };

    // DOM Elements
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const stationSelect = document.getElementById('station-select');
    const tableBody = document.getElementById('table-body');
    const downloadCsvBtn = document.getElementById('download-csv-btn');

    // Metrics DOM Elements
    const valCurrentTotal = document.getElementById('val-current-total');
    const lblCurrentTotalTitle = document.getElementById('lbl-current-total-title');
    const lblCurrentPeriod = document.getElementById('lbl-current-period');
    const valComparison = document.getElementById('val-comparison');
    const lblComparisonTitle = document.getElementById('lbl-comparison-title');
    const lblComparisonSub = document.getElementById('lbl-comparison-sub');
    const valGrowth = document.getElementById('val-growth');
    const valTopStation = document.getElementById('val-top-station');
    const valTopStationVotes = document.getElementById('val-top-station-votes');
    const growthIconContainer = document.getElementById('growth-icon-container');
    const comparisonIconContainer = document.getElementById('comparison-icon-container');

    // Initialize Dashboard
    function init() {
        setupEventListeners();
        updateDashboard();
    }

    // Set up event listeners for filters and controls
    function setupEventListeners() {
        // Theme Toggle
        themeToggleBtn.addEventListener('click', toggleTheme);

        // Station Select Filter
        stationSelect.addEventListener('change', (e) => {
            state.station = e.target.value;
            animateCards();
            updateDashboard();
        });

        // Download CSV
        downloadCsvBtn.addEventListener('click', downloadCSV);

        // Setup Share URLs dynamically with hourly cache busting
        const xBtn = document.querySelector('.x-btn');
        const lineBtn = document.querySelector('.line-btn');
        const shareBaseUrl = "https://kawazusa.github.io/2026nakanovoting_rate/";
        
        // Generate hourly string key in JST (e.g., "2026060712") to bust OGP cache hourly
        const now = new Date();
        const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        const dateKey = jstDate.toISOString().slice(0, 13).replace(/[-T]/g, '');
        const shareUrlWithBust = `${shareBaseUrl}?v=${dateKey}`;
        
        if (xBtn) {
            const shareText = "中野区長選挙 投票状況ダッシュボード (前回 vs 今回) - 投票日当日の時間別投票率もリアルタイム速報中！";
            xBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrlWithBust)}&hashtags=中野区長選挙,中野区長選挙2026`;
        }
        if (lineBtn) {
            lineBtn.href = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrlWithBust)}`;
        }

        // Copy Share Link
        const copyLinkBtn = document.getElementById('copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(shareUrlWithBust).then(() => {
                    const originalText = copyLinkBtn.innerHTML;
                    copyLinkBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        コピーしました！
                    `;
                    copyLinkBtn.style.borderColor = 'var(--accent-success)';
                    copyLinkBtn.style.color = 'var(--accent-success)';
                    
                    setTimeout(() => {
                        copyLinkBtn.innerHTML = originalText;
                        copyLinkBtn.style.borderColor = '';
                        copyLinkBtn.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            });
        }
    }

    // Toggle Dark / Light Theme
    function toggleTheme() {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        state.theme = newTheme;
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Recreate charts to update text and grid colors
        updateDashboard();
    }

    // CSS Animation triggers on card updates
    function animateCards() {
        const cards = document.querySelectorAll('.stat-card');
        cards.forEach(card => {
            card.classList.remove('highlight-animate');
            // Trigger reflow
            void card.offsetWidth;
            card.classList.add('highlight-animate');
        });
    }

    // Get theme-specific options for Chart.js
    function getChartThemeOptions() {
        const isDark = state.theme === 'dark';
        const textColor = isDark ? '#9ca3af' : '#4b5563';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
        const tooltipBg = isDark ? '#121824' : '#ffffff';
        const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
        const tooltipText = isDark ? '#f3f4f6' : '#1f2937';

        return {
            textColor,
            gridColor,
            tooltipBg,
            tooltipBorder,
            tooltipText
        };
    }

    // Aggregates data based on selected station
    function getAggregatedData(stationFilter) {
        const daysCount = 6;
        const labels = votingData.current.dateRange;

        let previousDaily = new Array(daysCount).fill(0);
        let currentMale = new Array(daysCount).fill(null);
        let currentFemale = new Array(daysCount).fill(null);
        let currentDaily = new Array(daysCount).fill(null);

        if (stationFilter === 'ALL') {
            // Aggregate all stations
            for (let i = 0; i < daysCount; i++) {
                // Previous
                let prevSum = 0;
                for (const station in votingData.previous.stations) {
                    prevSum += votingData.previous.stations[station][i];
                }
                previousDaily[i] = prevSum;

                // Current
                let currentHasData = false;
                let maleSum = 0;
                let femaleSum = 0;
                
                for (const station in votingData.current.stations) {
                    const mVal = votingData.current.stations[station].male[i];
                    const fVal = votingData.current.stations[station].female[i];
                    
                    if (mVal !== null && fVal !== null) {
                        maleSum += mVal;
                        femaleSum += fVal;
                        currentHasData = true;
                    }
                }
                
                if (currentHasData) {
                    currentMale[i] = maleSum;
                    currentFemale[i] = femaleSum;
                    currentDaily[i] = maleSum + femaleSum;
                }
            }
        } else {
            // Get single station data
            const prevStationData = votingData.previous.stations[stationFilter];
            const currStationData = votingData.current.stations[stationFilter];
            
            for (let i = 0; i < daysCount; i++) {
                previousDaily[i] = prevStationData[i];
                
                if (currStationData.male[i] !== null && currStationData.female[i] !== null) {
                    currentMale[i] = currStationData.male[i];
                    currentFemale[i] = currStationData.female[i];
                    currentDaily[i] = currStationData.male[i] + currStationData.female[i];
                }
            }
        }

        // Calculate Cumulative values
        let previousCumulative = new Array(daysCount).fill(0);
        let currentCumulative = new Array(daysCount).fill(null);
        
        let prevSum = 0;
        let currSum = 0;
        
        for (let i = 0; i < daysCount; i++) {
            prevSum += previousDaily[i];
            previousCumulative[i] = prevSum;
            
            if (currentDaily[i] !== null) {
                currSum += currentDaily[i];
                currentCumulative[i] = currSum;
            }
        }

        return {
            labels,
            previousDaily,
            previousCumulative,
            currentMale,
            currentFemale,
            currentDaily,
            currentCumulative
        };
    }

    // Recalculates metrics and updates DOM
    function updateMetrics(data) {
        // 1. Current Election Total (Cumulative)
        const validValues = data.currentCumulative.filter(v => v !== null);
        const earlyTotalCurrent = validValues.length > 0 ? validValues[validValues.length - 1] : 0;
        const currentDaysAvailable = validValues.length;
        const earlyTotalPrevious = data.previousCumulative[currentDaysAvailable - 1];

        // Fetch latest today voting data
        const todayVotingArray = votingData.todayVoting || [];
        const activeTodayBulletins = todayVotingArray.filter(v => v.currentVotes > 0);
        const latestTodayBulletin = activeTodayBulletins.length > 0 ? activeTodayBulletins[activeTodayBulletins.length - 1] : null;

        let todayCurrentVotes = 0;
        let todayPreviousVotes = 0;
        let latestTimeLabel = "";

        if (latestTodayBulletin) {
            todayCurrentVotes = latestTodayBulletin.currentVotes;
            todayPreviousVotes = latestTodayBulletin.previousVotes;
            latestTimeLabel = latestTodayBulletin.time;
        }

        let currentTotal = earlyTotalCurrent;
        let previousSamePeriodTotal = earlyTotalPrevious;

        if (state.station === 'ALL' && latestTodayBulletin) {
            // Check if this is the final confirmed turnout (contains '確定' or '最終')
            const isFinalConfirmed = latestTimeLabel.includes("確定") || latestTimeLabel.includes("最終");

            if (isFinalConfirmed) {
                // If final confirmed, the number already includes early voting
                currentTotal = todayCurrentVotes;
                previousSamePeriodTotal = todayPreviousVotes;

                if (lblCurrentTotalTitle) lblCurrentTotalTitle.textContent = "今回 投票者数合計 (最終確定)";
                if (lblComparisonTitle) lblComparisonTitle.textContent = "前回同時期比 (最終確定)";
                lblCurrentPeriod.textContent = `最終確定結果 (${latestTimeLabel})`;
            } else {
                // Add today's voting if it is for ALL stations (hourlyday-of bulletins)
                currentTotal = earlyTotalCurrent + todayCurrentVotes;
                previousSamePeriodTotal = earlyTotalPrevious + todayPreviousVotes;

                if (lblCurrentTotalTitle) lblCurrentTotalTitle.textContent = "今回 投票者数合計 (期日前+当日)";
                if (lblComparisonTitle) lblComparisonTitle.textContent = "前回同時期比 (期日前+当日)";
                lblCurrentPeriod.textContent = `期日前(終了) + 当日 ${latestTimeLabel}時点`;
            }
        } else {
            // Otherwise, show early voting only (station-specific or no today bulletin data)
            if (lblCurrentTotalTitle) lblCurrentTotalTitle.textContent = "今回 期日前投票者数累計";
            if (lblComparisonTitle) lblComparisonTitle.textContent = "前回期日前 同時期比";
            
            if (state.station !== 'ALL') {
                lblCurrentPeriod.textContent = `期日前投票 ${currentDaysAvailable}日目（${votingData.current.dateRange[currentDaysAvailable - 1]}）終了時点`;
            } else {
                lblCurrentPeriod.textContent = `期日前投票 ${currentDaysAvailable}日目（最終日）終了時点`;
            }
        }

        valCurrentTotal.textContent = currentTotal.toLocaleString() + " 票";
        valComparison.textContent = previousSamePeriodTotal.toLocaleString() + " 票";
        lblComparisonSub.textContent = `前回同時期: ${previousSamePeriodTotal.toLocaleString()} 票`;

        // 3. Growth rate and difference
        const voteDiff = currentTotal - previousSamePeriodTotal;
        const pctDiff = ((currentTotal / previousSamePeriodTotal) * 100).toFixed(1);
        
        let diffSign = voteDiff >= 0 ? "+" : "";
        let diffColorClass = voteDiff >= 0 ? "positive-change" : "negative-change";
        
        valGrowth.innerHTML = `<span class="${diffColorClass}">${diffSign}${pctDiff}%</span>`;
        
        // Update icons and colors for pacing
        if (voteDiff >= 0) {
            valGrowth.innerHTML = `<span class="positive-change">+${pctDiff}%</span>`;
            growthIconContainer.style.color = "var(--accent-success)";
            growthIconContainer.style.background = "rgba(16, 185, 129, 0.1)";
            growthIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
        } else {
            valGrowth.innerHTML = `<span class="negative-change">${pctDiff}%</span>`;
            growthIconContainer.style.color = "var(--accent-female)";
            growthIconContainer.style.background = "rgba(236, 72, 153, 0.1)";
            growthIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
        }

        // 4. Find most active voting station (For ALL)
        if (state.station === 'ALL') {
            let maxVotes = 0;
            let topStationName = "";
            
            for (const station in votingData.current.stations) {
                let stationVotes = 0;
                for (let i = 0; i < currentDaysAvailable; i++) {
                    const m = votingData.current.stations[station].male[i];
                    const f = votingData.current.stations[station].female[i];
                    if (m !== null && f !== null) {
                        stationVotes += m + f;
                    }
                }
                
                if (stationVotes > maxVotes) {
                    maxVotes = stationVotes;
                    topStationName = station;
                }
            }
            
            const percentage = ((maxVotes / currentTotal) * 100).toFixed(1);
            valTopStation.textContent = topStationName;
            valTopStationVotes.textContent = `${maxVotes.toLocaleString()} 票 (全体の ${percentage}%)`;
        } else {
            // For a single station, show its rank or share
            let totalAllStations = 0;
            for (const station in votingData.current.stations) {
                for (let i = 0; i < currentDaysAvailable; i++) {
                    const m = votingData.current.stations[station].male[i];
                    const f = votingData.current.stations[station].female[i];
                    if (m !== null && f !== null) {
                        totalAllStations += m + f;
                    }
                }
            }
            const percentage = ((currentTotal / totalAllStations) * 100).toFixed(1);
            valTopStation.textContent = state.station;
            valTopStationVotes.textContent = `${currentTotal.toLocaleString()} 票 (全体の ${percentage}%)`;
        }
    }

    // Redraws all charts
    function updateCharts(data) {
        const themeOpts = getChartThemeOptions();
        
        // Destroy existing charts to prevent hover artifacts
        for (const key in charts) {
            if (charts[key]) {
                charts[key].destroy();
            }
        }

        // Font Config Helper
        const fontConfig = {
            family: 'Outfit, Noto Sans JP, sans-serif',
            size: 11
        };

        // --- Chart 1: Daily Comparison (Bar & Line Chart) ---
        const ctxDaily = document.getElementById('daily-comparison-chart').getContext('2d');
        charts.daily = new Chart(ctxDaily, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: '今回 (令和8年)',
                        data: data.currentDaily,
                        backgroundColor: 'rgba(6, 182, 212, 0.85)',
                        borderColor: 'rgba(6, 182, 212, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    },
                    {
                        label: '前回 (令和4年)',
                        data: data.previousDaily,
                        backgroundColor: 'rgba(99, 102, 241, 0.35)',
                        borderColor: 'rgba(99, 102, 241, 0.7)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: themeOpts.textColor, font: fontConfig }
                    },
                    tooltip: {
                        backgroundColor: themeOpts.tooltipBg,
                        titleColor: themeOpts.tooltipText,
                        bodyColor: themeOpts.tooltipText,
                        borderColor: themeOpts.tooltipBorder,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString() + ' 人';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    },
                    y: {
                        grid: { color: themeOpts.gridColor },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    }
                }
            }
        });

        // --- Chart 2: Cumulative Pacing (Line Chart) ---
        const ctxCumulative = document.getElementById('cumulative-pacing-chart').getContext('2d');
        
        // Set up line gradients
        const gradientCurrent = ctxCumulative.createLinearGradient(0, 0, 0, 300);
        gradientCurrent.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
        gradientCurrent.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

        const gradientPrevious = ctxCumulative.createLinearGradient(0, 0, 0, 300);
        gradientPrevious.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
        gradientPrevious.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        charts.cumulative = new Chart(ctxCumulative, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: '今回 (令和8年累計)',
                        data: data.currentCumulative,
                        borderColor: 'rgba(6, 182, 212, 1)',
                        backgroundColor: gradientCurrent,
                        borderWidth: 3,
                        pointBackgroundColor: 'rgba(6, 182, 212, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        fill: true,
                        tension: 0.2
                    },
                    {
                        label: '前回 (令和4年累計)',
                        data: data.previousCumulative,
                        borderColor: 'rgba(99, 102, 241, 0.65)',
                        backgroundColor: gradientPrevious,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointBackgroundColor: 'rgba(99, 102, 241, 0.8)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: themeOpts.textColor, font: fontConfig }
                    },
                    tooltip: {
                        backgroundColor: themeOpts.tooltipBg,
                        titleColor: themeOpts.tooltipText,
                        bodyColor: themeOpts.tooltipText,
                        borderColor: themeOpts.tooltipBorder,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString() + ' 人';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    },
                    y: {
                        grid: { color: themeOpts.gridColor },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    }
                }
            }
        });

        // --- Chart 3: Station Breakdown (Horizontal Grouped Bar Chart) ---
        const ctxStation = document.getElementById('station-breakdown-chart').getContext('2d');
        const stationLabels = Object.keys(votingData.current.stations);
        
        // Calculate cumulative totals for each station up to current day count
        const validValuesCount = data.currentCumulative.filter(v => v !== null).length;
        
        const stationCurrentTotals = stationLabels.map(station => {
            let sum = 0;
            for (let i = 0; i < validValuesCount; i++) {
                sum += votingData.current.stations[station].male[i] + votingData.current.stations[station].female[i];
            }
            return sum;
        });

        const stationPreviousTotals = stationLabels.map(station => {
            let sum = 0;
            for (let i = 0; i < validValuesCount; i++) {
                sum += votingData.previous.stations[station][i];
            }
            return sum;
        });

        charts.station = new Chart(ctxStation, {
            type: 'bar',
            data: {
                labels: stationLabels,
                datasets: [
                    {
                        label: '今回 (累計)',
                        data: stationCurrentTotals,
                        backgroundColor: 'rgba(6, 182, 212, 0.85)',
                        borderColor: 'rgba(6, 182, 212, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: '前回同時期 (累計)',
                        data: stationPreviousTotals,
                        backgroundColor: 'rgba(99, 102, 241, 0.4)',
                        borderColor: 'rgba(99, 102, 241, 0.7)',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: themeOpts.textColor, font: fontConfig }
                    },
                    tooltip: {
                        backgroundColor: themeOpts.tooltipBg,
                        titleColor: themeOpts.tooltipText,
                        bodyColor: themeOpts.tooltipText,
                        borderColor: themeOpts.tooltipBorder,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.x !== null) {
                                    label += context.parsed.x.toLocaleString() + ' 人';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: themeOpts.gridColor },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    }
                }
            }
        });

        // --- Chart 4: Gender Breakdown (Stacked Bar Chart - Current only) ---
        const ctxGender = document.getElementById('gender-breakdown-chart').getContext('2d');
        
        // Gather current male/female data
        const displayMale = data.currentMale.filter(v => v !== null);
        const displayFemale = data.currentFemale.filter(v => v !== null);
        const displayLabels = data.labels.slice(0, displayMale.length);

        charts.gender = new Chart(ctxGender, {
            type: 'bar',
            data: {
                labels: displayLabels,
                datasets: [
                    {
                        label: '男性 (男)',
                        data: displayMale,
                        backgroundColor: 'rgba(59, 130, 246, 0.85)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                        borderRadius: { topLeft: 4, bottomLeft: 4 },
                        stack: 'gender'
                    },
                    {
                        label: '女性 (女)',
                        data: displayFemale,
                        backgroundColor: 'rgba(236, 72, 153, 0.85)',
                        borderColor: 'rgba(236, 72, 153, 1)',
                        borderWidth: 1,
                        borderRadius: { topRight: 4, bottomRight: 4 },
                        stack: 'gender'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: themeOpts.textColor, font: fontConfig }
                    },
                    tooltip: {
                        backgroundColor: themeOpts.tooltipBg,
                        titleColor: themeOpts.tooltipText,
                        bodyColor: themeOpts.tooltipText,
                        borderColor: themeOpts.tooltipBorder,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString() + ' 人';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    },
                    y: {
                        stacked: true,
                        grid: { color: themeOpts.gridColor },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    }
                }
            }
        });

        // --- Chart 6: Today's Voting (Line Chart) ---
        const ctxToday = document.getElementById('today-voting-chart').getContext('2d');
        const todayData = votingData.todayVoting || [];
        const labelsToday = todayData.map(d => d.time);
        const ratesToday = todayData.map(d => d.currentRate);
        const prevRatesToday = todayData.map(d => d.previousRate);

        // Set up line gradients
        const gradientToday = ctxToday.createLinearGradient(0, 0, 0, 300);
        gradientToday.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
        gradientToday.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

        const gradientPrevToday = ctxToday.createLinearGradient(0, 0, 0, 300);
        gradientPrevToday.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
        gradientPrevToday.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        charts.today = new Chart(ctxToday, {
            type: 'line',
            data: {
                labels: labelsToday,
                datasets: [
                    {
                        label: '今回 (令和8年当日投票率)',
                        data: ratesToday,
                        borderColor: 'rgba(6, 182, 212, 1)',
                        backgroundColor: gradientToday,
                        borderWidth: 3,
                        pointBackgroundColor: 'rgba(6, 182, 212, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        fill: true,
                        tension: 0.15
                    },
                    {
                        label: '前回 (令和4年当日投票率)',
                        data: prevRatesToday,
                        borderColor: 'rgba(99, 102, 241, 0.65)',
                        backgroundColor: gradientPrevToday,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointBackgroundColor: 'rgba(99, 102, 241, 0.8)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.15
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: themeOpts.textColor, font: fontConfig }
                    },
                    tooltip: {
                        backgroundColor: themeOpts.tooltipBg,
                        titleColor: themeOpts.tooltipText,
                        bodyColor: themeOpts.tooltipText,
                        borderColor: themeOpts.tooltipBorder,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(2) + '%';
                                    
                                    const idx = context.dataIndex;
                                    const item = todayData[idx];
                                    if (item) {
                                        const votes = context.datasetIndex === 0 ? item.currentVotes : item.previousVotes;
                                        label += ' (' + votes.toLocaleString() + ' 人)';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    },
                    y: {
                        grid: { color: themeOpts.gridColor },
                        ticks: { 
                            color: themeOpts.textColor, 
                            font: fontConfig,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });

        // --- Chart 5: Past Elections (Line Chart) ---
        const ctxPast = document.getElementById('past-elections-chart').getContext('2d');
        const pastData = votingData.pastElections;
        const labelsPast = pastData.map(d => d.shortLabel);
        const totalsPast = pastData.map(d => d.total);
        const malesPast = pastData.map(d => d.male);
        const femalesPast = pastData.map(d => d.female);

        charts.past = new Chart(ctxPast, {
            type: 'line',
            data: {
                labels: labelsPast,
                datasets: [
                    {
                        label: '全体 (投票率)',
                        data: totalsPast,
                        borderColor: 'rgba(6, 182, 212, 1)',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: 'rgba(6, 182, 212, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: '男性',
                        data: malesPast,
                        borderColor: 'rgba(59, 130, 246, 0.6)',
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        borderWidth: 1.5,
                        pointBackgroundColor: 'rgba(59, 130, 246, 0.8)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1,
                        pointRadius: 3.5,
                        pointHoverRadius: 5,
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: '女性',
                        data: femalesPast,
                        borderColor: 'rgba(236, 72, 153, 0.6)',
                        backgroundColor: 'rgba(236, 72, 153, 0.05)',
                        borderWidth: 1.5,
                        pointBackgroundColor: 'rgba(236, 72, 153, 0.8)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1,
                        pointRadius: 3.5,
                        pointHoverRadius: 5,
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: themeOpts.textColor, font: fontConfig }
                    },
                    tooltip: {
                        backgroundColor: themeOpts.tooltipBg,
                        titleColor: themeOpts.tooltipText,
                        bodyColor: themeOpts.tooltipText,
                        borderColor: themeOpts.tooltipBorder,
                        borderWidth: 1,
                        callbacks: {
                            title: function(context) {
                                if (context && context.length > 0) {
                                    const index = context[0].dataIndex;
                                    return pastData[index].label;
                                }
                                return '';
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(2) + '%';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: themeOpts.textColor, font: fontConfig }
                    },
                    y: {
                        grid: { color: themeOpts.gridColor },
                        ticks: { 
                            color: themeOpts.textColor, 
                            font: fontConfig,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // Re-renders the details table
    function updateTable(data) {
        tableBody.innerHTML = '';
        const validValuesCount = data.currentCumulative.filter(v => v !== null).length;

        // Populate daily rows
        for (let i = 0; i < 6; i++) {
            const tr = document.createElement('tr');
            
            // Col 1: Date & Label
            const tdDay = document.createElement('td');
            tdDay.textContent = `${i + 1}日目（${data.labels[i]}）`;
            tr.appendChild(tdDay);

            // Current Election Data (Male, Female, Total)
            const tdMale = document.createElement('td');
            const tdFemale = document.createElement('td');
            const tdTotalCurrent = document.createElement('td');
            tdTotalCurrent.className = 'highlighted-col';

            if (data.currentDaily[i] !== null) {
                tdMale.textContent = data.currentMale[i].toLocaleString();
                tdFemale.textContent = data.currentFemale[i].toLocaleString();
                tdTotalCurrent.textContent = data.currentDaily[i].toLocaleString();
            } else {
                tdMale.textContent = '-';
                tdFemale.textContent = '-';
                tdTotalCurrent.textContent = '-';
            }
            
            tr.appendChild(tdMale);
            tr.appendChild(tdFemale);
            tr.appendChild(tdTotalCurrent);

            // Previous Election Data (Total)
            const tdTotalPrevious = document.createElement('td');
            tdTotalPrevious.textContent = data.previousDaily[i].toLocaleString();
            tr.appendChild(tdTotalPrevious);

            // Comparison (Current vs Previous)
            const tdCompare = document.createElement('td');
            if (data.currentDaily[i] !== null) {
                const ratio = ((data.currentDaily[i] / data.previousDaily[i]) * 100).toFixed(1);
                const diff = data.currentDaily[i] - data.previousDaily[i];
                const diffSign = diff >= 0 ? '+' : '';
                const diffColor = diff >= 0 ? 'positive-change' : 'negative-change';
                
                tdCompare.innerHTML = `<span class="${diffColor}">${ratio}%</span> <span style="font-size:0.75rem; color:var(--text-muted)">(${diffSign}${diff.toLocaleString()})</span>`;
            } else {
                tdCompare.textContent = '-';
            }
            tr.appendChild(tdCompare);

            tableBody.appendChild(tr);
        }

        // Add Separator/Total Row for Current Period
        const trPeriodTotal = document.createElement('tr');
        trPeriodTotal.style.borderTop = '2px solid var(--border-color)';
        trPeriodTotal.style.fontWeight = 'bold';
        
        const tdPeriodLabel = document.createElement('td');
        tdPeriodLabel.textContent = `同時期累計（${validValuesCount}日目まで）`;
        trPeriodTotal.appendChild(tdPeriodLabel);

        // Calculate sum for current period
        let currentPeriodMale = 0;
        let currentPeriodFemale = 0;
        let currentPeriodTotal = 0;
        let previousPeriodTotal = 0;

        for (let i = 0; i < validValuesCount; i++) {
            currentPeriodMale += data.currentMale[i];
            currentPeriodFemale += data.currentFemale[i];
            currentPeriodTotal += data.currentDaily[i];
            previousPeriodTotal += data.previousDaily[i];
        }

        const tdPeriodMale = document.createElement('td');
        tdPeriodMale.textContent = currentPeriodMale.toLocaleString();
        trPeriodTotal.appendChild(tdPeriodMale);

        const tdPeriodFemale = document.createElement('td');
        tdPeriodFemale.textContent = currentPeriodFemale.toLocaleString();
        trPeriodTotal.appendChild(tdPeriodFemale);

        const tdPeriodTotalVal = document.createElement('td');
        tdPeriodTotalVal.className = 'highlighted-col';
        tdPeriodTotalVal.textContent = currentPeriodTotal.toLocaleString();
        trPeriodTotal.appendChild(tdPeriodTotalVal);

        const tdPeriodPrevTotalVal = document.createElement('td');
        tdPeriodPrevTotalVal.textContent = previousPeriodTotal.toLocaleString();
        trPeriodTotal.appendChild(tdPeriodPrevTotalVal);

        const tdPeriodCompare = document.createElement('td');
        const periodRatio = ((currentPeriodTotal / previousPeriodTotal) * 100).toFixed(1);
        const periodDiff = currentPeriodTotal - previousPeriodTotal;
        const periodDiffSign = periodDiff >= 0 ? '+' : '';
        const periodDiffColor = periodDiff >= 0 ? 'positive-change' : 'negative-change';
        tdPeriodCompare.innerHTML = `<span class="${periodDiffColor}">${periodRatio}%</span> <span style="font-size:0.75rem; color:var(--text-muted)">(${periodDiffSign}${periodDiff.toLocaleString()})</span>`;
        trPeriodTotal.appendChild(tdPeriodCompare);

        tableBody.appendChild(trPeriodTotal);

        // Add Final Row for Previous Election Overall Total
        const trPrevTotal = document.createElement('tr');
        trPrevTotal.style.fontWeight = '500';
        trPrevTotal.style.color = 'var(--text-muted)';
        
        const tdPrevLabel = document.createElement('td');
        tdPrevLabel.textContent = '前回最終累計 (全6日)';
        trPrevTotal.appendChild(tdPrevLabel);

        // Fill empty values for current
        for(let i=0; i<3; i++) {
            const tdEmpty = document.createElement('td');
            tdEmpty.textContent = '-';
            trPrevTotal.appendChild(tdEmpty);
        }

        const prevFinalTotal = data.previousCumulative[5];
        const tdPrevFinalTotal = document.createElement('td');
        tdPrevFinalTotal.textContent = prevFinalTotal.toLocaleString();
        trPrevTotal.appendChild(tdPrevFinalTotal);

        // Compare current progress to previous final total
        const tdFinalCompare = document.createElement('td');
        const finalRatio = ((currentPeriodTotal / prevFinalTotal) * 100).toFixed(1);
        tdFinalCompare.textContent = `進捗度: ${finalRatio}%`;
        trPrevTotal.appendChild(tdFinalCompare);

        tableBody.appendChild(trPrevTotal);
    }

    // Re-renders the today's voting results table
    function updateTodayTable(todayData) {
        const todayTableBody = document.getElementById('today-table-body');
        if (!todayTableBody) return;
        
        todayTableBody.innerHTML = '';
        
        todayData.forEach(row => {
            const tr = document.createElement('tr');
            
            // Col 1: Time
            const tdTime = document.createElement('td');
            tdTime.textContent = row.time + '時点';
            tdTime.style.textAlign = 'left';
            tdTime.style.fontWeight = '600';
            tr.appendChild(tdTime);
            
            // Col 2: Current Votes
            const tdCurrVotes = document.createElement('td');
            tdCurrVotes.textContent = row.currentVotes.toLocaleString() + ' 人';
            tr.appendChild(tdCurrVotes);
            
            // Col 3: Current Rate
            const tdCurrRate = document.createElement('td');
            tdCurrRate.textContent = row.currentRate.toFixed(2) + '%';
            tdCurrRate.className = 'highlighted-col';
            tr.appendChild(tdCurrRate);
            
            // Col 4: Previous Votes
            const tdPrevVotes = document.createElement('td');
            tdPrevVotes.textContent = row.previousVotes.toLocaleString() + ' 人';
            tr.appendChild(tdPrevVotes);
            
            // Col 5: Previous Rate
            const tdPrevRate = document.createElement('td');
            tdPrevRate.textContent = row.previousRate.toFixed(2) + '%';
            tr.appendChild(tdPrevRate);
            
            // Col 6: Diff
            const tdDiff = document.createElement('td');
            const diff = row.currentRate - row.previousRate;
            const diffSign = diff >= 0 ? '+' : '';
            const diffColor = diff >= 0 ? 'positive-change' : 'negative-change';
            tdDiff.innerHTML = `<span class="${diffColor}">${diffSign}${diff.toFixed(2)}%</span>`;
            tdDiff.style.textAlign = 'center';
            tr.appendChild(tdDiff);
            
            todayTableBody.appendChild(tr);
        });
    }

    // Handles the calculations and rendering
    function updateDashboard() {
        const data = getAggregatedData(state.station);
        updateMetrics(data);
        updateCharts(data);
        updateTable(data);
        updateTodayTable(votingData.todayVoting || []);
    }

    // Handles CSV creation and downloading
    function downloadCSV() {
        const data = getAggregatedData(state.station);
        const validValuesCount = data.currentCumulative.filter(v => v !== null).length;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `投票所: ${state.station === 'ALL' ? '全投票所' : state.station}\n`;
        csvContent += "日程,今回_男,今回_女,今回_計,前回_計,前同比\n";

        for (let i = 0; i < 6; i++) {
            const rowLabel = `${i + 1}日目(${data.labels[i]})`;
            const m = data.currentDaily[i] !== null ? data.currentMale[i] : "";
            const f = data.currentDaily[i] !== null ? data.currentFemale[i] : "";
            const t = data.currentDaily[i] !== null ? data.currentDaily[i] : "";
            const prev = data.previousDaily[i];
            const ratio = data.currentDaily[i] !== null ? `${((data.currentDaily[i]/prev)*100).toFixed(1)}%` : "";
            
            csvContent += `"${rowLabel}",${m},${f},${t},${prev},"${ratio}"\n`;
        }

        // Totals Row
        let currentPeriodMale = 0;
        let currentPeriodFemale = 0;
        let currentPeriodTotal = 0;
        let previousPeriodTotal = 0;

        for (let i = 0; i < validValuesCount; i++) {
            currentPeriodMale += data.currentMale[i];
            currentPeriodFemale += data.currentFemale[i];
            currentPeriodTotal += data.currentDaily[i];
            previousPeriodTotal += data.previousDaily[i];
        }
        
        const periodRatio = `${((currentPeriodTotal/previousPeriodTotal)*100).toFixed(1)}%`;
        csvContent += `"同時期累計",${currentPeriodMale},${currentPeriodFemale},${currentPeriodTotal},${previousPeriodTotal},"${periodRatio}"\n`;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `nakano_senkyo_kijitsumae_${state.station}.csv`);
        document.body.appendChild(link); // Required for FF
        
        link.click();
        document.body.removeChild(link);
    }

    // Initialize the page
    init();
});
