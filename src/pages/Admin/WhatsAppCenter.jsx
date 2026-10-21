import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MessagesSquare from 'lucide-react/dist/esm/icons/messages-square';
import Send from 'lucide-react/dist/esm/icons/send';
import History from 'lucide-react/dist/esm/icons/history';
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import { Card, Button, Badge, EmptyState, SegmentedTabs } from '../../components/admin/ui';
import { fieldCls } from '../../components/admin/uploads/UploadKit';
import InboxPanel from '../../components/admin/campaigns/outreach/InboxPanel';
import { callOutreach } from '../../components/admin/campaigns/outreach/outreachApi';
import { when } from '../../components/admin/campaigns/outreach/parts';

/*
 * The WhatsApp center (/admin/whatsapp): every conversation on the Newbi
 * number, sending an approved template by hand (to the team or any number),
 * the log of everything sent (the automatic messages and the manual ones),
 * and the templates with their review status. Server: api/_lib/whatsappCenter.js
 * and the outreach inbox. Most messages go out on their own (tickets, passes,
 * shortlists, payouts); this page is for watching them and the exceptions.
 */

const STATUS_TONE = { APPROVED: 'green', PENDING: 'amber', IN_APPEAL: 'amber', REJECTED: 'rose', PAUSED: 'rose', DISABLED: 'gray' };
const SEND_TONE = { sent: 'blue', delivered: 'teal', read: 'green', failed: 'rose', retry: 'amber', skipped: 'gray' };

const statusLabel = (s) => String(s || '').toLowerCase().replace(/_/g, ' ');

/* Where a send came from, in words. */
const eventLabel = (e = '') => {
    if (e === 'admin-manual') return 'Sent by hand';
    if (e.startsWith('outreach-')) return 'Campaign outreach';
    if (e.startsWith('otp-')) return 'Sign-in code';
    if (e === 'creator-verification') return 'Number check';
    return e ? `Automatic · ${e.replace(/-/g, ' ')}` : 'Automatic';
};

const fill = (text, values) => String(text || '').replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] || `{{${n}}}`);

/* WhatsApp's own formatting: *bold* and _italic_, enough for a preview. */
const formatted = (text) => String(text || '').split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((part, i) => {
    if (/^\*[^*]+\*$/.test(part)) return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
});

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

const SendPanel = ({ templatesState, prefill, onSent }) => {
    const addToast = useStore(s => s.addToast);
    const approved = templatesState.templates.filter(t => t.status === 'APPROVED');
    const [key, setKey] = useState('');
    const [body, setBody] = useState([]);
    const [headerUrl, setHeaderUrl] = useState('');
    const [headerText, setHeaderText] = useState('');
    const [buttons, setButtons] = useState({});
    const [team, setTeam] = useState({ loading: true, members: [] });
    const [picked, setPicked] = useState(() => new Set());
    const [others, setOthers] = useState('');
    const [armed, setArmed] = useState(false);
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState(null);

    useEffect(() => {
        callOutreach('wa-team').then(r => setTeam({ loading: false, members: r.ok ? r.data.team : [], error: r.ok ? '' : r.error }));
    }, []);
    useEffect(() => { if (prefill?.phone) setOthers(prefill.phone); }, [prefill]);

    const tpl = approved.find(t => `${t.name}|${t.language}` === key) || null;
    useEffect(() => {
        setBody(tpl ? Array.from({ length: tpl.bodyVars }, () => '') : []);
        setButtons({}); setHeaderUrl(''); setHeaderText(''); setArmed(false); setResults(null);
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    const otherPhones = others.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const recipients = [...[...picked].map(id => ({ type: 'team', id })), ...otherPhones.map(phone => ({ type: 'phone', phone }))];
    const reachable = team.members.filter(m => m.phone);
    const ready = tpl && recipients.length > 0 && body.every(v => v.trim())
        && tpl.buttons.filter(b => b.dynamic).every(b => String(buttons[b.index] || '').trim())
        && (tpl.header?.format !== 'DOCUMENT' || /^https:\/\//.test(headerUrl))
        && !(tpl.header?.format === 'TEXT' && tpl.header.vars && !headerText.trim());

    const toggle = (id) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

    const submit = async () => {
        if (!armed) { setArmed(true); return; }
        setSending(true);
        const r = await callOutreach('wa-send', {
            template: tpl.name, language: tpl.language, recipients,
            params: { body, buttons, headerUrl: headerUrl.trim() || undefined, headerText: headerText.trim() || undefined },
        });
        setSending(false);
        setArmed(false);
        if (!r.ok) { addToast(r.error, 'error', { title: 'Not sent' }); return; }
        setResults(r.data.results);
        addToast(`${r.data.sent} of ${recipients.length} sent.`, r.data.sent ? 'success' : 'warning', { title: `“${tpl.name}” sent` });
        onSent?.();
    };

    if (templatesState.loading) return <Card className="p-6 text-[13px] text-gray-500">Loading templates…</Card>;
    if (!approved.length) {
        return (
            <Card className="p-6">
                <EmptyState icon={LayoutTemplate} title="No approved templates yet" description="WhatsApp only lets a business start a conversation with a template Meta has approved. They’re listed on the Templates tab; this fills in as Meta approves them." />
            </Card>
        );
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="space-y-5 p-5">
                <label className="block space-y-1.5">
                    <span className="text-[13px] font-bold">Template</span>
                    <select className={fieldCls} value={key} onChange={e => setKey(e.target.value)}>
                        <option value="">Choose an approved template</option>
                        {approved.map(t => <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>{t.name} · {t.language} · {statusLabel(t.category)}</option>)}
                    </select>
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
                        {body.map((v, i) => (
                            <label key={i} className="block space-y-1.5">
                                <span className="text-[13px] font-bold">{`{{${i + 1}}}`}</span>
                                <input className={fieldCls} value={v} onChange={e => setBody(b => b.map((x, j) => (j === i ? e.target.value : x)))} placeholder={tpl.examples[i] ? `e.g. ${tpl.examples[i]}` : ''} maxLength={900} />
                            </label>
                        ))}
                        {tpl.buttons.filter(b => b.dynamic).map(b => (
                            <label key={b.index} className="block space-y-1.5">
                                <span className="text-[13px] font-bold">“{b.text}” link ending</span>
                                <input className={fieldCls} value={buttons[b.index] || ''} onChange={e => setButtons(x => ({ ...x, [b.index]: e.target.value }))} placeholder={b.url.replace('{{1}}', '…')} />
                            </label>
                        ))}
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

                <label className="block space-y-1.5">
                    <span className="text-[13px] font-bold">Other numbers <span className="font-normal text-gray-500">(one per line or comma-separated)</span></span>
                    <textarea className={cn(fieldCls, 'min-h-[72px] py-2.5')} value={others} onChange={e => setOthers(e.target.value)} placeholder="98765 43210" />
                </label>

                <div className="flex flex-wrap items-center gap-3">
                    <Button variant={armed ? 'danger' : 'success'} disabled={!ready || sending} onClick={submit}>
                        <Send size={14} /> {sending ? 'Sending…' : armed ? `Confirm: send to ${recipients.length}` : `Send to ${recipients.length || '…'}`}
                    </Button>
                    {armed && <Button variant="ghost" onClick={() => setArmed(false)}>Cancel</Button>}
                    <p className="text-[12px] text-gray-500">Each message is billed by Meta. People who replied STOP are skipped.</p>
                </div>

                {results && (
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
                )}
            </Card>

            <Card className="h-fit p-4">
                <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-gray-500">Preview</p>
                {tpl ? (
                    <div className="rounded-2xl bg-[#efeae2] p-3 dark:bg-[#0b141a]">
                        <div className="overflow-hidden rounded-xl bg-white text-[14px] leading-snug text-gray-900 shadow-sm dark:bg-[#202c33] dark:text-white">
                            {tpl.header?.format === 'IMAGE' && <div className="flex aspect-[1.91/1] items-center justify-center bg-gray-200 text-[12px] text-gray-500 dark:bg-white/10">{headerUrl ? 'Your image' : 'Newbi card'}</div>}
                            {tpl.header?.format === 'DOCUMENT' && <div className="bg-gray-100 px-3 py-4 text-[12px] font-semibold dark:bg-white/10">PDF document</div>}
                            {tpl.header?.format === 'TEXT' && <p className="px-3 pt-2 font-bold">{fill(tpl.header.text, [headerText])}</p>}
                            <p className="whitespace-pre-wrap px-3 py-2">{formatted(fill(tpl.body, body))}</p>
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
                        <Badge tone={SEND_TONE[r.status] || 'gray'}>{r.status || '—'}</Badge>
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

/* ── Page ─────────────────────────────────────────────────────────────── */

const WhatsAppCenter = () => {
    const [tab, setTab] = useState('inbox');
    const [templatesState, reloadTemplates] = useTemplates();
    const [prefill, setPrefill] = useState(null);
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                {counts.pending > 0 && <p className="text-[12.5px] text-gray-500">{counts.pending} template{counts.pending > 1 ? 's' : ''} waiting for Meta’s review</p>}
            </div>
            {tab === 'inbox' && <InboxPanel configured onCompose={(p) => { setPrefill({ ...p, at: Date.now() }); setTab('send'); }} />}
            {tab === 'send' && <SendPanel templatesState={templatesState} prefill={prefill} onSent={() => setLogKey(k => k + 1)} />}
            {tab === 'log' && <LogPanel refreshKey={logKey} />}
            {tab === 'templates' && <TemplatesPanel state={templatesState} reload={reloadTemplates} />}
        </div>
    );
};

export default WhatsAppCenter;
