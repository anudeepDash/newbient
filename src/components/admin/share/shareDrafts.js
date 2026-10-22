/*
 * Ready-to-post messages for a guestlist or a ticket sale, written from its
 * own details: a WhatsApp community announcement, a short group message and
 * an Instagram caption. The team edits them before sending; nothing is sent
 * from here.
 *
 *   shareDrafts({ title, date, time, location, city, locationUrl, description,
 *                 perUserLimit, isTicketed, guestlist, link })
 *     → [{ key, label, hint, text, whatsapp }]
 */

const DAY = { weekday: 'short', day: 'numeric', month: 'short' };

const dayLabel = (date) => {
    if (!date) return '';
    const raw = date instanceof Date ? date : /^\d{4}-\d{2}-\d{2}$/.test(String(date).slice(0, 10)) && !/T\d\d:/.test(String(date)) ? new Date(`${String(date).slice(0, 10)}T00:00:00`) : new Date(date);
    return Number.isNaN(raw.getTime()) ? '' : raw.toLocaleDateString('en-IN', DAY);
};

const plain = (html) => String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/* The description's opening, a paragraph or two (date, venue and the link are added separately). */
const intro = (description, max = 280) => {
    const paras = plain(description).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    let out = '';
    for (const p of paras) {
        // Lines that only repeat the date, time or place are left to the details block.
        if (/^(📅|⏳|📍|🗓|⏰)/u.test(p)) break;
        const next = out ? `${out}\n\n${p}` : p;
        if (next.length > max) break;
        out = next;
        if (out.length > 120) break;
    }
    return out || (paras[0] || '').slice(0, max);
};

const where = (location, city) => [location, city && !String(location || '').toLowerCase().includes(String(city).toLowerCase()) ? city : null].filter(Boolean).join(', ');

export const shareDrafts = (item = {}) => {
    const title = String(item.title || '').trim();
    const day = dayLabel(item.date);
    const time = String(item.time || item.doorsOpen || '').trim();
    const when = [day, time].filter(Boolean).join(' · ');
    const place = where(item.location || item.venue, item.city);
    const map = /^https:\/\//i.test(String(item.locationUrl || '')) ? item.locationUrl : '';
    const about = intro(item.description);
    const link = item.link || '';
    const tickets = Boolean(item.isTicketed) && !item.guestlist;
    const friends = Number(item.perUserLimit) > 1 ? Number(item.perUserLimit) - 1 : 0;
    const cta = tickets ? 'Get your tickets' : 'Get on the list';

    const community = [
        tickets ? `🎟️ *TICKETS ARE LIVE* · ${title}` : `🎟️ *GUESTLIST OPEN* · ${title}`,
        '',
        when && `📅 ${when}`,
        place && `📍 ${place}`,
        map && `🗺️ ${map}`,
        about && '',
        about,
        '',
        !tickets && friends > 0 && `Bring up to ${friends} ${friends === 1 ? 'friend' : 'friends'}: add their names when you sign up.`,
        !tickets && 'Spots are limited.',
        `👉 ${cta}: ${link}`,
    ];

    const group = [
        tickets ? `${title}: tickets are live 🎉` : `${title}: guestlist is open 🎉`,
        [when, place].filter(Boolean).join(' · '),
        `${tickets ? 'Tickets' : 'Reserve your spot'}: ${link}`,
    ];

    const instagram = [
        title.toUpperCase(),
        [when, place].filter(Boolean).join(' · '),
        '',
        about,
        '',
        tickets ? 'Tickets are live. Link in bio 🎟️' : 'Guestlist is open. Link in bio to get on the list 🎟️',
    ];

    const text = (lines) => lines.filter(l => l !== false && l !== null && l !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const wa = (s) => `https://wa.me/?text=${encodeURIComponent(s)}`;

    return [
        { key: 'community', label: 'WhatsApp community', hint: 'The full announcement, for community and broadcast posts' },
        { key: 'group', label: 'Group message', hint: 'Short, for city and college groups' },
        { key: 'instagram', label: 'Instagram caption', hint: 'For a post or story; the link goes in your bio' },
    ].map((d) => {
        const body = text({ community, group, instagram }[d.key]);
        return { ...d, text: body, whatsapp: d.key === 'instagram' ? null : wa(body) };
    });
};

export default shareDrafts;
