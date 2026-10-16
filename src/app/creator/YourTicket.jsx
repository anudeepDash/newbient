import React, { useEffect, useMemo } from 'react';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import { Button, Field, GlassChip, Stat, StatRow } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { campaignPasses } from '../../lib/store/passes';
import { passesGet } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import { cn } from '../../lib/utils';
import { appPath } from '../host';
import { ExternalTicketButton, passWhen } from '../passes/passParts';

/*
 * "Your ticket" inside a campaign (/c/:id). Standalone, so the campaign page
 * (Phase 4) only mounts it:
 *
 *   <YourTicket campaignId={campaign.id} />          // renders nothing without a ticket
 *   const ticket = useCampaignTicket(campaign.id);   // for the card's badge
 *   <TicketReadyBadge campaignId={campaign.id} />    // "Ticket ready" glass chip
 *
 * Shows the partner's ticket ("Open ticket" / "View / Download PDF"), tier,
 * qty and note when present, and the Newbi QR pass only when one was issued.
 * Reads the signed-in creator's own passes from the app store (passes slice).
 */

/* The creator's live ticket for this campaign, or null. */
export const useCampaignTicket = (campaignId) => {
    const passes = useAppStore(s => s.passes);
    return useMemo(() => campaignPasses(passes, campaignId).find(p => p.status !== 'revoked') || null, [passes, campaignId]);
};

export const TicketReadyBadge = ({ campaignId }) => {
    const ticket = useCampaignTicket(campaignId);
    if (!ticket) return null;
    return <GlassChip icon={Ticket} label={ticket.status === 'checked_in' ? 'Checked in' : 'Ticket ready'} tone="accent" />;
};

const seen = new Set();

const YourTicket = ({ campaignId, className }) => {
    const ticket = useCampaignTicket(campaignId);

    // Opening the pass through the API records that the creator has seen it (delivery.inApp.seenAt).
    useEffect(() => {
        if (!ticket?.ref || ticket.delivery?.inApp?.seenAt || seen.has(ticket.ref)) return;
        seen.add(ticket.ref);
        passesGet('get', { ref: ticket.ref }).catch(() => {});
    }, [ticket?.ref, ticket?.delivery?.inApp?.seenAt]);

    if (!ticket) return null;
    const pass = { ...ticket, isHolder: true };
    const ext = ticket.externalTicket || null;
    const event = ticket.event || {};
    const hasQr = ticket.qr !== false;
    const qty = Number(ext?.qty || ticket.qty) > 1 ? Number(ext?.qty || ticket.qty) : null;
    const note = ext?.note || ticket.note;

    return (
        <section aria-label="Your ticket" className={cn('overflow-hidden rounded-3xl border border-emerald-500/25 bg-emerald-500/[0.05] dark:border-neon-green/20 dark:bg-neon-green/[0.04]', className)}>
            <div className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:bg-neon-green/15 dark:text-neon-green">
                        <Ticket size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-neon-green">{ticket.status === 'checked_in' ? 'Checked in' : 'Your ticket'}</p>
                        <p className="truncate text-[17px] font-black">{event.title || ticket.campaignTitle}</p>
                    </div>
                </div>

                {(isPresent(passWhen(event)) || isPresent(event.venue)) && (
                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        <Field icon={CalendarDays} label="When" value={passWhen(event)} />
                        <Field icon={MapPin} label="Venue" value={event.venue} />
                    </div>
                )}

                <StatRow>
                    <Stat label="Tickets" value={qty} />
                    <Stat label="Tier" value={ext?.tier || ticket.tier} tone="accent" />
                </StatRow>

                {isPresent(note) && <p className="rounded-2xl bg-white/70 px-4 py-3 text-[15px] text-gray-700 dark:bg-white/[0.04] dark:text-zinc-300">{note}</p>}

                {ext && <ExternalTicketButton pass={pass} />}
                {hasQr && (
                    <Button className="w-full" size={ext ? 'md' : 'lg'} variant={ext ? 'secondary' : 'primary'} icon={QrCode} to={appPath(`/p/${ticket.ref}`)}>
                        {ext ? 'Newbi QR pass' : 'Show my pass'}
                    </Button>
                )}
            </div>
        </section>
    );
};

export default YourTicket;
