import { isValidUpiId, MAX_PER_ORDER_CAP } from '../../../lib/ticketing';
import { normalizeVenueMap } from '../../../lib/venueMap';
import { cleanAmbient } from '../../../lib/ambientColor';

/*
 * The ticket-sale editor's form ↔ the upcoming_events document. Pure, so it
 * can be tested. Every field the app's event page and checkout read:
 *
 *   The show      title, category, genres[], image (the one 16:9 banner, also
 *                 written to hubImage so every screen shows the same picture),
 *                 organizer, description, lineup[{ name, role, image,
 *                 instagram }], gallery[]
 *   When          date, time, endTime, doorsOpen ('HH:mm')
 *   Where         location (venue), venueAddress, city, locationUrl
 *   Good to know  info { ageLimit, languages, seating, venueType, kidFriendly,
 *                 petFriendly, accessible, parking, dressCode }, thingsToKnow[], faqs[{ q, a }]
 *   Tickets       ticketCategories[] (see eventTiers in src/lib/ticketing.js),
 *                 ticketCapacity, maxPerOrder, salesStart, salesEnd, salesPaused,
 *                 ticketingDescription (a note over the tickets), ticketingRules (terms)
 *   Map           venueMap (src/lib/venueMap.js)
 *   Payments      payments { upi, gateway, requireProof }, upiId, upiName, upiMerchant, upiMerchantCode, qrCodeUrl
 *   Where shown   showOnSite, showInApp, listed (false: only people with the link)
 *
 * Fields this editor doesn't know about (guestlist settings, the Events
 * editor's own) are left alone: saving only writes these keys.
 */

const str = (v) => (v === null || v === undefined ? '' : String(v));
const numOrBlank = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '' : String(v));
const intOrNull = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Math.max(0, parseInt(v, 10) || 0));
const money = (v) => Math.max(0, Math.round((Number(v) || 0) * 100) / 100);
const moneyOrNull = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : money(v));
const lines = (text) => str(text).split('\n').map(s => s.trim()).filter(Boolean);
const httpsOrBlank = (v) => (/^https:\/\/\S+$/i.test(str(v).trim()) ? str(v).trim() : '');

export const AGE_LIMITS = ['', 'All ages', '12+', '16+', '18+', '21+', '25+'];
export const SEATING = [
    { value: '', label: 'Not set' },
    { value: 'standing', label: 'Standing' },
    { value: 'seated', label: 'Seated' },
    { value: 'mixed', label: 'Standing and seated' },
];
export const VENUE_TYPES = [
    { value: '', label: 'Not set' },
    { value: 'indoor', label: 'Indoor' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'both', label: 'Indoor and outdoor' },
];
export const TIER_BADGES = ['', 'Early bird', 'Selling fast', 'Best value', 'Limited', 'Last few'];

let seed = 0;
export const newTierId = () => `cat_${Date.now()}_${(seed++ % 1000).toString(36)}`;
export const newRowId = (p = 'row') => `${p}_${Date.now().toString(36)}${(seed++ % 1000).toString(36)}`;

export const blankTier = (name = '') => ({
    id: newTierId(), name, description: '', price: '', originalPrice: '', capacity: '',
    maxPerOrder: '', minPerOrder: '', admits: '1', salesStart: '', salesEnd: '', hidden: false, badge: '', color: '',
});

const splitDate = (value) => {
    const raw = typeof value === 'string' ? value : '';
    return { date: raw.slice(0, 10), time: /T\d{2}:\d{2}/.test(raw) ? raw.slice(11, 16) : '' };
};

// A datetime-local input wants "YYYY-MM-DDTHH:MM".
const localDateTime = (v) => {
    const s = str(v);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00`;
    return '';
};

export const fromEvent = (e = {}) => {
    const { date, time } = splitDate(e.date);
    const cats = Array.isArray(e.ticketCategories) ? e.ticketCategories : [];
    const info = e.info || {};
    const payments = e.payments || {};
    return {
        title: str(e.title),
        category: str(e.category),
        genres: (Array.isArray(e.genres) ? e.genres : []).join(', '),
        // One 16:9 banner. Older events may have a wide hubImage next to a poster: the wide one wins.
        image: str(e.hubImage || e.image || e.poster),
        ambientColor: cleanAmbient(e.ambientColor),
        organizer: str(e.organizer),
        description: str(e.description),
        lineup: (Array.isArray(e.lineup) && e.lineup.length
            ? e.lineup
            : (Array.isArray(e.artists) ? e.artists : []).map(a => (typeof a === 'string' ? { name: a } : a))
        ).filter(a => a?.name).map(a => ({ id: newRowId('artist'), name: str(a.name), role: str(a.role), image: str(a.image), instagram: str(a.instagram) })),
        gallery: (Array.isArray(e.gallery) ? e.gallery : []).filter(Boolean),

        date,
        time: /^\d{2}:\d{2}$/.test(str(e.time)) ? e.time : time,
        endTime: /^\d{2}:\d{2}$/.test(str(e.endTime)) ? e.endTime : '',
        doorsOpen: /^\d{2}:\d{2}$/.test(str(e.doorsOpen)) ? e.doorsOpen : '',

        location: str(e.location || e.venue),
        venueAddress: str(e.venueAddress),
        city: str(e.city),
        locationUrl: str(e.locationUrl),

        info: {
            ageLimit: str(info.ageLimit || e.ageLimit),
            languages: str(info.languages),
            seating: str(info.seating),
            venueType: str(info.venueType),
            kidFriendly: info.kidFriendly === true,
            petFriendly: info.petFriendly === true,
            accessible: info.accessible === true,
            parking: info.parking === true,
            dressCode: str(info.dressCode),
            showFacts: info.hideFacts !== true,
        },
        thingsToKnow: (Array.isArray(e.thingsToKnow) ? e.thingsToKnow : []).join('\n'),
        faqs: (Array.isArray(e.faqs) ? e.faqs : []).filter(f => f?.q).map(f => ({ id: newRowId('faq'), q: str(f.q), a: str(f.a) })),

        tiers: cats.length
            ? cats.map(c => ({
                ...c,
                id: c.id || newTierId(),
                name: str(c.name),
                description: str(c.description),
                price: numOrBlank(c.price),
                originalPrice: numOrBlank(c.originalPrice),
                capacity: numOrBlank(c.capacity),
                maxPerOrder: numOrBlank(c.maxPerOrder),
                minPerOrder: numOrBlank(c.minPerOrder),
                admits: numOrBlank(c.admits) || '1',
                salesStart: localDateTime(c.salesStart),
                salesEnd: localDateTime(c.salesEnd),
                hidden: c.hidden === true,
                badge: str(c.badge),
                color: str(c.color),
            }))
            : [{ ...blankTier('General admission'), price: numOrBlank(e.basePrice) }],
        ticketCapacity: numOrBlank(e.ticketCapacity),
        maxPerOrder: numOrBlank(e.maxPerOrder),
        salesStart: localDateTime(e.salesStart),
        salesEnd: localDateTime(e.salesEnd),
        salesPaused: e.salesPaused === true,
        ticketingDescription: str(e.ticketingDescription),
        ticketingRules: str(e.ticketingRules),

        venueMap: normalizeVenueMap(e.venueMap),
        showVenueMap: e.hideVenueMap !== true,

        payments: { upi: payments.upi !== false, gateway: payments.gateway === true, requireProof: payments.requireProof === true, free: payments.free === true },
        upiId: str(e.upiId || e.paymentDetails?.upiId),
        upiName: str(e.upiName),
        upiMerchant: e.upiMerchant === true,
        upiMerchantCode: str(e.upiMerchantCode),
        qrCodeUrl: str(e.qrCodeUrl),

        showOnSite: e.showOnSite !== false,
        showInApp: e.showInApp !== false,
        listed: e.listed !== false,
    };
};

export const EMPTY_SALE = () => ({ ...fromEvent({}), tiers: [blankTier('General admission')], showOnSite: true, showInApp: true });

/** The tiers as stored. Ids are kept so orders stay matched; fields the map/legacy code set (mapping, coords) stay too. */
export const cleanTiers = (tiers = []) => tiers
    .filter(t => str(t.name).trim() || str(t.price).trim())
    .map(t => {
        const price = money(t.price);
        const original = moneyOrNull(t.originalPrice);
        const out = {
            ...t,
            name: str(t.name).trim(),
            description: str(t.description).trim().slice(0, 300),
            price,
            originalPrice: original !== null && original > price ? original : null,
            capacity: intOrNull(t.capacity),
            maxPerOrder: intOrNull(t.maxPerOrder) ? Math.min(MAX_PER_ORDER_CAP, intOrNull(t.maxPerOrder)) : null,
            minPerOrder: intOrNull(t.minPerOrder) > 1 ? intOrNull(t.minPerOrder) : null,
            admits: Math.max(1, Math.min(20, intOrNull(t.admits) || 1)),
            salesStart: str(t.salesStart) || null,
            salesEnd: str(t.salesEnd) || null,
            hidden: t.hidden === true,
            badge: str(t.badge).trim().slice(0, 24),
            color: /^#[0-9a-f]{3,8}$/i.test(str(t.color)) ? t.color : '',
        };
        return out;
    });

/** What's wrong with the form, as a list of { section, message } (empty when it can be saved). */
export const saleProblems = (form, { soldByTier = {} } = {}) => {
    const out = [];
    const add = (section, message) => out.push({ section, message });
    if (!form.title.trim()) add('show', 'Give the show a name.');
    if (!form.date) add('when', 'Add the date.');
    if (!form.location.trim()) add('where', 'Add the venue (write TBA if it isn’t fixed yet).');
    if (form.locationUrl.trim() && !/^https:\/\/\S+$/i.test(form.locationUrl.trim())) add('where', 'The map link should start with https://');
    const tiers = cleanTiers(form.tiers);
    if (!tiers.length) add('tickets', 'Add at least one ticket type.');
    form.tiers.forEach((t, i) => {
        const label = str(t.name).trim() || `Ticket type ${i + 1}`;
        if (!str(t.name).trim() && str(t.price).trim()) add('tickets', `${label} needs a name.`);
        if (Number(t.price) < 0 || Number.isNaN(Number(t.price || 0))) add('tickets', `${label}: the price must be 0 or more.`);
        const sold = soldByTier[t.id] || 0;
        if (t.capacity !== '' && intOrNull(t.capacity) !== null && intOrNull(t.capacity) < sold) add('tickets', `${label} already has ${sold} sold, so it can’t be limited to ${t.capacity}.`);
        if (t.salesStart && t.salesEnd && t.salesStart > t.salesEnd) add('tickets', `${label}: sales end before they start.`);
        if (intOrNull(t.minPerOrder) > 1 && intOrNull(t.maxPerOrder) && intOrNull(t.minPerOrder) > intOrNull(t.maxPerOrder)) add('tickets', `${label}: the minimum per order is above the maximum.`);
    });
    if (form.salesStart && form.salesEnd && form.salesStart > form.salesEnd) add('tickets', 'Sales end before they start.');
    const paid = tiers.some(t => t.price > 0) && !form.payments.free;
    if (form.upiId.trim() && !isValidUpiId(form.upiId)) add('payments', 'That UPI ID looks wrong. It should look like name@bank.');
    if (form.qrCodeUrl.trim() && !/^https:\/\/\S+$/i.test(form.qrCodeUrl.trim())) add('payments', 'The QR image link should start with https://');
    if (paid && !form.payments.upi && !form.payments.gateway) add('payments', 'Turn on at least one way to pay.');
    if (form.upiMerchant && form.upiMerchantCode && !/^\d{4}$/.test(form.upiMerchantCode)) add('payments', 'A merchant category code is 4 digits.');
    form.faqs.forEach((f, i) => { if (!f.q.trim() && f.a.trim()) add('faqs', `Question ${i + 1} has an answer but no question.`); });
    return out;
};

/** Paid tickets but no UPI ID here: checkout falls back to the site-wide UPI details (Payments → site settings). */
export const usesSiteUpi = (form) => form.payments.upi && !form.upiId.trim();

/** The fields to save. */
export const toPayload = (form) => {
    const ticketCategories = cleanTiers(form.tiers);
    const prices = ticketCategories.map(t => t.price);
    return {
        title: form.title.trim(),
        category: form.category.trim(),
        genres: form.genres.split(',').map(s => s.trim()).filter(Boolean).slice(0, 8),
        image: form.image.trim(),
        hubImage: form.image.trim(),
        ambientColor: cleanAmbient(form.ambientColor),
        organizer: form.organizer.trim(),
        description: form.description.trim(),
        lineup: form.lineup.filter(a => a.name.trim()).map(a => ({
            name: a.name.trim().slice(0, 80),
            role: a.role.trim().slice(0, 40),
            image: httpsOrBlank(a.image),
            instagram: a.instagram.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '').slice(0, 40),
        })),
        gallery: form.gallery.map(httpsOrBlank).filter(Boolean).slice(0, 12),

        date: form.time ? `${form.date}T${form.time}` : form.date,
        time: form.time || '',
        endTime: form.endTime || '',
        doorsOpen: form.doorsOpen || '',

        location: form.location.trim(),
        venueAddress: form.venueAddress.trim(),
        city: form.city.trim(),
        locationUrl: form.locationUrl.trim(),

        info: {
            ageLimit: form.info.ageLimit,
            languages: form.info.languages.trim(),
            seating: form.info.seating,
            venueType: form.info.venueType,
            kidFriendly: form.info.kidFriendly,
            petFriendly: form.info.petFriendly,
            accessible: form.info.accessible,
            parking: form.info.parking,
            dressCode: form.info.dressCode.trim(),
            // The quick facts (age, duration, gates open, seating…) on the event page.
            hideFacts: !form.info.showFacts,
        },
        thingsToKnow: lines(form.thingsToKnow).slice(0, 15),
        faqs: form.faqs.filter(f => f.q.trim()).map(f => ({ q: f.q.trim().slice(0, 200), a: f.a.trim().slice(0, 1000) })),

        isTicketed: true,
        ticketMode: 'qr',
        ticketCategories,
        basePrice: prices.length ? Math.min(...prices) : 0,
        ticketCapacity: intOrNull(form.ticketCapacity),
        maxPerOrder: intOrNull(form.maxPerOrder) ? Math.min(MAX_PER_ORDER_CAP, intOrNull(form.maxPerOrder)) : null,
        salesStart: form.salesStart || null,
        salesEnd: form.salesEnd || null,
        salesPaused: Boolean(form.salesPaused),
        ticketingDescription: form.ticketingDescription.trim(),
        ticketingRules: form.ticketingRules.trim(),

        venueMap: normalizeVenueMap(form.venueMap),
        // Off keeps the drawn map (and any old venue image) but buyers don't see it.
        hideVenueMap: !form.showVenueMap,

        payments: { upi: Boolean(form.payments.upi), gateway: Boolean(form.payments.gateway), requireProof: Boolean(form.payments.requireProof), free: Boolean(form.payments.free) },
        upiId: form.upiId.trim(),
        upiName: form.upiName.trim().slice(0, 50),
        upiMerchant: Boolean(form.upiMerchant),
        upiMerchantCode: form.upiMerchant ? form.upiMerchantCode.trim() : '',
        qrCodeUrl: form.qrCodeUrl.trim(),

        showOnSite: Boolean(form.showOnSite),
        showInApp: Boolean(form.showInApp),
        listed: Boolean(form.listed),
        updatedAt: new Date().toISOString(),
    };
};
