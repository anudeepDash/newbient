/**
 * Campaign outreach, Phase 3: deliverables, tickets and payouts.
 *
 * Creators (no sign-in, their personal signed link app.newbi.live/d/<token>):
 *   POST ?action=outreach-deliverables   { token }                                 their campaign page: groups, posts, ticket, payout
 *   POST ?action=outreach-joined         { token, which: 'campaign'|'city' }       "I've joined" (WhatsApp can't tell us)
 *   POST ?action=outreach-submit         { token, taskId, link, screenshotUrl, note }   rate-limited per IP
 *   POST ?action=outreach-payout-details { token, mode: 'upi'|'bank', name, upiId | accountNumber, confirmAccountNumber, ifsc, bankName }
 *                                        or { token, useSaved: true }               where to pay them (outreach-upi: the old UPI-only form)
 *
 * Admins (outreach roles, checked by the router):
 *   POST ?action=outreach-review         { campaignId, appId, taskId, decision: 'approve'|'reject', reason }
 *   POST ?action=outreach-ticket         { campaignId, appIds[], action: 'release'|'revoke', reason? }
 *   POST ?action=outreach-payout         { campaignId, appId, action: 'paid'|'cancel', amount, method, paidAt, reference, accountType, note, override?, overrideReason? }
 *   POST ?action=outreach-resend-link    { campaignId, appIds[] }
 *   POST ?action=outreach-ask-payout     { campaignId, appIds[], again? }           email + WhatsApp + in-app: "add your payout details"
 *
 * Everything lands on the application (deliverables, ticket, payout,
 * payoutDetails) with an audit entry. A paid payout also writes a Spend
 * (spends/{id}, payoutType 'Creator Payout') so Finance sees it, and
 * cancelling marks that Spend Cancelled. Nothing here moves money.
 *
 * Payout details are asked for only when the team triggers it. Saving them
 * also keeps the creator's Vendor payee in Finance up to date
 * (finance_payees/creator_<uid>, one per person across campaigns).
 */
import { nowIso } from './db.js';
import { readSignedToken } from './linkSign.js';
import { releaseApplicationPass, revokePassForOutreach, ticketLinkFor } from './passes.js';
import { enqueueJob, sendSoon, submitUrlFor, payoutUrlFor, kindLive, switchFor } from './outreachQueue.js';
import { notify } from './notify.js';
import { campaignImageOf } from './whatsapp.js';
import { canTransition, canSystemTransition, isOnShortlist } from '../../src/lib/outreach/status.js';
import { firstNameOf } from '../../src/lib/outreach/normalize.js';
import { approvedSummary } from '../../src/lib/outreach/whatsappTemplate.js';
import {
    deliverablesFor, validateSubmission, deliverableSummary, preEventApproved, ticketRuleOf,
    validatePayout, PAYOUT_METHODS, validatePayoutDetails, hasPayoutDetails, payoutDestination,
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
    return { campaignId: campSnap.id, appId: appSnap.id, campaign: campSnap.data(), app, appRef: appSnap.ref, campRef };
};

const JOINED = new Set(['joined', 'posted', 'paid']);

const maskUpi = (upi) => {
    const [user, bank] = String(upi || '').split('@');
    if (!user || !bank) return '';
    return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${bank}`;
};

/* "A/C •••• 1234 · HDFC0001234" or a masked UPI ID: enough to recognise, never the whole number. */
const maskPayout = (d) => {
    if (!hasPayoutDetails(d)) return null;
    if (d.mode === 'bank') {
        return { mode: 'bank', label: `A/C •••• ${String(d.accountNumber).slice(-4)}${d.ifsc ? ` · ${d.ifsc}` : ''}`, name: d.name || '', bankName: d.bankName || '' };
    }
    return { mode: 'upi', label: maskUpi(d.upiId), name: d.name || d.upiName || '' };
};

/*
 * What the creator's page shows. Only their own submissions, no reviewer emails.
 * The campaign group link only once they're on the shortlist (it's private).
 */
const creatorView = ({ campaign, app }, settings = {}) => ({
    status: app.status,
    groups: {
        campaign: isOnShortlist(app.status) && settings.whatsappGroupLink
            ? { url: settings.whatsappGroupLink, joined: JOINED.has(app.status) || Boolean(app.joinedAt) }
            : null,
        city: app.cityGroup?.url
            ? { city: app.cityGroup.city, title: app.cityGroup.title, url: app.cityGroup.url, joined: Boolean(app.cityGroupJoinedAt) }
            : null,
    },
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
    payoutDetails: maskPayout(app.payoutDetails),
    payoutDetailsAt: app.payoutDetails?.updatedAt || null,
    payoutRequestedAt: app.payoutDetailsRequest?.requestedAt || null,
    payout: app.payout?.status === 'paid' ? { amount: app.payout.amount, paidAt: app.payout.paidAt } : null,
    ticket: app.ticket?.status === 'released' && app.ticket.passRef ? { url: ticketLinkFor(app.ticket.passRef) } : null,
});

export const handleCreatorDeliverables = async (req, res, { db }) => {
    const ctx = await fromToken(db, req.body?.token || req.query?.token);
    if (!ctx) return send(res, 404, { success: false, error: 'This link isn’t active. Ask the Newbi team for a new one.' });
    const [priv, payee] = await Promise.all([
        ctx.campRef.collection('private').doc('outreach').get(),
        hasPayoutDetails(ctx.app.payoutDetails) ? null : payeeRefFor(db, ctx).get(),
    ]);
    // Details they gave for another campaign, offered as one tap ("Use these").
    const saved = payee?.exists ? maskPayout(detailsFromPayee(payee.data())) : null;
    return send(res, 200, { success: true, ...creatorView(ctx, priv.exists ? priv.data() : {}), savedPayout: saved });
};

/*
 * "I've joined": WhatsApp never tells us who joined a group, so the creator
 * says so on their page. The campaign group moves them to joined (and stops
 * the reminder); the city community is just noted.
 */
export const handleCreatorJoined = async (req, res, { db, now = nowIso() }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const ctx = await fromToken(db, req.body?.token);
    if (!ctx) return send(res, 404, { success: false, error: 'This link isn’t active. Ask the Newbi team for a new one.' });
    if (req.body?.which === 'city') {
        if (!ctx.app.cityGroup?.url) return send(res, 409, { success: false, error: 'There’s no city community for your city yet.' });
        if (!ctx.app.cityGroupJoinedAt) {
            await ctx.appRef.update({ cityGroupJoinedAt: now, updatedAt: now });
            await db.collection('creator_contacts').doc(ctx.app.contactId || 'x').set({ cityGroupJoinedAt: now }, { merge: true }).catch(() => {});
            await auditRef(db, ctx.campaignId).set({ appId: ctx.appId, field: 'city_group', from: null, to: 'joined', source: 'creator', note: ctx.app.cityGroup.title, actorUid: null, actorEmail: null, at: now });
        }
        return send(res, 200, { success: true });
    }
    if (!isOnShortlist(ctx.app.status)) return send(res, 409, { success: false, error: 'You can join the campaign group once you’re shortlisted.' });
    if (JOINED.has(ctx.app.status)) return send(res, 200, { success: true, already: true });
    const moved = await systemMove(db, ctx.campaignId, ctx.appId, 'joined', { source: 'creator', note: 'Tapped “I’ve joined” on their campaign page', actor: { actorUid: null, actorEmail: null }, now });
    if (moved) {
        await ctx.appRef.update({ joinedAt: now, joinedVia: 'app', updatedAt: now });
        await db.collection('outreach_queue').doc(`${ctx.campaignId}_${ctx.appId}_reminder`)
            .set({ status: 'cancelled', nextAttemptAt: null, lastError: 'They joined.' }, { merge: true });
    }
    return send(res, 200, { success: true, status: moved || ctx.app.status });
};

/* The signed-in creator's own outreach applications, for "Your campaigns" in the app. */
export const handleMine = async (req, res, { db, token }) => {
    if (!token?.uid) return send(res, 401, { success: false, error: 'Please sign in.' });
    const member = await db.collection('outreach_members').doc(token.uid).get();
    const entries = Object.values(member.exists ? member.data().apps || {} : {});
    const items = (await Promise.all(entries.slice(0, 50).map(async ({ campaignId, appId }) => {
        const campRef = db.collection('campaigns').doc(campaignId);
        const [camp, app] = await Promise.all([campRef.get(), campRef.collection('applications').doc(appId).get()]);
        if (!camp.exists || !app.exists || app.data().uid !== token.uid) return null;
        const a = app.data();
        return {
            campaignId, appId,
            title: camp.data().title || '',
            image: camp.data().image || camp.data().thumbnail || '',
            status: a.status,
            appliedAt: a.firstSubmittedAt || null,
            hubUrl: a.status === 'removed' ? null : submitUrlFor(campaignId, appId) || null,
        };
    }))).filter(Boolean).sort((x, y) => String(y.appliedAt || '').localeCompare(String(x.appliedAt || '')));
    return send(res, 200, { success: true, items });
};

export const handleCreatorSubmit = async (req, res, { db, rateLimit, now = nowIso() }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const ctx = await fromToken(db, req.body?.token);
    if (!ctx) return send(res, 404, { success: false, error: 'This link isn’t active. Ask the Newbi team for a new one.' });
    // Only shortlisted creators send their posts; applying isn't enough.
    if (!isOnShortlist(ctx.app.status)) return send(res, 409, { success: false, code: 'not_shortlisted', error: 'You can send your posts once you’re shortlisted.' });
    const taskId = str(req.body?.taskId, 120);
    const task = TASK_ID.test(taskId) ? deliverablesFor(ctx.campaign).find(t => t.id === taskId) : null;
    if (!task) return send(res, 404, { success: false, error: 'This deliverable no longer exists.' });
    if (!task.open) return send(res, 409, { success: false, code: 'task_closed', error: 'This post isn’t open yet. We’ll tell you when to send it.' });
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

/* ── Payout details (creator) ─────────────────────────────────────────── */

/* One Vendor payee per creator in Finance, whichever campaigns they're paid for. */
const payeeIdFor = (app, appId) => `creator_${String(app.uid || app.contactId || appId).replace(/[^\w-]/g, '').slice(0, 120)}`;
const payeeRefFor = (db, ctx) => db.collection('finance_payees').doc(payeeIdFor(ctx.app, ctx.appId));

const detailsFromPayee = (p = {}) => (p.paymentMode === 'Bank Transfer' && p.bankDetails?.accountNumber
    ? { mode: 'bank', name: p.accountHolder || p.name || '', accountNumber: p.bankDetails.accountNumber, ifsc: p.bankDetails.ifscCode || '', bankName: p.bankDetails.bankName || null }
    : p.upiId ? { mode: 'upi', name: p.accountHolder || '', upiId: p.upiId } : null);

/*
 * Keeps finance_payees/creator_<uid> in step with what they gave us. New or
 * changed details go back to Pending, so Finance checks them before paying;
 * the payee keeps its type if Finance changed it.
 */
export const syncCreatorPayee = async (db, ctx, details, now = nowIso()) => {
    const ref = payeeRefFor(db, ctx);
    const { app, campaign, campaignId, appId } = ctx;
    const destination = payoutDestination(details);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.exists ? snap.data() : null;
        const changed = !cur || cur.destinationDetails !== destination;
        const campaigns = { ...(cur?.campaigns || {}), [campaignId]: { title: campaign.title || '', appId, at: now } };
        const titles = Object.values(campaigns).map(c => c.title).filter(Boolean);
        tx.set(ref, {
            // The name they applied with, so this campaign's payout Spends (receiverName) match it.
            name: app.fullName || cur?.name || details.name || '',
            accountHolder: details.name || null,
            email: app.email || cur?.email || '',
            phone: app.phone || cur?.phone || '',
            type: cur?.type || 'Vendor',
            category: 'Creator',
            instagramHandle: app.instagramHandle || cur?.instagramHandle || '',
            paymentMode: details.mode === 'bank' ? 'Bank Transfer' : 'UPI',
            upiId: details.mode === 'upi' ? details.upiId : '',
            bankDetails: details.mode === 'bank' ? { bankName: details.bankName || '', accountNumber: details.accountNumber, ifscCode: details.ifsc } : null,
            destinationDetails: destination,
            campaigns,
            linkedGig: titles.length > 1 ? `${titles.length} campaigns: ${titles.slice(-3).join(', ')}` : `Campaign: ${titles[0] || 'creator campaign'}`,
            status: changed ? 'Pending' : cur.status || 'Pending',
            source: cur?.source || 'campaign',
            submittedByUid: app.uid || cur?.submittedByUid || null,
            createdAt: cur?.createdAt || now,
            detailsUpdatedAt: changed ? now : cur.detailsUpdatedAt || now,
            updatedAt: now,
        }, { merge: true });
    });
    return ref.id;
};

/*
 * Where to pay them: a UPI ID or a bank account, from their payout page (or
 * the older UPI card on their campaign page), or `useSaved` to reuse what they
 * gave for another campaign. The audit says it changed, never what it is.
 */
export const handleCreatorPayoutDetails = async (req, res, { db, rateLimit, now = nowIso() }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const ctx = await fromToken(db, req.body?.token);
    if (!ctx) return send(res, 404, { success: false, error: 'This link isn’t active. Ask the Newbi team for a new one.' });
    if (rateLimit && (await rateLimit(db, req, { bucket: 'outreach-payout-details' })).limited) {
        return send(res, 429, { success: false, error: 'Too many tries from this network. Try again in a few minutes.' });
    }
    let input = req.body || {};
    if (input.useSaved === true) {
        const payee = await payeeRefFor(db, ctx).get();
        const saved = payee.exists ? detailsFromPayee(payee.data()) : null;
        if (!saved) return send(res, 404, { success: false, error: 'There are no saved details to use. Add them below.' });
        input = saved;
    }
    const { ok, value, errors } = validatePayoutDetails(input);
    if (!ok) {
        const field = Object.keys(errors)[0];
        return send(res, 400, { success: false, code: 'invalid', errors, field, error: errors[field] });
    }
    const details = { ...value, upiName: value.mode === 'upi' ? value.name || null : null, updatedAt: now };
    const payeeId = await syncCreatorPayee(db, ctx, details, now);
    await ctx.appRef.update({ payoutDetails: { ...details, payeeId }, updatedAt: now });
    await auditRef(db, ctx.campaignId).set({ appId: ctx.appId, field: 'payout_details', from: null, to: 'updated', source: 'creator', note: value.mode === 'bank' ? 'Bank account' : 'UPI', actorUid: null, actorEmail: null, at: now });
    return send(res, 200, { success: true, upi: maskUpi(details.upiId), details: maskPayout(details) });
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

/* After "Joined ✅" in WhatsApp: their personal link to send posts. (Joining no longer releases tickets.) */
export const afterJoined = async (db, { campaignId, appId }) => {
    const campSnap = await db.collection('campaigns').doc(campaignId).get();
    if ((campSnap.data()?.tasks || []).length) {
        const id = await enqueueJob(db, { campaignId, appId, kind: 'deliverables', createdBy: 'WhatsApp' });
        await sendSoon(db, id);
    }
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
        const summary = deliverableSummary(campaign, result.app);
        if (summary.allRequiredApproved) {
            followUps.movedTo = await systemMove(db, campaignId, appId, 'posted', { source: 'admin', note: 'Every required deliverable approved', actor });
            // One WhatsApp for the whole campaign, once (a fixed job id), never one per post.
            const titles = summary.items.filter(i => i.task.required).map(i => i.task.title);
            const id = await enqueueJob(db, { campaignId, appId, kind: 'all_approved', data: { summary: approvedSummary(titles) }, createdBy: actor.actorEmail });
            followUps.allApproved = await sendSoon(db, id);
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
        const destination = payoutDestination(app.payoutDetails);
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
            destinationDetails: destination,
            payeeId: app.payoutDetails?.payeeId || null,
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
    if (!kindLive('deliverables')) return send(res, 409, { success: false, error: `The posts-link template isn’t switched on yet (${switchFor('deliverables')}).` });
    let queued = 0;
    for (const appId of ids) {
        const id = await enqueueJob(db, { campaignId, appId, kind: 'deliverables', createdBy: actor.actorEmail, again: true });
        if (id) { queued += 1; await sendSoon(db, id); }
    }
    return send(res, 200, { success: true, queued });
};

/* ── Admin: ask for payout details ────────────────────────────────────── */

const EMAIL_GOING = new Set(['sent', 'deferred', 'retry', 'duplicate']);

/*
 * Only when the team asks (never automatic): an email and an in-app notice
 * with their payout page link, and the campaign_payout_details WhatsApp
 * template once it's switched on. People who already gave their details are
 * skipped unless `again` (to ask them to check or change them).
 * → { results: [{ id, outcome: 'sent' | 'has_details' | 'no_channel' | 'not_found', channels }] }
 */
export const handleAskPayout = async (req, res, { db, actor, now = nowIso() }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const ids = [...new Set((Array.isArray(b.appIds) ? b.appIds : []).map(id => str(id, 120)).filter(Boolean))].slice(0, 200);
    if (!campaignId || !ids.length) return send(res, 400, { success: false, error: 'Choose at least one person.' });
    const campSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    if (!payoutUrlFor(campaignId, ids[0])) return send(res, 503, { success: false, error: 'Personal links aren’t set up (LINK_SIGNING_SECRET).' });
    const campaign = campSnap.data();
    const waOn = kindLive('payout_details');
    const results = [];
    for (const appId of ids) {
        const ref = db.collection(appsPath(campaignId)).doc(appId);
        const snap = await ref.get();
        const app = snap.exists ? snap.data() : null;
        if (!app || app.status === 'removed') { results.push({ id: appId, outcome: 'not_found' }); continue; }
        if (hasPayoutDetails(app.payoutDetails) && b.again !== true) { results.push({ id: appId, outcome: 'has_details' }); continue; }
        const payUrl = payoutUrlFor(campaignId, appId);
        const channels = {};
        // Written before sending, so the WhatsApp worker's whatsappSentAt lands on this request.
        const prev = app.payoutDetailsRequest || {};
        await ref.set({
            payoutDetailsRequest: { requestedAt: now, requestedBy: actor.actorEmail || null, count: (Number(prev.count) || 0) + 1, channels: {}, whatsappSentAt: null },
            updatedAt: now,
        }, { merge: true });
        const out = await notify('campaign-payout-details', app.uid || null, {
            name: app.fullName, campaignTitle: campaign.title, campaignId, image: campaignImageOf(campaign) || '', payUrl,
        }, { to: { email: app.email || undefined, name: app.fullName }, skip: ['whatsapp'] }).catch(e => { console.warn('[outreach] payout details notice failed:', e.message); return null; });
        if (out?.email) channels.email = out.email.status;
        if (out?.inApp) channels.inApp = out.inApp.status;
        if (waOn && app.phone) {
            const id = await enqueueJob(db, { campaignId, appId, kind: 'payout_details', createdBy: actor.actorEmail, again: true });
            if (id) channels.whatsapp = await sendSoon(db, id);
        }
        const reached = EMAIL_GOING.has(channels.email) || channels.inApp === 'sent' || ['sent', 'queued', 'retry', 'held', 'blocked'].includes(channels.whatsapp);
        await ref.update({ 'payoutDetailsRequest.channels': channels });
        await auditRef(db, campaignId).set({
            appId, field: 'payout_details_request', from: null, to: reached ? 'sent' : 'not_sent', source: 'admin',
            note: Object.entries(channels).map(([k, v]) => `${k}: ${v}`).join(', ') || 'No email, app account or WhatsApp',
            ...actor, at: now,
        });
        results.push({ id: appId, outcome: reached ? 'sent' : 'no_channel', channels });
    }
    return send(res, 200, { success: true, results, whatsapp: waOn });
};

/*
 * Each person's payout page link, for sharing by hand (copy, their own
 * WhatsApp chat) or in a sheet. Nothing is sent; the request is noted so the
 * Payouts list shows they were asked.
 * → { links: [{ id, url, name, phone, email, hasDetails }] }
 */
export const handlePayoutLinks = async (req, res, { db, actor, now = nowIso() }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const ids = [...new Set((Array.isArray(b.appIds) ? b.appIds : []).map(id => str(id, 120)).filter(Boolean))].slice(0, 500);
    if (!campaignId || !ids.length) return send(res, 400, { success: false, error: 'Choose at least one person.' });
    if (!payoutUrlFor(campaignId, ids[0])) return send(res, 503, { success: false, error: 'Personal links aren’t set up (LINK_SIGNING_SECRET).' });
    const links = [];
    for (const appId of ids) {
        const ref = db.collection(appsPath(campaignId)).doc(appId);
        const snap = await ref.get();
        const app = snap.exists ? snap.data() : null;
        if (!app || app.status === 'removed') continue;
        links.push({ id: appId, url: payoutUrlFor(campaignId, appId), name: app.fullName || '', phone: app.phone || '', email: app.email || '', hasDetails: hasPayoutDetails(app.payoutDetails) });
        if (b.markShared === true && !hasPayoutDetails(app.payoutDetails)) {
            const prev = app.payoutDetailsRequest || {};
            await ref.set({ payoutDetailsRequest: { ...prev, requestedAt: now, requestedBy: actor.actorEmail || null, count: (Number(prev.count) || 0) + 1, channels: { ...(prev.channels || {}), manual: b.via === 'sheet' ? 'sheet' : 'link' } }, updatedAt: now }, { merge: true });
            await auditRef(db, campaignId).set({ appId, field: 'payout_details_request', from: null, to: 'shared', source: 'admin', note: b.via === 'sheet' ? 'Link exported in a sheet' : 'Link shared by hand', ...actor, at: now });
        }
    }
    return send(res, 200, { success: true, links });
};
