/*
 * Creator application options, shared by the app (apply form, profile) and the
 * server (api/_lib/creatorApp.js validates against the same lists). Plain JS,
 * no browser imports.
 */
import { CREATOR_NICHE_OPTIONS, isCollegeNiche, nicheKey } from '../constants.js';

export { CREATOR_NICHE_OPTIONS, isCollegeNiche, nicheKey };

export const NICHE_IDS = new Set(CREATOR_NICHE_OPTIONS.map(n => n.id));

/* doBarter values, as the admin and the old form stored them. */
export const COLLAB_OPTIONS = [
    { id: 'both', label: 'Paid and barter', hint: 'Money, products, passes' },
    { id: 'paid', label: 'Paid only', hint: 'Cash campaigns' },
    { id: 'barter', label: 'Barter and gigs', hint: 'Products, passes, stays' },
];
export const COLLAB_IDS = new Set(COLLAB_OPTIONS.map(o => o.id));

/* Rate bands, saved as the same `commercials` string the admin already reads. */
export const RATE_OPTIONS = [
    { id: 'flexible', label: 'Flexible / Barter', commercials: 'Flexible / Barter' },
    { id: '2-8', label: '₹2K – ₹8K', commercials: '₹2,000 – ₹8,000 / Deliverable' },
    { id: '8-20', label: '₹8K – ₹20K', commercials: '₹8,000 – ₹20,000 / Deliverable' },
    { id: '20-50', label: '₹20K – ₹50K', commercials: '₹20,000 – ₹50,000 / Deliverable' },
    { id: '50+', label: '₹50K – ₹1L+', commercials: '₹50,000 – ₹1,00,000+ / Deliverable' },
];
export const rateFromCommercials = (commercials = '') => RATE_OPTIONS.find(r => r.commercials === commercials)?.id || null;

export const BIO_MAX = 400;
