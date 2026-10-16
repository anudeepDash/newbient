import React, { useEffect, useMemo, useState } from 'react';
import { Sheet, Button, TextInput } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { missingFields, fieldLabel } from './requirements';
import PhoneVerifyField from '../auth/PhoneVerifyField';

/*
 * Asks only for the profile fields a flow still needs, then hands back.
 *
 *   <CompleteProfileSheet
 *     open={open}
 *     required={requirementsFor('guestlist')}
 *     reason="to get on the guestlist"
 *     onComplete={() => register()}
 *     onClose={() => setOpen(false)}
 *   />
 *
 * Fields: name, email (read-only from sign-in, asked only if missing), city,
 * college (free text until Phase 7's CollegePicker) and verified phone.
 * With editAll it shows every listed field, for editing.
 */

const TEXT_FIELDS = {
    name: { autoComplete: 'name', placeholder: 'Full name' },
    city: { autoComplete: 'address-level2', placeholder: 'e.g. Bengaluru' },
    college: { autoComplete: 'organization', placeholder: 'Your college' },
};

const CompleteProfileSheet = ({ open, onClose, onComplete, required = [], reason, title = 'A few details first', editAll = false }) => {
    const profile = useAppStore(s => s.profile);
    const updateProfile = useAppStore(s => s.updateProfile);
    const savePhoneVerified = useAppStore(s => s.savePhoneVerified);

    // Freeze the list when the sheet opens, so a field doesn't vanish mid-typing.
    const [fields, setFields] = useState([]);
    const [values, setValues] = useState({});
    const [phoneDone, setPhoneDone] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        // editAll shows every listed field (the profile's "Edit details"), not just the missing ones.
        setFields(editAll ? required : missingFields(profile, required));
        setValues({ name: profile?.name || '', city: profile?.city || '', college: profile?.college || '' });
        setPhoneDone(false);
        setError('');
        // Only on open.
        // eslint-disable-next-line
    }, [open]);

    const needsPhone = fields.includes('phoneVerified') || fields.includes('phone');
    const textFields = useMemo(() => fields.filter(f => TEXT_FIELDS[f]), [fields]);
    const needsEmail = fields.includes('email');

    const handleSave = async () => {
        // When editing, only the name can't be cleared.
        const blank = textFields.find(f => (!editAll || f === 'name') && !String(values[f] || '').trim());
        if (blank) return setError(`Add your ${fieldLabel(blank).toLowerCase()}.`);
        if (needsPhone && !phoneDone) return setError('Verify your phone number to continue.');
        setSaving(true);
        setError('');
        try {
            const patch = Object.fromEntries(textFields.map(f => [f, values[f]]));
            if (Object.keys(patch).length) await updateProfile(patch);
            onComplete?.();
            onClose?.();
        } catch (err) {
            console.warn('[profile] save failed:', err);
            setError('We couldn’t save your details. Check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={title}
            subtitle={reason ? `We just need these ${reason}.` : 'We only ask for what’s missing.'}
            footer={<Button className="w-full" onClick={handleSave} loading={saving}>Continue</Button>}
        >
            <div className="space-y-4">
                {textFields.map(f => (
                    <TextInput
                        key={f}
                        label={fieldLabel(f)}
                        value={values[f] || ''}
                        onChange={(e) => setValues(v => ({ ...v, [f]: e.target.value }))}
                        {...TEXT_FIELDS[f]}
                    />
                ))}

                {needsEmail && (
                    <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-[14px] text-amber-800 dark:text-amber-300">
                        Your account has no email yet. Sign in with Google from your profile to add one.
                    </p>
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
            </div>
        </Sheet>
    );
};

export default CompleteProfileSheet;
