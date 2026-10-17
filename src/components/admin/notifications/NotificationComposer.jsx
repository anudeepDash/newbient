import React, { useEffect, useMemo, useState } from 'react';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Sheet from '../Sheet';
import { Button, Select } from '../ui';
import { Field, Section, Choice, fieldCls, areaCls } from '../uploads/UploadKit';
import { useStore } from '../../../lib/store';
import { useStoreSubscription } from '../../../hooks/useStoreSubscription';
import { triggerNotification } from '../../../lib/notificationTriggers';
import { campaignStatus } from '../campaigns/campaignModel';
import { giveawayState } from '../giveaways/giveawayUtils';

/*
 * Send a notification to the app's notification page (the bell): pick what
 * it's about (a campaign, ticket sale, guestlist, giveaway, gig, form, or
 * anything), and the title, message, picture and link fill in from it; edit
 * as you like. Everyone, or creators only. Links point at app.newbi.live, so
 * tapping one opens that page inside the app.
 */

const APP = 'https://app.newbi.live';
const dayLabel = (v) => {
    const d = v ? new Date(String(v).length === 10 ? `${v}T00:00:00` : v) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
};
const upcoming = (v) => { const d = v ? new Date(v) : null; return !d || Number.isNaN(d.getTime()) || d.getTime() >= Date.now() - 12 * 3600000; };

const KINDS = [
    { value: 'campaign', label: 'Campaign' },
    { value: 'tickets', label: 'Ticket sale' },
    { value: 'guestlist', label: 'Guestlist' },
    { value: 'giveaway', label: 'Giveaway' },
    { value: 'gig', label: 'Gig' },
    { value: 'form', label: 'Form' },
    { value: 'custom', label: 'Anything' },
];

/* For each kind: the items to pick from, and what a notification about one says. */
const useSources = () => {
    const campaigns = useStore(s => s.campaigns);
    const events = useStore(s => s.upcomingEvents);
    const guestlists = useStore(s => s.guestlists);
    const giveaways = useStore(s => s.giveaways);
    const gigs = useStore(s => s.volunteerGigs);
    const forms = useStore(s => s.forms);
    return useMemo(() => ({
        campaign: (campaigns || []).filter(c => campaignStatus(c) === 'open').map(c => ({
            id: c.id, label: c.title || 'Untitled campaign',
            fill: { title: `New campaign: ${c.title || ''}`.trim(), content: [c.reward && `Reward: ${c.reward}.`, 'Apply in one tap with your creator ID.'].filter(Boolean).join(' '), image: c.thumbnail || '', link: `${APP}/c/${c.id}`, audience: 'creators' },
        })),
        tickets: (events || []).filter(e => e.isTicketed && upcoming(e.date)).map(e => ({
            id: e.id, label: e.title || 'Untitled show',
            fill: { title: `Tickets on sale: ${e.title || ''}`.trim(), content: [dayLabel(e.date), e.location].filter(Boolean).join(' · ') || 'Get yours in the app.', image: e.image || '', link: `${APP}/tickets?event=${encodeURIComponent(e.id)}`, audience: 'everyone' },
        })),
        guestlist: [
            ...(events || []).filter(e => (e.isGuestlistEnabled || e.guestlistEnabled) && upcoming(e.date)),
            ...(guestlists || []).filter(g => !g.isEmbedded && String(g.status || '').toLowerCase() !== 'closed' && upcoming(g.date)),
        ].map(g => ({
            id: g.id, label: g.title || 'Untitled guestlist',
            fill: { title: `Guestlist open: ${g.title || ''}`.trim(), content: [dayLabel(g.date), g.location].filter(Boolean).join(' · ') || 'Get on the list in the app.', image: g.image || '', link: `${APP}/community/g/${g.id}`, audience: 'everyone' },
        })),
        giveaway: (giveaways || []).filter(g => giveawayState(g) === 'open').map(g => ({
            id: g.id, label: g.name || g.title || 'Untitled giveaway',
            fill: { title: `Giveaway: ${g.name || g.title || ''}`.trim(), content: g.prize ? `Win ${g.prize}. Enter in the app.` : 'Enter in the app.', image: g.posterUrl || g.image || '', link: `${APP}/community/giveaways/${encodeURIComponent(g.slug || g.id)}`, audience: 'everyone' },
        })),
        gig: (gigs || []).map(g => ({
            id: g.id, label: g.title || 'Untitled gig',
            fill: { title: `Volunteer gig: ${g.title || ''}`.trim(), content: [dayLabel(g.date), g.location || g.venue].filter(Boolean).join(' · ') || 'Say you’re interested in the app.', image: g.image || '', link: `${APP}/community?gig=${encodeURIComponent(g.id)}`, audience: 'everyone' },
        })),
        form: (forms || []).filter(f => String(f.status || f.activeLabel || '').toLowerCase() !== 'closed').map(f => ({
            id: f.id, label: f.title || 'Untitled form',
            fill: { title: f.title || 'New form', content: 'Fill it in on the app.', image: f.image || '', link: `${APP}/forms/${f.id}`, audience: 'everyone' },
        })),
    }), [campaigns, events, guestlists, giveaways, gigs, forms]);
};

// Starts on Campaign, which goes to creators.
const EMPTY = { kind: 'campaign', itemId: '', title: '', content: '', image: '', link: '', audience: 'creators' };

const NotificationComposer = ({ open, onClose }) => {
    useStoreSubscription(open ? ['campaigns', 'upcomingEvents', 'guestlists', 'giveaways', 'volunteerGigs', 'forms'] : []);
    const addToast = useStore(s => s.addToast);
    const sources = useSources();
    const [form, setForm] = useState(EMPTY);
    const [sending, setSending] = useState(false);
    const [problem, setProblem] = useState('');

    useEffect(() => { if (open) { setForm(EMPTY); setProblem(''); } }, [open]);
    const set = (patch) => setForm(f => ({ ...f, ...patch }));

    const items = form.kind === 'custom' ? [] : (sources[form.kind] || []);
    const pick = (itemId) => {
        const item = items.find(i => i.id === itemId);
        set({ itemId, ...(item ? item.fill : {}) });
    };
    const chooseKind = (kind) => setForm({ ...EMPTY, kind, audience: kind === 'campaign' ? 'creators' : 'everyone' });

    const send = async () => {
        setProblem('');
        if (!form.title.trim()) return setProblem('Add a title.');
        if (form.link && !/^(https?:\/\/|\/)/.test(form.link.trim())) return setProblem('The link should start with https:// or /.');
        setSending(true);
        try {
            await triggerNotification({
                userId: null,
                type: form.kind === 'custom' ? 'announcement' : form.kind,
                title: form.title.trim(),
                content: form.content.trim(),
                link: form.link.trim(),
                image: form.image.trim(),
                audience: form.audience,
            });
            addToast(form.audience === 'creators' ? 'Sent to creators in the app.' : 'Sent to everyone in the app.', 'success');
            onClose();
        } catch (err) {
            console.error(err);
            setProblem("Couldn't send it. Please check your connection and try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={sending ? () => {} : onClose}
            size="lg"
            title="Send a notification"
            subtitle="Shows on the app's notification page"
            bodyClassName="space-y-7"
            footer={(
                <div className="space-y-2">
                    {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
                    <div className="flex gap-2">
                        <Button variant="secondary" className="h-12" onClick={onClose} disabled={sending}>Cancel</Button>
                        <Button variant="accent" className="h-12 flex-1" onClick={send} disabled={sending}>
                            <Bell size={15} /> {sending ? 'Sending…' : form.audience === 'creators' ? 'Send to creators' : 'Send to everyone'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <Section title="What it's about">
                <div className="flex flex-wrap gap-2">
                    {KINDS.map(k => (
                        <button
                            key={k.value}
                            type="button"
                            onClick={() => chooseKind(k.value)}
                            aria-pressed={form.kind === k.value}
                            className={`h-10 rounded-full px-4 text-[13px] font-bold transition-colors ${form.kind === k.value ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-black/[0.05] text-gray-700 hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-zinc-300'}`}
                        >
                            {k.label}
                        </button>
                    ))}
                </div>
                {form.kind !== 'custom' && (
                    items.length ? (
                        <Select
                            value={form.itemId}
                            onChange={pick}
                            label="Which one"
                            className="w-full"
                            options={[{ value: '', label: `Choose a ${KINDS.find(k => k.value === form.kind)?.label.toLowerCase()}…` }, ...items.map(i => ({ value: i.id, label: i.label }))]}
                        />
                    ) : (
                        <p className="text-[13px] text-gray-500">Nothing open of this kind right now. Pick “Anything” to write your own.</p>
                    )
                )}
            </Section>

            <Section title="The notification">
                <Field label="Title">
                    <input className={fieldCls} value={form.title} maxLength={90} onChange={(e) => set({ title: e.target.value })} placeholder="New campaign: Arijit Singh Bengaluru" />
                </Field>
                <Field label="Message" optional>
                    <textarea className={`${areaCls} min-h-[80px]`} value={form.content} maxLength={240} onChange={(e) => set({ content: e.target.value })} placeholder="One or two short lines" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Opens" optional hint="Where tapping it goes">
                        <input className={fieldCls} value={form.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://app.newbi.live/…" inputMode="url" autoCapitalize="off" />
                    </Field>
                    <Field label="Picture" optional>
                        <input className={fieldCls} value={form.image} onChange={(e) => set({ image: e.target.value })} placeholder="Image link" inputMode="url" autoCapitalize="off" />
                    </Field>
                </div>
            </Section>

            <Section title="Who gets it">
                <Choice value={form.audience} onChange={(v) => set({ audience: v })} options={[
                    { value: 'everyone', label: 'Everyone', hint: 'Every app user' },
                    { value: 'creators', label: 'Creators only', hint: 'People with a creator profile' },
                ]} />
            </Section>

            {/* How it looks on the app's notification page. */}
            <Section title="Preview">
                <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/[0.06] p-3 dark:bg-neon-green/[0.05]">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-neon-green" />
                    {form.image && <img src={form.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />}
                    <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold leading-snug">{form.title || 'Your title'}</span>
                        {form.content && <span className="mt-0.5 block text-[14px] leading-snug text-gray-600 dark:text-zinc-400">{form.content}</span>}
                        <span className="mt-1 block text-[12px] text-gray-400">just now</span>
                    </span>
                </div>
            </Section>
        </Sheet>
    );
};

export default NotificationComposer;
