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
 *   POST ?action=outreach-send               { campaignId, appIds[] }  queue invites for the WhatsApp API (Phase 2)
 *   POST ?action=outreach-cancel             { campaignId }  stop queued invites
 *   POST ?action=outreach-queue-run          admin: a short pass; Bearer CRON_SECRET: the worker (chains itself)
 *
 * Phase 3 (api/_lib/outreachDeliver.js, api/_lib/outreachInbox.js):
 *   public  outreach-deliverables, outreach-submit, outreach-upi        (the creator's personal link)
 *   admin   outreach-review, outreach-ticket, outreach-payout, outreach-resend-link,
 *           inbox-list, inbox-thread, inbox-reply, inbox-template, inbox-state, inbox-media
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
import {
    contactIdFor, enqueueInvites, cancelQueued, runQueue, queueStatus, rateStatus, kickWorker, defaultReminderHours, enqueueJob, sendSoon,
} from './outreachQueue.js';
import { notify } from './notify.js';
import { cityGroupFor } from '../../src/lib/outreach/cityGroups.js';
import { isWhatsAppConfigured } from './whatsapp.js';
import { submitUrlFor } from './outreachQueue.js';
import {
    handleCreatorDeliverables, handleCreatorSubmit, handleCreatorUpi, handleReview, handleTicket, handlePayout, handleResendLink,
} from './outreachDeliver.js';
import {
    handleInboxList, handleInboxThread, handleInboxReply, handleInboxTemplate, handleInboxState, handleInboxMedia,
} from './outreachInbox.js';
import { ticketRuleOf, TICKET_RULES } from '../../src/lib/outreach/deliverables.js';

export const OUTREACH_ACTIONS = new Set([
    'outreach-campaign', 'outreach-apply', 'outreach-list', 'outreach-status', 'outreach-settings', 'outreach-audit',
    'outreach-send', 'outreach-cancel', 'outreach-queue-run',
    'outreach-deliverables', 'outreach-submit', 'outreach-upi',
    'outreach-review', 'outreach-ticket', 'outreach-payout', 'outreach-resend-link',
    'inbox-list', 'inbox-thread', 'inbox-reply', 'inbox-template', 'inbox-state', 'inbox-media',
]);
const PUBLIC = new Set(['outreach-campaign', 'outreach-apply', 'outreach-deliverables', 'outreach-submit', 'outreach-upi']);

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


/* A registered Newbi creator with this handle (creator profiles store it lowercase, no @). */
const findCreatorByHandle = async (db, handle) => {
    const snap = await db.collection('creators').where('instagram', '==', handle).limit(2).get();
    return snap.docs.length === 1 ? snap.docs[0].id : null;
};

/* The creator profile of the signed-in account, if they have one (doc id = uid, or older ones with a uid field). */
const findCreatorForUser = async (db, uid) => {
    const direct = await db.collection('creators').doc(uid).get();
    if (direct.exists) return direct.id;
    const byUid = await db.collection('creators').where('uid', '==', uid).limit(1).get();
    return byUid.empty ? null : byUid.docs[0].id;
};

/* The admin's city groups (Creators → Groups); the defaults when there are none. */
export const loadCityGroups = async (db) => {
    const snap = await db.collection('creator_groups').get().catch(() => null);
    return snap ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
};

export const handleApply = async (req, res, { db, token, now = nowIso() }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const body = req.body || {};
    // Honeypot: a field people never see. Bots fill it; pretend it worked.
    if (str(body.website)) return send(res, 200, { success: true });
    // Applying needs a Newbi account, so every update can reach them in the app (no one-by-one WhatsApp).
    if (!token?.uid) return send(res, 401, { success: false, code: 'sign_in', error: 'Sign in to apply. It takes a few seconds.' });

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

    const uid = token.uid;
    const creatorId = (await findCreatorForUser(db, uid).catch(() => null)) || (await findCreatorByHandle(db, value.instagramHandle).catch(() => null));
    const campRef = campDoc.ref;
    const apps = campRef.collection('applications');
    const uidKey = campRef.collection('application_keys').doc(`u:${uid}`);
    const phoneKey = campRef.collection('application_keys').doc(`p:${value.phone}`);
    const handleKey = campRef.collection('application_keys').doc(`ig:${value.instagramHandle}`);
    const contactRef = db.collection('creator_contacts').doc(contactIdFor(value.phone));
    const memberRef = db.collection('outreach_members').doc(uid);

    const result = await db.runTransaction(async (tx) => {
        const [uk, pk, hk, contactSnap] = await Promise.all([tx.get(uidKey), tx.get(phoneKey), tx.get(handleKey), tx.get(contactRef)]);
        const { targetId, conflictWith } = resolveDuplicate({
            byUid: uk.exists ? uk.data().appId : null,
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
        // The account they applied with: in-app notifications and push go to it.
        doc.uid = uid;
        doc.accountEmail = token.email || null;
        doc.phoneVerified = Boolean(token.phone_number) && token.phone_number === value.phone;
        if (conflictExists) doc.possibleDuplicateOf = conflictWith;
        tx.set(appRef, doc);

        tx.set(uidKey, { appId: appRef.id });
        tx.set(phoneKey, { appId: appRef.id });
        tx.set(memberRef, { apps: { [`${campDoc.id}_${appRef.id}`]: { campaignId: campDoc.id, appId: appRef.id, at: existing?.firstSubmittedAt || now } }, updatedAt: now }, { merge: true });
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
            uids: [...new Set([...(contact.uids || []), uid])],
            campaignIds: [...new Set([...(contact.campaignIds || []), campDoc.id])],
            whatsappConsent: { granted: true, at: now, campaignId: campDoc.id, text: CONSENT_TEXT },
            createdAt: contact.createdAt || now,
            updatedAt: now,
        });

        tx.set(campRef.collection('audit').doc(), existing
            ? { appId: appRef.id, field: 'submission', from: existing.submitCount || 1, to: doc.submitCount, source: 'public_form', actorUid: null, actorEmail: null, at: now }
            : { appId: appRef.id, field: 'status', from: null, to: 'applied', source: 'public_form', actorUid: null, actorEmail: null, at: now });

        return { appId: appRef.id, updated: Boolean(existing), prevCityGroupUrl: existing?.cityGroup?.url || null, optedOut: Boolean(contact.whatsappOptOut?.at) };
    });

    // Their city's creator community, straight away: on the success screen, in the app and as push,
    // and on WhatsApp through the API once it's set up. Nobody sends anything by hand.
    const cityGroup = cityGroupFor(await loadCityGroups(db), value.city);
    if (cityGroup && cityGroup.url !== result.prevCityGroupUrl) {
        await apps.doc(result.appId).set({ cityGroup: { ...cityGroup, sentAt: now } }, { merge: true });
        await notify('outreach-city-group', uid, {
            name: value.fullName, city: cityGroup.city, groupTitle: cityGroup.title, groupUrl: cityGroup.url, campaignTitle: campaign.title,
        }, { skip: ['email', 'whatsapp'], ref: { collection: apps.path, id: result.appId } }).catch(e => console.warn('[outreach] city group notice failed:', e.message));
        if (isWhatsAppConfigured() && !result.optedOut) {
            const id = await enqueueJob(db, { campaignId: campDoc.id, appId: result.appId, kind: 'city_group', data: { city: cityGroup.city, groupUrl: cityGroup.url }, createdBy: 'WhatsApp API' });
            await sendSoon(db, id).catch(() => null);
        }
    }

    return send(res, 200, { success: true, updated: result.updated, cityGroup });
};

/* ── Admin: list ──────────────────────────────────────────────────────── */

const privateRef = (campRef) => campRef.collection('private').doc('outreach');

const handleList = async (req, res, { db }) => {
    const campaignId = str(req.body?.campaignId, 120);
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });
    const campRef = db.collection('campaigns').doc(campaignId);
    const [appsSnap, privSnap] = await Promise.all([campRef.collection('applications').get(), privateRef(campRef).get()]);
    const campSnap = await campRef.get();
    const hasDeliverables = (campSnap.data()?.tasks || []).length > 0;
    const applications = appsSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        // Their personal "send your posts" link, for {submit_link} in the wa.me message.
        ...(hasDeliverables ? { submitUrl: submitUrlFor(campaignId, d.id) } : {}),
    })).sort((a, b) => String(b.lastSubmittedAt || '').localeCompare(String(a.lastSubmittedAt || '')));
    const priv = privSnap.exists ? privSnap.data() : {};
    const configured = isWhatsAppConfigured();
    const [queue, rate] = configured ? await Promise.all([queueStatus(db, campaignId), rateStatus(db)]) : [null, null];
    return send(res, 200, {
        success: true,
        applications,
        settings: {
            whatsappGroupLink: priv.whatsappGroupLink || '',
            messageTemplate: priv.messageTemplate || DEFAULT_TEMPLATE,
            remindersEnabled: priv.remindersEnabled !== false,
            joinReminderHours: Number(priv.joinReminderHours) || defaultReminderHours(),
            ticketRule: ticketRuleOf(priv),
            updatedAt: priv.updatedAt || null,
            updatedBy: priv.updatedBy || null,
        },
        whatsappApi: { configured, queue, rate },
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
    const remindersEnabled = body.remindersEnabled !== false;
    const ticketRule = TICKET_RULES.some(r => r.value === body.ticketRule) ? body.ticketRule : null;
    const hoursRaw = body.joinReminderHours;
    const joinReminderHours = hoursRaw === undefined || hoursRaw === null || hoursRaw === '' ? null : Number(hoursRaw);
    if (joinReminderHours !== null && (!Number.isInteger(joinReminderHours) || joinReminderHours < 1 || joinReminderHours > 336)) {
        return send(res, 400, { success: false, field: 'joinReminderHours', error: 'Remind after 1 to 336 hours (two weeks).' });
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
        tx.set(ref, {
            whatsappGroupLink,
            messageTemplate: messageTemplate.trim() || DEFAULT_TEMPLATE,
            remindersEnabled,
            joinReminderHours: joinReminderHours || defaultReminderHours(),
            ...(ticketRule ? { ticketRule } : {}),
            updatedAt: now,
            updatedBy: actorEmail,
        }, { merge: true });
        if (ticketRule && ticketRuleOf(prev) !== ticketRule) {
            tx.set(campRef.collection('audit').doc(), { appId: null, field: 'ticketRule', from: ticketRuleOf(prev), to: ticketRule, source: 'admin', actorUid, actorEmail, at: now });
        }
        if ((prev.remindersEnabled !== false) !== remindersEnabled || (joinReminderHours && Number(prev.joinReminderHours || defaultReminderHours()) !== joinReminderHours)) {
            tx.set(campRef.collection('audit').doc(), { appId: null, field: 'reminders', from: null, to: remindersEnabled ? `after ${joinReminderHours || defaultReminderHours()} h` : 'off', source: 'admin', actorUid, actorEmail, at: now });
        }
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

/* ── Admin: WhatsApp API sending (Phase 2) ─────────────────────────────── */

const isCronCall = (req) => {
    const secretKey = process.env.CRON_SECRET;
    return Boolean(secretKey) && String(req.headers?.authorization || '') === `Bearer ${secretKey}`;
};

/* Without CRON_SECRET the worker can't start itself, so the request sends a first batch before answering. */
const startWorker = async (req, db) => {
    if (await kickWorker(req, 0)) return { started: true };
    const report = await runQueue({ db, deadline: Date.now() + 20_000 });
    return { started: false, report };
};

const handleSend = async (req, res, { db, token }) => {
    if (!isWhatsAppConfigured()) return send(res, 409, { success: false, error: 'The WhatsApp API isn’t set up yet. Use Open WhatsApp instead.' });
    const campaignId = str(req.body?.campaignId, 120);
    const ids = [...new Set((Array.isArray(req.body?.appIds) ? req.body.appIds : []).map(id => str(id, 120)).filter(Boolean))];
    if (!campaignId || !ids.length) return send(res, 400, { success: false, error: 'Choose at least one person.' });
    if (ids.length > MAX_IDS_PER_CALL) return send(res, 400, { success: false, error: `Up to ${MAX_IDS_PER_CALL} at a time.` });
    const priv = await privateRef(db.collection('campaigns').doc(campaignId)).get();
    if (!priv.exists || !priv.data().whatsappGroupLink) return send(res, 409, { success: false, error: 'Add the WhatsApp group link in Message setup first.' });
    const result = await enqueueInvites(db, { campaignId, appIds: ids, actor: actorOf(token) });
    const worker = result.queued.length ? await startWorker(req, db) : { started: false };
    return send(res, 200, { success: true, ...result, worker });
};

const handleCancel = async (req, res, { db, token }) => {
    const campaignId = str(req.body?.campaignId, 120);
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });
    const result = await cancelQueued(db, { campaignId, actor: actorOf(token) });
    return send(res, 200, { success: true, ...result });
};

/* The worker (cron or a chained call) runs most of a minute and hands over; an admin tick is a short pass. */
const handleQueueRun = async (req, res, { db, cron }) => {
    if (cron) {
        const depth = Number(req.headers?.['x-outreach-chain'] || 0) || 0;
        const report = await runQueue({ db, deadline: Date.now() + 48_000 });
        const chained = report.more && !report.capped ? await kickWorker(req, depth) : false;
        return send(res, 200, { success: true, ...report, chained });
    }
    const report = await runQueue({ db, deadline: Date.now() + 8_000 });
    const campaignId = str(req.body?.campaignId, 120);
    const queue = campaignId ? await queueStatus(db, campaignId) : null;
    return send(res, 200, { success: true, ...report, queue });
};

/* ── Router ───────────────────────────────────────────────────────────── */

export const handleOutreachAction = async (action, req, res, { decodedToken, db = getDb() } = {}) => {
    try {
        if (action === 'outreach-campaign') return await handleCampaign(req, res, { db });
        if (action === 'outreach-apply') return await handleApply(req, res, { db, token: decodedToken });
        if (action === 'outreach-deliverables') return await handleCreatorDeliverables(req, res, { db });
        if (action === 'outreach-submit') return await handleCreatorSubmit(req, res, { db, rateLimit: checkRateLimit });
        if (action === 'outreach-upi') return await handleCreatorUpi(req, res, { db });
        if (PUBLIC.has(action)) return send(res, 400, { success: false, error: 'Unknown action.' });
        if (action === 'outreach-queue-run' && isCronCall(req)) return await handleQueueRun(req, res, { db, cron: true });

        if (!decodedToken) return send(res, 401, { success: false, error: 'Please sign in to continue.' });
        if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
        if (!(await isOutreachAdmin(db, decodedToken))) return send(res, 403, { success: false, error: 'Admin access required.' });
        const ctx = { db, token: decodedToken };
        if (action === 'outreach-list') return await handleList(req, res, ctx);
        if (action === 'outreach-status') return await handleStatus(req, res, ctx);
        if (action === 'outreach-settings') return await handleSettings(req, res, ctx);
        if (action === 'outreach-audit') return await handleAudit(req, res, ctx);
        if (action === 'outreach-send') return await handleSend(req, res, ctx);
        if (action === 'outreach-cancel') return await handleCancel(req, res, ctx);
        if (action === 'outreach-queue-run') return await handleQueueRun(req, res, { ...ctx, cron: false });
        const withActor = { db, actor: actorOf(decodedToken) };
        if (action === 'outreach-review') return await handleReview(req, res, withActor);
        if (action === 'outreach-ticket') return await handleTicket(req, res, withActor);
        if (action === 'outreach-payout') return await handlePayout(req, res, withActor);
        if (action === 'outreach-resend-link') return await handleResendLink(req, res, withActor);
        if (action === 'inbox-list') return await handleInboxList(req, res, withActor);
        if (action === 'inbox-thread') return await handleInboxThread(req, res, withActor);
        if (action === 'inbox-reply') return await handleInboxReply(req, res, withActor);
        if (action === 'inbox-template') return await handleInboxTemplate(req, res, withActor);
        if (action === 'inbox-state') return await handleInboxState(req, res, withActor);
        if (action === 'inbox-media') return await handleInboxMedia(req, res, withActor);
        return send(res, 400, { success: false, error: 'Unknown action.' });
    } catch (err) {
        // Never log request bodies: they carry phones and emails.
        const raw = req.body?.phone ? String(req.body.phone) : '';
        const phone = raw ? ` phone=${maskPhone(normalizePhone(raw) || raw.replace(/\D/g, ''))}` : '';
        console.error(`[outreach] ${action} failed:${phone}`, err?.message || err);
        return send(res, 500, { success: false, error: 'Something went wrong. Please try again.' });
    }
};
