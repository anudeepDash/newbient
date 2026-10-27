import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SquarePen from 'lucide-react/dist/esm/icons/square-pen';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import History from 'lucide-react/dist/esm/icons/history';
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template';
import Activity from 'lucide-react/dist/esm/icons/activity';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn } from '../../lib/utils';
import { Card, Menu, MenuItem } from '../../components/admin/ui';
import WhatsAppLogo from '../../components/app/WhatsAppLogo';
import { callOutreach } from '../../components/admin/campaigns/outreach/outreachApi';
import { ChatList, Conversation, useThreads, G, LINE, MUTED, SURFACE } from '../../components/admin/campaigns/outreach/InboxPanel';
import NumberPane, { useNumberStatus, StatusDot } from '../../components/admin/whatsapp/NumberPane';
import ComposePane from '../../components/admin/whatsapp/ComposePane';
import SentPane from '../../components/admin/whatsapp/SentPane';
import TemplatesPane from '../../components/admin/whatsapp/TemplatesPane';

/*
 * The WhatsApp center (/admin/whatsapp), laid out like WhatsApp in the Newbi
 * look: every conversation on the Newbi number on the left, the open chat on
 * the right. The ⋮ menu opens the rest in the right-hand pane: a new message
 * (any approved template, to the team or any number), the log of everything
 * sent, the templates with their review status, and the number's state at
 * Meta (also the dot by the title). Server: api/_lib/whatsappCenter.js and the
 * outreach inbox. Most messages go out on their own (tickets, passes,
 * shortlists, payouts); this page is for watching them and the exceptions.
 *
 * Other screens open a new message with people picked:
 * navigate('/admin/whatsapp', { state: { whatsappSend: { campaignId, appIds, phone, template, at } } }).
 */

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

const iconBtn = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white';

/* What the right side shows before a chat is picked. */
const Welcome = ({ status, counts, unread, onPane }) => {
    const tiles = [
        { pane: 'compose', icon: SquarePen, title: 'New message', hint: 'Send an approved template', solid: true },
        { pane: 'sent', icon: History, title: 'Sent messages', hint: 'Delivered, read and failed' },
        { pane: 'templates', icon: LayoutTemplate, title: 'Templates', hint: counts.pending ? `${counts.pending} waiting for Meta` : `${counts.approved} approved` },
    ];
    return (
        <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-6 text-center">
            <span className={cn('flex h-16 w-16 items-center justify-center rounded-[1.4rem]', G.chip)}><WhatsAppLogo size={32} /></span>
            <div className="space-y-1.5">
                <p className="font-heading text-[26px] font-bold text-gray-900 dark:text-white">Newbi on WhatsApp</p>
                <p className={cn('mx-auto max-w-md text-[14px]', MUTED)}>
                    {unread ? `${unread} unread across your chats. ` : ''}Pick a chat to reply. You can reply, react and quote for 24 hours after someone writes; after that, send a template.
                </p>
            </div>
            <div className="grid w-full max-w-xl gap-2.5 sm:grid-cols-3">
                {tiles.map(t => (
                    <button key={t.pane} type="button" onClick={() => onPane(t.pane)} className={cn('rounded-3xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 dark:hover:border-neon-green/40', LINE)}>
                        <span className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', t.solid ? G.solid : G.chip)}><t.icon size={18} /></span>
                        <span className="block font-heading text-[14.5px] font-bold text-gray-900 dark:text-white">{t.title}</span>
                        <span className={cn('block text-[12.5px]', MUTED)}>{t.hint}</span>
                    </button>
                ))}
            </div>
            <button type="button" onClick={() => onPane('number')} className={cn('inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] font-semibold hover:bg-black/[0.02] dark:hover:bg-white/[0.03]', LINE)}>
                <StatusDot status={status} />
                <span className="text-gray-800 dark:text-zinc-100">{status.verdict?.title || status.label}</span>
                {status.waiting > 0 && <span className="rounded-full bg-amber-500/15 px-1.5 text-[11.5px] text-amber-700 dark:text-amber-300">{status.waiting} waiting</span>}
                <ChevronRight size={14} className="text-gray-400" />
            </button>
        </div>
    );
};

const WhatsAppCenter = () => {
    const location = useLocation();
    const handoff = location.state?.whatsappSend || null;
    const [templatesState, reloadTemplates] = useTemplates();
    const status = useNumberStatus();
    const [pane, setPane] = useState(handoff ? 'compose' : null);
    const [prefill, setPrefill] = useState(handoff);
    const [openId, setOpenId] = useState(null);
    const [filter, setFilter] = useState('open');
    const [query, setQuery] = useState('');
    const [logKey, setLogKey] = useState(0);
    const [threads, reloadThreads] = useThreads({ campaignId: null, filter });
    useEffect(() => { if (handoff) { setPrefill(handoff); setPane('compose'); } }, [handoff?.at]); // eslint-disable-line react-hooks/exhaustive-deps

    const counts = useMemo(() => ({
        approved: templatesState.templates.filter(t => t.status === 'APPROVED').length,
        pending: templatesState.templates.filter(t => t.status === 'PENDING').length,
    }), [templatesState.templates]);
    const unread = threads.threads.reduce((n, t) => n + (t.unread || 0), 0);

    const openChat = (id) => { setOpenId(id); setPane(null); };
    const compose = (p = {}) => { setPrefill({ ...p, at: Date.now() }); setPane('compose'); };
    const close = () => setPane(null);
    const showRight = Boolean(pane || openId);

    if (templatesState.unavailable) {
        return <div className="p-4 sm:p-6"><Card className="p-6 text-[14px] text-gray-600 dark:text-zinc-400">{templatesState.error} Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_WABA_ID in Vercel.</Card></div>;
    }

    let right;
    if (pane === 'compose') right = <ComposePane key={prefill?.at || 'compose'} templatesState={templatesState} prefill={prefill} onSent={() => setLogKey(k => k + 1)} onClose={close} />;
    else if (pane === 'sent') right = <SentPane refreshKey={logKey} onClose={close} />;
    else if (pane === 'templates') right = <TemplatesPane state={templatesState} reload={reloadTemplates} onUse={(t) => compose({ template: t.name, language: t.language })} onClose={close} />;
    else if (pane === 'number') right = <NumberPane status={status} onClose={close} />;
    else if (openId) right = <Conversation key={openId} threadId={openId} onBack={() => setOpenId(null)} onChanged={reloadThreads} onCompose={compose} />;
    else right = <Welcome status={status} counts={counts} unread={unread} onPane={setPane} />;

    return (
        <div className="p-2 sm:p-4 lg:p-5">
            <div className={cn(
                'grid h-[calc(100dvh-9.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[480px] overflow-hidden rounded-3xl border shadow-[0_8px_32px_rgba(0,0,0,0.04)] sm:h-[calc(100dvh-10.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-2.5rem)] lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
                LINE, SURFACE,
            )}>
                <aside className={cn('flex min-h-0 flex-col border-r', LINE, showRight && 'hidden lg:flex')}>
                    <div className="flex h-16 shrink-0 items-center gap-3 pl-4 pr-2">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', G.chip)}><WhatsAppLogo size={20} /></span>
                        <div className="min-w-0 flex-1">
                            <p className="font-heading text-[18px] font-bold leading-tight text-gray-900 dark:text-white">WhatsApp</p>
                            <button type="button" onClick={() => setPane('number')} className={cn('flex max-w-full items-center gap-1.5 text-[12px] font-semibold hover:text-gray-900 dark:hover:text-white', MUTED)} title={status.verdict?.detail || 'The number’s state at Meta'}>
                                <StatusDot status={status} size="h-2 w-2" />
                                <span className="truncate">{status.label}</span>
                                {status.waiting > 0 && <span className="hidden shrink-0 rounded-full bg-amber-500/15 px-1.5 text-[11px] text-amber-700 sm:inline dark:text-amber-300">{status.waiting} waiting</span>}
                            </button>
                        </div>
                        <button type="button" onClick={() => compose()} aria-label="New message" title="New message" className={iconBtn}><SquarePen size={19} /></button>
                        <Menu
                            title="WhatsApp"
                            trigger={({ toggle }) => <button type="button" onClick={toggle} aria-label="More" title="More" className={iconBtn}><MoreVertical size={19} /></button>}
                        >
                            <MenuItem icon={SquarePen} onClick={() => compose()} hint="Any approved template, to anyone">New message</MenuItem>
                            <MenuItem icon={History} onClick={() => setPane('sent')} hint="Everything sent, with delivery">Sent messages</MenuItem>
                            <MenuItem icon={LayoutTemplate} onClick={() => setPane('templates')} hint={templatesState.loading ? 'From WhatsApp Manager' : `${counts.approved} approved${counts.pending ? ` · ${counts.pending} in review` : ''}`}>Templates</MenuItem>
                            <MenuItem icon={Activity} onClick={() => setPane('number')} hint={status.verdict?.title || status.label}>Number & sending</MenuItem>
                            <MenuItem icon={RefreshCw} onClick={() => { reloadThreads(); status.load(); reloadTemplates(); }}>Refresh</MenuItem>
                        </Menu>
                    </div>
                    <ChatList data={threads} openId={pane ? null : openId} onOpen={openChat} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />
                </aside>
                <section className={cn('min-h-0 min-w-0', !showRight && 'hidden lg:block')}>{right}</section>
            </div>
        </div>
    );
};

export default WhatsAppCenter;
