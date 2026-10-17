/**
 * Creator campaign outreach (Phase 1): the public application form and the
 * admin shortlist. Served by api/creator-join.js, because the project is at
 * Vercel's function limit.
 *
 * Public (no sign-in):
 *   GET  ?action=outreach-campaign&slug=…    what the form needs (no group link, no contacts)
 *   POST ?action=outreach-apply              { slug, ...fields }  rate-limited per IP
 *
 * Admin only (founder, super_admin, developer, admin):
 *   POST ?action=outreach-list               { campaignId }  applications + private settings
 *   POST ?action=outreach-status             { campaignId, appIds[], to, source?, note?, messageText? }
 *   POST ?action=outreach-settings           { campaignId, whatsappGroupLink, messageTemplate }
 *   POST ?action=outreach-audit              { campaignId, appId? }
 *
 * Data (see docs/campaign-outreach.md):
 *   campaigns/{id}                              public campaign fields (slug, artist, cities, dates, perks…)
 *   campaigns/{id}/private/outreach             whatsappGroupLink, messageTemplate (admin only)
 *   campaigns/{id}/applications/{appId}         one per person, admin only
 *   campaigns/{id}/application_keys/{p:+91…|ig:handle} → { appId }   duplicate detection
 *   campaigns/{id}/audit/{autoId}               every status change, written with the change
 *   creator_contacts/{p_<hash>}                 lightweight creator record, one per phone
 *   rate_limits/{hash}                          per-IP counters for the public form
 *
 * Browsers never read or write these collections directly: every read goes
 * through here, so personal fields reach admins only. Phones are masked in logs.
 */
import { createHash } from 'node:crypto';
import { getDb, nowIso } from './db.js';
import {
    validateApplication, mergeApplication, resolveDuplicate, applicationsOpen, campaignCities, CONSENT_TEXT,
} from '../../src/lib/outreach/application.js';
import { canTransition, isStatus } from '../../src/lib/outreach/status.js';
import { maskPhone, normalizePhone } from '../../src/lib/outreach/normalize.js';
import { unknownPlaceholders, DEFAULT_TEMPLATE } from '../../src/lib/outreach/template.js';

export const OUTREACH_ACTIONS = new Set([
    'outreach-campaign', 'outreach-apply', 'outreach-list', 'outreach-status', 'outreach-settings', 'outreach-audit',
]);
const PUBLIC = new Set(['outreach-campaign', 'outreach-apply']);

/* Personal data is for these roles only (narrower than the creator admin roles on purpose). */
export const OUTREACH_ROLES = ['founder', 'super_admin', 'developer', 'admin'];

const MAX_IDS_PER_CALL = 200;
const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');

/* ── Who's asking ─────────────────────────────────────────────────────── */

export const isOutreachAdmin = async (db, token) => {
    if (!token?.uid) return false;
    try {
        const email = String(token.email || '').trim();
        if (email && token.email_verified) {
            const emails = [...new Set([email, email.toLowerCase()])];
            const snap = await db.collection('admins').where('email', 'in', emails).limit(5).get();
            if (snap.docs.some(d => OUTREACH_ROLES.includes(d.data()?.role))) return true;
        }
        const user = await db.collection('users').doc(token.uid).get();
        return Boolean(user.exists && OUTREACH_ROLES.includes(user.data()?.role));
    } catch (e) {
        console.warn('[outreach] admin check failed:', e.message);
        return false;
    }
};

const actorOf = (token) => ({ actorUid: token?.uid || null, actorEmail: token?.email || null });

/* ── Rate limit (public form) ─────────────────────────────────────────── */

const clientIp = (req) => String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();

/*
 * A Firestore counter per IP, so the limit holds across serverless instances.
 * Generous on purpose: a whole college can share one IP. Raw IPs are never stored.
 */
export const checkRateLimit = async (db, req, { bucket = 'outreach-apply', now = Date.now() } = {}) => {
    const max = Number(process.env.OUTREACH_APPLY_LIMIT) || 20;
    const windowMs = (Number(process.env.OUTREACH_APPLY_WINDOW_MIN) || 10) * 60_000;
    const key = sha(`${process.env.LINK_SIGNING_SECRET || 'newbi'}:${bucket}:${clientIp(req)}`).slice(0, 40);
    const ref = db.collection('rate_limits').doc(key);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const rec = snap.exists ? snap.data() : null;
        const fresh = !rec || now - Number(rec.windowStart || 0) > windowMs;
        const count = fresh ? 1 : Number(rec.count || 0) + 1;
        if (!fresh && count > max) return { limited: true };
        tx.set(ref, {
            bucket,
            count,
            windowStart: fresh ? now : rec.windowStart,
            // A Firestore TTL policy on expiresAt clears these (see docs/campaign-outreach.md).
            expiresAt: new Date(now + windowMs * 2),
        });
        return { limited: false };
    });
};

/* ── Campaign lookup ──────────────────────────────────────────────────── */

const findCampaign = async (db, slugOrId) => {
    const key = str(slugOrId, 120).toLowerCase();
    if (!key) return null;
    const bySlug = await db.collection('campaigns').where('slug', '==', key).limit(2).get();
    if (bySlug.docs.length === 1) return bySlug.docs[0];
    if (bySlug.docs.length > 1) {
        console.error(`[outreach] two campaigns share the slug "${key}"`);
        return null;
    }
    // Campaigns without a slug still work by id.
    const byId = await db.collection('campaigns').doc(str(slugOrId, 120)).get();
    return byId.exists ? byId : null;
};

/* What the public form may show. No group link, no template, no counts of people. */
export const publicCampaign = (id, c) => ({
    id,
    slug: c.slug || id,
    title: c.title || '',
    brand: c.brand || '',
    artist: c.artist || '',
    cities: campaignCities(c),
    eventDate: c.eventDate || '',
    applicationDeadline: c.applicationDeadline || '',
    postingDeadline: c.postingDeadline || '',
    deliverablesText: c.deliverablesText || '',
    perksByTier: c.perksByTier || null,
    image: c.image || c.coverImage || c.bannerImage || '',
    status: c.status || '',
});

const handleCampaign = async (req, res, { db }) => {
    const doc = await findCampaign(db, req.query?.slug || req.body?.slug);
    const c = doc?.data();
    if (!doc || !c?.publicApplyEnabled || String(c.status || '').toLowerCase() === 'draft') {
        return send(res, 404, { success: false, error: 'This campaign isn’t taking applications here.' });
    }
    const { open, reason } = applicationsOpen(c);
    return send(res, 200, { success: true, campaign: publicCampaign(doc.id, c), open, reason });
};

/* ── Public apply ─────────────────────────────────────────────────────── */

const contactIdFor = (phone) => `p_${sha(phone).slice(0, 24)}`;

/* A registered Newbi creator with this handle (creator profiles store it lowercase, no @). */
const findCreatorByHandle = async (db, handle) => {
    const snap = await db.collection('creators').where('instagram', '==', handle).limit(2).get();
    return snap.docs.length === 1 ? snap.docs[0].id : null;
};

export const handleApply = async (req, res, { db, now = nowIso() }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const body = req.body || {};
    // Honeypot: a field people never see. Bots fill it; pretend it worked.
    if (str(body.website)) return send(res, 200, { success: true });

    const campDoc = await findCampaign(db, body.slug);
    const campaign = campDoc?.data();
    if (!campDoc || !campaign?.publicApplyEnabled) return send(res, 404, { success: false, error: 'This campaign isn’t taking applications here.' });
    const { open, reason } = applicationsOpen(campaign);
    if (!open) {
        const error = reason === 'deadline' ? 'Applications for this campaign have closed.' : 'This campaign isn’t taking applications right now.';
        return send(res, 409, { success: false, code: reason, error });
    }

    const { ok, value, errors } = validateApplication(body, campaign);
    if (!ok) return send(res, 400, { success: false, code: 'invalid', errors, error: 'Check the highlighted fields.' });

    const { limited } = await checkRateLimit(db, req);
    if (limited) return send(res, 429, { success: false, code: 'rate_limited', error: 'Too many applications from this network. Try again in a few minutes.' });

    const creatorId = await findCreatorByHandle(db, value.instagramHandle).catch(() => null);
    const campRef = campDoc.ref;
    const apps = campRef.collection('applications');
    const phoneKey = campRef.collection('application_keys').doc(`p:${value.phone}`);
    const handleKey = campRef.collection('application_keys').doc(`ig:${value.instagramHandle}`);
    const contactRef = db.collection('creator_contacts').doc(contactIdFor(value.phone));

    const result = await db.runTransaction(async (tx) => {
        const [pk, hk, contactSnap] = await Promise.all([tx.get(phoneKey), tx.get(handleKey), tx.get(contactRef)]);
        const { targetId, conflictWith } = resolveDuplicate({
            byPhone: pk.exists ? pk.data().appId : null,
            byHandle: hk.exists ? hk.data().appId : null,
        });
        const appRef = targetId ? apps.doc(targetId) : apps.doc();
        const [existingSnap, otherSnap] = await Promise.all([
            targetId ? tx.get(appRef) : null,
            conflictWith ? tx.get(apps.doc(conflictWith)) : null,
        ]);
        const existing = existingSnap?.exists ? existingSnap.data() : null;
        const conflictExists = Boolean(otherSnap?.exists);

        const doc = mergeApplication(existing, value, { now, consentText: CONSENT_TEXT });
        doc.campaignId = campDoc.id;
        doc.contactId = contactRef.id;
        doc.creatorId = creatorId || existing?.creatorId || null;
        if (conflictExists) doc.possibleDuplicateOf = conflictWith;
        tx.set(appRef, doc);

        tx.set(phoneKey, { appId: appRef.id });
        // A handle already used by someone else's application keeps pointing there; both are flagged.
        if (conflictExists) tx.update(apps.doc(conflictWith), { possibleDuplicateOf: appRef.id, updatedAt: now });
        else tx.set(handleKey, { appId: appRef.id });

        const contact = contactSnap.exists ? contactSnap.data() : {};
        tx.set(contactRef, {
            phone: value.phone,
            email: value.email,
            fullName: value.fullName,
            instagramHandle: value.instagramHandle,
            followerCount: value.followerCount,
            city: value.city,
            collegeOrEmployer: value.collegeOrEmployer,
            category: value.category,
            creatorId: doc.creatorId || contact.creatorId || null,
            campaignIds: [...new Set([...(contact.campaignIds || []), campDoc.id])],
            whatsappConsent: { granted: true, at: now, campaignId: campDoc.id, text: CONSENT_TEXT },
            createdAt: contact.createdAt || now,
            updatedAt: now,
        });

        tx.set(campRef.collection('audit').doc(), existing
            ? { appId: appRef.id, field: 'submission', from: existing.submitCount || 1, to: doc.submitCount, source: 'public_form', actorUid: null, actorEmail: null, at: now }
            : { appId: appRef.id, field: 'status', from: null, to: 'applied', source: 'public_form', actorUid: null, actorEmail: null, at: now });

        return { appId: appRef.id, updated: Boolean(existing) };
    });

    return send(res, 200, { success: true, updated: result.updated });
};

/* ── Admin: list ──────────────────────────────────────────────────────── */

const privateRef = (campRef) => campRef.collection('private').doc('outreach');

const handleList = async (req, res, { db }) => {
    const campaignId = str(req.body?.campaignId, 120);
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });
    const campRef = db.collection('campaigns').doc(campaignId);
    const [appsSnap, privSnap] = await Promise.all([campRef.collection('applications').get(), privateRef(campRef).get()]);
    const applications = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(b.lastSubmittedAt || '').localeCompare(String(a.lastSubmittedAt || '')));
    const priv = privSnap.exists ? privSnap.data() : {};
    return send(res, 200, {
        success: true,
        applications,
        settings: {
            whatsappGroupLink: priv.whatsappGroupLink || '',
            messageTemplate: priv.messageTemplate || DEFAULT_TEMPLATE,
            updatedAt: priv.updatedAt || null,
            updatedBy: priv.updatedBy || null,
        },
    });
};

/* ── Admin: status changes ────────────────────────────────────────────── */

const STAMPS = {
    shortlisted: 'shortlisted',
    message_queued: 'messageQueued',
    message_sent: 'messageSent',
    replied: 'replied',
    joined: 'joined',
    posted: 'posted',
    paid: 'paid',
    removed: 'removed',
};

export const handleStatus = async (req, res, { db, token, now = nowIso() }) => {
    const body = req.body || {};
    const campaignId = str(body.campaignId, 120);
    const to = str(body.to, 40);
    const ids = [...new Set((Array.isArray(body.appIds) ? body.appIds : []).map(id => str(id, 120)).filter(Boolean))];
    const source = body.source === 'bulk_paste' ? 'bulk_paste' : 'admin';
    const note = str(body.note, 500) || null;
    const messageText = str(body.messageText, 4000) || null;
    if (!campaignId || !ids.length) return send(res, 400, { success: false, error: 'Choose at least one applicant.' });
    if (ids.length > MAX_IDS_PER_CALL) return send(res, 400, { success: false, error: `Up to ${MAX_IDS_PER_CALL} at a time.` });
    if (!isStatus(to) || to === 'applied') return send(res, 400, { success: false, error: 'Unknown status.' });

    const campRef = db.collection('campaigns').doc(campaignId);
    const { actorUid, actorEmail } = actorOf(token);
    const result = await db.runTransaction(async (tx) => {
        const refs = ids.map(id => campRef.collection('applications').doc(id));
        const snaps = await Promise.all(refs.map(r => tx.get(r)));
        const updated = [];
        const skipped = [];
        snaps.forEach((snap, i) => {
            if (!snap.exists) { skipped.push({ id: ids[i], reason: 'not_found' }); return; }
            const from = snap.data().status || 'applied';
            if (from === to) { skipped.push({ id: ids[i], from, reason: 'already' }); return; }
            if (!canTransition(from, to)) { skipped.push({ id: ids[i], from, reason: 'not_allowed' }); return; }
            const stamp = STAMPS[to];
            const patch = { status: to, statusUpdatedAt: now, statusUpdatedBy: actorEmail, updatedAt: now, [`${stamp}At`]: now, [`${stamp}By`]: actorEmail };
            if (to === 'message_sent' && messageText) patch.lastMessageText = messageText;
            if (to === 'removed') patch.removedReason = note;
            tx.update(refs[i], patch);
            tx.set(campRef.collection('audit').doc(), {
                appId: ids[i], field: 'status', from, to, source, note, actorUid, actorEmail, at: now,
            });
            updated.push({ id: ids[i], from, to });
        });
        return { updated, skipped };
    });
    return send(res, 200, { success: true, ...result });
};

/* ── Admin: group link and message template ───────────────────────────── */

export const GROUP_LINK = /^https:\/\/chat\.whatsapp\.com\/(?:invite\/)?[A-Za-z0-9]{10,40}\/?$/;

const handleSettings = async (req, res, { db, token, now = nowIso() }) => {
    const body = req.body || {};
    const campaignId = str(body.campaignId, 120);
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });
    const whatsappGroupLink = str(body.whatsappGroupLink, 200);
    const messageTemplate = String(body.messageTemplate ?? '').slice(0, 4000);
    if (whatsappGroupLink && !GROUP_LINK.test(whatsappGroupLink)) {
        return send(res, 400, { success: false, field: 'whatsappGroupLink', error: 'Paste a WhatsApp group invite link (https://chat.whatsapp.com/…).' });
    }
    const unknown = unknownPlaceholders(messageTemplate);
    if (unknown.length) {
        return send(res, 400, { success: false, field: 'messageTemplate', error: `Unknown placeholder${unknown.length > 1 ? 's' : ''}: ${unknown.map(u => `{${u}}`).join(', ')}` });
    }
    const campRef = db.collection('campaigns').doc(campaignId);
    const camp = await campRef.get();
    if (!camp.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const { actorUid, actorEmail } = actorOf(token);
    const ref = privateRef(campRef);
    await db.runTransaction(async (tx) => {
        const before = await tx.get(ref);
        const prev = before.exists ? before.data() : {};
        tx.set(ref, { whatsappGroupLink, messageTemplate: messageTemplate.trim() || DEFAULT_TEMPLATE, updatedAt: now, updatedBy: actorEmail }, { merge: true });
        if ((prev.whatsappGroupLink || '') !== whatsappGroupLink) {
            tx.set(campRef.collection('audit').doc(), { appId: null, field: 'whatsappGroupLink', from: prev.whatsappGroupLink || null, to: whatsappGroupLink || null, source: 'admin', actorUid, actorEmail, at: now });
        }
        if ((prev.messageTemplate || '') !== messageTemplate.trim()) {
            tx.set(campRef.collection('audit').doc(), { appId: null, field: 'messageTemplate', from: null, to: null, source: 'admin', actorUid, actorEmail, at: now });
        }
    });
    return send(res, 200, { success: true });
};

/* ── Admin: audit log ─────────────────────────────────────────────────── */

const handleAudit = async (req, res, { db }) => {
    const campaignId = str(req.body?.campaignId, 120);
    const appId = str(req.body?.appId, 120);
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });
    let q = db.collection('campaigns').doc(campaignId).collection('audit');
    q = appId ? q.where('appId', '==', appId) : q.orderBy('at', 'desc').limit(300);
    const snap = await q.get();
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return send(res, 200, { success: true, entries });
};

/* ── Router ───────────────────────────────────────────────────────────── */

export const handleOutreachAction = async (action, req, res, { decodedToken, db = getDb() } = {}) => {
    try {
        if (action === 'outreach-campaign') return await handleCampaign(req, res, { db });
        if (action === 'outreach-apply') return await handleApply(req, res, { db });
        if (PUBLIC.has(action)) return send(res, 400, { success: false, error: 'Unknown action.' });

        if (!decodedToken) return send(res, 401, { success: false, error: 'Please sign in to continue.' });
        if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
        if (!(await isOutreachAdmin(db, decodedToken))) return send(res, 403, { success: false, error: 'Admin access required.' });
        const ctx = { db, token: decodedToken };
        if (action === 'outreach-list') return await handleList(req, res, ctx);
        if (action === 'outreach-status') return await handleStatus(req, res, ctx);
        if (action === 'outreach-settings') return await handleSettings(req, res, ctx);
        if (action === 'outreach-audit') return await handleAudit(req, res, ctx);
        return send(res, 400, { success: false, error: 'Unknown action.' });
    } catch (err) {
        // Never log request bodies: they carry phones and emails.
        const raw = req.body?.phone ? String(req.body.phone) : '';
        const phone = raw ? ` phone=${maskPhone(normalizePhone(raw) || raw.replace(/\D/g, ''))}` : '';
        console.error(`[outreach] ${action} failed:${phone}`, err?.message || err);
        return send(res, 500, { success: false, error: 'Something went wrong. Please try again.' });
    }
};
