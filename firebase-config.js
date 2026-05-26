import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set } from "firebase/database";

let app, database;
let currentConfig = { provider: 'local' };

export function initDatabase(config) {
    currentConfig = config || { provider: 'local' };
    
    if (currentConfig.provider === 'firebase') {
        const firebaseConfig = {
            apiKey: currentConfig.fb_apiKey,
            authDomain: currentConfig.fb_authDomain,
            databaseURL: currentConfig.fb_databaseURL,
            projectId: currentConfig.fb_projectId,
            appId: currentConfig.fb_appId
        };
        
        try {
            app = initializeApp(firebaseConfig);
            database = getDatabase(app);
            console.log("Firebase initialized successfully.");
        } catch (error) {
            console.error("Firebase initialization error:", error);
            database = null;
        }
    } else if (currentConfig.provider === 'sharepoint') {
        console.log("Azure SharePoint selected. Ready to push to Graph API.");
        // Note: MSAL.js initialization would typically happen here for Auth.
        app = null;
        database = null;
    } else {
        console.log("Local Storage provider selected.");
        app = null;
        database = null;
    }
}

// Function to save a sorting entry
export async function saveSortingResult(userName, departmentId, answers) {
    const payload = {
        userName: userName || "Anonymous Student",
        department: departmentId,
        answers: answers,
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
