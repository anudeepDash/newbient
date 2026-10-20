import { useSyncExternalStore } from 'react';
import { safeLocalStorage } from '../lib/storage';

/*
 * Language switch: English (default) and Hinglish (Hindi in Roman script).
 *
 * Strings stay in the components as their English text; t('English text')
 * looks that exact string up in the Hinglish dictionary and falls back to the
 * English when there is no entry, so nothing can render blank. {name}
 * placeholders are filled from the second argument: t('Hi {name}', { name }).
 *
 * The dictionary is its own chunk, fetched only when Hinglish is chosen, so
 * English visitors pay nothing. The first render is always English (same as
 * the prerendered HTML); a saved Hinglish choice flips right after hydration.
 * The choice is kept in localStorage and a cookie shared across *.newbi.live,
 * so the landing site and the app agree.
 */

export const LANGS = { en: 'English', hi: 'Hinglish' };
const KEY = 'nb_lang';

let lang = 'en';
let dict = null;
let loading = null;
const listeners = new Set();
const missing = new Set();

const cookieDomain = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return /(^|\.)newbi\.live$/i.test(host) ? '; domain=.newbi.live' : '';
};

function readSaved() {
    try {
        const saved = safeLocalStorage.getItem(KEY);
        if (saved === 'en' || saved === 'hi') return saved;
        const m = document.cookie.match(/(?:^|;\s*)nb_lang=(en|hi)/);
        return m ? m[1] : 'en';
    } catch { return 'en'; }
}

function persist(next) {
    try { safeLocalStorage.setItem(KEY, next); } catch { /* storage blocked */ }
    try { document.cookie = `${KEY}=${next}; path=/; max-age=31536000; samesite=lax${cookieDomain()}`; } catch { /* cookies blocked */ }
}

function apply(next) {
    lang = next;
    if (typeof document !== 'undefined') document.documentElement.lang = next === 'hi' ? 'hi-Latn' : 'en';
    listeners.forEach((l) => l());
}

function loadDict() {
    if (dict) return Promise.resolve();
    if (!loading) {
        loading = import('./hinglish/index.js')
            .then((m) => { dict = m.default; })
            .catch(() => { loading = null; });
    }
    return loading;
}

export function setLang(next) {
    if (next !== 'en' && next !== 'hi') return;
    persist(next);
    if (next === 'hi') loadDict().then(() => apply('hi'));
    else apply('en');
}

// Called once on the client, after hydration has started.
let started = false;
export function initLang() {
    if (started || typeof window === 'undefined') return;
    started = true;
    if (readSaved() === 'hi') loadDict().then(() => apply('hi'));
}

const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };

export function translate(text, vars) {
    let out = text;
    if (lang === 'hi' && dict) {
        const hit = dict[text];
        if (hit !== undefined) out = hit;
        else if (import.meta.env?.DEV && text && !missing.has(text)) {
            missing.add(text);
            (window.__nbMissingHi ||= []).push(text);
        }
    }
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
    return out;
}

// Reactive: re-renders the component when the language changes.
export function useLang() {
    return useSyncExternalStore(subscribe, () => lang, () => 'en');
}

export function useT() {
    useLang();
    return translate;
}

// Plain version for code outside React (toasts, store messages): reads the current language.
export const t = translate;
