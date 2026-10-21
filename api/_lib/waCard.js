/**
 * The image header of a WhatsApp template, drawn for that one message: the
 * event or campaign it's about, the date, the amount. Same look as the share
 * cards (scripts/og/cards.html): black, neon wash, the Newbi logo, a sticker.
 *
 *   waCardFor('pass_confirmed', ['Riya', 'Sunburn Arena', 'Sat, 14 Nov', 'NB7K2Q'])
 *     → { k: 'pass_confirmed', v: ['Sunburn Arena', 'Sat, 14 Nov'] }   (never the person's name)
 *   waCardUrl(card) → https://app.newbi.live/api/qr?wa=<data>&sig=<hmac>   (Meta fetches this)
 *   renderWaCard(card) → PNG buffer, 1200×630                              (api/qr.js serves it)
 *
 * The URL is signed (LINK_SIGNING_SECRET), so nobody can make Newbi cards that
 * say whatever they like. The content is all in the URL, so a card is cached
 * for good once drawn.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { signValue, isValidSignature } from './linkSign.js';

const require = createRequire(import.meta.url);
const ORIGIN = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');
const W = 1200;
const H = 630;
const GREEN = '#39FF14';

const clip = (s, n) => {
    const v = String(s ?? '').replace(/\s+/g, ' ').trim();
    return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v;
};

// Lucide icon paths (the set the site uses), drawn as an SVG image.
const ICONS = {
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    rupee: '<path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
};
const iconSrc = (name, color) => `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`,
).toString('base64')}`;

/*
 * Per template: which body params the card shows (by index; index 0 is always
 * the person's name and is never used), and how. `title(v)` is the big line,
 * `rows(v)` the details under it, `sticker` the word on the badge. `titleIcon`
 * draws a sign the fonts don't have (₹) in front of the title.
 */
const KINDS = {
    pass_confirmed: { pick: [1, 2], kicker: 'Your pass', title: (v) => v[0], rows: (v) => [['Date', v[1]], ['Entry', 'QR pass in the app']], icon: 'ticket', sticker: "You're in" },
    campaign_ticket_link: { pick: [1, 2, 3], kicker: 'Campaign ticket', title: (v) => v[1] || v[0], rows: (v) => [['Campaign', v[0]], ['Date', v[2]]], icon: 'ticket', sticker: 'Ticket' },
    creator_approved: { pick: [], kicker: 'Newbi Creators', title: () => 'Creator profile approved', rows: () => [['Next', 'Apply to campaigns in your city']], icon: 'check', sticker: 'Approved' },
    campaign_invite: { pick: [1], kicker: 'New campaign', title: (v) => v[0], rows: () => [['For', 'Newbi creators'], ['Next', 'Read the brief and apply']], icon: 'megaphone', sticker: 'Apply' },
    campaign_shortlisted: { pick: [1], kicker: 'Shortlisted', title: (v) => v[0], rows: () => [['Next', 'Join the campaign group']], icon: 'star', sticker: 'Shortlisted' },
    campaign_shortlist: { pick: [1, 3], kicker: 'Shortlisted', title: (v) => v[0], rows: (v) => [['Next', 'Join the creators group'], ['Posting', v[1]]], icon: 'users', sticker: 'Shortlisted' },
    campaign_join_reminder: { pick: [1], kicker: 'Reminder', title: (v) => v[0], rows: () => [['Still to do', 'Join the creators group']], icon: 'alarm', sticker: 'Join now' },
    campaign_deliverables: { pick: [1], kicker: 'Send your posts', title: (v) => v[0], rows: () => [['Next', 'Post, then send us the links']], icon: 'upload', sticker: 'Posts' },
    campaign_deliverable_changes: { pick: [1, 2], kicker: 'One quick change', title: (v) => v[0], rows: (v) => [['Fix', v[1]]], icon: 'pencil', sticker: 'Change' },
    campaign_payout_sent: { pick: [1, 2], kicker: 'Payout sent', titleIcon: 'rupee', title: (v) => v[0], rows: (v) => [['Campaign', v[1]], ['Paid by', 'Newbi · UPI']], icon: 'wallet', sticker: 'Paid' },
    creator_city_group: { pick: [2, 1], kicker: 'City community', title: (v) => `${v[0]} creators`, rows: (v) => [['Applied to', v[1]], ['Join for', 'Gigs, passes and meetups']], icon: 'pin', sticker: 'Join' },
};

export const hasWaCard = (template) => Boolean(KINDS[template]);

/** The card data for one message, or null when the template has no image header. */
export const waCardFor = (template, bodyParams = []) => {
    const kind = KINDS[template];
    if (!kind) return null;
    return { k: template, v: kind.pick.map((i) => clip(bodyParams[i], 90)) };
};

const encode = (card) => Buffer.from(JSON.stringify(card)).toString('base64url');

/** The signed image URL Meta fetches, or null without a signing key. */
export const waCardUrl = (card) => {
    if (!card) return null;
    const data = encode(card);
    const sig = signValue(`wa:${data}`);
    return sig ? `${ORIGIN}/api/qr?wa=${data}&sig=${sig}` : null;
};

/** The card from a URL's ?wa=&sig=, or null when it's forged or malformed. */
export const readWaCard = (data, sig) => {
    if (typeof data !== 'string' || data.length > 1500 || !isValidSignature(`wa:${data}`, sig)) return null;
    try {
        const card = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
        return KINDS[card?.k] && Array.isArray(card.v) ? card : null;
    } catch {
        return null;
    }
};

/* ── Drawing ─────────────────────────────────────────────────────────── */

// Satori takes plain element objects; h() keeps them readable.
const h = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });

let assets = null;
const loadAssets = () => {
    if (assets) return assets;
    const font = (pkg, file) => fs.readFileSync(path.join(path.dirname(require.resolve(`${pkg}/package.json`)), 'files', file));
    const logoFile = path.join(process.cwd(), 'src/assets/logo/newbi-logo.svg');
    assets = {
        fonts: [
            { name: 'Manrope', data: font('@fontsource/manrope', 'manrope-latin-800-normal.woff'), weight: 800, style: 'normal' },
            { name: 'Inter', data: font('@fontsource/inter', 'inter-latin-500-normal.woff'), weight: 500, style: 'normal' },
            { name: 'Inter', data: font('@fontsource/inter', 'inter-latin-700-normal.woff'), weight: 700, style: 'normal' },
        ],
        logo: fs.existsSync(logoFile) ? `data:image/svg+xml;base64,${fs.readFileSync(logoFile).toString('base64')}` : null,
    };
    return assets;
};

const titleSize = (t) => (t.length <= 12 ? 96 : t.length <= 22 ? 80 : t.length <= 36 ? 66 : 56);

const element = (card) => {
    const kind = KINDS[card.k];
    const v = card.v || [];
    const title = clip(kind.title(v) || 'Newbi', 60);
    const rows = kind.rows(v).filter(([, val]) => val).slice(0, 2).map(([l, val]) => [l, clip(val, 46)]);
    const { logo } = loadAssets();

    return h('div', {
        width: W, height: H, position: 'relative', flexDirection: 'column', padding: '48px 64px',
        backgroundColor: '#0A0A0A', color: '#fff', fontFamily: 'Inter',
        backgroundImage: 'radial-gradient(ellipse at 85% 20%, rgba(57,255,20,0.28), rgba(10,10,10,0) 55%), radial-gradient(ellipse at 0% 100%, rgba(56,189,248,0.16), rgba(10,10,10,0) 50%)',
    }, [
        // Top: logo and the kind of message.
        h('div', { alignItems: 'center', justifyContent: 'space-between', width: 640 }, [
            logo ? { type: 'img', props: { src: logo, height: 52, style: { height: 52 } } } : h('div', { fontFamily: 'Manrope', fontSize: 34 }, 'NEWBI'),
        ]),
        h('div', { marginTop: 54, alignItems: 'center', alignSelf: 'flex-start', padding: '10px 20px', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.18)' }, [
            h('div', { width: 14, height: 14, borderRadius: 7, backgroundColor: GREEN, marginRight: 12 }, []),
            h('div', { fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#E4E4E7' }, kind.kicker),
        ]),
        // The event, campaign, amount or city.
        h('div', { marginTop: 26, width: 660, alignItems: 'center', fontFamily: 'Manrope', fontSize: titleSize(title), lineHeight: 1.0, letterSpacing: -2, fontWeight: 800, color: '#fff' }, kind.titleIcon
            ? [{ type: 'img', props: { src: iconSrc(kind.titleIcon, '#fff'), width: titleSize(title) * 0.8, height: titleSize(title) * 0.8, style: { marginRight: 6 } } }, title]
            : title),
        // Details.
        h('div', { marginTop: 30, flexDirection: 'column', width: 640 }, rows.map(([label, val]) => h('div', { alignItems: 'baseline', marginTop: 12 }, [
            h('div', { width: 170, fontSize: 18, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#A1A1AA' }, label),
            h('div', { fontSize: 28, fontWeight: 500, color: '#F4F4F5' }, val),
        ]))),
        // Footer.
        h('div', { position: 'absolute', left: 64, bottom: 44, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }, 'app.newbi.live'),
        // The sticker: icon and one word, tilted, on the right.
        h('div', {
            position: 'absolute', right: 86, top: 150, width: 330, height: 330, borderRadius: 165, transform: 'rotate(-8deg)',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backgroundColor: GREEN, color: '#000', border: '6px solid #000', boxShadow: '14px 14px 0 #000',
        }, [
            { type: 'img', props: { src: iconSrc(kind.icon, '#000'), width: 120, height: 120, style: { width: 120, height: 120 } } },
            h('div', { marginTop: 14, fontFamily: 'Manrope', fontSize: 38, fontWeight: 800, letterSpacing: -1, textTransform: 'uppercase' }, kind.sticker),
        ]),
    ]);
};

/** Draws the card; PNG bytes. */
export const renderWaCard = async (card) => {
    const { ImageResponse } = await import('@vercel/og');
    const res = new ImageResponse(element(card), { width: W, height: H, fonts: loadAssets().fonts });
    return Buffer.from(await res.arrayBuffer());
};
