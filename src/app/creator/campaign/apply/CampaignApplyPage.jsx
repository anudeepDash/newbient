import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Send from 'lucide-react/dist/esm/icons/send';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import Users from 'lucide-react/dist/esm/icons/users';
import { useAppStore } from '../../../../lib/store/appStore';
import { useAuthGate } from '../../../auth/AuthGate';
import { Button, TextInput, INPUT, ERROR_RING, WhatsAppLogo } from '../../../../components/app';
import { cn } from '../../../../lib/utils';
import GlassSelect from '../../../../components/ui/GlassSelect';
import { isPresent } from '../../../../lib/present';
import useDynamicMeta from '../../../../hooks/useDynamicMeta';
import { PageBody } from '../../../pages/PageHeader';
import { PanelLabel } from '../../../pages/DetailLayout';
import { ChoiceChip, FormBlock, Notice } from '../../ui';
import { callCreatorApi } from '../../api';
import { validateApplication, CATEGORIES, REFERRAL_SOURCES, CONSENT_TEXT, TIERS, minFollowersFor } from '../../../../lib/outreach/application';
import { formatDeadline } from '../../../../lib/outreach/template';
import { useT } from '../../../../i18n';

/*
 * /c/:slug/apply: the open campaign application. Replaces the Google Form.
 *
 * Applying needs a Newbi account (Google or phone, a few seconds), so every
 * update reaches them in the app and as push: their city's creator community
 * right after applying, then the shortlist, the campaign group, their posts
 * page, ticket and payout. Nobody is messaged one by one on WhatsApp.
 *
 * The browser checks fields as you go (same rules as the server), but the
 * server decides: it validates again, rate-limits per network and merges a
 * second application from the same phone or handle into the first.
 */

const BLANK = {
    fullName: '', email: '', phone: '', instagram: '', followerCount: '', collegeOrEmployer: '', city: '',
    category: '', runsCityPages: false, cityPagesHandle: '', registeredNewbiCreator: null, referralSource: '',
    consentWhatsApp: false, website: '',
};

const ORDER = ['fullName', 'phone', 'email', 'instagram', 'followerCount', 'city', 'collegeOrEmployer', 'category', 'cityPagesHandle', 'registeredNewbiCreator', 'consentWhatsApp'];

const CLOSED_COPY = {
    deadline: 'Applications for this campaign have closed.',
    live: 'This campaign is live now, so applications are closed.',
    closed: 'This campaign isn’t taking applications right now.',
};

const perkText = (p) => [p?.cash ? `₹${Number(p.cash).toLocaleString('en-IN')}` : '', p?.pass || ''].filter(Boolean).join(' + ');

const Select = ({ id, value, onChange, error, children, label }) => (
    <label htmlFor={id} className="block space-y-1.5">
        <span className="block px-1 text-[13px] font-bold text-gray-700 dark:text-zinc-300">{label}</span>
        <GlassSelect id={id} value={value} onChange={onChange} aria-label={label} className={cn(INPUT, 'h-[52px] px-4', error && ERROR_RING)}>
            {children}
        </GlassSelect>
        {error && <span className="block px-1 text-[13px] font-medium text-red-600 dark:text-red-400">{error}</span>}
    </label>
);

const CampaignApplyPage = () => {
    const t = useT();
    const { slug } = useParams();
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const gate = useAuthGate();
    const signIn = () => gate.requestSignIn({ type: 'outreach-apply', payload: { slug } });
    const [state, setState] = useState({ loading: true, campaign: null, open: false, reason: null });
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState(false);
    const [sending, setSending] = useState(false);
    const [serverError, setServerError] = useState('');
    const [done, setDone] = useState(null);
    const formRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setState(s => ({ ...s, loading: true }));
        callCreatorApi('outreach-campaign', {}, { method: 'GET', query: { slug } }).then(r => {
            if (cancelled) return;
            if (!r.ok) setState({ loading: false, campaign: null, open: false, reason: null });
            else setState({ loading: false, campaign: r.data.campaign, open: r.data.open, reason: r.data.reason });
        });
        return () => { cancelled = true; };
    }, [slug]);

    const campaign = state.campaign;
    useEffect(() => {
        if (campaign?.cities?.length === 1) setForm(f => (f.city ? f : { ...f, city: campaign.cities[0] }));
    }, [campaign]);

    // What the account already knows fills the empty fields (they can still change it).
    useEffect(() => {
        if (!authUser) return;
        setForm(f => ({
            ...f,
            fullName: f.fullName || profile?.name || authUser.displayName || '',
            email: f.email || profile?.email || authUser.email || '',
            phone: f.phone || profile?.phone || authUser.phoneNumber || '',
        }));
    }, [authUser, profile]);

    useDynamicMeta({ page: 'campaign-apply', title: campaign ? t('Apply: {title}', { title: campaign.title }) : t('Apply'), image: campaign?.image || undefined });

    const set = (key) => (e) => {
        const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
        setForm(f => {
            const next = { ...f, [key]: v };
            // Re-check as they fix things, once they've tried to send.
            if (touched) setErrors(validateApplication({ ...next, registeredNewbiCreator: next.registeredNewbiCreator === true }, campaign).errors);
            return next;
        });
    };

    const submit = async (e) => {
        e.preventDefault();
        setTouched(true);
        setServerError('');
        const local = validateApplication({ ...form, registeredNewbiCreator: form.registeredNewbiCreator === true }, campaign);
        const errs = { ...local.errors };
        if (form.registeredNewbiCreator === null) errs.registeredNewbiCreator = t('Tell us if you’re on Newbi already.');
        setErrors(errs);
        if (Object.keys(errs).length) {
            const first = ORDER.find(k => errs[k]);
            formRef.current?.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setSending(true);
        const r = await callCreatorApi('outreach-apply', { ...form, registeredNewbiCreator: form.registeredNewbiCreator === true, slug });
        setSending(false);
        if (r.ok) {
            setDone({ updated: Boolean(r.data.updated), firstName: local.value.firstName, cityGroup: r.data.cityGroup || null });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (r.code === 'sign_in') { signIn(); return; }
        if (r.code === 'invalid' && r.errors) setErrors(r.errors);
        setServerError(r.error);
    };

    if (state.loading) {
        return (
            <PageBody>
                <div className="mx-auto max-w-xl space-y-4">
                    <div className="h-10 w-2/3 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
                    <div className="h-[28rem] animate-pulse rounded-[2rem] bg-black/[0.04] dark:bg-white/[0.04]" />
                </div>
            </PageBody>
        );
    }

    if (!campaign) {
        return (
            <PageBody>
                <div className="mx-auto max-w-md space-y-3 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                    <p className="text-[17px] font-bold">{t('This application link isn’t active')}</p>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('It may have closed or moved. Check the link you were sent.')}</p>
                </div>
            </PageBody>
        );
    }

    const perks = TIERS.map(tier => ({ tier, text: perkText(campaign.perksByTier?.[tier]) })).filter(p => p.text);
    const err = (k) => (errors[k] ? t(errors[k]) : null);
    const minFollowers = minFollowersFor(campaign);

    const header = (
        <header className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {isPresent(campaign.image) && (
                <img src={campaign.image} alt="" decoding="async" className="aspect-video w-full rounded-3xl border border-black/[0.06] object-cover dark:border-white/[0.08]" />
            )}
            <PanelLabel>{state.open ? t('Creator application') : t('Applications closed')}</PanelLabel>
            <h1 className="font-heading text-[30px] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-[36px] lg:text-[42px]">{campaign.title}</h1>
            <dl className="grid grid-cols-2 gap-3 text-[14px]">
                {[
                    [t('Artist'), campaign.artist],
                    [t('City'), campaign.cities.join(', ')],
                    [t('Event'), formatDeadline(campaign.eventDate)],
                    [t('Apply by'), formatDeadline(campaign.applicationDeadline)],
                    [t('Post by'), formatDeadline(campaign.postingDeadline)],
                ].filter(([, v]) => isPresent(v)).map(([k, v]) => (
                    <div key={k}>
                        <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-500">{k}</dt>
                        <dd className="font-semibold text-gray-900 dark:text-white">{v}</dd>
                    </div>
                ))}
            </dl>
            {isPresent(campaign.deliverablesText) && (
                <div className="space-y-1">
                    <p className="text-[12px] font-semibold text-gray-500 dark:text-zinc-500">{t('What you’ll post')}</p>
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{campaign.deliverablesText}</p>
                </div>
            )}
            {perks.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[12px] font-semibold text-gray-500 dark:text-zinc-500">{t('What you get')}</p>
                    <ul className="space-y-1 text-[15px]">
                        {perks.map(p => <li key={p.tier}><span className="font-bold capitalize">{p.tier}</span> · {p.text}</li>)}
                    </ul>
                </div>
            )}
        </header>
    );

    if (done) {
        return (
            <PageBody>
                <div className="mx-auto max-w-lg space-y-5 py-6 text-center">
                    <CircleCheck size={44} className="mx-auto text-emerald-600 dark:text-neon-green" />
                    <h1 className="font-heading text-[28px] font-extrabold tracking-[-0.03em]">
                        {done.updated ? t('Application updated') : done.firstName ? t('You’re in, {name}!', { name: done.firstName }) : t('You’re in!')}
                    </h1>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">
                        {done.updated
                            ? t('We already had an application from you, so we’ve updated it with these details.')
                            : t('We’ve got your application for {title}. If you’re shortlisted, you’ll see it in your Newbi notifications.', { title: campaign.title })}
                    </p>
                    {done.cityGroup && (
                        <div className="space-y-3 rounded-[1.5rem] bg-white p-5 text-left ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08]">
                            <p className="flex items-center gap-2 text-[16px] font-bold"><Users size={18} /> {t('Join the {city} creators community', { city: done.cityGroup.city })}</p>
                            <p className="text-[14px] text-gray-600 dark:text-zinc-400">{t('Paid gigs, guestlist passes and meetups in {city} drop there first.', { city: done.cityGroup.city })}</p>
                            <Button href={done.cityGroup.url} target="_blank" rel="noopener noreferrer" icon={WhatsAppLogo} className="w-full bg-[#25D366]">{t('Join on WhatsApp')}</Button>
                        </div>
                    )}
                </div>
            </PageBody>
        );
    }

    return (
        <PageBody>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
                {header}
                {!state.open ? (
                    <Notice tone="warn" title={t(CLOSED_COPY[state.reason] || CLOSED_COPY.closed)} />
                ) : !authUser ? (
                    <div className="space-y-4 rounded-[2rem] bg-white p-6 ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08]">
                        <p className="text-[18px] font-bold">{t('Sign in to apply')}</p>
                        <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('With Google or your phone, in a few seconds. Your city’s creator community, the shortlist, your ticket and payout all show up in your Newbi notifications.')}</p>
                        <Button size="lg" icon={LogIn} onClick={signIn} className="w-full">{t('Sign in and apply')}</Button>
                    </div>
                ) : (
                    <form ref={formRef} noValidate onSubmit={submit} className="relative space-y-5 rounded-[2rem] bg-white p-5 ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08] sm:p-7">
                        {/* Honeypot: hidden from people and screen readers; bots fill it. */}
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} className="absolute -left-[9999px] h-0 w-0 opacity-0" />

                        <div data-field="fullName"><TextInput label={t('Full name')} value={form.fullName} onChange={set('fullName')} autoComplete="name" maxLength={80} error={err('fullName')} /></div>
                        <div data-field="phone"><TextInput label={t('WhatsApp number')} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="98765 43210" hint={t('Indian numbers don’t need +91.')} error={err('phone')} /></div>
                        <div data-field="email"><TextInput label={t('Email')} type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" autoCapitalize="none" error={err('email')} /></div>
                        <div data-field="instagram"><TextInput label={t('Instagram')} value={form.instagram} onChange={set('instagram')} autoCapitalize="none" autoCorrect="off" placeholder={t('@yourhandle or profile link')} error={err('instagram')} /></div>
                        <div data-field="followerCount"><TextInput label={t('Instagram followers')} inputMode="numeric" value={form.followerCount} onChange={set('followerCount')} placeholder="12500" hint={minFollowers ? t('This campaign needs at least {count} followers.', { count: minFollowers.toLocaleString('en-IN') }) : undefined} error={err('followerCount')} /></div>

                        <div data-field="city">
                            {campaign.cities.length > 1 ? (
                                <Select id="apply-city" label={t('Your city')} value={form.city} onChange={set('city')} error={err('city')}>
                                    <option value="">{t('Choose your city')}</option>
                                    {campaign.cities.map(c => <option key={c} value={c}>{c}</option>)}
                                </Select>
                            ) : (
                                <TextInput label={t('Your city')} value={form.city} readOnly hint={t('This campaign is for this city only.')} error={err('city')} />
                            )}
                        </div>

                        <div data-field="collegeOrEmployer"><TextInput label={t('College or where you work')} value={form.collegeOrEmployer} onChange={set('collegeOrEmployer')} autoComplete="organization" maxLength={120} error={err('collegeOrEmployer')} /></div>

                        <div data-field="category">
                            <Select id="apply-category" label={t('What you post most')} value={form.category} onChange={set('category')} error={err('category')}>
                                <option value="">{t('Choose a category')}</option>
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{t(c.label)}</option>)}
                            </Select>
                        </div>

                        <FormBlock label={t('Do you run city pages too?')}>
                            <div className="flex gap-2">
                                <ChoiceChip selected={form.runsCityPages === true} onClick={() => set('runsCityPages')(true)}>{t('Yes')}</ChoiceChip>
                                <ChoiceChip selected={form.runsCityPages === false} onClick={() => set('runsCityPages')(false)}>{t('No')}</ChoiceChip>
                            </div>
                        </FormBlock>
                        {form.runsCityPages && (
                            <div data-field="cityPagesHandle"><TextInput label={t('City page handle (optional)')} value={form.cityPagesHandle} onChange={set('cityPagesHandle')} autoCapitalize="none" placeholder={t('@yourcitypage')} error={err('cityPagesHandle')} /></div>
                        )}

                        <div data-field="registeredNewbiCreator">
                            <FormBlock label={t('Are you a registered Newbi creator?')}>
                                <div className="flex gap-2">
                                    <ChoiceChip selected={form.registeredNewbiCreator === true} onClick={() => set('registeredNewbiCreator')(true)}>{t('Yes')}</ChoiceChip>
                                    <ChoiceChip selected={form.registeredNewbiCreator === false} onClick={() => set('registeredNewbiCreator')(false)}>{t('Not yet')}</ChoiceChip>
                                </div>
                                {err('registeredNewbiCreator') && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{err('registeredNewbiCreator')}</p>}
                            </FormBlock>
                        </div>

                        <Select id="apply-referral" label={t('How did you hear about this? (optional)')} value={form.referralSource} onChange={set('referralSource')}>
                            <option value="">{t('Choose one')}</option>
                            {REFERRAL_SOURCES.map(s => <option key={s} value={s}>{t(s)}</option>)}
                        </Select>

                        <div data-field="consentWhatsApp">
                            <label className={cn('flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset', err('consentWhatsApp') ? 'ring-red-500/60' : 'ring-black/[0.08] dark:ring-white/[0.1]')}>
                                <input type="checkbox" checked={form.consentWhatsApp} onChange={set('consentWhatsApp')} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" />
                                <span className="text-[15px] font-semibold">{t(CONSENT_TEXT)}</span>
                            </label>
                            {err('consentWhatsApp') && <p className="mt-1.5 px-1 text-[13px] font-medium text-red-600 dark:text-red-400">{err('consentWhatsApp')}</p>}
                        </div>

                        {serverError && <Notice tone="error" title={serverError} />}
                        <Button type="submit" size="lg" icon={Send} loading={sending} className="w-full">{t('Send application')}</Button>
                        <p className="text-center text-[12px] text-gray-500 dark:text-zinc-500">{t('Only the Newbi team sees your phone, email and follower count.')}</p>
                    </form>
                )}
            </div>
        </PageBody>
    );
};

export default CampaignApplyPage;
