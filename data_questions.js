// Define the departments and their rich visual properties for the Passport Reveal
export const DEPARTMENTS = {
    AOA: {
        id: 'AOA',
        name: 'AOA',
        description: 'Audit & Operations Advisory. You ensure quality, mitigate risks, and streamline processes.',
        color: '#b8860b',
        bgColor: 'linear-gradient(to bottom, #7a5c13, #b8860b)',
        icon: '🛡️',
        skill: 'Quality & Process',
        tool: 'The Golden Compass'
    },
    ADN: {
        id: 'ADN',
        name: 'ADN',
        description: 'Audit Data Network. You navigate the flow of information, uncovering insights from raw data.',
        color: '#00008b',
        bgColor: 'linear-gradient(to bottom, #00004a, #00008b)',
        icon: '📊',
        skill: 'Analytics & Insights',
        tool: 'The Obsidian Matrix'
    },
    TECH_RISK: {
        id: 'TECH_RISK',
        name: 'Tech Risk',
        description: 'You are the guardian of technology, ensuring systems are secure, compliant, and resilient.',
        color: '#8b0000',
        bgColor: 'linear-gradient(to bottom, #4a0000, #8b0000)',
        icon: '🔐',
        skill: 'Security & Compliance',
        tool: 'The Crimson Shield'
    },
    DID: {
        id: 'DID',
        name: 'DID',
        description: 'Digital Innovation & Development. You build the future, pioneering new technological solutions.',
        color: '#006400',
        bgColor: 'linear-gradient(to bottom, #003300, #006400)',
        icon: '⚡',
        skill: 'Development & Engineering',
        tool: 'The Emerald Forge'
    }
};

// Work-related questions that map points to different departments
export const QUESTIONS = [
    {
        question: "When a critical system goes down, what is your first instinct?",
        options: [
            { text: "Investigate the root cause and implement a permanent fix.", points: { DID: 3, TECH_RISK: 1 } },
            { text: "Analyze the data logs to find out exactly when and where it failed.", points: { ADN: 3, DID: 1 } },
            { text: "Review our compliance policies to report any breaches.", points: { TECH_RISK: 3, AOA: 1 } },
            { text: "Coordinate the teams and ensure the recovery process is followed.", points: { AOA: 3, ADN: 1 } }
        ]
    },
    {
        question: "What type of project excites you the most?",
        options: [
            { text: "Building a brand new application from scratch.", points: { DID: 3 } },
            { text: "Discovering hidden trends in a massive dataset.", points: { ADN: 3 } },
            { text: "Auditing a system to find and patch security vulnerabilities.", points: { TECH_RISK: 3 } },
            { text: "Optimizing a slow, outdated workflow into a smooth process.", points: { AOA: 3 } }
        ]
    },
    {
        question: "How do you prefer to handle a massive amount of unstructured data?",
        options: [
            { text: "Write a script to automate the sorting and parsing.", points: { DID: 3, ADN: 1 } },
            { text: "Build a dashboard to visualize and extract business value.", points: { ADN: 3 } },
            { text: "Ensure the data is stored securely and access is restricted.", points: { TECH_RISK: 3 } },
            { text: "Create a standardized framework for how the data should be used.", points: { AOA: 3 } }
        ]
    },
    {
        question: "Your team is migrating to the cloud. You are most concerned with...",
        options: [
            { text: "The architecture and ensuring the code is cloud-native.", points: { DID: 3 } },
            { text: "How the data pipelines will transition without data loss.", points: { ADN: 3 } },
            { text: "The firewall configurations and access management.", points: { TECH_RISK: 3 } },
            { text: "The operational downtime and change management strategy.", points: { AOA: 3 } }
        ]
    },
    {
        question: "What is your biggest pet peeve in a professional environment?",
        options: [
            { text: "Inefficient, manual processes that could easily be automated.", points: { DID: 3, AOA: 1 } },
            { text: "Decisions being made based on gut feelings instead of data.", points: { ADN: 3 } },
            { text: "People ignoring security protocols for convenience.", points: { TECH_RISK: 3 } },
            { text: "Lack of standard operating procedures and chaotic workflows.", points: { AOA: 3 } }
        ]
    }
];
