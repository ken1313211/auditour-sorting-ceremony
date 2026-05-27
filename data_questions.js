// Define the departments and their rich visual properties for the Passport Reveal
export const DEPARTMENTS = {
    CORE_AUDIT: {
        id: 'CORE_AUDIT',
        name: 'Core Audit',
        description: 'Supports the review of financial information to ensure accuracy, completeness, and compliance with accounting rules. Work is structured and focuses on numbers, documents, and evidence.',
        personality: 'Ah, Core Audit! A mind that thrives in clarity and structure. You notice the small things others overlook — patterns, numbers, evidence, and truth in its purest form. You\'re steady, reliable, and grounded, with a natural instinct for accuracy and integrity. Your strength lies in turning complexity into certainty.',
        color: '#d4af37', // Gold
        accentColor: '#ffd700',
        bgColor: 'linear-gradient(135deg, #4d3a0c 0%, #2b1f05 50%, #000000 100%)',
        themeClass: 'core-audit-theme',
        icon: '📊',
        logo: 'assets/core_audit.png',
        skill: 'Accuracy & Integrity',
        tool: 'Microsoft Excel',
        pursuits: [
            { name: 'Excel for Auditors', desc: 'VLOOKUP, XLOOKUP, IF, Pivot Tables', icon: 'X', iconColor: '#107c41' },
            { name: 'Financial Statements', desc: 'Income Statement, Balance Sheet, Cash Flow', icon: '🧾', iconColor: '#0078d4' },
            { name: 'IFRS Standards', desc: 'Basic IFRS or local accounting standards', icon: '📋', iconColor: '#8b6d38' },
            { name: 'Audit Fundamentals', desc: 'Assertions, sampling, walkthroughs, evidence', icon: '🔍', iconColor: '#2b1f05' }
        ]
    },
    AOA: {
        id: 'AOA',
        name: 'AOA',
        description: 'Supports audit and assurance teams through standardized processes, tools, and efficient delivery. Work focuses on execution, consistency, and operational support at scale.',
        personality: 'AOA! You possess the rare gift of order amidst chaos. You excel in consistency, process, and rhythm — the heartbeat of every well-run operation. You bring structure where there is none, streamline what\'s messy, and support others with efficiency and calm precision. You are the quiet engine that keeps everything moving.',
        color: '#ff8c00', // Amber/Orange
        accentColor: '#ffa500',
        bgColor: 'linear-gradient(135deg, #4b230d 0%, #2e1408 50%, #000000 100%)',
        themeClass: 'aoa-theme',
        icon: '🛡️',
        logo: 'assets/aoa.png',
        skill: 'Process & Consistency',
        tool: 'MS Teams & Planner',
        pursuits: [
            { name: 'Excel Efficiency', desc: 'Data cleaning, formatting, formulas', icon: 'X', iconColor: '#107c41' },
            { name: 'Documentation Discipline', desc: 'Checklists, templates, organized files', icon: '📂', iconColor: '#ffb900' },
            { name: 'Workflow Tools', desc: 'Microsoft Teams, Planner, Task trackers', icon: 'T', iconColor: '#6264a7' },
            { name: 'Audit Process Cycles', desc: 'Planning -> Execution -> Completion', icon: '🔄', iconColor: '#0078d4' }
        ]
    },
    DID: {
        id: 'DID',
        name: 'DID',
        description: 'Works with data used in audits to make sure it is complete, accurate, and ready for analysis. Involves data preparation, validation, and basic analytics.',
        personality: 'DID, of course! You are curious, logical, and unafraid to dive into the raw depths of data. You enjoy solving puzzles, validating details, and preparing information so others can work with confidence. You bring clarity from confusion and accuracy from uncertainty — a true guardian of clean, dependable data.',
        color: '#38b6ff', // Sapphire Blue
        accentColor: '#80bfff',
        bgColor: 'linear-gradient(135deg, #0d2a4a 0%, #081a30 50%, #000000 100%)',
        themeClass: 'did-theme',
        icon: '⚡',
        logo: 'assets/did.png',
        skill: 'Data Prep & Validation',
        tool: 'SQL & Power BI',
        pursuits: [
            { name: 'Excel Data Cleaning', desc: 'Text functions, Remove Duplicates, Flash Fill', icon: 'X', iconColor: '#107c41' },
            { name: 'Beginner SQL', desc: 'SELECT, WHERE, GROUP BY queries', icon: 'Sq', iconColor: '#f25f22' },
            { name: 'Power BI Basics', desc: 'Loading data, creating simple visuals', icon: 'Pb', iconColor: '#f2c811' },
            { name: 'Data Validation', desc: 'Ensuring completeness and accuracy', icon: '✔️', iconColor: '#107c41' }
        ]
    },
    DIGITAL: {
        id: 'DIGITAL',
        name: 'Digital',
        description: 'GDS Assurance Digital is a sub-service line of GDS Assurance that delivers technology and automation solutions supporting engagement teams across the Americas, Asia Pacific, and EMEIA.',
        personality: 'Digital! You\'re analytical yet practical, drawn to how things work behind the scenes. Comfortable with digital tools, you can quickly spot workflow gaps before they turn into bigger issues. You thrive in structured environments where investigation, optimization, and smart solutions technology development come together — making you a great fit for GDS Assurance Digital.',
        color: '#39ff14', // Emerald Green
        accentColor: '#80ff80',
        bgColor: 'linear-gradient(135deg, #103b22 0%, #061f10 50%, #000000 100%)',
        themeClass: 'digital-theme',
        icon: '🤖',
        logo: 'assets/digital.png',
        skill: 'Automation & Tech',
        tool: 'UiPath & Power Platform',
        pursuits: [
            { name: 'Robotics Process Automation', desc: 'Blue Prism, AA, UiPath studio', icon: 'Ui', iconColor: '#fa4616' },
            { name: 'Web Technologies', desc: 'UI/UX, .NET, Java, Angular, JS', icon: 'W', iconColor: '#0078d4' },
            { name: 'Power Platform', desc: 'Power Apps, Power Automate, Power BI', icon: 'Pp', iconColor: '#742774' },
            { name: 'Microsoft Tech Stack', desc: 'SharePoint, Office Automation, WPF, UWP', icon: 'Sp', iconColor: '#007200' }
        ]
    },
    TECH_RISK: {
        id: 'TECH_RISK',
        name: 'Tech Risk',
        description: 'Addresses risks related to IT systems, applications, and technology controls. Involves reviewing system access, controls, and technology-related risks.',
        personality: 'Technology Risk! You have a sharp, inquisitive mind that sees beyond the surface. You\'re drawn to systems, security, access, and the hidden vulnerabilities within technology. You ask the right questions and can sense risk where others might not. With your blend of logic and foresight, you safeguard the digital world.',
        color: '#ff5757', // Ruby Red
        accentColor: '#ff8080',
        bgColor: 'linear-gradient(135deg, #4b0d0d 0%, #2e0808 50%, #000000 100%)',
        themeClass: 'tech-risk-theme',
        icon: '🔐',
        logo: 'assets/tech_risk.png',
        skill: 'Security & Compliance',
        tool: 'ITGC & ERP (SAP, Oracle)',
        pursuits: [
            { name: 'Basic IT Audit', desc: 'Access controls, system changes, user roles', icon: '🔑', iconColor: '#2b1f05' },
            { name: 'Intro to Cybersecurity', desc: 'NIST framework, basic risks, common threats', icon: '🛡️', iconColor: '#d83b01' },
            { name: 'IT General Controls', desc: 'Familiarity with ITGC compliance', icon: '📋', iconColor: '#0078d4' },
            { name: 'ERP Systems', desc: 'High-level ERP understanding (SAP, Oracle)', icon: 'Sap', iconColor: '#008fd3' }
        ]
    },
    FAAS: {
        id: 'FAAS',
        name: 'FAAS',
        description: 'Provides advisory support on accounting and financial reporting, finance optimization, treasury, complex transactions, and sustainability or ESG topics. Work involves research, analysis, and professional judgment.',
        personality: 'FAAS! You\'re adaptable, thoughtful, and curious about complex challenges. Whether it\'s accounting guidance, transactions, sustainability, or financial reporting, you approach every topic with analysis and sound judgment. You enjoy researching, understanding the "why," and helping others navigate intricate decisions. A true advisor with depth and insight.',
        color: '#00b4d8', // Cyan/Teal
        accentColor: '#48cae4',
        bgColor: 'linear-gradient(135deg, #005f73 0%, #0a2f35 50%, #000000 100%)',
        themeClass: 'faas-theme',
        icon: '🧭',
        logo: 'assets/faas.png',
        skill: 'Research & Advisory',
        tool: 'Accounting & ESG Frameworks',
        pursuits: [
            { name: 'Financial Reporting', desc: 'IFRS basics, accounting mechanics', icon: '📊', iconColor: '#107c41' },
            { name: 'Disclosures Analysis', desc: 'Understanding disclosures in annual reports', icon: '📖', iconColor: '#d83b01' },
            { name: 'Intro to ESG', desc: 'GRI, SASB, basic sustainability reporting', icon: '🌱', iconColor: '#2a9d8f' },
            { name: 'Excel Modeling', desc: 'Schedules, reconciliations, trend analyses', icon: 'X', iconColor: '#107c41' }
        ]
    }
};

// Work-related questions that map points to different departments
export const QUESTIONS = [
    {
        question: "Q1. What type of work sounds most interesting to you?",
        options: [
            { text: "A. Reviewing financial statements", points: { CORE_AUDIT: 2, FAAS: 1 } },
            { text: "B. Improving efficiency via tools/automation", points: { AOA: 1, DID: 1, DIGITAL: 2 } },
            { text: "C. Working with large datasets", points: { DID: 1, DIGITAL: 2, TECH_RISK: 1, FAAS: 1 } },
            { text: "D. Testing processes or controls", points: { CORE_AUDIT: 1, AOA: 1, TECH_RISK: 2 } },
            { text: "E. Advising on accounting", points: { FAAS: 2 } }
        ]
    },
    {
        question: "Q2. Which type of tasks do you usually perform well in?",
        options: [
            { text: "A. Working with numbers, checking accuracy, and reconciling differences", points: { CORE_AUDIT: 2, AOA: 2, DID: 1, DIGITAL: 1, FAAS: 1 } },
            { text: "B. Organizing tasks, improving workflows, or managing timelines", points: { DID: 2 } },
            { text: "C. Working with data sets, trends, or analysis (even in projects)", points: { AOA: 1, DID: 2, DIGITAL: 2, TECH_RISK: 1 } },
            { text: "D. Reviewing processes and identifying gaps or risks", points: { CORE_AUDIT: 1, TECH_RISK: 2 } },
            { text: "E. Researching topics and explaining complex ideas clearly", points: { FAAS: 2 } }
        ]
    },
    {
        question: "Q3. How do you prefer to work?",
        options: [
            { text: "A. Structured, checklist-based", points: { AOA: 2, DID: 1, FAAS: 1 } },
            { text: "B. High-volume & efficient", points: { AOA: 1, DIGITAL: 1 } },
            { text: "C. Problem-solving with data", points: { DID: 2, DIGITAL: 2, FAAS: 1 } },
            { text: "D. Investigative & risk-focused", points: { CORE_AUDIT: 2, TECH_RISK: 2 } },
            { text: "E. Judgment-based & complex", points: { CORE_AUDIT: 1, FAAS: 2 } }
        ]
    },
    {
        question: "Q4. What impact do you want your work to have?",
        options: [
            { text: "A. Reliable financial reporting", points: { CORE_AUDIT: 2, AOA: 1, DID: 1 } },
            { text: "B. Faster & smarter operations", points: { AOA: 2, DIGITAL: 1 } },
            { text: "C. Accurate & trusted data", points: { CORE_AUDIT: 1, DID: 2, TECH_RISK: 1, FAAS: 1 } },
            { text: "D. Reduced business/tech risk", points: { DIGITAL: 2, TECH_RISK: 2 } },
            { text: "E. Strategic & sustainability outcomes", points: { FAAS: 2 } }
        ]
    },
    {
        question: "Q5. Which future role appeals most to you?",
        options: [
            { text: "A. Auditor / Finance professional", points: { CORE_AUDIT: 2, AOA: 1, DID: 1, FAAS: 1 } },
            { text: "B. Process / Automation specialist", points: { AOA: 2, DIGITAL: 2 } },
            { text: "C. Data / Analytics role", points: { DID: 2, DIGITAL: 1, TECH_RISK: 1 } },
            { text: "D. IT auditor / Risk consultant", points: { CORE_AUDIT: 1, TECH_RISK: 2 } },
            { text: "E. Accounting / ESG advisor", points: { FAAS: 2 } }
        ]
    },
    {
        question: "Q6. Which skill have you already used in school or projects?",
        options: [
            { text: "A. Spreadsheets, reports, or structured documentation", points: { CORE_AUDIT: 2, AOA: 2, DID: 1 } },
            { text: "B. Dashboards, presentations, or efficiency tools", points: { AOA: 1, DIGITAL: 2 } },
            { text: "C. Data analysis, surveys, or trend interpretation", points: { CORE_AUDIT: 1, DID: 2, TECH_RISK: 1, FAAS: 1 } },
            { text: "D. Systems thinking (how things connect or fail)", points: { AOA: 1, DIGITAL: 1, TECH_RISK: 2 } },
            { text: "E. Writing research papers or case studies", points: { FAAS: 2 } }
        ]
    },
    {
        question: "Q7. How do you approach technical problems?",
        options: [
            { text: "A. Follow procedures carefully", points: { CORE_AUDIT: 2, AOA: 2, DID: 1, TECH_RISK: 1 } },
            { text: "B. Simplify or automate", points: { AOA: 1, DIGITAL: 2 } },
            { text: "C. Analyze data & anomalies", points: { CORE_AUDIT: 1, DID: 2, FAAS: 1 } },
            { text: "D. Understand systems & risks", points: { DIGITAL: 1, TECH_RISK: 2 } },
            { text: "E. Research & apply judgment", points: { FAAS: 2 } }
        ]
    },
    {
        question: "Q8. Which skill would you be most willing to invest time learning?",
        options: [
            { text: "A. Financial and audit fundamentals", points: { CORE_AUDIT: 2, AOA: 2, FAAS: 1 } },
            { text: "B. Process improvement and automation", points: { AOA: 1, DID: 1 } },
            { text: "C. Data analytics and visualization", points: { DID: 2, DIGITAL: 2, TECH_RISK: 1 } },
            { text: "D. IT systems and risk concepts", points: { DIGITAL: 1, TECH_RISK: 2 } },
            { text: "E. Accounting standards or sustainability topics", points: { CORE_AUDIT: 1, FAAS: 2 } }
        ]
    }
];
