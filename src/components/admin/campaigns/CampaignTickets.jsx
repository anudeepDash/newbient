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
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import ArrowUpCircle from 'lucide-react/dist/esm/icons/circle-arrow-up';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Download from 'lucide-react/dist/esm/icons/download';
import { db } from '../../../lib/firebase';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { passesPost, pollPasses, staffPassList } from '../../../lib/passesApi';
import { downloadCsv, fileDate } from '../../../lib/xlsx';
import { Avatar, Badge, Button, Card, EmptyState, Menu, MenuItem } from '../ui';
import { ConfirmSheet } from './parts';
import { creatorHandle, creatorPhotoOf, formatDay } from './campaignModel';
import { channelState, hasFailure, cleanPassTiers } from './ticketModel';
import Sheet from '../Sheet';
import { Field, fieldCls } from '../uploads/UploadKit';

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

// The send log: from Firestore when the rules allow, otherwise with the passes through the API.
const useUploads = (campaignId) => {
    const [uploads, setUploads] = useState([]);
    useEffect(() => {
        if (!campaignId || !db) return undefined;
        let stopPoll = null;
        let alive = true;
        const unsub = onSnapshot(
            query(collection(db, 'ticket_uploads'), where('campaignId', '==', campaignId)),
            snap => setUploads(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))),
            (error) => {
                if (error?.code !== 'permission-denied') { setUploads([]); return; }
                stopPoll = pollPasses(async () => {
                    const res = await staffPassList({ campaignId });
                    if (alive && res.ok) setUploads(res.data.uploads || []);
                });
            }
        );
        return () => { alive = false; unsub(); stopPoll?.(); };
    }, [campaignId]);
    return uploads;
};

const kindOf = (p) => (p.externalTicket?.kind === 'pdf' ? { icon: FileText, label: 'PDF' }
    : p.externalTicket?.kind === 'link' ? { icon: Link2, label: 'Link' }
    : p.qr === false && p.mode === 'guestlist' ? { icon: ListChecks, label: 'Guestlist' }
    : p.qr === false ? { icon: CircleCheck, label: 'Confirmation' }
    : { icon: QrCode, label: 'QR pass' });

const CampaignTickets = ({ campaign, applicants, passes, loaded, error, onSend }) => {
    const addToast = useStore(s => s.addToast);
    const uploads = useUploads(campaign.id);
    const [busy, setBusy] = useState('');
    const [revoke, setRevoke] = useState(null);
    const [retier, setRetier] = useState(null); // { pass, tier, qty } while changing a pass's category
    const passTiers = useMemo(() => cleanPassTiers(campaign.passTiers), [campaign.passTiers]);

    const byKey = useMemo(() => {
        const m = new Map();
        applicants.forEach(a => { m.set(a.creator.id, a); if (a.creator.uid) m.set(a.creator.uid, a); });
        return m;
    }, [applicants]);
    const live = passes.filter(p => p.status !== 'revoked').sort((a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || '')));
    const failures = live.filter(hasFailure).length;
    const onList = live.filter(p => p.mode === 'guestlist' && p.qr === false && !p.externalTicket);

    // The names for the venue's door list: "Riya Sharma + 1", with their handle and category.
    const exportGuestlist = () => downloadCsv({
        filename: `guestlist_${(campaign.title || 'campaign').replace(/[^\w]+/g, '-').toLowerCase()}_${fileDate()}`,
        columns: [
            { header: 'Name on the list', key: 'listName' }, { header: 'People', key: 'qty' }, { header: 'Category', key: 'tier' },
            { header: 'Instagram', key: 'instagram' }, { header: 'Reference', key: 'ref' }, { header: 'Checked in', key: 'checkedIn' },
        ],
        rows: [...onList].sort((a, b) => String(a.holderName || '').localeCompare(String(b.holderName || ''))).map(p => {
            const qty = Math.max(1, Number(p.qty) || 1);
            const entry = byKey.get(p.creatorId) || byKey.get(p.holderUid);
            const handle = entry ? creatorHandle(entry.creator) : '';
            return {
                listName: `${p.holderName || entry?.creator?.name || 'Creator'}${qty > 1 ? ` + ${qty - 1}` : ''}`,
                qty,
                tier: p.tier || '',
                instagram: handle ? `@${handle}` : '',
                ref: p.ref,
                checkedIn: p.status === 'checked_in' ? 'Yes' : '',
            };
        }),
    });

    const resend = async (body, key) => {
        setBusy(key);
        const res = await passesPost('resend', { campaignId: campaign.id, ...body }, { timeoutMs: 60000 });
        setBusy('');
        if (!res.ok) {
            addToast(res.error || 'Please try again.', 'error', {
                title: "Couldn't resend",
                action: { label: 'Try again', onClick: () => resend(body, key) },
            });
            return;
        }
        const failed = res.data.results.filter(r => r.outcome === 'failed').length;
        const total = res.data.results.length;
        if (!total) addToast('Nothing to resend.', 'info');
        else if (failed) addToast(`${failed} still didn't go through. Try those again in a bit.`, 'warning', { title: `Resent ${total - failed} of ${total}` });
        else addToast('Resent.', 'success');
    };

    // Upgrade (or move) a pass to another category; same code, the creator is told on every channel.
    const doRetier = async () => {
        if (!retier?.tier.trim()) return;
        setBusy(`retier:${retier.pass.ref}`);
        const res = await passesPost('retier', { ref: retier.pass.ref, tier: retier.tier.trim(), qty: retier.qty || undefined });
        setBusy('');
        if (!res.ok) {
            addToast(res.error || 'Please try again.', 'error', {
                title: 'Ticket not moved',
                action: { label: 'Try again', onClick: () => doRetier() },
            });
            return;
        }
        if (res.data.outcome === 'unchanged') addToast('Nothing changed.', 'info');
        else addToast("They've been told about the change.", 'success', { title: `Moved to ${retier.tier.trim()}` });
        setRetier(null);
    };

    const doRevoke = async () => {
        const res = await passesPost('revoke', { ref: revoke.ref });
        if (!res.ok) {
            addToast(res.error || 'Please try again.', 'error', {
                title: 'Ticket not revoked',
                action: { label: 'Try again', onClick: () => doRevoke() },
            });
            return;
        }
        addToast('You can send them a new one now.', 'success', { title: 'Ticket revoked' });
        setRevoke(null);
    };

    return (
        <div className="space-y-4">
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold">Event passes</p>
                    <p className="text-[13px] text-gray-500">
                        {[
                            campaign.passKind === 'confirmation' ? 'Confirmation, no QR' : campaign.passKind === 'guestlist' ? 'Guestlist, no QR' : 'QR pass',
                            `${campaign.ticketsPerCreator || 1} per creator`,
                            onList.length > 0 && `${onList.length} on the guestlist`,
                        ].filter(Boolean).join(' · ')}.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {onList.length > 0 && <Button onClick={exportGuestlist} className="h-11"><Download size={14} /> Guestlist</Button>}
                    {failures > 0 && <Button onClick={() => resend({ failedOnly: true }, 'failed')} disabled={Boolean(busy)} className="h-11"><RotateCw size={14} /> Resend {failures} failed</Button>}
                    <Button variant="accent" onClick={() => onSend()} className="h-11 flex-1 sm:flex-none"><Send size={14} /> Send tickets or guestlist</Button>
                </div>
            </Card>

            {error && (
                <p className="rounded-xl bg-amber-500/10 px-3.5 py-3 text-[13px] text-amber-800 dark:text-amber-300">Tickets couldn’t be loaded just now. They refresh on their own; check your connection if this stays.</p>
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
                                        {p.externalTicket && p.qr !== false && <> + <QrCode size={12} /> QR pass</>}
                                        {Number(p.qty) > 1 && <> · {p.qty}</>}
                                        {p.tier && <> · {p.tier}</>}
                                        {p.status === 'checked_in' && <Badge tone="green" className="ml-1">Checked in</Badge>}
                                    </p>
                                </div>
                                <DeliveryDots delivery={p.delivery} showSeen />
                                <Menu trigger={({ toggle }) => <Button size="sm" variant="ghost" onClick={toggle} aria-label="Ticket actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>}>
                                    <MenuItem icon={RotateCw} onClick={() => resend({ ref: p.ref }, p.ref)}>{busy === p.ref ? 'Resending…' : 'Resend'}</MenuItem>
                                    {!p.externalTicket && <MenuItem icon={ArrowUpCircle} onClick={() => setRetier({ pass: p, tier: p.tier || '', qty: String(p.qty || '') })}>Change category</MenuItem>}
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

            <Sheet
                open={Boolean(retier)}
                onClose={() => setRetier(null)}
                title="Change category"
                subtitle={retier ? `${retier.pass.holderName || 'Creator'} · now ${retier.pass.tier || 'no category'}` : ''}
                footer={(
                    <Button variant="accent" className="h-11 w-full" onClick={doRetier} disabled={!retier?.tier.trim() || busy.startsWith('retier:')}>
                        <ArrowUpCircle size={15} /> {busy.startsWith('retier:') ? 'Saving…' : 'Update and tell them'}
                    </Button>
                )}
            >
                {retier && (
                    <div className="space-y-4">
                        {passTiers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {passTiers.map(t => (
                                    <button
                                        key={t.name}
                                        type="button"
                                        onClick={() => setRetier(r => ({ ...r, tier: t.name, qty: t.qty ? String(t.qty) : r.qty }))}
                                        aria-pressed={retier.tier === t.name}
                                        className={cn('h-10 rounded-full px-4 text-[13px] font-bold', retier.tier === t.name ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-black/[0.05] text-gray-700 dark:bg-white/[0.06] dark:text-zinc-300')}
                                    >
                                        {t.name}{t.minFollowers ? ` · ${t.minFollowers.toLocaleString('en-IN')}+` : ''}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Category"><input className={fieldCls} value={retier.tier} onChange={e => setRetier(r => ({ ...r, tier: e.target.value }))} placeholder="e.g. VIP" maxLength={80} /></Field>
                            <Field label="Tickets" optional><input className={fieldCls} type="number" min="1" max="20" inputMode="numeric" value={retier.qty} onChange={e => setRetier(r => ({ ...r, qty: e.target.value }))} /></Field>
                        </div>
                        <p className="text-[13px] text-gray-500">Same pass and code. They get the update in the app, by email and on WhatsApp.</p>
                    </div>
                )}
            </Sheet>

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
