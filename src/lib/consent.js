import { useSyncExternalStore } from 'react';
import { safeLocalStorage } from './storage';

/*
 * Cookie and tracking consent: one choice for newbi.live and the app.
 *
 * Essential storage is always on, because the site can't work without it: keeping
 * you signed in, your language and theme, the "signed in" hint the landing reads,
 * offline copies of passes and unfinished form drafts.
 *
 * Optional, off until the visitor says yes:
 *   analytics  Vercel Web Analytics and Speed Insights: page views and load times,
 *              no cookies, no ads, nothing tied to your account.
 *   media      Videos embedded from YouTube, Vimeo and Instagram, which set their
 *              own cookies. Without it a cover image shows instead.
 *
 * A browser that sends Global Privacy Control gets "essential only" and isn't asked.
 * The choice is kept in localStorage and a cookie shared across *.newbi.live (so the
 * landing site and the app agree), with the date and the policy version it was given
 * under. A new VERSION asks everyone again.
 *
 *   getConsent() → { analytics, media, at, v } | null
 *   setConsent({ analytics, media }) · useConsent() · openConsentSettings()
 */

export const CONSENT_VERSION = 1;
const KEY = 'nb_consent';
const OPEN_EVENT = 'nb:consent-settings';
const MAX_AGE = 60 * 60 * 24 * 180; // ask again after six months

const listeners = new Set();
let cached;

const cookieDomain = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return /(^|\.)newbi\.live$/i.test(host) ? '; domain=.newbi.live' : '';
};

export const sendsGlobalPrivacyControl = () => typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;

const parse = (raw) => {
    try {
        const c = JSON.parse(raw);
        if (!c || c.v !== CONSENT_VERSION || typeof c.at !== 'number') return null;
        if (Date.now() - c.at > MAX_AGE * 1000) return null;
        return { analytics: c.analytics === true, media: c.media === true, at: c.at, v: c.v };
    } catch {
        return null;
    }
};

function read() {
    if (typeof window === 'undefined') return null;
    let saved = parse(safeLocalStorage.getItem(KEY));
    if (!saved) {
        try {
            const m = document.cookie.match(/(?:^|;\s*)nb_consent=([^;]+)/);
            if (m) saved = parse(decodeURIComponent(m[1]));
        } catch { /* cookies blocked */ }
    }
    // Global Privacy Control is a "no" to everything optional, whatever was saved before.
    if (sendsGlobalPrivacyControl()) return { analytics: false, media: false, at: saved?.at || 0, v: CONSENT_VERSION, gpc: true };
    return saved;
}

export function getConsent() {
    if (cached === undefined) cached = read();
    return cached;
}

export function setConsent({ analytics = false, media = false } = {}) {
    const value = { analytics: Boolean(analytics), media: Boolean(media), at: Date.now(), v: CONSENT_VERSION };
    const raw = JSON.stringify(value);
    safeLocalStorage.setItem(KEY, raw);
    try {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${KEY}=${encodeURIComponent(raw)}; path=/; max-age=${MAX_AGE}; SameSite=Lax${secure}${cookieDomain()}`;
    } catch { /* cookies blocked */ }
    cached = read();
    listeners.forEach((l) => l());
}

const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

/* The current choice (null until one is made); re-renders when it changes. */
export function useConsent() {
    return useSyncExternalStore(subscribe, getConsent, () => null);
}

/* Opens the cookie settings (the banner's "Choose" view), e.g. from a footer link. */
export function openConsentSettings() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_EVENT));
}

export const onOpenConsentSettings = (fn) => {
    window.addEventListener(OPEN_EVENT, fn);
    return () => window.removeEventListener(OPEN_EVENT, fn);
};
