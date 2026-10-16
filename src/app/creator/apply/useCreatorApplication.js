import { useCallback, useEffect, useRef, useState } from 'react';
import { callCreatorApi } from '../api';
import { appPath } from '../../host';
import { isCollegeNiche } from '../../../lib/creator/options';

/*
 * State for the one-screen creator application.
 *
 *   Instagram username   checked against Meta while typing (when
 *                        instagramMetaVerification is on); the result fills
 *                        the live creator pass (picture, name, followers)
 *   city                 one pick, prefilled from the profile
 *   niches               up to three
 *   college              only for campus niches
 *
 * Name, email, phone and photo are never asked here: they come from the
 * account (or Instagram). The draft survives the Instagram login round trip
 * in sessionStorage, and `autoSubmit` sends the application on the way back.
 */

const DRAFT_KEY = 'nb_creator_apply_v2';
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

export function useCreatorApplication({ referredBy = '', initialCity = '' } = {}) {
    const draft = useRef(readDraft()).current;
    const [handle, setHandleState] = useState(draft?.handle || '');
    const [city, setCity] = useState(draft?.city || initialCity || '');
    const [niches, setNiches] = useState(Array.isArray(draft?.niches) ? draft.niches.slice(0, MAX_NICHES) : []);
    const [customNiche, setCustomNiche] = useState(draft?.customNiche || '');
    const [collegeName, setCollegeName] = useState(draft?.collegeName || '');
    const [whatsappOptIn, setWhatsappOptIn] = useState(draft?.whatsappOptIn !== false);
    // lookup.state: idle | checking | found | not_professional | invalid | unavailable | disabled
    const [lookup, setLookup] = useState({ state: 'idle' });
    const [connecting, setConnecting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const autoSubmit = useRef(Boolean(draft?.autoSubmit));
    const seq = useRef(0);

    // The profile's city arrives after the first render.
    useEffect(() => { if (!city && initialCity) setCity(initialCity); }, [initialCity]); // eslint-disable-line

    useEffect(() => {
        writeDraft({ handle, city, niches, customNiche, collegeName, whatsappOptIn, autoSubmit: autoSubmit.current });
    }, [handle, city, niches, customNiche, collegeName, whatsappOptIn]);

    const setHandle = (raw) => {
        setHandleState(cleanHandleInput(raw));
        setError(null);
    };

    const toggleNiche = (id) => setNiches((list) => {
        if (list.includes(id)) return list.filter(n => n !== id);
        if (list.length >= MAX_NICHES) return [...list.slice(1), id];
        return [...list, id];
    });

    /* One Business Discovery check (the server caches it for 24 hours). */
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
    const steps = [
        { key: 'instagram', done: isValidHandle(handle) && !['invalid', 'not_professional', 'checking'].includes(lookup.state) && !lookup.alreadyRegistered && lookup.meetsMinimum !== false },
        { key: 'city', done: Boolean(String(city).trim()) },
        { key: 'niche', done: niches.length > 0 && (!niches.includes('Others') || Boolean(customNiche.trim())) && (!campus || Boolean(collegeName.trim())) },
    ];
    const ready = steps.every(s => s.done);
    const found = lookup.state === 'found' ? lookup : null;
    const needsConnect = Boolean(found && !found.connected && found.oauthReady);

    /* Instagram login. The page leaves; the draft is saved and submits on the way back. */
    const connect = useCallback(async () => {
        setConnecting(true);
        setError(null);
        autoSubmit.current = true;
        writeDraft({ handle, city, niches, customNiche, collegeName, whatsappOptIn, autoSubmit: true });
        const res = await callCreatorApi('ig-connect', {
            handle,
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
    }, [handle, city, niches, customNiche, collegeName, whatsappOptIn]);

    const submit = useCallback(async () => {
        autoSubmit.current = false;
        setSubmitting(true);
        setError(null);
        const res = await callCreatorApi('creator-apply', {
            handle,
            city: city.trim(),
            niches,
            customNiche: niches.includes('Others') ? customNiche.trim() : '',
            collegeName: campus ? collegeName.trim() : '',
            whatsappOptIn,
            referredBy,
        });
        setSubmitting(false);
        if (res.ok) {
            clearDraft();
            setResult(res.data);
        } else {
            setError(res);
        }
        return res;
    }, [handle, city, niches, customNiche, collegeName, campus, whatsappOptIn, referredBy]);

    return {
        handle, setHandle,
        city, setCity,
        niches, toggleNiche,
        customNiche, setCustomNiche,
        collegeName, setCollegeName,
        whatsappOptIn, setWhatsappOptIn,
        campus, steps, ready,
        lookup, check, found, needsConnect,
        connect, connecting,
        submit, submitting,
        error, setError,
        result,
        wantsAutoSubmit: () => autoSubmit.current,
    };
}
