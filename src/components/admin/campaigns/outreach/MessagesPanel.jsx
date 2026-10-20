import React, { useMemo, useState } from 'react';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Send from 'lucide-react/dist/esm/icons/send';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { copyToClipboard } from '../../../../lib/clipboard';
import { Button, Card, EmptyState, Menu, MenuItem } from '../../ui';
import { renderMessage, waLink } from '../../../../lib/outreach/template';
import { TRANSITIONS } from '../../../../lib/outreach/status';
import { IN_FLIGHT } from '../../../../lib/outreach/whatsappTemplate';
import { StatusBadge, Handle, STATUS_ACTIONS, when } from './parts';
import ApiSendCard, { DeliveryNote } from './ApiSendCard';

/*
 * Messaging shortlisted people. Shortlisting already tells everyone with a
 * Newbi account in the app and by push (and on WhatsApp through the API when
 * it's set up), so by hand is only for people without an account:
 *   - WhatsApp API (Phase 2, when it's set up): "Send to N" queues everyone
 *     waiting; the server sends the approved template at the rate limit and
 *     the badges follow delivery, read and "Joined".
 *   - By hand (the fallback): each person's message, "Open WhatsApp" (wa.me in
 *     a new tab, the admin presses send there) and "Copy message". Opening or
 *     copying moves them to "To send"; only "Mark sent" marks them sent. It's
 *     capped per day for the whole team (OUTREACH_WAME_DAILY_CAP, 20), because
 *     many chats from one number in a day get it restricted. Nothing is sent
 *     from the browser, and never to someone who replied STOP.
 *
 * WhatsApp Web logged us out after ~44 quick sends, so the panel counts how
 * many chats were opened in the last 10 minutes and suggests a pause.
 */

const PACE_WINDOW_MS = 10 * 60 * 1000;
const PACE_WARN_AT = 15;

const TO_MESSAGE = new Set(['shortlisted', 'message_queued']);
const MESSAGED = new Set(['message_sent', 'replied', 'joined', 'posted', 'paid']);

const MessageCard = ({ app, text, canSend: canSendIn, capReached, onQueue, onMarkSent, onStatus, onOpen }) => {
    const addToast = useStore(s => s.addToast);
    const [expanded, setExpanded] = useState(false);
    const link = waLink(app.phone, text);
    // By hand only for people without the app, who haven't said STOP, while today's cap lasts.
    const inApp = Boolean(app.uid);
    const blockedNote = app.whatsappOptOut ? 'They asked to stop WhatsApp updates.'
        : inApp ? 'Gets updates in the Newbi app, so there’s no need to message by hand.'
            : capReached && app.status === 'shortlisted' ? 'Today’s limit for chats opened by hand is reached. Try tomorrow.' : null;
    const canSend = canSendIn && !blockedNote;
    const copy = async () => {
        const ok = await copyToClipboard(text);
        if (ok) addToast('Paste it in WhatsApp.', 'success', { title: 'Message copied' });
        else addToast('Select the text and copy it yourself.', 'error', { title: 'Couldn’t copy the message' });
        if (ok && app.status === 'shortlisted') onQueue(app);
    };
    const later = (TRANSITIONS[app.status] || []).filter(s => !['message_queued', 'message_sent', 'shortlisted'].includes(s));

    return (
        <Card className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => onOpen(app)} className="min-w-0 text-left">
                    <p className="truncate text-[15px] font-bold">{app.fullName}</p>
                    <p className="truncate text-[13px] text-gray-500 dark:text-zinc-400"><Handle handle={app.instagramHandle} /> · {app.phone}</p>
                    <div className="mt-1"><DeliveryNote delivery={app.delivery?.whatsapp} joinedVia={app.joinedVia} lastReplyAt={app.lastReplyAt} /></div>
                </button>
                <StatusBadge status={app.status} />
            </div>
            <div className={cn('relative whitespace-pre-wrap rounded-2xl bg-emerald-500/[0.06] p-3 text-[13.5px] leading-relaxed ring-1 ring-inset ring-emerald-500/15', !expanded && 'max-h-28 overflow-hidden')}>
                {text}
                {!expanded && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-2xl bg-gradient-to-t from-white dark:from-[#0c0e14]" />}
            </div>
            <button type="button" onClick={() => setExpanded(v => !v)} className="flex h-8 items-center gap-1 text-[12px] font-semibold text-gray-500">
                <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} /> {expanded ? 'Show less' : 'Show the whole message'}
            </button>
            <div className="flex flex-wrap gap-2">
                {TO_MESSAGE.has(app.status) && blockedNote && <p className="flex min-h-10 items-center text-[12.5px] text-gray-500">{blockedNote}</p>}
                {TO_MESSAGE.has(app.status) && !blockedNote && (
                    <>
                        <Button
                            as="a"
                            variant="success"
                            href={canSend && link ? link : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-disabled={!canSend || !link}
                            className={cn((!canSend || !link) && 'pointer-events-none opacity-40')}
                            onClick={() => { if (app.status === 'shortlisted') onQueue(app); }}
                        >
                            <MessageCircle size={15} /> Open WhatsApp
                        </Button>
                        <Button onClick={copy} disabled={!canSend}><Copy size={14} /> Copy message</Button>
                        <Button
                            variant="accent"
                            disabled={app.status !== 'message_queued'}
                            title={app.status !== 'message_queued' ? 'Open WhatsApp or copy the message first' : undefined}
                            onClick={() => onMarkSent(app, text)}
                        >
                            <Check size={15} /> Mark sent
                        </Button>
                    </>
                )}
                {MESSAGED.has(app.status) && (
                    <p className="flex h-10 items-center text-[12.5px] text-gray-500">Sent {when(app.messageSentAt)}{app.messageSentBy ? ` by ${app.messageSentBy}` : ''}</p>
                )}
                {later.length > 0 && (
                    <Menu trigger={({ toggle }) => <Button variant="ghost" onClick={toggle}>More</Button>} title={app.fullName}>
                        {later.map(s => <MenuItem key={s} danger={s === 'removed'} onClick={() => onStatus([app.id], s)}>{STATUS_ACTIONS[s]}</MenuItem>)}
                    </Menu>
                )}
            </div>
        </Card>
    );
};

const MessagesPanel = ({ campaign, applications, settings, api, wame, onStatus, onOpen, onSetup, onSendApi, onStopApi }) => {
    const capReached = Boolean(wame && wame.usedToday >= wame.cap);
    const [show, setShow] = useState('to_message');
    const template = settings?.messageTemplate;
    const linkMissing = /\{group_link\}/.test(template || '') && !settings?.whatsappGroupLink;
    const renderFor = (app) => renderMessage(template, { application: app, campaign: { ...campaign, whatsappGroupLink: settings?.whatsappGroupLink } });

    const toMessage = applications.filter(a => TO_MESSAGE.has(a.status));
    const sendable = toMessage.filter(a => !IN_FLIGHT.has(a.delivery?.whatsapp?.status) && !a.whatsappOptOut);
    const byHand = toMessage.filter(a => !a.uid && !a.whatsappOptOut);
    const messaged = applications.filter(a => MESSAGED.has(a.status));
    const list = show === 'to_message' ? toMessage : messaged;

    const openedRecently = useMemo(() => {
        const since = Date.now() - PACE_WINDOW_MS;
        return applications.filter(a => Date.parse(a.messageQueuedAt || '') > since).length;
    }, [applications]);

    const queue = (app) => onStatus([app.id], 'message_queued', { quiet: true, source: 'wame' });
    const markSent = (app, text) => onStatus([app.id], 'message_sent', { messageText: text });

    return (
        <div className="space-y-4">
            {linkMissing && (
                <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-500/30 p-4">
                    <p className="text-[13.5px] font-semibold">Add the WhatsApp group link before messaging: the template uses {'{group_link}'}.</p>
                    <Button variant="accent" onClick={onSetup}>Set it up</Button>
                </Card>
            )}
            <ApiSendCard api={api} campaign={campaign} settings={settings} sendable={linkMissing ? [] : sendable} onSend={onSendApi} onStop={onStopApi} />
            {wame && byHand.length > 0 && (
                <Card className={cn('p-4 text-[13.5px]', capReached && 'border-amber-500/30')}>
                    <p className="font-semibold">{byHand.length} {byHand.length === 1 ? 'person has' : 'people have'} no Newbi account, so only you can message them.</p>
                    <p className="text-gray-600 dark:text-zinc-400">{wame.usedToday} of {wame.cap} chats opened by hand today. The limit keeps your WhatsApp number from being restricted.</p>
                </Card>
            )}
            {openedRecently >= PACE_WARN_AT && (
                <Card className="border-amber-500/30 p-4 text-[13.5px]">
                    <p className="font-semibold">You’ve opened {openedRecently} chats in the last 10 minutes.</p>
                    <p className="text-gray-600 dark:text-zinc-400">WhatsApp Web can sign you out after many quick sends. Take a short break before the next batch.</p>
                </Card>
            )}
            <div className="flex flex-wrap items-center gap-2">
                {[
                    { value: 'to_message', label: 'To message', count: toMessage.length },
                    { value: 'messaged', label: 'Messaged', count: messaged.length },
                ].map(t => (
                    <button
                        key={t.value}
                        type="button"
                        onClick={() => setShow(t.value)}
                        className={cn('h-9 rounded-full border px-3.5 text-[13px] font-semibold', show === t.value ? 'border-transparent bg-gray-900 text-white dark:bg-white dark:text-black' : 'border-black/10 text-gray-600 dark:border-white/10 dark:text-zinc-300')}
                    >
                        {t.label} · {t.count}
                    </button>
                ))}
            </div>
            {list.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={Send}
                        title={show === 'to_message' ? 'Nobody waiting for a message' : 'No messages sent yet'}
                        description={show === 'to_message' ? 'Add people to the shortlist from Applications, or paste their handles.' : 'People you mark sent show up here.'}
                    />
                </Card>
            ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {list.map(app => (
                        <MessageCard
                            key={app.id}
                            app={app}
                            text={renderFor(app)}
                            canSend={!linkMissing}
                            capReached={capReached}
                            onQueue={queue}
                            onMarkSent={markSent}
                            onStatus={onStatus}
                            onOpen={onOpen}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MessagesPanel;
