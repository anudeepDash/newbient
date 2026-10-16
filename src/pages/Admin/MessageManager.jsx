import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import MailOpen from 'lucide-react/dist/esm/icons/mail-open';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Archive from 'lucide-react/dist/esm/icons/archive';
import ArchiveRestore from 'lucide-react/dist/esm/icons/archive-restore';
import Reply from 'lucide-react/dist/esm/icons/reply';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { generateOfficialHTML } from '../../lib/email';
import { exportSubtitle } from '../../lib/xlsx';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import {
    Card, Button, Badge, StatTile, SearchInput, SegmentedTabs, EmptyState, Avatar, Menu, MenuItem,
} from '../../components/admin/ui';
import ExportMenu from '../../components/admin/ExportMenu';
import EmailComposer from '../../components/admin/EmailComposer';
import ConfirmSheet from '../../components/admin/workspace/ConfirmSheet';
import MessageSheet, { messageState } from '../../components/admin/workspace/MessageSheet';
import { toDate, formatDay, formatDateTime, relativeTime, escapeHtml } from '../../components/admin/workspace/format';

/*
 * Inbox: contact-form messages. `status` stays 'new' | 'read' (plus
 * 'archived') because the admin shell counts status === 'new' for the
 * unread badge. Opening a message marks it read.
 */

const PAGE = 40;
const FILTERS = [
    { value: 'inbox', label: 'Inbox' },
    { value: 'unread', label: 'Unread' },
    { value: 'replied', label: 'Replied' },
    { value: 'archived', label: 'Archived' },
];

const sendEmail = async ({ to, cc, bcc, subject, html }) => {
    const { auth } = await import('../../lib/firebase');
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const res = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ to, cc, bcc, subject, html, fromName: 'Newbi Entertainment' }),
    });
    const result = await res.json().catch(() => ({}));
    if (!result.success) throw new Error(result.error || 'Send failed');
};

const MessageManager = () => {
    useStoreSubscription(['messages']);
    const messages = useStore(s => s.messages);
    const loaded = useStore(s => s.subscriptionsLoaded?.messages);
    const user = useStore(s => s.user);
    const markMessageRead = useStore(s => s.markMessageRead);
    const updateMessage = useStore(s => s.updateMessage);
    const deleteMessage = useStore(s => s.deleteMessage);
    const addToast = useStore(s => s.addToast);

    const [searchParams, setSearchParams] = useSearchParams();
    const filter = FILTERS.some(f => f.value === searchParams.get('filter')) ? searchParams.get('filter') : 'inbox';
    const openId = searchParams.get('id');
    const setParams = useCallback((patch) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([k, v]) => (v == null || v === '' ? next.delete(k) : next.set(k, v)));
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(PAGE);
    const [confirm, setConfirm] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    useEffect(() => { setLimit(PAGE); }, [filter, search]);

    const all = useMemo(() => (messages || []).map(m => ({ ...m, _state: messageState(m), _at: toDate(m.createdAt) })), [messages]);

    const counts = useMemo(() => {
        const weekAgo = Date.now() - 7 * 86400000;
        return {
            inbox: all.filter(m => m._state !== 'archived').length,
            unread: all.filter(m => m._state === 'unread').length,
            replied: all.filter(m => m.repliedAt).length,
            archived: all.filter(m => m._state === 'archived').length,
            week: all.filter(m => m._at && m._at.getTime() >= weekAgo).length,
        };
    }, [all]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return all
            .filter(m => {
                if (filter === 'inbox') return m._state !== 'archived';
                if (filter === 'unread') return m._state === 'unread';
                if (filter === 'replied') return Boolean(m.repliedAt);
                if (filter === 'archived') return m._state === 'archived';
                return true;
            })
            .filter(m => !q || [m.name, m.email, m.message, m.phone].some(f => String(f || '').toLowerCase().includes(q)));
    }, [all, filter, search]);

    const openMessage = all.find(m => m.id === openId) || null;

    // Opening a message marks it read (once per open).
    const markedRef = useRef(null);
    useEffect(() => {
        if (!openMessage || openMessage._state !== 'unread' || markedRef.current === openMessage.id) return;
        markedRef.current = openMessage.id;
        markMessageRead(openMessage.id, 'read').catch(err => {
            console.error(err);
            markedRef.current = null;
        });
    }, [openMessage, markMessageRead]);

    const run = async (fn, ok, fail) => {
        try {
            await fn();
            if (ok) addToast(ok, 'success');
        } catch (err) {
            console.error(err);
            addToast(fail || "Couldn't update the message. Please try again.", 'error');
        }
    };

    const archive = (m) => run(async () => {
        await updateMessage(m.id, { status: 'archived', archivedAt: new Date().toISOString() });
        if (openId === m.id) setParams({ id: null });
    }, 'Archived.');
    const restore = (m) => run(() => updateMessage(m.id, { status: 'read', archivedAt: null }), 'Moved back to the inbox.');
    const markUnread = (m) => run(async () => {
        await markMessageRead(m.id, 'new');
        markedRef.current = m.id; // don't flip it straight back to read while it's open
        if (openId === m.id) setParams({ id: null });
    }, 'Marked as unread.');
    const markRead = (m) => run(() => markMessageRead(m.id, 'read'));

    const askDelete = (m) => setConfirm({
        title: 'Delete this message?',
        description: `The message from ${m.name || m.email || 'this sender'} is removed for everyone. This can't be undone. Archive it instead if you might need it later.`,
        confirmLabel: 'Delete for good',
        busyLabel: 'Deleting…',
        onConfirm: async () => {
            await deleteMessage(m.id);
            if (openId === m.id) setParams({ id: null });
            addToast('Message deleted.', 'success');
        },
    });

    const markAllRead = async () => {
        const unread = all.filter(m => m._state === 'unread');
        if (!unread.length || markingAll) return;
        setMarkingAll(true);
        const results = await Promise.allSettled(unread.map(m => markMessageRead(m.id, 'read')));
        setMarkingAll(false);
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed) addToast(`Marked ${unread.length - failed} as read. ${failed} couldn't be updated; try again.`, 'error');
        else addToast(`All ${unread.length} marked as read.`, 'success');
    };

    // ── reply ──
    const replyInitial = useMemo(() => {
        if (!replyTo) return null;
        const first = String(replyTo.name || '').trim().split(' ')[0];
        return {
            to: replyTo.email || '',
            subject: 'Re: your message to Newbi',
            headerText: 'Thanks for reaching out',
            messageBody: `<p>Hi ${escapeHtml(first || 'there')},</p><p><br/></p><p>Best,<br/>${escapeHtml(user?.displayName || 'Team Newbi')}<br/>Newbi Entertainment</p>`
                + `<blockquote style="margin:24px 0 0;padding:12px 16px;border-left:3px solid #ccc;color:#666;">On ${escapeHtml(formatDateTime(replyTo.createdAt) || 'an earlier date')}, ${escapeHtml(replyTo.name || replyTo.email)} wrote:<br/>${escapeHtml(replyTo.message || '').replace(/\n/g, '<br/>')}</blockquote>`,
            theme: 'light',
        };
    }, [replyTo, user?.displayName]);

    const buildReplyHtml = useCallback(({ headerText, messageBody, theme, preview }) => generateOfficialHTML({
        headerText, messageBody, theme, category: 'Reply', ...(preview ? { isPreview: true } : {}),
    }), []);

    const sendReply = async (payload) => {
        await sendEmail(payload);
        if (replyTo?.id) {
            updateMessage(replyTo.id, {
                status: replyTo._state === 'archived' ? 'archived' : 'read',
                repliedAt: new Date().toISOString(),
                repliedBy: user?.email || '',
                lastReplySubject: payload.subject,
            }).catch(err => console.error('Reply sent but not recorded:', err));
        }
    };

    const exportSpec = () => ({
        filename: `inbox_${filter}`,
        sheetName: 'Inbox',
        title: 'Inbox',
        subtitle: exportSubtitle(rows.length, 'message', filter !== 'inbox' ? FILTERS.find(f => f.value === filter)?.label : null),
        rows,
        columns: [
            { header: 'Received', type: 'datetime', value: m => m._at },
            { header: 'Name', value: m => m.name || '' },
            { header: 'Email', value: m => m.email || '' },
            { header: 'Phone', value: m => m.phone || '' },
            { header: 'Message', value: m => m.message || '', width: 60 },
            { header: 'Status', value: m => (m._state === 'unread' ? 'Unread' : m._state === 'archived' ? 'Archived' : 'Read') },
            { header: 'Replied', type: 'datetime', value: m => toDate(m.repliedAt) },
        ],
    });

    const rowMenu = (m) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toggle(e); }} aria-label="Message actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            <MenuItem icon={Eye} onClick={() => setParams({ id: m.id })}>Open</MenuItem>
            {m.email && <MenuItem icon={Reply} onClick={() => setReplyTo(m)}>Reply by email</MenuItem>}
            {m._state === 'unread'
                ? <MenuItem icon={MailOpen} onClick={() => markRead(m)}>Mark as read</MenuItem>
                : <MenuItem icon={Mail} onClick={() => markUnread(m)}>Mark as unread</MenuItem>}
            {m._state === 'archived'
                ? <MenuItem icon={ArchiveRestore} onClick={() => restore(m)}>Move to inbox</MenuItem>
                : <MenuItem icon={Archive} onClick={() => archive(m)}>Archive</MenuItem>}
            <MenuItem icon={Trash2} danger onClick={() => askDelete(m)}>Delete</MenuItem>
        </Menu>
    );

    const shown = rows.slice(0, limit);

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Inbox', icon: Mail, description: 'Messages people send through the contact form' }}
            hideTabs
            action={counts.unread > 0 ? (
                <Button variant="secondary" onClick={markAllRead} disabled={markingAll} className="h-11 w-full sm:w-auto">
                    <CheckCheck size={15} /> {markingAll ? 'Marking…' : `Mark all ${counts.unread} as read`}
                </Button>
            ) : null}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Inbox} tone="blue" label="Unread" value={counts.unread} hint={counts.unread ? 'Waiting for a look' : 'All caught up'} active={filter === 'unread'} onClick={() => setParams({ filter: filter === 'unread' ? null : 'unread' })} />
                    <StatTile icon={CalendarDays} tone="violet" label="This week" value={counts.week} hint="Received in the last 7 days" active={false} onClick={() => setParams({ filter: null })} />
                    <StatTile icon={CheckCircle2} tone="green" label="Replied" value={counts.replied} hint="Answered from here" active={filter === 'replied'} onClick={() => setParams({ filter: filter === 'replied' ? null : 'replied' })} />
                    <StatTile icon={Archive} tone="gray" label="Archived" value={counts.archived} hint="Out of the inbox" active={filter === 'archived'} onClick={() => setParams({ filter: filter === 'archived' ? null : 'archived' })} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                        <SegmentedTabs
                            value={filter}
                            onChange={(v) => setParams({ filter: v === 'inbox' ? null : v })}
                            items={FILTERS.map(f => ({ ...f, count: counts[f.value], highlight: f.value === 'unread' && counts.unread > 0 }))}
                        />
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                        <SearchInput value={search} onChange={setSearch} placeholder="Name, email or words in the message" className="flex-1" />
                        <ExportMenu getSpec={exportSpec} />
                    </div>
                </div>

                {!loaded && !all.length ? (
                    <Card className="overflow-hidden rounded-2xl">
                        {[0, 1, 2, 3].map(i => <div key={i} className="h-[76px] border-b border-black/[0.05] bg-black/[0.015] last:border-0 dark:border-white/[0.05] dark:bg-white/[0.015]" />)}
                    </Card>
                ) : shown.length === 0 ? (
                    <Card className="rounded-2xl">
                        <EmptyState
                            icon={filter === 'unread' ? CheckCircle2 : Inbox}
                            tone={filter === 'unread' ? 'green' : 'blue'}
                            title={search ? 'No messages match' : filter === 'unread' ? 'All caught up' : filter === 'archived' ? 'Nothing archived' : filter === 'replied' ? 'No replies yet' : 'No messages yet'}
                            description={search ? 'Try another name or word.' : filter === 'inbox' ? 'When someone uses the contact form on the website, their message lands here.' : filter === 'replied' ? 'Messages you answer with Reply by email show up here.' : ''}
                            action={search ? <Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button> : null}
                        />
                    </Card>
                ) : (
                    <Card className="overflow-hidden rounded-2xl">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map(m => {
                                const unread = m._state === 'unread';
                                return (
                                    <li key={m.id} className={cn('relative transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]', unread && 'bg-sky-500/[0.04] dark:bg-neon-blue/[0.03]')}>
                                        <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                                            <div className="relative shrink-0">
                                                <Avatar name={m.name || m.email} size={40} />
                                                {unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-sky-500 dark:border-[#0c0e14] dark:bg-neon-blue" aria-label="Unread" />}
                                            </div>
                                            <button type="button" onClick={() => setParams({ id: m.id })} className="min-w-0 flex-1 text-left after:absolute after:inset-0">
                                                <span className="flex items-baseline justify-between gap-3">
                                                    <span className={cn('truncate text-[15px]', unread ? 'font-extrabold' : 'font-semibold')}>{m.name || m.email || 'No name'}</span>
                                                    <span className={cn('shrink-0 text-[12px]', unread ? 'font-bold text-sky-600 dark:text-neon-blue' : 'text-gray-500')} title={formatDateTime(m.createdAt)}>
                                                        {relativeTime(m.createdAt) || formatDay(m.createdAt)}
                                                    </span>
                                                </span>
                                                <span className={cn('mt-0.5 line-clamp-2 text-[13px] leading-snug', unread ? 'text-gray-800 dark:text-zinc-200' : 'text-gray-500 dark:text-zinc-400')}>
                                                    {m.message || '(No message text)'}
                                                </span>
                                                {(m.repliedAt || m._state === 'archived' || (m.name && m.email)) && (
                                                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                        {m.repliedAt && <Badge tone="green"><Reply size={10} /> Replied</Badge>}
                                                        {m._state === 'archived' && <Badge tone="gray">Archived</Badge>}
                                                        {m.name && m.email && <span className="truncate text-[12px] text-gray-400">{m.email}</span>}
                                                    </span>
                                                )}
                                            </button>
                                            <div className="relative z-10 -mr-1 shrink-0">{rowMenu(m)}</div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                )}

                {rows.length > limit && (
                    <div className="text-center">
                        <Button variant="ghost" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit}</Button>
                    </div>
                )}
            </div>

            <MessageSheet
                open={Boolean(openMessage)}
                onClose={() => setParams({ id: null })}
                message={openMessage}
                onReply={(m) => setReplyTo(m)}
                onArchive={archive}
                onRestore={restore}
                onMarkUnread={markUnread}
                onDelete={askDelete}
            />

            <EmailComposer
                open={Boolean(replyTo)}
                onClose={() => setReplyTo(null)}
                title="Reply by email"
                subtitle={replyTo ? `To ${replyTo.name || replyTo.email}` : undefined}
                initial={replyInitial}
                resetKey={replyTo?.id}
                buildHtml={buildReplyHtml}
                onSend={sendReply}
                successText="Reply sent."
            />

            <ConfirmSheet
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                title={confirm?.title}
                description={confirm?.description}
                confirmLabel={confirm?.confirmLabel}
                busyLabel={confirm?.busyLabel}
                tone="danger"
                icon={Trash2}
                onConfirm={confirm?.onConfirm}
            />
        </AdminCommunityHubLayout>
    );
};

export default MessageManager;
