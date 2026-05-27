import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set, get } from "firebase/database";

let app, database;
let currentConfig = { provider: 'firebase' };

export function initDatabase(config) {
    // Hardcoded Firebase configuration from user
    const firebaseConfig = {
        apiKey: "AIzaSyCZCMyVTAsKi-pyEH53DirR7aoMt0CunQA",
        authDomain: "sorting-ceremony-e0847.firebaseapp.com",
        databaseURL: "https://sorting-ceremony-e0847-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "sorting-ceremony-e0847",
        storageBucket: "sorting-ceremony-e0847.firebasestorage.app",
        messagingSenderId: "980501505032",
        appId: "1:980501505032:web:4511da9215a61a6980ddbd",
        measurementId: "G-0WKGRQGBZ0"
    };

    try {
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        currentConfig.provider = 'firebase';
        console.log("Firebase initialized successfully with hardcoded config.");
    } catch (error) {
        console.error("Firebase initialization error:", error);
        database = null;
    }
}

// Function to save a sorting entry
export async function saveSortingResult(userName, departmentId, answers, school, preferredSSL) {
    const payload = {
        userName: userName || "Anonymous Student",
        department: departmentId,
        answers: answers,
        school: school || "",
        preferredSSL: preferredSSL || "",
        timestamp: Date.now(),
        isoTime: new Date().toISOString()
    };

    if (currentConfig.provider === 'firebase') {
        if (!database) {
            console.warn("Database not initialized, skipping save.");
            return;
        }
        try {
            const entriesRef = ref(database, 'sorting_entries');
            const newEntryRef = push(entriesRef);
            await set(newEntryRef, payload);
            console.log("Entry saved to Firebase!");
        } catch (error) {
            console.error("Error saving to Firebase:", error);
        }
    } 
    else if (currentConfig.provider === 'sharepoint') {
        // SharePoint List Graph API Stub
        console.log("STUB: Preparing to save to SharePoint List");
        console.log(`Tenant: ${currentConfig.sp_tenantId}, Site: ${currentConfig.sp_siteId}, List: ${currentConfig.sp_listId}`);
        console.log("Payload:", payload);
        
        // Example Graph API Call (Requires Bearer Token from MSAL)
        /*
        fetch(`https://graph.microsoft.com/v1.0/sites/${currentConfig.sp_siteId}/lists/${currentConfig.sp_listId}/items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer YOUR_ACCESS_TOKEN`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    Title: payload.userName,
                    Department: payload.department,
                    Timestamp: payload.isoTime,
                    ScoreData: JSON.stringify(payload.answers)
                }
            })
        });
        */
    }
    else {
        // Local Mode - handled by the UI tracker history natively in app.js
        console.log("Running in Local Mode. Handled by local history tracker.");
    }
}

// Function to fetch all sorting entries from Firebase
export async function fetchSortingResults() {
    if (currentConfig.provider === 'firebase') {
        if (!database) {
            console.warn("Database not initialized, skipping fetch.");
            return null;
        }
        try {
            const entriesRef = ref(database, 'sorting_entries');
            const snapshot = await get(entriesRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                // Map the Firebase object/dictionary format to the list format used by our UI
                const list = Object.keys(data).map(key => {
                    const item = data[key];
                    return {
                        id: key.substring(1, 8).toUpperCase(), // generate a unique recruit ID from firebase key
                        name: item.userName || "Anonymous User",
                        dept: item.department,
                        school: item.school || "",
                        preferredSSL: item.preferredSSL || "",
                        timestamp: item.isoTime || new Date(item.timestamp).toISOString(),
                        details: "Cloud Firebase entry"
                    };
                });
                return list;
            }
            return [];
        } catch (error) {
            console.error("Error fetching from Firebase:", error);
        }
    }
    return null;
}

// Function to save custom question scores
export async function saveCustomScores(customQuestions) {
    if (currentConfig.provider === 'firebase') {
        if (!database) {
            console.warn("Database not initialized, saving locally as fallback.");
            localStorage.setItem('local_custom_scores', JSON.stringify(customQuestions));
            return true;
        }
        try {
            const scoresRef = ref(database, 'settings/custom_scores');
            await set(scoresRef, customQuestions);
            console.log("Custom scores saved to Firebase!");
            return true;
        } catch (error) {
            console.error("Error saving custom scores to Firebase:", error);
            return false;
        }
    } else {
        localStorage.setItem('local_custom_scores', JSON.stringify(customQuestions));
        return true;
    }
}

// Function to fetch custom question scores
export async function fetchCustomScores() {
    if (currentConfig.provider === 'firebase') {
        if (!database) {
            console.warn("Database not initialized, fetching locally as fallback.");
            try {
                const saved = localStorage.getItem('local_custom_scores');
                return saved ? JSON.parse(saved) : null;
            } catch (e) {
                return null;
            }
        }
        try {
            const scoresRef = ref(database, 'settings/custom_scores');
            const snapshot = await get(scoresRef);
            if (snapshot.exists()) {
                return snapshot.val();
            }
            return null;
        } catch (error) {
            console.error("Error fetching custom scores from Firebase:", error);
            return null;
        }
    } else {
        try {
            const saved = localStorage.getItem('local_custom_scores');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }
}
