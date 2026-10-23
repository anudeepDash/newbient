import React from 'react';
import { format } from 'date-fns';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Users from 'lucide-react/dist/esm/icons/users';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Award from 'lucide-react/dist/esm/icons/award';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Clock from 'lucide-react/dist/esm/icons/clock';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import { GlassChip } from '../components/app';
import { getCampaignSpotsInfo } from '../lib/utils';
import { isPresent } from '../lib/present';
import { appPath } from './host';
import { TicketReadyBadge } from './creator/YourTicket';
import { t } from '../i18n';

/*
 * Card props for the app's data, so every list renders the same Card.
 * Empty values are left as null; Card drops them.
 */

const compact = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return null;
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`;
    return String(v);
};

export const dateLabel = (date) => (date ? format(date, 'EEE d MMM') : null);

/*
 * from: the current location, so the campaign opens as a sheet over the list.
 * progress: taskProgress() for a campaign you're in (Deliverables).
 */
export function campaignCard(c, { applied = false, from = null, progress = null } = {}) {
    const spots = getCampaignSpotsInfo(c, []);
    const followers = compact(c.minInstagramFollowers);
    const tasks = (c.tasks || []).length;
    const fewLeft = spots.hasSpots && !spots.isFull && spots.spotsLeft <= 10;
    return {
        type: 'campaign',
        image: c.thumbnail || null,
        title: c.title,
        eyebrow: c.brand,
        eyebrowLogo: c.brandLogo || null,
        description: c.description,
        chips: [{ icon: MapPin, label: c.targetCity }],
        // "Ticket ready" (Phase 5) shows ahead of the status; it renders nothing without a ticket.
        badges: (
            <>
                <TicketReadyBadge campaignId={c.id} />
                {progress?.requiredDone
                    ? <GlassChip icon={CircleCheck} label={t('Completed')} tone="accent" />
                    : applied
                        ? <GlassChip icon={CircleCheck} label={t('Applied')} tone="accent" />
                        : fewLeft ? <GlassChip icon={Flame} label={t('{count} left', { count: spots.spotsLeft })} tone="warn" /> : null}
            </>
        ),
        meta: [
            { icon: Flame, label: spots.hasSpots ? (spots.spotsLeft === 1 ? t('{count} spot left', { count: spots.spotsLeft }) : t('{count} spots left', { count: spots.spotsLeft })) : null, tone: fewLeft ? 'warn' : 'default' },
        ],
        stats: [
            { label: t('Reward'), value: c.reward, icon: Award, tone: 'accent' },
            { label: t('Tasks'), value: tasks || null, icon: FileText },
            { label: t('Followers'), value: followers ? `${followers}+` : null, icon: Users },
        ],
        progress: progress && progress.total ? Math.round((progress.approved / progress.total) * 100) : null,
        cta: { label: applied ? t('Open campaign') : t('View brief') },
        to: appPath(`/c/${c.id}`),
        linkState: from ? { backgroundLocation: from } : undefined,
    };
}

const FEED_CTA = { guestlist: 'Get on the list', gig: 'View gig', giveaway: 'Enter giveaway', form: 'Open form' };

/* from: the current location, so the guestlist, giveaway or form opens as a sheet over the list. */
export function feedCard(item, { from = null } = {}) {
    // Gigs open their sheet on the Community page (?gig=ID).
    const to = item.to || (item.type === 'gig' ? `${appPath('/community')}?gig=${encodeURIComponent(item.id)}` : undefined);
    return {
        type: item.type,
        image: item.image,
        title: item.title,
        description: item.description,
        chips: [{ icon: MapPin, label: item.city }],
        badges: item.label ? <GlassChip label={item.label} tone="accent" /> : null,
        meta: [{ icon: CalendarDays, label: dateLabel(item.date) }],
        stats: [{ label: t('Venue'), value: item.venue, icon: MapPin }],
        cta: { label: t(FEED_CTA[item.type] || 'Open') },
        to,
        linkState: from && to && item.type !== 'gig' ? { backgroundLocation: from } : undefined,
    };
}

/*
 * An upcoming show on Home: ticket sales, an event or a guestlist, each as
 * { id, title, image, day: 'YYYY-MM-DD', time, venue, city, category, ticketed, guestlist, price, gigId }.
 * from: the current location, so a guestlist opens as a sheet over the list.
 * A volunteer gig's card opens the gig on Community, like the community rail.
 */
export function showCard(e, { from = null } = {}) {
    const day = e.day ? new Date(`${e.day}T00:00:00`) : null;
    const gig = !e.ticketed && !e.guestlist && e.gigId;
    return {
        type: gig ? 'gig' : 'event',
        image: e.image || null,
        title: e.title,
        eyebrow: e.category || null,
        chips: [{ icon: MapPin, label: e.city }],
        meta: [
            { icon: CalendarDays, label: day && !Number.isNaN(day.getTime()) ? dateLabel(day) : null },
            { icon: Clock, label: isPresent(e.time) ? e.time : null },
        ],
        stats: [
            { label: e.ticketed ? t('Tickets') : t('Entry'), value: e.ticketed ? (e.price ? t('From ₹{price}', { price: Number(e.price).toLocaleString('en-IN') }) : t('On sale')) : e.guestlist ? t('Guestlist') : null, tone: 'accent' },
            { label: t('Venue'), value: e.venue },
        ],
        cta: e.ticketed || e.guestlist || gig ? { label: e.ticketed ? t('Get tickets') : gig ? t('View gig') : t('Get on the list') } : false,
        to: e.ticketed ? appPath(`/tickets/${encodeURIComponent(e.id)}`)
            : e.guestlist ? appPath(`/community/g/${e.id}`)
                : gig ? `${appPath('/community')}?gig=${encodeURIComponent(e.gigId)}` : undefined,
        // A show or guestlist opens as a sheet over Home.
        linkState: (e.ticketed || e.guestlist) && from ? { backgroundLocation: from } : undefined,
    };
}
