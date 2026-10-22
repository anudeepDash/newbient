import React, { useMemo, useState } from 'react';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Sheet from '../Sheet';
import { Avatar, Badge, Button } from '../ui';
import { useStore } from '../../../lib/store';
import { copyToClipboard } from '../../../lib/clipboard';
import { buildCampaignUrl } from '../../../lib/campaignLinks';
import { Spinner } from './parts';
import { creatorHandle, creatorKeys, creatorRef, waNumber } from './campaignModel';

/*
 * "Not on Newbi": the campaign's sheet guests (people an uploaded sheet added
 * who have no Newbi account). Invite each on WhatsApp (when the sheet had their
 * number) or in an Instagram DM, with the campaign link. Anyone who has signed up
 * since is matched by handle or phone, and "Move to account" gives their
 * account the work (marked done from the sheet) in place of the guest record.
 */
const lastTen = (v) => String(v || '').replace(/\D/g, '').slice(-10);

const InviteGuestsSheet = ({ open, onClose, campaign, guests, creators, onLink }) => {
    const addToast = useStore(s => s.addToast);
    const records = useStore(s => s.appSubmissions?.[campaign?.id]) || {};
    const [busy, setBusy] = useState(false);
    const link = campaign ? buildCampaignUrl(campaign.id) : '';

    const rows = useMemo(() => {
        const byHandle = new Map();
        const byPhone = new Map();
        (creators || []).forEach(c => {
            if (creatorHandle(c)) byHandle.set(creatorHandle(c).toLowerCase(), c);
            [c.phone, c.whatsapp].map(lastTen).filter(p => p.length === 10).forEach(p => byPhone.set(p, c));
        });
        return (guests || []).map(g => {
            const contact = records[g.key]?.guest || {};
            const handle = String(g.creator.instagram || contact.instagram || '').toLowerCase();
            const phone = lastTen(contact.phone);
            const account = byHandle.get(handle) || (phone.length === 10 ? byPhone.get(phone) : null) || null;
            const done = g.progress.items.filter(i => i.status === 'approved');
            return { g, name: g.creator.name || contact.name || '', handle, phone, email: contact.email || '', account, done };
        });
    }, [guests, creators, records]);
    const signedUp = rows.filter(r => r.account);

    const messageFor = (r) => {
        const did = r.done.map(i => i.task.title).filter(Boolean).join(' and ');
        return `Hi${r.name ? ` ${r.name.split(' ')[0]}` : ''}! Thanks for doing the ${campaign.title || 'campaign'}${did ? ` ${did}` : ''}. `
            + `Join Newbi with this Instagram${r.handle ? ` (@${r.handle})` : ''} to get updates, passes and payouts for it: ${link}`;
    };
    const copy = async (text, done) => {
        if (await copyToClipboard(text)) addToast(done, 'success');
        else addToast('Select the text and copy it yourself.', 'error', { title: 'Couldn’t copy' });
    };

    const moveToAccount = async (list) => {
        if (busy || !list.length) return;
        setBusy(true);
        try {
            await onLink(list.map(r => ({
                guestKey: r.g.key,
                account: r.account,
                creatorUid: creatorRef(r.account),
                keys: creatorKeys(r.account),
                items: r.done.map(i => ({ taskId: i.task.id, link: i.sub?.contentLink || '' })),
            })));
        } catch {
            // onLink shows the error.
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={busy ? () => {} : onClose}
            title="Not on Newbi"
            subtitle="Added from a sheet. Invite them to join, so updates, passes and payouts reach them in the app."
            size="lg"
            footer={(
                <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={busy} className="h-11 flex-1 sm:flex-none">Close</Button>
                    <Button onClick={() => copy(rows.filter(r => r.handle).map(r => `@${r.handle}`).join('\n'), 'Handles copied.')} disabled={!rows.some(r => r.handle)} className="h-11 flex-1 sm:flex-none">
                        <Copy size={14} /> Copy handles
                    </Button>
                    {signedUp.length > 0 && (
                        <Button variant="accent" onClick={() => moveToAccount(signedUp)} disabled={busy} className="h-11 flex-1">
                            {busy ? <Spinner /> : <Link2 size={14} />} Move {signedUp.length} to their account{signedUp.length === 1 ? '' : 's'}
                        </Button>
                    )}
                </div>
            )}
        >
            <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] px-3.5 py-2.5 dark:border-white/[0.08]">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-gray-500">{link}</span>
                    <Button size="sm" variant="ghost" onClick={() => copy(link, 'Campaign link copied.')} className="h-9"><Copy size={13} /> Link</Button>
                </div>
                {rows.length === 0 && <p className="text-[13px] text-gray-500">Everyone from your sheets is on Newbi.</p>}
                <ul className="space-y-1.5">
                    {rows.map(r => {
                        const wa = waNumber(r.phone);
                        return (
                            <li key={r.g.key} className="flex flex-col gap-2 rounded-xl border border-black/[0.08] px-3 py-2.5 dark:border-white/[0.1] sm:flex-row sm:items-center">
                                <span className="flex min-w-0 flex-1 items-center gap-3">
                                    <Avatar name={r.name || r.handle} size={34} />
                                    <span className="min-w-0">
                                        <span className="block truncate text-[14px] font-semibold">{r.name || (r.handle ? `@${r.handle}` : 'No name')}</span>
                                        <span className="block truncate text-[12px] text-gray-500">
                                            {[r.name && r.handle && `@${r.handle}`, r.done.map(i => i.task.title).join(', ') || 'Nothing done yet'].filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                </span>
                                <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                                    {r.account ? (
                                        <>
                                            <Badge tone="green">Signed up as {r.account.name || `@${creatorHandle(r.account)}`}</Badge>
                                            <Button size="sm" variant="secondary" onClick={() => moveToAccount([r])} disabled={busy} className="h-10"><Link2 size={13} /> Move to account</Button>
                                        </>
                                    ) : (
                                        <>
                                            {wa && (
                                                <Button as="a" size="sm" variant="secondary" href={`https://wa.me/${wa}?text=${encodeURIComponent(messageFor(r))}`} target="_blank" rel="noopener noreferrer" className="h-10">
                                                    <MessageCircle size={13} /> WhatsApp
                                                </Button>
                                            )}
                                            {r.handle && (
                                                <Button as="a" size="sm" variant="secondary" href={`https://ig.me/m/${r.handle}`} target="_blank" rel="noopener noreferrer" onClick={() => copy(messageFor(r), 'Invite copied. Paste it in the DM.')} className="h-10">
                                                    <Instagram size={13} /> DM
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" onClick={() => copy(messageFor(r), 'Invite copied.')} aria-label="Copy invite" className="h-10 w-10 px-0"><Copy size={14} /></Button>
                                        </>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </Sheet>
    );
};

export default InviteGuestsSheet;
