import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Send from 'lucide-react/dist/esm/icons/send';
import Users from 'lucide-react/dist/esm/icons/users';
import MessageSquareQuote from 'lucide-react/dist/esm/icons/message-square-quote';
import Star from 'lucide-react/dist/esm/icons/star';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import Globe from 'lucide-react/dist/esm/icons/globe';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Avatar, Badge, Button, Card, EmptyState, SearchInput, SegmentedTabs, StatTile } from '../../ui';
import { Toggle, fieldCls, areaCls } from '../../uploads/UploadKit';
import ExportMenu from '../../ExportMenu';
import { Spinner, ConfirmSheet } from '../parts';
import { callOutreach } from '../outreach/outreachApi';
import { DELIVERY_META } from '../../../../lib/outreach/whatsappTemplate';
import { AGAIN, CONSENT, REASONS, REQUEST_STATUS, canPublish } from '../../../../lib/campaignFeedback';
import { formatDay } from '../campaignModel';

/*
 * The campaign's Feedback tab: after the event, everyone who took part (sent a
 * deliverable, was on the shortlist or got a ticket) is asked on WhatsApp and
 * by email for feedback and a testimonial. The day after the event it goes out
 * on its own (09:00 IST); the team can change the day, turn it off, or send now.
 * Answers with publishing consent can be put on the /creator page in one tap.
 * Everything goes through api/_lib/campaignFeedback.js (admin role checked there).
 */

const MAIL_META = {
    pending: { label: 'Email waiting', tone: 'amber' },
    sent: { label: 'Email sent', tone: 'blue' },
    deferred: { label: 'Email later (daily cap)', tone: 'amber' },
    failed: { label: 'Email failed', tone: 'rose' },
    unsubscribed: { label: 'Unsubscribed', tone: 'gray' },
    skipped: { label: 'Email skipped', tone: 'gray' },
};

const CONSENT_BADGE = { full: 'OK to publish: name and handle', first_name: 'OK to publish: first name only', no: 'Private, don’t publish' };

const Stars = ({ value, size = 14 }) => (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map(n => <Star key={n} size={size} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-zinc-600'} />)}
    </span>
);

const Handle = ({ value }) => (value ? <span className="text-gray-500">@{value}</span> : null);

const average = (rows) => {
    const rated = rows.filter(r => r.response?.rating);
    return rated.length ? rated.reduce((s, r) => s + r.response.rating, 0) / rated.length : 0;
};

const exportSpec = (campaign, rows) => {
    if (!rows.length) return null;
    const label = (list, v) => list.find(x => x.value === v)?.label || '';
    return {
        filename: `${String(campaign.title || 'campaign').replace(/[^\w-]+/g, '_').slice(0, 40)}_feedback_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Feedback',
        title: `${campaign.title || 'Campaign'} · feedback`,
        subtitle: `${rows.filter(r => r.response).length} of ${rows.length} answered`,
        columns: [
            { header: 'Name', width: 24, value: r => r.name },
            { header: 'Instagram', width: 18, value: r => r.instagram },
            { header: 'Phone', width: 16, value: r => r.phone },
            { header: 'Email', width: 28, value: r => r.email },
            { header: 'Took part', width: 28, value: r => r.reasons.map(x => REASONS[x]?.short).join(', ') },
            { header: 'Status', value: r => REQUEST_STATUS[r.status]?.label || '' },
            { header: 'Asked at', type: 'date', value: r => r.sentAt },
            { header: 'Rating', type: 'number', value: r => r.response?.rating || null },
            { header: 'Again', value: r => label(AGAIN, r.response?.again) },
            { header: 'Liked', width: 40, value: r => r.response?.liked || '' },
            { header: 'Do better', width: 40, value: r => r.response?.improve || '' },
            { header: 'Testimonial', width: 50, value: r => r.response?.testimonial || '' },
            { header: 'May publish', width: 30, value: r => label(CONSENT, r.response?.consent) },
            { header: 'On the site', value: r => (r.publishedTestimonialId ? 'Yes' : '') },
            { header: 'Answered at', type: 'date', value: r => r.respondedAt },
        ],
        rows,
    };
};

const PersonRow = ({ row, onSend, busy }) => {
    const wa = row.whatsapp?.status === 'off' ? { label: 'WhatsApp off', tone: 'gray' } : DELIVERY_META[row.whatsapp?.status];
    const mail = MAIL_META[row.emailStatus?.status];
    return (
        <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar src={row.avatarUrl} name={row.name || '?'} size={38} className="rounded-full" />
                <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold">{row.name || 'No name'} <span className="font-medium"><Handle value={row.instagram} /></span></p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                        {row.reasons.map(r => <Badge key={r} tone={REASONS[r]?.tone}>{REASONS[r]?.short}</Badge>)}
                        {!row.phone && !row.email && <Badge tone="rose">No phone or email</Badge>}
                        {row.phone && <Phone size={12} className="ml-1 text-gray-400" aria-label="Has WhatsApp number" />}
                        {row.email && <Mail size={12} className="text-gray-400" aria-label="Has email" />}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <Badge tone={REQUEST_STATUS[row.status].tone}>{REQUEST_STATUS[row.status].label}</Badge>
                {row.status === 'sent' && wa && <Badge tone={wa.tone} title={row.whatsapp?.error || undefined}>{wa.label}</Badge>}
                {row.status === 'sent' && mail && <Badge tone={mail.tone} title={row.emailStatus?.error || undefined}>{mail.label}</Badge>}
                {row.status === 'sent' && row.openedAt && <Badge tone="violet">Opened</Badge>}
                {row.status !== 'responded' && (row.phone || row.email) && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onSend(row)}>
                        {row.status === 'sent' ? <><RotateCcw size={13} /> Ask again</> : <><Send size={13} /> Ask</>}
                    </Button>
                )}
            </div>
        </li>
    );
};

const AnswerCard = ({ row, onPublish }) => {
    const r = row.response;
    const again = AGAIN.find(a => a.value === r.again);
    return (
        <Card className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={row.avatarUrl} name={row.name || '?'} size={36} className="rounded-full" />
                    <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold">{row.name || 'No name'}</p>
                        <p className="truncate text-[12px] text-gray-500">{[row.instagram && `@${row.instagram}`, row.city, formatDay(row.respondedAt)].filter(Boolean).join(' · ')}</p>
                    </div>
                </div>
                <Stars value={r.rating} />
            </div>
            {again && <p className="text-[13px] text-gray-600 dark:text-zinc-400">Another campaign: <span className="font-semibold text-gray-900 dark:text-white">{again.label}</span></p>}
            {r.liked && <div><p className="text-[12px] font-semibold text-gray-500">Liked</p><p className="whitespace-pre-line text-[14px]">{r.liked}</p></div>}
            {r.improve && <div><p className="text-[12px] font-semibold text-gray-500">Do better</p><p className="whitespace-pre-line text-[14px]">{r.improve}</p></div>}
            {r.testimonial && (
                <div className="space-y-2 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[14px] leading-relaxed">“{r.testimonial}”</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone={canPublish(r.consent) ? 'green' : 'gray'}>{CONSENT_BADGE[r.consent] || 'No answer on publishing'}</Badge>
                        {row.publishedTestimonialId ? (
                            <Button size="sm" variant="secondary" onClick={() => onPublish(row, false)}><Globe size={13} /> On the site · take down</Button>
                        ) : canPublish(r.consent) ? (
                            <Button size="sm" variant="accent" onClick={() => onPublish(row, true)}><Globe size={13} /> Publish to site</Button>
                        ) : null}
                    </div>
                </div>
            )}
        </Card>
    );
};

const FeedbackTab = ({ campaign }) => {
    const addToast = useStore(s => s.addToast);
    const [data, setData] = useState({ loading: true, error: '', people: [], settings: null });
    const [view, setView] = useState('people');
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null); // { keys, resend, title, message }
    const [publishing, setPublishing] = useState(null); // { row, quote }
    const [draftDay, setDraftDay] = useState('');

    const load = useCallback(async () => {
        const r = await callOutreach('feedback-list', { campaignId: campaign.id });
        setData(r.ok
            ? { loading: false, error: '', ...r.data }
            : { loading: false, error: r.status === 403 ? 'Only founders and admins can see feedback and contact details.' : r.error, people: [], settings: null });
        if (r.ok) setDraftDay(r.data.settings.sendOn || r.data.sendDay || '');
    }, [campaign.id]);
    useEffect(() => { load(); }, [load]);

    const people = data.people || [];
    const answered = people.filter(p => p.response);
    const asked = people.filter(p => p.status !== 'not_sent');
    const notAsked = people.filter(p => p.status === 'not_sent' && (p.phone || p.email));
    const publishable = answered.filter(p => p.response.testimonial && canPublish(p.response.consent));
    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        const list = view === 'answers' ? answered : people;
        return s ? list.filter(p => `${p.name} ${p.instagram} ${p.phone} ${p.email}`.toLowerCase().includes(s)) : list;
    }, [people, answered, view, q]);

    const saveSettings = async (patch) => {
        const next = { autoSend: data.settings.autoSend, sendOn: data.settings.sendOn, ...patch };
        setData(d => ({ ...d, settings: { ...d.settings, ...patch } }));
        const r = await callOutreach('feedback-settings', { campaignId: campaign.id, ...next });
        if (!r.ok) addToast(r.error, 'error');
        load();
    };

    /* Sends, then keeps sending waiting emails in batches (each call is time-boxed on the server). */
    const sendNow = async ({ keys = null, resend = false } = {}) => {
        setBusy(true);
        const r = await callOutreach('feedback-send', { campaignId: campaign.id, keys, resend });
        if (!r.ok) {
            setBusy(false);
            addToast(r.error, 'error');
            return;
        }
        const rep = r.data.report;
        let waiting = rep.emailsWaiting;
        for (let i = 0; waiting > 0 && i < 20; i += 1) {
            const more = await callOutreach('feedback-run', { campaignId: campaign.id });
            if (!more.ok) break;
            waiting = more.data.waiting;
        }
        setBusy(false);
        if (!rep.asked) addToast(rep.skipped?.already ? 'Everyone here has been asked already.' : 'Nobody to ask yet.', 'info');
        else addToast(`Asked ${rep.asked} ${rep.asked === 1 ? 'person' : 'people'}${rep.whatsappOff ? ' by email (WhatsApp template is off)' : ''}.`, 'success');
        load();
    };

    const publish = async (row, on, quote) => {
        const r = await callOutreach('feedback-publish', { campaignId: campaign.id, id: row.id, publish: on, quote });
        if (!r.ok) { addToast(r.error, 'error'); return; }
        addToast(on ? 'Published on the /creator page. Reorder or hide it in Creator testimonials.' : 'Taken off the site.', 'success');
        load();
    };

    if (data.loading) return <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-gray-400" /></div>;
    if (data.error) return <EmptyState icon={TriangleAlert} title="Feedback isn’t available" description={data.error} />;

    const { settings, sendDay } = data;
    const sentAuto = Boolean(settings.autoSentAt);
    const scheduleLine = !sendDay
        ? 'Add the event date in Brief and settings, or pick a day here.'
        : sentAuto
            ? `Sent automatically on ${formatDay(settings.autoSentAt, true)}.`
            : settings.autoSend
                ? `Goes out on ${formatDay(sendDay, true)} at 9:00 AM to everyone not asked by then, on WhatsApp and email.`
                : 'Automatic sending is off. Use Ask everyone when you’re ready.';

    return (
        <div className="space-y-4">
            <Card className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><CalendarClock size={18} /></div>
                        <div className="min-w-0">
                            <p className="text-[15px] font-bold">Feedback and testimonials</p>
                            <p className="text-[13px] text-gray-600 dark:text-zinc-400">{scheduleLine}</p>
                        </div>
                    </div>
                    <Button variant="accent" disabled={busy || !notAsked.length} onClick={() => setConfirm({ keys: null, resend: false })}>
                        {busy ? <Spinner /> : <Send size={14} />} Ask everyone{notAsked.length ? ` (${notAsked.length})` : ''}
                    </Button>
                </div>
                <div className="grid gap-3 border-t border-black/[0.06] pt-4 dark:border-white/[0.08] sm:grid-cols-2">
                    <Toggle label="Send the day after the event" hint="09:00 IST, on WhatsApp and email" checked={settings.autoSend} onChange={(v) => saveSettings({ autoSend: v })} />
                    <label className="block space-y-1">
                        <span className="block text-[12px] font-semibold text-gray-500">Send on{data.eventDate ? ` (event: ${formatDay(data.eventDate, true)})` : ''}</span>
                        <div className="flex gap-2">
                            <input type="date" className={fieldCls} value={draftDay} disabled={!settings.autoSend} onChange={(e) => setDraftDay(e.target.value)} />
                            {draftDay !== (settings.sendOn || sendDay || '') && (
                                <Button variant="secondary" className="h-12" onClick={() => saveSettings({ sendOn: draftDay })}>Save</Button>
                            )}
                        </div>
                    </label>
                </div>
                {!data.whatsappLive && (
                    <p className="flex gap-2 rounded-2xl bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-800 dark:text-amber-200">
                        <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                        <span>The WhatsApp template <b>campaign_feedback</b> isn’t switched on, so only emails go out. Once Meta approves it, set <code className="font-mono text-[12px]">{data.whatsappSwitch}</code> in Vercel.</span>
                    </p>
                )}
            </Card>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile icon={Users} tone="blue" label="Took part" value={people.length} hint={`${asked.length} asked`} active={view === 'people'} onClick={() => setView('people')} />
                <StatTile icon={CheckCheck} tone="green" label="Answered" value={answered.length} hint={asked.length ? `${Math.round((answered.length / asked.length) * 100)}% of those asked` : 'Nobody asked yet'} active={view === 'answers'} onClick={() => setView('answers')} />
                <StatTile icon={Star} tone="amber" label="Average rating" value={answered.length ? average(answered).toFixed(1) : '–'} hint="Out of 5" />
                <StatTile icon={MessageSquareQuote} tone="violet" label="OK to publish" value={publishable.length} hint={`${answered.filter(p => p.publishedTestimonialId).length} on the site`} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SegmentedTabs value={view} onChange={setView} items={[{ value: 'people', label: 'People', count: people.length }, { value: 'answers', label: 'Answers', count: answered.length || undefined }]} />
                <div className="flex gap-2">
                    <SearchInput value={q} onChange={setQ} placeholder="Search name, handle, phone" className="flex-1 sm:w-64" />
                    <ExportMenu label="Export" getSpec={() => exportSpec(campaign, people)} hint="Everyone, with their answers" />
                </div>
            </div>

            {view === 'people' ? (
                shown.length ? (
                    <Card className="overflow-hidden">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                            {shown.map(row => <PersonRow key={row.id || row.key} row={row} busy={busy} onSend={(r) => setConfirm({ keys: [r.id || r.key], resend: r.status === 'sent', name: r.name })} />)}
                        </ul>
                    </Card>
                ) : (
                    <EmptyState icon={Users} title={q ? 'Nobody matches' : 'Nobody has taken part yet'} description="People show up here once they send a deliverable, are told they’re shortlisted, or get a ticket." />
                )
            ) : shown.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                    {shown.map(row => <AnswerCard key={row.id} row={row} onPublish={(r, on) => (on ? setPublishing({ row: r, quote: r.response.testimonial }) : publish(r, false))} />)}
                </div>
            ) : (
                <EmptyState icon={CheckCheck} title={q ? 'No answers match' : 'No answers yet'} description="Answers show up here as people fill in the form." />
            )}

            <ConfirmSheet
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                title={confirm?.keys ? (confirm.resend ? `Ask ${confirm.name || 'them'} again?` : `Ask ${confirm.name || 'them'} now?`) : `Ask ${notAsked.length} ${notAsked.length === 1 ? 'person' : 'people'} now?`}
                message={confirm?.keys
                    ? 'They get the feedback message on WhatsApp and by email, with their own link.'
                    : 'Everyone who took part and hasn’t been asked gets the feedback message on WhatsApp and by email. People already asked or who answered are skipped.'}
                confirmLabel="Send"
                onConfirm={async () => { const c = confirm; setConfirm(null); await sendNow(c); }}
            />

            <ConfirmSheet
                open={Boolean(publishing)}
                onClose={() => setPublishing(null)}
                title="Publish on the /creator page?"
                message={publishing ? `Shown as ${publishing.row.response.consent === 'full' ? `${publishing.row.name}${publishing.row.instagram ? ` (@${publishing.row.instagram})` : ''}, with their photo` : `${(publishing.row.name || '').split(' ')[0] || 'their first name'} only, no photo or handle`}, as they chose. You can fix typos, not change what they said.` : ''}
                confirmLabel="Publish"
                onConfirm={async () => { const p = publishing; setPublishing(null); await publish(p.row, true, p.quote); }}
            >
                {publishing && (
                    <textarea className={cn(areaCls, 'min-h-[120px]')} maxLength={400} value={publishing.quote} onChange={(e) => setPublishing(p => ({ ...p, quote: e.target.value }))} />
                )}
            </ConfirmSheet>
        </div>
    );
};

export default FeedbackTab;
