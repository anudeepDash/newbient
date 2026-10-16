/*
 * Enquiry form rules shared by the landing form (browser) and api/_lib/enquiry.js
 * (server). Pure: no Firebase, no mail, so it's safe in the browser bundle.
 */

export const AUDIENCES = {
    brand: 'Brand',
    college: 'College',
    creator: 'Creator',
    artist: 'Artist / manager',
    other: 'Something else',
};

export const BUDGETS = {
    'under-1l': 'Under ₹1 lakh',
    '1-5l': '₹1–5 lakh',
    '5-15l': '₹5–15 lakh',
    '15l-plus': '₹15 lakh+',
    unsure: 'Not sure yet',
};

export const TIMELINES = {
    asap: 'Within 2 weeks',
    month: 'Within a month',
    quarter: 'In 1–3 months',
    later: 'Later / exploring',
};

const EMAIL_RE = /^[^\s@<>()[\]\\,;:]+@[^\s@<>()[\]\\,;:]+\.[a-z]{2,}$/i;
export const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

export function validateEnquiry(body = {}) {
    const data = {
        name: clean(body.name, 80),
        email: clean(body.email, 120).toLowerCase(),
        phone: clean(body.phone, 20),
        company: clean(body.company, 100),
        audience: clean(body.audience, 20),
        budget: clean(body.budget, 20),
        timeline: clean(body.timeline, 20),
        message: clean(body.message, 2000),
        page: clean(body.page, 40),
    };
    const errors = {};
    if (!AUDIENCES[data.audience]) errors.audience = 'Please choose who you are.';
    if (data.name.length < 2) errors.name = 'Please tell us your name.';
    if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email.';
    if (data.phone && !/^\+?[\d\s()-]{7,20}$/.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
    if (data.budget && !BUDGETS[data.budget]) errors.budget = 'Please choose a budget.';
    if (data.timeline && !TIMELINES[data.timeline]) errors.timeline = 'Please choose a timeline.';
    if (data.message.length < 10) errors.message = 'Please add a few words about what you need.';
    return { data, errors, ok: Object.keys(errors).length === 0 };
}

