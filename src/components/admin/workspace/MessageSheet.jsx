import React, { useState } from 'react';
import Reply from 'lucide-react/dist/esm/icons/reply';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Archive from 'lucide-react/dist/esm/icons/archive';
import ArchiveRestore from 'lucide-react/dist/esm/icons/archive-restore';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { cn } from '../../../lib/utils';
import Sheet from '../Sheet';
import { Avatar, Badge, Button } from '../ui';
import { formatDateTime, relativeTime, whatsappLink } from './format';

export const messageState = (msg) => (msg?.status === 'archived' ? 'archived' : msg?.status === 'new' ? 'unread' : 'read');

const QuickLink = ({ href, onClick, icon: Icon, tone, children, external }) => {
    const cls = cn('flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-[12px] font-semibold transition-opacity hover:opacity-80', tone);
    if (href) return <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><Icon size={17} />{children}</a>;
    return <button type="button" onClick={onClick} className={cls}><Icon size={17} />{children}</button>;
};

/** One message: who sent it, what they said, and every way to answer. */
const MessageSheet = ({ open, onClose, message, onReply, onArchive, onRestore, onMarkUnread, onDelete }) => {
    const [copied, setCopied] = useState(false);
    if (!message) return <Sheet open={false} onClose={onClose} />;

    const state = messageState(message);
    const firstName = String(message.name || '').trim().split(' ')[0];
    const wa = whatsappLink(message.phone || message.whatsapp, `Hi ${firstName || 'there'}, this is Newbi replying to your message.`);
    const mailto = message.email ? `mailto:${message.email}?subject=${encodeURIComponent('Re: your message to Newbi')}` : null;

    const copyEmail = async () => {
        try {
            await navigator.clipboard.writeText(message.email);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard blocked */ }
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            size="lg"
            header={(
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={message.name || message.email} size={48} />
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-extrabold tracking-tight">{message.name || 'No name given'}</h2>
                        <p className="truncate text-[13px] text-gray-500">{message.email || 'No email given'}</p>
                    </div>
                </div>
            )}
            bodyClassName="space-y-5"
            footer={(
                <div className="space-y-2">
                    {message.email && (
                        <Button variant="primary" onClick={() => onReply(message)} className="h-12 w-full">
                            <Reply size={16} /> Reply by email
                        </Button>
                    )}
                    <div className="flex gap-2">
                        {state === 'archived' ? (
                            <Button variant="secondary" onClick={() => onRestore(message)} className="h-12 flex-1"><ArchiveRestore size={15} /> Move to inbox</Button>
                        ) : (
                            <Button variant="secondary" onClick={() => onArchive(message)} className="h-12 flex-1"><Archive size={15} /> Archive</Button>
                        )}
                        <Button variant="secondary" onClick={() => onMarkUnread(message)} className="h-12 flex-1"><Mail size={15} /> Mark unread</Button>
                        <Button variant="ghost" onClick={() => onDelete(message)} className="h-12 w-12 px-0 text-red-600 dark:text-red-400" aria-label="Delete message" title="Delete"><Trash2 size={16} /></Button>
                    </div>
                </div>
            )}
        >
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-gray-500">
                <span>{formatDateTime(message.createdAt) || 'Date unknown'}</span>
                <span aria-hidden="true">·</span>
                <span>{relativeTime(message.createdAt)}</span>
                {state === 'archived' && <Badge tone="gray">Archived</Badge>}
                {message.repliedAt && <Badge tone="green"><CheckCircle2 size={11} /> Replied {relativeTime(message.repliedAt)}</Badge>}
            </div>

            <div className="rounded-2xl rounded-tl-md bg-sky-500/[0.07] p-4 dark:bg-neon-blue/[0.06] sm:p-5">
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800 dark:text-zinc-200">{message.message || '(No message text)'}</p>
            </div>

            {message.repliedAt && (
                <p className="text-[12.5px] text-gray-500">
                    Last reply {formatDateTime(message.repliedAt)}{message.repliedBy ? ` by ${message.repliedBy}` : ''}{message.lastReplySubject ? ` · "${message.lastReplySubject}"` : ''}
                </p>
            )}

            <div className="grid grid-cols-3 gap-2">
                {mailto && <QuickLink href={mailto} icon={Mail} tone="bg-sky-500/[0.08] text-sky-700 dark:bg-neon-blue/[0.08] dark:text-neon-blue">Mail app</QuickLink>}
                {wa && <QuickLink href={wa} external icon={MessageCircle} tone="bg-emerald-500/[0.08] text-emerald-700 dark:bg-neon-green/[0.08] dark:text-neon-green">WhatsApp</QuickLink>}
                {message.email && <QuickLink onClick={copyEmail} icon={copied ? CheckCircle2 : Copy} tone="bg-violet-500/[0.08] text-violet-700 dark:bg-neon-purple/[0.08] dark:text-violet-300">{copied ? 'Copied' : 'Copy email'}</QuickLink>}
            </div>
            {!wa && <p className="text-[12px] text-gray-500">The contact form doesn't ask for a phone number, so WhatsApp shows up only when one was given.</p>}
        </Sheet>
    );
};

export default MessageSheet;
