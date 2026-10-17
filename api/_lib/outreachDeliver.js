/**
 * Campaign outreach, Phase 3: deliverables, tickets and payouts.
 *
 * Creators (no sign-in, their personal signed link app.newbi.live/d/<token>):
 *   POST ?action=outreach-deliverables   { token }                                 what to post, what they've sent
 *   POST ?action=outreach-submit         { token, taskId, link, screenshotUrl, note }   rate-limited per IP
 *   POST ?action=outreach-upi            { token, upiId, upiName }                  where to pay them
 *
 * Admins (outreach roles, checked by the router):
 *   POST ?action=outreach-review         { campaignId, appId, taskId, decision: 'approve'|'reject', reason }
 *   POST ?action=outreach-ticket         { campaignId, appIds[], action: 'release'|'revoke', reason? }
 *   POST ?action=outreach-payout         { campaignId, appId, action: 'paid'|'cancel', amount, method, paidAt, reference, accountType, note, override?, overrideReason? }
 *   POST ?action=outreach-resend-link    { campaignId, appIds[] }
 *
 * Everything lands on the application (deliverables, ticket, payout,
 * payoutDetails) with an audit entry. A paid payout also writes a Spend
 * (spends/{id}, payoutType 'Creator Payout') so Finance sees it, and
 * cancelling marks that Spend Cancelled. Nothing here moves money.
 */
import { nowIso } from './db.js';
import { readSignedToken } from './linkSign.js';
import { releaseApplicationPass, revokePassForOutreach, ticketLinkFor } from './passes.js';
import { enqueueJob, sendSoon } from './outreachQueue.js';
import { canTransition, canSystemTransition } from '../../src/lib/outreach/status.js';
import { firstNameOf } from '../../src/lib/outreach/normalize.js';
import {
    deliverablesFor, validateSubmission, deliverableSummary, preEventApproved, ticketRuleOf, normalizeUpi,
    validatePayout, PAYOUT_METHODS,
} from '../../src/lib/outreach/deliverables.js';

const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const HISTORY_MAX = 20;
// Task ids go into a field path (deliverables.<id>), so only plain ids.
const TASK_ID = /^[\w-]{1,120}$/;
const appsPath = (campaignId) => `campaigns/${campaignId}/applications`;
const auditRef = (db, campaignId) => db.collection('campaigns').doc(campaignId).collection('audit').doc();
const WHATSAPP = { actorUid: null, actorEmail: 'WhatsApp' };

/* ── The creator's link ───────────────────────────────────────────────── */

/** The application behind a personal link, or null. */
const fromToken = async (db, token) => {
    const p = readSignedToken(str(token, 2000));
    if (!p || p.k !== 'd' || !p.c || !p.a) return null;
    const campRef = db.collection('campaigns').doc(String(p.c));
    const [campSnap, appSnap] = await Promise.all([campRef.get(), campRef.collection('applications').doc(String(p.a)).get()]);
    if (!campSnap.exists || !appSnap.exists) return null;
    const app = appSnap.data();
    if (app.status === 'removed') return null;
    return { campaignId: campSnap.id, appId: appSnap.id, campaign: campSnap.data(), app, appRef: appSnap.ref };
};

const maskUpi = (upi) => {
    const [user, bank] = String(upi || '').split('@');
    if (!user || !bank) return '';
    return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${bank}`;
};

/* What the creator's page shows. Only their own submissions, no reviewer emails. */
const creatorView = ({ campaign, app }) => ({
    campaign: {
        title: campaign.title || '',
        artist: campaign.artist || '',
        eventDate: campaign.eventDate || '',
        postingDeadline: campaign.postingDeadline || '',
        image: campaign.image || campaign.coverImage || campaign.bannerImage || '',
    },
    firstName: firstNameOf(app.fullName),
    instagramHandle: app.instagramHandle || '',
    tasks: deliverablesFor(campaign).map(t => {
        const sub = app.deliverables?.[t.id] || null;
        return {
            ...t,
            status: sub?.status || 'not_started',
            link: sub?.link || '',
            screenshotUrl: sub?.screenshotUrl || '',
            reason: sub?.status === 'rejected' ? sub.reason || '' : '',
            submittedAt: sub?.submittedAt || null,
        };
    }),
    upi: maskUpi(app.payoutDetails?.upiId),
    payout: app.payout?.status === 'paid' ? { amount: app.payout.amount, paidAt: app.payout.paidAt } : null,
    ticket: app.ticket?.status === 'released' && app.ticket.passRef ? { url: ticketLinkFor(app.ticket.passRef) } : null,
});

export const handleCreatorDeliverables = async (req, res, { db }) => {
    const ctx = await fromToken(db, req.body?.token || req.query?.token);
    if (!ctx) return send(res, 404, { success: false, error: 'This link isn’t active. Ask the Newbi team for a new one.' });
    return send(res, 200, { success: true, ...creatorView(ctx) });
};

export const handleCreatorSubmit = async (req, res, { db, rateLimit, now = nowIso() }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const ctx = await fromToken(db, req.body?.token);
    if (!ctx) return send(res, 404, { success: false, error: 'This link isn’t active. Ask the Newbi team for a new one.' });
    const taskId = str(req.body?.taskId, 120);
    const task = TASK_ID.test(taskId) ? deliverablesFor(ctx.campaign).find(t => t.id === taskId) : null;
    if (!task) return send(res, 404, { success: false, error: 'This deliverable no longer exists.' });
    const { ok, value, errors } = validateSubmission(task, req.body || {});
    if (!ok) return send(res, 400, { success: false, code: 'invalid', errors, error: 'Check the highlighted fields.' });
    if (rateLimit && (await rateLimit(db, req, { bucket: 'outreach-submit' })).limited) {
        return send(res, 429, { success: false, error: 'Too many tries from this network. Try again in a few minutes.' });
    }
    const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ctx.appRef);
        const app = snap.data();
        const prev = app.deliverables?.[taskId] || null;
        if (prev?.status === 'approved') return { conflict: true };
        const history = [...(prev?.history || []), { status: 'submitted', at: now, by: 'creator' }].slice(-HISTORY_MAX);
        tx.update(ctx.appRef, {
            [`deliverables.${taskId}`]: { ...value, status: 'submitted', submittedAt: now, reviewedAt: null, reviewedBy: null, reason: null, history },
            updatedAt: now,
        });
        tx.set(auditRef(db, ctx.campaignId), {
            appId: ctx.appId, field: `deliverable:${task.title}`.slice(0, 120), from: prev?.status || null, to: 'submitted', source: 'creator', note: null, actorUid: null, actorEmail: null, at: now,
        });
        return { conflict: false };
    });
    if (result.conflict) return send(res, 409, { success: false, error: 'This one is already approved.' });
    return send(res, 200, { success: true });
};

export const handleCreatorUpi = async (req, res, { db, now = nowIso() }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const ctx = await fromToken(db, req.body?.token);
    if (!ctx) return send(res, 404, { success: false, error: 'This link isn’t active. Ask the Newbi team for a new one.' });
    const upiId = normalizeUpi(req.body?.upiId);
    if (!upiId) return send(res, 400, { success: false, field: 'upiId', error: 'Enter your UPI ID, like name@okaxis.' });
    const upiName = str(req.body?.upiName, 80).replace(/\s+/g, ' ');
    await ctx.appRef.update({ payoutDetails: { upiId, upiName: upiName || null, updatedAt: now }, updatedAt: now });
    // The audit says it changed, never what it is.
    await auditRef(db, ctx.campaignId).set({ appId: ctx.appId, field: 'payout_details', from: null, to: 'updated', source: 'creator', note: null, actorUid: null, actorEmail: null, at: now });
    return send(res, 200, { success: true, upi: maskUpi(upiId) });
};

/* ── Status helpers ───────────────────────────────────────────────────── */

const settingsOf = async (db, campaignId) => {
    const snap = await db.collection('campaigns').doc(campaignId).collection('private').doc('outreach').get();
    return snap.exists ? snap.data() : {};
};

/* Moves the application along when the system may; returns the new status or null. */
const systemMove = async (db, campaignId, appId, to, { source, note, actor = WHATSAPP, now = nowIso() }) => {
    const ref = db.collection(appsPath(campaignId)).doc(appId);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const from = snap.data().status || 'applied';
        if (from === to || !canSystemTransition(from, to)) return null;
        tx.update(ref, { status: to, statusUpdatedAt: now, statusUpdatedBy: actor.actorEmail, updatedAt: now });
        tx.set(auditRef(db, campaignId), { appId, field: 'status', from, to, source, note, ...actor, at: now });
        return to;
    });
};

/* ── Tickets ──────────────────────────────────────────────────────────── */

/** Releases one person's ticket through the passes system. → 'released' | 'already' | error message */
export const releaseTicket = async (db, { campaignId, appId, actor, rule = 'manual' }) => {
    const ref = db.collection(appsPath(campaignId)).doc(appId);
    const snap = await ref.get();
    if (!snap.exists) return 'Not found';
    if (snap.data().ticket?.status === 'released') return 'already';
    const at = nowIso();
    let out;
    try {
        out = await releaseApplicationPass(db, { campaignId, appId, staffEmail: actor.actorEmail || 'outreach' });
    } catch (err) {
        await ref.set({ ticket: { status: 'pending', error: String(err.message).slice(0, 200), at } }, { merge: true });
        return err.message || 'Couldn’t release the ticket.';
    }
    await ref.set({ ticket: { status: 'released', passRef: out.ref, rule, releasedAt: at, releasedBy: actor.actorEmail || null, channels: out.channels || null, error: null } }, { merge: true });
    await auditRef(db, campaignId).set({ appId, field: 'ticket', from: snap.data().ticket?.status || null, to: 'released', source: rule === 'manual' ? 'admin' : 'rule', note: `Pass ${out.ref}${rule !== 'manual' ? ` (rule: ${rule})` : ''}`, ...actor, at });
    return 'released';
};

const revokeTicket = async (db, { campaignId, appId, actor, reason }) => {
    const ref = db.collection(appsPath(campaignId)).doc(appId);
    const snap = await ref.get();
    const ticket = snap.data()?.ticket;
    if (!snap.exists || ticket?.status !== 'released' || !ticket.passRef) return 'Not released';
    await revokePassForOutreach(db, ticket.passRef, { reason, staffEmail: actor.actorEmail });
    const at = nowIso();
    await ref.set({ ticket: { ...ticket, status: 'revoked', revokedAt: at, revokedBy: actor.actorEmail || null, revokeReason: reason || null } }, { merge: true });
    await auditRef(db, campaignId).set({ appId, field: 'ticket', from: 'released', to: 'revoked', source: 'admin', note: reason || null, ...actor, at });
    return 'revoked';
};

/* After "Joined": their personal link, and the ticket when the campaign releases on joining. */
export const afterJoined = async (db, { campaignId, appId }) => {
    const [campSnap, settings] = await Promise.all([db.collection('campaigns').doc(campaignId).get(), settingsOf(db, campaignId)]);
    if ((campSnap.data()?.tasks || []).length) {
        const id = await enqueueJob(db, { campaignId, appId, kind: 'deliverables', createdBy: 'WhatsApp' });
        await sendSoon(db, id);
    }
    if (ticketRuleOf(settings) === 'joined') await releaseTicket(db, { campaignId, appId, actor: WHATSAPP, rule: 'joined' });
};

/* ── Admin: review ────────────────────────────────────────────────────── */

export const handleReview = async (req, res, { db, actor, now = nowIso() }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const appId = str(b.appId, 120);
    const taskId = str(b.taskId, 120);
    const decision = b.decision === 'approve' ? 'approved' : b.decision === 'reject' ? 'rejected' : null;
    const reason = str(b.reason, 300).replace(/\s+/g, ' ');
    if (!campaignId || !appId || !TASK_ID.test(taskId) || !decision) return send(res, 400, { success: false, error: 'Missing what to review.' });
    if (decision === 'rejected' && reason.length < 5) return send(res, 400, { success: false, field: 'reason', error: 'Tell them what to change (a few words).' });
    const campSnap = await db.collection('campaigns').doc(campaignId).get();
    const task = deliverablesFor(campSnap.data()).find(t => t.id === taskId);
    if (!task) return send(res, 404, { success: false, error: 'This deliverable no longer exists.' });
    const appRef = db.collection(appsPath(campaignId)).doc(appId);
    const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(appRef);
        if (!snap.exists) return { error: 'Application not found.' };
        const prev = snap.data().deliverables?.[taskId];
        if (!prev?.status || prev.status === 'not_started') return { error: 'Nothing has been sent for this one yet.' };
        if (prev.status === decision) return { app: snap.data(), unchanged: true };
        const history = [...(prev.history || []), { status: decision, at: now, by: actor.actorEmail, ...(reason ? { reason } : {}) }].slice(-HISTORY_MAX);
        const next = { ...prev, status: decision, reviewedAt: now, reviewedBy: actor.actorEmail, reason: decision === 'rejected' ? reason : null, history };
        tx.update(appRef, { [`deliverables.${taskId}`]: next, updatedAt: now });
        tx.set(auditRef(db, campaignId), { appId, field: `deliverable:${task.title}`.slice(0, 120), from: prev.status, to: decision, source: 'admin', note: reason || null, ...actor, at: now });
        return { app: { ...snap.data(), deliverables: { ...(snap.data().deliverables || {}), [taskId]: next } } };
    });
    if (result.error) return send(res, 409, { success: false, error: result.error });
    const followUps = {};
    if (!result.unchanged && decision === 'rejected') {
        const id = await enqueueJob(db, { campaignId, appId, kind: 'changes', data: { taskTitle: task.title, reason }, createdBy: actor.actorEmail });
        followUps.message = await sendSoon(db, id);
    }
    if (!result.unchanged && decision === 'approved') {
        const campaign = campSnap.data();
        if (deliverableSummary(campaign, result.app).allRequiredApproved) {
            followUps.movedTo = await systemMove(db, campaignId, appId, 'posted', { source: 'admin', note: 'Every required deliverable approved', actor });
        }
        const settings = await settingsOf(db, campaignId);
        if (ticketRuleOf(settings) === 'deliverables' && preEventApproved(campaign, result.app) && result.app.ticket?.status !== 'released') {
            followUps.ticket = await releaseTicket(db, { campaignId, appId, actor, rule: 'deliverables' });
        }
    }
    return send(res, 200, { success: true, status: decision, ...followUps });
};

/* ── Admin: tickets ───────────────────────────────────────────────────── */

export const handleTicket = async (req, res, { db, actor }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const ids = [...new Set((Array.isArray(b.appIds) ? b.appIds : []).map(id => str(id, 120)).filter(Boolean))].slice(0, 25);
    if (!campaignId || !ids.length) return send(res, 400, { success: false, error: 'Choose at least one person (up to 25 at a time).' });
    const action = b.action === 'revoke' ? 'revoke' : 'release';
    const reason = str(b.reason, 300);
    const results = [];
    for (const appId of ids) {
        const outcome = action === 'release'
            ? await releaseTicket(db, { campaignId, appId, actor, rule: 'manual' })
            : await revokeTicket(db, { campaignId, appId, actor, reason });
        results.push({ id: appId, outcome });
    }
    return send(res, 200, { success: true, results });
};

/* ── Admin: payouts ───────────────────────────────────────────────────── */

const methodLabel = (m) => PAYOUT_METHODS.find(x => x.value === m)?.label || m;

export const handlePayout = async (req, res, { db, actor, now = nowIso() }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const appId = str(b.appId, 120);
    if (!campaignId || !appId) return send(res, 400, { success: false, error: 'Missing who to pay.' });
    const campSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const campaign = campSnap.data();
    const appRef = db.collection(appsPath(campaignId)).doc(appId);

    if (b.action === 'cancel') {
        const reason = str(b.reason, 300);
        const out = await db.runTransaction(async (tx) => {
            const snap = await tx.get(appRef);
            const payout = snap.data()?.payout;
            if (!snap.exists || payout?.status !== 'paid') return { error: 'There’s no paid payout to cancel.' };
            const spendRef = payout.spendId ? db.collection('spends').doc(payout.spendId) : null;
            const spend = spendRef ? await tx.get(spendRef) : null;
            const from = snap.data().status;
            tx.update(appRef, {
                payout: { ...payout, status: 'cancelled', cancelledAt: now, cancelledBy: actor.actorEmail, cancelReason: reason || null },
                ...(from === 'paid' ? { status: 'posted', statusUpdatedAt: now, statusUpdatedBy: actor.actorEmail } : {}),
                updatedAt: now,
            });
            if (spend?.exists) tx.update(spendRef, { status: 'Cancelled', cancelledAt: now, cancelledBy: actor.actorEmail, notes: `${spend.data().notes || ''} · Cancelled in outreach${reason ? `: ${reason}` : ''}`.slice(0, 500) });
            tx.set(auditRef(db, campaignId), { appId, field: 'payout', from: 'paid', to: 'cancelled', source: 'admin', note: reason || null, ...actor, at: now });
            if (from === 'paid') tx.set(auditRef(db, campaignId), { appId, field: 'status', from: 'paid', to: 'posted', source: 'admin', note: 'Payout cancelled', ...actor, at: now });
            return {};
        });
        if (out.error) return send(res, 409, { success: false, error: out.error });
        return send(res, 200, { success: true, status: 'cancelled' });
    }

    const { ok, value, errors } = validatePayout(b);
    if (!ok) return send(res, 400, { success: false, code: 'invalid', errors, error: 'Check the payout details.' });
    const override = b.override === true;
    const overrideReason = str(b.overrideReason, 300);
    if (override && overrideReason.length < 5) return send(res, 400, { success: false, field: 'overrideReason', error: 'Say why you’re paying before the deliverables are approved.' });

    const out = await db.runTransaction(async (tx) => {
        const snap = await tx.get(appRef);
        if (!snap.exists) return { error: 'Application not found.' };
        const app = snap.data();
        if (app.payout?.status === 'paid') return { error: 'Already marked paid. Cancel that payout first to change it.' };
        const summary = deliverableSummary(campaign, app);
        if (summary.requiredCount > 0 && !summary.allRequiredApproved && !override) {
            return { code: 'deliverables', error: `Approve their deliverables first (${summary.requiredApproved} of ${summary.requiredCount} approved), or pay with a reason.` };
        }
        const from = app.status || 'applied';
        const move = from !== 'paid' && (canTransition(from, 'paid') || canSystemTransition(from, 'paid'));
        const spendRef = db.collection('spends').doc();
        const upi = app.payoutDetails?.upiId || '';
        tx.set(spendRef, {
            title: `Creator payout: ${campaign.title || 'campaign'}`,
            amount: value.amount,
            payoutType: 'Creator Payout',
            date: value.paidAt,
            accountType: value.accountType,
            paymentMode: methodLabel(value.method),
            status: 'Paid',
            notes: value.note || `Outreach payout${app.tier ? ` · ${app.tier}` : ''}${override ? ` · paid early: ${overrideReason}` : ''}`,
            receiverName: app.fullName || '',
            paidTo: app.fullName || '',
            paidBy: value.accountType === 'personal' ? 'Team Member' : 'Newbi Core',
            destinationDetails: upi ? `UPI: ${upi}` : '',
            paymentRef: value.reference || '',
            source: 'outreach',
            linkedCampaignId: campaignId,
            linkedApplicationId: appId,
            createdAt: now,
            createdBy: actor.actorUid || null,
            createdByEmail: actor.actorEmail || null,
        });
        tx.update(appRef, {
            payout: { status: 'paid', ...value, paidBy: actor.actorEmail, recordedAt: now, spendId: spendRef.id, override, overrideReason: override ? overrideReason : null },
            ...(move ? { status: 'paid', statusUpdatedAt: now, statusUpdatedBy: actor.actorEmail } : {}),
            updatedAt: now,
        });
        tx.set(auditRef(db, campaignId), {
            appId, field: 'payout', from: app.payout?.status || null, to: 'paid', source: 'admin',
            note: `₹${value.amount.toLocaleString('en-IN')} by ${methodLabel(value.method)}${value.reference ? `, ref ${value.reference}` : ''}${override ? ` · paid early: ${overrideReason}` : ''}`,
            ...actor, at: now,
        });
        if (move) tx.set(auditRef(db, campaignId), { appId, field: 'status', from, to: 'paid', source: 'admin', note: 'Payout recorded', ...actor, at: now });
        return { spendId: spendRef.id };
    });
    if (out.error) return send(res, 409, { success: false, code: out.code || null, error: out.error });
    const id = await enqueueJob(db, { campaignId, appId, kind: 'payout', data: { amount: value.amount, reference: value.reference }, createdBy: actor.actorEmail, again: true });
    const notice = await sendSoon(db, id);
    return send(res, 200, { success: true, status: 'paid', spendId: out.spendId, notice });
};

/* ── Admin: resend personal links ─────────────────────────────────────── */

export const handleResendLink = async (req, res, { db, actor }) => {
    const campaignId = str(req.body?.campaignId, 120);
    const ids = [...new Set((Array.isArray(req.body?.appIds) ? req.body.appIds : []).map(id => str(id, 120)).filter(Boolean))].slice(0, 200);
    if (!campaignId || !ids.length) return send(res, 400, { success: false, error: 'Choose at least one person.' });
    let queued = 0;
    for (const appId of ids) {
        const id = await enqueueJob(db, { campaignId, appId, kind: 'deliverables', createdBy: actor.actorEmail, again: true });
        if (id) { queued += 1; await sendSoon(db, id); }
    }
    return send(res, 200, { success: true, queued });
};

