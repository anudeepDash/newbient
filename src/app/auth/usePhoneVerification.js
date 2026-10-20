import { useCallback, useEffect, useRef, useState } from 'react';
import {
    RecaptchaVerifier, PhoneAuthProvider, signInWithPhoneNumber, linkWithCredential, updatePhoneNumber,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { toE164 } from '../../lib/store/profile';
import { proveWithCredential, previewMerge } from './accountMerge';
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
 * The invisible reCAPTCHA lives in one off-screen container per hook that is
 * never removed mid-flow (iOS Safari loses the token if it is), and is torn
 * down when the component unmounts.
 *
 * Local dev: set VITE_PHONE_TEST_MODE=true to mark numbers verified without
 * sending an SMS. onVerified then gets { testMode: true } and callers must not
 * save the number (see CompleteProfileSheet).
 */

const COOLDOWN_SECONDS = 30;

const friendlyError = (err) => {
    const code = err?.code || err?.message || '';
    if (code.includes('invalid-phone-number')) return t('That phone number doesn’t look right. Check the digits and try again.');
    if (code.includes('too-many-requests')) return t('Too many attempts. Wait a few minutes and try again.');
    if (code.includes('quota-exceeded')) return t('We can’t send more codes today. Please try again later.');
    if (code.includes('captcha')) return t('The security check didn’t finish. Tap “Send code” again.');
    if (code.includes('network-request-failed')) return t('No connection. Check your internet and try again.');
    if (code.includes('invalid-verification-code')) return t('That code isn’t right. Check it and try again.');
    if (code.includes('code-expired')) return t('That code has expired. Send a new one.');
    if (code.includes('credential-already-in-use') || code.includes('account-exists-with-different-credential')) {
        return t('This number is already linked to another Newbi account. Sign in with that account, or use a different number.');
    }
    if (code.includes('requires-recent-login')) return t('For your security, sign out and back in, then verify your number.');
    if (code.includes('unauthorized-domain') || code.includes('operation-not-allowed')) return t('Phone verification isn’t available on this site right now.');
    return t('We couldn’t verify your number right now. Please try again.');
};

const isTestMode = () => import.meta.env.DEV && import.meta.env.VITE_PHONE_TEST_MODE === 'true';

export function usePhoneVerification({ mode, defaultCountry = '+91', onVerified } = {}) {
    const [status, setStatus] = useState('idle'); // idle | sending | sent | verifying | conflict | verified
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [phone, setPhone] = useState(null); // E.164 of the number in flight or verified
    const [conflict, setConflict] = useState(null); // { proof, preview }: the number signs in to another account

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

    /* Sends the code. `input` can be local ('98765 43210') or international. */
    const send = useCallback(async (input) => {
        const e164 = toE164(input, defaultCountry);
        const digits = (e164 || '').replace(/\D/g, '');
        if (!e164 || digits.length < 10 || digits.length > 15) {
            setError(t('Enter a valid mobile number.'));
            return false;
        }
        if (cooldown > 0 && e164 === phone) return false;
        setPhone(e164);
        setError('');

        const signingIn = (mode || (auth?.currentUser ? 'link' : 'signIn')) === 'signIn';
        // Test mode only fakes adding a number to an account; signing in always needs a real code.
        if (isTestMode() && !signingIn) {
            await finish(e164, { testMode: true });
            return true;
        }

        setStatus('sending');
        try {
            const verifier = await ensureVerifier();
            if (!signingIn) {
                if (!auth.currentUser) throw Object.assign(new Error('Sign in first.'), { code: 'auth/requires-recent-login' });
                const provider = new PhoneAuthProvider(auth);
                confirmationRef.current = await provider.verifyPhoneNumber(e164, verifier);
            } else {
                confirmationRef.current = await signInWithPhoneNumber(auth, e164, verifier);
            }
            setStatus('sent');
            setCooldown(COOLDOWN_SECONDS);
            return true;
        } catch (err) {
            console.warn('[phone] send failed:', err?.code || err);
            resetVerifier();
            setStatus('idle');
            setError(friendlyError(err));
            return false;
        }
    }, [cooldown, phone, mode, defaultCountry, ensureVerifier, resetVerifier, finish]);

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
    }, []);

    return {
        status,
        error,
        phone,
        cooldown,
        isSending: status === 'sending',
        isVerifying: status === 'verifying',
        codeSent: status === 'sent' || status === 'verifying',
        verified: status === 'verified',
        conflict: status === 'conflict' ? conflict : null,
        testMode: isTestMode() && (mode || (auth?.currentUser ? 'link' : 'signIn')) !== 'signIn',
        send,
        verify,
        reset,
        completeMerge,
        setError,
    };
}

export default usePhoneVerification;
