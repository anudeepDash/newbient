/**
 * "Open in Google Sheets": the same export spec as downloadXlsx / downloadCsv,
 * uploaded to the signed-in person's own Google Drive as a Google Sheet and
 * opened in a new tab to edit there.
 *
 * Sign-in is Google's own popup (Google Identity Services) asking only for
 * `drive.file`: Newbi can see the files it makes, nothing else in the Drive.
 * The token stays in memory for the session and is never stored.
 *
 * Needs VITE_GOOGLE_CLIENT_ID (a Web OAuth client in the Firebase Google Cloud
 * project, with this site's origin allowed) and the Drive API turned on. Without
 * the client ID the option is hidden.
 *
 *   openInGoogleSheets(spec)                    // styled sheet (title band, ₹, totals)
 *   openInGoogleSheets(spec, { format: 'csv' }) // header in row 1, for templates re-imported as CSV
 */
import { buildXlsx, buildCsv } from './xlsx';
import { useStore } from './store';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink';

export const googleSheetsEnabled = Boolean(CLIENT_ID);

let gisLoad = null;
let token = null; // { value, expiresAt }
let busy = false;

/** Load Google's sign-in script. Call it when a menu opens, so the click that follows can open the popup straight away. */
export const loadGoogleSheets = () => {
    if (!googleSheetsEnabled) return Promise.reject(new Error('Google Sheets is not set up.'));
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    gisLoad ||= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => { gisLoad = null; reject(new Error("Couldn't reach Google. Check your connection and try again.")); };
        document.head.appendChild(script);
    });
    return gisLoad;
};

const getToken = () => new Promise((resolve, reject) => {
    if (token && token.expiresAt > Date.now() + 60_000) { resolve(token.value); return; }
    const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (res) => {
            if (res.error || !res.access_token) { reject(new Error(res.error_description || "Google didn't allow access to Drive.")); return; }
            token = { value: res.access_token, expiresAt: Date.now() + Number(res.expires_in || 3600) * 1000 };
            resolve(token.value);
        },
        error_callback: (err) => reject(Object.assign(
            new Error(err?.type === 'popup_failed_to_open' ? 'Allow pop-ups for this site, then try again.' : 'Google sign-in was closed.'),
            { cancelled: err?.type === 'popup_closed' },
        )),
    });
    client.requestAccessToken({ prompt: '' });
});

const upload = async (accessToken, name, blob) => {
    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify({ name, mimeType: 'application/vnd.google-apps.spreadsheet' })], { type: 'application/json' }));
    body.append('file', blob);
    const res = await fetch(UPLOAD_URL, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body });
    if (res.ok) return res.json();
    const data = await res.json().catch(() => ({}));
    const reason = data?.error?.errors?.[0]?.reason || data?.error?.status;
    if (res.status === 401) token = null;
    throw Object.assign(new Error(
        reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED'
            ? 'The Google Drive API is turned off for this project.'
            : res.status === 401 ? 'Your Google sign-in expired. Try again.' : (data?.error?.message || "Google Drive didn't take the file."),
    ), { status: res.status });
};

const fileName = (spec) => String(spec.filename || spec.title || 'Newbi export').replace(/\.(xlsx|csv)$/i, '');

/**
 * Upload the spec to Drive as a Google Sheet and open it. Shows its own toasts.
 * Returns true once the sheet exists, false when there was nothing to send or it failed.
 */
export const openInGoogleSheets = async (spec, { format = 'xlsx' } = {}) => {
    const addToast = useStore.getState().addToast;
    if (!spec?.rows?.length) { addToast?.("There's nothing to export.", 'info'); return false; }
    if (busy) return false;
    busy = true;
    try {
        await loadGoogleSheets();
        const accessToken = await getToken();
        const blob = format === 'csv'
            ? new Blob([buildCsv(spec)], { type: 'text/csv' })
            : new Blob([buildXlsx(spec)], { type: XLSX_TYPE });
        const file = await upload(accessToken, fileName(spec), blob);
        const link = file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
        const tab = window.open(link, '_blank');
        if (tab) {
            tab.opener = null;
            addToast?.('Saved in your Google Drive. Edits stay in Drive, not in Newbi.', 'success', { title: 'Opened in Google Sheets' });
        } else {
            addToast?.('Saved in your Google Drive.', 'success', {
                title: 'Google Sheet ready',
                action: { label: 'Open', onClick: () => window.open(link, '_blank', 'noopener') },
                duration: 15000,
            });
        }
        return true;
    } catch (err) {
        if (!err?.cancelled) addToast?.(err?.message || 'Try again in a moment.', 'error', { title: "Couldn't open in Google Sheets" });
        return false;
    } finally {
        busy = false;
    }
};
