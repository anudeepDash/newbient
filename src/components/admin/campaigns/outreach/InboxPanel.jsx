import React, { useCallback, useEffect, useRef, useState } from 'react';
import Send from 'lucide-react/dist/esm/icons/send';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import MessagesSquare from 'lucide-react/dist/esm/icons/messages-square';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Button, Card, Badge, EmptyState } from '../../ui';
import { fieldCls } from '../../uploads/UploadKit';
import { Spinner } from '../parts';
import { callOutreach } from './outreachApi';
import { StatusBadge, when } from './parts';

/*
 * The WhatsApp inbox: every conversation with creators, newest first, for this
 * campaign or all of them. Free text only within 24 hours of their last
 * message (WhatsApp's rule); after that, send a template instead. Photos and
 * voice notes load through the server when you ask for them.
 */

const POLL_MS = 20_000;

const Bubble = ({ m, threadId }) => {
    const addToast = useStore(s => s.addToast);
    const [media, setMedia] = useState(null);
    const [loading, setLoading] = useState(false);
    const load = async () => {
        setLoading(true);
        const r = await callOutreach('inbox-media', { threadId, messageId: m.id });
        setLoading(false);
        if (!r.ok) {
            addToast(r.error || 'Please try again.', 'error', {
                title: 'Couldn’t open the attachment',
                action: { label: 'Try again', onClick: () => load() },
            });
            return;
        }
        setMedia(r.data);
    };
    const out = m.direction === 'out';
    return (
        <div className={cn('flex', out ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[80%] space-y-1 rounded-2xl px-3 py-2 text-[14px] leading-snug', out ? 'rounded-br-md bg-[#dcf8c6] text-gray-900 dark:bg-[#005c4b] dark:text-white' : 'rounded-bl-md bg-white ring-1 ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/[0.08]')}>
                {m.type !== 'text' && m.type !== 'template' && m.type !== 'button' && <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{m.type}</p>}
                {media?.mimeType?.startsWith('image/') && <img src={media.dataUrl} alt="Sent by the creator" className="max-h-72 rounded-xl" />}
                {media?.mimeType?.startsWith('audio/') && <audio controls src={media.dataUrl} className="w-56" />}
                {m.hasMedia && !media && (
                    <button type="button" onClick={load} disabled={loading} className="flex items-center gap-1.5 text-[13px] font-semibold underline"><ImageIcon size={14} /> {loading ? 'Loading…' : 'Show'}</button>
                )}
                {(m.text || m.caption) && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.text || m.caption}</p>}
                <p className="flex items-center justify-end gap-1 text-[11px] text-gray-500 dark:text-zinc-400">
                    {out && m.sentBy && <span>{m.sentBy} · </span>}
                    {when(m.at)}
                    {out && m.status === 'read' && <CheckCheck size={13} className="text-sky-500" />}
                    {out && m.status === 'delivered' && <CheckCheck size={13} />}
                    {out && m.status === 'failed' && <span className="font-semibold text-rose-600">Not delivered</span>}
                    {out && m.status === 'queued' && <span>Waiting to send</span>}
                </p>
                {out && m.status === 'failed' && m.error && <p className="text-[11px] text-rose-600">{m.error}</p>}
            </div>
        </div>
    );
};

const Conversation = ({ threadId, onBack, onChanged }) => {
    const addToast = useStore(s => s.addToast);
    const [data, setData] = useState(null);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const endRef = useRef(null);
    const load = useCallback(async () => {
        const r = await callOutreach('inbox-thread', { threadId });
        if (r.ok) setData(r.data);
    }, [threadId]);
    useEffect(() => {
        setData(null);
        load();
        const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
        return () => clearInterval(t);
    }, [load]);
    useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [data?.messages?.length]);

    const reply = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setSending(true);
        const r = await callOutreach('inbox-reply', { threadId, text });
        setSending(false);
        if (!r.ok) { addToast(r.error || 'Please try again.', 'error', { title: 'Reply not sent' }); load(); return; }
        setText('');
        load();
        onChanged();
    };
    const template = async (kind) => {
        const r = await callOutreach('inbox-template', { threadId, kind });
        if (r.ok) addToast('Sent.', 'success');
        else addToast(r.error || 'Please try again.', 'error', {
            title: 'Message not sent',
            action: { label: 'Try again', onClick: () => template(kind) },
        });
        load();
    };
    const setState = async (state) => {
        await callOutreach('inbox-state', { threadId, state });
        onChanged();
        if (state === 'done') onBack();
    };

    if (!data) return <div className="flex justify-center py-16 text-gray-400"><Spinner className="h-5 w-5" /></div>;
    const { thread, messages, applications } = data;
    return (
        <div className="flex h-full min-h-[420px] flex-col">
            <div className="flex items-center gap-2 border-b border-black/[0.06] p-3 dark:border-white/[0.08]">
                <button type="button" onClick={onBack} aria-label="Back to conversations" className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-black/5 lg:hidden"><ChevronLeft size={18} /></button>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold">{applications[0]?.fullName || thread.name || thread.phone}</p>
                    <p className="truncate text-[12px] text-gray-500">{thread.phone}{thread.name ? ` · WhatsApp name: ${thread.name}` : ''}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setState(thread.state === 'done' ? 'open' : 'done')}>{thread.state === 'done' ? 'Reopen' : 'Mark done'}</Button>
            </div>
            {applications.length > 0 && (
                <div className="flex flex-wrap gap-2 border-b border-black/[0.06] px-3 py-2 text-[12px] dark:border-white/[0.08]">
                    {applications.map(a => (
                        <span key={`${a.campaignId}_${a.appId}`} className="inline-flex items-center gap-1.5">{a.campaignTitle}: <StatusBadge status={a.status} /></span>
                    ))}
                    {data.creatorId && <Badge tone="violet">Newbi creator</Badge>}
                </div>
            )}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {messages.map(m => <Bubble key={m.id} m={m} threadId={threadId} />)}
                <div ref={endRef} />
            </div>
            <div className="border-t border-black/[0.06] p-3 dark:border-white/[0.08]">
                {thread.windowOpen ? (
                    <form onSubmit={reply} className="flex items-end gap-2">
                        <textarea
                            className={cn(fieldCls, 'min-h-[44px] flex-1 py-2.5')}
                            rows={1}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply(e); } }}
                            placeholder={thread.windowClosesAt ? `Reply (free text until ${new Date(thread.windowClosesAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })})` : 'Reply'}
                            maxLength={4096}
                            aria-label="Reply"
                        />
                        <Button type="submit" variant="success" disabled={sending || !text.trim()} aria-label="Send reply"><Send size={15} /></Button>
                    </form>
                ) : (
                    <div className="space-y-2">
                        <p className="text-[12.5px] text-gray-500">It’s been over 24 hours since their last message, so WhatsApp only allows an approved template:</p>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => template('deliverables')} disabled={!thread.lastAppId}>Send their posts link</Button>
                            <Button size="sm" onClick={() => template('reminder')} disabled={!thread.lastAppId}>Send the join reminder</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const InboxPanel = ({ campaign, configured }) => {
    const [scope, setScope] = useState('campaign');
    const [state, setState] = useState('open');
    const [data, setData] = useState({ loading: true, threads: [] });
    const [openId, setOpenId] = useState(null);
    const load = useCallback(async () => {
        const r = await callOutreach('inbox-list', { campaignId: scope === 'campaign' ? campaign.id : undefined, state });
        setData({ loading: false, threads: r.ok ? r.data.threads : [], error: r.ok ? '' : r.error });
    }, [scope, state, campaign.id]);
    useEffect(() => {
        load();
        const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    const chip = (value, label, current, set) => (
        <button key={value} type="button" onClick={() => set(value)} className={cn('h-8 rounded-full border px-3 text-[12.5px] font-semibold', current === value ? 'border-transparent bg-gray-900 text-white dark:bg-white dark:text-black' : 'border-black/10 text-gray-600 dark:border-white/10 dark:text-zinc-300')}>{label}</button>
    );

    return (
        <div className="space-y-3">
            {!configured && <Card className="p-4 text-[13px] text-gray-600 dark:text-zinc-400">The WhatsApp API isn’t set up, so the inbox stays empty until it is (see docs/campaign-outreach.md).</Card>}
            <div className="flex flex-wrap gap-2">
                {chip('campaign', 'This campaign', scope, setScope)}
                {chip('all', 'All campaigns', scope, setScope)}
                <span className="w-2" />
                {chip('open', 'Open', state, setState)}
                {chip('done', 'Done', state, setState)}
                {chip('all', 'All', state, setState)}
            </div>
            <Card className="grid overflow-hidden lg:h-[640px] lg:grid-cols-[320px_minmax(0,1fr)]">
                <ul className={cn('divide-y divide-black/[0.05] overflow-y-auto border-black/[0.06] dark:divide-white/[0.06] dark:border-white/[0.08] lg:border-r', openId && 'hidden lg:block')}>
                    {data.loading && <li className="flex justify-center py-10 text-gray-400"><Spinner className="h-5 w-5" /></li>}
                    {!data.loading && !data.threads.length && <li><EmptyState icon={MessagesSquare} title="No conversations" description="Replies to your WhatsApp messages show up here." /></li>}
                    {data.threads.map(t => (
                        <li key={t.id}>
                            <button type="button" onClick={() => setOpenId(t.id)} className={cn('block w-full px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03]', openId === t.id && 'bg-emerald-500/[0.06]')}>
                                <div className="flex items-center justify-between gap-2">
                                    <p className={cn('truncate text-[14px]', t.unread ? 'font-extrabold' : 'font-semibold')}>{t.name || t.phone}</p>
                                    <span className="shrink-0 text-[11.5px] text-gray-500">{when(t.lastMessageAt)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-[12.5px] text-gray-500">{t.lastDirection === 'out' ? 'You: ' : ''}{t.lastText}</p>
                                    {t.unread > 0 && <span className="min-w-[20px] rounded-full bg-emerald-500 px-1.5 text-center text-[11px] font-bold text-white">{t.unread}</span>}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
                <div className={cn('min-h-0', !openId && 'hidden lg:block')}>
                    {openId
                        ? <Conversation key={openId} threadId={openId} onBack={() => setOpenId(null)} onChanged={load} />
                        : <div className="hidden h-full items-center justify-center text-[13px] text-gray-500 lg:flex">Choose a conversation</div>}
                </div>
            </Card>
        </div>
    );
};

export default InboxPanel;
