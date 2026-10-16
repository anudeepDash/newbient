import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Send from 'lucide-react/dist/esm/icons/send';
import Eye from 'lucide-react/dist/esm/icons/eye';
import MousePointerClick from 'lucide-react/dist/esm/icons/mouse-pointer-click';
import UserX from 'lucide-react/dist/esm/icons/user-x';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import Activity from 'lucide-react/dist/esm/icons/activity';
import { db } from '../../../lib/firebase';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { Badge, Button, Card, EmptyState, Menu, MenuItem, SearchInput, SegmentedTabs, Select, StatTile, ViewToggle, useViewMode } from '../ui';
import Sheet from '../Sheet';
import ExportMenu from '../ExportMenu';
import { exportSubtitle, fileDate } from '../../../lib/xlsx';
import EmailPreview from './EmailPreview';
import {
    CAMPAIGN_STATE, CATEGORY_LABEL, CATEGORY_TONE, buildOfficialHtml, campaignNumbers, campaignState, canRetryCampaign, formatWhen, pct, stripHtml,
} from './mailingApi';
import { campaignTime } from './audience';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const categoryLabel = (c) => CATEGORY_LABEL[c] || (c ? c.charAt(0) + c.slice(1).toLowerCase() : 'Official');
const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'sent', label: 'Sent' },
    { value: 'attention', label: 'Needs attention' },
    { value: 'stopped', label: 'Stopped' },
];
const needsAttention = (state) => state === 'partial' || state === 'failed' || state === 'interrupted';

const RateBar = ({ label, value, tone, detail }) => (
    <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2 text-[12px]">
            <span className="truncate font-semibold text-gray-500">{label}</span>
            <span className={cn('shrink-0 whitespace-nowrap font-bold tabular-nums', accent(tone).text)}>{value === null ? detail : pct(value)}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <div className={cn('h-full rounded-full', accent(tone).dot)} style={{ width: `${value || 0}%` }} />
        </div>
    </div>
);

/* ---------- Recent activity ---------- */

const RecentActivity = () => {
    const [events, setEvents] = useState(null);
    useEffect(() => {
        let unsub = () => {};
        try {
            const q = query(collection(db, 'email_events'), orderBy('timestamp', 'desc'), limit(12));
            unsub = onSnapshot(q, (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setEvents([]));
        } catch { setEvents([]); }
        return () => unsub();
    }, []);
    if (!events || events.length === 0) return null;
    const icon = { open: Eye, click: MousePointerClick, unsubscribe: UserX };
    const tone = { open: 'green', click: 'cyan', unsubscribe: 'amber' };
    const verb = { open: 'opened', click: 'clicked', unsubscribe: 'unsubscribed' };
    return (
        <Card className="rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent('fuchsia').chip)}><Activity size={15} /></span>
                <h3 className="text-[15px] font-bold">Latest activity</h3>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {events.map(ev => {
                    const Icon = icon[ev.eventType] || Eye;
                    return (
                        <div key={ev.id} className="flex w-[240px] shrink-0 items-start gap-2.5 rounded-xl border border-black/[0.06] p-2.5 dark:border-white/[0.08]">
                            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', accent(tone[ev.eventType] || 'gray').chip)}><Icon size={14} /></span>
                            <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold">{ev.email || 'Someone'} {verb[ev.eventType] || ev.eventType}</p>
                                <p className="truncate text-[12px] text-gray-500">{ev.eventType === 'click' ? (ev.targetUrl || '') : (ev.subject || 'Campaign')} · {formatWhen(ev.timestamp)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

/* ---------- Report sheet ---------- */

const PEOPLE_FILTERS = ['all', 'opened', 'clicked', 'failed', 'unsubscribed'];
const PEOPLE_LABEL = { all: 'Everyone', opened: 'Opened', clicked: 'Clicked', failed: 'Failed', unsubscribed: 'Unsubscribed' };

const CampaignReport = ({ campaign, onClose, onReuse, onRetry, onDelete }) => {
    const [tab, setTab] = useState('overview');
    const [people, setPeople] = useState('all');
    const [search, setSearch] = useState('');
    useEffect(() => { setTab('overview'); setPeople('all'); setSearch(''); }, [campaign?.id]);

    const rows = useMemo(() => {
        if (!campaign) return [];
        const opened = new Set(campaign.openedEmails || []);
        const clicked = new Set(campaign.clickedEmails || []);
        const failed = new Set(campaign.failedEmails || []);
        const unsub = new Set([...(campaign.unsubscribedEmails || []), ...(campaign.suppressedEmails || [])]);
        const map = new Map();
        (campaign.recipients || []).forEach(r => map.set(r.email, { email: r.email, name: r.name || '' }));
        [...opened, ...clicked, ...failed, ...unsub].forEach(e => { if (e && !map.has(e)) map.set(e, { email: e, name: '' }); });
        return [...map.values()].map(r => ({ ...r, opened: opened.has(r.email), clicked: clicked.has(r.email), failed: failed.has(r.email), unsubscribed: unsub.has(r.email) }));
    }, [campaign]);

    if (!campaign) return <Sheet open={false} onClose={onClose} />;
    const n = campaignNumbers(campaign);
    const state = campaignState(campaign);
    const cfg = CAMPAIGN_STATE[state];
    const q = search.trim().toLowerCase();
    const shownPeople = rows.filter(r => (people === 'all' || r[people]) && (!q || r.email.includes(q) || r.name.toLowerCase().includes(q)));
    const previewHtml = campaign.html || (campaign.messageBody || campaign.headerText ? buildOfficialHtml({
        headerText: campaign.headerText || campaign.subject,
        messageBody: campaign.messageBody || '',
        heroImage: campaign.heroImage,
        preheader: campaign.preheader,
        category: campaign.category || 'OFFICIAL',
        ctaText: campaign.ctaText,
        ctaUrl: campaign.ctaUrl,
        theme: campaign.theme,
    }, { preview: true }) : '');
    const retryable = canRetryCampaign(campaign);
    const pendingCount = (campaign.failedEmails || []).length + (campaign.unsentEmails || []).length;

    return (
        <Sheet
            open={!!campaign}
            onClose={onClose}
            size="xl"
            header={(
                <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={cfg.tone}>{cfg.label}</Badge>
                        <Badge tone={CATEGORY_TONE[campaign.category] || 'fuchsia'}>{categoryLabel(campaign.category)}</Badge>
                        <span className="text-[12px] text-gray-500">{formatWhen(campaign.sentAt)}</span>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight">{campaign.subject || 'Untitled'}</h2>
                </div>
            )}
            bodyClassName="space-y-5"
            footer={(
                <div className="flex flex-wrap gap-2">
                    {retryable && <Button variant="primary" className="h-12 flex-1" onClick={() => onRetry(campaign)}><RotateCcw size={15} /> Retry {fmt(pendingCount)}</Button>}
                    {(campaign.messageBody || campaign.headerText) && <Button variant="secondary" className="h-12 flex-1" onClick={() => onReuse(campaign)}><Copy size={15} /> Reuse</Button>}
                    <Button variant="ghost" className="h-12 text-red-600 dark:text-red-400" onClick={() => onDelete(campaign)}><Trash2 size={15} /> Delete</Button>
                </div>
            )}
        >
            <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs value={tab} onChange={setTab} items={[
                    { value: 'overview', label: 'Overview' },
                    { value: 'people', label: 'People', count: rows.length },
                    { value: 'links', label: 'Links', count: (campaign.clickedUrls || []).length },
                    { value: 'preview', label: 'Email' },
                ]} />
            </div>

            {tab === 'overview' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <StatTile icon={Send} tone="fuchsia" label="Delivered" value={fmt(n.sent)} hint={n.total !== n.sent ? `of ${fmt(n.total)} people` : 'Everyone on the list'} />
                        <StatTile icon={Eye} tone="green" label="Opened" value={n.individual ? fmt(n.uniqueOpens) : fmt(n.opens)} hint={n.individual ? `${pct(n.openRate)} · ${fmt(n.opens)} opens in all` : 'Total opens (sent in batches)'} />
                        <StatTile icon={MousePointerClick} tone="cyan" label="Clicked" value={n.individual ? fmt(n.uniqueClicks) : fmt(n.clicks)} hint={n.individual ? `${pct(n.clickRate)} · ${fmt(n.clicks)} clicks in all` : 'Total link clicks'} />
                        <StatTile icon={UserX} tone="amber" label="Unsubscribed" value={fmt(n.unsubscribes)} hint={n.suppressed ? `${fmt(n.suppressed)} skipped at send` : 'After this email'} />
                        <StatTile icon={RotateCcw} tone={n.failed ? 'red' : 'gray'} label="Failed" value={fmt(n.failed)} hint={n.failed ? 'Retry from the button below' : 'None'} />
                        <StatTile icon={Mail} tone="blue" label="Delivery" value={campaign.deliveryMode === 'individual' ? 'Personal' : campaign.deliveryMode === 'batched' ? 'Batched' : '—'} hint={campaign.deliveryMode === 'individual' ? 'One email per person' : 'BCC batches of 45'} />
                    </div>
                    {!n.individual && (
                        <p className="text-[12px] text-gray-500">Sent in BCC batches, so opens and clicks are counted overall rather than per person. Use merge tags or "Send individually" to see who opened.</p>
                    )}
                    <dl className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] text-[13px] dark:divide-white/[0.05] dark:border-white/[0.08]">
                        {[
                            ['From', `${campaign.senderName || 'Newbi'} <${campaign.senderEmail || 'partnership@newbi.live'}>`],
                            ['Audience', campaign.audience?.label || campaign.recipientType || '—'],
                            ['Started', formatWhen(campaign.sentAt) || '—'],
                            ['Finished', formatWhen(campaign.completedAt) || (state === 'sending' ? 'Still sending' : '—')],
                            campaign.lastRetryAt && ['Last retry', formatWhen(campaign.lastRetryAt)],
                            (campaign.invalidCount || campaign.duplicateCount) && ['Skipped', `${fmt(campaign.invalidCount)} invalid, ${fmt(campaign.duplicateCount)} duplicates`],
                        ].filter(Boolean).map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-4 px-4 py-2.5"><dt className="shrink-0 font-bold text-gray-500">{k}</dt><dd className="min-w-0 break-words text-right font-semibold">{v}</dd></div>
                        ))}
                    </dl>
                    {state === 'interrupted' && (
                        <p className={cn('rounded-xl p-3 text-[13px] font-semibold', accent('orange').soft, accent('orange').text)}>
                            Sending stopped part-way (the tab was probably closed). {fmt(n.sent)} were sent before it stopped. The rest weren't recorded, so check the list before sending again.
                        </p>
                    )}
                    {campaign.errors?.length > 0 && (
                        <details className="rounded-xl border border-black/[0.06] p-3 text-[12px] dark:border-white/[0.08]">
                            <summary className="cursor-pointer font-semibold">Errors ({campaign.errors.length})</summary>
                            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto break-all text-gray-500">{campaign.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                        </details>
                    )}
                </div>
            )}

            {tab === 'people' && (
                <div className="space-y-3">
                    <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <SegmentedTabs value={people} onChange={setPeople} items={PEOPLE_FILTERS.map(f => ({ value: f, label: PEOPLE_LABEL[f], count: f === 'all' ? rows.length : rows.filter(r => r[f]).length }))} />
                    </div>
                    <div className="flex gap-2">
                        <SearchInput value={search} onChange={setSearch} placeholder="Name or email" className="flex-1" />
                        <ExportMenu getSpec={() => ({
                            filename: `campaign_${people}_${fileDate()}`,
                            sheetName: 'People',
                            title: campaign.subject || 'Campaign',
                            subtitle: exportSubtitle(shownPeople.length, 'person', PEOPLE_LABEL[people]),
                            rows: shownPeople,
                            columns: [
                                { header: 'Email', value: r => r.email },
                                { header: 'Name', value: r => r.name },
                                { header: 'Opened', value: r => (r.opened ? 'Yes' : '') },
                                { header: 'Clicked', value: r => (r.clicked ? 'Yes' : '') },
                                { header: 'Failed', value: r => (r.failed ? 'Yes' : '') },
                                { header: 'Unsubscribed', value: r => (r.unsubscribed ? 'Yes' : '') },
                            ],
                        })} />
                    </div>
                    {campaign.recipientsTruncated && people === 'all' && <p className="text-[12px] text-gray-500">Large send: the first 2,000 recipients are listed.</p>}
                    {shownPeople.length === 0 ? (
                        <EmptyState icon={Inbox} title="No one here yet" description={people === 'opened' && !n.individual ? 'This email went out in batches, so opens aren\'t tied to people.' : undefined} />
                    ) : (
                        <ul className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                            {shownPeople.slice(0, 300).map(r => (
                                <li key={r.email} className="flex items-center gap-3 px-3 py-2.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-semibold">{r.name || r.email}</p>
                                        {r.name && <p className="truncate text-[12px] text-gray-500">{r.email}</p>}
                                    </div>
                                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                        {r.opened && <Badge tone="green">Opened</Badge>}
                                        {r.clicked && <Badge tone="cyan">Clicked</Badge>}
                                        {r.failed && <Badge tone="red">Failed</Badge>}
                                        {r.unsubscribed && <Badge tone="amber">Unsubscribed</Badge>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {shownPeople.length > 300 && <p className="text-center text-[12px] text-gray-500">Showing 300 of {fmt(shownPeople.length)}. Export to see everyone.</p>}
                </div>
            )}

            {tab === 'links' && (
                (campaign.clickedUrls || []).length === 0 ? (
                    <EmptyState icon={MousePointerClick} tone="cyan" title="No clicks yet" description="Links people click in this email show up here." />
                ) : (
                    <ul className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                        {campaign.clickedUrls.map(url => (
                            <li key={url}>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-[13px] font-semibold hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                                    <ExternalLink size={14} className="shrink-0 text-cyan-600 dark:text-cyan-300" />
                                    <span className="min-w-0 flex-1 truncate">{url}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                )
            )}

            {tab === 'preview' && (
                previewHtml ? (
                    <EmailPreview html={previewHtml} subject={campaign.subject} preheader={campaign.preheader || stripHtml(campaign.messageBody).slice(0, 110)} fromName={campaign.senderName} fromEmail={campaign.senderEmail} theme={campaign.theme || 'light'} />
                ) : (
                    <EmptyState icon={Mail} title="Email not saved" description="Campaigns sent before the new mailing page didn't keep a copy of the message." />
                )
            )}
        </Sheet>
    );
};

/* ---------- List ---------- */

const CampaignHistory = ({ campaigns, openId, onOpen, onClose, onReuse, onRetry, onDelete, onCompose }) => {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [category, setCategory] = useState('all');
    const [view, setView] = useViewMode('mailing_history', 'list');

    const enriched = useMemo(() => (campaigns || []).map(c => ({ c, state: campaignState(c), n: campaignNumbers(c) })), [campaigns]);

    const kpis = useMemo(() => {
        let sent = 0; let indivBase = 0; let indivOpens = 0; let indivClicks = 0; let unsubs = 0;
        enriched.forEach(({ n }) => {
            sent += n.sent;
            unsubs += n.unsubscribes;
            if (n.individual) { indivBase += n.sent || n.total; indivOpens += n.uniqueOpens; indivClicks += n.uniqueClicks; }
        });
        return {
            sent,
            unsubs,
            openRate: indivBase ? (indivOpens / indivBase) * 100 : null,
            clickRate: indivBase ? (indivClicks / indivBase) * 100 : null,
        };
    }, [enriched]);

    const categories = useMemo(() => [...new Set((campaigns || []).map(c => c.category || 'OFFICIAL'))].sort(), [campaigns]);
    const counts = useMemo(() => ({
        all: enriched.length,
        sent: enriched.filter(e => e.state === 'sent').length,
        attention: enriched.filter(e => needsAttention(e.state)).length,
        stopped: enriched.filter(e => e.state === 'stopped').length,
    }), [enriched]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return enriched
            .filter(({ c, state }) => {
                if (status === 'sent' && state !== 'sent' && state !== 'sending') return false;
                if (status === 'attention' && !needsAttention(state)) return false;
                if (status === 'stopped' && state !== 'stopped') return false;
                if (category !== 'all' && (c.category || 'OFFICIAL') !== category) return false;
                if (!q) return true;
                return [c.subject, c.senderEmail, c.senderName, c.id, c.category].some(v => String(v || '').toLowerCase().includes(q))
                    || (c.recipients || []).some(r => r.email?.includes(q));
            })
            .sort((a, b) => campaignTime(b.c) - campaignTime(a.c));
    }, [enriched, search, status, category]);

    const openCampaign = (campaigns || []).find(c => c.id === openId) || null;

    const actions = (c) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            <MenuItem icon={BarChart3} onClick={() => onOpen(c.id)}>View report</MenuItem>
            {(c.messageBody || c.headerText) && <MenuItem icon={Copy} hint="Opens it in the composer" onClick={() => onReuse(c)}>Reuse</MenuItem>}
            {canRetryCampaign(c) && <MenuItem icon={RotateCcw} onClick={() => onRetry(c)}>Retry failed</MenuItem>}
            <MenuItem icon={Trash2} danger onClick={() => onDelete(c)}>Delete record</MenuItem>
        </Menu>
    );

    const exportSpec = () => ({
        filename: `email_campaigns_${fileDate()}`,
        sheetName: 'Campaigns',
        title: 'Email campaigns',
        subtitle: exportSubtitle(rows.length, 'campaign'),
        rows,
        totals: { sent: true },
        columns: [
            { header: 'Sent', type: 'datetime', value: r => r.c.sentAt || null },
            { header: 'Subject', value: r => r.c.subject || '' },
            { header: 'Category', value: r => categoryLabel(r.c.category) },
            { header: 'Status', value: r => CAMPAIGN_STATE[r.state].label },
            { header: 'From', value: r => r.c.senderEmail || '' },
            { header: 'Audience', value: r => r.c.audience?.label || r.c.recipientType || '' },
            { header: 'Recipients', type: 'number', value: r => r.n.total },
            { header: 'Delivered', key: 'sent', type: 'number', value: r => r.n.sent },
            { header: 'Failed', type: 'number', value: r => r.n.failed },
            { header: 'Opens', type: 'number', value: r => r.n.opens },
            { header: 'Unique opens', type: 'number', value: r => (r.n.individual ? r.n.uniqueOpens : null) },
            { header: 'Clicks', type: 'number', value: r => r.n.clicks },
            { header: 'Unsubscribes', type: 'number', value: r => r.n.unsubscribes },
        ],
    });

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile icon={Mail} tone="fuchsia" label="Campaigns" value={fmt(enriched.length)} hint={counts.attention ? `${counts.attention} need attention` : 'All delivered'} onClick={() => setStatus(counts.attention ? 'attention' : 'all')} active={status === 'attention'} />
                <StatTile icon={Send} tone="blue" label="Emails delivered" value={fmt(kpis.sent)} hint="Across every campaign" />
                <StatTile icon={Eye} tone="green" label="Open rate" value={pct(kpis.openRate)} hint={kpis.clickRate === null ? 'Shown for personal sends' : `${pct(kpis.clickRate)} clicked`} />
                <StatTile icon={UserX} tone="amber" label="Unsubscribes" value={fmt(kpis.unsubs)} hint="From campaign emails" />
            </div>

            <RecentActivity />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SearchInput value={search} onChange={setSearch} placeholder="Subject, sender or recipient email" className="lg:w-96" />
                <div className="flex flex-1 items-center gap-2">
                    <Select value={category} onChange={setCategory} label="Category" className="flex-1 lg:w-48 lg:flex-none" options={[{ value: 'all', label: 'All categories' }, ...categories.map(c => ({ value: c, label: categoryLabel(c) }))]} />
                    <ExportMenu getSpec={exportSpec} />
                    <ViewToggle value={view} onChange={setView} />
                </div>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs value={status} onChange={setStatus} items={STATUS_FILTERS.filter(f => f.value === 'all' || f.value === status || counts[f.value] > 0).map(f => ({ ...f, count: counts[f.value], highlight: f.value === 'attention' && counts.attention > 0 }))} />
            </div>

            {rows.length === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState
                        icon={Inbox}
                        title={enriched.length ? 'No matching campaigns' : 'No campaigns yet'}
                        description={enriched.length ? 'Try another search or filter.' : 'Emails you send from the composer show up here with opens and clicks.'}
                        action={!enriched.length && <Button variant="accent" onClick={onCompose}><Send size={14} /> Write an email</Button>}
                    />
                </Card>
            ) : view === 'cards' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map(({ c, state, n }) => (
                        <Card key={c.id} className="relative flex flex-col rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Badge tone={CAMPAIGN_STATE[state].tone}>{CAMPAIGN_STATE[state].label}</Badge>
                                <Badge tone={CATEGORY_TONE[c.category] || 'fuchsia'}>{categoryLabel(c.category)}</Badge>
                            </div>
                            <button type="button" onClick={() => onOpen(c.id)} className="mt-3 min-w-0 text-left after:absolute after:inset-0">
                                <p className="line-clamp-2 text-[16px] font-extrabold leading-snug">{c.subject || 'Untitled'}</p>
                                <p className="mt-1 truncate text-[12px] text-gray-500">{formatWhen(c.sentAt)} · {fmt(n.sent)} delivered</p>
                            </button>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <RateBar label={n.openRate === null ? 'Opens' : 'Opened'} value={n.openRate} tone="green" detail={fmt(n.opens)} />
                                <RateBar label={n.clickRate === null ? 'Clicks' : 'Clicked'} value={n.clickRate} tone="cyan" detail={fmt(n.clicks)} />
                            </div>
                            <div className="relative z-10 mt-4 flex items-center justify-end gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                {canRetryCampaign(c) && <Button size="sm" variant="secondary" className="h-10 flex-1" onClick={() => onRetry(c)}><RotateCcw size={13} /> Retry failed</Button>}
                                {actions(c)}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="overflow-hidden rounded-2xl">
                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                        {rows.map(({ c, state, n }) => (
                            <li key={c.id} className="relative transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                                    <button type="button" onClick={() => onOpen(c.id)} className="min-w-0 text-left after:absolute after:inset-0 lg:after:hidden">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-[15px] font-bold">{c.subject || 'Untitled'}</span>
                                            <Badge tone={CAMPAIGN_STATE[state].tone}>{CAMPAIGN_STATE[state].label}</Badge>
                                        </span>
                                        <span className="mt-0.5 block truncate text-[12px] text-gray-500">
                                            {categoryLabel(c.category)} · {formatWhen(c.sentAt)} · {fmt(n.sent)} delivered{n.failed ? ` · ${fmt(n.failed)} failed` : ''}
                                        </span>
                                    </button>
                                    <div className="hidden grid-cols-2 gap-4 lg:grid">
                                        <RateBar label={n.openRate === null ? 'Opens' : 'Opened'} value={n.openRate} tone="green" detail={fmt(n.opens)} />
                                        <RateBar label={n.clickRate === null ? 'Clicks' : 'Clicked'} value={n.clickRate} tone="cyan" detail={fmt(n.clicks)} />
                                    </div>
                                    <div className="relative z-10 flex items-center gap-1">
                                        <Button size="sm" variant="secondary" className="hidden h-10 lg:inline-flex" onClick={() => onOpen(c.id)}>Report</Button>
                                        {actions(c)}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <CampaignReport campaign={openCampaign} onClose={onClose} onReuse={onReuse} onRetry={onRetry} onDelete={onDelete} />
        </div>
    );
};

export default CampaignHistory;
