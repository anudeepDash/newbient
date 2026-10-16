/**
 * Marketing-mail extras: merge tags, signed unsubscribe links, and open/click
 * tracking through /api/track. Transactional mail never goes through here.
 */
import { signTrackedLinks, unsubscribeSig } from '../linkSign.js';
import { SITE_URL } from '../db.js';

const escapeValue = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export const MERGE_TAG_RE = /\{\{?\s*(name|first_name|email|role)\s*\}?\}/i;

/** Fills {{name}}, {{first_name}}, {{email}}, {{role}}. HTML gets escaped values. */
export const fillMergeTags = (text, person = {}, { html = true } = {}) => {
    if (!text || typeof text !== 'string') return text;
    const email = String(person.email || '');
    const fullName = String(person.name || '').trim() || email.split('@')[0] || 'there';
    const first = fullName.split(/\s+/)[0] || 'there';
    const role = String(person.role || '').trim() || 'Member';
    const v = (s) => (html ? escapeValue(s) : String(s).replace(/[\r\n]+/g, ' '));
    return text
        .replace(/\{\{?\s*name\s*\}?\}/gi, v(fullName))
        .replace(/\{\{?\s*first_name\s*\}?\}/gi, v(first))
        .replace(/\{\{?\s*email\s*\}?\}/gi, v(email))
        .replace(/\{\{?\s*role\s*\}?\}/gi, v(role));
};

/** Signed one-tap unsubscribe link for one person. */
export const unsubscribeUrl = ({ email, campaignId = '', origin = SITE_URL } = {}) => {
    const params = new URLSearchParams({ type: 'unsubscribe' });
    if (email) {
        params.set('email', String(email).toLowerCase());
        const sig = unsubscribeSig(email);
        if (sig) params.set('sig', sig);
    }
    if (campaignId) params.set('cid', campaignId);
    return `${String(origin).replace(/\/+$/, '')}/api/track?${params.toString()}`;
};

// Any unsubscribe link already in the html (old composer footers, the layout's
// placeholder) is swapped for this person's signed one.
const UNSUBSCRIBE_HREF_RE = /https?:\/\/(?:www\.)?newbi\.live\/(?:unsubscribe\/?|api\/track\?type=unsubscribe[^"'\s<>]*)/gi;

export const listUnsubscribeHeaders = (url) => ({
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
});

/**
 * Personalises one campaign email: merge tags, the signed unsubscribe link,
 * click tracking (signed) and the open pixel.
 */
export const personalise = ({ html, subject, person, campaignId, origin = SITE_URL, track = true }) => {
    const unsub = unsubscribeUrl({ email: person.email, campaignId, origin });
    let body = fillMergeTags(String(html || ''), person, { html: true }).replace(UNSUBSCRIBE_HREF_RE, unsub);
    const personalSubject = fillMergeTags(String(subject || ''), person, { html: false });
    if (track) body = injectTracking({ html: body, campaignId, email: person.email, subject: personalSubject, origin });
    return { html: body, subject: personalSubject, unsubscribeUrl: unsub, headers: { ...listUnsubscribeHeaders(unsub), 'X-Campaign-Id': String(campaignId || '').slice(0, 80) } };
};

/** Click links through /api/track (signed so they redirect straight away) plus a 1×1 open pixel. */
export const injectTracking = ({ html, campaignId = '', email = '', subject = '', origin = SITE_URL }) => {
    if (!html) return html;
    const base = String(origin).replace(/\/+$/, '');
    const enc = encodeURIComponent;
    let out = html.replace(/<a\b([^>]*?)href=(["'])(.*?)\2([^>]*?)>/gi, (match, pre, q, href, post) => {
        const h = String(href || '').trim();
        if (!h || h.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(h) || h.includes('/api/track')) return match;
        const url = h.replace(/&amp;/g, '&');
        return `<a${pre}href=${q}${base}/api/track?type=click&url=${enc(url)}&tid=${enc(campaignId)}&email=${enc(email)}&cid=${enc(campaignId)}${q}${post}>`;
    });
    out = signTrackedLinks(out);
    const pixel = `<img src="${base}/api/track?type=open&tid=${enc(campaignId)}&email=${enc(email)}&cid=${enc(campaignId)}&sub=${enc(subject)}" width="1" height="1" alt="" style="display:none;max-height:0;width:0;height:0;opacity:0" border="0" />`;
    return out.includes('</body>') ? out.replace('</body>', `${pixel}</body>`) : out + pixel;
};
