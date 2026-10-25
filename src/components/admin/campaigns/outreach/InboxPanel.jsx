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
import Lock from 'lucide-react/dist/esm/icons/lock';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Card, Badge, EmptyState, Menu, MenuItem } from '../../ui';
import { Spinner } from '../parts';
import { callOutreach } from './outreachApi';
import { StatusBadge } from './parts';
import { waText } from '../../whatsapp/waText';

/*
 * The WhatsApp inbox, laid out like WhatsApp itself: chats on the left, the
 * conversation on the right. Every conversation, newest first, for this
 * campaign or all of them (the WhatsApp center passes no campaign and shows
 * all). Free text, reactions and quoted replies only within 24 hours of their
 * last message (WhatsApp's rule); after that, send a template instead. Photos,
 * voice notes and files load through the server when you ask for them.
 */

const POLL_MS = 20_000;
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EMOJIS = ['😀', '😂', '😊', '😍', '🥳', '😎', '🤩', '😅', '🙂', '😉', '🤔', '😮', '😢', '🙏', '👍', '👏', '🙌', '💪', '🔥', '✨', '🎉', '❤️', '✅', '📍'];
const BRAND = '#00a884';

/* WhatsApp's chat background and bubble colours, light and dark. */
const WALLPAPER = 'bg-[#efeae2] dark:bg-[#0b141a]';
const WALLPAPER_STYLE = { backgroundImage: 'radial-gradient(rgba(120,110,90,0.09) 1px, transparent 1px)', backgroundSize: '18px 18px' };
const BUBBLE_IN = 'bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]';
const BUBBLE_OUT = 'bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]';
const TAIL_IN = 'text-white dark:text-[#202c33]';
const TAIL_OUT = 'text-[#d9fdd3] dark:text-[#005c4b]';
const BAR = 'bg-[#f0f2f5] dark:bg-[#202c33]';

const clockTime = (iso) => {
    const t = Date.parse(iso || '');
    return t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
};
const dayKey = (iso) => new Date(Date.parse(iso || '') || 0).toDateString();
/* "Today", "Yesterday", "Monday", "12 October 2026": WhatsApp's date chips. */
const dayLabel = (iso) => {
    const d = new Date(Date.parse(iso || '') || 0);
    const today = new Date();
    const days = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};
/* The chat list's time: 14:05 today, "Yesterday", a weekday, else a date. */
const listTime = (iso) => {
    const t = Date.parse(iso || '');
    if (!t) return '';
    const label = dayLabel(iso);
    if (label === 'Today') return clockTime(iso);
    if (label === 'Yesterday' || !/\d/.test(label)) return label;
    return new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const shortName = (email) => String(email || '').split('@')[0];

const AVATAR_TONES = ['#25d366', '#53bdeb', '#a5b337', '#ff7eb6', '#ffbc38', '#7f66ff', '#ef6a4b', '#06cf9c', '#c37ce7', '#02a698'];
const ContactAvatar = ({ name, size = 49 }) => {
    let h = 0;
    for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const initials = String(name || '?').replace(/^\+/, '').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?';
    return (
        <span
            className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
            style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: AVATAR_TONES[h % AVATAR_TONES.length] }}
            aria-hidden="true"
        >
            {/^\d/.test(initials) ? '#' : initials}
        </span>
    );
};

/* Single grey tick when sent, two when delivered, two blue when read. */
const Ticks = ({ status, className }) => {
    if (status === 'read') return <CheckCheck size={16} className={cn('text-[#53bdeb]', className)} aria-label="Read" />;
    if (status === 'delivered') return <CheckCheck size={16} className={cn('text-[#667781] dark:text-[#8696a0]', className)} aria-label="Delivered" />;
    if (status === 'failed') return <AlertCircle size={14} className={cn('text-rose-500', className)} aria-label="Not delivered" />;
    if (status === 'queued') return <Clock size={13} className={cn('text-[#667781] dark:text-[#8696a0]', className)} aria-label="Waiting to send" />;
    return <Check size={16} className={cn('text-[#667781] dark:text-[#8696a0]', className)} aria-label="Sent" />;
};

/* The little curl on the first bubble of a run, as WhatsApp draws it. */
const Tail = ({ out }) => (
    <svg viewBox="0 0 8 13" width="8" height="13" className={cn('absolute top-0', out ? '-right-2' : '-left-2', out ? TAIL_OUT : TAIL_IN)} aria-hidden="true">
        <path fill="currentColor" d={out ? 'M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z' : 'M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z'} />
    </svg>
);

const MEDIA_LABEL = { image: 'Photo', video: 'Video', audio: 'Voice message', voice: 'Voice message', document: 'Document', sticker: 'Sticker' };
const MEDIA_ICON = { image: ImageIcon, video: Video, audio: Mic, voice: Mic, document: FileText, sticker: Smile };

/* A short line for a quoted message or the reply bar. */
const snippet = (m) => {
    if (!m) return 'Earlier message';
    if (m.text) return m.text;
    if (m.caption) return `${MEDIA_LABEL[m.type] || m.type}: ${m.caption}`;
    return MEDIA_LABEL[m.type] || 'Message';
};

/* Photos, voice notes, videos and files: fetched through the server when asked for. */
const Media = ({ m, threadId }) => {
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

    if (!media) {
        if (m.type === 'image' || m.type === 'video' || m.type === 'sticker') {
            return (
                <button type="button" onClick={load} disabled={loading} className={cn('flex flex-col items-center justify-center gap-2 rounded-md bg-black/[0.06] text-[#54656f] dark:bg-white/[0.06] dark:text-[#aebac1]', m.type === 'sticker' ? 'h-32 w-32' : 'h-44 w-64 max-w-full')}>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white">{loading ? <Spinner className="h-5 w-5" /> : <Icon size={22} />}</span>
                    <span className="text-[12.5px] font-medium">{loading ? 'Loading…' : `${MEDIA_LABEL[m.type]} · tap to load`}</span>
                </button>
            );
        }
        return (
            <button type="button" onClick={load} disabled={loading} className="flex w-64 max-w-full items-center gap-3 rounded-md bg-black/[0.05] px-3 py-2.5 text-left dark:bg-white/[0.06]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: BRAND }}>{loading ? <Spinner className="h-4 w-4" /> : <Icon size={18} />}</span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{m.type === 'document' && m.caption ? m.caption : MEDIA_LABEL[m.type] || 'Attachment'}</span>
                    <span className="block text-[12px] text-[#667781] dark:text-[#8696a0]">{loading ? 'Loading…' : 'Tap to load'}</span>
                </span>
            </button>
        );
    }
    if (mime.startsWith('image/')) {
        return (
            <>
                <button type="button" onClick={(e) => { e.stopPropagation(); setZoom(true); }} className="block">
                    <img src={media.dataUrl} alt={m.caption || 'Photo they sent'} className={cn('rounded-md object-cover', m.type === 'sticker' ? 'h-32 w-32 object-contain' : 'max-h-80 w-auto max-w-full')} />
                </button>
                {zoom && (
                    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(false)} role="dialog" aria-label="Photo">
                        <button type="button" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Close"><X size={20} /></button>
                        <img src={media.dataUrl} alt={m.caption || 'Photo they sent'} className="max-h-full max-w-full rounded-lg" />
                    </div>
                )}
            </>
        );
    }
    if (mime.startsWith('audio/')) return <audio controls src={media.dataUrl} className="h-10 w-64 max-w-full" />;
    if (mime.startsWith('video/')) return <video controls src={media.dataUrl} className="max-h-80 max-w-full rounded-md" />;
    return (
        <a href={media.dataUrl} download={m.caption || 'attachment'} onClick={(e) => e.stopPropagation()} className="flex w-64 max-w-full items-center gap-3 rounded-md bg-black/[0.05] px-3 py-2.5 dark:bg-white/[0.06]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: BRAND }}><FileText size={18} /></span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium underline">{m.caption || 'Download'}</span>
        </a>
    );
};

/* A quoted message inside a bubble (a swipe-reply), like WhatsApp's. */
const Quote = ({ quoted, who, onJump }) => (
    <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onJump(); }}
        className="mb-1 flex w-full min-w-[180px] overflow-hidden rounded-md bg-black/[0.05] text-left dark:bg-black/20"
    >
        <span className={cn('w-1 shrink-0', who === 'You' ? 'bg-[#06cf9c]' : 'bg-[#7f66ff]')} />
        <span className="min-w-0 flex-1 px-2 py-1.5">
            <span className={cn('block text-[12.5px] font-semibold', who === 'You' ? 'text-[#06cf9c]' : 'text-[#7f66ff]')}>{who}</span>
            <span className="line-clamp-2 block text-[12.5px] text-[#667781] dark:text-[#aebac1]">{snippet(quoted)}</span>
        </span>
    </button>
);

const Bubble = ({ m, threadId, first, reactions, quoted, quotedWho, canAct, active, onActive, onReact, onReply, onJump, flash }) => {
    const out = m.direction === 'out';
    const [picking, setPicking] = useState(false);
    const isMedia = m.hasMedia || ['image', 'video', 'audio', 'voice', 'document', 'sticker'].includes(m.type);
    const sticker = m.type === 'sticker';
    const visual = ['image', 'video', 'sticker'].includes(m.type);
    const body = m.text || (m.type !== 'document' ? m.caption : '');
    const unsupported = !isMedia && !body && m.type !== 'location';
    const emojis = [reactions?.in, reactions?.out].filter(Boolean);
    useEffect(() => { if (!active) setPicking(false); }, [active]);

    const meta = (
        <span className={cn('flex items-center gap-1 whitespace-nowrap text-[11px] leading-none text-[#667781] dark:text-[#8696a0]', visual && !body && 'rounded-full bg-black/40 px-1.5 py-1 text-white dark:text-white [&_svg]:text-white')}>
            {clockTime(m.at)}
            {out && <Ticks status={m.status} />}
        </span>
    );

    return (
        <div id={`m-${m.id}`} className={cn('group/msg relative flex px-[4%] sm:px-[7%]', out ? 'justify-end' : 'justify-start', first ? 'mt-3' : 'mt-0.5', emojis.length && 'mb-4')}>
            <div className={cn('relative flex max-w-[85%] items-center gap-1.5 sm:max-w-[65%]', out && 'flex-row-reverse')}>
                <div
                    onClick={onActive}
                    className={cn(
                        'relative flow-root min-w-[84px] rounded-lg text-[14.2px] leading-[19px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-shadow',
                        sticker ? 'bg-transparent shadow-none' : (out ? BUBBLE_OUT : BUBBLE_IN),
                        !sticker && (isMedia ? 'p-1' : 'px-2 pb-2 pt-1.5'),
                        first && !sticker && (out ? 'rounded-tr-none' : 'rounded-tl-none'),
                        flash && 'ring-2 ring-[#00a884]/60',
                    )}
                >
                    {first && !sticker && <Tail out={out} />}
                    {out && first && m.sentBy && <p className="mb-0.5 px-1 text-[12px] font-semibold text-[#008069] dark:text-[#06cf9c]">{shortName(m.sentBy)}</p>}
                    {m.replyTo && <Quote quoted={quoted} who={quotedWho} onJump={onJump} />}
                    {isMedia && <Media m={m} threadId={threadId} />}
                    {m.type === 'location' && (
                        <p className="flex items-start gap-1.5"><MapPin size={16} className="mt-0.5 shrink-0 text-rose-500" /><span>{m.text || 'Location'}</span></p>
                    )}
                    {unsupported && <p className="italic text-[#667781] dark:text-[#8696a0]">This kind of message ({m.type}) can’t be shown here. Open WhatsApp on the phone to see it.</p>}
                    {body && m.type !== 'location' && (
                        <p className={cn('whitespace-pre-wrap [overflow-wrap:anywhere]', isMedia && 'px-1 pt-1')}>
                            {waText(body)}
                            {/* Room for the time, so it sits on the last line like WhatsApp's. */}
                            <span className={cn('inline-block', out ? 'w-[68px]' : 'w-[44px]')} aria-hidden="true" />
                        </p>
                    )}
                    <span className={cn(body || m.type === 'location' || unsupported ? 'float-right -mb-1 -mt-3 ml-2' : visual ? 'absolute bottom-2 right-2' : 'float-right mt-1 px-1')}>{meta}</span>
                    {out && m.status === 'failed' && m.error && <p className="clear-both pt-1 text-[12px] text-rose-600 dark:text-rose-400">Not delivered: {m.error}</p>}

                    {emojis.length > 0 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (canAct && reactions?.out) onReact(''); }}
                            title={[reactions?.in && `They reacted ${reactions.in}`, reactions?.out && `You reacted ${reactions.out}${canAct ? ' (tap to remove)' : ''}`].filter(Boolean).join(' · ')}
                            className={cn('absolute -bottom-4 flex h-[22px] items-center gap-0.5 rounded-full bg-white px-1.5 text-[13px] shadow-[0_1px_3px_rgba(11,20,26,0.2)] ring-1 ring-black/[0.04] dark:bg-[#202c33] dark:ring-white/[0.06]', out ? 'right-2' : 'left-2')}
                        >
                            {[...new Set(emojis)].map(e => <span key={e}>{e}</span>)}
                            {emojis.length > 1 && <span className="pl-0.5 text-[11px] text-[#667781] dark:text-[#8696a0]">{emojis.length}</span>}
                        </button>
                    )}
                </div>

                {canAct && m.wamid && (
                    <div className={cn('relative flex shrink-0 items-center gap-0.5 transition-opacity', active ? 'opacity-100' : 'pointer-events-none opacity-0 sm:group-hover/msg:pointer-events-auto sm:group-hover/msg:opacity-100')}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPicking(p => !p); }} aria-label="React" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] text-[#54656f] hover:bg-black/10 dark:bg-white/[0.08] dark:text-[#aebac1]"><Smile size={17} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onReply(); }} aria-label="Reply" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] text-[#54656f] hover:bg-black/10 dark:bg-white/[0.08] dark:text-[#aebac1]"><Reply size={17} /></button>
                        {picking && (
                            <div className={cn('absolute bottom-10 z-20 flex items-center gap-0.5 rounded-full bg-white p-1.5 shadow-lg ring-1 ring-black/[0.06] dark:bg-[#233138] dark:ring-white/[0.06]', out ? 'right-0' : 'left-0')} onClick={(e) => e.stopPropagation()}>
                                {QUICK_REACTIONS.map(e => (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() => { setPicking(false); onReact(reactions?.out === e ? '' : e); }}
                                        className={cn('flex h-9 w-9 items-center justify-center rounded-full text-[22px] transition-transform hover:scale-125', reactions?.out === e && 'bg-black/[0.08] dark:bg-white/10')}
                                        aria-label={`React ${e}`}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* Centered chips: the date, and notes like a reaction on an older message. */
const Chip = ({ children, tone = 'plain' }) => (
    <div className="my-2 flex justify-center px-4">
        <span className={cn('rounded-lg px-3 py-1.5 text-center text-[12.5px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]', tone === 'note' ? 'bg-[#ffeecd] text-[#54656f] dark:bg-[#182229] dark:text-[#ffd279]' : 'bg-white text-[#54656f] dark:bg-[#182229] dark:text-[#8696a0]')}>
            {children}
        </span>
    </div>
);

const Conversation = ({ threadId, onBack, onChanged, onCompose }) => {
    const addToast = useStore(s => s.addToast);
    const [data, setData] = useState(null);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [active, setActive] = useState(null);
    const [flash, setFlash] = useState(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
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
        const wamids = Object.fromEntries(msgs.filter(m => m.wamid && m.type !== 'reaction').map(m => [m.wamid, m]));
        // Their reaction on a message older than what's loaded (or from before reactions were kept) shows as a note.
        const note = (m) => m.direction === 'in' && (!m.reactTo || (m.text && !wamids[m.reactTo]));
        return { shown: msgs.filter(m => m.type !== 'reaction' || note(m)), reactionsByWamid: reactions, byWamid: wamids };
    }, [data?.messages]);

    if (!data) return <div className={cn('flex h-full items-center justify-center text-gray-400', WALLPAPER)} style={WALLPAPER_STYLE}><Spinner className="h-6 w-6" /></div>;
    const { thread, messages, applications } = data;
    const name = applications[0]?.fullName || thread.name || thread.phone;
    const canAct = thread.windowOpen;

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
        onChanged();
    };
    const react = async (m, emoji) => {
        // Show it straight away; the reload confirms it.
        setData(d => ({ ...d, messages: [...d.messages.filter(x => x.id !== `r_${m.id}`), { id: `r_${m.id}`, direction: 'out', type: 'reaction', text: emoji, reactTo: m.wamid, at: new Date().toISOString() }] }));
        setActive(null);
        const r = await callOutreach('inbox-react', { threadId, messageId: m.id, emoji });
        if (!r.ok) addToast(r.error || 'Please try again.', 'error', { title: 'Reaction not sent' });
        load();
    };
    const template = async (kind) => {
        const r = await callOutreach('inbox-template', { threadId, kind });
        if (r.ok) addToast('Sent.', 'success');
        else addToast(r.error || 'Please try again.', 'error', { title: 'Message not sent', action: { label: 'Try again', onClick: () => template(kind) } });
        load();
    };
    const setState = async (state) => {
        await callOutreach('inbox-state', { threadId, state });
        onChanged();
        if (state === 'done') onBack();
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
            rows.push(<Chip key={m.id} tone="note">{m.text ? `${name.split(/\s+/)[0]} reacted ${m.text} to an older message` : `${name.split(/\s+/)[0]} reacted to a message`} · {clockTime(m.at)}</Chip>);
            prev = null;
            return;
        }
        const first = !prev || prev.direction !== m.direction || Date.parse(m.at) - Date.parse(prev.at) > 10 * 60_000 || (m.direction === 'out' && prev.sentBy !== m.sentBy);
        const quoted = m.replyTo ? byWamid[m.replyTo] : null;
        rows.push(
            <Bubble
                key={m.id}
                m={m}
                threadId={threadId}
                first={first}
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
            <header className={cn('flex h-[60px] shrink-0 items-center gap-3 border-l border-black/[0.08] px-3 dark:border-white/[0.06]', BAR)}>
                <button type="button" onClick={onBack} aria-label="Back to chats" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 lg:hidden dark:text-[#aebac1]"><ChevronLeft size={22} /></button>
                <ContactAvatar name={name} size={40} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15.5px] font-medium text-[#111b21] dark:text-[#e9edef]">{name}</p>
                    <p className="truncate text-[12.5px] text-[#667781] dark:text-[#8696a0]">
                        {thread.phone}{thread.name && thread.name !== name ? ` · ~${thread.name}` : ''}
                        {canAct ? ' · replies open' : ''}
                    </p>
                </div>
                {thread.state === 'done' && <Badge tone="gray">Done</Badge>}
                <Menu
                    title={name}
                    trigger={({ toggle }) => (
                        <button type="button" onClick={toggle} aria-label="Conversation options" className="flex h-10 w-10 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 dark:text-[#aebac1] dark:hover:bg-white/5"><MoreVertical size={20} /></button>
                    )}
                >
                    <MenuItem icon={Check} onClick={() => setState(thread.state === 'done' ? 'open' : 'done')}>{thread.state === 'done' ? 'Reopen conversation' : 'Mark done'}</MenuItem>
                    {onCompose && <MenuItem icon={Send} onClick={() => onCompose({ phone: thread.phone, name })}>Send a template</MenuItem>}
                </Menu>
            </header>
            {(applications.length > 0 || data.creatorId) && (
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-l border-black/[0.06] bg-white px-4 py-2 text-[12px] text-[#54656f] dark:border-white/[0.06] dark:bg-[#111b21] dark:text-[#aebac1]">
                    {applications.map(a => (
                        <span key={`${a.campaignId}_${a.appId}`} className="inline-flex items-center gap-1.5">{a.campaignTitle}: <StatusBadge status={a.status} /></span>
                    ))}
                    {data.creatorId && <Badge tone="violet">Newbi creator</Badge>}
                </div>
            )}

            <div
                ref={scrollRef}
                onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}
                onClick={() => setActive(null)}
                className={cn('min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-l border-black/[0.06] pb-3 dark:border-white/[0.06]', WALLPAPER)}
                style={WALLPAPER_STYLE}
            >
                <Chip tone="note"><Lock size={11} className="mr-1 inline -translate-y-px" />Messages go through Newbi’s WhatsApp Business number. Everyone on the team can see this chat.</Chip>
                {messages.length === 0 && <Chip>No messages yet</Chip>}
                {rows}
            </div>

            <footer className={cn('shrink-0 border-l border-black/[0.08] dark:border-white/[0.06]', BAR)}>
                {canAct ? (
                    <>
                        {replyTo && (
                            <div className="flex items-center gap-2 px-3 pt-2">
                                <div className="flex min-w-0 flex-1 overflow-hidden rounded-lg bg-black/[0.05] dark:bg-black/20">
                                    <span className={cn('w-1 shrink-0', replyTo.direction === 'out' ? 'bg-[#06cf9c]' : 'bg-[#7f66ff]')} />
                                    <span className="min-w-0 flex-1 px-3 py-2">
                                        <span className={cn('block text-[12.5px] font-semibold', replyTo.direction === 'out' ? 'text-[#06cf9c]' : 'text-[#7f66ff]')}>{whoOf(replyTo)}</span>
                                        <span className="block truncate text-[13px] text-[#667781] dark:text-[#aebac1]">{snippet(replyTo)}</span>
                                    </span>
                                </div>
                                <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 dark:text-[#aebac1]"><X size={18} /></button>
                            </div>
                        )}
                        <form onSubmit={reply} className="relative flex items-end gap-2 px-3 py-2.5">
                            <button type="button" onClick={() => setEmojiOpen(o => !o)} aria-label="Emoji" className={cn('mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 dark:text-[#aebac1] dark:hover:bg-white/5', emojiOpen && 'text-[#00a884] dark:text-[#00a884]')}><Smile size={24} /></button>
                            {emojiOpen && (
                                <div className="absolute bottom-full left-3 z-20 mb-1 grid w-[min(320px,calc(100%-24px))] grid-cols-8 gap-0.5 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black/[0.06] dark:bg-[#233138] dark:ring-white/[0.06]">
                                    {EMOJIS.map(e => (
                                        <button key={e} type="button" onClick={() => { setText(t => t + e); inputRef.current?.focus(); }} className="flex h-9 items-center justify-center rounded-lg text-[21px] hover:bg-black/5 dark:hover:bg-white/10" aria-label={`Add ${e}`}>{e}</button>
                                    ))}
                                </div>
                            )}
                            <textarea
                                ref={inputRef}
                                className="max-h-[140px] min-h-[42px] flex-1 resize-none rounded-lg border-0 bg-white px-3 py-[10px] text-[15px] leading-[21px] text-[#111b21] outline-none placeholder:text-[#667781] focus:ring-0 dark:bg-[#2a3942] dark:text-[#e9edef] dark:placeholder:text-[#8696a0]"
                                rows={1}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onFocus={() => setEmojiOpen(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply(e); }
                                    if (e.key === 'Escape') setReplyTo(null);
                                }}
                                placeholder="Type a message"
                                maxLength={4096}
                                aria-label="Reply"
                            />
                            <button type="submit" disabled={sending || !text.trim()} aria-label="Send reply" className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40" style={{ background: BRAND }}>
                                {sending ? <Spinner className="h-4 w-4" /> : <Send size={18} className="translate-x-[1px]" />}
                            </button>
                        </form>
                        {thread.windowClosesAt && (
                            <p className="-mt-1 px-4 pb-2 text-[11.5px] text-[#667781] dark:text-[#8696a0]">
                                Free replies until {new Date(thread.windowClosesAt).toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}. Enter sends, Shift+Enter adds a line.
                            </p>
                        )}
                    </>
                ) : (
                    <div className="space-y-2.5 px-4 py-3 text-center">
                        <p className="text-[13px] text-[#54656f] dark:text-[#aebac1]">
                            <Clock size={13} className="mr-1 inline -translate-y-px" />
                            It’s been over 24 hours since their last message, so WhatsApp only allows an approved template.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <button type="button" onClick={() => template('deliverables')} disabled={!thread.lastAppId} className="h-9 rounded-full border border-black/10 bg-white px-4 text-[13px] font-medium text-[#008069] disabled:opacity-40 dark:border-white/10 dark:bg-[#2a3942] dark:text-[#06cf9c]">Send their posts link</button>
                            <button type="button" onClick={() => template('reminder')} disabled={!thread.lastAppId} className="h-9 rounded-full border border-black/10 bg-white px-4 text-[13px] font-medium text-[#008069] disabled:opacity-40 dark:border-white/10 dark:bg-[#2a3942] dark:text-[#06cf9c]">Send the join reminder</button>
                            {onCompose && <button type="button" onClick={() => onCompose({ phone: thread.phone, name })} className="h-9 rounded-full px-4 text-[13px] font-semibold text-white" style={{ background: BRAND }}>Send a template</button>}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};

/* What the chat list shows under a name. */
const ListPreview = ({ t }) => {
    const reaction = /^Reacted /.test(t.lastText || '');
    return (
        <span className="flex min-w-0 items-center gap-1 text-[13.5px] text-[#667781] dark:text-[#8696a0]">
            {t.lastDirection === 'out' && !reaction && <CheckCheck size={16} className="shrink-0" />}
            <span className="truncate">{t.lastDirection === 'out' && reaction ? `You ${t.lastText.toLowerCase()}` : t.lastText}</span>
        </span>
    );
};

const FILTERS = [
    { value: 'open', label: 'Open' },
    { value: 'unread', label: 'Unread' },
    { value: 'done', label: 'Done' },
    { value: 'all', label: 'All' },
];

const InboxPanel = ({ campaign = null, configured, onCompose = null }) => {
    const [scope, setScope] = useState(campaign ? 'campaign' : 'all');
    const [filter, setFilter] = useState('open');
    const [query, setQuery] = useState('');
    const [data, setData] = useState({ loading: true, threads: [] });
    const [openId, setOpenId] = useState(null);
    const state = filter === 'unread' ? 'all' : filter;
    const load = useCallback(async () => {
        const r = await callOutreach('inbox-list', { campaignId: scope === 'campaign' && campaign ? campaign.id : undefined, state });
        setData({ loading: false, threads: r.ok ? r.data.threads : [], error: r.ok ? '' : r.error });
    }, [scope, state, campaign?.id]);
    useEffect(() => {
        load();
        const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    const q = query.trim().toLowerCase();
    const threads = data.threads.filter(t => (filter !== 'unread' || t.unread > 0)
        && (!q || [t.name, t.phone, t.lastText].some(v => String(v || '').toLowerCase().includes(q))));
    const unreadTotal = data.threads.reduce((n, t) => n + (t.unread || 0), 0);

    return (
        <div className="space-y-3">
            {!configured && <Card className="p-4 text-[13px] text-gray-600 dark:text-zinc-400">The WhatsApp API isn’t set up, so the inbox stays empty until it is (see docs/campaign-outreach.md).</Card>}
            <div className="grid h-[min(780px,calc(100dvh-170px))] min-h-[520px] overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] dark:border-white/[0.08] dark:bg-[#111b21]">
                <aside className={cn('flex min-h-0 flex-col', openId && 'hidden lg:flex')}>
                    <div className="flex h-[60px] shrink-0 items-center justify-between gap-2 px-4">
                        <p className="text-[20px] font-bold text-[#111b21] dark:text-[#e9edef]">Chats{unreadTotal > 0 && <span className="ml-2 align-middle text-[12px] font-semibold text-[#00a884]">{unreadTotal} unread</span>}</p>
                        {campaign && (
                            <div className="flex rounded-full bg-[#f0f2f5] p-0.5 text-[12px] font-medium dark:bg-[#202c33]">
                                {[['campaign', 'This campaign'], ['all', 'All']].map(([v, l]) => (
                                    <button key={v} type="button" onClick={() => setScope(v)} className={cn('h-7 rounded-full px-3', scope === v ? 'bg-white text-[#111b21] shadow-sm dark:bg-[#2a3942] dark:text-[#e9edef]' : 'text-[#667781] dark:text-[#8696a0]')}>{l}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="shrink-0 px-3 pb-2">
                        <label className="flex h-9 items-center gap-3 rounded-lg bg-[#f0f2f5] px-3 dark:bg-[#202c33]">
                            <Search size={16} className="shrink-0 text-[#54656f] dark:text-[#aebac1]" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, number or message" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-[#111b21] outline-none placeholder:text-[#667781] focus:ring-0 dark:text-[#e9edef] dark:placeholder:text-[#8696a0]" aria-label="Search chats" />
                            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-[#54656f] dark:text-[#aebac1]"><X size={15} /></button>}
                        </label>
                    </div>
                    <div className="flex shrink-0 gap-2 overflow-x-auto px-3 pb-2">
                        {FILTERS.map(f => (
                            <button key={f.value} type="button" onClick={() => setFilter(f.value)} className={cn('h-8 shrink-0 rounded-full px-3 text-[13.5px] font-medium transition-colors', filter === f.value ? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#0a332c] dark:text-[#06cf9c]' : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] dark:bg-[#202c33] dark:text-[#aebac1]')}>{f.label}</button>
                        ))}
                    </div>
                    <ul className="min-h-0 flex-1 overflow-y-auto">
                        {data.loading && <li className="flex justify-center py-10 text-gray-400"><Spinner className="h-5 w-5" /></li>}
                        {!data.loading && data.error && <li className="px-4 py-6 text-[13px] text-rose-600">{data.error}</li>}
                        {!data.loading && !data.error && !threads.length && (
                            <li><EmptyState icon={MessagesSquare} title={q ? 'No chats match' : 'No conversations'} description={q ? 'Try a name, a number or a word from the message.' : 'Replies to your WhatsApp messages show up here.'} /></li>
                        )}
                        {threads.map(t => (
                            <li key={t.id}>
                                <button type="button" onClick={() => setOpenId(t.id)} className={cn('flex w-full items-center gap-3 pl-3 text-left transition-colors', openId === t.id ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]')}>
                                    <ContactAvatar name={t.name || t.phone} />
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 border-b border-black/[0.06] py-3 pr-3 dark:border-white/[0.06]">
                                        <span className="flex items-baseline justify-between gap-2">
                                            <span className="truncate text-[16px] text-[#111b21] dark:text-[#e9edef]">{t.name || t.phone}</span>
                                            <span className={cn('shrink-0 text-[12px]', t.unread ? 'font-medium text-[#00a884]' : 'text-[#667781] dark:text-[#8696a0]')}>{listTime(t.lastMessageAt)}</span>
                                        </span>
                                        <span className="flex items-center justify-between gap-2">
                                            <ListPreview t={t} />
                                            {t.unread > 0
                                                ? <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11.5px] font-semibold text-white" style={{ background: BRAND }}>{t.unread}</span>
                                                : t.state === 'done' && filter !== 'done' && <span className="shrink-0 text-[11px] text-[#667781] dark:text-[#8696a0]">Done</span>}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </aside>
                <section className={cn('min-h-0', !openId && 'hidden lg:block')}>
                    {openId
                        ? <Conversation key={openId} threadId={openId} onBack={() => setOpenId(null)} onChanged={load} onCompose={onCompose} />
                        : (
                            <div className="hidden h-full flex-col items-center justify-center gap-3 border-l border-black/[0.08] bg-[#f0f2f5] px-10 text-center lg:flex dark:border-white/[0.06] dark:bg-[#222e35]">
                                <span className="flex h-20 w-20 items-center justify-center rounded-full text-white" style={{ background: BRAND }}><MessagesSquare size={36} /></span>
                                <p className="text-[26px] font-light text-[#41525d] dark:text-[#e9edef]">Newbi on WhatsApp</p>
                                <p className="max-w-sm text-[14px] text-[#667781] dark:text-[#8696a0]">Pick a chat to read and reply. You can reply freely, react and quote messages for 24 hours after someone writes; after that, send a template.</p>
                            </div>
                        )}
                </section>
            </div>
        </div>
    );
};

export default InboxPanel;
