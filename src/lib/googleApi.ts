"use client";

// Note: In a real app, these should be in .env.local
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

let gapiInited = false;
let gisInited = false;

export async function initGoogleApi() {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("client", async () => {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        resolve(true);
      });
    };
    document.body.appendChild(script);

    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.onload = () => {
      gisInited = true;
    };
    document.body.appendChild(gisScript);
  });
}

export async function syncToGoogle(events: any[]) {
  if (!gapiInited || !gisInited) {
    alert("Google API not initialized. Please check your credentials.");
    return;
  }

  // Token client for OAuth2
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (response: any) => {
      if (response.error !== undefined) {
        throw response;
      }
      
      // Sync events
      for (const event of events) {
        const googleEvent = {
          'summary': event.title,
          'description': `Academic event from AcaSync`,
          'start': {
            'date': event.date,
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          'end': {
            'date': event.date,
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        };

        try {
          await window.gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': googleEvent,
          });
        } catch (err) {
          console.error("Error creating event:", err);
        }
      }
      alert("Sync complete!");
    },
  });

  if (window.gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}
