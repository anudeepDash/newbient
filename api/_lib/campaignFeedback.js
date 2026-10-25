/**
 * Feedback and testimonials after a campaign. Served by api/creator-join.js
 * (the project is at Vercel's function limit); the rules shared with the app
 * are in src/lib/campaignFeedback.js.
 *
 * Who is asked: everyone who took part in the campaign, from every place the
 * campaign keeps people (see collectRecipients):
 *   campaigns/{id}/applications   the outreach form: in the group or further, or sent a post, or got a ticket
 *   creators (shortlistedCampaigns, task submissions)   the app's campaign flow
 *   campaigns/{id}/submissions    app submissions and people from an uploaded sheet
 *   passes (source campaign)      anyone sent a ticket or confirmation
 * One person is one request, matched on phone, then email, then login.
 *
 *   campaign_feedback/{campaignId}_{key}   one per person, staff only (rules deny browsers)
 *       name, phone, email, uid, instagram, reasons[], sentAt, sendCount,
 *       mail: { status: pending | sent | deferred | failed | none } (the email), delivery.whatsapp (the send queue),
 *       response: { rating, again, liked, improve, testimonial, consent }, respondedAt,
 *       publishedTestimonialId   the creator_testimonials doc on the site, while consent allows it
 *   campaigns/{id}/private/feedback        { autoSend, sendOn, autoSentAt, lastSentAt, lastSentBy }
 *
 * When: the day after the event (eventDate + 1) at 09:00 IST, from the mail
 * cron, unless the team turns auto-send off or picks a day. A day missed by
 * more than two days never fires late. The team can also send it by hand.
 * WhatsApp goes through the outreach queue (kind 'feedback', rate limit,
 * STOP opt-outs, template switch WHATSAPP_TEMPLATE_CAMPAIGN_FEEDBACK);
 * email goes straight out, in time-boxed batches.
 *
 * Public (the signed link, no sign-in):
 *   POST ?action=feedback-form     { token }                      what the form needs, and their saved answers
 *   POST ?action=feedback-submit   { token, rating, again, liked, improve, testimonial, consent }
 * Admin (founder, super_admin, developer, admin):
 *   POST ?action=feedback-list     { campaignId }                 people, requests, answers, schedule
 *   POST ?action=feedback-settings { campaignId, autoSend, sendOn }
 *   POST ?action=feedback-send     { campaignId, keys?, resend? }  ask now (everyone not asked yet, or these keys)
 *   POST ?action=feedback-run      { campaignId }                 send emails still waiting
 *   POST ?action=feedback-publish  { campaignId, id, publish, quote? }  show on / take off the /creator page
 */
import { createHash } from 'node:crypto';
import { FieldValue, getDb, nowIso, istDate } from './db.js';
import { readSignedToken } from './linkSign.js';
import { toE164, campaignImageOf } from './whatsapp.js';
import { APP_ORIGIN, WA_CARDS } from '../../src/app/seo.js';
import { normalizeEmail, isValidEmail } from './mailing.js';
import { sendTransactional } from './mail/send.js';
import { enqueueJob, kindLive, switchFor, feedbackUrlFor, runQueue, kickWorker } from './outreachQueue.js';
import { isOutreachAdmin, checkRateLimit } from './outreach.js';
import { firstNameOf, maskPhone } from '../../src/lib/outreach/normalize.js';
import { cleanAmbient } from '../../src/lib/ambientColor.js';
import { validateFeedback, canPublish, sendDayFor, addDays, REASONS } from '../../src/lib/campaignFeedback.js';

export const FEEDBACK_ACTIONS = new Set([
    'feedback-form', 'feedback-submit',
    'feedback-list', 'feedback-settings', 'feedback-send', 'feedback-run', 'feedback-publish',
]);
const PUBLIC = new Set(['feedback-form', 'feedback-submit']);

const COLLECTION = 'campaign_feedback';
const SYSTEM = { actorUid: null, actorEmail: 'Newbi app' };
// In the creators group or further along: they were told they're in.
const ON_LIST = new Set(['message_sent', 'replied', 'joined', 'posted', 'paid']);
const SENT_WORK = new Set(['submitted', 'approved', 'rejected']);
const MAX_CAMPAIGNS = 300;
// A missed send day still fires this many days late, never more.
const LATE_DAYS = 2;

const send = (res, status, body) => res.status(status).json(body);
const actorOf = (token) => ({ actorUid: token?.uid || null, actorEmail: token?.email || null });
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const sha = (v) => createHash('sha256').update(String(v)).digest('hex');
const handleOf = (v) => str(v, 60).replace(/^@+/, '');
const docIdFor = (campaignId, key) => `${campaignId}_${key}`.slice(0, 300);
// The picture on every feedback message (WhatsApp header and email), never the campaign's own.
export const FEEDBACK_CARD_URL = `${APP_ORIGIN}${WA_CARDS['wa-feedback'].path}`;

/* ── Who took part ────────────────────────────────────────────────────── */

const photoOf = (c) => c?.profilePicture || c?.instagramProfilePic || c?.profilePic || c?.photoURL || c?.avatar || '';

/** Folds people from every source into one entry each, matched on phone, email or login. */
const makeRoster = () => {
    const people = [];
    const index = new Map();
    const idsOf = (p) => [p.phone && `p:${p.phone}`, p.email && `e:${p.email}`, p.uid && `u:${p.uid}`].filter(Boolean);
    const add = (input, reason) => {
        const person = {
            name: str(input.name, 120),
            phone: toE164(input.phone) || '',
            email: isValidEmail(input.email) ? normalizeEmail(input.email) : '',
            uid: str(input.uid, 128),
            creatorId: str(input.creatorId, 128),
            appId: str(input.appId, 128),
            instagram: handleOf(input.instagram),
            city: str(input.city, 80),
            niche: str(input.niche, 80),
            avatarUrl: str(input.avatarUrl, 600),
        };
        const ids = idsOf(person);
        if (!ids.length && !person.name) return;
        let found = ids.map(id => index.get(id)).find(Boolean);
        if (!found) {
            found = { ...person, reasons: [] };
            people.push(found);
        } else {
            Object.entries(person).forEach(([k, v]) => { if (v && !found[k]) found[k] = v; });
        }
        if (reason && !found.reasons.includes(reason)) found.reasons.push(reason);
        idsOf(found).forEach(id => index.set(id, found));
    };
    return { people, add };
};

/** A person's key in campaign_feedback: their phone, else their email (hashed), else their login. */
export const keyFor = (p) => {
    if (p.phone) return `p${p.phone.replace(/\D/g, '')}`;
    if (p.email) return `e${sha(p.email).slice(0, 20)}`;
    if (p.uid) return `u${p.uid.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60)}`;
    return '';
};

const creatorInfo = (c, id) => ({
    name: c.name || c.displayName || c.fullName,
    phone: c.whatsapp || c.phone || c.phoneNumber,
    email: c.email,
    uid: c.uid || id,
    creatorId: id,
    instagram: c.instagram || c.instagramHandle,
    city: c.city,
    niche: (Array.isArray(c.specializations) && c.specializations[0]) || c.niche || c.category,
    avatarUrl: photoOf(c),
});

/**
 * Everyone who took part in a campaign. → [{ key, name, phone, email, uid, instagram, reasons[], … }]
 * Considering-only, declined and removed people aren't included; test submissions don't count.
 */
export const collectRecipients = async (db, campaignId, campaign) => {
    const roster = makeRoster();
    const campRef = db.collection('campaigns').doc(campaignId);
    const [apps, subs, shortlisted, passes] = await Promise.all([
        campRef.collection('applications').get(),
        campRef.collection('submissions').get(),
        db.collection('creators').where('shortlistedCampaigns', 'array-contains', campaignId).get(),
        db.collection('passes').where('sourceId', '==', campaignId).get(),
    ]);

    // The outreach form.
    apps.docs.forEach(d => {
        const a = d.data();
        if (a.status === 'removed') return;
        const info = { name: a.fullName, phone: a.phone, email: a.email, uid: a.uid || a.userId, appId: d.id, instagram: a.instagramHandle, city: a.city };
        if (Object.values(a.deliverables || {}).some(x => SENT_WORK.has(x?.status)) || ['posted', 'paid'].includes(a.status)) roster.add(info, 'tasks');
        if (ON_LIST.has(a.status)) roster.add(info, 'list');
        if (a.ticket?.status === 'released') roster.add(info, 'ticket');
    });

    // The app's flow: who sent work (on the campaign doc, and in the submissions subcollection).
    const workKeys = new Set();
    (campaign.tasks || []).forEach(t => {
        Object.entries(t?.submissions || {}).forEach(([k, s]) => { if (SENT_WORK.has(s?.status) && !s.test) workKeys.add(k); });
        [...(t?.completedBy || []), ...(t?.verifiedBy || [])].forEach(k => { if (k) workKeys.add(k); });
    });
    const guests = new Map();
    subs.docs.forEach(d => {
        const s = d.data();
        const sent = Object.values(s.tasks || {}).some(x => SENT_WORK.has(x?.status) && !x.test);
        if (!sent) return;
        if (s.guest) guests.set(d.id, s.guest);
        else workKeys.add(d.id);
    });
    guests.forEach((g, key) => {
        workKeys.delete(key);
        roster.add({ name: g.name, phone: g.phone, email: g.email, instagram: g.instagram }, 'tasks');
    });

    shortlisted.docs.forEach(d => {
        const c = d.data();
        roster.add(creatorInfo(c, d.id), 'list');
        creatorKeysOf(c, d.id).forEach(k => {
            if (workKeys.has(k)) { roster.add(creatorInfo(c, d.id), 'tasks'); workKeys.delete(k); }
        });
    });
    // Work from people who aren't shortlisted (the old flow let anyone who joined submit).
    for (const key of workKeys) {
        if (/^sheet-/.test(key)) continue;
        const c = await findCreator(db, key);
        if (c) roster.add(creatorInfo(c.data, c.id), 'tasks');
    }

    // Tickets and confirmations.
    passes.docs.forEach(d => {
        const p = d.data();
        if (p.source !== 'campaign' || p.status === 'revoked') return;
        roster.add({ name: p.holderName, phone: p.holderPhone, email: p.holderEmail, uid: p.holderUid, creatorId: p.creatorId }, 'ticket');
    });

    return roster.people
        .filter(p => p.reasons.length)
        .map(p => ({ ...p, key: keyFor(p) }))
        .filter(p => p.key);
};

const creatorKeysOf = (c, id) => [...new Set([c.uid, id].filter(Boolean))];

const findCreator = async (db, key) => {
    const byId = await db.collection('creators').doc(key).get();
    if (byId.exists) return { id: byId.id, data: byId.data() };
    const byUid = await db.collection('creators').where('uid', '==', key).limit(1).get();
    return byUid.docs[0] ? { id: byUid.docs[0].id, data: byUid.docs[0].data() } : null;
};

/* ── Requests ─────────────────────────────────────────────────────────── */

const loadRequests = async (db, campaignId) => {
    const snap = await db.collection(COLLECTION).where('campaignId', '==', campaignId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/** The existing request for a person (same phone, email or login), so a key change never asks twice. */
const matchRequest = (requests, p) => requests.find(r => r.key === p.key)
    || requests.find(r => (p.phone && r.phone === p.phone) || (p.email && r.email === p.email) || (p.uid && r.uid === p.uid));

const settingsRef = (db, campaignId) => db.collection('campaigns').doc(campaignId).collection('private').doc('feedback');

/**
 * Asks everyone in the campaign who hasn't been asked (or, with `keys`, just
 * those people; `resend` asks them again). WhatsApp is queued; emails go out
 * until `deadline` and the rest wait for runPendingEmails.
 * → { asked, whatsapp, whatsappOff, emailed, emailsWaiting, skipped: { reason: n } }
 */
export const askForFeedback = async (db, { campaignId, keys = null, resend = false, actor = SYSTEM, deadline = Date.now() + 30_000 }) => {
    const campSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campSnap.exists) throw Object.assign(new Error('Campaign not found.'), { status: 404 });
    const campaign = campSnap.data();
    const [people, requests] = await Promise.all([collectRecipients(db, campaignId, campaign), loadRequests(db, campaignId)]);
    const wanted = keys ? new Set(keys) : null;
    const report = { asked: 0, whatsapp: 0, whatsappOff: !kindLive('feedback'), emailed: 0, emailsWaiting: 0, skipped: {} };
    const skip = (reason) => { report.skipped[reason] = (report.skipped[reason] || 0) + 1; };
    const at = nowIso();

    for (const p of people) {
        const existing = matchRequest(requests, p);
        if (wanted && !wanted.has(p.key) && !(existing && wanted.has(existing.id))) continue;
        if (!p.phone && !p.email) { skip('no_contact'); continue; }
        if (existing?.respondedAt) { skip('answered'); continue; }
        if (existing?.sentAt && !resend) { skip('already'); continue; }
        const id = existing?.id || docIdFor(campaignId, p.key);
        const key = existing?.key || p.key;
        const sendCount = Number(existing?.sendCount || 0) + 1;
        await db.collection(COLLECTION).doc(id).set({
            campaignId,
            campaignTitle: str(campaign.title, 160),
            key,
            name: p.name, firstName: firstNameOf(p.name) || '',
            phone: p.phone, email: p.email, uid: p.uid, creatorId: p.creatorId, appId: p.appId,
            instagram: p.instagram, city: p.city, niche: p.niche, avatarUrl: p.avatarUrl,
            reasons: p.reasons,
            sentAt: at, sentBy: actor.actorEmail || null, sendCount,
            mail: { status: p.email ? 'pending' : 'none', at, error: null },
            ...(existing ? {} : { createdAt: at }),
            updatedAt: at,
        }, { merge: true });
        report.asked += 1;
        if (p.phone) {
            const jobId = await enqueueJob(db, {
                id: `feedback_${id}`.slice(0, 140), campaignId, kind: 'feedback', data: { feedbackId: id }, createdBy: actor.actorEmail || 'Newbi app', again: true,
            });
            if (jobId) report.whatsapp += 1;
            else if (report.whatsappOff) {
                await db.collection(COLLECTION).doc(id).set({ delivery: { whatsapp: { status: 'off', at, error: `Template off (${switchFor('feedback')})` } } }, { merge: true });
            }
        }
    }
    await settingsRef(db, campaignId).set({ lastSentAt: at, lastSentBy: actor.actorEmail || null }, { merge: true });
    const mail = await runPendingEmails(db, { campaignId, deadline });
    report.emailed = mail.sent;
    report.emailsWaiting = mail.waiting;
    return report;
};

/** Sends feedback emails still waiting (all campaigns, or one), until `deadline`. → { sent, failed, waiting } (waiting > 0: call again) */
export const runPendingEmails = async (db = getDb(), { campaignId = null, deadline = Date.now() + 20_000 } = {}) => {
    const snap = await db.collection(COLLECTION).where('mail.status', '==', 'pending').limit(400).get();
    const docs = snap.docs.filter(d => !campaignId || d.data().campaignId === campaignId);
    const out = { sent: 0, failed: 0, waiting: 0 };
    const campaigns = new Map();
    for (const d of docs) {
        if (Date.now() > deadline) { out.waiting += 1; continue; }
        const f = d.data();
        if (f.respondedAt) {
            await d.ref.set({ mail: { status: 'skipped', at: nowIso(), error: 'Answered first' } }, { merge: true });
            continue;
        }
        if (!campaigns.has(f.campaignId)) campaigns.set(f.campaignId, (await db.collection('campaigns').doc(f.campaignId).get()).data() || {});
        const campaign = campaigns.get(f.campaignId);
        const formUrl = feedbackUrlFor(f.campaignId, f.key);
        if (!formUrl) {
            await d.ref.set({ mail: { status: 'failed', at: nowIso(), error: 'LINK_SIGNING_SECRET isn’t set' } }, { merge: true });
            out.failed += 1;
            continue;
        }
        const r = await sendTransactional('campaign-feedback', f.email, {
            name: f.name, campaignTitle: campaign.title, eventName: campaign.eventName, image: FEEDBACK_CARD_URL, formUrl,
        }, { idempotencyKey: `feedback_${d.id}_${f.sendCount || 1}`, uid: f.uid || null, ref: { collection: COLLECTION, id: d.id } });
        // 'deferred' (Gmail's daily cap) is retried by the mail worker on its own.
        const status = r.ok ? 'sent' : r.status === 'deferred' ? 'deferred' : r.status === 'suppressed' ? 'unsubscribed' : 'failed';
        await d.ref.set({ mail: { status, at: nowIso(), error: r.ok ? null : str(r.error, 200) || null } }, { merge: true });
        if (r.ok || status === 'deferred') out.sent += 1; else out.failed += 1;
    }
    // A full page may hide more behind it.
    if (snap.size === 400 && !out.waiting) out.waiting = 1;
    return out;
};

/**
 * The mail cron (09:00 IST): asks every campaign whose send day is today (or
 * up to LATE_DAYS ago, if a run was missed) and not asked yet, then sends
 * emails still waiting. → { campaigns, asked, emailed, waiting }
 */
export const runCampaignFeedback = async ({ db = getDb(), now = Date.now(), deadline = Date.now() + 20_000 } = {}) => {
    const today = istDate(new Date(now));
    const earliest = addDays(today, -LATE_DAYS);
    const report = { campaigns: 0, asked: 0, emailed: 0, waiting: 0 };
    const camps = await db.collection('campaigns').limit(MAX_CAMPAIGNS).get();
    for (const doc of camps.docs) {
        if (Date.now() > deadline) break;
        const campaign = doc.data();
        if (String(campaign.status || '').toLowerCase() === 'draft') continue;
        // Cheap check first: without a custom day, only campaigns whose event was in the window.
        const byEvent = sendDayFor(campaign);
        const settingsSnap = await settingsRef(db, doc.id).get();
        const settings = settingsSnap.exists ? settingsSnap.data() : {};
        if (!settingsSnap.exists && !(byEvent && byEvent >= earliest && byEvent <= today)) continue;
        if (settings.autoSend === false || settings.autoSentAt) continue;
        const day = sendDayFor(campaign, settings);
        if (!day || day > today || day < earliest) continue;
        try {
            const r = await askForFeedback(db, { campaignId: doc.id, deadline });
            await settingsRef(db, doc.id).set({ autoSentAt: nowIso(), autoSentCount: r.asked }, { merge: true });
            report.campaigns += 1;
            report.asked += r.asked;
            report.emailed += r.emailed;
        } catch (e) {
            console.error(`[feedback] ${doc.id} failed:`, e.message);
        }
    }
    const rest = await runPendingEmails(db, { deadline });
    report.emailed += rest.sent;
    report.waiting = rest.waiting;
    return report;
};

/* ── Publishing on the /creator page ──────────────────────────────────── */

/** Shows (or updates) their testimonial on the site, as their consent allows. → the creator_testimonials id */
const publishTestimonial = async (db, f, quote, feedbackId) => {
    const consent = f.response?.consent;
    const full = consent === 'full';
    const payload = {
        name: full ? (f.name || f.firstName) : (f.firstName || firstNameOf(f.name) || 'A Newbi creator'),
        city: f.city || '',
        niche: f.niche || '',
        handle: full ? f.instagram || '' : '',
        avatarUrl: full ? f.avatarUrl || '' : '',
        quote: str(quote || f.response?.testimonial, 400),
        rating: Number(f.response?.rating) || 5,
        source: { kind: 'campaign_feedback', campaignId: f.campaignId, feedbackId, campaignTitle: f.campaignTitle || '' },
        updatedAt: nowIso(),
    };
    if (f.publishedTestimonialId) {
        const ref = db.collection('creator_testimonials').doc(f.publishedTestimonialId);
        if ((await ref.get()).exists) {
            await ref.set(payload, { merge: true });
            return ref.id;
        }
    }
    const count = (await db.collection('creator_testimonials').get()).size;
    const ref = db.collection('creator_testimonials').doc();
    await ref.set({ ...payload, isActive: true, order: count, createdAt: nowIso() });
    return ref.id;
};

const unpublishTestimonial = async (db, f) => {
    if (!f.publishedTestimonialId) return;
    await db.collection('creator_testimonials').doc(f.publishedTestimonialId).delete().catch(() => {});
};

/* ── Public: the form ─────────────────────────────────────────────────── */

const readToken = async (db, token) => {
    const t = readSignedToken(token);
    if (!t || t.k !== 'fb' || !t.c || !t.r) return null;
    const ref = db.collection(COLLECTION).doc(docIdFor(t.c, t.r));
    const snap = await ref.get();
    if (!snap.exists) {
        // An older key for the same person (their key changed after a resend): look it up.
        const alt = await db.collection(COLLECTION).where('campaignId', '==', t.c).where('key', '==', t.r).limit(1).get();
        if (!alt.docs[0]) return null;
        return { ref: alt.docs[0].ref, f: alt.docs[0].data(), campaignId: t.c };
    }
    return { ref, f: snap.data(), campaignId: t.c };
};

const publicCampaign = (c = {}) => ({
    title: c.title || '',
    brand: c.brand || c.brandName || '',
    eventName: c.eventName || '',
    eventDate: c.eventDate || '',
    image: campaignImageOf(c) || '',
    ambientColor: cleanAmbient(c.ambientColor),
});

const handleForm = async (req, res, { db }) => {
    const found = await readToken(db, req.body?.token);
    if (!found) return send(res, 404, { success: false, error: 'This link has expired. Ask the Newbi team on WhatsApp for a new one.' });
    const { ref, f, campaignId } = found;
    const camp = await db.collection('campaigns').doc(campaignId).get();
    if (!f.openedAt) await ref.set({ openedAt: nowIso() }, { merge: true }).catch(() => {});
    return send(res, 200, {
        success: true,
        campaign: publicCampaign(camp.data()),
        firstName: f.firstName || firstNameOf(f.name) || '',
        response: f.response || null,
        respondedAt: f.respondedAt || null,
        published: Boolean(f.publishedTestimonialId),
    });
};

const handleSubmit = async (req, res, { db }) => {
    const limited = await checkRateLimit(db, req, { bucket: 'feedback' });
    if (limited.limited) return send(res, 429, { success: false, error: 'Too many tries. Please wait a few minutes.' });
    const found = await readToken(db, req.body?.token);
    if (!found) return send(res, 404, { success: false, error: 'This link has expired. Ask the Newbi team on WhatsApp for a new one.' });
    const check = validateFeedback(req.body || {});
    if (!check.ok) return send(res, 400, { success: false, error: Object.values(check.errors)[0], errors: check.errors });
    const { ref, f } = found;
    const at = nowIso();
    let published = false;
    const next = { ...f, response: check.value };
    const patch = { response: check.value, respondedAt: f.respondedAt || at, updatedAt: at, answerCount: FieldValue.increment(1) };
    if (f.respondedAt) patch.editedAt = at;
    // Their words, their call: no consent (or no quote) takes a published one down; edits update it.
    if (f.publishedTestimonialId) {
        if (canPublish(check.value.consent) && check.value.testimonial) {
            await publishTestimonial(db, next, check.value.testimonial, ref.id);
            published = true;
        } else {
            await unpublishTestimonial(db, f);
            patch.publishedTestimonialId = null;
            patch.unpublishedAt = at;
            patch.unpublishedBy = 'creator';
        }
    }
    await ref.set(patch, { merge: true });
    return send(res, 200, { success: true, published });
};

/* ── Admin ────────────────────────────────────────────────────────────── */

const campaignIdOf = (req) => str(req.body?.campaignId, 128);

const handleList = async (req, res, { db }) => {
    const campaignId = campaignIdOf(req);
    const campSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campaignId || !campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const campaign = campSnap.data();
    const [people, requests, settingsSnap] = await Promise.all([
        collectRecipients(db, campaignId, campaign), loadRequests(db, campaignId), settingsRef(db, campaignId).get(),
    ]);
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const used = new Set();
    const rows = people.map(p => {
        const r = matchRequest(requests, p);
        if (r) used.add(r.id);
        return rowOf(p, r);
    });
    // Asked earlier but no longer on the list (removed since): keep their answers visible.
    requests.filter(r => !used.has(r.id)).forEach(r => rows.push(rowOf({ ...r, reasons: r.reasons || [] }, r)));
    return send(res, 200, {
        success: true,
        people: rows,
        settings: { autoSend: settings.autoSend !== false, sendOn: settings.sendOn || '', autoSentAt: settings.autoSentAt || null, lastSentAt: settings.lastSentAt || null },
        sendDay: sendDayFor(campaign, settings),
        eventDate: campaign.eventDate || '',
        whatsappLive: kindLive('feedback'),
        whatsappSwitch: switchFor('feedback'),
        reasons: REASONS,
    });
};

const rowOf = (p, r) => ({
    key: r?.key || p.key,
    id: r?.id || null,
    name: p.name || r?.name || '',
    phone: p.phone || r?.phone || '',
    email: p.email || r?.email || '',
    instagram: p.instagram || r?.instagram || '',
    city: p.city || r?.city || '',
    avatarUrl: p.avatarUrl || r?.avatarUrl || '',
    reasons: p.reasons || [],
    status: r?.respondedAt ? 'responded' : r?.sentAt ? 'sent' : 'not_sent',
    sentAt: r?.sentAt || null,
    sendCount: r?.sendCount || 0,
    openedAt: r?.openedAt || null,
    whatsapp: r?.delivery?.whatsapp || null,
    emailStatus: r?.mail || null,
    response: r?.response || null,
    respondedAt: r?.respondedAt || null,
    publishedTestimonialId: r?.publishedTestimonialId || null,
});

const handleSettings = async (req, res, { db, actor }) => {
    const campaignId = campaignIdOf(req);
    if (!campaignId || !(await db.collection('campaigns').doc(campaignId).get()).exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const sendOn = str(req.body?.sendOn, 10);
    if (sendOn && !/^\d{4}-\d{2}-\d{2}$/.test(sendOn)) return send(res, 400, { success: false, error: 'Pick a valid day.' });
    const patch = { autoSend: req.body?.autoSend !== false, sendOn, updatedAt: nowIso(), updatedBy: actor.actorEmail };
    // Moving the day to the future re-arms an auto-send that already happened.
    if (sendOn && sendOn > istDate()) patch.autoSentAt = null;
    await settingsRef(db, campaignId).set(patch, { merge: true });
    return send(res, 200, { success: true });
};

const startWhatsApp = async (req, db, report) => {
    if (!report.whatsapp) return;
    if (!(await kickWorker(req, 0).catch(() => false))) await runQueue({ db, deadline: Date.now() + 10_000 }).catch(() => null);
};

const handleSend = async (req, res, { db, actor }) => {
    const campaignId = campaignIdOf(req);
    const keys = Array.isArray(req.body?.keys) ? req.body.keys.map(k => str(k, 300)).filter(Boolean).slice(0, 2000) : null;
    const report = await askForFeedback(db, { campaignId, keys, resend: Boolean(req.body?.resend), actor, deadline: Date.now() + 35_000 });
    await startWhatsApp(req, db, report);
    return send(res, 200, { success: true, report });
};

const handleRun = async (req, res, { db }) => {
    const out = await runPendingEmails(db, { campaignId: campaignIdOf(req), deadline: Date.now() + 40_000 });
    return send(res, 200, { success: true, ...out });
};

const handlePublish = async (req, res, { db, actor }) => {
    const id = str(req.body?.id, 300);
    const ref = db.collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!id || !snap.exists || snap.data().campaignId !== campaignIdOf(req)) return send(res, 404, { success: false, error: 'Response not found.' });
    const f = snap.data();
    const at = nowIso();
    if (req.body?.publish === false) {
        await unpublishTestimonial(db, f);
        await ref.set({ publishedTestimonialId: null, unpublishedAt: at, unpublishedBy: actor.actorEmail }, { merge: true });
        return send(res, 200, { success: true, published: false });
    }
    if (!canPublish(f.response?.consent)) return send(res, 409, { success: false, error: 'They didn’t agree to publish it.' });
    const quote = str(req.body?.quote ?? f.response?.testimonial, 400);
    if (quote.length < 15) return send(res, 400, { success: false, error: 'The quote is too short to publish.' });
    const testimonialId = await publishTestimonial(db, f, quote, id);
    await ref.set({ publishedTestimonialId: testimonialId, publishedAt: at, publishedBy: actor.actorEmail, publishedQuote: quote }, { merge: true });
    return send(res, 200, { success: true, published: true, testimonialId });
};

export const handleFeedbackAction = async (action, req, res, { decodedToken, db = getDb() } = {}) => {
    try {
        if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
        if (action === 'feedback-form') return await handleForm(req, res, { db });
        if (action === 'feedback-submit') return await handleSubmit(req, res, { db });
        if (PUBLIC.has(action)) return send(res, 400, { success: false, error: 'Unknown action.' });
        if (!decodedToken) return send(res, 401, { success: false, error: 'Please sign in to continue.' });
        if (!(await isOutreachAdmin(db, decodedToken))) return send(res, 403, { success: false, error: 'Admin access required.' });
        const ctx = { db, actor: actorOf(decodedToken) };
        if (action === 'feedback-list') return await handleList(req, res, ctx);
        if (action === 'feedback-settings') return await handleSettings(req, res, ctx);
        if (action === 'feedback-send') return await handleSend(req, res, ctx);
        if (action === 'feedback-run') return await handleRun(req, res, ctx);
        if (action === 'feedback-publish') return await handlePublish(req, res, ctx);
        return send(res, 400, { success: false, error: 'Unknown action.' });
    } catch (err) {
        // Never log request bodies: they carry names and quotes.
        console.error(`[feedback] ${action} failed:`, err?.message || err, req.body?.phone ? maskPhone(String(req.body.phone)) : '');
        return send(res, err?.status || 500, { success: false, error: err?.status === 404 ? err.message : 'Something went wrong. Please try again.' });
    }
};
