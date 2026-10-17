import React, { useState } from 'react';
import { Button, TextInput } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { isInAppBrowser } from '../../lib/platform';
import { proveWithGoogle, proveWithPassword, previewMerge } from './accountMerge';
import MergeConfirm from './MergeConfirm';
import PhoneVerifyField from './PhoneVerifyField';

/*
 * Merging an account found by account-matches (same phone or email): the
 * person signs in to it once, the way it signs in (Google, password or a phone
 * code), then confirms the merge.
 *
 *   <AccountMergeFlow match={match} email={typedEmail} onDone={…} onCancel={…} />
 */
const AccountMergeFlow = ({ match, email = '', onDone, onCancel, cancelLabel = 'Not now' }) => {
    const profile = useAppStore(s => s.profile);
    const [step, setStep] = useState(null); // { proof, preview }
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [loginEmail, setLoginEmail] = useState(email || '');
    const { methods = {} } = match || {};
    const name = (match?.name || '').trim();
    const inApp = isInAppBrowser();

    const run = async (kind, signIn) => {
        setBusy(kind);
        setError('');
        try {
            const proof = await signIn();
            // The confirm step names the account they signed in to, whichever it was.
            setStep({ proof, preview: await previewMerge(proof) });
        } catch (err) {
            if (err?.friendly !== '') setError(err?.friendly || 'We couldn’t sign in to that account. Please try again.');
        } finally {
            setBusy('');
        }
    };

    if (step) {
        return (
            <MergeConfirm
                proof={step.proof}
                preview={step.preview}
                what={match.matchedBy?.includes('phone') ? 'Your number' : 'This email'}
                onMerged={onDone}
                onCancel={onCancel}
                cancelLabel={cancelLabel}
            />
        );
    }

    const ways = [
        methods.google && `Google (${methods.google})`,
        methods.password && `email and password (${methods.password})`,
        methods.phone && `phone (${methods.phone})`,
    ].filter(Boolean);

    return (
        <div className="space-y-4">
            <p className="text-[14px] leading-snug text-gray-600 dark:text-zinc-400">
                Your other account{name ? ` (${name})` : ''} signs in with {ways.join(' or ') || 'another method'}.
                Sign in to it once here to show it's yours; you stay signed in to this one.
            </p>

            {methods.google && (
                <div className="space-y-2">
                    <Button className="w-full" variant="secondary" onClick={() => run('google', proveWithGoogle)} loading={busy === 'google'} disabled={inApp || Boolean(busy)}>
                        Confirm with Google
                    </Button>
                    {inApp && <p className="text-[13px] text-gray-500 dark:text-zinc-400">Open this page in your browser (Safari or Chrome) to confirm with Google.</p>}
                </div>
            )}

            {methods.password && (
                <div className="space-y-2">
                    <TextInput label="Email" type="email" autoComplete="username" autoCapitalize="none" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                    <TextInput label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button
                        className="w-full"
                        variant="secondary"
                        onClick={() => run('password', () => proveWithPassword(loginEmail.trim(), password))}
                        loading={busy === 'password'}
                        disabled={!loginEmail.trim() || !password || Boolean(busy)}
                    >
                        Confirm with password
                    </Button>
                </div>
            )}

            {methods.phone && (
                // The code proves the number; since it signs in to the other account, the field turns into the merge step.
                <PhoneVerifyField
                    initialPhone={match.phoneIsYours ? profile?.phone || '' : ''}
                    label={match.phoneIsYours ? 'Your number' : `Its number (${methods.phone})`}
                    onVerified={(e164, result) => onDone?.(result?.merged || result)}
                />
            )}

            {error && <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}

            {onCancel && (
                <button type="button" onClick={onCancel} className="h-10 text-[13px] font-semibold text-gray-500 underline-offset-2 hover:underline dark:text-zinc-400">
                    {cancelLabel}
                </button>
            )}
        </div>
    );
};

export default AccountMergeFlow;
