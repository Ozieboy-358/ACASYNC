"use client";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

let gapiInited = false;
let gisInited = false;

export async function initGoogleApi(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  return new Promise((resolve) => {
    // Check if gapi script already exists
    if (!document.getElementById("gapi-script")) {
      const script = document.createElement("script");
      script.id = "gapi-script";
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        if (window.gapi) {
          window.gapi.load("client", async () => {
            try {
              if (API_KEY) {
                await window.gapi.client.init({
                  apiKey: API_KEY,
                  discoveryDocs: DISCOVERY_DOCS,
                });
              }
              gapiInited = true;
              resolve(true);
            } catch (err) {
              console.warn("Failed to init gapi client:", err);
              resolve(false);
            }
          });
        } else {
          resolve(false);
        }
      };
      document.body.appendChild(script);
    } else if (window.gapi && window.gapi.client) {
      gapiInited = true;
    }

    // Check if GIS script already exists
    if (!document.getElementById("gis-script")) {
      const gisScript = document.createElement("script");
      gisScript.id = "gis-script";
      gisScript.src = "https://accounts.google.com/gsi/client";
      gisScript.onload = () => {
        gisInited = true;
      };
      document.body.appendChild(gisScript);
    } else if (window.google?.accounts?.oauth2) {
      gisInited = true;
    }
  });
}

export async function syncToGoogle(events: any[]) {
  if (!CLIENT_ID) {
    alert("Google Calendar Sync requires NEXT_PUBLIC_GOOGLE_CLIENT_ID to be set in your .env.local file.");
    return;
  }

  if (typeof window === "undefined" || !window.google?.accounts?.oauth2) {
    alert("Google Identity Services not loaded. Please ensure internet access and reload.");
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
      let count = 0;
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
          if (window.gapi?.client?.calendar?.events) {
            await window.gapi.client.calendar.events.insert({
              'calendarId': 'primary',
              'resource': googleEvent,
            });
            count++;
          }
        } catch (err) {
          console.error("Error creating event:", err);
        }
      }
      alert(`Sync complete! ${count} events synced to Google Calendar.`);
    },
  });

  if (window.gapi?.client?.getToken?.() === null) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}
