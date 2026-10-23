import { format } from 'date-fns';
import { eventStartMoment, istMoment } from '../../lib/ticketing';
import { isPresent } from '../../lib/present';

/*
 * What the event page and the booking flow say about a show, from its
 * upcoming_events document. Pure helpers; anything the admin didn't fill in
 * comes back empty so it isn't shown.
 */

const HHMM = /^(\d{2}):(\d{2})$/;

/** "20:00" → "8:00 PM" (free text such as "8 PM onwards" passes through). */
export const clock = (t) => {
    const m = String(t || '').trim().match(HHMM);
    if (!m) return String(t || '').trim();
    const h = Number(m[1]);
    return `${((h + 11) % 12) + 1}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const startTime = (e) => (HHMM.test(String(e?.time || '')) ? e.time : (String(e?.date || '').match(/T(\d{2}:\d{2})/) || [])[1] || (isPresent(e?.time) ? e.time : ''));

const dayDate = (e) => {
    const day = String(e?.day || e?.date || '').slice(0, 10);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00`) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
};

/** "Sat, 31 Oct" / "Saturday, 31 October 2026". */
export const dayLabel = (e, long = false) => {
    const d = dayDate(e);
    return d ? format(d, long ? 'EEEE, d MMMM yyyy' : 'EEE, d MMM') : '';
};

/** "8:00 PM – 1:00 AM" or "8:00 PM onwards". */
export const timeRange = (e) => {
    const start = startTime(e);
    if (!start) return '';
    const end = HHMM.test(String(e?.endTime || '')) ? e.endTime : '';
    return end ? `${clock(start)} – ${clock(end)}` : `${clock(start)} onwards`;
};

/** "5 hours" / "2 hours 30 min" from start and end (an end before the start is after midnight). */
export const durationLabel = (e) => {
    const a = String(startTime(e)).match(HHMM);
    const b = String(e?.endTime || '').match(HHMM);
    if (!a || !b) return '';
    let mins = (Number(b[1]) * 60 + Number(b[2])) - (Number(a[1]) * 60 + Number(a[2]));
    if (mins <= 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return [h ? `${h} ${h === 1 ? 'hour' : 'hours'}` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
};

export const venueName = (e) => {
    const v = String(e?.location || e?.venue || '').trim();
    return /^(tba|tbd|to be announced)$/i.test(v) ? '' : v;
};
export const venueTba = (e) => !venueName(e);

/** A Google Maps link: the admin's, else a search for the venue. */
export const directionsUrl = (e) => {
    const own = String(e?.locationUrl || '').trim();
    if (/^https:\/\/\S+$/i.test(own)) return own;
    const q = [venueName(e), e?.venueAddress, e?.city].filter(isPresent).join(', ');
    return venueName(e) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
};

const SEATING = { standing: 'Standing', seated: 'Seated', mixed: 'Standing and seated' };
const VENUE_TYPE = { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor and outdoor' };

/** The quick facts, each { key, label, value }. Only what's set. */
export const quickFacts = (e) => {
    const info = e?.info || {};
    const facts = [
        ['duration', 'Duration', durationLabel(e)],
        ['doors', 'Gates open', HHMM.test(String(e?.doorsOpen || '')) ? clock(e.doorsOpen) : ''],
        ['age', 'Age limit', info.ageLimit || e?.ageLimit || ''],
        ['language', 'Language', info.languages || ''],
        ['seating', 'Seating', SEATING[info.seating] || ''],
        ['venueType', 'Venue', VENUE_TYPE[info.venueType] || ''],
        ['kids', 'Kids', info.kidFriendly ? 'Kid friendly' : ''],
        ['pets', 'Pets', info.petFriendly ? 'Pet friendly' : ''],
        ['accessible', 'Access', info.accessible ? 'Wheelchair accessible' : ''],
        ['parking', 'Parking', info.parking ? 'Parking available' : ''],
        ['dress', 'Dress code', info.dressCode || ''],
    ];
    return facts.filter(([, , v]) => isPresent(v)).map(([key, label, value]) => ({ key, label, value }));
};

/** The line-up: rich entries, else the Events editor's plain names. */
export const lineupOf = (e) => {
    const rich = (Array.isArray(e?.lineup) ? e.lineup : []).filter(a => isPresent(a?.name));
    if (rich.length) return rich;
    return (Array.isArray(e?.artists) ? e.artists : []).map(a => (typeof a === 'string' ? { name: a } : a)).filter(a => isPresent(a?.name));
};

export const termsOf = (e) => String(e?.ticketingRules || '').split('\n').map(s => s.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean);

// ── calendar ─────────────────────────────────────────────────────────────────

const icsTime = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const eventWindow = (e) => {
    const start = eventStartMoment(e);
    if (!start) return null;
    const hasTime = Boolean(startTime(e)) && HHMM.test(startTime(e));
    let end = null;
    if (hasTime && HHMM.test(String(e?.endTime || ''))) {
        end = istMoment(`${String(e.date).slice(0, 10)}T${e.endTime}`);
        if (end && end <= start) end = new Date(end.getTime() + 24 * 3600 * 1000);
    }
    return { start, end: end || new Date(start.getTime() + (hasTime ? 4 : 24) * 3600 * 1000), allDay: !hasTime };
};

/** A Google Calendar "add event" link. */
export const googleCalendarUrl = (e, { ref } = {}) => {
    const w = eventWindow(e);
    if (!w) return '';
    const dates = w.allDay
        ? `${String(e.date).slice(0, 10).replace(/-/g, '')}/${format(new Date(w.end.getTime()), 'yyyyMMdd')}`
        : `${icsTime(w.start)}/${icsTime(w.end)}`;
    const details = [ref ? `Booking ${ref}` : '', 'Your pass is in the Newbi app.'].filter(Boolean).join('\n');
    const where = [venueName(e), e?.venueAddress, e?.city].filter(isPresent).join(', ');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title || 'Event')}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(where)}`;
};

/** An .ics file (Apple Calendar, Outlook) as a data URL. */
export const icsDataUrl = (e, { ref, url } = {}) => {
    const w = eventWindow(e);
    if (!w) return '';
    const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const where = [venueName(e), e?.venueAddress, e?.city].filter(isPresent).join(', ');
    const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Newbi//Tickets//EN', 'BEGIN:VEVENT',
        `UID:${ref || e.id}@newbi.live`,
        `DTSTAMP:${icsTime(new Date())}`,
        `DTSTART:${icsTime(w.start)}`,
        `DTEND:${icsTime(w.end)}`,
        `SUMMARY:${esc(e.title)}`,
        where ? `LOCATION:${esc(where)}` : '',
        `DESCRIPTION:${esc([ref ? `Booking ${ref}` : '', url || ''].filter(Boolean).join('\n'))}`,
        url ? `URL:${url}` : '',
        'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean);
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
};

/** iPhone / iPad (including iPadOS that says it's a Mac), Android, or neither. */
export const platform = () => {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    return 'desktop';
};
