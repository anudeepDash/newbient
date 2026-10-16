import React from 'react';
import { format } from 'date-fns';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Users from 'lucide-react/dist/esm/icons/users';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Award from 'lucide-react/dist/esm/icons/award';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import { GlassChip } from '../components/app';
import { getCampaignSpotsInfo } from '../lib/utils';
import { landingUrl } from './host';

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

export function campaignCard(c, { applied = false } = {}) {
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
        badges: applied
            ? <GlassChip icon={CircleCheck} label="Applied" tone="accent" />
            : fewLeft ? <GlassChip icon={Flame} label={`${spots.spotsLeft} left`} tone="warn" /> : null,
        meta: [
            { icon: Users, label: followers ? `${followers}+ followers` : null },
            { icon: Flame, label: spots.hasSpots ? `${spots.spotsLeft} ${spots.spotsLeft === 1 ? 'spot' : 'spots'} left` : null, tone: fewLeft ? 'warn' : 'default' },
        ],
        stats: [
            { label: 'Reward', value: c.reward, icon: Award, tone: 'accent' },
            { label: 'Tasks', value: tasks || null, icon: FileText },
        ],
        cta: { label: applied ? 'Open campaign' : 'View brief' },
        href: landingUrl(`/campaign/${c.id}`),
    };
}

const FEED_CTA = { guestlist: 'Get on the list', gig: 'View gig', giveaway: 'Enter giveaway', form: 'Open form' };

export function feedCard(item) {
    return {
        type: item.type,
        image: item.image,
        title: item.title,
        description: item.description,
        chips: [{ icon: MapPin, label: item.city }],
        badges: item.label ? <GlassChip label={item.label} tone="accent" /> : null,
        meta: [{ icon: CalendarDays, label: dateLabel(item.date) }],
        stats: [{ label: 'Venue', value: item.venue, icon: MapPin }],
        cta: { label: FEED_CTA[item.type] || 'Open' },
        href: item.href,
    };
}
