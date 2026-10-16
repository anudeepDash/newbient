import { useCallback, useEffect, useRef, useState } from 'react';
import { callCreatorApi } from '../api';
import { appPath } from '../../host';

/*
 * State for the two-step creator application.
 *
 *   step 1  Instagram: the handle, checked against Meta while typing (when
 *           instagramMetaVerification is on), then "Connect Instagram".
 *           With the flag off: the handle and a follower count for review.
 *   step 2  niche, college (campus niches), collaboration, rates, bio.
 *
 * The draft survives the Instagram login round trip in sessionStorage.
 * Name, email, phone, city and photo are never part of it: they come from the
 * profile on the server.
 */

const DRAFT_KEY = 'nb_creator_apply';
const HANDLE_RE = /^[a-z0-9._]{1,30}$/;

export const cleanHandleInput = (raw = '') => {
    let v = String(raw || '').trim();
    const fromUrl = v.match(/instagram\.com\/([^/?#\s]+)/i);
    if (fromUrl) v = fromUrl[1];
    return v.replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
};
export const isValidHandle = (h) => HANDLE_RE.test(h || '');

const readDraft = () => {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null') || null; } catch { return null; }
};
const writeDraft = (draft) => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* private mode */ }
};
export const clearDraft = () => {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ }
};

export const EMPTY_DETAILS = {
    niche: '',
    customNiche: '',
    cityPageFocus: '',
    collegeName: '',
    collaboration: 'both',
    commercials: '',
    bio: '',
    whatsappOptIn: true,
};

export function useCreatorApplication({ referredBy = '' } = {}) {
    const draft = useRef(readDraft()).current;
    const [step, setStep] = useState(draft?.step === 2 ? 2 : 1);
    const [handle, setHandleState] = useState(draft?.handle || '');
    const [followers, setFollowers] = useState(draft?.followers || '');
    const [details, setDetails] = useState({ ...EMPTY_DETAILS, ...(draft?.details || {}) });
    // lookup: { state: 'idle'|'checking'|'found'|'not_professional'|'invalid'|'unavailable'|'disabled', profile, connected, ... }
    const [lookup, setLookup] = useState({ state: 'idle' });
    const [connecting, setConnecting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const seq = useRef(0);

    useEffect(() => {
        writeDraft({ step, handle, followers, details });
    }, [step, handle, followers, details]);

    const setHandle = (raw) => {
        setHandleState(cleanHandleInput(raw));
        setError(null);
    };

    /* One Business Discovery check (the server caches for 24 hours). */
    const check = useCallback(async (value = handle) => {
        const h = cleanHandleInput(value);
        if (!isValidHandle(h)) {
            setLookup({ state: h ? 'invalid' : 'idle' });
            return;
        }
        const mine = ++seq.current;
        setLookup(prev => ({ ...prev, state: 'checking' }));
        const res = await callCreatorApi('ig-lookup', { handle: h }, { timeoutMs: 8000 });
        if (mine !== seq.current) return;
        if (!res.ok) {
            setLookup({ state: 'unavailable', message: res.error });
            return;
        }
        const d = res.data;
        if (!d.enabled) {
            setLookup({ state: 'disabled', minFollowers: d.minFollowers });
            return;
        }
        if (!d.ok) {
            setLookup({ state: d.reason === 'not_configured' ? 'unavailable' : d.reason, message: d.message, minFollowers: d.minFollowers });
            return;
        }
        setLookup({
            state: 'found',
            profile: d.profile,
            connected: d.connected,
            alreadyRegistered: d.alreadyRegistered,
            meetsMinimum: d.meetsMinimum,
            minFollowers: d.minFollowers,
            oauthReady: d.oauthReady,
        });
    }, [handle]);

    /* Starts the Instagram login. The page leaves; the draft is already saved. */
    const connect = useCallback(async () => {
        setConnecting(true);
        setError(null);
        const res = await callCreatorApi('ig-connect', {
            handle,
            // Back to this same page (keeps ?next= and the base path).
            returnTo: `${window.location.pathname}${window.location.search}` || appPath('/creator/apply'),
            origin: window.location.origin,
        });
        if (!res.ok || !res.data?.url) {
            setConnecting(false);
            setError(res.error || 'We couldn’t start the Instagram login.');
            return;
        }
        window.location.assign(res.data.url);
    }, [handle]);

    const submit = useCallback(async () => {
        setSubmitting(true);
        setError(null);
        const res = await callCreatorApi('creator-apply', {
            handle,
            followers: Number(String(followers).replace(/[^\d]/g, '')) || 0,
            ...details,
            referredBy,
        });
        setSubmitting(false);
        if (res.ok) {
            clearDraft();
            setResult(res.data);
            return res;
        }
        setError(res);
        if (res.code === 'connect_required' || res.field === 'handle' || res.code === 'below_minimum' || res.code === 'not_professional') setStep(1);
        return res;
    }, [handle, followers, details, referredBy]);

    return {
        step, setStep,
        handle, setHandle,
        followers, setFollowers,
        details, setDetails,
        lookup, check,
        connect, connecting,
        submit, submitting,
        error, setError,
        result,
    };
}
