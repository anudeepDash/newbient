import React from 'react';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import { GlassChip } from '../../components/app';
import { appPath } from '../host';
import { passWhen } from './passParts';
import { t } from '../../i18n';

/* Card props for a pass (Community → My guestlists, Home → Your passes). */

/* Still to come (or undated) and not cancelled. */
export const isUpcomingPass = (p) => {
    if (!p || p.status === 'revoked') return false;
    const raw = p.event?.date;
    if (!raw) return true;
    const day = String(raw).slice(0, 10);
    const end = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T23:59:59`) : new Date(raw);
    return Number.isNaN(end.getTime()) || end.getTime() >= Date.now();
};

const time = (p) => {
    const d = p.event?.date ? new Date(p.event.date) : null;
    return d && !Number.isNaN(d.getTime()) ? d.getTime() : Infinity;
};
export const bySoonest = (a, b) => time(a) - time(b);

/* from: the current location, so the pass opens as a sheet over the list. */
export const passCard = (pass, { from = null } = {}) => {
    const campaign = pass.source === 'campaign';
    return {
        type: campaign ? 'campaign' : 'guestlist',
        image: pass.event?.image || null,
        title: pass.event?.title || pass.campaignTitle,
        eyebrow: campaign && pass.campaignTitle !== pass.event?.title ? pass.campaignTitle : null,
        chips: [{ icon: MapPin, label: pass.event?.city }],
        badges: pass.status === 'checked_in' ? <GlassChip icon={CircleCheck} label={t('Checked in')} tone="accent" /> : null,
        meta: [{ icon: CalendarDays, label: passWhen(pass.event || {}) }],
        stats: [
            { label: campaign ? t('Tickets') : t('Guests'), value: Number(pass.qty) > 1 ? pass.qty : null },
            { label: t('Tier'), value: pass.tier, tone: 'accent' },
            { label: t('Venue'), value: pass.event?.venue, icon: MapPin },
        ],
        cta: { label: campaign ? t('Open ticket') : pass.mode === 'rsvp' ? t('Open RSVP') : t('Open pass') },
        to: appPath(`/p/${pass.ref}`),
        linkState: from ? { backgroundLocation: from } : undefined,
    };
};
