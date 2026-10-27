import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Send from 'lucide-react/dist/esm/icons/send';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import MessagesSquare from 'lucide-react/dist/esm/icons/messages-square';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Video from 'lucide-react/dist/esm/icons/video';
import Mic from 'lucide-react/dist/esm/icons/mic';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Check from 'lucide-react/dist/esm/icons/check';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import Clock from 'lucide-react/dist/esm/icons/clock';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Smile from 'lucide-react/dist/esm/icons/smile';
import Reply from 'lucide-react/dist/esm/icons/reply';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Copy from 'lucide-react/dist/esm/icons/copy';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { copyToClipboard } from '../../../../lib/clipboard';
import { Card, Badge, EmptyState, Menu, MenuItem } from '../../ui';
import { ACCENTS, accent } from '../../theme';
import { Spinner } from '../parts';
import { callOutreach } from './outreachApi';
import { StatusBadge } from './parts';
import { waText } from '../../whatsapp/waText';

/*
 * The WhatsApp inbox in the Newbi look: chats on the left, the conversation on
 * the right. The WhatsApp center (pages/Admin/WhatsAppCenter.jsx) builds its
 * own shell from ChatList and Conversation; a campaign's Outreach tab uses the
 * default export, scoped to that campaign. Free text, reactions and quoted
 * replies only within 24 hours of their last message (WhatsApp's rule); after
 * that, send a template instead. Photos, voice notes and files load through
 * the server when you ask for them.
 */

export const POLL_MS = 20_000;
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EMOJIS = ['😀', '😂', '😊', '😍', '🥳', '😎', '🤩', '😅', '🙂', '😉', '🤔', '😮', '😢', '🙏', '👍', '👏', '🙌', '💪', '🔥', '✨', '🎉', '❤️', '✅', '📍'];

/* Newbi's green: emerald in light mode, neon in dark (admin/theme.js). */
export const G = ACCENTS.green;
export const LINE = 'border-black/[0.06] dark:border-white/[0.07]';
export const MUTED = 'text-gray-500 dark:text-zinc-400';
export const SURFACE = 'bg-white dark:bg-[#0c0e13]';
const CHAT_BG = 'bg-[#f4f5f7] dark:bg-[#07080b]';
const CHAT_BG_STYLE = { backgroundImage: 'radial-gradient(rgba(128,128,128,0.13) 1px, transparent 1px)', backgroundSize: '20px 20px' };
const BUBBLE_IN = 'bg-white text-gray-900 ring-1 ring-black/[0.05] dark:bg-[#171a21] dark:text-zinc-100 dark:ring-white/[0.06]';
/* Ours: Newbi green, solid in light mode and a neon tint in dark (a wall of neon is too loud). */
const BUBBLE_OUT = 'bg-emerald-500 text-white ring-1 ring-emerald-600/10 dark:bg-neon-green/[0.13] dark:text-zinc-50 dark:ring-neon-green/25 [&_a]:!text-current [&_a]:underline';
const BUBBLE_FAILED = 'bg-rose-50 text-rose-950 ring-1 ring-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50 dark:ring-rose-500/30';
const META_IN = 'text-gray-400 dark:text-zinc-500';
const META_OUT = 'text-white/75 dark:text-white/50';

const clockTime = (iso) => {
    const t = Date.parse(iso || '');
    return t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
};
const dayKey = (iso) => new Date(Date.parse(iso || '') || 0).toDateString();
/* "Today", "Yesterday", "Monday", "12 October 2026". */
const dayLabel = (iso) => {
    const d = new Date(Date.parse(iso || '') || 0);
    const days = Math.round((new Date(new Date().toDateString()) - new Date(d.toDateString())) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};
/* The chat list's time: 14:05 today, "Yesterday", a weekday, else a date. */
export const listTime = (iso) => {
    const t = Date.parse(iso || '');
    if (!t) return '';
    const label = dayLabel(iso);
    if (label === 'Today') return clockTime(iso);
    if (label === 'Yesterday') return label;
    if (!/\d/.test(label)) return label.slice(0, 3);
    return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const shortName = (email) => String(email || '').split('@')[0];
const hoursLeft = (iso) => Math.max(0, Math.round((Date.parse(iso || '') - Date.now()) / 3_600_000));

const AVATAR_TONES = ['green', 'blue', 'violet', 'pink', 'amber', 'cyan', 'orange', 'indigo', 'teal', 'fuchsia'];
export const ContactAvatar = ({ name, size = 44, className }) => {
    let h = 0;
    for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const initials = String(name || '?').replace(/^\+/, '').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?';
    return (
        <span
            className={cn('flex shrink-0 items-center justify-center rounded-full font-heading font-bold', accent(AVATAR_TONES[h % AVATAR_TONES.length]).chip, className)}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
            aria-hidden="true"
        >
            {/^\d/.test(initials) ? '#' : initials}
        </span>
    );
};

/* One tick when sent, two when delivered, two blue when read. */
const Ticks = ({ status }) => {
    if (status === 'read') return <CheckCheck size={15} className="text-sky-100 dark:text-sky-400" aria-label="Read" />;
    if (status === 'delivered') return <CheckCheck size={15} aria-label="Delivered" />;
    if (status === 'failed') return <AlertCircle size={13} className="text-rose-600 dark:text-rose-400" aria-label="Not delivered" />;
    if (status === 'queued') return <Clock size={12} aria-label="Waiting to send" />;
    return <Check size={15} aria-label="Sent" />;
};

const MEDIA_LABEL = { image: 'Photo', video: 'Video', audio: 'Voice message', voice: 'Voice message', document: 'Document', sticker: 'Sticker' };
const MEDIA_ICON = { image: ImageIcon, video: Video, audio: Mic, voice: Mic, document: FileText, sticker: Smile };
const VISUAL = new Set(['image', 'video', 'sticker']);

/* A short line for a quoted message or the reply bar. */
const snippet = (m) => {
    if (!m) return 'An earlier message';
    if (m.text) return m.text;
    if (m.caption) return `${MEDIA_LABEL[m.type] || m.type}: ${m.caption}`;
    return MEDIA_LABEL[m.type] || 'Message';
};

/* Photos, voice notes, videos and files: fetched through the server when asked for. */
const Media = ({ m, threadId, out }) => {
    const addToast = useStore(s => s.addToast);
    const [media, setMedia] = useState(null);
    const [loading, setLoading] = useState(false);
    const [zoom, setZoom] = useState(false);
    const load = async (e) => {
        e?.stopPropagation();
        setLoading(true);
        const r = await callOutreach('inbox-media', { threadId, messageId: m.id });
        setLoading(false);
        if (!r.ok) {
            addToast(r.error || 'Please try again.', 'error', { title: 'Couldn’t open the attachment', action: { label: 'Try again', onClick: () => load() } });
            return;
        }
        setMedia(r.data);
    };
    const Icon = MEDIA_ICON[m.type] || FileText;
    const mime = media?.mimeType || '';
    const tile = out ? 'bg-black/10' : 'bg-black/[0.04] dark:bg-white/[0.05]';

    if (!media) {
        if (VISUAL.has(m.type)) {
            return (
                <button type="button" onClick={load} disabled={loading} className={cn('flex flex-col items-center justify-center gap-2 rounded-xl', tile, m.type === 'sticker' ? 'h-32 w-32' : 'h-44 w-64 max-w-full')}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">{loading ? <Spinner className="h-5 w-5" /> : <Icon size={20} />}</span>
                    <span className="text-[12.5px] font-semibold opacity-80">{loading ? 'Loading…' : `${MEDIA_LABEL[m.type]} · tap to load`}</span>
                </button>
            );
        }
        return (
            <button type="button" onClick={load} disabled={loading} className={cn('flex w-64 max-w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', tile)}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', out ? 'bg-black/15' : G.solid)}>{loading ? <Spinner className="h-4 w-4" /> : <Icon size={18} />}</span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{m.type === 'document' && m.caption ? m.caption : MEDIA_LABEL[m.type] || 'Attachment'}</span>
                    <span className="block text-[12px] opacity-70">{loading ? 'Loading…' : 'Tap to load'}</span>
                </span>
            </button>
        );
    }
    if (mime.startsWith('image/')) {
        return (
            <>
                <button type="button" onClick={(e) => { e.stopPropagation(); setZoom(true); }} className="block">
                    <img src={media.dataUrl} alt={m.caption || 'Photo they sent'} className={cn('rounded-xl object-cover', m.type === 'sticker' ? 'h-32 w-32 object-contain' : 'max-h-80 w-auto max-w-full')} />
                </button>
                {zoom && (
                    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setZoom(false)} role="dialog" aria-label="Photo">
                        <button type="button" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Close"><X size={20} /></button>
                        <img src={media.dataUrl} alt={m.caption || 'Photo they sent'} className="max-h-full max-w-full rounded-2xl" />
                    </div>
                )}
            </>
        );
    }
    if (mime.startsWith('audio/')) return <audio controls src={media.dataUrl} className="h-10 w-64 max-w-full" />;
    if (mime.startsWith('video/')) return <video controls src={media.dataUrl} className="max-h-80 max-w-full rounded-xl" />;
    return (
        <a href={media.dataUrl} download={m.caption || 'attachment'} onClick={(e) => e.stopPropagation()} className={cn('flex w-64 max-w-full items-center gap-3 rounded-xl px-3 py-2.5', tile)}>
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', out ? 'bg-black/15' : G.solid)}><FileText size={18} /></span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold underline">{m.caption || 'Download'}</span>
        </a>
    );
};

/* A quoted message inside a bubble (a swipe-reply). */
const Quote = ({ quoted, who, out, onJump }) => (
    <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onJump(); }}
        className={cn('mb-1.5 flex w-full min-w-[180px] overflow-hidden rounded-xl text-left', out ? 'bg-black/10 dark:bg-black/30' : 'bg-black/[0.04] dark:bg-white/[0.05]')}
    >
        <span className={cn('w-1 shrink-0', out ? 'bg-white/80 dark:bg-neon-purple' : who === 'You' ? G.dot : 'bg-violet-500 dark:bg-neon-purple')} />
        <span className="min-w-0 flex-1 px-2.5 py-1.5">
            <span className={cn('block text-[12px] font-bold', out ? 'dark:text-violet-300' : who === 'You' ? G.text : 'text-violet-600 dark:text-violet-300')}>{who}</span>
            <span className="line-clamp-2 block text-[12.5px] opacity-75">{snippet(quoted)}</span>
        </span>
    </button>
);

/*
 * One message. Hovering it (or tapping it on a phone) shows a bar with the
 * quick reactions and Reply, overlapping the bubble's top edge so the pointer
 * never leaves the message on the way to it.
 */
const Bubble = ({ m, threadId, first, reactions, quoted, quotedWho, canAct, active, onActive, onReact, onReply, onJump, flash }) => {
    const out = m.direction === 'out';
    const isMedia = m.hasMedia || ['image', 'video', 'audio', 'voice', 'document', 'sticker'].includes(m.type);
    const sticker = m.type === 'sticker';
    const body = m.text || (m.type !== 'document' ? m.caption : '');
    const unsupported = !isMedia && !body && m.type !== 'location';
    const mine = reactions?.out || null;
    const emojis = [reactions?.in, mine].filter(Boolean);
    const actionable = canAct && Boolean(m.wamid);
    const overMedia = VISUAL.has(m.type) && !body;
    const failed = out && m.status === 'failed';

    const meta = (
        <span className={cn(
            'inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium leading-none tabular-nums',
            overMedia ? 'rounded-full bg-black/45 px-1.5 py-1 text-white backdrop-blur [&_svg]:text-white' : failed ? 'text-rose-700/70 dark:text-rose-200/60' : out ? META_OUT : META_IN,
        )}>
            {clockTime(m.at)}
            {out && <Ticks status={m.status} />}
        </span>
    );

    return (
        <div id={`m-${m.id}`} className={cn('group/msg flex px-3 sm:px-[6%]', out ? 'justify-end' : 'justify-start', first ? 'mt-3' : 'mt-1', emojis.length > 0 && 'mb-3.5')}>
            <div
                onClick={(e) => { e.stopPropagation(); if (actionable) onActive(); }}
                className={cn(
                    'relative max-w-[85%] text-[14px] leading-[1.42] sm:max-w-[68%]',
                    sticker ? '' : cn('rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06)]', failed ? BUBBLE_FAILED : out ? BUBBLE_OUT : BUBBLE_IN),
                    !sticker && (isMedia ? 'p-1' : 'px-3 pb-1.5 pt-2'),
                    first && !sticker && (out ? 'rounded-tr-md' : 'rounded-tl-md'),
                    flash && 'outline outline-2 outline-offset-2 outline-emerald-500/60 dark:outline-neon-green/60',
                    actionable && 'cursor-pointer sm:cursor-default',
                )}
            >
                {out && first && m.sentBy && <p className={cn('mb-0.5 text-[11.5px] font-bold', isMedia && 'px-2 pt-1', failed ? 'text-rose-700/80 dark:text-rose-200/70' : 'text-white/80 dark:text-neon-green')}>{shortName(m.sentBy)}</p>}
                {m.replyTo && <Quote quoted={quoted} who={quotedWho} out={out} onJump={onJump} />}
                {isMedia && <Media m={m} threadId={threadId} out={out} />}
                {m.type === 'location' && <p className="flex items-start gap-1.5"><MapPin size={16} className="mt-0.5 shrink-0" /><span>{m.text || 'Location'}</span></p>}
                {unsupported && <p className="italic opacity-70">This kind of message ({m.type}) can’t be shown here. Open WhatsApp on the phone to see it.</p>}
                {body && m.type !== 'location' && (
                    <p className={cn('whitespace-pre-wrap [overflow-wrap:anywhere]', isMedia && 'px-2 pt-1.5')}>
                        {waText(body)}
                        {/* Room for the time, so it sits on the last line. */}
                        <span className={cn('inline-block', out ? 'w-[62px]' : 'w-[40px]')} aria-hidden="true" />
                    </p>
                )}
                <span className={cn(overMedia ? 'absolute bottom-2.5 right-2.5' : cn('float-right ml-2', body || m.type === 'location' || unsupported ? '-mt-[15px]' : 'mt-1 px-1.5 pb-0.5'))}>{meta}</span>
                {failed && <p className="clear-both flex items-center gap-1 pt-1 text-[12px] font-semibold text-rose-700 dark:text-rose-300"><AlertCircle size={12} /> Not delivered{m.error ? `: ${m.error}` : ''}</p>}

                {emojis.length > 0 && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (actionable && mine) onReact(''); }}
                        title={[reactions?.in && `They reacted ${reactions.in}`, mine && `You reacted ${mine}${actionable ? ' · tap to remove' : ''}`].filter(Boolean).join(' · ')}
                        className={cn('absolute -bottom-4 flex h-6 items-center gap-0.5 rounded-full bg-white px-1.5 text-[13px] shadow-md ring-1 ring-black/[0.06] dark:bg-[#1f232c] dark:ring-white/10', out ? 'right-3' : 'left-3')}
                    >
                        {[...new Set(emojis)].map(e => <span key={e}>{e}</span>)}
                        {emojis.length > 1 && <span className={cn('pl-0.5 text-[11px] font-semibold', MUTED)}>{emojis.length}</span>}
                    </button>
                )}

                {actionable && (
                    // The wrapper's bottom padding bridges bubble and bar, so hover never drops on the way up.
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            'absolute bottom-full z-20 pb-1.5',
                            out ? 'right-0' : 'left-0',
                            active ? 'block' : 'hidden sm:group-hover/msg:block sm:group-focus-within/msg:block',
                        )}
                    >
                    <div className="nb-glass-menu nb-glass-static flex items-center gap-0.5 rounded-full p-1" role="toolbar" aria-label="React or reply">
                        {QUICK_REACTIONS.map(e => (
                            <button
                                key={e}
                                type="button"
                                onClick={() => onReact(mine === e ? '' : e)}
                                className={cn('flex h-8 w-8 items-center justify-center rounded-full text-[19px] transition-transform hover:scale-125 active:scale-95', mine === e && 'bg-emerald-500/15 dark:bg-neon-green/15')}
                                aria-label={mine === e ? `Remove ${e}` : `React ${e}`}
                                aria-pressed={mine === e}
                            >
                                {e}
                            </button>
                        ))}
                        <span className="mx-0.5 h-5 w-px bg-black/10 dark:bg-white/10" aria-hidden="true" />
                        <button type="button" onClick={onReply} aria-label="Reply" title="Reply" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"><Reply size={16} /></button>
                    </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/* Centered chips: the date, and notes like a reaction on an older message. */
const Chip = ({ children, tone = 'plain' }) => (
    <div className="my-3 flex justify-center px-4">
        <span className={cn('rounded-full px-3 py-1 text-center text-[11.5px] font-semibold', tone === 'note' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-white/80 text-gray-500 ring-1 ring-black/[0.05] backdrop-blur dark:bg-white/[0.06] dark:text-zinc-400 dark:ring-white/[0.06]')}>
            {children}
        </span>
    </div>
);

const iconBtn = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white';

export const Conversation = ({ threadId, onBack, onChanged, onCompose }) => {
    const addToast = useStore(s => s.addToast);
    const [data, setData] = useState(null);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [active, setActive] = useState(null);
    const [flash, setFlash] = useState(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    // Reactions we just sent, shown until the server's copy arrives.
    const [pending, setPending] = useState({});
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const nearBottom = useRef(true);
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
    // Stay at the bottom as messages arrive, unless they scrolled up to read.
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
    }, [data?.messages?.length]);
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }, [text]);

    // Reactions sit on the message they're for: theirs and ours, the latest of each.
    const { shown, reactionsByWamid, byWamid } = useMemo(() => {
        const msgs = data?.messages || [];
        const reactions = {};
        msgs.filter(m => m.type === 'reaction' && m.reactTo).forEach(m => {
            const r = reactions[m.reactTo] || (reactions[m.reactTo] = {});
            const side = m.direction === 'out' ? 'out' : 'in';
            if (!r[`${side}At`] || String(m.at) >= r[`${side}At`]) { r[side] = m.text || null; r[`${side}At`] = String(m.at); }
        });
        Object.entries(pending).forEach(([wamid, emoji]) => { (reactions[wamid] || (reactions[wamid] = {})).out = emoji || null; });
        const wamids = Object.fromEntries(msgs.filter(m => m.wamid && m.type !== 'reaction').map(m => [m.wamid, m]));
        // Their reaction on a message older than what's loaded (or from before reactions were kept) shows as a note.
        const note = (m) => m.direction === 'in' && (!m.reactTo || (m.text && !wamids[m.reactTo]));
        return { shown: msgs.filter(m => m.type !== 'reaction' || note(m)), reactionsByWamid: reactions, byWamid: wamids };
    }, [data?.messages, pending]);

    if (!data) return <div className={cn('flex h-full items-center justify-center text-gray-400', CHAT_BG)} style={CHAT_BG_STYLE}><Spinner className="h-6 w-6" /></div>;
    const { thread, messages, applications } = data;
    const name = applications[0]?.fullName || thread.name || thread.phone;
    const first = name.split(/\s+/)[0];
    const canAct = thread.windowOpen;
    const left = canAct && thread.windowClosesAt ? hoursLeft(thread.windowClosesAt) : 0;

    const reply = async (e) => {
        e?.preventDefault();
        if (!text.trim() || sending) return;
        setSending(true);
        const r = await callOutreach('inbox-reply', { threadId, text, replyToId: replyTo?.id });
        setSending(false);
        if (!r.ok) { addToast(r.error || 'Please try again.', 'error', { title: 'Reply not sent' }); load(); return; }
        setText('');
        setReplyTo(null);
        nearBottom.current = true;
        load();
        onChanged?.();
    };
    const react = async (m, emoji) => {
        setActive(null);
        setPending(p => ({ ...p, [m.wamid]: emoji }));
        const r = await callOutreach('inbox-react', { threadId, messageId: m.id, emoji });
        if (!r.ok) addToast(r.error || 'Please try again.', 'error', { title: emoji ? 'Reaction not sent' : 'Reaction not removed' });
        await load();
        setPending(p => { const n = { ...p }; delete n[m.wamid]; return n; });
    };
    const template = async (kind) => {
        const r = await callOutreach('inbox-template', { threadId, kind });
        if (r.ok) addToast('Sent.', 'success');
        else addToast(r.error || 'Please try again.', 'error', { title: 'Message not sent', action: { label: 'Try again', onClick: () => template(kind) } });
        load();
    };
    const setState = async (state) => {
        await callOutreach('inbox-state', { threadId, state });
        onChanged?.();
        if (state === 'done') onBack();
        else load();
    };
    const jump = (wamid) => {
        const target = byWamid[wamid];
        if (!target) return;
        document.getElementById(`m-${target.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setFlash(target.id);
        setTimeout(() => setFlash(f => (f === target.id ? null : f)), 1400);
    };
    const whoOf = (m) => (m?.direction === 'out' ? 'You' : name);

    const rows = [];
    let lastDay = null;
    let prev = null;
    shown.forEach((m) => {
        const day = dayKey(m.at);
        if (day !== lastDay) { rows.push(<Chip key={`d-${day}`}>{dayLabel(m.at)}</Chip>); lastDay = day; prev = null; }
        if (m.type === 'reaction') {
            rows.push(<Chip key={m.id} tone="note">{m.text ? `${first} reacted ${m.text} to an older message` : `${first} reacted to a message`} · {clockTime(m.at)}</Chip>);
            prev = null;
            return;
        }
        const isFirst = !prev || prev.direction !== m.direction || Date.parse(m.at) - Date.parse(prev.at) > 10 * 60_000 || (m.direction === 'out' && prev.sentBy !== m.sentBy);
        const quoted = m.replyTo ? byWamid[m.replyTo] : null;
        rows.push(
            <Bubble
                key={m.id}
                m={m}
                threadId={threadId}
                first={isFirst}
                reactions={m.wamid ? reactionsByWamid[m.wamid] : null}
                quoted={quoted}
                quotedWho={quoted ? whoOf(quoted) : 'Earlier message'}
                canAct={canAct}
                active={active === m.id}
                onActive={() => setActive(a => (a === m.id ? null : m.id))}
                onReact={(emoji) => react(m, emoji)}
                onReply={() => { setReplyTo(m); setActive(null); inputRef.current?.focus(); }}
                onJump={() => jump(m.replyTo)}
                flash={flash === m.id}
            />
        );
        prev = m;
    });

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className={cn('flex h-16 shrink-0 items-center gap-3 border-b px-3 sm:px-4', LINE, SURFACE)}>
                {onBack && <button type="button" onClick={onBack} aria-label="Back to chats" className={cn(iconBtn, '-ml-1 lg:hidden')}><ChevronLeft size={22} /></button>}
                <ContactAvatar name={name} size={40} />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-[16px] font-bold text-gray-900 dark:text-white">{name}</p>
                    <p className={cn('flex items-center gap-1.5 truncate text-[12.5px]', MUTED)}>
                        <span className="truncate">{thread.phone}{thread.name && thread.name !== name ? ` · ~${thread.name}` : ''}</span>
                    </p>
                </div>
                <span className={cn('hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold sm:inline-flex', canAct ? G.chip : 'bg-black/[0.05] text-gray-500 dark:bg-white/[0.06] dark:text-zinc-400')}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', canAct ? G.dot : 'bg-gray-400')} />
                    {canAct ? `Open · ${left}h left` : 'Templates only'}
                </span>
                {thread.state === 'done' && <Badge tone="gray">Done</Badge>}
                <Menu
                    title={name}
                    trigger={({ toggle }) => (
                        <button type="button" onClick={toggle} aria-label="Conversation options" className={iconBtn}><MoreVertical size={19} /></button>
                    )}
                >
                    {thread.state === 'done'
                        ? <MenuItem icon={RotateCcw} onClick={() => setState('open')}>Reopen conversation</MenuItem>
                        : <MenuItem icon={Check} onClick={() => setState('done')} hint="Moves it out of Open">Mark done</MenuItem>}
                    {onCompose && <MenuItem icon={Send} onClick={() => onCompose({ phone: thread.phone, name })}>Send a template</MenuItem>}
                    <MenuItem icon={Copy} onClick={() => copyToClipboard(thread.phone).then(() => addToast('Number copied.', 'success'))}>Copy number</MenuItem>
                </Menu>
            </header>
            {(applications.length > 0 || data.creatorId) && (
                <div className={cn('flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2 text-[12px] font-medium', LINE, SURFACE, MUTED)}>
                    {applications.map(a => (
                        <span key={`${a.campaignId}_${a.appId}`} className="inline-flex items-center gap-1.5">{a.campaignTitle} <StatusBadge status={a.status} /></span>
                    ))}
                    {data.creatorId && <Badge tone="violet">Newbi creator</Badge>}
                </div>
            )}

            <div
                ref={scrollRef}
                onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}
                onClick={() => { setActive(null); setEmojiOpen(false); }}
                className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4 pt-2', CHAT_BG)}
                style={CHAT_BG_STYLE}
            >
                {messages.length === 0 && <Chip>No messages yet</Chip>}
                {rows}
            </div>

            <footer className={cn('shrink-0 border-t', LINE, SURFACE)}>
                {canAct ? (
                    <div className="px-3 pb-3 pt-2.5 sm:px-4">
                        {replyTo && (
                            <div className="mb-2 flex items-center gap-2">
                                <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl bg-black/[0.04] dark:bg-white/[0.05]">
                                    <span className={cn('w-1 shrink-0', replyTo.direction === 'out' ? G.dot : 'bg-violet-500 dark:bg-neon-purple')} />
                                    <span className="min-w-0 flex-1 px-3 py-2">
                                        <span className={cn('block text-[12px] font-bold', replyTo.direction === 'out' ? G.text : 'text-violet-600 dark:text-violet-300')}>Replying to {whoOf(replyTo)}</span>
                                        <span className={cn('block truncate text-[13px]', MUTED)}>{snippet(replyTo)}</span>
                                    </span>
                                </div>
                                <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className={iconBtn}><X size={18} /></button>
                            </div>
                        )}
                        <form onSubmit={reply} className="relative flex items-end gap-2">
                            {emojiOpen && (
                                <div className="nb-glass-menu absolute bottom-full left-0 z-20 mb-2 grid w-[min(320px,100%)] grid-cols-8 gap-0.5 rounded-2xl p-2" data-side="top">
                                    {EMOJIS.map(e => (
                                        <button key={e} type="button" onClick={() => { setText(t => t + e); inputRef.current?.focus(); }} className="nb-glass-option flex h-9 items-center justify-center rounded-lg text-[21px]" aria-label={`Add ${e}`}>{e}</button>
                                    ))}
                                </div>
                            )}
                            <div className="flex min-w-0 flex-1 items-end rounded-[22px] bg-black/[0.04] pl-1 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-emerald-500/40 dark:bg-white/[0.06] dark:focus-within:bg-white/[0.08] dark:focus-within:ring-neon-green/40">
                                <button type="button" onClick={() => setEmojiOpen(o => !o)} aria-label="Emoji" aria-expanded={emojiOpen} className={cn(iconBtn, 'h-10 w-10', emojiOpen && G.text)}><Smile size={21} /></button>
                                <textarea
                                    ref={inputRef}
                                    className="max-h-[140px] min-h-[42px] min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-[10px] text-[15px] leading-[21px] text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white dark:placeholder:text-zinc-500"
                                    rows={1}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onFocus={() => setEmojiOpen(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply(e); }
                                        if (e.key === 'Escape') setReplyTo(null);
                                    }}
                                    placeholder={`Message ${first}`}
                                    maxLength={4096}
                                    aria-label="Reply"
                                />
                            </div>
                            <button type="submit" disabled={sending || !text.trim()} aria-label="Send reply" className={cn('flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-35', G.solid)}>
                                {sending ? <Spinner className="h-4 w-4" /> : <Send size={18} className="translate-x-[1px]" />}
                            </button>
                        </form>
                        <p className={cn('mt-1.5 hidden px-2 text-[11.5px] sm:block', MUTED)}>
                            Replies, reactions and quotes are free until {new Date(thread.windowClosesAt).toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}. Enter sends · Shift+Enter for a new line · hover a message to react.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 px-4 py-4 text-center">
                        <p className={cn('max-w-md text-[13px]', MUTED)}>
                            <Clock size={13} className="mr-1 inline -translate-y-px" />
                            {first} last wrote over 24 hours ago, so WhatsApp only allows an approved template until they write again.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {thread.lastAppId && <button type="button" onClick={() => template('deliverables')} className="h-9 rounded-full border border-black/10 px-4 text-[13px] font-semibold text-gray-700 hover:bg-black/[0.03] dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/[0.04]">Send their posts link</button>}
                            {thread.lastAppId && <button type="button" onClick={() => template('reminder')} className="h-9 rounded-full border border-black/10 px-4 text-[13px] font-semibold text-gray-700 hover:bg-black/[0.03] dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/[0.04]">Send the join reminder</button>}
                            {onCompose && <button type="button" onClick={() => onCompose({ phone: thread.phone, name })} className={cn('h-9 rounded-full px-4 text-[13px] font-bold', G.solid)}>Send a template</button>}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};

/* ── The chat list ───────────────────────────────────────────────────── */

export const FILTERS = [
    { value: 'open', label: 'Open' },
    { value: 'unread', label: 'Unread' },
    { value: 'done', label: 'Done' },
    { value: 'all', label: 'All' },
];

/* Threads for a campaign (or all), kept fresh while the page is visible. */
export const useThreads = ({ campaignId, filter }) => {
    const [data, setData] = useState({ loading: true, threads: [] });
    const state = filter === 'unread' ? 'all' : filter;
    const load = useCallback(async () => {
        const r = await callOutreach('inbox-list', { campaignId: campaignId || undefined, state });
        setData({ loading: false, threads: r.ok ? r.data.threads : [], error: r.ok ? '' : r.error });
    }, [campaignId, state]);
    useEffect(() => {
        load();
        const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
        return () => clearInterval(t);
    }, [load]);
    return [data, load];
};

const ListPreview = ({ t }) => {
    const reaction = /^(Reacted |Removed a reaction)/.test(t.lastText || '');
    return (
        <span className={cn('flex min-w-0 items-center gap-1 text-[13px]', t.unread ? 'font-medium text-gray-700 dark:text-zinc-200' : MUTED)}>
            {t.lastDirection === 'out' && !reaction && <CheckCheck size={15} className="shrink-0 opacity-70" />}
            <span className="truncate">{t.lastDirection === 'out' && reaction ? `You ${t.lastText.charAt(0).toLowerCase()}${t.lastText.slice(1)}` : t.lastText}</span>
        </span>
    );
};

export const ChatList = ({ data, openId, onOpen, filter, onFilter, query, onQuery }) => {
    const q = query.trim().toLowerCase();
    const threads = data.threads.filter(t => (filter !== 'unread' || t.unread > 0)
        && (!q || [t.name, t.phone, t.lastText].some(v => String(v || '').toLowerCase().includes(q))));
    return (
        <>
            <div className="shrink-0 space-y-2.5 px-3 pb-2.5">
                <label className="flex h-10 items-center gap-2.5 rounded-xl bg-black/[0.04] px-3 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-emerald-500/40 dark:bg-white/[0.05] dark:focus-within:bg-white/[0.07] dark:focus-within:ring-neon-green/40">
                    <Search size={16} className="shrink-0 text-gray-400" />
                    <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search chats" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white dark:placeholder:text-zinc-500" aria-label="Search chats" />
                    {query && <button type="button" onClick={() => onQuery('')} aria-label="Clear search" className="text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={15} /></button>}
                </label>
                <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Show">
                    {FILTERS.map(f => (
                        <button key={f.value} type="button" role="tab" aria-selected={filter === f.value} onClick={() => onFilter(f.value)} className={cn('h-8 shrink-0 rounded-full px-3.5 text-[12.5px] font-bold transition-colors', filter === f.value ? G.solid : 'bg-black/[0.04] text-gray-600 hover:bg-black/[0.07] dark:bg-white/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.09]')}>{f.label}</button>
                    ))}
                </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                {data.loading && <li className="flex justify-center py-10 text-gray-400"><Spinner className="h-5 w-5" /></li>}
                {!data.loading && data.error && <li className="px-3 py-6 text-[13px] text-rose-600">{data.error}</li>}
                {!data.loading && !data.error && !threads.length && (
                    <li><EmptyState icon={MessagesSquare} title={q ? 'No chats match' : filter === 'unread' ? 'All caught up' : 'No conversations'} description={q ? 'Try a name, a number or a word from the message.' : 'Replies to your WhatsApp messages show up here.'} /></li>
                )}
                {threads.map(t => {
                    const selected = openId === t.id;
                    return (
                        <li key={t.id}>
                            <button type="button" onClick={() => onOpen(t.id)} className={cn('relative flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors', selected ? G.soft : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]')}>
                                {selected && <span className={cn('absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full', G.dot)} aria-hidden="true" />}
                                <ContactAvatar name={t.name || t.phone} />
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span className={cn('truncate font-heading text-[15px] text-gray-900 dark:text-white', t.unread ? 'font-bold' : 'font-semibold')}>{t.name || t.phone}</span>
                                        <span className={cn('shrink-0 text-[11.5px] tabular-nums', t.unread ? cn('font-bold', G.text) : MUTED)}>{listTime(t.lastMessageAt)}</span>
                                    </span>
                                    <span className="flex items-center justify-between gap-2">
                                        <ListPreview t={t} />
                                        {t.unread > 0
                                            ? <span className={cn('flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold', G.solid)}>{t.unread}</span>
                                            : t.state === 'done' && filter !== 'done' && <span className={cn('shrink-0 text-[11px] font-semibold', MUTED)}>Done</span>}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </>
    );
};

/* ── A campaign's inbox (Outreach tab) ───────────────────────────────── */

const InboxPanel = ({ campaign = null, configured, onCompose = null }) => {
    const [scope, setScope] = useState(campaign ? 'campaign' : 'all');
    const [filter, setFilter] = useState('open');
    const [query, setQuery] = useState('');
    const [openId, setOpenId] = useState(null);
    const [data, load] = useThreads({ campaignId: scope === 'campaign' ? campaign?.id : null, filter });
    const unread = data.threads.reduce((n, t) => n + (t.unread || 0), 0);

    return (
        <div className="space-y-3">
            {!configured && <Card className="p-4 text-[13px] text-gray-600 dark:text-zinc-400">The WhatsApp API isn’t set up, so the inbox stays empty until it is (see docs/campaign-outreach.md).</Card>}
            <div className={cn('grid h-[min(760px,calc(100dvh-180px))] min-h-[520px] overflow-hidden rounded-3xl border shadow-[0_8px_32px_rgba(0,0,0,0.04)] lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]', LINE, SURFACE)}>
                <aside className={cn('flex min-h-0 flex-col border-r', LINE, openId && 'hidden lg:flex')}>
                    <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
                        <p className="font-heading text-[19px] font-bold text-gray-900 dark:text-white">Chats{unread > 0 && <span className={cn('ml-2 align-middle text-[12px]', G.text)}>{unread} unread</span>}</p>
                        {campaign && (
                            <div className="flex rounded-full bg-black/[0.04] p-0.5 text-[12px] font-bold dark:bg-white/[0.05]">
                                {[['campaign', 'This campaign'], ['all', 'All']].map(([v, l]) => (
                                    <button key={v} type="button" onClick={() => setScope(v)} className={cn('h-7 rounded-full px-3', scope === v ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : MUTED)}>{l}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <ChatList data={data} openId={openId} onOpen={setOpenId} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />
                </aside>
                <section className={cn('min-h-0', !openId && 'hidden lg:block')}>
                    {openId
                        ? <Conversation key={openId} threadId={openId} onBack={() => setOpenId(null)} onChanged={load} onCompose={onCompose} />
                        : <EmptyState icon={MessagesSquare} title="Pick a chat" description="You can reply, react and quote for 24 hours after someone writes; after that, send a template." />}
                </section>
            </div>
        </div>
    );
};

export default InboxPanel;
