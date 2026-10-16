import React, { useEffect, useState } from 'react';
import Phone from 'lucide-react/dist/esm/icons/smartphone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { useAppStore } from '../../lib/store/appStore';
import { signInWithGoogle } from '../../lib/googleSignIn';
import { isInAppBrowser } from '../../lib/platform';
import { Sheet, Button, TextInput } from '../../components/app';
import PhoneVerifyField from './PhoneVerifyField';
import ProfileDetailsForm from '../profile/ProfileDetailsForm';
import { missingFields } from '../profile/requirements';
import { landingUrl } from '../host';
import newbiIcon from '../../assets/logo/newbi-icon.svg';

/*
 * The app's sign-in sheet (replaces the site's AuthOverlay inside the app).
 *
 *   start  → Google · phone · email
 *   phone  → number + SMS code (signs in, or creates the account)
 *   email  → sign in / create account, with "forgot password"
 *   details → right after sign-in, in the same sheet: whatever profile fields
 *            the next action needs and the account doesn't have yet
 *            (accountRequire, always including a name). Signed-in users who
 *            are only missing details open straight on this step.
 *
 * It opens and closes on the same `isAuthOpen` flag as AuthOverlay, so
 * useAuthGate().requestSignIn() and every existing "Sign in" button work.
 * Inside Instagram/WhatsApp, Google sign-in leaves the page and comes back
 * (AuthResumer finishes it).
 */

const GoogleMark = () => (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
);

const friendly = (err) => {
    const code = err?.code || err?.message || '';
    if (code.includes('popup-closed') || code.includes('cancelled-popup')) return '';
    if (code.includes('popup-blocked')) return 'Your browser blocked the Google window. Allow pop-ups, or sign in with your phone.';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'That email and password don’t match. Try again, or reset your password.';
    if (code.includes('email-already-in-use')) return 'There’s already an account with this email. Sign in instead.';
    if (code.includes('weak-password')) return 'Use at least 6 characters for your password.';
    if (code.includes('invalid-email')) return 'That email doesn’t look right.';
    if (code.includes('too-many-requests')) return 'Too many attempts. Wait a few minutes and try again.';
    if (code.includes('network-request-failed')) return 'No connection. Check your internet and try again.';
    if (code.includes('account-exists-with-different-credential')) return 'This email already signs in another way. Try Google or your phone.';
    return 'Sign-in didn’t work. Please try again.';
};

const OptionButton = ({ icon: Icon, children, onClick, loading }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="flex h-14 w-full items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-5 text-[16px] font-bold text-gray-900 transition-colors hover:bg-gray-50 active:scale-[0.99] disabled:opacity-60 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
    >
        <span className="flex w-6 justify-center">{Icon}</span>
        <span className="flex-1 text-left">{children}</span>
    </button>
);

const SignInSheet = () => {
    const isOpen = useLegacyStore(s => s.isAuthOpen);
    const setAuthModal = useLegacyStore(s => s.setAuthModal);
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const accountRequire = useAppStore(s => s.accountRequire);
    const takeAccountAction = useAppStore(s => s.takeAccountAction);

    const [step, setStep] = useState('start');
    const [emailMode, setEmailMode] = useState('signIn'); // signIn | signUp | forgot
    const [form, setForm] = useState({ email: '', password: '', name: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    // The fields the details step asks for, frozen once the profile has loaded.
    const [detailFields, setDetailFields] = useState(null);

    // Already signed in (only details missing): open on the details step.
    useEffect(() => {
        if (isOpen && authUser) setStep('details');
        // Only when the sheet opens.
        // eslint-disable-next-line
    }, [isOpen]);

    // On the details step, work out what's missing once the profile is in; nothing missing → done.
    useEffect(() => {
        if (!isOpen || step !== 'details' || !authUser || !profileLoaded || detailFields) return;
        const missing = missingFields(profile, accountRequire);
        if (missing.length) setDetailFields(missing);
        else finish();
        // eslint-disable-next-line
    }, [isOpen, step, authUser, profileLoaded, profile, detailFields]);

    useEffect(() => {
        if (isOpen) return;
        const t = setTimeout(() => {
            setStep('start'); setEmailMode('signIn'); setError(''); setNotice(''); setDetailFields(null);
            setForm({ email: '', password: '', name: '' });
        }, 250);
        return () => clearTimeout(t);
    }, [isOpen]);

    const close = () => setAuthModal(false);
    // Signed in: move on to any missing details (the effect above closes if there are none).
    const signedIn = () => setStep('details');
    // Details done: close, then run what a signed-in user was doing (signed-out flows resume via their intent).
    const finish = () => {
        const action = takeAccountAction();
        close();
        if (action) setTimeout(action, 0);
    };
    const field = (key) => ({ value: form[key], onChange: (e) => setForm(f => ({ ...f, [key]: e.target.value })) });

    const run = async (fn) => {
        setBusy(true); setError(''); setNotice('');
        try { await fn(); } catch (err) {
            console.warn('[sign-in]', err?.code || err);
            setError(friendly(err));
        } finally { setBusy(false); }
    };

    const google = () => run(async () => {
        const user = await signInWithGoogle();
        if (user) signedIn(); // a redirect sign-in leaves the page instead
    });

    const submitEmail = (e) => {
        e?.preventDefault();
        const { email, password, name } = form;
        const legacy = useLegacyStore.getState();
        if (emailMode === 'forgot') {
            return run(async () => {
                await legacy.resetPassword(email.trim());
                setNotice('If there’s an account for that email, a reset link is on its way.');
            });
        }
        if (emailMode === 'signUp' && !name.trim()) return setError('Add your name.');
        return run(async () => {
            if (emailMode === 'signUp') await legacy.signUpWithEmail(email.trim(), password, name.trim());
            else await legacy.signInWithEmail(email.trim(), password);
            signedIn();
        });
    };

    const titles = {
        start: ['Sign in to Newbi', 'One account for passes, giveaways and creator campaigns.'],
        phone: ['Sign in with phone', 'We’ll text you a 6-digit code.'],
        email: emailMode === 'signUp' ? ['Create your account', 'Use your email and a password.']
            : emailMode === 'forgot' ? ['Reset your password', 'We’ll email you a link.']
                : ['Sign in with email', 'Welcome back.'],
        details: ['Almost there', 'Just what this needs, once. It’s saved to your account.'],
    };
    const [title, subtitle] = titles[step];

    return (
        <Sheet
            open={isOpen}
            onClose={close}
            width="sm"
            dismissible
            header={(
                <div className="flex items-start gap-3">
                    {step === 'phone' || step === 'email' ? (
                        <button
                            type="button"
                            onClick={() => { setStep('start'); setError(''); setNotice(''); }}
                            aria-label="Back"
                            className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
                        >
                            <ChevronLeft size={22} />
                        </button>
                    ) : (
                        <img src={newbiIcon} alt="" className="mt-0.5 h-10 w-auto shrink-0" />
                    )}
                    <div className="min-w-0">
                        <h2 className="text-xl font-black tracking-tight">{title}</h2>
                        <p className="mt-0.5 text-[14px] text-gray-500 dark:text-zinc-400">{subtitle}</p>
                    </div>
                </div>
            )}
        >
            <div className="space-y-3 pb-1 pt-2">
                {step === 'start' && (
                    <>
                        <OptionButton icon={<GoogleMark />} onClick={google} loading={busy}>Continue with Google</OptionButton>
                        <OptionButton icon={<Phone size={19} />} onClick={() => { setStep('phone'); setError(''); }}>Continue with phone</OptionButton>
                        <OptionButton icon={<Mail size={19} />} onClick={() => { setStep('email'); setError(''); }}>Continue with email</OptionButton>
                        {isInAppBrowser() && (
                            <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-500">Google sign-in opens in this window and brings you back here.</p>
                        )}
                        <p className="px-1 pt-2 text-[12px] leading-relaxed text-gray-400 dark:text-zinc-500">
                            By continuing you agree to Newbi’s <a href={landingUrl('/terms')} className="underline">Terms</a> and <a href={landingUrl('/privacy')} className="underline">Privacy Policy</a>.
                        </p>
                    </>
                )}

                {step === 'phone' && (
                    <PhoneVerifyField
                        mode="signIn"
                        sendLabel="Get code"
                        onVerified={() => signedIn()}
                    />
                )}

                {step === 'email' && (
                    <form onSubmit={submitEmail} className="space-y-3" noValidate>
                        {emailMode === 'signUp' && <TextInput label="Your name" autoComplete="name" {...field('name')} />}
                        <TextInput label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" {...field('email')} />
                        {emailMode !== 'forgot' && (
                            <TextInput
                                label="Password"
                                type="password"
                                autoComplete={emailMode === 'signUp' ? 'new-password' : 'current-password'}
                                {...field('password')}
                            />
                        )}
                        <Button type="submit" className="w-full" loading={busy} disabled={!form.email.trim() || (emailMode !== 'forgot' && !form.password)}>
                            {emailMode === 'signUp' ? 'Create account' : emailMode === 'forgot' ? 'Send reset link' : 'Sign in'}
                        </Button>
                        <div className="flex items-center justify-between gap-3 px-1 pt-1 text-[14px] font-semibold">
                            {emailMode === 'signIn' ? (
                                <>
                                    <button type="button" className="h-10 text-gray-500 dark:text-zinc-400" onClick={() => { setEmailMode('forgot'); setError(''); }}>Forgot password?</button>
                                    <button type="button" className="h-10 text-emerald-700 dark:text-neon-green" onClick={() => { setEmailMode('signUp'); setError(''); }}>Create account</button>
                                </>
                            ) : (
                                <button type="button" className="h-10 text-emerald-700 dark:text-neon-green" onClick={() => { setEmailMode('signIn'); setError(''); setNotice(''); }}>I have an account</button>
                            )}
                        </div>
                    </form>
                )}

                {step === 'details' && (
                    detailFields
                        ? <ProfileDetailsForm fields={detailFields} onSaved={finish} />
                        : <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.05]" />
                )}

                {notice && <p role="status" className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-[14px] font-medium text-emerald-800 dark:text-neon-green">{notice}</p>}
                {error && <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-[14px] font-medium text-red-700 dark:text-red-400">{error}</p>}
            </div>
        </Sheet>
    );
};

export default SignInSheet;
