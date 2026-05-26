import { QUESTIONS, DEPARTMENTS } from './data_questions.js';
import { saveSortingResult, initDatabase, fetchSortingResults } from './firebase-config.js';
import { init3DScene, triggerInteractionAnimation, triggerRevealAnimation, updateGraphicsSettings } from './scene.js';

// State
let currentQuestionIndex = 0;
let sessionQuestions = [];
let userAnswers = [];
let scores = {
    AOA: 0,
    ADN: 0,
    TECH_RISK: 0,
    DID: 0
};

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
    pbiUrl: ''
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
    
    const hasOldDepts = history.some(item => ["Engineering", "Marketing", "Design", "Operations"].includes(item.dept));
    
    if (!history || history.length === 0 || hasOldDepts) {
        history = [];
        const depts = ["AOA", "ADN", "Tech Risk", "DID"];
        const mockNames = ["Alex Rivera", "Jamie Chen", "Taylor Smith", "Jordan Lee", "Casey Jones", "Morgan Davis", "Avery Clark", "Riley Miller"];
        const startT = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
        for (let i = 0; i < 142; i++) {
            const randomDept = depts[Math.floor(Math.random() * depts.length)];
            const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
            const randomTime = new Date(startT + Math.random() * (Date.now() - startT));
            history.push({
                id: "REC-" + (1000 + i),
                name: randomName,
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

function saveResultToHistory(deptName, recruitName) {
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
        timestamp: new Date().toISOString(),
        details: "Live ceremony assignment"
    });
    
    localStorage.setItem('sorting_history', JSON.stringify(history));
}

function renderPowerBICharts() {
    if (dbConfig && dbConfig.provider === 'firebase') {
        fetchSortingResults().then(fbHistory => {
            let history = fbHistory || [];
            if (fbHistory && fbHistory.length > 0) {
                localStorage.setItem('sorting_history', JSON.stringify(history));
            } else {
                history = JSON.parse(localStorage.getItem('sorting_history')) || [];
            }
            drawDashboard(history);
        }).catch(e => {
            console.error("Firebase fetch error:", e);
            const history = JSON.parse(localStorage.getItem('sorting_history')) || [];
            drawDashboard(history);
        });
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
        "AOA": 0,
        "ADN": 0,
        "Tech Risk": 0,
        "DID": 0
    };

    history.forEach(item => {
        if (deptCounts[item.dept] !== undefined) {
            deptCounts[item.dept]++;
        } else {
            // Match substring just in case
            const name = item.dept.toLowerCase();
            if (name.includes('aoa')) deptCounts["AOA"]++;
            else if (name.includes('adn')) deptCounts["ADN"]++;
            else if (name.includes('tech') || name.includes('risk')) deptCounts["Tech Risk"]++;
            else if (name.includes('did')) deptCounts["DID"]++;
        }
    });

    // Find popular department
    let popularDeptName = "AOA";
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

    // 1. Bar Chart: Department Distribution
    const ctxDept = document.getElementById('chart-dept-distribution').getContext('2d');
    if (chartDept) chartDept.destroy();
    chartDept = new Chart(ctxDept, {
        type: 'bar',
        data: {
            labels: ['AOA', 'ADN', 'Tech Risk', 'DID'],
            datasets: [{
                label: 'Sorted Recruits',
                data: [deptCounts['AOA'], deptCounts['ADN'], deptCounts['Tech Risk'], deptCounts['DID']],
                backgroundColor: ['#ffd700', '#38b6ff', '#ff5757', '#39ff14'],
                borderRadius: 4
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
        'Quality & Process': Math.round(deptCounts['AOA'] * 0.95),
        'Analytics & Insights': Math.round(deptCounts['ADN'] * 0.90),
        'Security & Compliance': Math.round(deptCounts['Tech Risk'] * 0.92),
        'Dev & Engineering': Math.round(deptCounts['DID'] * 0.88),
        'Strategy Plan': Math.round((deptCounts['AOA'] + deptCounts['ADN']) * 0.15)
    };

    chartSkill = new Chart(ctxSkill, {
        type: 'doughnut',
        data: {
            labels: Object.keys(skillCounts),
            datasets: [{
                data: Object.values(skillCounts),
                backgroundColor: ['#ffd700', '#38b6ff', '#ff5757', '#39ff14', '#cda73b'],
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

    // 3. Line Chart: Activity Timeline
    const ctxTimeline = document.getElementById('chart-activity-timeline').getContext('2d');
    if (chartTimeline) chartTimeline.destroy();

    const timelineData = [];
    const timelineLabels = [];
    
    for (let d = 7; d >= 0; d--) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const dayStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        timelineLabels.push(dayStr);

        const dayEnd = date.getTime();
        const countUpToDay = history.filter(item => new Date(item.timestamp).getTime() <= dayEnd).length;
        timelineData.push(countUpToDay);
    }

    chartTimeline = new Chart(ctxTimeline, {
        type: 'line',
        data: {
            labels: timelineLabels,
            datasets: [{
                label: 'Cumulative Sorted',
                data: timelineData,
                borderColor: '#f2c811',
                backgroundColor: 'rgba(242, 200, 17, 0.05)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 2,
                pointBackgroundColor: '#f2c811'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#2c2c2c' }, ticks: { color: '#858585', font: { size: 10 } } },
                x: { grid: { color: '#2c2c2c' }, ticks: { color: '#858585', font: { size: 10 } } }
            }
        }
    });

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
            
            const tdDept = document.createElement('td');
            let color = '#fff';
            if (item.dept.toLowerCase().includes('aoa')) color = '#ffd700';
            else if (item.dept.toLowerCase().includes('adn')) color = '#38b6ff';
            else if (item.dept.toLowerCase().includes('tech') || item.dept.toLowerCase().includes('risk')) color = '#ff5757';
            else if (item.dept.toLowerCase().includes('did')) color = '#39ff14';
            tdDept.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${color}; margin-right:6px;"></span>${item.dept}`;
            tr.appendChild(tdDept);
            
            const tdTime = document.createElement('td');
            tdTime.textContent = new Date(item.timestamp).toLocaleString();
            tr.appendChild(tdTime);
            
            const tdDetails = document.createElement('td');
            tdDetails.innerHTML = `<span class="pbi-badge">Verified</span>`;
            tr.appendChild(tdDetails);
            
            const tdAction = document.createElement('td');
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.style.cssText = 'background: #dc3545; color: #fff; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 0.7rem;';
            delBtn.onclick = () => {
                let h = JSON.parse(localStorage.getItem('sorting_history')) || [];
                h = h.filter(rec => rec.id !== item.id);
                localStorage.setItem('sorting_history', JSON.stringify(h));
                renderPowerBICharts(); // re-render
            };
            tdAction.appendChild(delBtn);
            tr.appendChild(tdAction);
            
            tableBody.appendChild(tr);
        });
    }
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
                zoomLabel.textContent = targetId === 'pbi-page-1' ? "Page 1 of 2" : "Page 2 of 2";
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
function initApp() {
    init3DScene();
    animateSnitchRandomly();
    loadSettings();
    loadDbConfig();
    seedHistoryIfNeeded();
    setupPowerBITabs();
    initQRModal();
    initDbModal();
    
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

    document.getElementById('open-settings-btn').addEventListener('click', openSettingsScreen);
    document.getElementById('save-settings-btn').addEventListener('click', closeSettingsScreen);
    document.getElementById('open-admin-btn').addEventListener('click', openAdminScreen);
    document.getElementById('pbi-back-btn').addEventListener('click', closeAdminScreen);
    document.getElementById('pbi-refresh-btn').addEventListener('click', renderPowerBICharts);
    
    // Mock data addition
    const addMockBtn = document.getElementById('pbi-add-mock-btn');
    if (addMockBtn) {
        addMockBtn.addEventListener('click', () => {
            const depts = ["AOA", "ADN", "Tech Risk", "DID"];
            const mockNames = ["Alex Rivera", "Jamie Chen", "Taylor Smith", "Jordan Lee", "Casey Jones", "Morgan Davis"];
            const randomDept = depts[Math.floor(Math.random() * depts.length)];
            const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
            saveResultToHistory(randomDept, randomName);
            renderPowerBICharts();
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
            csvContent += "Recruit ID,Department,Timestamp,Details\n"; // Header row
            
            history.forEach(item => {
                const date = new Date(item.timestamp).toLocaleString().replace(/,/g, '');
                const row = `"${item.id}","${item.dept}","${date}","${item.details}"`;
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

    // Splash Animation
    gsap.from('.splash-content', {
        y: 30,
        opacity: 0,
        duration: animDuration(2),
        ease: "power2.out",
        delay: animDuration(0.5)
    });
    
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
    applySettings();
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

    const densitySelect = document.getElementById('setting-density');
    const speedSelect = document.getElementById('setting-speed');
    const colorSelect = document.getElementById('setting-color');
    const directionSelect = document.getElementById('setting-direction');
    const styleSelect = document.getElementById('setting-style');
    const animSpeedSelect = document.getElementById('setting-anim-speed');
    const volumeSlider = document.getElementById('setting-volume');
    const pbiUrlInput = document.getElementById('setting-pbi-url');

    if (densitySelect) densitySelect.value = settings.density;
    if (speedSelect) speedSelect.value = settings.speed;
    if (colorSelect) colorSelect.value = settings.color;
    if (directionSelect) directionSelect.value = settings.direction;
    if (styleSelect) styleSelect.value = settings.style;
    if (animSpeedSelect) animSpeedSelect.value = settings.animSpeed;
    if (volumeSlider) volumeSlider.value = settings.volume;
    if (pbiUrlInput) pbiUrlInput.value = settings.pbiUrl;
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
    
    document.getElementById('intro-passport-top').style.background = dept.bgColor;
    document.getElementById('intro-passport-name').textContent = dept.name;
    document.getElementById('intro-passport-name').style.color = dept.accentColor || '#fff';
    document.getElementById('intro-passport-icon').textContent = dept.icon;
    document.getElementById('intro-passport-skill').textContent = dept.skill;
    document.getElementById('intro-passport-tool').textContent = dept.tool;
    document.getElementById('intro-department-description').textContent = dept.description;
    
    triggerRevealAnimation(dept.color); // Change 3D background color to match
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

function startGame() {
    try {
        const nameInput = document.getElementById('recruit-name-input');
        if (nameInput) {
            if (nameInput.value.trim() === "") {
                // Shake the input to prompt the user visually
                gsap.fromTo(nameInput, { x: -10 }, { x: 10, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => gsap.set(nameInput, {x:0}) });
                nameInput.style.borderColor = "red";
                return;
            }
            currentRecruitName = nameInput.value.trim();
            nameInput.style.borderColor = "var(--parchment-border)";
        }

        playClickSound();
        triggerInteractionAnimation();
        switchScreen(screens.intro, screens.question);
        
        // Pick 5 random questions
        if (!QUESTIONS || !Array.isArray(QUESTIONS)) throw new Error("QUESTIONS array is not loaded correctly.");
        const shuffledQuestions = [...QUESTIONS].sort(() => Math.random() - 0.5);
        sessionQuestions = shuffledQuestions.slice(0, 5);
        currentQuestionIndex = 0;
        
        // reset tracking arrays and scores
        userAnswers = [];
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
                btn.style.background = 'rgba(212, 175, 55, 0.2)';
                btn.style.borderColor = 'var(--gold)';
                btn.style.color = '#000';
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
            prevBtn.style.display = 'inline-block';
            prevBtn.style.opacity = '1';
            prevBtn.style.pointerEvents = 'auto';
        } else {
            prevBtn.style.display = 'none';
            prevBtn.style.opacity = '0';
            prevBtn.style.pointerEvents = 'none';
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
    
    // Visually highlight selection
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(b => {
        b.style.background = '';
        b.style.borderColor = 'var(--parchment-border)';
        b.style.color = '#2c241b';
    });
    
    selectedBtn.style.background = 'rgba(212, 175, 55, 0.2)';
    selectedBtn.style.borderColor = 'var(--gold)';
    selectedBtn.style.color = '#000';
    
    // Enable Next button
    const nextBtn = document.getElementById('next-quiz-btn');
    if (nextBtn) {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    }
    
    triggerInteractionAnimation();
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

    // Calculate winner
    let maxScore = -1;
    for (const [dept, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
        }
    }

    // Tie-Breaker Logic
    const tiedDepts = Object.keys(scores).filter(dept => scores[dept] === maxScore);
    
    if (tiedDepts.length > 1 && currentQuestionIndex < 8) { // Prevent infinite tie loops
        // Find an unused question that has points for these tied departments
        const unused = QUESTIONS.filter(q => !sessionQuestions.includes(q));
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
    for (const [dept, score] of Object.entries(scores)) {
        if (dept !== winningDeptId && score > secondMax && score > 0) {
            secondMax = score;
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
        passportTop.style.background = dept.bgColor;
        passportIcon.textContent = dept.icon;
        passportDeptSub.textContent = dept.name;
        passportDeptSub.style.color = dept.accentColor || '#fff';
        
        passportDept.textContent = dept.name;
        passportDept.style.color = dept.accentColor || '#ffd700';
        
        passportSkill.textContent = dept.skill;
        passportTool.textContent = dept.tool;
    }

    function lockInFinalDepartment(dept, affinityId) {
        playRevealSound();
        updatePassportUI(dept);
        
        if (affinityId) {
            affinityBox.style.display = 'flex';
            passportAffinity.textContent = DEPARTMENTS[affinityId].name;
            passportAffinity.style.color = DEPARTMENTS[affinityId].accentColor || '#ffd700';
        } else {
            affinityBox.style.display = 'none';
        }

        if (animationSpeedMultiplier > 0) {
            // Flash and Shake
            const flash = document.getElementById('flash-overlay');
            gsap.fromTo(flash, { opacity: 1 }, { opacity: 0, duration: 1.5, ease: "power2.out" });
            
            document.body.classList.add('shake-active');
            setTimeout(() => document.body.classList.remove('shake-active'), 500);

            // Massive UI feedback
            gsap.fromTo(passportTop, { scale: 0.95 }, { scale: 1, duration: animDuration(0.5), ease: "elastic.out(1, 0.5)" });
            
            deptDesc.textContent = dept.description;
            restartBtn.style.display = 'inline-block';
            downloadBtn.style.display = 'inline-block';
            gsap.fromTo([restartBtn, downloadBtn], { opacity: 0 }, { opacity: 1, duration: animDuration(1), delay: animDuration(1) });
        } else {
            gsap.set(passportTop, { scale: 1 });
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
        saveSortingResult(currentRecruitName, dept.name, scores);

        // Save to local PowerBI history tracker
        saveResultToHistory(dept.name, currentRecruitName);
    }
}

let dbConfig = { provider: 'local' };

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
