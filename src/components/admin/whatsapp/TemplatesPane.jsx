import React, { useState } from 'react';
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Search from 'lucide-react/dist/esm/icons/search';
import Send from 'lucide-react/dist/esm/icons/send';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { callOutreach } from '../campaigns/outreach/outreachApi';
import { Badge, Button, EmptyState } from '../ui';
import { LINE, MUTED } from '../campaigns/outreach/InboxPanel';
import { PaneHeader, Pills, PreviewWell, STATUS_TONE, TemplateBubble, statusLabel, templateTitle } from './centerParts';

/*
 * The templates in WhatsApp Manager and their review status. A template goes
 * out automatically once Meta approves it and its WHATSAPP_TEMPLATE_* setting
 * is on in Vercel; approved ones can also be sent by hand from here.
 */

const GROUPS = {
    all: () => true,
    approved: (t) => t.status === 'APPROVED',
    review: (t) => t.status === 'PENDING' || t.status === 'IN_APPEAL',
    off: (t) => ['REJECTED', 'PAUSED', 'DISABLED'].includes(t.status),
};

// Ours that Meta doesn't have yet, so they can be sent for review from here when WhatsApp Manager won't open.
const SUBMITTABLE = [{ name: 'pass_ticket_qr', title: 'Ticket with QR code', note: 'The ticket message with the QR code as its picture. Switch it on with WHATSAPP_TEMPLATE_PASS_TICKET_QR once Meta approves it.' }];

const TemplatesPane = ({ state, reload, onUse, onClose }) => {
    const addToast = useStore(s => s.addToast);
    const [submitting, setSubmitting] = useState('');
    const submit = async (name) => {
        setSubmitting(name);
        const r = await callOutreach('wa-submit-template', { name });
        setSubmitting('');
        if (r.ok) addToast(r.data.already ? `Already in Meta (${r.data.status}).` : 'Sent to Meta for review. It usually takes a few minutes to a day.', 'success');
        else addToast(r.error || 'Meta didn’t accept it.', 'warning', { title: 'Template not submitted' });
        reload();
    };
    const missing = state.loading || state.error ? [] : SUBMITTABLE.filter(m => !state.templates.some(t => t.name === m.name));
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const list = state.templates.filter(t => GROUPS[filter](t) && (!q || [t.name, t.body, t.category].some(v => String(v || '').toLowerCase().includes(q))));
    const count = (k) => state.templates.filter(GROUPS[k]).length;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <PaneHeader icon={LayoutTemplate} title="Templates" subtitle="From WhatsApp Manager, with Meta’s review status" onClose={onClose}>
                <Button size="sm" variant="ghost" onClick={reload} disabled={state.loading} aria-label="Refresh"><RefreshCw size={14} className={state.loading ? 'animate-spin' : undefined} /></Button>
            </PaneHeader>
            <div className={cn('shrink-0 space-y-2.5 border-b px-4 py-3', LINE)}>
                <label className="flex h-10 items-center gap-2.5 rounded-xl bg-black/[0.04] px-3 dark:bg-white/[0.05]">
                    <Search size={16} className="shrink-0 text-gray-400" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white dark:placeholder:text-zinc-500" aria-label="Search templates" />
                </label>
                <Pills
                    value={filter}
                    onChange={setFilter}
                    items={[
                        { value: 'all', label: 'All', count: count('all') },
                        { value: 'approved', label: 'Approved', count: count('approved') },
                        { value: 'review', label: 'In review', count: count('review') },
                        { value: 'off', label: 'Rejected or paused', count: count('off') },
                    ]}
                />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {missing.map(m => (
                    <div key={m.name} className={cn('mb-3 flex items-center gap-3 rounded-3xl border p-3.5', LINE)}>
                        <div className="min-w-0 flex-1">
                            <p className="font-heading text-[14px] font-bold text-gray-900 dark:text-white">{m.title}</p>
                            <p className={cn('text-[12px]', MUTED)}>{m.note}</p>
                        </div>
                        <Button size="sm" variant="primary" onClick={() => submit(m.name)} disabled={Boolean(submitting)}>{submitting === m.name ? 'Sending…' : 'Submit to Meta'}</Button>
                    </div>
                ))}
                {state.loading && !state.templates.length && <p className={cn('p-2 text-[13px]', MUTED)}>Loading…</p>}
                {state.error && <p className="p-2 text-[13px] text-rose-600">{state.error}</p>}
                {!state.loading && !list.length && <EmptyState icon={LayoutTemplate} title={state.templates.length ? 'Nothing matches' : 'No templates yet'} description={state.templates.length ? 'Try another filter or search.' : 'Create them in WhatsApp Manager; they show up here with Meta’s review status.'} />}
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {list.map(t => (
                        <article key={`${t.name}|${t.language}`} className={cn('flex flex-col rounded-3xl border p-3', LINE)}>
                            <div className="flex items-start gap-2 px-1 pb-2.5 pt-1">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-heading text-[15px] font-bold text-gray-900 dark:text-white" title={t.name}>{templateTitle(t.name)}</p>
                                    <p className={cn('truncate text-[12px]', MUTED)}>{statusLabel(t.category)} · {t.language}{t.header ? ` · ${statusLabel(t.header.format).toLowerCase()} header` : ''}</p>
                                </div>
                                <Badge tone={STATUS_TONE[t.status] || 'gray'}>{statusLabel(t.status)}</Badge>
                            </div>
                            <PreviewWell className="flex-1">
                                <TemplateBubble tpl={t} clamp />
                            </PreviewWell>
                            <div className="flex items-center justify-between gap-2 px-1 pt-3">
                                <code className={cn('truncate text-[11.5px]', MUTED)}>{t.name}</code>
                                {t.status === 'APPROVED' && <Button size="sm" variant="primary" onClick={() => onUse(t)}><Send size={13} /> Use</Button>}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TemplatesPane;
