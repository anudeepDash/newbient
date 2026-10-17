import React, { useMemo, useState } from 'react';
import { Button, TextInput } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { fieldLabel } from './requirements';
import PhoneVerifyField from '../auth/PhoneVerifyField';
import AccountMergeFlow from '../auth/AccountMergeFlow';
import { findOtherAccounts } from '../auth/accountMerge';

/*
 * The profile fields a flow still needs (name, city, college, verified phone),
 * and their save. Used by the account sheet's details step and by
 * CompleteProfileSheet, so both ask the same way. An email that's already on
 * another Newbi account isn't saved as a second one: that account is merged
 * into this one instead (AccountMergeFlow), as with phone numbers.
 *
 *   <ProfileDetailsForm fields={['name', 'phoneVerified']} onSaved={next} />
 */

const TEXT_FIELDS = {
    name: { autoComplete: 'name', placeholder: 'Full name' },
    city: { autoComplete: 'address-level2', placeholder: 'e.g. Bengaluru' },
    college: { autoComplete: 'organization', placeholder: 'Your college' },
};

const ProfileDetailsForm = ({ fields = [], onSaved, submitLabel = 'Continue', editAll = false, footer }) => {
    const profile = useAppStore(s => s.profile);
    const updateProfile = useAppStore(s => s.updateProfile);
    const savePhoneVerified = useAppStore(s => s.savePhoneVerified);

    const [values, setValues] = useState(() => ({ name: profile?.name || '', city: profile?.city || '', college: profile?.college || '', email: profile?.email || '' }));
    const [phoneDone, setPhoneDone] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [emailMatch, setEmailMatch] = useState(null);

    const needsPhone = fields.includes('phoneVerified') || fields.includes('phone');
    const textFields = useMemo(() => fields.filter(f => TEXT_FIELDS[f]), [fields]);
    const needsEmail = fields.includes('email');

    const save = async () => {
        // When editing, only the name can't be cleared.
        const blank = textFields.find(f => (!editAll || f === 'name') && !String(values[f] || '').trim());
        if (blank) return setError(`Add your ${fieldLabel(blank).toLowerCase()}.`);
        const email = String(values.email || '').trim();
        if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setError('Add a valid email address.');
        if (needsPhone && !phoneDone) return setError('Verify your phone number to continue.');
        setSaving(true);
        setError('');
        try {
            if (needsEmail && email.toLowerCase() !== (profile?.email || '').toLowerCase()) {
                const match = (await findOtherAccounts(email)).find(m => m.matchedBy?.includes('email'));
                if (match) return setEmailMatch(match);
            }
            const patch = Object.fromEntries(textFields.map(f => [f, String(values[f] || '').trim()]));
            if (needsEmail) patch.email = email.toLowerCase();
            if (Object.keys(patch).length) await updateProfile(patch);
            onSaved?.();
        } catch (err) {
            console.warn('[profile] save failed:', err);
            setError('We couldn’t save your details. Check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    const button = <Button className="w-full" size="lg" onClick={save} loading={saving}>{submitLabel}</Button>;

    if (emailMatch) {
        return (
            <div className="space-y-4">
                <p className="text-[15px] font-bold leading-snug">{String(values.email).trim()} is on another Newbi account</p>
                <AccountMergeFlow
                    match={emailMatch}
                    email={String(values.email).trim()}
                    onDone={() => { setEmailMatch(null); save(); }}
                    onCancel={() => { setEmailMatch(null); setError('That email is on another account. Merge it, or use a different email.'); }}
                    cancelLabel="Use a different email"
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {textFields.map(f => (
                <TextInput
                    key={f}
                    label={fieldLabel(f)}
                    value={values[f] || ''}
                    onChange={(e) => setValues(v => ({ ...v, [f]: e.target.value }))}
                    autoFocus={f === textFields[0]}
                    {...TEXT_FIELDS[f]}
                />
            ))}

            {needsEmail && (
                // Phone sign-ins have no email; this is where updates and tickets go.
                <TextInput
                    label="Email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    placeholder="you@example.com"
                    hint="For campaign updates and tickets."
                    value={values.email}
                    onChange={(e) => setValues(v => ({ ...v, email: e.target.value }))}
                    autoFocus={!textFields.length}
                />
            )}

            {needsPhone && (
                <PhoneVerifyField
                    initialPhone={profile?.phone || ''}
                    onVerified={async (e164, result) => {
                        // Test mode (local dev) never writes the number.
                        if (!result?.testMode) await savePhoneVerified(e164);
                        setPhoneDone(true);
                        setError('');
                    }}
                />
            )}

            {fields.length === 0 && (
                <p className="text-[15px] text-gray-600 dark:text-zinc-400">Your profile has everything this needs.</p>
            )}

            {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
            {footer ? footer(button) : button}
        </div>
    );
};

export default ProfileDetailsForm;
