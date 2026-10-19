import React, { useEffect, useMemo } from 'react';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Clock from 'lucide-react/dist/esm/icons/clock';
import DoorOpen from 'lucide-react/dist/esm/icons/door-open';
import { Button, Field, GlassChip, Stat, StatRow } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { campaignPasses } from '../../lib/store/passes';
import { passesGet } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import { cn } from '../../lib/utils';
import { appPath } from '../host';
import { ExternalTicketButton, entryLine, passWhen } from '../passes/passParts';

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
 * A confirmation (a pass without a QR code) reads "You're confirmed".
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
    const confirmation = ticket.qr === false && !ticket.externalTicket;
    return <GlassChip icon={confirmation ? CircleCheck : Ticket} label={ticket.status === 'checked_in' ? 'Checked in' : confirmation ? 'Confirmed' : 'Ticket ready'} tone="accent" />;
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
    const confirmation = !hasQr && !ext;
    const qty = Number(ext?.qty || ticket.qty) > 1 ? Number(ext?.qty || ticket.qty) : null;
    const note = ext?.note || ticket.note;

    return (
        <section aria-label="Your ticket" className={cn('overflow-hidden rounded-3xl border border-emerald-500/25 bg-emerald-500/[0.05] dark:border-neon-green/20 dark:bg-neon-green/[0.04]', className)}>
            <div className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:bg-neon-green/15 dark:text-neon-green">
                        {confirmation ? <CircleCheck size={20} /> : <Ticket size={20} />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-neon-green">{ticket.status === 'checked_in' ? 'Checked in' : confirmation ? "You're confirmed" : 'Your ticket'}</p>
                        <p className="truncate text-[17px] font-black">{event.title || ticket.campaignTitle}</p>
                    </div>
                </div>

                {(isPresent(passWhen(event)) || isPresent(event.venue) || isPresent(event.boxOffice) || isPresent(event.entry)) && (
                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        <Field icon={CalendarDays} label="When" value={passWhen(event)} />
                        <Field icon={Clock} label="Box office" value={event.boxOffice} />
                        <Field icon={MapPin} label="Venue" value={event.venue} />
                        <Field icon={DoorOpen} label="Entry" value={entryLine(event, hasQr)} />
                    </div>
                )}

                <StatRow>
                    <Stat label="Tickets" value={qty} />
                    <Stat label="Tier" value={ext?.tier || ticket.tier} tone="accent" />
                </StatRow>

                {isPresent(note) && <p className="rounded-2xl bg-white/70 px-4 py-3 text-[15px] text-gray-700 dark:bg-white/[0.04] dark:text-zinc-300">{note}</p>}

                {confirmation && (
                    <p className="text-[15px] text-gray-700 dark:text-zinc-300">Your place is confirmed. There’s no QR code for this one; show this if anyone asks at entry.</p>
                )}

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
