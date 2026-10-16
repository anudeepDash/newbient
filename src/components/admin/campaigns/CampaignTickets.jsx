import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Eye from 'lucide-react/dist/esm/icons/eye';
import RotateCw from 'lucide-react/dist/esm/icons/rotate-cw';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Send from 'lucide-react/dist/esm/icons/send';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import { db } from '../../../lib/firebase';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { passesPost } from '../../../lib/passesApi';
import { Avatar, Badge, Button, Card, EmptyState, Menu, MenuItem } from '../ui';
import { ConfirmSheet } from './parts';
import { creatorPhotoOf, formatDay } from './campaignModel';
import { channelState, hasFailure } from './ticketModel';

/*
 * The campaign's Tickets tab: every ticket sent, who it went to, and how each
 * channel did (✓ sent, ✗ failed, – skipped), with Resend for one creator or
 * every failure, and Revoke. Past uploads are listed under it.
 */

const DOT = {
    ok: 'bg-emerald-500 text-white',
    failed: 'bg-rose-500 text-white',
    pending: 'bg-amber-400 text-gray-950',
    skipped: 'bg-black/[0.08] text-gray-500 dark:bg-white/[0.1] dark:text-zinc-400',
    none: 'bg-black/[0.05] text-gray-400 dark:bg-white/[0.06] dark:text-zinc-500',
};
const MARK = { ok: '✓', failed: '✗', pending: '…', skipped: '–', none: '–' };

/** ✓ / ✗ per channel: email, WhatsApp, and whether the creator has opened it in the app. */
export const DeliveryDots = ({ delivery, showSeen = false }) => {
    const items = [
        { key: 'email', icon: Mail, label: 'Email' },
        { key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' },
    ];
    return (
        <span className="flex shrink-0 items-center gap-1.5">
            {items.map(({ key, icon: Icon, label }) => {
                const st = channelState(delivery, key);
                const why = delivery?.[key]?.error || delivery?.[key]?.reason;
                return (
                    <span key={key} title={`${label}: ${delivery?.[key]?.status || 'not sent'}${why ? ` (${why})` : ''}`} className={cn('flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-bold', DOT[st])}>
                        <Icon size={11} /> {MARK[st]}
                    </span>
                );
            })}
            {showSeen && delivery?.inApp?.seenAt && (
                <span title={`Opened in the app ${formatDay(delivery.inApp.seenAt)}`} className={cn('flex h-7 items-center rounded-full px-2', DOT.ok)}><Eye size={11} /></span>
            )}
        </span>
    );
};

const useUploads = (campaignId) => {
    const [uploads, setUploads] = useState([]);
    useEffect(() => {
        if (!campaignId || !db) return undefined;
        return onSnapshot(
            query(collection(db, 'ticket_uploads'), where('campaignId', '==', campaignId)),
            snap => setUploads(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))),
            () => setUploads([])
        );
    }, [campaignId]);
    return uploads;
};

const kindOf = (p) => (p.externalTicket?.kind === 'pdf' ? { icon: FileText, label: 'PDF' } : p.externalTicket?.kind === 'link' ? { icon: Link2, label: 'Link' } : { icon: QrCode, label: 'Newbi pass' });

const CampaignTickets = ({ campaign, applicants, passes, loaded, error, onSend }) => {
    const addToast = useStore(s => s.addToast);
    const uploads = useUploads(campaign.id);
    const [busy, setBusy] = useState('');
    const [revoke, setRevoke] = useState(null);

    const byKey = useMemo(() => {
        const m = new Map();
        applicants.forEach(a => { m.set(a.creator.id, a); if (a.creator.uid) m.set(a.creator.uid, a); });
        return m;
    }, [applicants]);
    const live = passes.filter(p => p.status !== 'revoked').sort((a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || '')));
    const failures = live.filter(hasFailure).length;

    const resend = async (body, key) => {
        setBusy(key);
        const res = await passesPost('resend', { campaignId: campaign.id, ...body }, { timeoutMs: 60000 });
        setBusy('');
        if (!res.ok) { addToast(res.error, 'error'); return; }
        const failed = res.data.results.filter(r => r.outcome === 'failed').length;
        addToast(res.data.results.length === 0 ? 'Nothing to resend.' : failed ? `Resent; ${failed} still failing.` : 'Resent.', failed ? 'warning' : 'success');
    };

    const doRevoke = async () => {
        const res = await passesPost('revoke', { ref: revoke.ref });
        if (!res.ok) { addToast(res.error, 'error'); return; }
        addToast('Ticket revoked. You can send a new one.', 'success');
        setRevoke(null);
    };

    return (
        <div className="space-y-4">
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold">Event tickets</p>
                    <p className="text-[13px] text-gray-500">
                        {campaign.eventId ? `${campaign.ticketsPerCreator || 1} per creator${campaign.ticketAutoIssue === 'selected' ? ' · sent when you select someone' : campaign.ticketAutoIssue === 'completed' ? ' · sent when their required tasks are approved' : ''}.` : 'No linked event: send official partner tickets with a CSV, or link an event in the editor for Newbi passes.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {failures > 0 && <Button onClick={() => resend({ failedOnly: true }, 'failed')} disabled={Boolean(busy)} className="h-11"><RotateCw size={14} /> Resend {failures} failed</Button>}
                    <Button variant="accent" onClick={() => onSend()} className="h-11 flex-1 sm:flex-none"><Send size={14} /> Send tickets</Button>
                </div>
            </Card>

            {error === 'permission-denied' && (
                <p className="rounded-xl bg-amber-500/10 px-3.5 py-3 text-[13px] text-amber-800 dark:text-amber-300">Tickets can’t be listed until the passes Firestore rules are deployed.</p>
            )}

            {!loaded ? (
                <Card className="h-32 animate-pulse" />
            ) : live.length === 0 ? (error ? null : (
                <EmptyState icon={Ticket} title="No tickets sent yet" description="Tickets you send show up here with how each one was delivered." />
            )) : (
                <Card className="divide-y divide-black/[0.05] p-0 dark:divide-white/[0.06]">
                    {live.map(p => {
                        const entry = byKey.get(p.creatorId) || byKey.get(p.holderUid);
                        const kind = kindOf(p);
                        return (
                            <div key={p.ref} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                                <Avatar src={entry ? creatorPhotoOf(entry.creator) : ''} name={p.holderName} size={36} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-semibold">{p.holderName || entry?.creator?.name || 'Creator'}</p>
                                    <p className="flex items-center gap-1.5 truncate text-[12px] text-gray-500">
                                        <kind.icon size={12} /> {kind.label}
                                        {p.externalTicket && p.qr !== false && <> + <QrCode size={12} /> Newbi pass</>}
                                        {Number(p.qty) > 1 && <> · {p.qty}</>}
                                        {p.tier && <> · {p.tier}</>}
                                        {p.status === 'checked_in' && <Badge tone="green" className="ml-1">Checked in</Badge>}
                                    </p>
                                </div>
                                <DeliveryDots delivery={p.delivery} showSeen />
                                <Menu trigger={({ toggle }) => <Button size="sm" variant="ghost" onClick={toggle} aria-label="Ticket actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>}>
                                    <MenuItem icon={RotateCw} onClick={() => resend({ ref: p.ref }, p.ref)}>{busy === p.ref ? 'Resending…' : 'Resend'}</MenuItem>
                                    <MenuItem icon={Ban} danger onClick={() => setRevoke(p)}>Revoke</MenuItem>
                                </Menu>
                            </div>
                        );
                    })}
                </Card>
            )}

            {uploads.length > 0 && (
                <div className="space-y-2">
                    <p className="px-1 text-[13px] font-bold text-gray-500">Sends</p>
                    <Card className="divide-y divide-black/[0.05] p-0 text-[13px] dark:divide-white/[0.06]">
                        {uploads.slice(0, 10).map(u => {
                            const sent = (u.counts?.issued || 0) + (u.counts?.updated || 0);
                            return (
                                <div key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                                    <span className="font-semibold">{u.mode === 'qr' ? 'Newbi passes' : u.fileName || 'CSV'}</span>
                                    <span className="text-gray-500">{formatDay(u.createdAt)}{u.by ? ` · ${u.by}` : ''}</span>
                                    <span className="ml-auto flex flex-wrap gap-1.5">
                                        <Badge tone="green">{sent} sent</Badge>
                                        {u.counts?.unchanged > 0 && <Badge tone="gray">{u.counts.unchanged} unchanged</Badge>}
                                        {u.counts?.failed > 0 && <Badge tone="rose">{u.counts.failed} failed</Badge>}
                                        {u.channels?.email?.failed > 0 && <Badge tone="rose">{u.channels.email.failed} email ✗</Badge>}
                                        {u.channels?.whatsapp?.failed > 0 && <Badge tone="rose">{u.channels.whatsapp.failed} WhatsApp ✗</Badge>}
                                    </span>
                                </div>
                            );
                        })}
                    </Card>
                </div>
            )}

            <ConfirmSheet
                open={Boolean(revoke)}
                onClose={() => setRevoke(null)}
                title="Revoke this ticket?"
                message={`${revoke?.holderName || 'The creator'}'s ticket stops working at the gate and disappears from their campaign. You can send a new one afterwards.`}
                confirmLabel="Revoke"
                tone="danger"
                onConfirm={doRevoke}
            />
        </div>
    );
};

export default CampaignTickets;
