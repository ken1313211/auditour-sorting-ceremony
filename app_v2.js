import { QUESTIONS, DEPARTMENTS } from './data_questions.js';
import { saveSortingResult, initDatabase, fetchSortingResults, fetchCustomScores, deleteSortingResult, subscribeToSortingResults, saveGlobalSettings, subscribeToGlobalSettings } from './firebase-config.js';
import { init3DScene, triggerInteractionAnimation, triggerRevealAnimation, updateGraphicsSettings } from './scene.js';

// State
let currentQuestionIndex = 0;
let sessionQuestions = [];
let userAnswers = [];
let rawAnswers = [];
let scores = {
    CORE_AUDIT: 0,
    AOA: 0,
    DID: 0,
    DIGITAL: 0,
    TECH_RISK: 0,
    FAAS: 0
};
let activeQuestions = [];

// Sound Context
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playTone(freq, type, duration, vol) {
    if(!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}
function playHoverSound() { playTone(600, 'sine', 0.05, 0.02); }
function playClickSound() { playTone(800, 'triangle', 0.1, 0.05); }
function playRevealSound() {
    playTone(300, 'sine', 2.0, 0.2);
    playTone(450, 'triangle', 1.5, 0.1);
}

// User Config Settings
let settings = {
    density: 'medium',
    speed: 'normal',
    color: 'gold',
    direction: 'bottom',
    style: 'linear',
    animSpeed: 'normal',
    volume: 50,
    pbiUrl: '',
    schools: 'University of Santo Tomas, Far Eastern University, Polytechnic University of the Philippines'
};
let animationSpeedMultiplier = 1.0;

function animDuration(base) {
    return base * animationSpeedMultiplier;
}

// DOM Elements
const screens = {
    splash: document.getElementById('splash-screen'),
    intro: document.getElementById('intro-screen'),
    question: document.getElementById('question-screen'),
    reveal: document.getElementById('reveal-screen'),
    settings: document.getElementById('settings-screen'),
    admin: document.getElementById('admin-screen')
};

const enterBtn = document.getElementById('enter-btn');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const downloadBtn = document.getElementById('download-btn');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressBar = document.getElementById('progress-bar');
const departmentResult = document.getElementById('department-result');
const departmentDesc = document.getElementById('department-description');
const splashBg = document.getElementById('splash-bg');
const webglCanvas = document.getElementById('webgl-canvas');
const bgAudio = document.getElementById('bg-audio');
const passportCard = document.getElementById('passport-card');

// Houses Screen DOM Elements
const viewHousesBtn = document.getElementById('view-houses-btn');
const closeHousesBtn = document.getElementById('close-houses-btn');
const nextHouseBtn = document.getElementById('next-house-btn');
const prevHouseBtn = document.getElementById('prev-house-btn');
const housesScreen = document.getElementById('houses-screen');
let currentHouseIndex = 0;
const deptKeys = Object.keys(DEPARTMENTS);

// PowerBI Mockup State and Functions
let chartDept = null;
let chartSkill = null;
let chartTimeline = null;
let chartPrefVsPlacement = null;
let chartSchoolPipeline = null;
let chartMatchConfidence = null;
let chartPreferenceAlignment = null;

function seedHistoryIfNeeded() {
    let history = [];
    try {
        const saved = localStorage.getItem('sorting_history');
        if (saved) {
            history = JSON.parse(saved);
        }
    } catch (e) {
        history = [];
    }
    
    const hasOldDepts = history.some(item => ["Engineering", "Marketing", "Design", "Operations", "ADN", "Tech Risk"].includes(item.dept));
    
    if (!history || history.length === 0 || hasOldDepts) {
        history = [];
        const depts = ["Core Audit", "AOA", "DID", "Digital", "Tech Risk"];
        const mockNames = ["Alex Rivera", "Jamie Chen", "Taylor Smith", "Jordan Lee", "Casey Jones", "Morgan Davis", "Avery Clark", "Riley Miller"];
        const schools = ["Ateneo de Manila", "De La Salle University", "University of the Philippines", "University of Santo Tomas"];
        const startT = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
        for (let i = 0; i < 142; i++) {
            const randomDept = depts[Math.floor(Math.random() * depts.length)];
            const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
            const randomSchool = schools[Math.floor(Math.random() * schools.length)];
            const randomTime = new Date(startT + Math.random() * (Date.now() - startT));
            history.push({
                id: "REC-" + (1000 + i),
                name: randomName,
                school: randomSchool,
                preferredSSL: depts[Math.floor(Math.random() * depts.length)],
                dept: randomDept,
                timestamp: randomTime.toISOString(),
                details: "Automated point match (90%+)"
            });
        }
        // Sort by timestamp
        history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        localStorage.setItem('sorting_history', JSON.stringify(history));
    }
}

function saveResultToHistory(deptName, recruitName, school, preferredSSL) {
    let history = [];
    try {
        const saved = localStorage.getItem('sorting_history');
        if (saved) {
            history = JSON.parse(saved);
        }
    } catch (e) {
        history = [];
    }
    
    history.push({
        id: "REC-" + Math.floor(1000 + Math.random() * 9000),
        name: recruitName || "Anonymous User",
        dept: deptName,
        school: school || "N/A",
        preferredSSL: preferredSSL || "N/A",
        timestamp: new Date().toISOString(),
        details: "Live ceremony assignment"
    });
    
    localStorage.setItem('sorting_history', JSON.stringify(history));
}

let isSubscribed = false;

function renderPowerBICharts(forceSync = false) {
    // If called directly from an event listener, forceSync might be an Event object
    const isForced = forceSync === true || (forceSync && forceSync.type === 'click');

    if (dbConfig && dbConfig.provider === 'firebase') {
        if (!isSubscribed) {
            subscribeToSortingResults(fbHistory => {
                if (fbHistory !== null && fbHistory !== undefined) {
                    localStorage.setItem('sorting_history', JSON.stringify(fbHistory));
                    drawDashboard(fbHistory);
                }
            });
            isSubscribed = true;
        } 
        
        if (isForced) {
            // Force a manual one-time fetch to guarantee sync if realtime fails
            const refreshBtn = document.getElementById('pbi-refresh-btn');
            const originalContent = refreshBtn ? refreshBtn.innerHTML : '';
            if (refreshBtn) refreshBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg> Syncing...`;
            
            fetchSortingResults().then(fbHistory => {
                if (fbHistory !== null && fbHistory !== undefined) {
                    localStorage.setItem('sorting_history', JSON.stringify(fbHistory));
                    drawDashboard(fbHistory);
                }
                if (refreshBtn) refreshBtn.innerHTML = originalContent;
            }).catch(e => {
                console.error("Sync failed:", e);
                if (refreshBtn) refreshBtn.innerHTML = originalContent;
            });
        } else if (isSubscribed) {
            const history = JSON.parse(localStorage.getItem('sorting_history')) || [];
            drawDashboard(history);
        }
    } else {
        let history = [];
        try {
            const saved = localStorage.getItem('sorting_history');
            if (saved) {
                history = JSON.parse(saved);
            }
        } catch (e) {
            history = [];
        }
        drawDashboard(history);
    }
}

function drawDashboard(history) {
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
        Chart.defaults.plugins.datalabels.color = '#fff';
        Chart.defaults.plugins.datalabels.font = { weight: 'bold', size: 14 };
        Chart.defaults.plugins.datalabels.display = true;
        Chart.defaults.plugins.datalabels.formatter = (value) => {
            return value > 0 ? value : '';
        };
    }
    const pbiIframe = document.getElementById('pbi-iframe');
    const pbiOverview = document.getElementById('pbi-page-1');
    const pbiLogs = document.getElementById('pbi-page-2');
    const pbiNav = document.getElementById('pbi-page-navigation');

    if (settings.pbiUrl && settings.pbiUrl.trim() !== '') {
        // Show real PowerBI report frame
        if (pbiIframe) {
            pbiIframe.src = settings.pbiUrl;
            pbiIframe.style.display = 'block';
        }
        if (pbiOverview) pbiOverview.style.display = 'none';
        if (pbiLogs) pbiLogs.style.display = 'none';
        if (pbiNav) pbiNav.style.display = 'none';
        return; // Skip drawing mock charts
    }

    // Hide real PowerBI report frame, show mock charts
    if (pbiIframe) {
        pbiIframe.src = '';
        pbiIframe.style.display = 'none';
    }
    if (pbiNav) pbiNav.style.display = 'flex';
    
    // Activate current selected page
    const activeTab = document.querySelector('.pbi-tab.active');
    const targetPageId = activeTab ? activeTab.getAttribute('data-target') : 'pbi-page-1';
    
    document.querySelectorAll('.pbi-page-content').forEach(page => {
        if (page.id === targetPageId) {
            page.style.display = 'block';
        } else {
            page.style.display = 'none';
        }
    });

    const totalRecruits = history.length;
    document.getElementById('kpi-total-recruits').textContent = totalRecruits;

    const deptCounts = {
        "Core Audit": 0,
        "AOA": 0,
        "DID": 0,
        "Digital": 0,
        "Tech Risk": 0,
        "FAAS": 0
    };

    history.forEach(item => {
        if (item.dept && deptCounts[item.dept] !== undefined) {
            deptCounts[item.dept]++;
        } else if (item.dept) {
            const name = item.dept.toLowerCase();
            if (name.includes('core') || name.includes('audit')) deptCounts["Core Audit"]++;
            else if (name.includes('aoa')) deptCounts["AOA"]++;
            else if (name.includes('did')) deptCounts["DID"]++;
            else if (name.includes('digital')) deptCounts["Digital"]++;
            else if (name.includes('tech') || name.includes('risk')) deptCounts["Tech Risk"]++;
            else if (name.includes('faas') || name.includes('advisory')) deptCounts["FAAS"]++;
        }
    });

    // Find popular department
    let popularDeptName = "Core Audit";
    let popularCount = -1;
    for (const [dept, count] of Object.entries(deptCounts)) {
        if (count > popularCount) {
            popularCount = count;
            popularDeptName = dept;
        }
    }
    document.getElementById('kpi-popular-dept').textContent = popularDeptName;
    const popularPct = totalRecruits > 0 ? Math.round((popularCount / totalRecruits) * 100) : 0;
    document.getElementById('kpi-popular-percentage').textContent = `${popularPct}% of recruits`;

    // Find top preferred SSL
    const preferredCounts = {
        "Core Audit": 0,
        "AOA": 0,
        "DID": 0,
        "Digital": 0,
        "Tech Risk": 0,
        "FAAS": 0
    };
    history.forEach(item => {
        if (item.preferredSSL && preferredCounts[item.preferredSSL] !== undefined) {
            preferredCounts[item.preferredSSL]++;
        } else if (item.preferredSSL) {
            const name = item.preferredSSL.toLowerCase();
            if (name.includes('core') || name.includes('audit')) preferredCounts["Core Audit"]++;
            else if (name.includes('aoa')) preferredCounts["AOA"]++;
            else if (name.includes('did')) preferredCounts["DID"]++;
            else if (name.includes('digital')) preferredCounts["Digital"]++;
            else if (name.includes('tech') || name.includes('risk')) preferredCounts["Tech Risk"]++;
            else if (name.includes('faas') || name.includes('advisory')) preferredCounts["FAAS"]++;
        }
    });
    let topPreferredSSL = "N/A";
    let topPreferredCount = -1;
    for (const [dept, count] of Object.entries(preferredCounts)) {
        if (count > topPreferredCount) {
            topPreferredCount = count;
            topPreferredSSL = dept;
        }
    }
    const kpiPrefDept = document.getElementById('kpi-preferred-dept');
    if (kpiPrefDept) kpiPrefDept.textContent = topPreferredSSL;
    const kpiPrefPercentage = document.getElementById('kpi-preferred-percentage');
    if (kpiPrefPercentage) {
        const prefPct = totalRecruits > 0 ? Math.round((topPreferredCount / totalRecruits) * 100) : 0;
        kpiPrefPercentage.textContent = `${prefPct}% of recruits`;
    }

    // 1. Bar Chart: Department Distribution
    const DEPT_COLORS = {
        'Core Audit': '#D4AF37', // Gold
        'AOA': '#E07A5F',        // Terracotta
        'DID': '#3D5A80',        // Deep Blue
        'Digital': '#81B29A',    // Sage Green
        'Tech Risk': '#E29578',  // Soft Peach/Clay
        'FAAS': '#98C1D9'        // Soft Light Blue
    };

    // 1. Bar Chart: Department Distribution
    const ctxDept = document.getElementById('chart-dept-distribution').getContext('2d');
    if (chartDept) chartDept.destroy();
    
    const activeDepts1 = ['Core Audit', 'AOA', 'DID', 'Digital', 'Tech Risk', 'FAAS'].filter(d => deptCounts[d] > 0);
    
    chartDept = new Chart(ctxDept, {
        type: 'bar',
        data: {
            labels: activeDepts1,
            datasets: [{
                label: 'Sorted Recruits',
                data: activeDepts1.map(d => deptCounts[d]),
                backgroundColor: activeDepts1.map(d => DEPT_COLORS[d]),
                borderRadius: 4,
                maxBarThickness: 60
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#2c2c2c' }, ticks: { color: '#858585', font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { color: '#858585', font: { size: 10 } } }
            }
        }
    });

    // 2. Doughnut Chart: Skill Matching
    const ctxSkill = document.getElementById('chart-skill-breakdown').getContext('2d');
    if (chartSkill) chartSkill.destroy();

    const skillCounts = {
        'Accuracy & Integrity': Math.round(deptCounts['Core Audit'] * 0.95),
        'Process & Consistency': Math.round(deptCounts['AOA'] * 0.90),
        'Data Prep & Validation': Math.round(deptCounts['DID'] * 0.92),
        'Automation & Tech': Math.round(deptCounts['Digital'] * 0.88),
        'Security & Compliance': Math.round(deptCounts['Tech Risk'] * 0.94),
        'Research & Advisory': Math.round(deptCounts['FAAS'] * 0.93)
    };

    const skillColorMap = {
        'Accuracy & Integrity': DEPT_COLORS['Core Audit'],
        'Process & Consistency': DEPT_COLORS['AOA'],
        'Data Prep & Validation': DEPT_COLORS['DID'],
        'Automation & Tech': DEPT_COLORS['Digital'],
        'Security & Compliance': DEPT_COLORS['Tech Risk'],
        'Research & Advisory': DEPT_COLORS['FAAS']
    };
    
    const activeSkills = Object.keys(skillCounts).filter(k => skillCounts[k] > 0);

    chartSkill = new Chart(ctxSkill, {
        type: 'doughnut',
        data: {
            labels: activeSkills,
            datasets: [{
                data: activeSkills.map(k => skillCounts[k]),
                backgroundColor: activeSkills.map(k => skillColorMap[k]),
                borderWidth: 1,
                borderColor: '#141414'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#eaeaea', font: { size: 8 } }
                }
            }
        }
    });

    // 3. Grouped Bar: Preference vs Placement
    const ctxPref = document.getElementById('chart-pref-vs-placement');
    if (ctxPref) {
        if (chartPrefVsPlacement) chartPrefVsPlacement.destroy();
        const activeDepts3 = ['Core Audit', 'AOA', 'DID', 'Digital', 'Tech Risk', 'FAAS'].filter(d => deptCounts[d] > 0 || preferredCounts[d] > 0);
        chartPrefVsPlacement = new Chart(ctxPref.getContext('2d'), {
            type: 'bar',
            data: {
                labels: activeDepts3,
                datasets: [
                    {
                        label: 'Preferred (Expected)',
                        data: activeDepts3.map(d => preferredCounts[d]),
                        backgroundColor: '#555555',
                        borderRadius: 2,
                        maxBarThickness: 40
                    },
                    {
                        label: 'Placed (Actual)',
                        data: activeDepts3.map(d => deptCounts[d]),
                        backgroundColor: activeDepts3.map(d => DEPT_COLORS[d]),
                        borderRadius: 2,
                        maxBarThickness: 40
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { color: '#eaeaea', font: { size: 10 } } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#2c2c2c' }, ticks: { color: '#858585' } },
                    x: { grid: { display: false }, ticks: { color: '#858585' } }
                }
            }
        });
    }

    // Prepare data for School Pipeline, Traits, and Secondary Affinity
    const schools = [...new Set(history.map(item => item.school).filter(s => s && s.trim() !== ""))];
    const deptKeysArr = ['Core Audit', 'AOA', 'DID', 'Digital', 'Tech Risk', 'FAAS'];
    
    const activeDepts4 = deptKeysArr.filter(dept => schools.some(sch => history.filter(h => h.school === sch && h.dept === dept).length > 0));
    
    const schoolDatasets = activeDepts4.map(dept => {
        return {
            label: dept,
            data: schools.map(sch => history.filter(h => h.school === sch && h.dept === dept).length),
            backgroundColor: DEPT_COLORS[dept],
            maxBarThickness: 60
        };
    });

    // 4. Stacked Bar: Talent Pipeline by School
    const ctxSchool = document.getElementById('chart-school-pipeline');
    if (ctxSchool) {
        if (chartSchoolPipeline) chartSchoolPipeline.destroy();
        chartSchoolPipeline = new Chart(ctxSchool.getContext('2d'), {
            type: 'bar',
            data: { labels: schools.length ? schools : ['No Data'], datasets: schoolDatasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#eaeaea', font: { size: 8 } } } },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: '#858585' } },
                    y: { stacked: true, beginAtZero: true, grid: { color: '#2c2c2c' }, ticks: { color: '#858585' } }
                }
            }
        });
    }

    // Aggregations for Traits and Secondary Affinity
    const MAX_SCORES_PBI = calculateMaxScores(activeQuestions);
    const deptMapping = { "Core Audit": "CORE_AUDIT", "AOA": "AOA", "DID": "DID", "Digital": "DIGITAL", "Tech Risk": "TECH_RISK", "FAAS": "FAAS" };
    
    let traitTotals = { Structure: 0, Analytical: 0, Strategic: 0, Tech: 0 };
    let validTraitRecruits = 0;
    const secondaryCounts = { "Core Audit": 0, "AOA": 0, "DID": 0, "Digital": 0, "Tech Risk": 0, "FAAS": 0 };
    
    history.forEach(item => {
        const itemScores = item.answers || item.scores;
        if (!itemScores) return; // Legacy records skip
        let normScores = {};
        for (const [d, code] of Object.entries(deptMapping)) {
            const rawScore = itemScores[code] || 0;
            normScores[d] = (rawScore / MAX_SCORES_PBI[code]) * 100;
        }
        validTraitRecruits++;
        traitTotals.Structure += normScores["AOA"];
        traitTotals.Analytical += (normScores["Core Audit"] + normScores["DID"]) / 2;
        traitTotals.Strategic += normScores["FAAS"];
        traitTotals.Tech += (normScores["Digital"] + normScores["Tech Risk"]) / 2;
        
        let sortedDepts = Object.entries(normScores).sort((a, b) => b[1] - a[1]);
        if (sortedDepts.length >= 2) secondaryCounts[sortedDepts[1][0]]++;
    });

    const avgTraits = [
        validTraitRecruits ? Math.round(traitTotals.Structure / validTraitRecruits) : 0,
        validTraitRecruits ? Math.round(traitTotals.Analytical / validTraitRecruits) : 0,
        validTraitRecruits ? Math.round(traitTotals.Strategic / validTraitRecruits) : 0,
        validTraitRecruits ? Math.round(traitTotals.Tech / validTraitRecruits) : 0
    ];
    // 5. Doughnut Chart: Match Confidence (Strong vs Borderline)
    let strongMatch = 0;
    let borderlineMatch = 0;
    let totalMargin = 0;
    let marginCount = 0;
    
    history.forEach(item => {
        const itemScores = item.answers || item.scores;
        if (!itemScores) return;
        let normScores = [];
        for (const [d, code] of Object.entries(deptMapping)) {
            const rawScore = itemScores[code] || 0;
            normScores.push((rawScore / MAX_SCORES_PBI[code]) * 100);
        }
        normScores.sort((a, b) => b - a); // descending
        if (normScores.length >= 2) {
            const margin = normScores[0] - normScores[1];
            totalMargin += margin;
            marginCount++;
            if (margin >= 15) {
                strongMatch++;
            } else {
                borderlineMatch++;
            }
        }
    });

    const kpiAvgConf = document.getElementById('kpi-avg-confidence');
    if (kpiAvgConf) {
        kpiAvgConf.textContent = marginCount > 0 ? (totalMargin / marginCount).toFixed(1) + '%' : '0%';
    }

    const ctxConfidence = document.getElementById('chart-match-confidence');
    if (ctxConfidence) {
        if (chartMatchConfidence) chartMatchConfidence.destroy();
        chartMatchConfidence = new Chart(ctxConfidence.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Strong Match (>15% margin)', 'Borderline Match (<15% margin)'],
                datasets: [{
                    data: [strongMatch, borderlineMatch],
                    backgroundColor: ['#107c41', '#e81123'], // Green vs Red/Warning
                    borderWidth: 1, borderColor: '#141414'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#eaeaea', font: { size: 10 } } } }
            }
        });
    }

    // 6. Pie Chart: Preference vs Assigned Alignment
    let alignedCount = 0;
    let mismatchedCount = 0;
    history.forEach(item => {
        if (!item.preferredSSL || item.preferredSSL === "No Preference" || item.preferredSSL === "Undecided") return;
        if (item.preferredSSL === item.dept) {
            alignedCount++;
        } else {
            mismatchedCount++;
        }
    });

    const ctxPreference = document.getElementById('chart-preference-alignment');
    if (ctxPreference) {
        if (chartPreferenceAlignment) chartPreferenceAlignment.destroy();
        chartPreferenceAlignment = new Chart(ctxPreference.getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['Got Preferred Dept', 'Assigned Different Dept'],
                datasets: [{
                    data: [alignedCount, mismatchedCount],
                    backgroundColor: ['#0078d4', '#ff8c00'], // Blue vs Orange
                    borderWidth: 1, borderColor: '#141414'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#eaeaea', font: { size: 10 } } } }
            }
        });
    }



    // Populate Page 2 logs
    const tableBody = document.getElementById('pbi-logs-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
        const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestItems = sortedHistory.slice(0, 15);

        latestItems.forEach(item => {
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.textContent = item.id;
            tr.appendChild(tdId);
            
            const tdName = document.createElement('td');
            tdName.textContent = item.name || 'Unknown';
            tr.appendChild(tdName);
            
            const tdSchool = document.createElement('td');
            tdSchool.textContent = item.school || 'N/A';
            tr.appendChild(tdSchool);

            const tdPref = document.createElement('td');
            tdPref.textContent = item.preferredSSL || 'N/A';
            tr.appendChild(tdPref);

            const tdDept = document.createElement('td');
            let color = '#fff';
            if (item.dept.toLowerCase().includes('core') || item.dept.toLowerCase().includes('audit')) color = '#D4AF37';
            else if (item.dept.toLowerCase().includes('aoa')) color = '#E07A5F';
            else if (item.dept.toLowerCase().includes('did')) color = '#3D5A80';
            else if (item.dept.toLowerCase().includes('digital')) color = '#81B29A';
            else if (item.dept.toLowerCase().includes('tech') || item.dept.toLowerCase().includes('risk')) color = '#E29578';
            else if (item.dept.toLowerCase().includes('faas') || item.dept.toLowerCase().includes('advisory')) color = '#98C1D9';
            tdDept.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${color}; margin-right:6px;"></span>${item.dept}`;
            tr.appendChild(tdDept);
            
            const tdTime = document.createElement('td');
            tdTime.textContent = new Date(item.timestamp).toLocaleString();
            tr.appendChild(tdTime);
            
            const tdAction = document.createElement('td');
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.style.cssText = 'background: #dc3545; color: #fff; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 0.7rem;';
            delBtn.onclick = async () => {
                let h = JSON.parse(localStorage.getItem('sorting_history')) || [];
                h = h.filter(rec => rec.id !== item.id);
                localStorage.setItem('sorting_history', JSON.stringify(h));
                
                // If it's a firebase entry, delete it there too
                if (item.firebaseKey) {
                    delBtn.textContent = '...';
                    await deleteSortingResult(item.firebaseKey);
                }
                
                renderPowerBICharts(); // re-render
            };
            tdAction.appendChild(delBtn);
            tr.appendChild(tdAction);
            
            tableBody.appendChild(tr);
        });
    }

    // Populate Page 4 Raw Data
    renderRawDataTable(history);
}

function renderRawDataTable(history) {
    const tableBody = document.getElementById('pbi-raw-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    // Sort by timestamp newest first
    const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sortedHistory.forEach(item => {
        const tr = document.createElement('tr');
        
        const tdName = document.createElement('td');
        tdName.textContent = item.name || 'Unknown';
        tr.appendChild(tdName);
        
        const tdSchool = document.createElement('td');
        tdSchool.textContent = item.school || 'N/A';
        tr.appendChild(tdSchool);
        
        const tdPref = document.createElement('td');
        tdPref.textContent = item.preferredSSL || 'N/A';
        tr.appendChild(tdPref);
        
        const tdAssigned = document.createElement('td');
        tdAssigned.textContent = item.dept || 'N/A';
        tr.appendChild(tdAssigned);
        
        // Ensure rawAnswers exists
        const answers = item.rawAnswers || [];
        for (let i = 0; i < 8; i++) {
            const tdQ = document.createElement('td');
            tdQ.textContent = answers[i] || '';
            tr.appendChild(tdQ);
        }
        
        tableBody.appendChild(tr);
    });
}

function setupPowerBITabs() {
    const pbiTabs = document.querySelectorAll('.pbi-tab');
    pbiTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            pbiTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetId = tab.getAttribute('data-target');
            document.querySelectorAll('.pbi-page-content').forEach(page => {
                page.style.display = 'none';
            });
            const targetPage = document.getElementById(targetId);
            if (targetPage) targetPage.style.display = 'block';
            
            const zoomLabel = document.querySelector('.pbi-nav-zoom');
            if (zoomLabel) {
                if (targetId === 'pbi-page-1') zoomLabel.textContent = "Page 1 of 4";
                else if (targetId === 'pbi-page-2') zoomLabel.textContent = "Page 2 of 4";
                else if (targetId === 'pbi-page-3') zoomLabel.textContent = "Page 3 of 4";
                else if (targetId === 'pbi-page-4') zoomLabel.textContent = "Page 4 of 4";
            }
        });
    });
}

let qrCode = null;
function initQRModal() {
    const qrBtn = document.getElementById('pbi-qr-btn');
    const qrModal = document.getElementById('qr-modal');
    const closeQr = document.getElementById('close-qr-btn');
    
    if(qrBtn) {
        qrBtn.addEventListener('click', () => {
            qrModal.style.display = 'flex';
            const container = document.getElementById('qr-code-container');
            container.innerHTML = ''; // clear previous
            qrCode = new QRCode(container, {
                text: window.location.href,
                width: 256,
                height: 256,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        });
    }
    if(closeQr) {
        closeQr.addEventListener('click', () => qrModal.style.display = 'none');
    }
}

function animateSnitchRandomly() {
    const snitch = document.querySelector('.snitch');
    if (!snitch) return;
    
    // Stop any CSS path animation
    snitch.style.animation = 'none';
    snitch.style.offsetPath = 'none';
    
    // Set initial position
    gsap.set(snitch, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    
    function fly() {
        const targetX = Math.random() * (window.innerWidth - 50);
        const targetY = Math.random() * (window.innerHeight - 50);
        
        // Random flight duration between 2s and 5s
        const dur = 2 + Math.random() * 3;
        
        gsap.to(snitch, {
            x: targetX,
            y: targetY,
            duration: dur,
            ease: "sine.inOut",
            onComplete: fly
        });
    }
    
    // Start flying after a short delay
    setTimeout(fly, 500);
}

// Initialize App
async function initApp() {
    init3DScene();
    
    // Wait for fonts to load before revealing UI to prevent FOUT
    await document.fonts.ready;
    document.getElementById('splash-screen').classList.add('active');
    
    animateSnitchRandomly();
    loadSettings();
    loadDbConfig();

    subscribeToGlobalSettings((globalSettings) => {
        if (globalSettings) {
            settings = { ...settings, ...globalSettings };
            applySettings();
        }
    });
    
    // Purge old dummy data generated by previous versions
    try {
        let history = JSON.parse(localStorage.getItem('sorting_history')) || [];
        const originalLength = history.length;
        history = history.filter(item => item.details !== "Automated point match (90%+)");
        if (history.length !== originalLength) {
            localStorage.setItem('sorting_history', JSON.stringify(history));
            console.log(`Purged ${originalLength - history.length} dummy records from local storage.`);
        }
    } catch (e) {
        console.error("Failed to purge dummy data", e);
    }

    setupPowerBITabs();
    initQRModal();
    initDbModal();
    
    try {
        const customScores = await fetchCustomScores();
        if (customScores && Array.isArray(customScores) && customScores.length > 0) {
            activeQuestions = customScores;
            console.log("Loaded custom questions/scores from Firebase");
        } else {
            activeQuestions = JSON.parse(JSON.stringify(QUESTIONS)); // Deep copy from defaults
        }
    } catch (e) {
        console.error("Error loading custom scores:", e);
        activeQuestions = [...QUESTIONS];
    }
    
    enterBtn.addEventListener('click', enterGreatHall);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', () => location.reload());
    
    document.getElementById('cancel-intro-btn').addEventListener('click', () => location.reload());
    document.getElementById('cancel-quiz-btn').addEventListener('click', () => location.reload());
    
    document.getElementById('next-quiz-btn').addEventListener('click', () => {
        playClickSound();
        currentQuestionIndex++;
        if(currentQuestionIndex >= sessionQuestions.length) {
            finishSorting();
        } else {
            loadQuestion(currentQuestionIndex);
        }
    });
    
    document.getElementById('prev-quiz-btn').addEventListener('click', () => {
        playClickSound();
        if(currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion(currentQuestionIndex);
        }
    });
    
    viewHousesBtn.addEventListener('click', openHousesScreen);
    closeHousesBtn.addEventListener('click', closeHousesScreen);
    nextHouseBtn.addEventListener('click', () => navigateHouses(1));
    prevHouseBtn.addEventListener('click', () => navigateHouses(-1));

    // Register dot indicator click events for fast navigation
    document.querySelectorAll('.carousel-dots .dot').forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentHouseIndex = index;
            renderHousePreview();
            gsap.fromTo('#intro-passport-card', { scale: 0.95 }, { scale: 1, duration: animDuration(0.3), ease: "power2.out" });
        });
    });

    // Swipe gesture support for mobile carousel navigation
    const carouselCard = document.getElementById('intro-passport-card');
    if (carouselCard) {
        let touchStartX = 0;
        let touchEndX = 0;
        carouselCard.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        carouselCard.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchStartX - touchEndX;
            if (Math.abs(swipeDistance) > 50) { // Minimum swipe threshold
                if (swipeDistance > 0) {
                    navigateHouses(1); // Swipe left = next
                } else {
                    navigateHouses(-1); // Swipe right = prev
                }
            }
        }, { passive: true });
    }

    function promptPassword(onSuccess) {
        if (sessionStorage.getItem('auditour_admin_auth') === 'true') {
            onSuccess();
            return;
        }

        const modal = document.getElementById('password-modal');
        const input = document.getElementById('admin-password-input');
        const submitBtn = document.getElementById('submit-password-btn');
        const cancelBtn = document.getElementById('cancel-password-btn');
        
        input.value = '';
        modal.style.display = 'flex';
        input.focus();
        
        // Remove previous listeners to avoid duplicates
        const cleanup = () => {
            modal.style.display = 'none';
            submitBtn.removeEventListener('click', handleSubmit);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keypress', handleKeypress);
        };
        
        const handleSubmit = () => {
            if (input.value === "eyauditour2026") {
                sessionStorage.setItem('auditour_admin_auth', 'true');
                cleanup();
                onSuccess();
            } else {
                alert("Incorrect password.");
                input.value = '';
                input.focus();
            }
        };
        
        const handleCancel = () => cleanup();
        
        const handleKeypress = (e) => {
            if (e.key === 'Enter') handleSubmit();
        };
        
        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keypress', handleKeypress);
    }

    document.getElementById('open-settings-btn').addEventListener('click', () => {
        promptPassword(openSettingsScreen);
    });
    document.getElementById('save-settings-btn').addEventListener('click', closeSettingsScreen);
    
    // QR Modal Logic
    document.getElementById('open-qr-btn').addEventListener('click', () => {
        playClickSound();
        const qrModal = document.getElementById('share-modal');
        const qrImg = document.getElementById('share-qr-img');
        const currentUrl = encodeURIComponent(window.location.href);
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${currentUrl}`;
        qrModal.style.display = 'flex';
        gsap.fromTo(qrModal.querySelector('.modal-content'), { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: animDuration(0.4), ease: "back.out(1.5)" });
    });
    
    document.getElementById('close-share-btn').addEventListener('click', () => {
        try { playClickSound(); } catch (e) {}
        const qrModal = document.getElementById('share-modal');
        if (qrModal) qrModal.style.display = 'none';
    });

    document.getElementById('open-admin-btn').addEventListener('click', () => {
        promptPassword(openAdminScreen);
    });
    document.getElementById('pbi-back-btn').addEventListener('click', closeAdminScreen);
    document.getElementById('pbi-refresh-btn').addEventListener('click', renderPowerBICharts);
    
    // Mock data addition
    const addMockBtn = document.getElementById('pbi-add-mock-btn');
    if (addMockBtn) {
        addMockBtn.addEventListener('click', () => {
            const depts = ["Core Audit", "AOA", "DID", "Digital", "Tech Risk", "FAAS"];
            const mockNames = ["Alex Rivera", "Jamie Chen", "Taylor Smith", "Jordan Lee", "Casey Jones", "Morgan Davis"];
            const schools = ["Ateneo de Manila", "De La Salle University", "University of the Philippines", "University of Santo Tomas"];
            const randomDept = depts[Math.floor(Math.random() * depts.length)];
            const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
            const randomSchool = schools[Math.floor(Math.random() * schools.length)];
            const randomPref = depts[Math.floor(Math.random() * depts.length)];
            
            // Generate some random scores for the charts
            const mockScores = {
                CORE_AUDIT: Math.floor(Math.random() * 20),
                AOA: Math.floor(Math.random() * 25),
                DID: Math.floor(Math.random() * 20),
                DIGITAL: Math.floor(Math.random() * 20),
                TECH_RISK: Math.floor(Math.random() * 20),
                FAAS: Math.floor(Math.random() * 20)
            };
            
            // Generate mock raw answers
            const mockRawAnswers = ["A. Mock Answer 1", "B. Mock Answer 2", "C. Mock Answer 3", "D. Mock Answer 4", "E. Mock Answer 5", "A. Mock Answer 6", "B. Mock Answer 7", "C. Mock Answer 8"];
            
            // Save to Firebase Database
            saveSortingResult(randomName, randomDept, mockScores, mockRawAnswers, randomSchool, randomPref);
            
            // Save to Local PowerBI History (Legacy)
            saveResultToHistory(randomDept, randomName, randomSchool, randomPref);
            
            // Small delay to allow Firebase to save before pulling updates
            setTimeout(() => {
                renderPowerBICharts();
            }, 500);
        });
    }
    
    // Theme Toggler
    const themeBtn = document.getElementById('pbi-theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.getElementById('admin-screen').classList.toggle('hp-theme');
            renderPowerBICharts(); // re-render charts to update colors if necessary
        });
    }
    
    // CSV Export functionality
    const exportBtn = document.getElementById('pbi-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            let history = [];
            try {
                history = JSON.parse(localStorage.getItem('sorting_history')) || [];
            } catch (e) { history = []; }
            
            if (history.length === 0) {
                alert("No data to export!");
                return;
            }
            
            // Build CSV string
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Recruit ID,Name,School,Preferred SSL,Assigned Sub Service Line,Timestamp,Details\n"; // Header row
            
            history.forEach(item => {
                const date = new Date(item.timestamp).toLocaleString().replace(/,/g, '');
                const row = `"${item.id}","${item.name || 'Anonymous'}","${item.school || ''}","${item.preferredSSL || ''}","${item.dept}","${date}","${item.details}"`;
                csvContent += row + "\n";
            });
            
            // Trigger download
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `auditour_sorting_data_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const canvasExportBtn = document.getElementById('pbi-canvas-export-btn');
    if (canvasExportBtn && exportBtn) {
        canvasExportBtn.addEventListener('click', () => exportBtn.click());
    }

    const exportJsonBtn = document.getElementById('pbi-export-json-btn');
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            let history = [];
            try {
                history = JSON.parse(localStorage.getItem('sorting_history')) || [];
            } catch (e) { history = []; }
            
            if (history.length === 0) {
                alert("No data to export!");
                return;
            }
            
            const jsonString = JSON.stringify(history, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `auditour_sorting_data_${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // CSV Export functionality (Raw Answers)
    const exportRawBtn = document.getElementById('pbi-export-csv-btn');
    if (exportRawBtn) {
        exportRawBtn.addEventListener('click', () => {
            let history = [];
            try {
                history = JSON.parse(localStorage.getItem('sorting_history')) || [];
            } catch (e) { history = []; }
            
            if (history.length === 0) {
                alert("No raw data to export!");
                return;
            }
            
            let csvContent = "data:text/csv;charset=utf-8,";
            // Header row matches the table
            csvContent += "Name,School,Preferred SSL,Assigned SSL,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8\n";
            
            history.forEach(item => {
                const ans = item.rawAnswers || [];
                const rowData = [
                    `"${item.name || ''}"`,
                    `"${item.school || ''}"`,
                    `"${item.preferredSSL || ''}"`,
                    `"${item.dept || ''}"`,
                    `"${ans[0] || ''}"`,
                    `"${ans[1] || ''}"`,
                    `"${ans[2] || ''}"`,
                    `"${ans[3] || ''}"`,
                    `"${ans[4] || ''}"`,
                    `"${ans[5] || ''}"`,
                    `"${ans[6] || ''}"`,
                    `"${ans[7] || ''}"`
                ];
                csvContent += rowData.join(",") + "\n";
            });
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `copilot_raw_answers_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Cinematic staggered entrance animation
    function playSplashEntrance() {
        const tl = gsap.timeline();
        
        // Start everything hidden
        gsap.set(['.snitch-container', '.intro-text-wrapper', '.hp-sublogo', '.intro-btn-wrapper', '.reveal-hint'], 
            { opacity: 0, y: 20 });
        
        // 1. Snitch flies in first
        tl.to('.snitch-container', {
            opacity: 1, y: 0, duration: animDuration(1.2), ease: "power2.out"
        }, animDuration(0.3))
        
        // 2. Logo fades up
        .to('.intro-text-wrapper', {
            opacity: 1, y: 0, duration: animDuration(1.5), ease: "power3.out"
        }, animDuration(0.8))
        
        // 3. Subtitle slides in
        .to('.hp-sublogo', {
            opacity: 1, y: 0, duration: animDuration(1), ease: "power2.out"
        }, animDuration(1.4))
        
        // 4. Buttons appear
        .to('.intro-btn-wrapper', {
            opacity: 1, y: 0, duration: animDuration(1), ease: "power2.out"
        }, animDuration(2))
        
        // 5. Wand hint fades in last
        .to('.reveal-hint', {
            opacity: 0.4, y: 0, duration: animDuration(1), ease: "power2.out"
        }, animDuration(2.5));
        
        return tl;
    }
    
    playSplashEntrance();
    
    // Tilt Effect for Passport Card
    document.addEventListener('mousemove', (e) => {
        if(screens.reveal.classList.contains('active')) {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 40;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 40;
            passportCard.style.transform = `perspective(1000px) rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        }
    });
}

function loadSettings() {
    const saved = localStorage.getItem('sorting_ceremony_settings');
    if (saved) {
        try {
            settings = { ...settings, ...JSON.parse(saved) };
        } catch (e) {
            console.error("Error loading settings:", e);
        }
    }
    applySettings();
}

function saveSettings() {
    localStorage.setItem('sorting_ceremony_settings', JSON.stringify(settings));
    saveGlobalSettings(settings);
    applySettings();
}

function populateSchoolDropdown() {
    const schoolSelect = document.getElementById('recruit-school-input');
    if (!schoolSelect) return;
    schoolSelect.innerHTML = '<option value="" disabled selected>Select your school</option>';
    const list = settings.schools ? settings.schools.split(',') : [];
    list.forEach(sch => {
        const trimmed = sch.trim();
        if (trimmed) {
            const opt = document.createElement('option');
            opt.value = trimmed;
            opt.textContent = trimmed;
            schoolSelect.appendChild(opt);
        }
    });
}

function applySettings() {
    updateGraphicsSettings(settings.density, settings.speed, settings.color, settings.direction, settings.style);

    if (settings.animSpeed === 'instant') {
        animationSpeedMultiplier = 0.0;
    } else if (settings.animSpeed === 'fast') {
        animationSpeedMultiplier = 0.3;
    } else {
        animationSpeedMultiplier = 1.0;
    }

    if (bgAudio) {
        bgAudio.volume = (settings.volume / 100) * 0.5;
    }

    const pbiIframe = document.getElementById('pbi-iframe');
    if (pbiIframe) {
        if (settings.pbiUrl && settings.pbiUrl.trim() !== '') {
            pbiIframe.src = settings.pbiUrl;
        } else {
            pbiIframe.src = '';
        }
    }
    
    populateSchoolDropdown();

    const densitySelect = document.getElementById('setting-density');
    const speedSelect = document.getElementById('setting-speed');
    const colorSelect = document.getElementById('setting-color');
    const directionSelect = document.getElementById('setting-direction');
    const styleSelect = document.getElementById('setting-style');
    const animSpeedSelect = document.getElementById('setting-anim-speed');
    const volumeSlider = document.getElementById('setting-volume');
    const pbiUrlInput = document.getElementById('setting-pbi-url');
    const schoolsInput = document.getElementById('setting-schools');
    const splashBgSelect = document.getElementById('setting-splash-bg');
    const sortingBgSelect = document.getElementById('setting-sorting-bg');

    if (densitySelect) densitySelect.value = settings.density || 'medium';
    if (speedSelect) speedSelect.value = settings.speed || 'normal';
    if (colorSelect) colorSelect.value = settings.color || 'gold';
    if (directionSelect) directionSelect.value = settings.direction || 'bottom';
    if (styleSelect) styleSelect.value = settings.style || 'linear';
    if (animSpeedSelect) animSpeedSelect.value = settings.animSpeed || 'normal';
    if (volumeSlider) volumeSlider.value = settings.volume || 50;
    if (pbiUrlInput) pbiUrlInput.value = settings.pbiUrl || '';
    if (schoolsInput) schoolsInput.value = settings.schools || '';
    
    if (splashBgSelect && settings.splashBg) splashBgSelect.value = settings.splashBg;
    if (sortingBgSelect && settings.sortingBg) sortingBgSelect.value = settings.sortingBg;

    if (settings.splashBg) {
        document.documentElement.style.setProperty('--splash-bg', settings.splashBg);
    }
    if (settings.sortingBg) {
        document.documentElement.style.setProperty('--sorting-bg', settings.sortingBg);
    }

    populateSchoolDropdown();
}

function openSettingsScreen() {
    switchScreen(screens.splash, screens.settings);
}

function closeSettingsScreen() {
    settings.density = document.getElementById('setting-density').value;
    settings.speed = document.getElementById('setting-speed').value;
    settings.color = document.getElementById('setting-color').value;
    settings.direction = document.getElementById('setting-direction').value;
    settings.style = document.getElementById('setting-style').value;
    settings.animSpeed = document.getElementById('setting-anim-speed').value;
    settings.volume = parseInt(document.getElementById('setting-volume').value);
    settings.pbiUrl = document.getElementById('setting-pbi-url').value;
    
    const splashBgSelect = document.getElementById('setting-splash-bg');
    if (splashBgSelect) settings.splashBg = splashBgSelect.value;
    
    const sortingBgSelect = document.getElementById('setting-sorting-bg');
    if (sortingBgSelect) settings.sortingBg = sortingBgSelect.value;
    
    const schoolsInput = document.getElementById('setting-schools');
    if (schoolsInput) settings.schools = schoolsInput.value;

    saveSettings();
    switchScreen(screens.settings, screens.splash);
}

function openAdminScreen() {
    renderPowerBICharts();
    webglCanvas.style.display = 'none'; // Hide fireflies in admin panel
    switchScreen(screens.splash, screens.admin);
}

function closeAdminScreen() {
    webglCanvas.style.display = 'block'; // Show fireflies again
    switchScreen(screens.admin, screens.splash);
    
    // Re-trigger the cinematic staggered animation
    const tl = gsap.timeline();
    gsap.set(['.snitch-container', '.intro-text-wrapper', '.hp-sublogo', '.intro-btn-wrapper', '.reveal-hint'], 
        { opacity: 0, y: 20 });
    
    tl.to('.snitch-container', { opacity: 1, y: 0, duration: animDuration(1.2), ease: "power2.out" }, animDuration(0.3))
      .to('.intro-text-wrapper', { opacity: 1, y: 0, duration: animDuration(1.5), ease: "power3.out" }, animDuration(0.8))
      .to('.hp-sublogo', { opacity: 1, y: 0, duration: animDuration(1), ease: "power2.out" }, animDuration(1.4))
      .to('.intro-btn-wrapper', { opacity: 1, y: 0, duration: animDuration(1), ease: "power2.out" }, animDuration(2))
      .to('.reveal-hint', { opacity: 0.4, y: 0, duration: animDuration(1), ease: "power2.out" }, animDuration(2.5));
}

function openHousesScreen() {
    currentHouseIndex = 0;
    renderHousePreview();
    switchScreen(screens.splash, housesScreen);
}

function closeHousesScreen() {
    switchScreen(housesScreen, screens.splash);
}

function navigateHouses(dir) {
    currentHouseIndex = (currentHouseIndex + dir + deptKeys.length) % deptKeys.length;
    renderHousePreview();
    
    // Quick bounce animation
    gsap.fromTo('#intro-passport-card', { scale: 0.95 }, { scale: 1, duration: animDuration(0.3), ease: "power2.out" });
}

function renderHousePreview() {
    const dept = DEPARTMENTS[deptKeys[currentHouseIndex]];
    const card = document.getElementById('intro-passport-card');
    if (card) {
        card.className = 'passport-card ' + dept.id.toLowerCase() + '-theme';
        card.style.background = dept.bgColor;
    }
    
    document.getElementById('intro-passport-top').style.background = 'transparent';
    document.getElementById('intro-passport-name').textContent = dept.name;
    document.getElementById('intro-passport-name').style.color = dept.accentColor || '#fff';
    
    const introDeptTitle = document.getElementById('intro-passport-dept');
    if (introDeptTitle) {
        introDeptTitle.textContent = dept.name;
        introDeptTitle.style.color = dept.accentColor || '#fff';
    }

    const introLogo = document.getElementById('intro-passport-logo');
    const introIcon = document.getElementById('intro-passport-icon');
    if (dept.logo) {
        introLogo.src = dept.logo;
        introLogo.style.display = 'block';
        introIcon.style.display = 'none';
    } else {
        introLogo.style.display = 'none';
        introIcon.style.display = 'block';
        introIcon.textContent = dept.icon;
    }

    document.getElementById('intro-passport-skill').textContent = dept.skill;
    document.getElementById('intro-passport-tool').textContent = dept.tool;
    
    const panel1Icon = document.getElementById('intro-passport-panel1-icon');
    if (panel1Icon) panel1Icon.textContent = dept.icon;
    const panel1Desc = document.getElementById('intro-passport-panel1-desc');
    if (panel1Desc) panel1Desc.textContent = dept.description;
    
    document.getElementById('intro-department-description').textContent = dept.description;
    
    renderPursuitsCarousel(card, dept);
    
    triggerRevealAnimation(dept.color); // Change 3D background color to match

    // Update active dot indicator
    const dots = document.querySelectorAll('.carousel-dots .dot');
    dots.forEach((dot, index) => {
        if (index === currentHouseIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function enterGreatHall() {
    initAudio();
    playClickSound();
    
    // Start Audio
    bgAudio.volume = (settings.volume / 100) * 0.5;
    bgAudio.play().catch(e => console.log("Audio play blocked by browser:", e));

    // Fade in the 3D canvas (dust particles) over the background
    webglCanvas.style.opacity = '1';

    // Switch screen with unroll effect
    switchScreen(screens.splash, screens.intro, true);
}

// Transitions
function switchScreen(fromScreen, toScreen, isUnroll = false) {
    if (animationSpeedMultiplier === 0) {
        fromScreen.classList.remove('active');
        fromScreen.style.opacity = '0';
        toScreen.classList.add('active');
        toScreen.style.opacity = '1';
        
        const panel = toScreen.querySelector('.parchment-panel');
        if (panel) {
            gsap.set(panel, { scaleY: 1, opacity: 1 });
            gsap.set(panel.children, { opacity: 1, y: 0 });
        }
        return;
    }

    gsap.to(fromScreen, {
        opacity: 0,
        duration: animDuration(0.8),
        onComplete: () => {
            fromScreen.classList.remove('active');
            toScreen.classList.add('active');
            
            const panel = toScreen.querySelector('.parchment-panel');
            
            if (isUnroll && panel) {
                // Ensure wrapper is visible without default fade
                gsap.set(toScreen, { opacity: 1, scale: 1 });
                
                // Ensure children are hidden initially
                gsap.set(panel.children, { opacity: 0 });

                // 1. Unroll the parchment background
                gsap.fromTo(panel, 
                    { scaleY: 0, transformOrigin: "top center", opacity: 1 }, 
                    { scaleY: 1, duration: animDuration(1.2), ease: "power3.inOut" }
                );
                
                // 2. Fade in the text content after the scroll opens a bit
                gsap.fromTo(panel.children, 
                    { opacity: 0, y: 15 }, 
                    { opacity: 1, y: 0, duration: animDuration(0.8), stagger: animDuration(0.15), delay: animDuration(0.6), ease: "power2.out" }
                );
            } else {
                gsap.fromTo(toScreen, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: animDuration(0.8), ease: "power2.out" });
            }
        }
    });
}

let currentRecruitName = "Anonymous User";
let currentSchool = "";
let currentPreferredSSL = "";

function startGame() {
    try {
        const nameInput = document.getElementById('recruit-name-input');
        const schoolSelect = document.getElementById('recruit-school-input');
        const preferredSslSelect = document.getElementById('recruit-preferred-ssl-input');
        
        let valid = true;
        if (nameInput) {
            if (nameInput.value.trim() === "") {
                gsap.fromTo(nameInput, { x: -10 }, { x: 10, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => gsap.set(nameInput, {x:0}) });
                nameInput.style.borderColor = "red";
                valid = false;
            } else {
                currentRecruitName = nameInput.value.trim();
                nameInput.style.borderColor = "var(--parchment-border)";
            }
        }
        if (schoolSelect) {
            if (schoolSelect.value === "") {
                gsap.fromTo(schoolSelect, { x: -10 }, { x: 10, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => gsap.set(schoolSelect, {x:0}) });
                schoolSelect.style.borderColor = "red";
                valid = false;
            } else {
                currentSchool = schoolSelect.value;
                schoolSelect.style.borderColor = "var(--parchment-border)";
            }
        }
        if (preferredSslSelect) {
            if (preferredSslSelect.value === "") {
                gsap.fromTo(preferredSslSelect, { x: -10 }, { x: 10, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => gsap.set(preferredSslSelect, {x:0}) });
                preferredSslSelect.style.borderColor = "red";
                valid = false;
            } else {
                currentPreferredSSL = preferredSslSelect.value;
                preferredSslSelect.style.borderColor = "var(--parchment-border)";
            }
        }
        
        if (!valid) return;

        playClickSound();
        triggerInteractionAnimation();
        switchScreen(screens.intro, screens.question);
        
        // Pick 8 questions in sequential order
        if (!activeQuestions || !Array.isArray(activeQuestions)) throw new Error("activeQuestions array is not loaded correctly.");
        sessionQuestions = [...activeQuestions].slice(0, 8);
        currentQuestionIndex = 0;
        
        // reset tracking arrays and scores
        userAnswers = [];
        rawAnswers = [];
        for(const key of Object.keys(scores)) scores[key] = 0;
        
        loadQuestion(0);
    } catch (error) {
        alert("Error in startGame: " + error.message + "\nStack: " + error.stack);
        console.error(error);
    }
}

let typewriterTimeout;
function loadQuestion(index) {
    if (typewriterTimeout) clearTimeout(typewriterTimeout);
    
    const q = sessionQuestions[index];
    if (!q) {
        finishSorting();
        return;
    }

    // Animate out old question if exists
    if (index > 0) {
        if (animationSpeedMultiplier === 0) {
            renderQuestionData(q);
        } else {
            gsap.to([questionText, optionsContainer], {
                opacity: 0, y: -20, duration: animDuration(0.4), onComplete: () => renderQuestionData(q)
            });
        }
    } else {
        renderQuestionData(q);
    }
}

function renderQuestionData(q) {
    questionText.textContent = q.question;
    optionsContainer.innerHTML = '';
    
    gsap.set([questionText, optionsContainer], { opacity: 1, x: 0, y: 0 });

    showOptions();

    function showOptions() {
        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt.text;
            btn.onmouseenter = playHoverSound;
            
            // Check if already selected (from moving previous)
            if (userAnswers[currentQuestionIndex] === opt.points) {
                btn.classList.add('selected');
            }
            
            btn.onclick = () => { 
                playClickSound(); 
                handleAnswer(opt.points, btn); 
            };
            optionsContainer.appendChild(btn);
        });

        if (animationSpeedMultiplier > 0) {
            gsap.fromTo(optionsContainer.children, 
                { opacity: 0, x: 50 }, 
                { opacity: 1, x: 0, duration: animDuration(0.6), stagger: animDuration(0.1), ease: "power2.out" }
            );
        }
    }

    // Update Progress Bar & Text
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = `Question ${currentQuestionIndex + 1} of ${sessionQuestions.length}`;
    }
    const progress = ((currentQuestionIndex) / sessionQuestions.length) * 100;
    progressBar.style.width = `${progress}%`;

    // Manage Prev/Next Button visibility
    const prevBtn = document.getElementById('prev-quiz-btn');
    const nextBtn = document.getElementById('next-quiz-btn');
    
    if (prevBtn) {
        if (currentQuestionIndex > 0) {
            prevBtn.style.visibility = 'visible';
            prevBtn.style.opacity = '1';
            prevBtn.style.pointerEvents = 'auto';
            prevBtn.parentElement.classList.remove('first-question');
        } else {
            prevBtn.style.visibility = 'hidden';
            prevBtn.style.opacity = '0';
            prevBtn.style.pointerEvents = 'none';
            prevBtn.parentElement.classList.add('first-question');
        }
    }
    
    if (nextBtn) {
        // Only enable if an answer has already been selected for this index
        if (userAnswers[currentQuestionIndex]) {
            nextBtn.style.opacity = '1';
            nextBtn.style.pointerEvents = 'auto';
        } else {
            nextBtn.style.opacity = '0.5';
            nextBtn.style.pointerEvents = 'none';
        }
    }
}

function handleAnswer(points, selectedBtn) {
    // Save to userAnswers array
    userAnswers[currentQuestionIndex] = points;
    rawAnswers[currentQuestionIndex] = selectedBtn.innerText.trim();
    
    // Visually highlight selection
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(b => {
        b.classList.remove('selected');
    });
    
    selectedBtn.classList.add('selected');
    
    // Enable Next button
    const nextBtn = document.getElementById('next-quiz-btn');
    if (nextBtn) {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    }
    
    triggerInteractionAnimation();
}

function calculateMaxScores(questionsArray) {
    const maxScores = { CORE_AUDIT: 0, AOA: 0, DID: 0, DIGITAL: 0, TECH_RISK: 0, FAAS: 0 };
    questionsArray.forEach(q => {
        let maxForQ = { CORE_AUDIT: 0, AOA: 0, DID: 0, DIGITAL: 0, TECH_RISK: 0, FAAS: 0 };
        if (q.options) {
            q.options.forEach(opt => {
                if (opt.points) {
                    for (const [dept, pts] of Object.entries(opt.points)) {
                        if (maxForQ[dept] !== undefined) {
                            maxForQ[dept] = Math.max(maxForQ[dept], pts);
                        }
                    }
                }
            });
        }
        for (const [dept, maxPts] of Object.entries(maxForQ)) {
            maxScores[dept] += maxPts;
        }
    });
    // Safeguard to prevent division by zero
    for (const dept of Object.keys(maxScores)) {
        if (maxScores[dept] === 0) maxScores[dept] = 1;
    }
    return maxScores;
}

function finishSorting() {
    progressBar.style.width = `100%`;

    // Recalculate total scores from userAnswers
    for(const key of Object.keys(scores)) scores[key] = 0;
    userAnswers.forEach(pts => {
        if (pts) {
            for (const [dept, value] of Object.entries(pts)) {
                scores[dept] += value;
            }
        }
    });

    // Max score configuration dynamically calculated from actual questions asked
    const MAX_SCORES = calculateMaxScores(sessionQuestions);

    // Calculate normalized percentage scores
    let normalizedScores = {};
    for (const [dept, score] of Object.entries(scores)) {
        normalizedScores[dept] = (score / MAX_SCORES[dept]) * 100;
    }

    // Calculate winner
    let maxPercentage = -1;
    for (const [dept, pct] of Object.entries(normalizedScores)) {
        if (pct > maxPercentage) {
            maxPercentage = pct;
        }
    }

    // Tie-Breaker Logic
    const tiedDepts = Object.keys(normalizedScores).filter(dept => normalizedScores[dept] === maxPercentage);
    
    if (tiedDepts.length > 1) { // Look for unused questions if tied
        // Find an unused question that has points for these tied departments
        const unused = activeQuestions.filter(q => !sessionQuestions.includes(q));
        if (unused.length > 0) {
            sessionQuestions.push(unused[0]); // Sudden Death Question
            loadQuestion(currentQuestionIndex);
            return; 
        }
    }

    // Resolve randomly if still tied and no questions left
    const winningDeptId = tiedDepts[Math.floor(Math.random() * tiedDepts.length)];
    const finalDept = DEPARTMENTS[winningDeptId];
    
    // Find Secondary Affinity
    let secondMax = -1;
    let affinityDeptId = null;
    for (const [dept, pct] of Object.entries(normalizedScores)) {
        if (dept !== winningDeptId && pct > secondMax && pct > 0) {
            secondMax = pct;
            affinityDeptId = dept;
        }
    }

    const deptKeys = Object.keys(DEPARTMENTS);
    
    // DOM Elements for Passport
    const passportTop = document.getElementById('passport-top');
    const passportIcon = document.getElementById('passport-icon');
    const passportDeptSub = document.getElementById('passport-dept-sub');
    const passportDept = document.getElementById('passport-dept');
    const passportSkill = document.getElementById('passport-skill');
    const passportTool = document.getElementById('passport-tool');
    const deptDesc = document.getElementById('department-description');
    
    const affinityBox = document.getElementById('affinity-box');
    const passportAffinity = document.getElementById('passport-affinity');

    // Switch Screen first
    switchScreen(screens.question, screens.reveal);

    const passportName = document.getElementById('passport-name');
    if (passportName) {
        passportName.textContent = currentRecruitName.toUpperCase();
    }

    // Deliberation Cycle Animation (Slot Machine effect)
    let cycleCount = 0;
    const maxCycles = animationSpeedMultiplier === 0 ? 0 : 20; 
    let cycleInterval;

    if (animationSpeedMultiplier === 0) {
        lockInFinalDepartment(finalDept, affinityDeptId);
    } else {
        setTimeout(() => {
            cycleInterval = setInterval(() => {
                const randomDept = DEPARTMENTS[deptKeys[cycleCount % deptKeys.length]];
                updatePassportUI(randomDept);
                playHoverSound();
                
                triggerInteractionAnimation(); // Speed up 3D particles during deliberation
                
                cycleCount++;
                
                if (cycleCount >= maxCycles) {
                    clearInterval(cycleInterval);
                    lockInFinalDepartment(finalDept, affinityDeptId);
                }
            }, 150 * animationSpeedMultiplier);
        }, 800 * animationSpeedMultiplier);
    }

    function updatePassportUI(dept) {
        passportCard.className = 'passport-card ' + dept.id.toLowerCase() + '-theme';
        passportCard.style.background = dept.bgColor;
        passportTop.style.background = 'transparent';
        
        const mainLogo = document.getElementById('passport-logo');
        if (dept.logo) {
            mainLogo.src = dept.logo;
            mainLogo.style.display = 'block';
            passportIcon.style.display = 'none';
        } else {
            mainLogo.style.display = 'none';
            passportIcon.style.display = 'block';
            passportIcon.textContent = dept.icon;
        }

        passportDeptSub.textContent = dept.name;
        passportDeptSub.style.color = dept.accentColor || '#fff';
        
        passportDept.textContent = dept.name;
        passportDept.style.color = dept.accentColor || '#ffd700';
        
        passportSkill.textContent = dept.skill;
        passportTool.textContent = dept.tool;

        const panel1Icon = document.getElementById('passport-panel1-icon');
        if (panel1Icon) panel1Icon.textContent = dept.icon;
        const panel1Desc = document.getElementById('passport-panel1-desc');
        if (panel1Desc) panel1Desc.textContent = dept.description;
        
        renderPursuitsCarousel(passportCard, dept);
    }

    function lockInFinalDepartment(dept, affinityId) {
        playRevealSound();
        updatePassportUI(dept);
        
        if (affinityId) {
            if (affinityBox) affinityBox.style.display = 'flex';
            if (passportAffinity) {
                passportAffinity.textContent = DEPARTMENTS[affinityId].name;
                passportAffinity.style.color = DEPARTMENTS[affinityId].accentColor || '#ffd700';
            }
        } else {
            if (affinityBox) affinityBox.style.display = 'none';
        }

        if (animationSpeedMultiplier > 0) {
            // Flash and Shake
            const flash = document.getElementById('flash-overlay');
            gsap.fromTo(flash, { opacity: 1 }, { opacity: 0, duration: 1.5, ease: "power2.out" });
            
            document.body.classList.add('shake-active');
            setTimeout(() => document.body.classList.remove('shake-active'), 500);

            // Massive UI feedback
            gsap.fromTo(passportCard, { scale: 0.95 }, { scale: 1, duration: animDuration(0.5), ease: "elastic.out(1, 0.5)" });
            
            deptDesc.textContent = dept.description;
            restartBtn.style.display = 'inline-block';
            downloadBtn.style.display = 'inline-block';
            gsap.fromTo([restartBtn, downloadBtn], { opacity: 0 }, { opacity: 1, duration: animDuration(1), delay: animDuration(1) });
        } else {
            gsap.set(passportCard, { scale: 1 });
            deptDesc.textContent = dept.description;
            restartBtn.style.display = 'inline-block';
            downloadBtn.style.display = 'inline-block';
            gsap.set([restartBtn, downloadBtn], { opacity: 1 });
        }

        // Setup Download Logic
        downloadBtn.onclick = () => {
            playClickSound();
            // temporarily disable tilt
            passportCard.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
            html2canvas(passportCard, { backgroundColor: null, scale: 2 }).then(canvas => {
                const link = document.createElement('a');
                link.download = `Auditour_Sorting_${dept.name.replace(/\s/g, '_')}.png`;
                link.href = canvas.toDataURL();
                link.click();
            });
        };

        // Trigger Massive 3D Reveal
        triggerRevealAnimation(dept.color);

        // Save to Firebase/SharePoint
        saveSortingResult(currentRecruitName, dept.name, scores, rawAnswers, currentSchool, currentPreferredSSL);

        // Save to local PowerBI history tracker
        saveResultToHistory(dept.name, currentRecruitName, currentSchool, currentPreferredSSL);
    }
}

let dbConfig = { provider: 'firebase' };

function loadDbConfig() {
    const saved = localStorage.getItem('auditour_db_config');
    if (saved) {
        try { dbConfig = JSON.parse(saved); } catch(e) {}
    }
    initDatabase(dbConfig);
}

function initDbModal() {
    const dbBtn = document.getElementById('pbi-db-btn');
    const dbModal = document.getElementById('db-modal');
    const closeBtn = document.getElementById('close-db-btn');
    const saveBtn = document.getElementById('save-db-btn');
    const providerSelect = document.getElementById('db-provider-select');
    
    const fbFields = document.getElementById('db-firebase-fields');
    const spFields = document.getElementById('db-sharepoint-fields');

    if (dbBtn) dbBtn.addEventListener('click', () => {
        // Load values into UI
        providerSelect.value = dbConfig.provider || 'local';
        
        document.getElementById('fb-apiKey').value = dbConfig.fb_apiKey || '';
        document.getElementById('fb-authDomain').value = dbConfig.fb_authDomain || '';
        document.getElementById('fb-databaseURL').value = dbConfig.fb_databaseURL || '';
        document.getElementById('fb-projectId').value = dbConfig.fb_projectId || '';
        document.getElementById('fb-appId').value = dbConfig.fb_appId || '';

        document.getElementById('sp-tenantId').value = dbConfig.sp_tenantId || '';
        document.getElementById('sp-clientId').value = dbConfig.sp_clientId || '';
        document.getElementById('sp-clientSecret').value = dbConfig.sp_clientSecret || '';
        document.getElementById('sp-siteId').value = dbConfig.sp_siteId || '';
        document.getElementById('sp-listId').value = dbConfig.sp_listId || '';
        
        providerSelect.dispatchEvent(new Event('change'));
        dbModal.style.display = 'flex';
    });

    if (closeBtn) closeBtn.addEventListener('click', () => dbModal.style.display = 'none');
    
    if (providerSelect) providerSelect.addEventListener('change', (e) => {
        fbFields.style.display = e.target.value === 'firebase' ? 'flex' : 'none';
        spFields.style.display = e.target.value === 'sharepoint' ? 'flex' : 'none';
    });

    if (saveBtn) saveBtn.addEventListener('click', () => {
        dbConfig = {
            provider: providerSelect.value,
            
            fb_apiKey: document.getElementById('fb-apiKey').value,
            fb_authDomain: document.getElementById('fb-authDomain').value,
            fb_databaseURL: document.getElementById('fb-databaseURL').value,
            fb_projectId: document.getElementById('fb-projectId').value,
            fb_appId: document.getElementById('fb-appId').value,
            
            sp_tenantId: document.getElementById('sp-tenantId').value,
            sp_clientId: document.getElementById('sp-clientId').value,
            sp_clientSecret: document.getElementById('sp-clientSecret').value,
            sp_siteId: document.getElementById('sp-siteId').value,
            sp_listId: document.getElementById('sp-listId').value
        };
        
        localStorage.setItem('auditour_db_config', JSON.stringify(dbConfig));
        dbModal.style.display = 'none';
        
        // Re-initialize backend
        initDatabase(dbConfig);
        renderPowerBICharts();
        alert('Database configuration saved.');
    });
}

// Start
window.addEventListener('DOMContentLoaded', initApp);

function renderPursuitsCarousel(card, dept) {
    if (!card) return;
    const carouselItemsContainer = card.querySelector('.carousel-items');
    if (carouselItemsContainer && dept.pursuits) {
        carouselItemsContainer.innerHTML = '';
        dept.pursuits.forEach(p => {
            const item = document.createElement('div');
            item.className = 'carousel-item';
            
            let badgeHTML = '';
            if (p.icon.length <= 3) {
                badgeHTML = `<div class="item-circle tool-badge" style="background: ${p.iconColor || 'var(--panel-accent)'}; border-color: ${p.iconColor || 'var(--panel-accent)'}; color: #fff; font-family: 'Inter', sans-serif; font-weight: 800; font-size: 0.9rem; justify-content: center; align-items: center; display: flex; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${p.icon}</div>`;
            } else {
                badgeHTML = `<div class="item-circle"><span>${p.icon}</span></div>`;
            }
            
            item.innerHTML = `
                ${badgeHTML}
                <div class="item-label">${p.name}</div>
            `;
            
            item.title = `${p.name}: ${p.desc}`;
            item.onclick = () => {
                showPursuitModal(p.name, p.desc, dept.name, p.icon, p.iconColor);
            };
            
            carouselItemsContainer.appendChild(item);
        });
    }
}

function showPursuitModal(name, desc, deptName, icon, iconColor) {
    playClickSound();
    
    let modal = document.getElementById('pursuit-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pursuit-detail-modal';
        modal.className = 'pursuit-modal';
        modal.innerHTML = `
            <div class="pursuit-modal-content">
                <button class="pursuit-modal-close">&times;</button>
                <div class="pursuit-modal-badge" id="pm-badge"></div>
                <h3 class="pursuit-modal-title" id="pm-title"></h3>
                <div class="pursuit-modal-subtitle" id="pm-subtitle"></div>
                <div class="pursuit-modal-desc" id="pm-desc"></div>
                <button class="ink-btn pm-close-btn" style="padding: 8px 20px; font-size: 0.9rem; margin-top: 10px;">Got it</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        const closeBtn = modal.querySelector('.pursuit-modal-close');
        const gotItBtn = modal.querySelector('.pm-close-btn');
        const closeModal = () => {
            playClickSound();
            modal.classList.remove('active');
        };
        closeBtn.onclick = closeModal;
        gotItBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }
    
    const badge = modal.querySelector('#pm-badge');
    if (icon.length <= 3) {
        badge.innerHTML = icon;
        badge.style.background = iconColor || 'var(--panel-accent)';
        badge.style.color = '#fff';
        badge.style.fontFamily = "'Inter', sans-serif";
        badge.style.fontWeight = '800';
        badge.style.fontSize = '1.8rem';
    } else {
        badge.innerHTML = `<span>${icon}</span>`;
        badge.style.background = 'rgba(255,255,255,0.1)';
        badge.style.color = 'inherit';
        badge.style.fontSize = '2.5rem';
    }
    
    modal.querySelector('#pm-title').textContent = name;
    modal.querySelector('#pm-subtitle').textContent = `HOW TO PURSUE - ${deptName}`;
    modal.querySelector('#pm-desc').textContent = desc;
    
    modal.classList.add('active');
}
