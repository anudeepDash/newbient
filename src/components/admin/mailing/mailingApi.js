import { auth } from '../../../lib/firebase';
import { generateOfficialHTML } from '../../../lib/email';

/*
 * Content and server helpers for the mailing screens. The email HTML itself
 * comes from lib/email.js; this only prepares the data it is given.
 */

export const ALIASES = [
    { key: 'partnership', name: 'Newbi Partnerships', email: 'partnership@newbi.live' },
    { key: 'noreply', name: 'Newbi Notifications', email: 'noreply@newbi.live' },
    { key: 'legal', name: 'Newbi Legal', email: 'legal@newbi.live' },
    { key: 'collaborations', name: 'Newbi Collaborations', email: 'collaborations@newbi.live' },
    { key: 'custom', name: '', email: '' },
];

export const PRESET_CATEGORIES = ['OFFICIAL', 'UPDATES', 'NEWS', 'PROMO'];
export const CATEGORY_LABEL = { OFFICIAL: 'Official', UPDATES: 'Updates', NEWS: 'News', PROMO: 'Promo', CUSTOM: 'Custom' };
export const CATEGORY_TONE = { OFFICIAL: 'fuchsia', UPDATES: 'blue', NEWS: 'violet', PROMO: 'orange', NEWSLETTER: 'indigo', CREATORS: 'pink' };

export const MERGE_TAGS = [
    { tag: 'first_name', label: 'First name' },
    { tag: 'name', label: 'Full name' },
    { tag: 'email', label: 'Email' },
    { tag: 'role', label: 'Role' },
];
export const MERGE_TAG_RE = /\{\{?\s*(name|first_name|email|role)\s*\}?\}/i;

export const EMPTY_MAIL = {
    subject: '',
    preheader: '',
    headerText: '',
    messageBody: '',
    heroImage: '',
    ctaText: '',
    ctaUrl: '',
    category: 'OFFICIAL',
    customCategory: '',
    theme: 'light',
};

const ADDRESS_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
export const isValidEmailAddress = (value) => ADDRESS_RE.test(String(value || '').trim().toLowerCase());

export const effectiveCategory = (mail) => (mail.category === 'CUSTOM'
    ? (String(mail.customCategory || '').trim().toUpperCase() || 'OFFICIAL')
    : (mail.category || 'OFFICIAL'));

const escapeText = (s) => String(s || '').replace(/[<>"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export const normalizeUrl = (url) => {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (u.startsWith('/')) return u;
    return `https://${u}`;
};

/** Plain text from a deep link ("Line one\n\nLine two") → simple paragraphs. */
export const textToHtml = (text) => {
    const t = String(text || '');
    if (!t.trim() || /<\/?[a-z][\s\S]*>/i.test(t)) return t;
    return t.split(/\n{2,}/).map(p => `<p>${escapeText(p).replace(/\n/g, '<br>')}</p>`).join('');
};

/**
 * The data generateOfficialHTML expects. The hero image goes at the top of the
 * message body (lib/email.js already sizes body images for every client).
 */
export const officialData = (mail, { preview = false } = {}) => {
    const hero = String(mail.heroImage || '').trim();
    const body = mail.messageBody || '';
    return {
        headerText: escapeText(mail.headerText),
        messageBody: hero ? `<img src="${escapeText(hero)}" alt="" />${body}` : body,
        category: escapeText(effectiveCategory(mail)),
        ctaText: escapeText(mail.ctaText),
        ctaUrl: normalizeUrl(mail.ctaUrl) || '#',
        theme: mail.theme === 'dark' ? 'dark' : 'light',
        preheader: mail.preheader || '',
        isPreview: preview,
    };
};

// sendMassEmail rebuilds the email per person from the raw fields (after
// filling merge tags), so give it this rather than the generator directly.
export const renderOfficial = (data) => generateOfficialHTML(officialData(data));

export const buildOfficialHtml = (mail, opts) => generateOfficialHTML(officialData(mail, opts));

export const SAMPLE_PERSON = { name: 'Alex Rivera', firstName: 'Alex', email: 'alex@example.com', role: 'Member' };

export const samplePerson = (contact) => {
    if (!contact) return SAMPLE_PERSON;
    const name = contact.name || contact.email.split('@')[0];
    return { name, firstName: name.split(' ')[0] || name, email: contact.email, role: contact.role || 'Member' };
};

export const fillTags = (text, person = SAMPLE_PERSON) => String(text || '')
    .replace(/\{\{?\s*name\s*\}?\}/gi, person.name)
    .replace(/\{\{?\s*first_name\s*\}?\}/gi, person.firstName)
    .replace(/\{\{?\s*email\s*\}?\}/gi, person.email)
    .replace(/\{\{?\s*role\s*\}?\}/gi, person.role);

export const usesMergeTags = (mail) => ['subject', 'preheader', 'headerText', 'messageBody', 'ctaText'].some(k => MERGE_TAG_RE.test(mail[k] || ''));

export const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Images pasted into the editor are data: URLs. Gmail and Outlook block those,
 * so upload them first and swap in the hosted links.
 */
export const uploadInlineImages = async (html, upload) => {
    const source = String(html || '');
    const found = [...new Set(source.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g) || [])];
    let out = source;
    for (let i = 0; i < found.length; i++) {
        const dataUrl = found[i];
        const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
        const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
        const bytes = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
        const file = new File([bytes], `email-image-${Date.now()}-${i}.${mime.split('/')[1] || 'png'}`, { type: mime });
        const url = await upload(file);
        if (!url || String(url).startsWith('data:')) throw new Error('Image upload failed');
        out = out.split(dataUrl).join(url);
    }
    return { html: out, uploaded: found.length };
};

const callMailApi = async (body) => {
    const token = await auth.currentUser?.getIdToken?.();
    const res = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(body),
    });
    let data = {};
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok || data.success !== true) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
};

/** Everyone who unsubscribed: [{ email, unsubscribedAt, campaignId }]. */
export const fetchSuppressionList = async () => (await callMailApi({ action: 'suppression-list' })).entries || [];

/** Lets an address get campaign email again (they asked to be re-added). */
export const allowEmailAgain = (email) => callMailApi({ action: 'resubscribe', email });

/* Campaign records */

const minutesAgo = (iso) => (Date.now() - (Date.parse(iso || '') || 0)) / 60000;

export const campaignState = (c) => {
    const s = c?.status;
    if (s === 'sending') return minutesAgo(c.lastProgressAt || c.sentAt) > 15 ? 'interrupted' : 'sending';
    if (s === 'partially_failed') return 'partial';
    if (s === 'failed') return 'failed';
    if (s === 'cancelled') return 'stopped';
    return 'sent';
};

export const CAMPAIGN_STATE = {
    sent: { label: 'Sent', tone: 'green' },
    partial: { label: 'Partly sent', tone: 'amber' },
    failed: { label: 'Failed', tone: 'red' },
    stopped: { label: 'Stopped', tone: 'gray' },
    sending: { label: 'Sending', tone: 'blue' },
    interrupted: { label: 'Interrupted', tone: 'orange' },
};

export const campaignNumbers = (c) => {
    const total = Number(c?.totalRecipients || c?.sentCount || 0);
    const sent = c?.sentCount !== undefined && c?.status !== undefined ? Number(c.sentCount || 0) : total;
    const individual = c?.deliveryMode === 'individual' || (Array.isArray(c?.openedEmails) && c.openedEmails.length > 0);
    const uniqueOpens = Number(c?.uniqueOpens || (Array.isArray(c?.openedEmails) ? c.openedEmails.length : 0));
    const uniqueClicks = Number(c?.uniqueClicks || (Array.isArray(c?.clickedEmails) ? c.clickedEmails.length : 0));
    const base = sent || total;
    return {
        total,
        sent,
        failed: Number(c?.failedCount || 0),
        suppressed: Number(c?.suppressedCount || 0),
        opens: Number(c?.opensCount || 0),
        clicks: Number(c?.clicksCount || 0),
        uniqueOpens,
        uniqueClicks,
        unsubscribes: Number(c?.unsubscribesCount || 0),
        individual,
        openRate: individual && base ? Math.min(100, (uniqueOpens / base) * 100) : null,
        clickRate: individual && base ? Math.min(100, (uniqueClicks / base) * 100) : null,
    };
};

/** A campaign can be re-sent to its failed / unsent people if we can rebuild the email. */
export const canRetryCampaign = (c) => {
    const pending = [...(c?.failedEmails || []), ...(c?.unsentEmails || [])];
    if (!pending.length) return false;
    const state = campaignState(c);
    if (state === 'sending') return false;
    return Boolean(c.html || c.messageBody);
};

export const formatWhen = (value) => {
    const ms = typeof value === 'number' ? value : Date.parse(value || '');
    if (!ms) return '';
    return new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const pct = (n) => (n === null || n === undefined ? '—' : `${n.toFixed(n >= 10 || n === 0 ? 0 : 1)}%`);
