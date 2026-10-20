import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Users from 'lucide-react/dist/esm/icons/users';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Handshake from 'lucide-react/dist/esm/icons/handshake';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check';
import UserRound from 'lucide-react/dist/esm/icons/user-round';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import { useStore as useLegacyStore } from '../../../lib/store.js';
import { Button, Field, Section, Sheet, TextInput, hasContent } from '../../../components/app';
import { CREATOR_NICHE_OPTIONS, COLLAB_OPTIONS } from '../../../lib/creator/options';
import { appPath } from '../../host';
import { callCreatorApi } from '../api';
import { compactCount, handleOf } from '../format';
import { ChoiceChip, FormBlock, Notice } from '../ui';
import JoinCommunitySheet from '../../community/JoinCommunitySheet';
import CompleteProfileSheet from '../../profile/CompleteProfileSheet';
import { CITIES } from '../../community/welcomeForm';
import DetailsStep, { validateDetails } from '../apply/DetailsStep';
import { oauthErrorMessage } from '../apply/instagramCopy';
import { useT } from '../../../i18n';

/*
 * Profile: contact details are the account's own (the same "Edit profile"
 * sheet as /profile, opened here); city, Instagram and the creator fields are
 * edited in one sheet and saved through the server, which keeps the review
 * status as it is (a new Instagram username is checked again). At the bottom, the creator can delete their
 * creator profile (the server's creator-self-delete); the account stays.
 */

/* A titled list of Fields; hidden when none of them has a value, unless `always`. */
const FieldCard = ({ title, action, always, children }) => (
    <Section title={title} action={action} when={always || hasContent(children)}>
        <div className="divide-y divide-black/[0.05] rounded-3xl border border-black/[0.06] bg-white px-4 dark:divide-white/[0.06] dark:border-white/[0.07] dark:bg-[#0c0e14]">{children}</div>
    </Section>
);

const nichesOf = (c) => {
    const list = Array.isArray(c.niches) && c.niches.length ? c.niches : Array.isArray(c.specializations) && c.specializations.length ? c.specializations : [c.categories].filter(Boolean);
    return list.filter(id => CREATOR_NICHE_OPTIONS.some(n => n.id === id)).slice(0, 3);
};
const nicheLabel = (c) => {
    const labels = nichesOf(c).map(id => (id === 'Others' ? c.customNiche : CREATOR_NICHE_OPTIONS.find(n => n.id === id)?.label)).filter(Boolean);
    return labels.length ? labels.join(', ') : (c.categories || null);
};

const detailsFrom = (c) => ({
    niches: nichesOf(c),
    customNiche: c.customNiche || '',
    cityPageFocus: c.cityPageFocus || '',
    collegeName: c.collegeName || '',
    collaboration: COLLAB_OPTIONS.some(o => o.id === c.doBarter) ? c.doBarter : 'both',
    commercials: c.commercials || '',
    bio: c.bio || '',
    linkedin: c.linkedin || '',
    youtube: c.youtube || '',
    twitter: c.twitter || '',
});

const InstagramSection = ({ creator, settings }) => {
    const t = useT();
    const [params, setParams] = useSearchParams();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const handle = handleOf(creator.instagram);

    useEffect(() => {
        const ig = params.get('ig');
        if (!ig) return;
        setMessage(ig !== 'connected'
            ? { tone: 'error', text: oauthErrorMessage(params.get('reason'), params.get('handle')) }
            : params.get('approved')
                ? { tone: 'success', text: t('Instagram connected, and you’re verified. Your creator profile is live.') }
                : { tone: 'success', text: t('Instagram connected. Your follower count now comes straight from Instagram.') });
        const next = new URLSearchParams(params);
        ['ig', 'reason', 'handle', 'approved'].forEach(k => next.delete(k));
        setParams(next, { replace: true });
        // eslint-disable-next-line
    }, [params]);

    const connect = async () => {
        setBusy(true);
        const res = await callCreatorApi('ig-connect', { handle, returnTo: appPath('/creator/profile'), origin: window.location.origin });
        if (res.ok && res.data?.url) return window.location.assign(res.data.url);
        setBusy(false);
        setMessage({ tone: 'error', text: res.error });
        return undefined;
    };

    return (
        <div className="space-y-2">
            <FieldCard title="Instagram">
                <Field label={t('Account')} icon={Instagram} value={handle ? `@${handle}` : null} href={handle ? `https://instagram.com/${handle}` : undefined} />
                <Field label={t('Followers')} icon={Users} value={compactCount(creator.instagramFollowers)} />
                <Field label={t('Verified')} icon={BadgeCheck} value={creator.instagramVerified ? (creator.instagramVerifiedVia === 'oauth' ? t('Connected with Instagram') : t('Checked by Newbi')) : null} />
            </FieldCard>
            {message && <Notice tone={message.tone}>{message.text}</Notice>}
            {settings?.metaVerification && creator.instagramVerifiedVia !== 'oauth' && (
                <div className="space-y-2">
                    <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">{t('Connect a Professional (Creator or Business) account so brands see your real follower count.')}</p>
                    <Button variant="secondary" icon={Instagram} loading={busy} onClick={connect}>{t('Connect Instagram')}</Button>
                </div>
            )}
        </div>
    );
};

/* Deletes the creator profile after a confirm sheet that says what goes and what stays. */
const DeleteCreatorProfile = () => {
    const t = useT();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const remove = async () => {
        setBusy(true);
        setError(null);
        const res = await callCreatorApi('creator-self-delete');
        setBusy(false);
        if (!res.ok) return setError(res.error);
        setOpen(false);
        useLegacyStore.getState().addToast?.(t('Your account and passes are still here.'), 'success', { title: t('Creator profile deleted') });
        navigate(appPath('/profile'), { replace: true });
        return undefined;
    };

    return (
        <>
            <div className="space-y-2 border-t border-black/[0.06] pt-6 dark:border-white/[0.08]">
                <Button variant="danger" icon={Trash2} onClick={() => { setError(null); setOpen(true); }}>{t('Delete creator profile')}</Button>
                <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">{t('Your Newbi account, passes and tickets stay. You can apply again later.')}</p>
            </div>
            <Sheet
                open={open}
                onClose={() => !busy && setOpen(false)}
                title={t('Delete your creator profile?')}
                subtitle={t('This can’t be undone.')}
                footer={(
                    <div className="space-y-2">
                        {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                        <Button className="w-full" variant="danger" icon={Trash2} loading={busy} onClick={remove}>{t('Delete creator profile')}</Button>
                        <Button className="w-full" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>{t('Keep it')}</Button>
                    </div>
                )}
            >
                <ul className="list-disc space-y-2 pb-2 pl-5 text-[15px] text-gray-700 dark:text-zinc-300">
                    <li>{t('Your Newbi ID, niches, rates, bio and campaign applications go.')}</li>
                    <li>{t('Your Instagram is unlinked, so its verification goes too.')}</li>
                    <li>{t('Your account, guestlist passes and tickets stay.')}</li>
                </ul>
            </Sheet>
        </>
    );
};

const ProfileTab = ({ creator, profile, settings }) => {
    const t = useT();
    const [editing, setEditing] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [phoneOpen, setPhoneOpen] = useState(false);
    const [details, setDetails] = useState(() => detailsFrom(creator));
    const [city, setCity] = useState('');
    const [otherCity, setOtherCity] = useState(false);
    const [handle, setHandle] = useState('');
    const [fieldError, setFieldError] = useState(null);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const currentHandle = handleOf(creator.instagram) || '';

    const openEdit = () => {
        const c = profile?.city || creator.city || '';
        setDetails(detailsFrom(creator));
        setCity(c);
        setOtherCity(Boolean(c) && !CITIES.includes(c));
        setHandle(currentHandle);
        setFieldError(null);
        setError(null);
        setEditing(true);
    };

    const save = async () => {
        const cleanHandle = handle.trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '');
        const invalid = !city.trim() ? { field: 'city', error: t('Add your city.') }
            : !cleanHandle ? { field: 'handle', error: t('Add your Instagram username.') }
                : validateDetails(details, profile?.college);
        setFieldError(invalid);
        if (invalid) return;
        setSaving(true);
        const res = await callCreatorApi('creator-apply', { ...details, city: city.trim(), handle: cleanHandle });
        setSaving(false);
        if (!res.ok) {
            if (res.code === 'connect_required') setError(t('To use a new Instagram account, connect it with "Connect Instagram" on this page.'));
            else if (res.field) setFieldError({ field: res.field, error: res.error });
            else setError(res.error);
            return;
        }
        // The creator and profile listeners pick up the change.
        setEditing(false);
    };

    const cityChoices = city && !CITIES.includes(city) && !otherCity ? [city, ...CITIES] : CITIES;
    const fieldNote = (field) => (fieldError?.field === field ? <p role="alert" className="px-1 text-[13px] font-medium text-red-600 dark:text-red-400">{fieldError.error}</p> : null);

    const collabLabel = COLLAB_OPTIONS.find(o => o.id === creator.doBarter)?.label;
    const collab = collabLabel ? t(collabLabel) : null;

    return (
        <div className="space-y-6">
            <FieldCard title={t('Contact')} always action={<Button variant="ghost" size="sm" onClick={() => setContactOpen(true)}>{t('Edit')}</Button>}>
                <Field label={t('Name')} icon={UserRound} value={profile?.name || creator.name} />
                <Field label={t('Email')} icon={Mail} value={profile?.email || creator.email} />
                <Field label={t('Phone')} icon={Phone} value={profile?.phone || creator.phone} />
                <Field label={t('City')} icon={MapPin} value={profile?.city || creator.city} />
            </FieldCard>
            <div className="-mt-3 px-1">
                <Button variant="ghost" size="sm" icon={Smartphone} onClick={() => setPhoneOpen(true)}>
                    {profile?.phoneVerified ? t('Change phone number') : t('Verify phone number')}
                </Button>
            </div>

            <InstagramSection creator={creator} settings={settings} />

            <FieldCard title={t('Creator details')} always action={<Button variant="ghost" size="sm" onClick={openEdit}>{t('Edit')}</Button>}>
                <Field label={t('Niche')} icon={Sparkles} value={nicheLabel(creator)} />
                <Field label={t('College')} icon={GraduationCap} value={creator.collegeName} />
                <Field label={t('Works on')} icon={Handshake} value={collab} />
                <Field label={t('Rate')} icon={IndianRupee} value={creator.commercials} />
                <Field label={t('About')} value={creator.bio} valueClassName="font-medium" />
                <Field label="YouTube" value={creator.youtube ? `@${String(creator.youtube).replace(/^@/, '')}` : null} href={creator.youtube ? `https://youtube.com/@${String(creator.youtube).replace(/^@/, '')}` : undefined} />
                <Field label="LinkedIn" value={creator.linkedin || null} href={creator.linkedin ? `https://www.linkedin.com/in/${creator.linkedin}` : undefined} />
                <Field label="X" value={creator.twitter ? `@${String(creator.twitter).replace(/^@/, '')}` : null} href={creator.twitter ? `https://x.com/${String(creator.twitter).replace(/^@/, '')}` : undefined} />
            </FieldCard>
            {(!creator.bio || !creator.commercials) && (
                <button type="button" onClick={openEdit} className="flex w-full items-center justify-between gap-3 rounded-3xl border border-dashed border-black/[0.12] px-5 py-4 text-left dark:border-white/[0.12]">
                    <span>
                        <span className="block text-[15px] font-bold">{t('Add your rates and bio')}</span>
                        <span className="block text-[13px] text-gray-500 dark:text-zinc-400">{t('Brands use them to pick creators. Takes a minute.')}</span>
                    </span>
                    <span className="shrink-0 text-[14px] font-bold text-emerald-700 dark:text-neon-green">{t('Add')}</span>
                </button>
            )}

            <DeleteCreatorProfile />

            <Sheet
                open={editing}
                onClose={() => setEditing(false)}
                title={t('Creator details')}
                size="full"
                footer={(
                    <div className="space-y-2">
                        {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                        <Button className="w-full" loading={saving} onClick={save}>{t('Save')}</Button>
                    </div>
                )}
            >
                <div className="space-y-6">
                    <FormBlock label={t('Your city')}>
                        <div className="flex flex-wrap gap-2">
                            {cityChoices.map(c => (
                                <ChoiceChip key={c} selected={city === c && !otherCity} onClick={() => { setOtherCity(false); setCity(c); }} className="py-2">{c}</ChoiceChip>
                            ))}
                            <ChoiceChip selected={otherCity} onClick={() => { setOtherCity(true); setCity(''); }} className="py-2">{t('Other')}</ChoiceChip>
                        </div>
                        {otherCity && <TextInput label={t('City')} value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('e.g. Mysuru')} autoComplete="address-level2" />}
                        {fieldNote('city')}
                    </FormBlock>
                    <FormBlock label={t('Instagram username')} hint={handle.replace(/^@+/, '').trim() !== currentHandle ? t('A new username is checked again: followers and verification come from the new account.') : null}>
                        <TextInput value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                        {fieldNote('handle')}
                    </FormBlock>
                    <DetailsStep details={details} setDetails={setDetails} profileCollege={profile?.college} fieldError={fieldError} />
                </div>
            </Sheet>

            <JoinCommunitySheet mode="edit" open={contactOpen} onClose={() => setContactOpen(false)} />
            <CompleteProfileSheet
                open={phoneOpen}
                onClose={() => setPhoneOpen(false)}
                required={['phoneVerified']}
                editAll
                title={profile?.phoneVerified ? t('Change phone number') : t('Verify phone number')}
            />
        </div>
    );
};

export default ProfileTab;
