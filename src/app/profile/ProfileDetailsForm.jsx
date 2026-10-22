import React, { useMemo, useState } from 'react';
import { Button, TextInput } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { fieldLabel } from './requirements';
import PhoneVerifyField from '../auth/PhoneVerifyField';
import AccountMergeFlow from '../auth/AccountMergeFlow';
import { findOtherAccounts } from '../auth/accountMerge';
import { saveProfilePhone } from '../../lib/profilePhone';
import { toE164 } from '../../lib/store/profile';
import { useT } from '../../i18n';

/*
 * The profile fields a flow still needs (name, city, college, phone), and
 * their save. Used by the account sheet's details step and by
 * CompleteProfileSheet, so both ask the same way. `phoneVerified` asks for the
 * number with an SMS code; `phone` just asks for it (guestlists, gigs). An
 * email or number that's already on another Newbi account isn't saved as a
 * second one: that account is merged into this one instead (AccountMergeFlow).
 *
 *   <ProfileDetailsForm fields={['name', 'phoneVerified']} onSaved={next} />
 */

const TEXT_FIELDS = {
    name: { autoComplete: 'name', placeholder: 'Full name' },
    city: { autoComplete: 'address-level2', placeholder: 'e.g. Bengaluru' },
    college: { autoComplete: 'organization', placeholder: 'Your college' },
};

const ProfileDetailsForm = ({ fields = [], onSaved, submitLabel = 'Continue', editAll = false, footer }) => {
    const t = useT();
    const profile = useAppStore(s => s.profile);
    const updateProfile = useAppStore(s => s.updateProfile);
    const savePhoneVerified = useAppStore(s => s.savePhoneVerified);

    const [values, setValues] = useState(() => ({ name: profile?.name || '', city: profile?.city || '', college: profile?.college || '', email: profile?.email || '', phone: profile?.phone || '' }));
    const [phoneDone, setPhoneDone] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [emailMatch, setEmailMatch] = useState(null);

    // An SMS code only where the flow needs a proven number; otherwise the number is just typed.
    const needsPhone = fields.includes('phoneVerified');
    const needsPlainPhone = !needsPhone && fields.includes('phone');
    const textFields = useMemo(() => fields.filter(f => TEXT_FIELDS[f]), [fields]);
    const needsEmail = fields.includes('email');

    const save = async () => {
        // When editing, only the name can't be cleared.
        const blank = textFields.find(f => (!editAll || f === 'name') && !String(values[f] || '').trim());
        if (blank) return setError(t('Add your {field}.', { field: fieldLabel(blank).toLowerCase().replace(/^your /, '') }));
        const email = String(values.email || '').trim();
        if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setError(t('Add a valid email address.'));
        if (needsPhone && !phoneDone) return setError(t('Verify your phone number to continue.'));
        const phone = needsPlainPhone ? toE164(values.phone) : null;
        if (needsPlainPhone && (!phone || phone.replace(/\D/g, '').length < 10)) return setError(t('Add your phone number.'));
        setSaving(true);
        setError('');
        try {
            if (needsEmail && email.toLowerCase() !== (profile?.email || '').toLowerCase()) {
                const match = (await findOtherAccounts(email)).find(m => m.matchedBy?.includes('email'));
                if (match) return setEmailMatch(match);
            }
            if (needsPlainPhone && phone !== toE164(profile?.phone)) {
                const match = (await findOtherAccounts('', phone)).find(m => m.matchedBy?.includes('phone'));
                if (match) return setEmailMatch(match);
                await saveProfilePhone(phone);
            }
            const patch = Object.fromEntries(textFields.map(f => [f, String(values[f] || '').trim()]));
            if (needsEmail) patch.email = email.toLowerCase();
            if (Object.keys(patch).length) await updateProfile(patch);
            onSaved?.();
        } catch (err) {
            console.warn('[profile] save failed:', err);
            setError(t('We couldn’t save your details. Check your connection and try again.'));
        } finally {
            setSaving(false);
        }
    };

    const button = <Button className="w-full" size="lg" onClick={save} loading={saving}>{t(submitLabel)}</Button>;

    if (emailMatch) {
        return (
            <div className="space-y-4">
                <p className="text-[15px] font-bold leading-snug">{t('{email} is on another Newbi account', { email: emailMatch.matchedBy?.includes('email') ? String(values.email).trim() : String(values.phone).trim() })}</p>
                <AccountMergeFlow
                    match={emailMatch}
                    email={String(values.email).trim()}
                    onDone={() => { setEmailMatch(null); save(); }}
                    onCancel={() => {
                        const byEmail = emailMatch.matchedBy?.includes('email');
                        setEmailMatch(null);
                        setError(byEmail ? t('That email is on another account. Merge it, or use a different email.') : t('That number is on another account. Merge it, or use a different number.'));
                    }}
                    cancelLabel={emailMatch.matchedBy?.includes('email') ? t('Use a different email') : t('Use a different number')}
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
                    placeholder={t(TEXT_FIELDS[f].placeholder)}
                />
            ))}

            {needsEmail && (
                // Phone sign-ins have no email; this is where updates and tickets go.
                <TextInput
                    label={t('Email')}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    placeholder="you@example.com"
                    hint={t('For campaign updates and tickets.')}
                    value={values.email}
                    onChange={(e) => setValues(v => ({ ...v, email: e.target.value }))}
                    autoFocus={!textFields.length}
                />
            )}

            {needsPlainPhone && (
                // Where your pass and updates go on WhatsApp. No SMS code.
                <TextInput
                    label={t('Phone number')}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="98765 43210"
                    hint={t('Your pass comes here on WhatsApp.')}
                    value={values.phone}
                    onChange={(e) => setValues(v => ({ ...v, phone: e.target.value }))}
                    autoFocus={!textFields.length && !needsEmail}
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
                <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('Your profile has everything this needs.')}</p>
            )}

            {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
            {footer ? footer(button) : button}
        </div>
    );
};

export default ProfileDetailsForm;
