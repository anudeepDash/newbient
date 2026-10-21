import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { copyToClipboard } from '../../lib/clipboard';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Globe from 'lucide-react/dist/esm/icons/globe';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Info from 'lucide-react/dist/esm/icons/info';
import { accent } from './theme';
import { Button, Badge } from './ui';
import { Field, Toggle, fieldCls } from './uploads/UploadKit';
import { BuilderCard } from './events/EditorParts';
import { appUrl } from '../../app/host';
import { callCreatorApi } from '../../app/creator/api';

/*
 * Creator program rules: who can apply, the Instagram follower gate, points,
 * and which sections show on the public creator page. Saves to
 * site_settings/general (the same fields the join form and API read).
 */

const DEFAULTS = {
    allowCreatorSignups: true,
    minInstagramFollowersToJoin: 1000,
    requireInstagramVerification: true,
    instagramMetaVerification: false,
    creatorWelcomePoints: 100,
    creatorReferralPoints: 200,
    showPastClients: true,
    showCreatorTestimonials: true,
    creatorAnnouncement: '',
};

const fromSettings = (s) => ({
    allowCreatorSignups: s?.allowCreatorSignups !== false,
    minInstagramFollowersToJoin: s?.minInstagramFollowersToJoin !== undefined ? String(Number(s.minInstagramFollowersToJoin) || 0) : String(DEFAULTS.minInstagramFollowersToJoin),
    requireInstagramVerification: s?.requireInstagramVerification !== false,
    instagramMetaVerification: s?.instagramMetaVerification === true,
    creatorWelcomePoints: s?.creatorWelcomePoints !== undefined ? String(Number(s.creatorWelcomePoints) || 0) : String(DEFAULTS.creatorWelcomePoints),
    creatorReferralPoints: s?.creatorReferralPoints !== undefined ? String(Number(s.creatorReferralPoints) || 0) : String(DEFAULTS.creatorReferralPoints),
    showPastClients: s?.showPastClients !== false,
    showCreatorTestimonials: s?.showCreatorTestimonials !== false,
    creatorAnnouncement: s?.creatorAnnouncement || '',
});

const FOLLOWER_PRESETS = [0, 500, 1000, 2500, 5000];
const ANNOUNCEMENT_MAX = 180;

const whole = (v) => {
    const n = Number(String(v).trim());
    return Number.isFinite(n) && n >= 0 && Number.isInteger(n) ? n : null;
};

// The pitch is on the landing site; applying and the dashboard are in the app.
const LINKS = [
    { label: 'Creator page', path: '/creator', icon: Globe, tone: 'pink' },
    { label: 'Application', path: appUrl('/creator/apply'), icon: ClipboardList, tone: 'violet' },
    { label: 'Creator home', path: appUrl('/creator'), icon: LayoutDashboard, tone: 'blue' },
];
const absolute = (path) => (/^https?:/.test(path) ? path : `${window.location.origin}${path}`);

/*
 * Accounts that can connect Instagram before the Meta switch is on (the App
 * Review test account, the team). Kept on the server, not in site_settings,
 * so the emails stay private; saved on its own button.
 */
const EarlyAccess = ({ addToast }) => {
    const [text, setText] = useState('');
    const [savedText, setSavedText] = useState('');
    const [state, setState] = useState('loading');
    useEffect(() => {
        let live = true;
        callCreatorApi('ig-connect-access', {}).then((res) => {
            if (!live) return;
            const value = res.ok ? (res.data.emails || []).join('\n') : '';
            setText(value);
            setSavedText(value);
            setState(res.ok ? 'ready' : 'error');
        });
        return () => { live = false; };
    }, []);
    const save = async () => {
        setState('saving');
        const res = await callCreatorApi('ig-connect-access', { emails: text });
        if (!res.ok) {
            setState('ready');
            addToast(res.error, 'error', { title: 'Early access not saved' });
            return;
        }
        const value = (res.data.emails || []).join('\n');
        setText(value);
        setSavedText(value);
        setState('ready');
        addToast(res.data.emails.length ? `${res.data.emails.length} account${res.data.emails.length === 1 ? '' : 's'} can connect Instagram.` : 'Early access cleared.', 'success');
    };
    return (
        <div>
            <Field label="Early access to Connect Instagram" optional hint={state === 'error' ? 'Couldn’t load the list. Refresh to try again.' : 'Sign-in emails, one per line. These accounts see “Connect with Instagram” while the switch is off, like the Meta App Review test account.'}>
                <textarea
                    className={cn(fieldCls, 'min-h-[88px] py-2.5 font-mono text-[13px]')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="reviewer@example.com"
                    disabled={state === 'loading' || state === 'error'}
                    spellCheck={false}
                />
            </Field>
            {text !== savedText && (
                <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="primary" onClick={save} disabled={state === 'saving'}>
                        {state === 'saving' && <Loader2 size={14} className="animate-spin" />} Save early access
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setText(savedText)} disabled={state === 'saving'}>Discard</Button>
                </div>
            )}
        </div>
    );
};

const CreatorProgramSettingsManager = () => {
    useStoreSubscription(['siteSettings']);
    const siteSettings = useStore(s => s.siteSettings);
    const addToast = useStore(s => s.addToast);

    const saved = useMemo(() => fromSettings(siteSettings), [siteSettings]);
    const [form, setForm] = useState(saved);
    const [saving, setSaving] = useState(false);

    const dirty = useMemo(() => Object.keys(DEFAULTS).some(k => String(form[k]) !== String(saved[k])), [form, saved]);

    // Pick up changes saved elsewhere, unless you're in the middle of editing.
    useEffect(() => {
        if (!dirty) setForm(saved);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saved]);

    const set = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

    const errors = {
        minInstagramFollowersToJoin: whole(form.minInstagramFollowersToJoin) === null ? 'Use a whole number, 0 or more.' : '',
        creatorWelcomePoints: whole(form.creatorWelcomePoints) === null || Number(form.creatorWelcomePoints) > 5000 ? 'Use a whole number from 0 to 5,000.' : '',
        creatorReferralPoints: whole(form.creatorReferralPoints) === null || Number(form.creatorReferralPoints) > 5000 ? 'Use a whole number from 0 to 5,000.' : '',
        creatorAnnouncement: form.creatorAnnouncement.length > ANNOUNCEMENT_MAX ? `Keep it under ${ANNOUNCEMENT_MAX} characters.` : '',
    };
    const hasErrors = Object.values(errors).some(Boolean);

    const save = async () => {
        if (saving || !dirty) return;
        if (hasErrors) { addToast('Fix the highlighted fields first.', 'warning'); return; }
        setSaving(true);
        try {
            await useStore.getState().updateGeneralSettings({
                allowCreatorSignups: form.allowCreatorSignups,
                minInstagramFollowersToJoin: whole(form.minInstagramFollowersToJoin),
                requireInstagramVerification: form.requireInstagramVerification,
                instagramMetaVerification: form.instagramMetaVerification,
                creatorWelcomePoints: whole(form.creatorWelcomePoints),
                creatorReferralPoints: whole(form.creatorReferralPoints),
                showPastClients: form.showPastClients,
                showCreatorTestimonials: form.showCreatorTestimonials,
                creatorAnnouncement: form.creatorAnnouncement.trim(),
            });
            addToast('Creator program settings saved.', 'success');
        } catch (err) {
            console.error('Save settings error:', err);
            addToast('Check your connection and try again.', 'error', {
                title: 'Settings not saved',
                action: { label: 'Try again', onClick: () => save() },
            });
        } finally {
            setSaving(false);
        }
    };

    const copyLink = async (path) => {
        const ok = await copyToClipboard(absolute(path));
        addToast(ok ? 'Link copied.' : "Couldn't copy the link. Try again.", ok ? 'success' : 'error');
    };

    const minFollowers = whole(form.minInstagramFollowersToJoin) ?? 0;

    return (
        <section className="space-y-5 pb-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
                <div className="space-y-4 lg:col-span-2">
                    <BuilderCard
                        title="Applications"
                        hint="The creator application in the app"
                        action={<Badge tone={form.allowCreatorSignups ? 'green' : 'red'}>{form.allowCreatorSignups ? 'Open' : 'Paused'}</Badge>}
                    >
                        <div className="space-y-4">
                            <div className={cn('rounded-xl border p-3', form.allowCreatorSignups ? 'border-black/[0.06] dark:border-white/[0.08]' : cn(accent('red').border, accent('red').soft))}>
                                <Toggle
                                    label="Accept new creator applications"
                                    hint={form.allowCreatorSignups ? 'Anyone can apply.' : 'The join form shows that applications are paused.'}
                                    checked={form.allowCreatorSignups}
                                    onChange={set('allowCreatorSignups')}
                                />
                            </div>
                            <Field label="Announcement on the join form" optional hint={errors.creatorAnnouncement || `${form.creatorAnnouncement.length}/${ANNOUNCEMENT_MAX} · leave empty to show nothing`}>
                                <div className="relative">
                                    <Megaphone size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        className={cn(fieldCls, 'pl-10', errors.creatorAnnouncement && 'border-red-500/60')}
                                        value={form.creatorAnnouncement}
                                        onChange={(e) => set('creatorAnnouncement')(e.target.value)}
                                        placeholder="Now onboarding creators for festival season in Bengaluru and Mumbai"
                                    />
                                </div>
                            </Field>
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Instagram check" hint="Applies to the join form and creators you add yourself">
                        <div className="space-y-4">
                            <Field label="Minimum Instagram followers to join" hint={errors.minInstagramFollowersToJoin || (minFollowers === 0 ? 'Anyone can join, whatever their follower count.' : `Creators need at least ${minFollowers.toLocaleString('en-IN')} followers. Those who type their count in by hand go to review instead.`)}>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    step="100"
                                    className={cn(fieldCls, 'tabular-nums', errors.minInstagramFollowersToJoin && 'border-red-500/60')}
                                    value={form.minInstagramFollowersToJoin}
                                    onChange={(e) => set('minInstagramFollowersToJoin')(e.target.value)}
                                />
                            </Field>
                            <div className="flex flex-wrap gap-1.5">
                                {FOLLOWER_PRESETS.map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => set('minInstagramFollowersToJoin')(String(n))}
                                        className={cn('h-10 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors',
                                            minFollowers === n && !errors.minInstagramFollowersToJoin ? cn(accent('pink').border, accent('pink').soft, accent('pink').text) : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20')}
                                    >
                                        {n === 0 ? 'No minimum' : `${n.toLocaleString('en-IN')}+`}
                                    </button>
                                ))}
                            </div>
                            <div className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                                <Toggle
                                    label="Check followers automatically"
                                    hint={form.requireInstagramVerification
                                        ? 'The minimum is checked against the follower count Instagram reports.'
                                        : 'The minimum isn’t enforced; every application is reviewed by hand.'}
                                    checked={form.requireInstagramVerification}
                                    onChange={set('requireInstagramVerification')}
                                />
                            </div>
                            <div className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                                <Toggle
                                    label="Verify through Instagram (Meta)"
                                    hint={form.instagramMetaVerification
                                        ? 'Creators connect a Professional Instagram account or type their username. Followers come from Meta, and creators over the minimum are approved straight away.'
                                        : 'Off until Meta approves the app. Creators type their username and followers are read from their public profile. Only the early access accounts below can connect Instagram.'}
                                    checked={form.instagramMetaVerification}
                                    onChange={set('instagramMetaVerification')}
                                />
                            </div>
                            {!form.instagramMetaVerification && <EarlyAccess addToast={addToast} />}
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Points" hint="Newbi points on the creator's ID pass">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Welcome points" hint={errors.creatorWelcomePoints || (Number(form.creatorWelcomePoints) === 0 ? 'No welcome points are shown when this is 0.' : 'Shown to creators once they’re approved.')}>
                                <input type="number" inputMode="numeric" min="0" max="5000" className={cn(fieldCls, 'tabular-nums', errors.creatorWelcomePoints && 'border-red-500/60')} value={form.creatorWelcomePoints} onChange={(e) => set('creatorWelcomePoints')(e.target.value)} />
                            </Field>
                            <Field label="Referral points" hint={errors.creatorReferralPoints || 'Saved for the referral program. Points aren\'t added to accounts automatically yet.'}>
                                <input type="number" inputMode="numeric" min="0" max="5000" className={cn(fieldCls, 'tabular-nums', errors.creatorReferralPoints && 'border-red-500/60')} value={form.creatorReferralPoints} onChange={(e) => set('creatorReferralPoints')(e.target.value)} />
                            </Field>
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Creator page sections" hint="What shows on the public /creator page">
                        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                            <div className="pb-3">
                                <Toggle label="Brand partner logos" hint="Also shown on the home page" checked={form.showPastClients} onChange={set('showPastClients')} />
                            </div>
                            <div className="pt-3">
                                <Toggle label="Creator testimonials" hint="Only testimonials marked visible appear" checked={form.showCreatorTestimonials} onChange={set('showCreatorTestimonials')} />
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button as={Link} to="/admin/creators/settings?tab=brands" size="sm" variant="ghost">Manage brand partners</Button>
                            <Button as={Link} to="/admin/creators/settings?tab=testimonials" size="sm" variant="ghost">Manage testimonials</Button>
                        </div>
                    </BuilderCard>
                </div>

                <div className="space-y-4">
                    <BuilderCard title="Public links">
                        <ul className="space-y-2">
                            {LINKS.map(l => (
                                <li key={l.path} className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-2.5 dark:border-white/[0.08]">
                                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(l.tone).chip)}><l.icon size={17} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[14px] font-bold">{l.label}</span>
                                        <span className="block truncate font-mono text-[12px] text-gray-500">{l.path}</span>
                                    </span>
                                    <Button size="sm" variant="ghost" onClick={() => copyLink(l.path)} aria-label={`Copy ${l.label} link`} className="h-10 w-10 px-0"><Copy size={14} /></Button>
                                    <Button size="sm" variant="ghost" as="a" href={l.path} target="_blank" rel="noopener noreferrer" aria-label={`Open ${l.label}`} className="h-10 w-10 px-0"><ExternalLink size={14} /></Button>
                                </li>
                            ))}
                        </ul>
                    </BuilderCard>
                    <div className={cn('rounded-2xl border p-4', accent('teal').border, accent('teal').soft)}>
                        <p className={cn('flex items-center gap-2 text-[14px] font-bold', accent('teal').text)}><MessageCircle size={15} /> City groups</p>
                        <p className="mt-1 text-[13px] text-gray-600 dark:text-zinc-300">Creators are pointed to their city's group when they finish applying and in their dashboard.</p>
                        <Button as={Link} to="/admin/creators/groups" size="sm" variant="secondary" className="mt-3">Manage city groups</Button>
                    </div>
                    <div className="flex items-start gap-2 rounded-2xl border border-black/[0.06] p-4 text-[12px] text-gray-500 dark:border-white/[0.08]">
                        <Info size={14} className="mt-0.5 shrink-0" />
                        <span>Changes apply as soon as you save. The join form picks them up the next time it opens.</span>
                    </div>
                </div>
            </div>

            {/* Save bar: sits above the phone tab bar, sticks while you scroll. */}
            {(dirty || saving) && (
                <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 lg:bottom-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#12141b]">
                        <p className="min-w-0 flex-1 truncate pl-1 text-[13px] font-semibold">{hasErrors ? 'Some fields need fixing' : 'You have unsaved changes'}</p>
                        <Button variant="ghost" onClick={() => setForm(saved)} disabled={saving} className="h-11">Discard</Button>
                        <Button variant="primary" onClick={save} disabled={saving || hasErrors} className="h-11">
                            {saving && <Loader2 size={14} className="animate-spin" />} {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default CreatorProgramSettingsManager;
