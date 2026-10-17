import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Send from 'lucide-react/dist/esm/icons/send';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import { Button, TextInput, INPUT, ERROR_RING } from '../../../../components/app';
import { cn } from '../../../../lib/utils';
import { isPresent } from '../../../../lib/present';
import useDynamicMeta from '../../../../hooks/useDynamicMeta';
import { PageBody } from '../../../pages/PageHeader';
import { PanelLabel } from '../../../pages/DetailLayout';
import { ChoiceChip, FormBlock, Notice } from '../../ui';
import { callCreatorApi } from '../../api';
import { validateApplication, CATEGORIES, REFERRAL_SOURCES, CONSENT_TEXT, TIERS } from '../../../../lib/outreach/application';
import { formatDeadline } from '../../../../lib/outreach/template';

/*
 * /c/:slug/apply: the open campaign application. No sign-in, so anyone we
 * share the link with can apply in a minute. Replaces the Google Form.
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
        <select id={id} value={value} onChange={onChange} className={cn(INPUT, 'h-[52px] appearance-none px-4', error && ERROR_RING)}>
            {children}
        </select>
        {error && <span className="block px-1 text-[13px] font-medium text-red-600 dark:text-red-400">{error}</span>}
    </label>
);

const CampaignApplyPage = () => {
    const { slug } = useParams();
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

    useDynamicMeta({ page: 'campaign-apply', title: campaign ? `Apply: ${campaign.title}` : 'Apply', image: campaign?.image || undefined });

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
        if (form.registeredNewbiCreator === null) errs.registeredNewbiCreator = 'Tell us if you’re on Newbi already.';
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
            setDone({ updated: Boolean(r.data.updated), firstName: local.value.firstName });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
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
                    <p className="text-[17px] font-bold">This application link isn’t active</p>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">It may have closed or moved. Check the link you were sent.</p>
                </div>
            </PageBody>
        );
    }

    const perks = TIERS.map(t => ({ tier: t, text: perkText(campaign.perksByTier?.[t]) })).filter(p => p.text);
    const err = (k) => errors[k] || null;

    const header = (
        <header className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {isPresent(campaign.image) && (
                <img src={campaign.image} alt="" decoding="async" className="aspect-video w-full rounded-3xl border border-black/[0.06] object-cover dark:border-white/[0.08]" />
            )}
            <PanelLabel>{state.open ? 'Creator application' : 'Applications closed'}</PanelLabel>
            <h1 className="font-heading text-[30px] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-[36px] lg:text-[42px]">{campaign.title}</h1>
            <dl className="grid grid-cols-2 gap-3 text-[14px]">
                {[
                    ['Artist', campaign.artist],
                    ['City', campaign.cities.join(', ')],
                    ['Event', formatDeadline(campaign.eventDate)],
                    ['Apply by', formatDeadline(campaign.applicationDeadline)],
                    ['Post by', formatDeadline(campaign.postingDeadline)],
                ].filter(([, v]) => isPresent(v)).map(([k, v]) => (
                    <div key={k}>
                        <dt className="text-[12px] font-semibold text-gray-500 dark:text-zinc-500">{k}</dt>
                        <dd className="font-semibold text-gray-900 dark:text-white">{v}</dd>
                    </div>
                ))}
            </dl>
            {isPresent(campaign.deliverablesText) && (
                <div className="space-y-1">
                    <p className="text-[12px] font-semibold text-gray-500 dark:text-zinc-500">What you’ll post</p>
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{campaign.deliverablesText}</p>
                </div>
            )}
            {perks.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[12px] font-semibold text-gray-500 dark:text-zinc-500">What you get</p>
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
                        {done.updated ? 'Application updated' : `You’re in${done.firstName ? `, ${done.firstName}` : ''}!`}
                    </h1>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">
                        {done.updated
                            ? 'We already had an application from you, so we’ve updated it with these details.'
                            : `We’ve got your application for ${campaign.title}. If you’re shortlisted, we’ll message you on WhatsApp.`}
                    </p>
                </div>
            </PageBody>
        );
    }

    return (
        <PageBody>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
                {header}
                {!state.open ? (
                    <Notice tone="warn" title={CLOSED_COPY[state.reason] || CLOSED_COPY.closed} />
                ) : (
                    <form ref={formRef} noValidate onSubmit={submit} className="relative space-y-5 rounded-[2rem] bg-white p-5 ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08] sm:p-7">
                        {/* Honeypot: hidden from people and screen readers; bots fill it. */}
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} className="absolute -left-[9999px] h-0 w-0 opacity-0" />

                        <div data-field="fullName"><TextInput label="Full name" value={form.fullName} onChange={set('fullName')} autoComplete="name" maxLength={80} error={err('fullName')} /></div>
                        <div data-field="phone"><TextInput label="WhatsApp number" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="98765 43210" hint="Indian numbers don’t need +91." error={err('phone')} /></div>
                        <div data-field="email"><TextInput label="Email" type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" autoCapitalize="none" error={err('email')} /></div>
                        <div data-field="instagram"><TextInput label="Instagram" value={form.instagram} onChange={set('instagram')} autoCapitalize="none" autoCorrect="off" placeholder="@yourhandle or profile link" error={err('instagram')} /></div>
                        <div data-field="followerCount"><TextInput label="Instagram followers" inputMode="numeric" value={form.followerCount} onChange={set('followerCount')} placeholder="12500" error={err('followerCount')} /></div>

                        <div data-field="city">
                            {campaign.cities.length > 1 ? (
                                <Select id="apply-city" label="Your city" value={form.city} onChange={set('city')} error={err('city')}>
                                    <option value="">Choose your city</option>
                                    {campaign.cities.map(c => <option key={c} value={c}>{c}</option>)}
                                </Select>
                            ) : (
                                <TextInput label="Your city" value={form.city} readOnly hint="This campaign is for this city only." error={err('city')} />
                            )}
                        </div>

                        <div data-field="collegeOrEmployer"><TextInput label="College or where you work" value={form.collegeOrEmployer} onChange={set('collegeOrEmployer')} autoComplete="organization" maxLength={120} error={err('collegeOrEmployer')} /></div>

                        <div data-field="category">
                            <Select id="apply-category" label="What you post most" value={form.category} onChange={set('category')} error={err('category')}>
                                <option value="">Choose a category</option>
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </Select>
                        </div>

                        <FormBlock label="Do you run city pages too?">
                            <div className="flex gap-2">
                                <ChoiceChip selected={form.runsCityPages === true} onClick={() => set('runsCityPages')(true)}>Yes</ChoiceChip>
                                <ChoiceChip selected={form.runsCityPages === false} onClick={() => set('runsCityPages')(false)}>No</ChoiceChip>
                            </div>
                        </FormBlock>
                        {form.runsCityPages && (
                            <div data-field="cityPagesHandle"><TextInput label="City page handle (optional)" value={form.cityPagesHandle} onChange={set('cityPagesHandle')} autoCapitalize="none" placeholder="@yourcitypage" error={err('cityPagesHandle')} /></div>
                        )}

                        <div data-field="registeredNewbiCreator">
                            <FormBlock label="Are you a registered Newbi creator?">
                                <div className="flex gap-2">
                                    <ChoiceChip selected={form.registeredNewbiCreator === true} onClick={() => set('registeredNewbiCreator')(true)}>Yes</ChoiceChip>
                                    <ChoiceChip selected={form.registeredNewbiCreator === false} onClick={() => set('registeredNewbiCreator')(false)}>Not yet</ChoiceChip>
                                </div>
                                {err('registeredNewbiCreator') && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{err('registeredNewbiCreator')}</p>}
                            </FormBlock>
                        </div>

                        <Select id="apply-referral" label="How did you hear about this? (optional)" value={form.referralSource} onChange={set('referralSource')}>
                            <option value="">Choose one</option>
                            {REFERRAL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>

                        <div data-field="consentWhatsApp">
                            <label className={cn('flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset', err('consentWhatsApp') ? 'ring-red-500/60' : 'ring-black/[0.08] dark:ring-white/[0.1]')}>
                                <input type="checkbox" checked={form.consentWhatsApp} onChange={set('consentWhatsApp')} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" />
                                <span className="text-[15px] font-semibold">{CONSENT_TEXT}</span>
                            </label>
                            {err('consentWhatsApp') && <p className="mt-1.5 px-1 text-[13px] font-medium text-red-600 dark:text-red-400">{err('consentWhatsApp')}</p>}
                        </div>

                        {serverError && <Notice tone="error" title={serverError} />}
                        <Button type="submit" size="lg" icon={Send} loading={sending} className="w-full">Send application</Button>
                        <p className="text-center text-[12px] text-gray-500 dark:text-zinc-500">Only the Newbi team sees your phone, email and follower count.</p>
                    </form>
                )}
            </div>
        </PageBody>
    );
};

export default CampaignApplyPage;
