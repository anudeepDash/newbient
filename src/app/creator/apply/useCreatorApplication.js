import { useCallback, useEffect, useRef, useState } from 'react';
import { callCreatorApi } from '../api';
import { appPath } from '../../host';
import { isCollegeNiche } from '../../../lib/creator/options';

/*
 * State for the one-screen creator application.
 *
 *   Instagram            when Instagram Login is switched on (`igStatus.oauthReady`),
 *                        the form starts with "Connect with Instagram": the
 *                        login proves the account, fills the handle and
 *                        followers, and the server approves automatically.
 *                        Otherwise:
 *   Instagram username   looked up while typing (Meta when it's switched on,
 *                        else the public profile); the result fills the live
 *                        creator pass. If it can't be read, the creator types
 *                        their follower count instead (reviewed by the team).
 *   city                 one pick, prefilled from the profile
 *   niches               up to three
 *   college              only for campus niches
 *
 * Name, email, phone and photo are never asked here: they come from the
 * account (or Instagram). The draft survives the Instagram login round trip
 * in sessionStorage, and `autoSubmit` sends the application on the way back.
 */

const DRAFT_KEY = 'nb_creator_apply_v2';
// When the automatic check can't read the profile, the creator types their follower count (reviewed by the team).
export const MANUAL_STATES = ['unavailable', 'not_found'];
export const parseFollowersInput = (raw = '') => {
    const m = String(raw).trim().toLowerCase().replace(/,/g, '').match(/^(\d+(?:\.\d+)?)\s*([km])?$/);
    if (!m) return 0;
    const n = Number(m[1]) * (m[2] === 'm' ? 1e6 : m[2] === 'k' ? 1e3 : 1);
    return Number.isFinite(n) ? Math.floor(n) : 0;
};
const HANDLE_RE = /^[a-z0-9._]{1,30}$/;
export const MAX_NICHES = 3;

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

export function useCreatorApplication({ referredBy = '', initialCity = '', uid = null } = {}) {
    const draft = useRef(readDraft()).current;
    const [handle, setHandleState] = useState(draft?.handle || '');
    const [city, setCity] = useState(draft?.city || initialCity || '');
    const [niches, setNiches] = useState(Array.isArray(draft?.niches) ? draft.niches.slice(0, MAX_NICHES) : []);
    const [customNiche, setCustomNiche] = useState(draft?.customNiche || '');
    const [collegeName, setCollegeName] = useState(draft?.collegeName || '');
    const [whatsappOptIn, setWhatsappOptIn] = useState(draft?.whatsappOptIn !== false);
    const [manualFollowers, setManualFollowers] = useState(draft?.manualFollowers || '');
    // lookup.state: idle | checking | found | not_found | not_professional | invalid | unavailable | disabled
    const [lookup, setLookup] = useState({ state: 'idle' });
    const [connecting, setConnecting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const autoSubmit = useRef(Boolean(draft?.autoSubmit));
    const seq = useRef(0);
    // Whether Instagram Login is on, and the account this person already connected (if any).
    const [igStatus, setIgStatus] = useState({ loaded: false, oauthReady: false, account: null });

    // The profile's city arrives after the first render.
    useEffect(() => { if (!city && initialCity) setCity(initialCity); }, [initialCity]); // eslint-disable-line

    useEffect(() => {
        writeDraft({ handle, city, niches, customNiche, collegeName, whatsappOptIn, manualFollowers, autoSubmit: autoSubmit.current });
    }, [handle, city, niches, customNiche, collegeName, whatsappOptIn, manualFollowers]);

    const setHandle = (raw) => {
        setHandleState(cleanHandleInput(raw));
        setError(null);
    };

    // Asked again after sign-in, so a connected account shows up.
    useEffect(() => {
        let live = true;
        callCreatorApi('ig-lookup', {}, { timeoutMs: 8000 }).then((res) => {
            if (!live) return;
            const d = res.ok ? res.data : {};
            setIgStatus({ loaded: true, oauthReady: Boolean(d.oauthReady), account: d.account || null, minFollowers: d.minFollowers });
            if (d.oauthReady && d.account?.username) setHandleState(h => h || d.account.username);
        });
        return () => { live = false; };
    }, [uid]);

    const toggleNiche = (id) => setNiches((list) => {
        if (list.includes(id)) return list.filter(n => n !== id);
        if (list.length >= MAX_NICHES) return [...list.slice(1), id];
        return [...list, id];
    });

    /* One lookup (Meta, or the public profile as an estimate); the server caches it for 24 hours. */
    const check = useCallback(async (value = handle) => {
        const h = cleanHandleInput(value);
        if (!isValidHandle(h)) {
            setLookup({ state: h ? 'invalid' : 'idle' });
            return;
        }
        const mine = ++seq.current;
        setLookup(prev => ({ ...prev, state: 'checking', handle: h }));
        const res = await callCreatorApi('ig-lookup', { handle: h }, { timeoutMs: 8000 });
        if (mine !== seq.current) return;
        if (!res.ok) return setLookup({ state: 'unavailable', handle: h });
        const d = res.data;
        if (!d.enabled) return setLookup({ state: 'disabled', handle: h, minFollowers: d.minFollowers });
        if (!d.ok) return setLookup({ state: d.reason === 'not_configured' ? 'unavailable' : d.reason, handle: h, minFollowers: d.minFollowers });
        setLookup({
            state: 'found',
            handle: h,
            profile: d.profile,
            connected: d.connected,
            alreadyRegistered: d.alreadyRegistered,
            meetsMinimum: d.meetsMinimum,
            minFollowers: d.minFollowers,
            oauthReady: d.oauthReady,
        });
        return undefined;
    }, [handle]);

    const campus = niches.some(isCollegeNiche);
    const oauthReady = igStatus.oauthReady;
    const found = lookup.state === 'found' ? lookup : null;
    const connected = Boolean(found?.connected);
    // With Instagram Login on, there's no typed fallback: the account is connected or it isn't.
    const manualAllowed = !oauthReady && isValidHandle(handle) && MANUAL_STATES.includes(lookup.state);
    const manualCount = manualAllowed ? parseFollowersInput(manualFollowers) : 0;
    const manualBelowMin = Boolean(manualCount && lookup.minFollowers && manualCount < lookup.minFollowers);
    const steps = [
        {
            key: 'instagram',
            done: oauthReady
                ? connected && !found.alreadyRegistered && found.meetsMinimum !== false
                : manualAllowed
                ? manualCount > 0 && !manualBelowMin
                : isValidHandle(handle) && !['invalid', 'not_professional', 'checking'].includes(lookup.state) && !lookup.alreadyRegistered && lookup.meetsMinimum !== false,
        },
        { key: 'city', done: Boolean(String(city).trim()) },
        { key: 'niche', done: niches.length > 0 && (!niches.includes('Others') || Boolean(customNiche.trim())) && (!campus || Boolean(collegeName.trim())) },
    ];
    const ready = steps.every(s => s.done);
    // City and niches done: connecting Instagram is all that's left.
    const readyButInstagram = steps.slice(1).every(s => s.done);
    const needsConnect = oauthReady ? !connected : Boolean(found && !found.connected && found.oauthReady);

    /*
     * Instagram login. The page leaves; the draft is saved, and if the rest of
     * the form is filled in (`auto`) it submits on the way back.
     */
    const connect = useCallback(async ({ auto = true, switchAccount = false } = {}) => {
        setConnecting(true);
        setError(null);
        autoSubmit.current = auto;
        writeDraft({ handle, city, niches, customNiche, collegeName, whatsappOptIn, autoSubmit: auto });
        const res = await callCreatorApi('ig-connect', {
            // Connect-first has no typed handle to match; switching accounts drops it on purpose.
            handle: oauthReady || switchAccount ? '' : handle,
            returnTo: `${window.location.pathname}${window.location.search}` || appPath('/creator/apply'),
            origin: window.location.origin,
        });
        if (!res.ok || !res.data?.url) {
            autoSubmit.current = false;
            setConnecting(false);
            setError({ error: res.error || 'We couldn’t start the Instagram login.' });
            return;
        }
        window.location.assign(res.data.url);
    }, [handle, city, niches, customNiche, collegeName, whatsappOptIn, oauthReady]);

    /* `override.handle`: the account just connected, before the handle state has caught up. */
    const submit = useCallback(async (override = {}) => {
        autoSubmit.current = false;
        setSubmitting(true);
        setError(null);
        const res = await callCreatorApi('creator-apply', {
            handle: override.handle || handle,
            city: city.trim(),
            niches,
            customNiche: niches.includes('Others') ? customNiche.trim() : '',
            collegeName: campus ? collegeName.trim() : '',
            whatsappOptIn,
            referredBy,
            ...(manualCount ? { manualFollowers: manualCount } : {}),
        });
        setSubmitting(false);
        if (res.ok) {
            clearDraft();
            setResult(res.data);
        } else {
            setError(res);
        }
        return res;
    }, [handle, city, niches, customNiche, collegeName, campus, whatsappOptIn, referredBy, manualCount]);

    return {
        handle, setHandle,
        city, setCity,
        niches, toggleNiche,
        customNiche, setCustomNiche,
        collegeName, setCollegeName,
        whatsappOptIn, setWhatsappOptIn,
        manualFollowers, setManualFollowers, manualAllowed, manualCount, manualBelowMin,
        campus, steps, ready,
        lookup, check, found, needsConnect, connected,
        igStatus, oauthReady, readyButInstagram,
        connect, connecting,
        submit, submitting,
        error, setError,
        result,
        wantsAutoSubmit: () => autoSubmit.current,
    };
}
