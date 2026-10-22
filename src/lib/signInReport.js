import { callCreatorApi } from '../app/creator/api';

/*
 * After a sign-in, tells the server which device it came from, so a sign-in
 * from a device the account hasn't used before gets the "new sign-in" WhatsApp
 * alert (api/_lib/securityAlerts.js). The device is a random id kept in this
 * browser; nothing about the device itself is read.
 *
 * Reported once per sign-in (the token's sign-in time), and only where the
 * browser can keep the id: without storage (some private windows) every visit
 * would look like a new device, so nothing is reported there.
 */

const DEVICE_KEY = 'newbi.device';
const reportedKey = (uid) => `newbi.signin.${uid}`;

const storage = () => {
    try {
        const s = window.localStorage;
        s.setItem('newbi.probe', '1');
        s.removeItem('newbi.probe');
        return s;
    } catch {
        return null;
    }
};

const deviceId = (s) => {
    let id = s.getItem(DEVICE_KEY);
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        s.setItem(DEVICE_KEY, id);
    }
    return id;
};

/** Call with the signed-in Firebase user. Never throws. */
export const reportSignIn = async (user) => {
    try {
        const s = typeof window !== 'undefined' ? storage() : null;
        if (!user || !s) return;
        const { authTime } = await user.getIdTokenResult();
        if (!authTime || s.getItem(reportedKey(user.uid)) === authTime) return;
        // Only sign-ins from the last few minutes; an older session coming back isn't one.
        if (Date.now() - Date.parse(authTime) > 10 * 60 * 1000) {
            s.setItem(reportedKey(user.uid), authTime);
            return;
        }
        const res = await callCreatorApi('sign-in-seen', { device: deviceId(s) });
        if (res?.ok) s.setItem(reportedKey(user.uid), authTime);
    } catch {
        /* an alert that didn't go never blocks signing in */
    }
};
