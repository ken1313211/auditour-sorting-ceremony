import { QUESTIONS } from './data_questions.js';
import { fetchCustomScores, saveCustomScores, initDatabase } from './firebase-config.js';

let editableQuestions = [];

async function initializeAdmin() {
    // Read correct database config key matching app_v2.js
    const storedConfig = localStorage.getItem('auditour_db_config');
    if (storedConfig) {
        initDatabase(JSON.parse(storedConfig));
    } else {
        console.warn("No Database config found in localStorage. Defaulting to firebase.");
        initDatabase({provider: 'firebase'});
    }

    // Try to fetch custom scores first
    const customScores = await fetchCustomScores();
    
    if (customScores && Array.isArray(customScores) && customScores.length > 0) {
        editableQuestions = customScores;
    } else {
        editableQuestions = JSON.parse(JSON.stringify(QUESTIONS)); // Deep copy from defaults
    }

    renderQuestionsEditor();
    setupEventListeners();
}

function renderQuestionsEditor() {
    const container = document.getElementById('questions-editor-container');
    if (!container) return;
    container.innerHTML = '';

    editableQuestions.forEach((q, qIndex) => {
        const card = document.createElement('div');
        card.className = 'q-card';
        card.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid #444; border-radius: 6px; padding: 15px; display: flex; flex-direction: column; gap: 10px; position: relative;';

        // Delete Question button
        const delQBtn = document.createElement('button');
        delQBtn.textContent = '✖ Delete Question';
        delQBtn.style.cssText = 'position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;';
        delQBtn.onclick = () => {
            if (confirm("Are you sure you want to delete this question?")) {
                editableQuestions.splice(qIndex, 1);
                renderQuestionsEditor();
            }
        };
        card.appendChild(delQBtn);

        // Question Title / Input
        const qTitle = document.createElement('div');
        qTitle.style.cssText = 'font-weight: bold; color: var(--gold); margin-bottom: 5px; font-family: inherit;';
        qTitle.textContent = `Question ${qIndex + 1}`;
        card.appendChild(qTitle);

        const qInput = document.createElement('input');
        qInput.type = 'text';
        qInput.style.cssText = 'width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #555; background: #222; color: #fff; font-family: inherit;';
        qInput.value = q.question;
        qInput.onchange = (e) => {
            q.question = e.target.value;
        };
        card.appendChild(qInput);

        // Options Container
        const optionsList = document.createElement('div');
        optionsList.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 10px;';

        q.options.forEach((opt, oIndex) => {
            const optRow = document.createElement('div');
            optRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px; align-items: center; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;';

            // Option input
            const optInput = document.createElement('input');
            optInput.type = 'text';
            optInput.style.cssText = 'flex: 2; min-width: 200px; padding: 6px; border-radius: 4px; border: 1px solid #555; background: #222; color: #fff; font-family: inherit;';
            optInput.value = opt.text;
            optInput.placeholder = 'Answer text...';
            optInput.onchange = (e) => {
                opt.text = e.target.value;
            };
            optRow.appendChild(optInput);

            // Points inputs for each SSL
            const depts = ['CORE_AUDIT', 'AOA', 'DID', 'DIGITAL', 'TECH_RISK'];
            depts.forEach(dept => {
                const ptBox = document.createElement('div');
                ptBox.style.cssText = 'display: flex; align-items: center; gap: 4px;';
                
                const label = document.createElement('label');
                label.style.cssText = 'font-size: 0.8rem; font-weight: 600;';
                let deptLabelColor = '#ccc';
                let friendlyName = dept;
                
                if (dept === 'CORE_AUDIT') {
                    deptLabelColor = '#d4af37';
                    friendlyName = 'Core Audit';
                } else if (dept === 'AOA') {
                    deptLabelColor = '#ff8c00';
                    friendlyName = 'AOA';
                } else if (dept === 'DID') {
                    deptLabelColor = '#38b6ff';
                    friendlyName = 'DID';
                } else if (dept === 'DIGITAL') {
                    deptLabelColor = '#39ff14';
                    friendlyName = 'Digital';
                } else if (dept === 'TECH_RISK') {
                    deptLabelColor = '#ff5757';
                    friendlyName = 'Tech Risk';
                }
                
                label.style.color = deptLabelColor;
                label.textContent = friendlyName;

                const ptInput = document.createElement('input');
                ptInput.type = 'number';
                ptInput.min = '0';
                ptInput.style.cssText = 'width: 45px; padding: 4px; border-radius: 4px; border: 1px solid #555; background: #222; color: #fff; text-align: center; font-family: inherit;';
                ptInput.value = opt.points && opt.points[dept] ? opt.points[dept] : 0;
                ptInput.onchange = (e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val) || val < 0) val = 0;
                    if (!opt.points) opt.points = {};
                    if (val === 0) {
                        delete opt.points[dept];
                    } else {
                        opt.points[dept] = val;
                    }
                };
                
                ptBox.appendChild(label);
                ptBox.appendChild(ptInput);
                optRow.appendChild(ptBox);
            });

            // Delete Option button
            const delOptBtn = document.createElement('button');
            delOptBtn.textContent = '✖';
            delOptBtn.style.cssText = 'background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;';
            delOptBtn.onclick = () => {
                q.options.splice(oIndex, 1);
                renderQuestionsEditor();
            };
            optRow.appendChild(delOptBtn);

            optionsList.appendChild(optRow);
        });

        // Add Option button
        const addOptBtn = document.createElement('button');
        addOptBtn.textContent = '+ Add Answer Option';
        addOptBtn.style.cssText = 'align-self: flex-start; background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-top: 5px;';
        addOptBtn.onclick = () => {
            q.options.push({ text: '', points: {} });
            renderQuestionsEditor();
        };
        optionsList.appendChild(addOptBtn);

        card.appendChild(optionsList);
        container.appendChild(card);
    });
}

async function handleSave() {
    const btn = document.getElementById('btn-save-scores');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    const success = await saveCustomScores(editableQuestions);
    
    btn.innerHTML = originalText;
    btn.disabled = false;

    if (success) {
        showToast();
    } else {
        alert("Failed to save configuration. Please check console for errors.");
    }
}

function showToast() {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } else {
        alert("Configuration saved successfully!");
    }
}

function setupEventListeners() {
    // Prevent duplicate listener bindings
    const saveBtn = document.getElementById('btn-save-scores');
    if (saveBtn) {
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        document.getElementById('btn-save-scores').addEventListener('click', handleSave);
    }
    
    const addQBtn = document.getElementById('btn-add-question');
    if (addQBtn) {
        addQBtn.replaceWith(addQBtn.cloneNode(true));
        document.getElementById('btn-add-question').addEventListener('click', () => {
            editableQuestions.push({
                question: 'New Question Text',
                options: [
                    { text: 'Option A', points: {} },
                    { text: 'Option B', points: {} }
                ]
            });
            renderQuestionsEditor();
        });
    }
}

// Start
document.addEventListener('DOMContentLoaded', initializeAdmin);
