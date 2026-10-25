import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import MessagesSquare from 'lucide-react/dist/esm/icons/messages-square';
import Send from 'lucide-react/dist/esm/icons/send';
import History from 'lucide-react/dist/esm/icons/history';
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import { Card, Button, Badge, EmptyState, SegmentedTabs, Select } from '../../components/admin/ui';
import { fieldCls } from '../../components/admin/uploads/UploadKit';
import InboxPanel from '../../components/admin/campaigns/outreach/InboxPanel';
import { callOutreach } from '../../components/admin/campaigns/outreach/outreachApi';
import { when } from '../../components/admin/campaigns/outreach/parts';
import { ConfirmSheet } from '../../components/admin/campaigns/parts';
import { FIELDS, fieldsFor, isAuto, token, fillTokens } from '../../lib/outreach/waFields';
import { STATUSES, STATUS_META, isOnShortlist } from '../../lib/outreach/status';
import { waText as formatted } from '../../components/admin/whatsapp/waText';
import ThemedSelect from '../../components/admin/ThemedSelect';

/*
 * The WhatsApp center (/admin/whatsapp): every conversation on the Newbi
 * number, sending an approved template by hand (to the team or any number),
 * the log of everything sent (the automatic messages and the manual ones),
 * and the templates with their review status. Server: api/_lib/whatsappCenter.js
 * and the outreach inbox. Most messages go out on their own (tickets, passes,
 * shortlists, payouts); this page is for watching them and the exceptions.
 */

const STATUS_TONE = { APPROVED: 'green', PENDING: 'amber', IN_APPEAL: 'amber', REJECTED: 'rose', PAUSED: 'rose', DISABLED: 'gray' };
const SEND_TONE = { sent: 'blue', delivered: 'teal', read: 'green', failed: 'rose', retry: 'amber', held: 'amber', skipped: 'gray' };

const statusLabel = (s) => String(s || '').toLowerCase().replace(/_/g, ' ');

/* Where a send came from, in words. */
const eventLabel = (e = '') => {
    if (e === 'admin-manual') return 'Sent by hand';
    if (e === 'admin-bulk') return 'Sent to many (campaign message)';
    if (e.startsWith('outreach-')) return 'Campaign outreach';
    if (e.startsWith('otp-')) return 'Sign-in code';
    if (e === 'creator-verification') return 'Number check';
    return e ? `Automatic · ${e.replace(/-/g, ' ')}` : 'Automatic';
};

const fill = (text, values) => String(text || '').replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] || `{{${n}}}`);

const useTemplates = () => {
    const [state, setState] = useState({ loading: true, templates: [], error: '' });
    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true }));
        const r = await callOutreach('wa-templates');
        setState({ loading: false, templates: r.ok ? r.data.templates : [], error: r.ok ? '' : r.error, unavailable: !r.ok && r.status === 503 });
    }, []);
    useEffect(() => { load(); }, [load]);
    return [state, load];
};

/* ── Send a template ──────────────────────────────────────────────────── */

const MAX_RECIPIENTS = 50;
const AUDIENCE_FILTERS = [
    { value: 'shortlist', label: 'On the shortlist' },
    { value: 'all', label: 'Everyone who applied' },
    ...STATUSES.map(s => ({ value: s, label: STATUS_META[s].label })),
];

/* Each variable's value: {first_name}-style when it can be filled in for each person, else what was typed (or ''). */
const autofill = (fields, aud, current = null) => fields.map((k, i) => {
    const prev = current?.[i];
    if (prev !== undefined && prev !== null && prev !== '' && !/^\{[a-z_]+\}$/.test(prev)) return prev;
    return k && isAuto(k, aud) ? token(k) : '';
});

const SendPanel = ({ templatesState, prefill, onSent }) => {
    const addToast = useStore(s => s.addToast);
    const campaigns = useStore(s => s.campaigns);
    const approved = templatesState.templates.filter(t => t.status === 'APPROVED');
    const [key, setKey] = useState('');
    const [body, setBody] = useState([]);
    const [headerUrl, setHeaderUrl] = useState('');
    const [headerText, setHeaderText] = useState('');
    const [buttons, setButtons] = useState({});
    const [team, setTeam] = useState({ loading: true, members: [] });
    const [picked, setPicked] = useState(() => new Set());
    const [others, setOthers] = useState('');
    const [campaignId, setCampaignId] = useState('');
    const [applicants, setApplicants] = useState({ loading: false, list: [], groupLink: '' });
    const [appPicked, setAppPicked] = useState(() => new Set());
    const [audienceFilter, setAudienceFilter] = useState('shortlist');
    const [confirming, setConfirming] = useState(false);
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState(null);
    const [lastRecipients, setLastRecipients] = useState({});

    useEffect(() => {
        callOutreach('wa-team').then(r => setTeam({ loading: false, members: r.ok ? r.data.team : [], error: r.ok ? '' : r.error }));
    }, []);
    // The campaign list comes from the admin store; open it here when this is the first page visited.
    useEffect(() => {
        if (campaigns.length) return undefined;
        const unsub = useStore.getState().subscribeToCampaigns?.();
        return () => { if (typeof unsub === 'function') unsub(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!prefill) return;
        if (prefill.phone) setOthers(prefill.phone);
        if (prefill.campaignId) {
            setCampaignId(prefill.campaignId);
            setAppPicked(new Set(prefill.appIds || []));
            setAudienceFilter(prefill.appIds?.length ? 'all' : 'shortlist');
        }
        if (prefill.template) {
            const t = approved.find(x => x.name === prefill.template);
            if (t) setKey(`${t.name}|${t.language}`);
        }
    }, [prefill, templatesState.loading]); // eslint-disable-line react-hooks/exhaustive-deps

    // A campaign's applicants, through the outreach API (it checks the role and never exposes more than this list).
    useEffect(() => {
        if (!campaignId) { setApplicants({ loading: false, list: [], groupLink: '' }); return; }
        let live = true;
        setApplicants(a => ({ ...a, loading: true }));
        callOutreach('outreach-list', { campaignId }).then(r => {
            if (!live) return;
            setApplicants({ loading: false, list: r.ok ? r.data.applications : [], groupLink: r.ok ? r.data.settings?.whatsappGroupLink || '' : '', error: r.ok ? '' : r.error });
        });
        return () => { live = false; };
    }, [campaignId]);

    const tpl = approved.find(t => `${t.name}|${t.language}` === key) || null;
    const fields = useMemo(() => (tpl ? fieldsFor(tpl) : { body: [], button: null }), [tpl]);
    const aud = { campaign: Boolean(campaignId), applicants: appPicked.size > 0 };

    useEffect(() => {
        setBody(tpl ? autofill(fields.body, aud) : []);
        setButtons(tpl && fields.button && isAuto(fields.button, aud) ? Object.fromEntries(tpl.buttons.filter(b => b.dynamic).map(b => [b.index, token(fields.button)])) : {});
        setHeaderUrl(''); setHeaderText(''); setConfirming(false); setResults(null);
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
    // Choosing a campaign or applicants can make more fields fill themselves; what was typed stays.
    useEffect(() => {
        if (!tpl) return;
        setBody(b => autofill(fields.body, aud, b));
        if (fields.button && isAuto(fields.button, aud)) {
            setButtons(x => ({ ...Object.fromEntries(tpl.buttons.filter(b => b.dynamic).map(b => [b.index, x[b.index] || token(fields.button)])) }));
        }
    }, [aud.campaign, aud.applicants]); // eslint-disable-line react-hooks/exhaustive-deps

    const campaign = campaigns.find(c => c.id === campaignId) || null;
    const shownApplicants = applicants.list.filter(a => {
        const st = a.status || 'applied';
        if (audienceFilter === 'shortlist') return isOnShortlist(st);
        if (audienceFilter === 'all') return st !== 'removed';
        return st === audienceFilter;
    });
    const otherPhones = others.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const recipients = [
        ...[...picked].map(id => ({ key: `team:${id}`, type: 'team', id })),
        ...[...appPicked].map(appId => ({ key: `app:${campaignId}:${appId}`, type: 'applicant', campaignId, appId })),
        ...otherPhones.map(phone => ({ key: `phone:${phone}`, type: 'phone', phone })),
    ];
    const reachable = team.members.filter(m => m.phone);
    const tooMany = recipients.length > MAX_RECIPIENTS;
    const ready = tpl && recipients.length > 0 && !tooMany && body.every(v => v.trim())
        && tpl.buttons.filter(b => b.dynamic).every(b => String(buttons[b.index] || '').trim())
        && (tpl.header?.format !== 'DOCUMENT' || /^https:\/\//.test(headerUrl))
        && !(tpl.header?.format === 'TEXT' && tpl.header.vars && !headerText.trim());

    // What the preview fills the {tokens} with: the first person on the list, else examples.
    const sampleApp = applicants.list.find(a => appPicked.has(a.id));
    const sampleMember = team.members.find(m => picked.has(m.id));
    const sampleName = sampleApp?.fullName || sampleMember?.name || '';
    const sample = {
        ...Object.fromEntries(Object.entries(FIELDS).map(([k, f]) => [k, f.example])),
        ...(sampleName ? { first_name: sampleName.split(/\s+/)[0], full_name: sampleName } : {}),
        ...(campaign ? { campaign_title: campaign.title, campaign_id: campaign.id } : {}),
        ...(applicants.groupLink ? { group_link: applicants.groupLink } : {}),
        ...(sampleApp?.city ? { city: sampleApp.city } : {}),
    };

    const toggle = (id) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const toggleApp = (id) => setAppPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const allShownPicked = shownApplicants.length > 0 && shownApplicants.every(a => appPicked.has(a.id));

    const send = async (list) => {
        setSending(true);
        const r = await callOutreach('wa-send', {
            template: tpl.name, language: tpl.language, recipients: list.map(({ key: _k, ...rest }) => rest),
            params: { body, buttons, headerUrl: headerUrl.trim() || undefined, headerText: headerText.trim() || undefined, campaignId: campaignId || undefined },
        });
        setSending(false);
        setConfirming(false);
        if (!r.ok) { addToast(r.error, 'error', { title: 'Not sent' }); return; }
        setResults(r.data.results);
        setLastRecipients(Object.fromEntries(list.map(x => [x.key, x])));
        addToast(`${r.data.sent} of ${list.length} sent.`, r.data.sent ? 'success' : 'warning', { title: `“${tpl.name}” sent` });
        onSent?.();
    };
    const rest = (results || []).filter(x => x.retry && lastRecipients[x.key]).map(x => lastRecipients[x.key]);

    if (templatesState.loading) return <Card className="p-6 text-[13px] text-gray-500">Loading templates…</Card>;
    if (!approved.length) {
        return (
            <Card className="p-6">
                <EmptyState icon={LayoutTemplate} title="No approved templates yet" description="WhatsApp only lets a business start a conversation with a template Meta has approved. They’re listed on the Templates tab; this fills in as Meta approves them." />
            </Card>
        );
    }

    const fieldHint = (k, value, onUse) => {
        if (!k) return null;
        const f = FIELDS[k];
        if (/^\{[a-z_]+\}$/.test(value)) {
            return <span className="text-[12px] text-emerald-700 dark:text-neon-green">Filled in for each person · <button type="button" className="font-semibold underline" onClick={() => onUse('')}>type it instead</button></span>;
        }
        if (isAuto(k, aud)) return <button type="button" className="text-[12px] font-semibold text-emerald-700 dark:text-neon-green" onClick={() => onUse(token(k))}>Use each person’s {f.label.toLowerCase()}</button>;
        if (f?.auto === 'campaign') return <span className="text-[12px] text-gray-500">Choose a campaign below to fill this in.</span>;
        if (f?.auto === 'applicant') return <span className="text-[12px] text-gray-500">Pick campaign applicants below to fill this in for each.</span>;
        return null;
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="space-y-5 p-5">
                <label className="block space-y-1.5">
                    <span className="text-[13px] font-bold">Template</span>
                    <ThemedSelect className={fieldCls} value={key} onChange={e => setKey(e.target.value)}>
                        <option value="">Choose an approved template</option>
                        {approved.map(t => <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>{t.name} · {t.language} · {statusLabel(t.category)}</option>)}
                    </ThemedSelect>
                </label>

                {tpl && (
                    <>
                        {tpl.header?.format === 'IMAGE' && (
                            <label className="block space-y-1.5">
                                <span className="text-[13px] font-bold">Header image link <span className="font-normal text-gray-500">(optional: its Newbi card is used otherwise)</span></span>
                                <input className={fieldCls} value={headerUrl} onChange={e => setHeaderUrl(e.target.value)} placeholder="https://…jpg" inputMode="url" />
                            </label>
                        )}
                        {tpl.header?.format === 'DOCUMENT' && (
                            <label className="block space-y-1.5">
                                <span className="text-[13px] font-bold">PDF link</span>
                                <input className={fieldCls} value={headerUrl} onChange={e => setHeaderUrl(e.target.value)} placeholder="https://…pdf" inputMode="url" />
                            </label>
                        )}
                        {tpl.header?.format === 'TEXT' && tpl.header.vars > 0 && (
                            <label className="block space-y-1.5">
                                <span className="text-[13px] font-bold">Header text</span>
                                <input className={fieldCls} value={headerText} onChange={e => setHeaderText(e.target.value)} maxLength={60} />
                            </label>
                        )}
                        {body.map((v, i) => {
                            const k = fields.body[i];
                            const set = (val) => setBody(b => b.map((x, j) => (j === i ? val : x)));
                            return (
                                <div key={i} className="space-y-1.5">
                                    <label className="block space-y-1.5">
                                        <span className="text-[13px] font-bold">{`{{${i + 1}}}`}{k ? <span className="font-normal text-gray-500"> · {FIELDS[k]?.label || k}</span> : null}</span>
                                        <input className={fieldCls} value={v} onChange={e => set(e.target.value)} placeholder={tpl.examples[i] ? `e.g. ${tpl.examples[i]}` : (k && FIELDS[k] ? `e.g. ${FIELDS[k].example}` : '')} maxLength={900} />
                                    </label>
                                    {fieldHint(k, v, set)}
                                </div>
                            );
                        })}
                        {tpl.buttons.filter(b => b.dynamic).map(b => {
                            const set = (val) => setButtons(x => ({ ...x, [b.index]: val }));
                            return (
                                <div key={b.index} className="space-y-1.5">
                                    <label className="block space-y-1.5">
                                        <span className="text-[13px] font-bold">“{b.text}” link ending{fields.button ? <span className="font-normal text-gray-500"> · {FIELDS[fields.button]?.label}</span> : null}</span>
                                        <input className={fieldCls} value={buttons[b.index] || ''} onChange={e => set(e.target.value)} placeholder={b.url.replace('{{1}}', '…')} />
                                    </label>
                                    {fieldHint(fields.button, buttons[b.index] || '', set)}
                                </div>
                            );
                        })}
                        <p className="text-[12px] text-gray-500">Fields like <code>{'{first_name}'}</code> are filled in for each person. You can also type them into any field.</p>
                    </>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold">Team</span>
                        {reachable.length > 0 && (
                            <button type="button" className="text-[12.5px] font-semibold text-emerald-700 dark:text-neon-green" onClick={() => setPicked(picked.size === reachable.length ? new Set() : new Set(reachable.map(m => m.id)))}>
                                {picked.size === reachable.length ? 'Clear' : 'Select all with WhatsApp'}
                            </button>
                        )}
                    </div>
                    {team.loading && <p className="text-[13px] text-gray-500">Loading the team…</p>}
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                        {team.members.map(m => (
                            <li key={m.id}>
                                <label className={cn('flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2 text-[13px]', m.phone ? 'cursor-pointer border-black/10 dark:border-white/10' : 'border-dashed border-black/10 opacity-60 dark:border-white/10')}>
                                    <input type="checkbox" disabled={!m.phone} checked={picked.has(m.id)} onChange={() => toggle(m.id)} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold">{m.name}</span>
                                        <span className="block truncate text-[12px] text-gray-500">{m.phone || 'No verified number on their account'} · {m.role}</span>
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="space-y-2">
                    <span className="block text-[13px] font-bold">Campaign <span className="font-normal text-gray-500">(fills in the campaign’s details, and lets you message its applicants)</span></span>
                    <div className="flex flex-wrap gap-2">
                        <Select
                            label="Campaign"
                            className="w-full sm:w-72"
                            value={campaignId}
                            onChange={(v) => { setCampaignId(v); setAppPicked(new Set()); }}
                            options={[{ value: '', label: 'No campaign' }, ...[...campaigns].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(c => ({ value: c.id, label: c.title || c.name || c.id }))]}
                        />
                        {campaignId && <Select label="Who" className="w-full sm:w-56" value={audienceFilter} onChange={setAudienceFilter} options={AUDIENCE_FILTERS} />}
                    </div>
                    {campaignId && applicants.loading && <p className="text-[13px] text-gray-500">Loading applicants…</p>}
                    {campaignId && applicants.error && <p className="text-[13px] text-rose-600">{applicants.error}</p>}
                    {campaignId && !applicants.loading && !applicants.error && (
                        shownApplicants.length ? (
                            <>
                                <div className="flex items-center justify-between gap-2 text-[12.5px]">
                                    <span className="text-gray-500">{appPicked.size} of {applicants.list.length} applicants picked</span>
                                    <button type="button" className="font-semibold text-emerald-700 dark:text-neon-green" onClick={() => setAppPicked(p => {
                                        const n = new Set(p);
                                        shownApplicants.forEach(a => (allShownPicked ? n.delete(a.id) : n.add(a.id)));
                                        return n;
                                    })}>
                                        {allShownPicked ? 'Clear these' : `Select all ${shownApplicants.length}`}
                                    </button>
                                </div>
                                <ul className="grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
                                    {shownApplicants.map(a => (
                                        <li key={a.id}>
                                            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-black/10 px-3 py-2 text-[13px] dark:border-white/10">
                                                <input type="checkbox" checked={appPicked.has(a.id)} onChange={() => toggleApp(a.id)} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-semibold">{a.fullName || 'No name'}</span>
                                                    <span className="block truncate text-[12px] text-gray-500">{STATUS_META[a.status || 'applied']?.label}{a.city ? ` · ${a.city}` : ''}{a.whatsappOptOut ? ' · stopped updates' : ''}</span>
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : <p className="text-[13px] text-gray-500">Nobody here yet.</p>
                    )}
                </div>

                <label className="block space-y-1.5">
                    <span className="text-[13px] font-bold">Other numbers <span className="font-normal text-gray-500">(one per line or comma-separated)</span></span>
                    <textarea className={cn(fieldCls, 'min-h-[72px] py-2.5')} value={others} onChange={e => setOthers(e.target.value)} placeholder="98765 43210" />
                </label>

                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="success" disabled={!ready || sending} onClick={() => setConfirming(true)}>
                        <Send size={14} /> {sending ? 'Sending…' : `Send to ${recipients.length || '…'}`}
                    </Button>
                    <p className="text-[12px] text-gray-500">{tooMany ? `Up to ${MAX_RECIPIENTS} people at a time: pick fewer.` : 'Each message is billed by Meta. People who replied STOP are skipped.'}</p>
                </div>

                {tpl && (
                    <ConfirmSheet
                        open={confirming}
                        onClose={() => setConfirming(false)}
                        title={`Send “${tpl.name}” to ${recipients.length}?`}
                        message="It goes out on WhatsApp straight away and can’t be taken back."
                        confirmLabel={`Send to ${recipients.length}`}
                        tone="success"
                        busy={sending}
                        onConfirm={() => send(recipients)}
                    >
                        <div className="whitespace-pre-wrap rounded-2xl bg-[#dcf8c6] p-3 text-[13.5px] text-gray-900 dark:bg-[#005c4b] dark:text-white">{formatted(fill(tpl.body, body.map(v => fillTokens(v, sample))))}</div>
                    </ConfirmSheet>
                )}

                {results && (
                    <div className="space-y-2">
                        {rest.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[13px]">
                                <span className="flex-1">{rest.length} weren’t sent yet: WhatsApp allows a few a minute.</span>
                                <Button size="sm" variant="success" disabled={sending} onClick={() => send(rest)}><Send size={13} /> Send the rest</Button>
                            </div>
                        )}
                        <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.06] dark:divide-white/[0.06] dark:border-white/[0.08]">
                            {results.map((r, i) => (
                                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                                    <span className="truncate">{r.label}</span>
                                    <span className="flex items-center gap-2">
                                        {r.error && <span className="text-[12px] text-gray-500">{r.error}</span>}
                                        <Badge tone={SEND_TONE[r.status] || 'gray'}>{r.status}</Badge>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Card>

            <Card className="h-fit p-4 lg:sticky lg:top-4">
                <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-gray-500">Preview{sampleName ? ` · for ${sampleName.split(/\s+/)[0]}` : ''}</p>
                {tpl ? (
                    <div className="rounded-2xl bg-[#efeae2] p-3 dark:bg-[#0b141a]">
                        <div className="overflow-hidden rounded-xl bg-white text-[14px] leading-snug text-gray-900 shadow-sm dark:bg-[#202c33] dark:text-white">
                            {tpl.header?.format === 'IMAGE' && <div className="flex aspect-[1.91/1] items-center justify-center bg-gray-200 text-[12px] text-gray-500 dark:bg-white/10">{headerUrl ? 'Your image' : 'Newbi card'}</div>}
                            {tpl.header?.format === 'DOCUMENT' && <div className="bg-gray-100 px-3 py-4 text-[12px] font-semibold dark:bg-white/10">PDF document</div>}
                            {tpl.header?.format === 'TEXT' && <p className="px-3 pt-2 font-bold">{fill(tpl.header.text, [fillTokens(headerText, sample)])}</p>}
                            <p className="whitespace-pre-wrap px-3 py-2">{formatted(fill(tpl.body, body.map(v => fillTokens(v, sample))))}</p>
                            {tpl.footer && <p className="px-3 pb-2 text-[12px] text-gray-500">{tpl.footer}</p>}
                            {tpl.buttons.map(b => <p key={b.index} className="border-t border-black/[0.06] py-2 text-center text-[13px] font-semibold text-sky-600 dark:border-white/10">{b.text}</p>)}
                        </div>
                    </div>
                ) : <p className="text-[13px] text-gray-500">Choose a template to see it here.</p>}
            </Card>
        </div>
    );
};

/* ── Sent log ─────────────────────────────────────────────────────────── */

const LogPanel = ({ refreshKey }) => {
    const [state, setState] = useState({ loading: true, rows: [] });
    const load = useCallback(async () => {
        const r = await callOutreach('wa-log', { limit: 150 });
        setState({ loading: false, rows: r.ok ? r.data.rows : [], error: r.ok ? '' : r.error });
    }, []);
    useEffect(() => { load(); }, [load, refreshKey]);
    return (
        <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
                <p className="text-[13px] text-gray-500">The latest 150 WhatsApp sends, automatic and by hand. Delivered and read update as WhatsApp reports them.</p>
                <Button size="sm" variant="ghost" onClick={load} aria-label="Refresh"><RefreshCw size={14} /></Button>
            </div>
            {state.loading && <p className="p-6 text-[13px] text-gray-500">Loading…</p>}
            {!state.loading && !state.rows.length && <EmptyState icon={History} title="Nothing sent yet" description="Tickets, passes, shortlists and payouts appear here as they go out." />}
            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {state.rows.map(r => (
                    <li key={r.id} className="grid gap-1 px-4 py-3 text-[13px] sm:grid-cols-[150px_120px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                        <span className="text-gray-500">{when(r.at)}</span>
                        <span className="font-mono text-[12px]">{r.to}</span>
                        <span className="min-w-0">
                            <span className="block truncate font-semibold">{r.template || 'Text reply'}</span>
                            <span className="block truncate text-[12px] text-gray-500">{eventLabel(r.event)}{r.error ? ` · ${r.error}` : ''}</span>
                        </span>
                        <Badge tone={SEND_TONE[r.status] || 'gray'}>{r.status === 'held' ? 'waiting' : r.status || '—'}</Badge>
                    </li>
                ))}
            </ul>
        </Card>
    );
};

/* ── Templates ────────────────────────────────────────────────────────── */

const TemplatesPanel = ({ state, reload }) => (
    <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-gray-500">From WhatsApp Manager. A template goes out automatically once Meta approves it and its <code>WHATSAPP_TEMPLATE_*</code> setting is on in Vercel.</p>
            <Button size="sm" variant="ghost" onClick={reload} aria-label="Refresh"><RefreshCw size={14} /></Button>
        </div>
        {state.loading && <Card className="p-6 text-[13px] text-gray-500">Loading…</Card>}
        <div className="grid gap-3 md:grid-cols-2">
            {state.templates.map(t => (
                <Card key={`${t.name}|${t.language}`} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-1 truncate font-mono text-[13px] font-bold">{t.name}</p>
                        <Badge tone={STATUS_TONE[t.status] || 'gray'}>{statusLabel(t.status)}</Badge>
                    </div>
                    <p className="text-[12px] text-gray-500">{statusLabel(t.category)} · {t.language}{t.header ? ` · ${statusLabel(t.header.format)} header` : ''}{t.buttons.length ? ` · ${t.buttons.length} button${t.buttons.length > 1 ? 's' : ''}` : ''}</p>
                    <p className="line-clamp-4 whitespace-pre-wrap text-[13px] text-gray-700 dark:text-zinc-300">{formatted(t.body)}</p>
                </Card>
            ))}
        </div>
    </div>
);

/* ── The number's state at Meta ───────────────────────────────────────── */

const NAME_STATUS = {
    APPROVED: 'Approved',
    AVAILABLE_WITHOUT_REVIEW: 'In use, no review needed',
    PENDING_REVIEW: 'Waiting for Meta’s review',
    DECLINED: 'Rejected',
    EXPIRED: 'Expired',
    NONE: 'Not submitted',
};
const QUALITY = { GREEN: 'High', YELLOW: 'Medium', RED: 'Low' };
const CAN_SEND = { AVAILABLE: 'Can send', LIMITED: 'Limited', BLOCKED: 'Blocked' };
const DOT = { green: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500', gray: 'bg-gray-400' };
const PING = { green: 'bg-emerald-400', amber: 'bg-amber-400', rose: 'bg-rose-400', gray: '' };
/* The pill's word for each state; the dropdown has the full story. */
const SHORT = { green: 'Sending', amber: 'Needs a look', rose: 'Not sending', gray: 'Unknown' };

/* "TIER_1K" → "1,000 people a day". */
const limitLabel = (tier) => {
    const m = String(tier || '').match(/^TIER_(\d+)(K)?$/i);
    if (m) return `${(Number(m[1]) * (m[2] ? 1000 : 1)).toLocaleString('en-IN')} people a day`;
    if (/UNLIMITED/i.test(tier || '')) return 'No daily limit';
    return tier ? String(tier).replace(/_/g, ' ').toLowerCase() : null;
};

const Fact = ({ label, children }) => (children ? (
    <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-[13px] font-semibold">{children}</p>
    </div>
) : null);

/*
 * Whether the number can send right now, as a dot by the tabs (green, amber,
 * red): Meta's health check, the display name and its review, quality and
 * limit, and how the last real message went (api/_lib/whatsappCenter.js,
 * wa-number). Clicking it opens the details.
 */
const NumberStatus = () => {
    const addToast = useStore(s => s.addToast);
    const [state, setState] = useState({ loading: true });
    const [pushing, setPushing] = useState(false);
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);
    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true }));
        const r = await callOutreach('wa-number');
        setState(r.ok ? { loading: false, ...r.data } : { loading: false, error: r.error });
        return r.ok ? r.data : null;
    }, []);
    // Send what's waiting now (it also runs on its own); held messages try again here too.
    const sendWaiting = useCallback(async ({ quiet = false } = {}) => {
        setPushing(true);
        const r = await callOutreach('outreach-queue-run');
        setPushing(false);
        if (!quiet) {
            if (!r.ok) addToast(r.error, 'error', { title: 'Couldn’t send' });
            else if (r.data.blocked) addToast('Meta is still refusing the number, so they keep waiting.', 'warning', { title: `${r.data.held} tried, still waiting` });
            else addToast(`${r.data.sent} sent${r.data.more ? ', the rest carry on in the background' : ''}.`, r.data.sent ? 'success' : 'info');
        }
        load();
    }, [addToast, load]);
    // Opening the page gives waiting messages a push.
    useEffect(() => { load().then(d => { if (d?.queue?.waiting) sendWaiting({ quiet: true }); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
    }, [open]);

    const { number: n, verdict: v, lastSend, queue } = state;
    const tone = state.error ? 'gray' : v?.tone || 'gray';
    const label = state.error ? 'Status unavailable' : v ? SHORT[tone] : 'Checking…';
    const waiting = queue?.waiting || 0;

    return (
        <div className="relative" ref={boxRef}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                aria-label={`WhatsApp number: ${v?.title || label}`}
                title={v?.title || label}
                className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors',
                    open ? 'border-black/15 bg-black/[0.04] dark:border-white/20 dark:bg-white/[0.06]' : 'border-black/10 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.04]',
                )}
            >
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                    {v && !state.error && tone !== 'gray' && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', PING[tone])} />}
                    <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', state.loading && !v ? 'animate-pulse bg-gray-300' : DOT[tone])} />
                </span>
                <span>{label}</span>
                {waiting > 0 && <span className="rounded-full bg-amber-500/15 px-1.5 text-[11.5px] text-amber-700 dark:text-amber-300">{waiting} waiting</span>}
                <ChevronDown size={14} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="absolute right-0 top-full z-40 mt-2 w-[min(400px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#14161d] dark:shadow-black/50" role="dialog" aria-label="WhatsApp number status">
                    {state.error ? (
                        <div className="space-y-3 p-4 text-[13px]">
                            <p className="text-gray-600 dark:text-zinc-400">Couldn’t read the number’s status from Meta: {state.error}</p>
                            <Button size="sm" variant="ghost" onClick={load} disabled={state.loading}><RefreshCw size={13} className={state.loading ? 'animate-spin' : undefined} /> Try again</Button>
                        </div>
                    ) : !v ? (
                        <p className="p-4 text-[13px] text-gray-500">Checking the number with Meta…</p>
                    ) : (
                        <>
                            <div className="flex items-start gap-3 p-4">
                                <span className={cn('mt-1 h-3 w-3 shrink-0 rounded-full ring-4', DOT[tone], { green: 'ring-emerald-500/15', amber: 'ring-amber-500/15', rose: 'ring-rose-500/15', gray: 'ring-gray-400/15' }[tone])} aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-bold">{v.title}</p>
                                    <p className="text-[12.5px] text-gray-500">{v.detail}</p>
                                </div>
                                <button type="button" onClick={load} disabled={state.loading} aria-label="Check again" title="Check again" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5">
                                    <RefreshCw size={14} className={state.loading ? 'animate-spin' : undefined} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 border-t border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
                                <Fact label="Display name">{n.verifiedName ? `${n.verifiedName}${n.nameStatus ? ` · ${NAME_STATUS[n.nameStatus] || n.nameStatus}` : ''}` : (NAME_STATUS[n.nameStatus] || n.nameStatus)}</Fact>
                                <Fact label="Meta says">{CAN_SEND[n.canSend] || n.canSend}</Fact>
                                <Fact label="Quality">{QUALITY[n.quality] || (n.quality && n.quality !== 'UNKNOWN' ? n.quality : null)}</Fact>
                                <Fact label="Limit">{limitLabel(n.limit)}</Fact>
                                {n.phone && <Fact label="Number">{n.phone}</Fact>}
                            </div>
                            {n.newNameStatus && n.newNameStatus !== 'NONE' && n.newNameStatus !== n.nameStatus && (
                                <p className="border-t border-black/[0.06] px-4 py-2.5 text-[12.5px] text-gray-500 dark:border-white/[0.08]">A new display name is {String(NAME_STATUS[n.newNameStatus] || n.newNameStatus).toLowerCase()}.</p>
                            )}
                            {n.issues?.length > 0 && (
                                <ul className="space-y-1.5 border-t border-black/[0.06] px-4 py-3 text-[12.5px] dark:border-white/[0.08]">
                                    {n.issues.map((x, i) => (
                                        <li key={i} className="rounded-xl bg-black/[0.03] px-3 py-2 dark:bg-white/[0.04]">
                                            <span className="font-semibold">{x.entity.charAt(0).toUpperCase() + x.entity.slice(1)}</span>: {x.text}
                                            {x.fix && <span className="block text-gray-500">{x.fix}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {waiting > 0 && (
                                <div className="flex items-center gap-3 border-t border-black/[0.06] bg-amber-500/[0.07] px-4 py-3 text-[12.5px] dark:border-white/[0.08]">
                                    <span className="flex-1">
                                        {waiting} message{waiting === 1 ? '' : 's'} waiting to go out
                                        {queue.held ? ` (${queue.held} held while Meta refuses the number)` : ''}
                                        {queue.nextAt ? ` · next try ${when(queue.nextAt)}` : ''}
                                    </span>
                                    <Button size="sm" variant="success" disabled={pushing} onClick={() => sendWaiting()}>{pushing ? 'Sending…' : 'Send now'}</Button>
                                </div>
                            )}
                            {lastSend && (
                                <p className="border-t border-black/[0.06] px-4 py-3 text-[12.5px] text-gray-500 dark:border-white/[0.08]">
                                    Last message {when(lastSend.at)}{lastSend.template ? ` (${lastSend.template})` : ''}: <span className={cn('font-semibold', lastSend.status === 'failed' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-neon-green')}>{lastSend.status}</span>
                                    {lastSend.status === 'failed' && lastSend.error ? ` · ${lastSend.error}` : ''}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

/* ── Page ─────────────────────────────────────────────────────────────── */

/* Other screens open the Send tab with people picked: navigate('/admin/whatsapp', { state: { whatsappSend: { campaignId, appIds, phone, template, at } } }). */

const WhatsAppCenter = () => {
    const location = useLocation();
    const handoff = location.state?.whatsappSend || null;
    const [tab, setTab] = useState(handoff ? 'send' : 'inbox');
    const [templatesState, reloadTemplates] = useTemplates();
    const [prefill, setPrefill] = useState(handoff);
    useEffect(() => { if (handoff) { setPrefill(handoff); setTab('send'); } }, [handoff?.at]); // eslint-disable-line react-hooks/exhaustive-deps
    const [logKey, setLogKey] = useState(0);
    const counts = useMemo(() => ({
        approved: templatesState.templates.filter(t => t.status === 'APPROVED').length,
        pending: templatesState.templates.filter(t => t.status === 'PENDING').length,
    }), [templatesState.templates]);

    if (templatesState.unavailable) {
        return <Card className="p-6 text-[14px] text-gray-600 dark:text-zinc-400">{templatesState.error} Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_WABA_ID in Vercel.</Card>;
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SegmentedTabs
                    value={tab}
                    onChange={setTab}
                    className="max-w-full overflow-x-auto"
                    items={[
                        { value: 'inbox', label: 'Inbox', icon: MessagesSquare },
                        { value: 'send', label: 'Send', icon: Send },
                        { value: 'log', label: 'Sent', icon: History },
                        { value: 'templates', label: 'Templates', icon: LayoutTemplate, count: templatesState.loading ? undefined : `${counts.approved}/${templatesState.templates.length}`, highlight: counts.pending > 0 },
                    ]}
                />
                <div className="flex flex-wrap items-center justify-end gap-3">
                    {counts.pending > 0 && <p className="text-[12.5px] text-gray-500">{counts.pending} template{counts.pending > 1 ? 's' : ''} waiting for Meta’s review</p>}
                    <NumberStatus />
                </div>
            </div>
            {tab === 'inbox' && <InboxPanel configured onCompose={(p) => { setPrefill({ ...p, at: Date.now() }); setTab('send'); }} />}
            {tab === 'send' && <SendPanel templatesState={templatesState} prefill={prefill} onSent={() => setLogKey(k => k + 1)} />}
            {tab === 'log' && <LogPanel refreshKey={logKey} />}
            {tab === 'templates' && <TemplatesPanel state={templatesState} reload={reloadTemplates} />}
        </div>
    );
};

export default WhatsAppCenter;
