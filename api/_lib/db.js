/**
 * Firestore for the server helpers in api/_lib. Importing auth.js initialises
 * the Admin app (with the service account when it's configured).
 *
 * Tests can swap in a fake with setDbForTests(); nothing else should.
 */
import './auth.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let override = null;
let cached = null;

export const getDb = () => {
    if (override) return override;
    if (!cached) cached = getFirestore();
    return cached;
};

export const setDbForTests = (db) => { override = db; };

export { FieldValue };

export const nowIso = () => new Date().toISOString();

/** "2026-10-16" in India time: Gmail's window rolls, but owners think in IST days. */
export const istDate = (date = new Date()) => {
    const ist = new Date(date.getTime() + 330 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
};

/** The public site, for links we put in emails and messages. */
export const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.newbi.live').replace(/\/+$/, '');
export const APP_URL = (process.env.PUBLIC_APP_URL || SITE_URL).replace(/\/+$/, '');
