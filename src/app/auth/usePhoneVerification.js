import { useCallback, useEffect, useRef, useState } from 'react';
import {
    RecaptchaVerifier, PhoneAuthProvider, signInWithPhoneNumber, signInWithCustomToken, linkWithCredential, updatePhoneNumber,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { toE164 } from '../../lib/store/profile';
import { callCreatorApi } from '../creator/api';
import { proveWithCredential, proveWithCustomToken, previewMerge } from './accountMerge';
import { t } from '../../i18n';

/*
 * Phone OTP verification, shared by every flow. Built from the copies in
 * CreatorJoin and AuthOverlay (EventTicketingModal, ProfilePanel and
 * EditCreatorModal carry the same logic and move onto this as their phases
 * land).
 *
 *   const phone = usePhoneVerification({ onVerified: (e164) => save(e164) });
 *   phone.send('+91 98765 43210')  → status 'sent'
 *   phone.verify('123456')         → status 'verified', onVerified('+919876543210')
 *
 * mode
 *   'link'   (default when signed in) proves the number and adds it to the
 *            current account. A number that already signs in to another
 *            account can't be on two: the right code signs in to that account
 *            in a throwaway session, and status becomes 'conflict' with
 *            `conflict` = { proof, preview } so the caller offers to merge it
 *            (MergeConfirm). After merging, call completeMerge(result).
 *   'signIn' (default when signed out) signs in with the number.
 *
 * channel
 *   The code goes on WhatsApp first (api/_lib/phoneOtp.js, otp-send /
 *   otp-verify). When WhatsApp isn't set up or the number isn't on it, the
 *   same send() falls back to an SMS through Firebase. `channel` says which
 *   one carried the code, and sendViaSms() switches to SMS on request.
 *
 * messageUs()
 *   Verify, or sign in, by sending us one WhatsApp message instead of typing a
 *   code (api/_lib/waVerify.js). It costs nothing to send, unlike an SMS. The
 *   code is fetched as soon as the hook mounts, so `waLink` is ready and the
 *   caller's button can be a plain link: one tap opens WhatsApp with the
 *   message typed (a link opened after an await gets blocked on iPhone). Tapping
 *   it calls messageUs(), status becomes 'awaiting' with `waMessage` = { code,
 *   link }, and the hook polls until the message arrives, at once when they come
 *   back to the tab. The number confirmed is the one they messaged from; signed
 *   out, that signs them in to the account with that number. A ready code is
 *   kept for the page (one per account, or one for signing in) and reused until
 *   it's used or near expiry, so opening the sheet again doesn't start another.
 *   Works without any approved template.
 *   `smsFailed` says the last SMS code couldn't be sent, so the caller can point
 *   to this instead.
 *
 * The invisible reCAPTCHA lives in one off-screen container per hook that is
 * never removed mid-flow (iOS Safari loses the token if it is), and is torn
 * down when the component unmounts.
 *
 * Local dev: set VITE_PHONE_TEST_MODE=true to mark numbers verified without
 * sending an SMS. onVerified then gets { testMode: true } and callers must not
 * save the number (see CompleteProfileSheet).
 */

const COOLDOWN_SECONDS = 30;
const POLL_MS = 3000;
const POLL_FOR_MS = 16 * 60 * 1000;

const friendlyError = (err) => {
    const code = err?.code || err?.message || '';
    if (code.includes('invalid-phone-number')) return t('That phone number doesn’t look right. Check the digits and try again.');
    if (code.includes('too-many-requests')) return t('Too many attempts. Wait a few minutes and try again.');
    if (code.includes('quota-exceeded')) return t('We can’t send more codes today. Please try again later.');
    if (code.includes('captcha') || code.includes('app-credential')) return t('The security check didn’t finish. Tap “Send code” again.');
    if (code.includes('network-request-failed')) return t('No connection. Check your internet and try again.');
    if (code.includes('invalid-verification-code')) return t('That code isn’t right. Check it and try again.');
    if (code.includes('code-expired')) return t('That code has expired. Send a new one.');
    if (code.includes('credential-already-in-use') || code.includes('account-exists-with-different-credential')) {
        return t('This number is already linked to another Newbi account. Sign in with that account, or use a different number.');
    }
    if (code.includes('requires-recent-login')) return t('For your security, sign out and back in, then verify your number.');
    if (code.includes('unauthorized-domain') || code.includes('operation-not-allowed')) return t('Phone verification isn’t available on this site right now.');
    // Show Firebase's own code (auth/…) so a screenshot of this message tells us what failed.
    if (err?.code) return t('We couldn’t verify your number right now. Please try again. (Error: {code})', { code: err.code });
    return t('We couldn’t verify your number right now. Please try again.');
};

// otp-send answers an SMS wouldn't fix (shown as they are). Anything else, WhatsApp not set up, the number
// not on WhatsApp, a server or network error, falls back to an SMS code.
const NO_SMS_FALLBACK = new Set(['rate_limited', 'cooldown', 'invalid_phone']);

// A code fetched ahead of the tap, shared by every field on the page: { key, data }.
let readyMessage = null;
const READY_FOR_MS = 7 * 60 * 1000; // sign-in codes live 10 minutes, verify codes 15
const fresh = (data) => Boolean(data && Date.now() - data.startedAt < READY_FOR_MS);
const messageOn = () => import.meta.env.VITE_WHATSAPP_PHONE_VERIFY === 'on';

const isTestMode = () => import.meta.env.DEV && import.meta.env.VITE_PHONE_TEST_MODE === 'true';

export function usePhoneVerification({ mode, defaultCountry = '+91', onVerified } = {}) {
    const [status, setStatus] = useState('idle'); // idle | sending | sent | awaiting | verifying | conflict | verified
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [phone, setPhone] = useState(null); // E.164 of the number in flight or verified
    const [conflict, setConflict] = useState(null); // { proof, preview }: the number signs in to another account
    const [channel, setChannel] = useState(null); // 'whatsapp' | 'sms' | 'message': what carries the check in flight
    const [waMessage, setWaMessage] = useState(null); // { code, link, startedAt }: verifying by messaging us
    const [smsFailed, setSmsFailed] = useState(false); // the last SMS code couldn't be sent (quota, security check…)
    const [waReady, setWaReady] = useState(null); // a messageUs() code fetched ahead of the tap
    const [waUnavailable, setWaUnavailable] = useState(false); // the server has messaging us switched off

    const verifierRef = useRef(null);
    const containerRef = useRef(null);
    const confirmationRef = useRef(null); // ConfirmationResult (signIn) or verificationId (link)
    const onVerifiedRef = useRef(onVerified);
    onVerifiedRef.current = onVerified;

    const ensureVerifier = useCallback(async () => {
        if (verifierRef.current) return verifierRef.current;
        if (!containerRef.current) {
            const el = document.createElement('div');
            el.setAttribute('aria-hidden', 'true');
            Object.assign(el.style, { position: 'fixed', bottom: '0', right: '0', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', overflow: 'hidden' });
            document.body.appendChild(el);
            containerRef.current = el;
        }
        verifierRef.current = new RecaptchaVerifier(auth, containerRef.current, {
            size: 'invisible',
            'expired-callback': () => setError(t('The security check expired. Tap “Send code” again.')),
        });
        await verifierRef.current.render();
        return verifierRef.current;
    }, []);

    const resetVerifier = useCallback(() => {
        try { verifierRef.current?.clear(); } catch (e) { /* already cleared */ }
        verifierRef.current = null;
        // A cleared verifier leaves its iframe behind; start the container fresh.
        if (containerRef.current) containerRef.current.innerHTML = '';
    }, []);

    useEffect(() => () => {
        try { verifierRef.current?.clear(); } catch (e) { /* already cleared */ }
        verifierRef.current = null;
        containerRef.current?.remove();
        containerRef.current = null;
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const finish = useCallback(async (e164, result) => {
        setStatus('verified');
        setError('');
        confirmationRef.current = null;
        await onVerifiedRef.current?.(e164, result);
    }, []);

    /* Sends the code, on WhatsApp unless `via: 'sms'`. `input` can be local ('98765 43210') or international. */
    const send = useCallback(async (input, { via } = {}) => {
        const e164 = toE164(input, defaultCountry);
        const digits = (e164 || '').replace(/\D/g, '');
        if (!e164 || digits.length < 10 || digits.length > 15) {
            setError(t('Enter a valid mobile number.'));
            return false;
        }
        const switchingToSms = via === 'sms' && channel !== 'sms';
        if (cooldown > 0 && e164 === phone && !switchingToSms) return false;
        setPhone(e164);
        setError('');

        const signingIn = (mode || (auth?.currentUser ? 'link' : 'signIn')) === 'signIn';
        // Test mode only fakes adding a number to an account; signing in always needs a real code.
        if (isTestMode() && !signingIn) {
            await finish(e164, { testMode: true });
            return true;
        }

        setStatus('sending');
        if (via !== 'sms') {
            const purpose = signingIn ? 'login' : 'verify';
            const sent = await callCreatorApi('otp-send', { phone: e164, purpose });
            if (sent.ok) {
                confirmationRef.current = { whatsapp: true, purpose };
                setChannel('whatsapp');
                setStatus('sent');
                setCooldown(Number(sent.data?.resendIn) || COOLDOWN_SECONDS);
                return true;
            }
            if (NO_SMS_FALLBACK.has(sent.code)) {
                setStatus('idle');
                setError(sent.error);
                return false;
            }
        }
        try {
            const verifier = await ensureVerifier();
            if (!signingIn) {
                if (!auth.currentUser) throw Object.assign(new Error('Sign in first.'), { code: 'auth/requires-recent-login' });
                const provider = new PhoneAuthProvider(auth);
                confirmationRef.current = await provider.verifyPhoneNumber(e164, verifier);
            } else {
                confirmationRef.current = await signInWithPhoneNumber(auth, e164, verifier);
            }
            setChannel('sms');
            setStatus('sent');
            setSmsFailed(false);
            setCooldown(COOLDOWN_SECONDS);
            return true;
        } catch (err) {
            console.warn('[phone] send failed:', err?.code || err);
            resetVerifier();
            setStatus('idle');
            setSmsFailed(true);
            setError(friendlyError(err));
            return false;
        }
    }, [cooldown, phone, channel, mode, defaultCountry, ensureVerifier, resetVerifier, finish]);

    /* Checks the 6-digit code. */
    const verify = useCallback(async (code) => {
        const clean = String(code || '').replace(/\D/g, '');
        if (clean.length !== 6) {
            setError(t('Enter the 6-digit code.'));
            return false;
        }
        const pending = confirmationRef.current;
        if (!pending) {
            setError(t('Send a code first.'));
            return false;
        }
        setStatus('verifying');
        setError('');
        try {
            if (pending.whatsapp) {
                const checked = await callCreatorApi('otp-verify', { phone, code: clean, purpose: pending.purpose });
                if (!checked.ok) {
                    setStatus(checked.code === 'code_expired' || checked.code === 'too_many_attempts' ? 'idle' : 'sent');
                    if (checked.code === 'code_expired' || checked.code === 'too_many_attempts') confirmationRef.current = null;
                    setError(checked.error);
                    return false;
                }
                confirmationRef.current = null;
                if (pending.purpose === 'login') {
                    const result = await signInWithCustomToken(auth, checked.data.token);
                    await finish(phone, { user: result.user });
                    return true;
                }
                if (checked.data.conflict) {
                    // Same as an SMS code for a number on another account: sign in there (throwaway session) and offer to merge.
                    try {
                        const proof = await proveWithCustomToken(checked.data.proofToken);
                        setConflict({ proof, preview: await previewMerge(proof) });
                        setStatus('conflict');
                    } catch (err) {
                        setStatus('idle');
                        setError(err?.friendly || t('This number is on another Newbi account that can’t be merged from here.'));
                    }
                    return false;
                }
                // The server put the number on this account; refresh so the ID token carries it.
                await auth.currentUser?.reload();
                await auth.currentUser?.getIdToken(true);
                await finish(phone, { linked: true });
                return true;
            }
            if (typeof pending === 'string') {
                const credential = PhoneAuthProvider.credential(pending, clean);
                const inUse = (err) => err?.code === 'auth/credential-already-in-use' || err?.code === 'auth/account-exists-with-different-credential';
                let taken = null;
                try {
                    await linkWithCredential(auth.currentUser, credential);
                } catch (err) {
                    if (inUse(err)) taken = err;
                    // The account already has a phone: replace it with the newly verified one.
                    else if (err?.code === 'auth/provider-already-linked') {
                        await updatePhoneNumber(auth.currentUser, credential).catch((e) => { if (inUse(e)) taken = e; else throw e; });
                    } else throw err;
                }
                if (taken) {
                    // The number signs in to another account: the code was right, so sign in there (throwaway session) and offer to merge.
                    confirmationRef.current = null;
                    try {
                        const proof = await proveWithCredential(PhoneAuthProvider.credentialFromError(taken) || credential);
                        setConflict({ proof, preview: await previewMerge(proof) });
                        setStatus('conflict');
                    } catch (err) {
                        // Can't merge (a team account, two creator profiles…): that number can't be used here.
                        setStatus('idle');
                        setError(err?.friendly || t('This number is on another Newbi account that can’t be merged from here.'));
                    }
                    return false;
                }
                await finish(phone, { linked: true });
            } else {
                const result = await pending.confirm(clean);
                await finish(phone, { user: result.user });
            }
            return true;
        } catch (err) {
            console.warn('[phone] verify failed:', err?.code || err);
            setStatus('sent');
            setError(err?.friendly || friendlyError(err));
            return false;
        }
    }, [phone, finish]);

    const messageKey = useCallback(() => {
        const login = (mode || (auth?.currentUser ? 'link' : 'signIn')) === 'signIn';
        return { login, key: login ? 'login' : auth?.currentUser ? `link:${auth.currentUser.uid}` : null };
    }, [mode]);

    /* Asks the server for a code (or reuses the page's) → the code, or null with the reason in `failed`. */
    const fetchMessage = useCallback(async () => {
        const { login, key } = messageKey();
        if (!key) return { failed: { error: t('Sign in first.') } };
        if (readyMessage?.key === key && fresh(readyMessage.data)) return { data: readyMessage.data };
        const started = await callCreatorApi(login ? 'wa-login-start' : 'wa-verify-start', {});
        if (!started.ok) return { failed: started };
        const { code, link, pollKey, expiresIn } = started.data;
        const at = Date.now();
        const data = { code, link, pollKey, login, startedAt: at, expiresAt: at + (Number(expiresIn) || 600) * 1000 };
        readyMessage = { key, data };
        return { data };
    }, [messageKey]);

    // Fetch it ahead of the tap, so the button can open WhatsApp at once.
    const preparing = useRef(false);
    useEffect(() => {
        if (!messageOn() || waUnavailable || preparing.current || status !== 'idle' || fresh(waReady)) return;
        preparing.current = true;
        fetchMessage().then(({ data, failed }) => {
            if (data) setWaReady(data);
            if (failed?.code === 'whatsapp_unavailable') setWaUnavailable(true);
        }).finally(() => { preparing.current = false; });
    }, [status, waReady, waUnavailable, fetchMessage]);

    const awaitMessage = useCallback((data) => {
        setError('');
        setWaMessage(data);
        setChannel('message');
        setStatus('awaiting');
    }, []);

    /*
     * Verify (signed in) or sign in (signed out) by messaging us on WhatsApp.
     * With the code ready this is synchronous, so it can run in the link's own
     * click; otherwise it fetches one and the caller shows an "Open WhatsApp" button.
     */
    const messageUs = useCallback(() => {
        if (fresh(waReady)) {
            awaitMessage(waReady);
            return true;
        }
        return (async () => {
            setError('');
            setStatus('sending');
            const { data, failed } = await fetchMessage();
            if (!data) {
                setStatus('idle');
                if (failed?.code === 'whatsapp_unavailable') setWaUnavailable(true);
                setError(failed?.code === 'whatsapp_unavailable' ? t('WhatsApp verification isn’t available right now. Get a code by SMS instead.') : failed?.error);
                return false;
            }
            setWaReady(data);
            awaitMessage(data);
            return true;
        })();
    }, [waReady, fetchMessage, awaitMessage]);

    // While awaiting their message: ask the server every few seconds, and at once when they come back to the tab.
    const polling = useRef(false);
    useEffect(() => {
        if (status !== 'awaiting' || !waMessage) return undefined;
        let stopped = false;
        const check = async () => {
            if (stopped || polling.current) return;
            if (Date.now() - waMessage.startedAt > POLL_FOR_MS) {
                setStatus('idle');
                setWaMessage(null);
                if (readyMessage?.data?.code === waMessage.code) readyMessage = null;
                setWaReady(null);
                setError(t('That code expired. Tap the WhatsApp button again.'));
                return;
            }
            polling.current = true;
            const res = await callCreatorApi(
                waMessage.login ? 'wa-login-status' : 'wa-verify-status',
                waMessage.login ? { code: waMessage.code, pollKey: waMessage.pollKey } : { code: waMessage.code },
            ).catch(() => null);
            polling.current = false;
            if (stopped || !res?.ok) return;
            const { state, phone: confirmed, proofToken, token } = res.data || {};
            if (state === 'waiting') return;
            stopped = true;
            setWaMessage(null);
            // That code is spent: the next tap gets a new one.
            if (readyMessage?.data?.code === waMessage.code) readyMessage = null;
            setWaReady(null);
            if (state === 'verified' && waMessage.login) {
                setPhone(confirmed);
                try {
                    const result = await signInWithCustomToken(auth, token);
                    await finish(confirmed, { user: result.user });
                } catch (err) {
                    setStatus('idle');
                    setError(friendlyError(err));
                }
                return;
            }
            if (state === 'verified') {
                setPhone(confirmed);
                // The server put the number on this account; refresh so the ID token carries it.
                await auth.currentUser?.reload();
                await auth.currentUser?.getIdToken(true);
                await finish(confirmed, { linked: true });
                return;
            }
            if (state === 'conflict') {
                setPhone(confirmed);
                try {
                    const proof = await proveWithCustomToken(proofToken);
                    setConflict({ proof, preview: await previewMerge(proof) });
                    setStatus('conflict');
                } catch (err) {
                    setStatus('idle');
                    setError(err?.friendly || t('This number is on another Newbi account that can’t be merged from here.'));
                }
                return;
            }
            setStatus('idle');
            setError({
                taken: waMessage.login
                    ? t('The Newbi account on this number can’t sign in. Contact support.')
                    : t('This number is on another Newbi account that can’t be merged from here.'),
                expired: t('That code expired. Tap the WhatsApp button again.'),
            }[state] || t('We couldn’t confirm your number. Try again, or get a code by SMS.'));
        };
        const timer = setInterval(check, POLL_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') check(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            stopped = true;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [status, waMessage, finish]);

    /* After MergeConfirm merged the other account: the number is on this one now. */
    const completeMerge = useCallback(async (result) => {
        setConflict(null);
        await finish(phone, { linked: true, merged: result || true });
    }, [phone, finish]);

    const reset = useCallback(() => {
        confirmationRef.current = null;
        setStatus('idle');
        setError('');
        setPhone(null);
        setConflict(null);
        setChannel(null);
        setWaMessage(null);
        setSmsFailed(false);
    }, []);

    /* "Get the code by SMS instead". */
    const sendViaSms = useCallback(() => send(phone, { via: 'sms' }), [send, phone]);

    return {
        status,
        error,
        phone,
        cooldown,
        channel,
        isSending: status === 'sending',
        isVerifying: status === 'verifying',
        codeSent: status === 'sent' || status === 'verifying',
        awaitingMessage: status === 'awaiting',
        waMessage: status === 'awaiting' ? waMessage : null,
        smsFailed: smsFailed && status === 'idle',
        // Verifying or signing in by messaging us. Off until VITE_WHATSAPP_PHONE_VERIFY=on (api/_lib/waVerify.js).
        canMessageUs: messageOn() && !waUnavailable,
        waLink: fresh(waReady) ? waReady.link : null,
        signingIn: (mode || (auth?.currentUser ? 'link' : 'signIn')) === 'signIn',
        verified: status === 'verified',
        conflict: status === 'conflict' ? conflict : null,
        testMode: isTestMode() && (mode || (auth?.currentUser ? 'link' : 'signIn')) !== 'signIn',
        send,
        sendViaSms,
        messageUs,
        verify,
        reset,
        completeMerge,
        setError,
    };
}

export default usePhoneVerification;
