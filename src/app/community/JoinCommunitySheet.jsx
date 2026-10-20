import React, { useEffect, useState } from 'react';
import { Sheet, Button, TextInput } from '../../components/app';
import { ChoiceChip, FormBlock } from '../creator/ui';
import { useAppStore } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { isPresent } from '../../lib/present';
import { CITIES, INTERESTS, GENDERS } from './welcomeForm';
import { useT } from '../../i18n';

/*
 * The community welcome form (it replaces the old "NewBi Welcoming Form"
 * Google Form): student or not, college, city, gender, Instagram and what
 * you're into. Fields already on the profile come filled in. Saving fills the
 * profile and joins the community in one go. Creators apply through the
 * creator form instead; this doesn't ask creator questions.
 *
 * mode="edit" is the Profile page's "Edit profile": the same questions plus
 * your name, saved without joining anything, and only the name is required.
 *
 *   <JoinCommunitySheet open={open} onClose={close} />
 *   <JoinCommunitySheet mode="edit" open={open} onClose={close} />
 */

const initialValues = (profile) => ({
    name: profile?.name || '',
    student: typeof profile?.isStudent === 'boolean' ? profile.isStudent : null,
    college: profile?.college || '',
    occupation: profile?.occupation || '',
    city: profile?.city || '',
    gender: profile?.gender || '',
    instagram: '',
    interests: Array.isArray(profile?.interests) ? profile.interests : [],
});

const JoinCommunitySheet = ({ open, onClose, onJoined, mode = 'join' }) => {
    const t = useT();
    const editing = mode === 'edit';
    const profile = useAppStore(s => s.profile);
    const updateProfile = useAppStore(s => s.updateProfile);
    const joinCommunity = useAppStore(s => s.joinCommunity);

    const [v, setV] = useState(() => initialValues(profile));
    const [otherCity, setOtherCity] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Fresh from the profile each time the sheet opens.
    useEffect(() => {
        if (!open) return;
        const next = initialValues(profile);
        setV(next);
        setOtherCity(Boolean(next.city) && !CITIES.includes(next.city));
        setError('');
        // Only on open.
        // eslint-disable-next-line
    }, [open]);

    const set = (patch) => { setV(s => ({ ...s, ...patch })); setError(''); };
    const toggleInterest = (id) => set({ interests: v.interests.includes(id) ? v.interests.filter(i => i !== id) : [...v.interests, id] });
    // Asked only when the profile has no Instagram yet (the creator flow owns an existing one).
    const igLocked = isPresent(profile?.instagram?.handle);

    const save = async () => {
        if (editing && !v.name.trim()) return setError(t('Add your name.'));
        if (!editing && v.student === null) return setError(t('Tell us if you’re a student.'));
        if (v.student && !v.college.trim()) return setError(t('Add your college.'));
        if (!editing && !v.city.trim()) return setError(t('Add your city.'));
        if (!editing && !v.interests.length) return setError(t('Pick at least one thing you’re into.'));
        setSaving(true);
        setError('');
        try {
            await updateProfile({
                ...(editing ? { name: v.name.trim() } : {}),
                ...(v.student === null ? {} : { isStudent: v.student }),
                ...(v.student === true ? { college: v.college.trim() } : {}),
                ...(v.student === false ? { college: '', occupation: v.occupation.trim() } : {}),
                city: v.city.trim(),
                gender: v.gender,
                interests: v.interests,
                ...(igLocked ? {} : { instagramHandle: v.instagram.trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '') }),
            });
            if (editing) {
                useLegacyStore.getState().addToast?.(t('Profile saved.'), 'success');
            } else {
                await joinCommunity();
                useLegacyStore.getState().addToast?.(t('Guestlists, gigs and giveaways are open to you.'), 'success', { title: t('You’re in') });
                onJoined?.();
            }
            onClose?.();
        } catch (err) {
            console.warn(`[profile] ${editing ? 'save' : 'join'} failed:`, err);
            setError(editing ? t('We couldn’t save your profile. Check your connection and try again.') : t('We couldn’t add you just now. Check your connection and try again.'));
        } finally {
            setSaving(false);
        }
    };

    const cityChoices = v.city && !CITIES.includes(v.city) && !otherCity ? [v.city, ...CITIES] : CITIES;

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={editing ? t('Edit profile') : t('Join the community')}
            subtitle={editing ? t('Used for every pass, giveaway and application.') : t('A few details so we bring the right guestlists, gigs and giveaways to you.')}
            footer={(
                <div className="space-y-2">
                    {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                    <Button className="w-full" size="lg" onClick={save} loading={saving}>{editing ? t('Save') : t('Join')}</Button>
                </div>
            )}
        >
            <div className="space-y-6 pb-2">
                {editing && (
                    <TextInput label={t('Your name')} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('Full name')} autoComplete="name" />
                )}
                <FormBlock label={t('Are you a student?')}>
                    <div className="flex flex-wrap gap-2">
                        <ChoiceChip selected={v.student === true} onClick={() => set({ student: true })}>{t('Yes, in college')}</ChoiceChip>
                        <ChoiceChip selected={v.student === false} onClick={() => set({ student: false })}>{t('No')}</ChoiceChip>
                    </div>
                </FormBlock>

                {v.student === true && (
                    <TextInput label={t('Your college')} value={v.college} onChange={(e) => set({ college: e.target.value })} placeholder={t('e.g. Christ University')} autoComplete="organization" />
                )}
                {v.student === false && (
                    <TextInput label={t('What do you do? (optional)')} value={v.occupation} onChange={(e) => set({ occupation: e.target.value })} placeholder={t('e.g. Designer, working at a startup')} autoComplete="organization-title" />
                )}

                <FormBlock label={t('Your city')}>
                    <div className="flex flex-wrap gap-2">
                        {cityChoices.map(c => (
                            <ChoiceChip key={c} selected={v.city === c && !otherCity} onClick={() => { setOtherCity(false); set({ city: c }); }} className="py-2">{t(c)}</ChoiceChip>
                        ))}
                        <ChoiceChip selected={otherCity} onClick={() => { setOtherCity(true); set({ city: '' }); }} className="py-2">{t('Other')}</ChoiceChip>
                    </div>
                    {otherCity && (
                        <TextInput label={t('City')} value={v.city} onChange={(e) => set({ city: e.target.value })} placeholder={t('e.g. Mysuru')} autoComplete="address-level2" autoFocus />
                    )}
                </FormBlock>

                <FormBlock label={t('What are you into?')} hint={t('Pick as many as you like.')}>
                    <div className="flex flex-wrap gap-2">
                        {INTERESTS.map(i => (
                            <ChoiceChip key={i.id} selected={v.interests.includes(i.id)} onClick={() => toggleInterest(i.id)} className="py-2">{t(i.label)}</ChoiceChip>
                        ))}
                    </div>
                </FormBlock>

                <FormBlock label={t('Gender (optional)')}>
                    <div className="flex flex-wrap gap-2">
                        {GENDERS.map(g => (
                            <ChoiceChip key={g} selected={v.gender === g} onClick={() => set({ gender: v.gender === g ? '' : g })} className="py-2">{t(g)}</ChoiceChip>
                        ))}
                    </div>
                </FormBlock>

                {!igLocked && (
                    <TextInput
                        label={t('Instagram (optional)')}
                        value={v.instagram}
                        onChange={(e) => set({ instagram: e.target.value })}
                        placeholder="@yourhandle"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                )}
            </div>
        </Sheet>
    );
};

export default JoinCommunitySheet;
