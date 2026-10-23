/*
 * Volunteer gig applications, shared by the app, the admin and the server
 * (api/_lib/community.js).
 *
 * Every gig takes applications in the app: it has its own built-in form
 * (`forms/{id}` with `gigId`, one response per signed-in person) and each
 * application is a `form_responses/{formId}_{uid}` document. The team moves
 * it through applied → shortlisted → confirmed / waitlist / rejected in
 * Volunteer gigs → Applicants. Nothing goes to Google Forms or outside links.
 *
 * Older gigs only had an "I'm interested" tap (`gig_applications`) or an
 * outside link; setting up the gig's form brings those people over.
 */

/* Fixed ids, so imported "interested" taps land in the right answers. */
export const GIG_FIELD_IDS = {
    name: 'gig_name',
    phone: 'gig_phone',
    email: 'gig_email',
    city: 'gig_city',
    instagram: 'gig_instagram',
    days: 'gig_days',
    experience: 'gig_experience',
    note: 'gig_note',
};

const dayLabel = (key) => {
    const d = new Date(`${String(key).slice(0, 10)}T12:00:00`);
    return Number.isNaN(d.getTime())
        ? String(key)
        : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

/** The gig's days as "YYYY-MM-DD" strings (older gigs kept a single `date`). */
export const gigDayKeys = (gig) => {
    const raw = Array.isArray(gig?.dates) && gig.dates.length ? gig.dates : gig?.date ? [gig.date] : [];
    return [...new Set(raw.map(d => String(d || '').slice(0, 10)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
};

/** The standard crew application. A gig over several days asks which ones people can do. */
export const gigFormFields = (gig) => {
    const days = gigDayKeys(gig);
    const F = GIG_FIELD_IDS;
    return [
        { id: F.name, type: 'short', label: 'Full name', help: '', required: true, placeholder: '' },
        { id: F.phone, type: 'phone', label: 'WhatsApp number', help: 'The crew briefing and updates come here.', required: true, placeholder: '' },
        { id: F.email, type: 'email', label: 'Email', help: '', required: true, placeholder: '' },
        { id: F.city, type: 'short', label: 'City and college', help: 'College only if you are a student.', required: false, placeholder: 'e.g. Bengaluru, Christ University' },
        { id: F.instagram, type: 'short', label: 'Instagram handle', help: '', required: false, placeholder: '@yourhandle' },
        ...(days.length > 1 ? [{ id: F.days, type: 'checkbox', label: 'Which days can you make it?', help: '', required: true, placeholder: '', options: days.map(dayLabel) }] : []),
        { id: F.experience, type: 'radio', label: 'Have you volunteered at an event before?', help: '', required: true, placeholder: '', options: ['Yes', 'No, this would be my first'] },
        { id: F.note, type: 'long', label: 'Anything we should know?', help: 'Skills, past events, or questions for the team.', required: false, placeholder: '' },
    ];
};

/**
 * A gig's own form after its dates change: the "which days" question follows
 * the gig (added for several days, dropped for one). Other questions, and any
 * the team added or edited, are left alone. Returns null when nothing changes.
 */
export const syncGigFormDays = (fields, gig) => {
    const list = Array.isArray(fields) ? fields : [];
    const wanted = gigFormFields(gig).find(f => f.id === GIG_FIELD_IDS.days) || null;
    const at = list.findIndex(f => f.id === GIG_FIELD_IDS.days);
    if (!wanted) return at === -1 ? null : list.filter(f => f.id !== GIG_FIELD_IDS.days);
    if (at !== -1) {
        const current = list[at];
        if (JSON.stringify(current.options || []) === JSON.stringify(wanted.options)) return null;
        return list.map((f, i) => (i === at ? { ...current, options: wanted.options } : f));
    }
    const after = [GIG_FIELD_IDS.instagram, GIG_FIELD_IDS.city, GIG_FIELD_IDS.email, GIG_FIELD_IDS.phone, GIG_FIELD_IDS.name]
        .map(id => list.findIndex(f => f.id === id)).find(i => i !== -1);
    const next = [...list];
    next.splice(after === undefined ? next.length : after + 1, 0, wanted);
    return next;
};

/** The form document made for a gig. */
export const gigFormDoc = (gig, now = new Date().toISOString()) => ({
    title: `${String(gig?.title || 'Volunteer gig').trim()} · crew application`,
    description: '',
    fields: gigFormFields(gig),
    gigId: gig?.id || '',
    onePerPerson: true,
    requireSignIn: true,
    submitLabel: 'Send application',
    confirmationMessage: 'Your application is in. We’ll let you know here once the crew is picked.',
    activeLabel: String(gig?.status || '').toLowerCase() === 'closed' ? 'Closed' : gig?.status === 'Filling Fast' ? 'Few Slots Remain' : 'Live',
    highlightColor: gig?.highlightColor || '#39FF14',
    image: gig?.image || '',
    city: gig?.city || '',
    // Shown inside the gig, never as a card of its own.
    hidden: true,
    responseCount: 0,
    createdAt: now,
    updatedAt: now,
});

/** An older "I'm interested" tap as answers to the standard application. */
export const interestToAnswers = (interest = {}) => {
    const F = GIG_FIELD_IDS;
    const answers = {};
    if (interest.name) answers[F.name] = String(interest.name);
    if (interest.phone) answers[F.phone] = String(interest.phone);
    if (interest.email) answers[F.email] = String(interest.email);
    if (interest.city) answers[F.city] = String(interest.city);
    if (interest.note) answers[F.note] = String(interest.note);
    return answers;
};

/* What an applicant sees about their own application. */
export const APPLICANT_STATUS = {
    new: { label: 'Applied', title: 'Your application is in', body: 'The team is going through applications. We’ll tell you here when the crew is picked.', tone: 'info' },
    shortlisted: { label: 'Shortlisted', title: 'You’re shortlisted', body: 'You made the shortlist. The team may reach out on WhatsApp before confirming the crew.', tone: 'info' },
    confirmed: { label: 'Confirmed', title: 'You’re on the crew', body: 'You’re confirmed. Join the crew group for the briefing, timings and dress code.', tone: 'success' },
    waitlist: { label: 'Waitlist', title: 'You’re on the waitlist', body: 'The crew is full for now. We’ll tell you here if a spot opens up.', tone: 'warn' },
    rejected: { label: 'Not this time', title: 'Not this time', body: 'We couldn’t fit you into this crew. Keep an eye out for the next gig.', tone: 'info' },
};

export const applicantStatus = (status) => APPLICANT_STATUS[status] ? status : 'new';

/* People can take back an application until they're confirmed or turned down. */
export const canWithdraw = (status) => ['new', 'shortlisted', 'waitlist'].includes(applicantStatus(status));
