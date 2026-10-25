/*
 * Feedback and testimonials after a campaign: the rules the server
 * (api/_lib/campaignFeedback.js), the creator's form (/f/:token) and the
 * admin's Feedback tab share.
 *
 * Who gets asked: everyone who took part, which is anyone who
 *   - sent at least one deliverable (submitted or approved, any task),
 *   - was put on the list (shortlisted and told, or in the creators group), or
 *   - was sent a ticket or confirmation.
 * People only "Considering", not selected, or removed are never asked.
 *
 * When: the day after the campaign's event (eventDate + 1, 09:00 IST, the mail
 * cron), unless the team turns it off or picks another day.
 */

export const QUOTE_MAX = 400;
export const TEXT_MAX = 1000;

/* Why someone is on the list, for the admin's chips. */
export const REASONS = {
    tasks: { label: 'Sent a deliverable', short: 'Deliverable', tone: 'green' },
    list: { label: 'On the shortlist', short: 'Shortlisted', tone: 'pink' },
    ticket: { label: 'Got a ticket', short: 'Ticket', tone: 'blue' },
};

export const AGAIN = [
    { value: 'yes', label: 'Yes, for sure' },
    { value: 'maybe', label: 'Maybe' },
    { value: 'no', label: 'Not really' },
];

/*
 * Publishing consent. Nothing is ever published without one of the two "yes"
 * answers, and saying "no" later takes a published quote down.
 */
export const CONSENT = [
    { value: 'full', label: 'Yes, with my name and Instagram handle' },
    { value: 'first_name', label: 'Yes, with my first name only' },
    { value: 'no', label: 'No, keep it private' },
];
export const canPublish = (consent) => consent === 'full' || consent === 'first_name';

const str = (v, max) => String(v ?? '').replace(/\s+\n/g, '\n').trim().slice(0, max);

/** Checks a form submission. → { ok, value, errors } */
export const validateFeedback = (input = {}) => {
    const errors = {};
    const rating = Math.round(Number(input.rating));
    if (!(rating >= 1 && rating <= 5)) errors.rating = 'Pick a rating from 1 to 5.';
    const again = AGAIN.some(a => a.value === input.again) ? input.again : '';
    const liked = str(input.liked, TEXT_MAX);
    const improve = str(input.improve, TEXT_MAX);
    const testimonial = str(input.testimonial, QUOTE_MAX);
    if (testimonial && testimonial.length < 15) errors.testimonial = 'Write a little more, or leave it empty.';
    let consent = CONSENT.some(c => c.value === input.consent) ? input.consent : '';
    if (testimonial && !consent) errors.consent = 'Tell us if we can share it on our site.';
    if (!testimonial) consent = '';
    return {
        ok: Object.keys(errors).length === 0,
        errors,
        value: { rating, again, liked, improve, testimonial, consent },
    };
};

/** "2026-11-14" in IST, `days` after a calendar day ("2026-11-13"). '' when there is no day. */
export const addDays = (day, days = 1) => {
    const m = String(day || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
    return d.toISOString().slice(0, 10);
};

/** The day it goes out: the team's own pick, else the day after the event. '' when neither is set. */
export const sendDayFor = (campaign, settings = {}) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(settings.sendOn || ''))) return settings.sendOn;
    return addDays(campaign?.eventDate);
};

/* Each person's request, as the admin shows it. */
export const REQUEST_STATUS = {
    not_sent: { label: 'Not asked yet', tone: 'gray' },
    sent: { label: 'Asked', tone: 'blue' },
    responded: { label: 'Answered', tone: 'green' },
};
