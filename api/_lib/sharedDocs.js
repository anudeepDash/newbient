/**
 * What visitors do on a shared invoice, proposal or contract link, on the
 * server. Firestore rules let the browser only read one of these documents by
 * id; every write the public pages used to make goes through here, so a
 * visitor can't rewrite a status, a signature or the view history.
 *
 * Served as /api/forms?type=shared-doc&action=… (the project is at Vercel's
 * function limit, so this lives inside an existing function):
 *
 *   POST view     {kind: invoice|proposal|agreement, id, via?, email?, name?, platform?, screen?, language?}
 *                 adds one entry to accessLogs (last 50 kept) and sets lastOpened
 *   POST claim    {id, name, email, method?, transactionId?, amount?}
 *                 "I've paid" on an invoice: status 'Verification Pending' + paymentClaim; tells finance
 *   POST gateway-claim {id, txid?}
 *                 a payment gateway redirected back with ?status=success (not proof: also a claim)
 *   POST respond  {id, response: Accepted|Rejected, signedBy?, email?, clientSignature?, reason?, device?, footprint?}
 *                 a client accepts (signs) or declines a proposal, once, before it expires
 *   POST sign     {id, signedBy, email, clientSignature?}
 *                 a client signs a contract, once
 *
 * Signature images are uploaded by the page first (Storage or Cloudinary);
 * only https links to them are accepted here. IP and browser come from the
 * request, and every time is the server's.
 */
import { getDb, nowIso } from './db.js';
import { verifyToken } from './auth.js';
import { isProposalClosed, isProposalExpired, PROPOSAL_STATUS } from '../../src/lib/proposals.js';
import { CONTRACT_STATUS } from '../../src/lib/contracts.js';

class DocError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const COLLECTIONS = { invoice: 'invoices', proposal: 'proposals', agreement: 'agreements' };
export const MAX_ACCESS_LOGS = 50;
// Who hears about a payment claim (FINANCE_ROLES, plus super admins who chase payments).
const CLAIM_NOTIFY_ROLES = ['founder', 'developer', 'super_admin'];

const str = (v, n = 300) => (v === undefined || v === null ? '' : String(v).trim().slice(0, n));
const idOk = (v) => typeof v === 'string' && /^[\w-]{1,128}$/.test(v);
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const httpsUrl = (v) => (/^https:\/\/\S+$/i.test(str(v, 2000)) ? str(v, 2000) : null);
const clientIp = (req) => str(String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0], 64) || null;
const userAgent = (req) => str(req.headers?.['user-agent'], 400);

const docRef = (db, kind, id) => {
    const col = COLLECTIONS[kind];
    if (!col) throw new DocError('VALIDATION', 'Unknown document type.');
    if (!idOk(id)) throw new DocError('VALIDATION', 'Missing document.');
    return db.collection(col).doc(id);
};

/* Signed-out visitors: 30 actions a minute per IP on a warm instance. */
const hits = new Map();
const limited = (req) => {
    const ip = clientIp(req) || 'unknown';
    const now = Date.now();
    const rec = hits.get(ip) || { count: 0, reset: now + 60_000 };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + 60_000; }
    rec.count += 1;
    if (hits.size > 5000) hits.clear();
    hits.set(ip, rec);
    return rec.count > 30;
};

/* ---------- view ---------- */

const view = async (db, body, ctx) => {
    const ref = docRef(db, str(body.kind, 20), str(body.id, 128));
    const entry = {
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        platform: str(body.platform, 60),
        screen: str(body.screen, 20),
        language: str(body.language, 20),
        userEmail: ctx.caller?.email || 'Guest',
        userName: str(ctx.caller?.name, 120),
        via: str(body.via, 30) || null,
        shareEmail: str(body.email, 200) || null,
        shareName: str(body.name, 120) || null,
        timestamp: ctx.now,
    };
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new DocError('NOT_FOUND', 'This document no longer exists.', 404);
        const logs = Array.isArray(snap.data().accessLogs) ? snap.data().accessLogs : [];
        tx.update(ref, { accessLogs: [...logs, entry].slice(-MAX_ACCESS_LOGS), lastOpened: ctx.now });
    });
    return { success: true };
};

/* ---------- invoices ---------- */

const notifyFinance = async (db, title, content) => {
    const snap = await db.collection('admins').where('role', 'in', CLAIM_NOTIFY_ROLES).get();
    const uids = [...new Set(snap.docs.map(d => d.data().uid).filter(Boolean))];
    await Promise.all(uids.map(uid => db.collection('notifications').add({
        userId: uid, type: 'message', title, content, link: '/admin/invoices', image: '', isRead: false, createdAt: nowIso(),
    })));
};

const recordClaim = async (db, id, claim) => {
    const ref = docRef(db, 'invoice', id);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new DocError('NOT_FOUND', 'This invoice no longer exists.', 404);
        const inv = snap.data();
        if (inv.status === 'Paid') throw new DocError('CLOSED', 'This invoice is already paid.', 409);
        if (inv.paymentClaim?.status === 'pending' || inv.status === 'Verification Pending') return { inv, duplicate: true };
        tx.update(ref, { status: 'Verification Pending', paymentClaim: claim });
        return { inv, duplicate: false };
    });
};

const claim = async (db, body, ctx) => {
    const name = str(body.name, 120);
    const email = str(body.email, 200).toLowerCase();
    if (!name) throw new DocError('VALIDATION', 'Enter your name.');
    if (!emailOk(email)) throw new DocError('VALIDATION', 'Enter a valid email so we can confirm.');
    const amount = Number(body.amount);
    const paymentClaim = {
        name,
        email,
        method: str(body.method, 30) || 'upi',
        transactionId: str(body.transactionId, 120) || null,
        amount: Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        claimedAt: ctx.now,
        status: 'pending',
    };
    const { inv, duplicate } = await recordClaim(db, str(body.id, 128), paymentClaim);
    if (!duplicate) {
        const total = Number(inv.total || inv.amount || 0);
        await notifyFinance(db, 'Payment to verify',
            `${name} (${email}) says they've paid ₹${total.toLocaleString('en-IN')} for invoice #${inv.invoiceNumber || body.id}.`)
            .catch(err => console.warn('[SHARED-DOC] claim notice failed:', err.message));
    }
    return { success: true, duplicate };
};

const gatewayClaim = async (db, body, ctx) => {
    const paymentClaim = {
        name: 'Online payment (redirect)',
        email: '',
        method: 'gateway',
        transactionId: str(body.txid, 120) || null,
        userAgent: ctx.userAgent,
        ip: ctx.ip,
        claimedAt: ctx.now,
        status: 'pending',
    };
    const { duplicate } = await recordClaim(db, str(body.id, 128), paymentClaim);
    return { success: true, duplicate };
};

/* ---------- proposals ---------- */

const respond = async (db, body, ctx) => {
    const response = str(body.response, 20);
    if (![PROPOSAL_STATUS.ACCEPTED, PROPOSAL_STATUS.REJECTED].includes(response)) throw new DocError('VALIDATION', 'Invalid response.');
    let updates;
    if (response === PROPOSAL_STATUS.ACCEPTED) {
        const signedBy = str(body.signedBy, 120);
        const email = str(body.email, 200);
        if (!signedBy) throw new DocError('VALIDATION', 'Enter your full name to sign.');
        if (!emailOk(email)) throw new DocError('VALIDATION', 'Enter a valid email address to sign.');
        const clientSignature = httpsUrl(body.clientSignature);
        const device = body.device && typeof body.device === 'object' ? body.device : {};
        const footprint = body.footprint && typeof body.footprint === 'object' ? body.footprint : {};
        const approvalMetadata = {
            signedBy,
            clientSignature,
            signedAt: ctx.now,
            ip: ctx.ip,
            email,
            device: {
                ua: ctx.userAgent,
                platform: str(device.platform, 60),
                screen: str(device.screen, 20),
                language: str(device.language, 20),
                ip: ctx.ip,
                verifiedEmail: email,
                timestamp: ctx.now,
            },
            footprint: { browser: str(footprint.browser, 80), os: str(footprint.os, 60), res: str(footprint.res, 20) },
        };
        updates = { clientSignature, approvalMetadata };
    } else {
        updates = { rejectionMetadata: { reason: str(body.reason, 2000) || 'No reason provided', rejectedAt: ctx.now, ip: ctx.ip } };
    }
    const ref = docRef(db, 'proposal', str(body.id, 128));
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new DocError('NOT_FOUND', 'This proposal no longer exists.', 404);
        const current = snap.data();
        if (isProposalClosed(current)) throw new DocError('CLOSED', `This proposal was already ${current.status === PROPOSAL_STATUS.ACCEPTED ? 'accepted' : 'declined'}.`, 409);
        if (isProposalExpired(current)) throw new DocError('EXPIRED', 'This proposal has expired. Please ask us for an updated one.', 409);
        tx.update(ref, { ...updates, status: response, respondedAt: ctx.now });
    });
    return { success: true, status: response, ...updates };
};

/* ---------- contracts ---------- */

const sign = async (db, body, ctx) => {
    const signedBy = str(body.signedBy, 120);
    const email = str(body.email, 200);
    if (!signedBy) throw new DocError('VALIDATION', 'Enter your full name to sign.');
    if (!emailOk(email)) throw new DocError('VALIDATION', 'Enter a valid email address to sign.');
    const clientSignature = httpsUrl(body.clientSignature);
    const approvalMetadata = { signedBy, signedAt: ctx.now, ip: ctx.ip, email, userAgent: ctx.userAgent, clientSignature };
    const ref = docRef(db, 'agreement', str(body.id, 128));
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new DocError('NOT_FOUND', 'This contract no longer exists.', 404);
        const current = snap.data();
        if (current.status === CONTRACT_STATUS.EXECUTED) throw new DocError('CLOSED', 'This contract has already been signed.', 409);
        if (current.showSignatures && !clientSignature) throw new DocError('VALIDATION', 'Add your signature first.');
        tx.update(ref, { status: CONTRACT_STATUS.EXECUTED, approvalMetadata, clientSignature, executedAt: ctx.now });
    });
    return { success: true, approvalMetadata };
};

const ACTIONS = { view, claim, 'gateway-claim': gatewayClaim, respond, sign };

export const handleSharedDoc = async (req, res) => {
    const action = str(req.query?.action, 30);
    const fn = ACTIONS[action];
    if (!fn) return res.status(400).json({ success: false, error: 'Unknown action.' });
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (limited(req)) return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many requests. Try again in a minute.' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    try {
        const caller = await verifyToken(req).catch(() => null);
        const ctx = { caller, ip: clientIp(req), userAgent: userAgent(req), now: nowIso() };
        const result = await fn(getDb(), body, ctx);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(200).json(result);
    } catch (err) {
        if (err instanceof DocError) return res.status(err.status).json({ success: false, code: err.code, error: err.message });
        console.error(`[API/SHARED-DOC] ${action} failed:`, err);
        return res.status(500).json({ success: false, code: 'SERVER', error: 'Something went wrong. Please try again.' });
    }
};

// For tests.
export const _internal = { actions: ACTIONS };
