import React, { useEffect, useMemo, useState } from 'react';
import SquarePen from 'lucide-react/dist/esm/icons/square-pen';
import Send from 'lucide-react/dist/esm/icons/send';
import Search from 'lucide-react/dist/esm/icons/search';
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template';
import Users from 'lucide-react/dist/esm/icons/users';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Hash from 'lucide-react/dist/esm/icons/hash';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { Badge, Button, EmptyState, Select } from '../ui';
import { fieldCls } from '../uploads/UploadKit';
import { ConfirmSheet } from '../campaigns/parts';
import { callOutreach } from '../campaigns/outreach/outreachApi';
import { G, LINE, MUTED } from '../campaigns/outreach/InboxPanel';
import { FIELDS, fieldsFor, isAuto, token, fillTokens } from '../../../lib/outreach/waFields';
import { STATUSES, STATUS_META, isOnShortlist } from '../../../lib/outreach/status';
import { PaneHeader, Pills, PreviewWell, SEND_TONE, TemplateBubble, fill, statusLabel, templateTitle } from './centerParts';

/*
 * Sending an approved template by hand: to the team, a campaign's applicants
 * or any number (wa-send). Fields like {first_name} are filled in for each
 * person. Other screens open it with people picked (see WhatsAppCenter).
 */

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

const Step = ({ n, title, hint, done, children, action }) => (
    <section className={cn('rounded-3xl border p-4 sm:p-5', LINE)}>
        <div className="mb-3.5 flex items-center gap-3">
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-heading text-[13px] font-bold', done ? G.solid : G.chip)}>{done ? <CircleCheck size={15} /> : n}</span>
            <div className="min-w-0 flex-1">
                <p className="font-heading text-[15px] font-bold text-gray-900 dark:text-white">{title}</p>
                {hint && <p className={cn('text-[12.5px]', MUTED)}>{hint}</p>}
            </div>
            {action}
        </div>
        {children}
    </section>
);

const CheckRow = ({ checked, disabled, onChange, title, subtitle }) => (
    <label className={cn('flex min-h-[48px] items-center gap-3 rounded-2xl border px-3 py-2 text-[13px] transition-colors', disabled ? 'cursor-not-allowed border-dashed opacity-55' : 'cursor-pointer', checked ? cn(G.border, G.soft) : LINE)}>
        <input type="checkbox" className="h-4 w-4 accent-emerald-500" disabled={disabled} checked={checked} onChange={onChange} />
        <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-gray-900 dark:text-white">{title}</span>
            <span className={cn('block truncate text-[12px]', MUTED)}>{subtitle}</span>
        </span>
    </label>
);

const ComposePane = ({ templatesState, prefill, onSent, onClose }) => {
    const addToast = useStore(s => s.addToast);
    const campaigns = useStore(s => s.campaigns);
    const approved = templatesState.templates.filter(t => t.status === 'APPROVED');
    const [key, setKey] = useState('');
    const [pickQuery, setPickQuery] = useState('');
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
    const [who, setWho] = useState('team');
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
        if (prefill.phone) { setOthers(prefill.phone); setWho('numbers'); }
        if (prefill.campaignId) {
            setCampaignId(prefill.campaignId);
            setAppPicked(new Set(prefill.appIds || []));
            setAudienceFilter(prefill.appIds?.length ? 'all' : 'shortlist');
            setWho('campaign');
        }
        if (prefill.template) {
            const t = approved.find(x => x.name === prefill.template && (!prefill.language || x.language === prefill.language));
            if (t) setKey(`${t.name}|${t.language}`);
        }
    }, [prefill, templatesState.loading]); // eslint-disable-line react-hooks/exhaustive-deps

    // A campaign's applicants, through the outreach API (it checks the role and never exposes more than this list).
    useEffect(() => {
        if (!campaignId) { setApplicants({ loading: false, list: [], groupLink: '' }); return undefined; }
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
    const fieldsReady = tpl && body.every(v => v.trim())
        && tpl.buttons.filter(b => b.dynamic).every(b => String(buttons[b.index] || '').trim())
        && (tpl.header?.format !== 'DOCUMENT' || /^https:\/\//.test(headerUrl))
        && !(tpl.header?.format === 'TEXT' && tpl.header.vars && !headerText.trim());
    const ready = fieldsReady && recipients.length > 0 && !tooMany;

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
    const previewBody = tpl ? fill(tpl.body, body.map(v => fillTokens(v, sample))) : '';

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
        addToast(`${r.data.sent} of ${list.length} sent.`, r.data.sent ? 'success' : 'warning', { title: `“${templateTitle(tpl.name)}” sent` });
        onSent?.();
    };
    const rest = (results || []).filter(x => x.retry && lastRecipients[x.key]).map(x => lastRecipients[x.key]);

    const fieldHint = (k, value, onUse) => {
        if (!k) return null;
        const f = FIELDS[k];
        if (/^\{[a-z_]+\}$/.test(value)) {
            return <span className={cn('text-[12px] font-medium', G.text)}>Filled in for each person · <button type="button" className="font-bold underline" onClick={() => onUse('')}>type it instead</button></span>;
        }
        if (isAuto(k, aud)) return <button type="button" className={cn('text-[12px] font-bold', G.text)} onClick={() => onUse(token(k))}>Use each person’s {f.label.toLowerCase()}</button>;
        if (f?.auto === 'campaign') return <span className={cn('text-[12px]', MUTED)}>Choose a campaign under “Who gets it” to fill this in.</span>;
        if (f?.auto === 'applicant') return <span className={cn('text-[12px]', MUTED)}>Pick campaign applicants to fill this in for each.</span>;
        return null;
    };

    const hasFields = Boolean(tpl && (body.length > 0 || tpl.header || tpl.buttons.some(x => x.dynamic)));
    const pq = pickQuery.trim().toLowerCase();
    const pickable = approved.filter(t => !pq || [t.name, t.body].some(v => String(v || '').toLowerCase().includes(pq)));

    let content;
    if (templatesState.loading) content = <p className={cn('p-6 text-[13px]', MUTED)}>Loading templates…</p>;
    else if (!approved.length) {
        content = <EmptyState icon={LayoutTemplate} title="No approved templates yet" description="WhatsApp only lets a business start a conversation with a template Meta has approved. They’re listed under Templates and show up here as Meta approves them." />;
    } else {
        content = (
            // Two columns only when the pane itself is wide (the chat list takes 380px beside it).
            <div className="grid gap-5 p-4 sm:p-6 min-[1500px]:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-4">
                    {results && (
                        <section className={cn('space-y-2 rounded-3xl border p-4', LINE)}>
                            <p className="font-heading text-[15px] font-bold">Sent: {results.filter(r => r.status === 'sent').length} of {results.length}</p>
                            {rest.length > 0 && (
                                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-500/10 px-3 py-2 text-[13px]">
                                    <span className="flex-1">{rest.length} weren’t sent yet: WhatsApp allows a few a minute.</span>
                                    <Button size="sm" variant="primary" disabled={sending} onClick={() => send(rest)}><Send size={13} /> Send the rest</Button>
                                </div>
                            )}
                            <ul className="space-y-1">
                                {results.map((r, i) => (
                                    <li key={i} className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-[13px] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                                        <span className="truncate">{r.label}</span>
                                        <span className="flex items-center gap-2">
                                            {r.error && <span className={cn('text-[12px]', MUTED)}>{r.error}</span>}
                                            <Badge tone={SEND_TONE[r.status] || 'gray'}>{r.status}</Badge>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <Step
                        n={1}
                        title="Template"
                        hint={tpl ? `${statusLabel(tpl.category)} · ${tpl.language}` : 'Only templates Meta approved can start a conversation'}
                        done={Boolean(tpl)}
                        action={tpl && <Button size="sm" variant="ghost" onClick={() => setKey('')}>Change</Button>}
                    >
                        {tpl ? (
                            <p className="font-heading text-[16px] font-bold text-gray-900 dark:text-white">{templateTitle(tpl.name)}</p>
                        ) : (
                            <div className="space-y-2.5">
                                {approved.length > 5 && (
                                    <label className="flex h-10 items-center gap-2.5 rounded-xl bg-black/[0.04] px-3 dark:bg-white/[0.05]">
                                        <Search size={16} className="shrink-0 text-gray-400" />
                                        <input value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} placeholder="Search templates" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white" aria-label="Search templates" />
                                    </label>
                                )}
                                <div className="grid max-h-[340px] gap-2 overflow-y-auto sm:grid-cols-2">
                                    {pickable.map(t => (
                                        <button key={`${t.name}|${t.language}`} type="button" onClick={() => setKey(`${t.name}|${t.language}`)} className={cn('rounded-2xl border p-3 text-left transition-colors hover:border-emerald-500/40 dark:hover:border-neon-green/40', LINE)}>
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate font-heading text-[14px] font-bold text-gray-900 dark:text-white">{templateTitle(t.name)}</span>
                                                <span className={cn('shrink-0 text-[11px] font-semibold', MUTED)}>{t.language}</span>
                                            </span>
                                            <span className={cn('mt-1 line-clamp-2 block text-[12.5px]', MUTED)}>{t.body}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Step>

                    {hasFields && (
                        <Step n={2} title="Fill it in" hint="Fields like {first_name} are filled in for each person" done={fieldsReady}>
                            <div className="space-y-4">
                                {tpl.header?.format === 'IMAGE' && (
                                    <label className="block space-y-1.5">
                                        <span className="text-[13px] font-bold">Header image link <span className={cn('font-normal', MUTED)}>(optional: the Newbi card otherwise)</span></span>
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
                                                <span className="text-[13px] font-bold">{k && FIELDS[k] ? FIELDS[k].label : `Field ${i + 1}`} <span className={cn('font-mono text-[11.5px] font-normal', MUTED)}>{`{{${i + 1}}}`}</span></span>
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
                                                <span className="text-[13px] font-bold">“{b.text}” button link{fields.button ? <span className={cn('font-normal', MUTED)}> · {FIELDS[fields.button]?.label}</span> : null}</span>
                                                <input className={fieldCls} value={buttons[b.index] || ''} onChange={e => set(e.target.value)} placeholder={b.url.replace('{{1}}', '…')} />
                                            </label>
                                            {fieldHint(fields.button, buttons[b.index] || '', set)}
                                        </div>
                                    );
                                })}
                            </div>
                        </Step>
                    )}

                    <Step n={hasFields ? 3 : 2} title="Who gets it" hint={`${recipients.length} picked · up to ${MAX_RECIPIENTS} at a time · people who replied STOP are skipped`} done={recipients.length > 0 && !tooMany}>
                        <div className="space-y-3">
                            <Pills
                                value={who}
                                onChange={setWho}
                                items={[
                                    { value: 'team', label: 'Team', count: picked.size || undefined },
                                    { value: 'campaign', label: 'Campaign applicants', count: appPicked.size || undefined },
                                    { value: 'numbers', label: 'Other numbers', count: otherPhones.length || undefined },
                                ]}
                            />
                            {who === 'team' && (
                                <div className="space-y-2">
                                    {team.loading && <p className={cn('text-[13px]', MUTED)}>Loading the team…</p>}
                                    {reachable.length > 0 && (
                                        <button type="button" className={cn('text-[12.5px] font-bold', G.text)} onClick={() => setPicked(picked.size === reachable.length ? new Set() : new Set(reachable.map(m => m.id)))}>
                                            <Users size={13} className="mr-1 inline -translate-y-px" />{picked.size === reachable.length ? 'Clear' : 'Select everyone with WhatsApp'}
                                        </button>
                                    )}
                                    <div className="grid gap-1.5 sm:grid-cols-2">
                                        {team.members.map(m => (
                                            <CheckRow key={m.id} checked={picked.has(m.id)} disabled={!m.phone} onChange={() => toggle(m.id)} title={m.name} subtitle={`${m.phone || 'No verified number on their account'} · ${m.role}`} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {who === 'campaign' && (
                                <div className="space-y-2.5">
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
                                    {!campaignId && <p className={cn('text-[12.5px]', MUTED)}><Megaphone size={13} className="mr-1 inline -translate-y-px" />A campaign fills in its own details and lets you message its applicants.</p>}
                                    {campaignId && applicants.loading && <p className={cn('text-[13px]', MUTED)}>Loading applicants…</p>}
                                    {campaignId && applicants.error && <p className="text-[13px] text-rose-600">{applicants.error}</p>}
                                    {campaignId && !applicants.loading && !applicants.error && (shownApplicants.length ? (
                                        <>
                                            <div className="flex items-center justify-between gap-2 text-[12.5px]">
                                                <span className={MUTED}>{appPicked.size} of {applicants.list.length} applicants picked</span>
                                                <button type="button" className={cn('font-bold', G.text)} onClick={() => setAppPicked(p => {
                                                    const n = new Set(p);
                                                    shownApplicants.forEach(a => (allShownPicked ? n.delete(a.id) : n.add(a.id)));
                                                    return n;
                                                })}>
                                                    {allShownPicked ? 'Clear these' : `Select all ${shownApplicants.length}`}
                                                </button>
                                            </div>
                                            <div className="grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
                                                {shownApplicants.map(a => (
                                                    <CheckRow key={a.id} checked={appPicked.has(a.id)} onChange={() => toggleApp(a.id)} title={a.fullName || 'No name'} subtitle={`${STATUS_META[a.status || 'applied']?.label}${a.city ? ` · ${a.city}` : ''}${a.whatsappOptOut ? ' · stopped updates' : ''}`} />
                                                ))}
                                            </div>
                                        </>
                                    ) : <p className={cn('text-[13px]', MUTED)}>Nobody here yet.</p>)}
                                </div>
                            )}
                            {who === 'numbers' && (
                                <label className="block space-y-1.5">
                                    <span className={cn('text-[12.5px]', MUTED)}><Hash size={13} className="mr-1 inline -translate-y-px" />One per line, or separated by commas</span>
                                    <textarea className={cn(fieldCls, 'min-h-[96px] py-2.5')} value={others} onChange={e => setOthers(e.target.value)} placeholder="98765 43210" />
                                </label>
                            )}
                        </div>
                    </Step>
                </div>

                <aside className="h-fit space-y-3 min-[1500px]:sticky min-[1500px]:top-4">
                    <p className={cn('px-1 text-[12px] font-bold', MUTED)}>Preview{sampleName ? ` · for ${sampleName.split(/\s+/)[0]}` : ''}</p>
                    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[2rem] border-[6px] border-gray-900 bg-gray-900 shadow-xl dark:border-zinc-800 dark:bg-zinc-800">
                        <div className="flex items-center gap-2.5 bg-white px-3 py-2.5 dark:bg-[#0c0e13]">
                            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full font-heading text-[12px] font-black', G.solid)}>N</span>
                            <span className="min-w-0">
                                <span className="block font-heading text-[13.5px] font-bold text-gray-900 dark:text-white">Newbi</span>
                                <span className={cn('block text-[11px]', MUTED)}>Business account</span>
                            </span>
                        </div>
                        <PreviewWell className="min-h-[300px] rounded-none">
                            {tpl ? <TemplateBubble tpl={tpl} body={previewBody} headerText={tpl.header?.format === 'TEXT' ? fill(tpl.header.text, [fillTokens(headerText, sample)]) : undefined} headerImage={headerUrl ? 'Your image' : undefined} />
                                : <p className={cn('pt-24 text-center text-[13px]', MUTED)}>Pick a template to see it here.</p>}
                        </PreviewWell>
                    </div>
                </aside>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <PaneHeader icon={SquarePen} title="New message" subtitle="Send an approved template to anyone" onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
            {approved.length > 0 && (
                <footer className={cn('flex shrink-0 flex-wrap items-center gap-3 border-t px-4 py-3 sm:px-6', LINE)}>
                    <p className={cn('min-w-0 flex-1 text-[12.5px]', tooMany ? 'font-semibold text-rose-600' : MUTED)}>
                        {tooMany ? `Up to ${MAX_RECIPIENTS} people at a time: pick fewer.` : !tpl ? 'Pick a template to start.' : !fieldsReady ? 'Fill in every field.' : !recipients.length ? 'Pick who gets it.' : 'Each message is billed by Meta.'}
                    </p>
                    <Button variant="primary" disabled={!ready || sending} onClick={() => setConfirming(true)}>
                        <Send size={14} /> {sending ? 'Sending…' : `Send to ${recipients.length || '…'}`}
                    </Button>
                </footer>
            )}
            {tpl && (
                <ConfirmSheet
                    open={confirming}
                    onClose={() => setConfirming(false)}
                    title={`Send “${templateTitle(tpl.name)}” to ${recipients.length}?`}
                    message="It goes out on WhatsApp straight away and can’t be taken back."
                    confirmLabel={`Send to ${recipients.length}`}
                    tone="success"
                    busy={sending}
                    onConfirm={() => send(recipients)}
                >
                    <PreviewWell><TemplateBubble tpl={tpl} body={previewBody} /></PreviewWell>
                </ConfirmSheet>
            )}
        </div>
    );
};

export default ComposePane;
