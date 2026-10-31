/**
 * The campaign's open payout form: one link for everyone on a campaign,
 * including approved creators who never applied on the website. Anyone with
 * the link sends their name, WhatsApp number, Instagram and a UPI ID or bank
 * account; it lands in Outreach → Payouts for the team to check and pay.
 *
 * Nothing a stranger sends touches an application or Finance on its own: a
 * submission waits until an admin adds it to payouts (a new approved
 * creator, or the matching application by phone or handle). So nobody can
 * redirect someone else's payout by typing their number.
 *
 *   public  outreach-payout-form         { token }                       → campaign title/image, open?
 *   public  outreach-payout-form-submit  { token, fullName, phone, instagramHandle, email?, mode, upiId | name+accountNumber+ifsc }
 *   admin   outreach-payout-form-admin   { campaignId, op: 'get' | 'enable' | 'disable' | 'reset' | 'accept' | 'dismiss', submissionId?, appId? }
 *
 * Data:
 *   campaigns/{id}/private/outreach.payoutForm      { enabled, version, updatedAt, updatedBy }
 *   campaigns/{id}/payout_submissions/{p_<digits>}  one per phone; sending again replaces it and asks for a fresh check
 */
import { nowIso } from './db.js';
import { makeSignedToken, readSignedToken } from './linkSign.js';
import { syncCreatorPayee } from './outreachDeliver.js';
import { contactIdFor } from './outreachQueue.js';
import { validatePayoutDetails, hasPayoutDetails } from '../../src/lib/outreach/deliverables.js';
import { normalizePhone, normalizeHandle, normalizeEmail, maskPhone } from '../../src/lib/outreach/normalize.js';
import { isOnShortlist } from '../../src/lib/outreach/status.js';

const APP_URL = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');
const FORM_TTL = 60 * 60 * 24 * 365;
export const PAYOUT_FORM_CONSENT = 'Newbi can message me on WhatsApp about this payment.';

const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const appsPath = (campaignId) => `campaigns/${campaignId}/applications`;
const privateRef = (db, campaignId) => db.collection('campaigns').doc(campaignId).collection('private').doc('outreach');
const subsRef = (db, campaignId) => db.collection('campaigns').doc(campaignId).collection('payout_submissions');
const auditRef = (db, campaignId) => db.collection('campaigns').doc(campaignId).collection('audit').doc();

/* The form's link. Resetting bumps the version, so older links stop working. */
export const payoutFormToken = (campaignId, version = 1) => makeSignedToken({ k: 'pf', c: campaignId, v: version }, FORM_TTL);
export const payoutFormUrlFor = (campaignId, version = 1) => {
    const token = payoutFormToken(campaignId, version);
    return token ? `${APP_URL}/pay/c/${token}` : '';
};

/** The campaign behind a form link while the form is on, or null. */
const fromFormToken = async (db, token) => {
    const p = readSignedToken(str(token, 2000));
    if (!p || p.k !== 'pf' || !p.c) return null;
    const campRef = db.collection('campaigns').doc(String(p.c));
    const [campSnap, privSnap] = await Promise.all([campRef.get(), privateRef(db, campRef.id).get()]);
    const form = privSnap.exists ? privSnap.data().payoutForm : null;
    if (!campSnap.exists || !form?.enabled || Number(form.version || 1) !== Number(p.v || 1)) return null;
    return { campaignId: campRef.id, campaign: campSnap.data(), campRef };
};

/** → { ok, value, errors }: who they are, and where to pay them. */
export const validatePayoutFormEntry = (input = {}) => {
    const errors = {};
    const fullName = String(input.fullName || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (fullName.length < 2) errors.fullName = 'Enter your full name.';
    const phone = normalizePhone(input.phone);
    if (!phone) errors.phone = 'Enter your WhatsApp number, like 98765 43210.';
    const instagramHandle = normalizeHandle(input.instagramHandle);
    if (!instagramHandle) errors.instagramHandle = 'Enter your Instagram handle.';
    const rawEmail = String(input.email || '').trim();
    const email = rawEmail ? normalizeEmail(rawEmail) : '';
    if (rawEmail && !email) errors.email = 'Check your email address.';
    const details = validatePayoutDetails(input);
    Object.assign(errors, details.errors);
    return { ok: Object.keys(errors).length === 0, value: { fullName, phone, instagramHandle, email: email || '', details: details.value }, errors };
};

/* The application with this phone or handle on this campaign, if any. */
const findMatch = async (db, campaignId, { phone, instagramHandle }) => {
    const keys = db.collection('campaigns').doc(campaignId).collection('application_keys');
    for (const key of [`p:${phone}`, `ig:${instagramHandle}`]) {
        const snap = await keys.doc(key).get();
        const appId = snap.exists ? snap.data().appId : null;
        if (!appId) continue;
        const appSnap = await db.collection(appsPath(campaignId)).doc(appId).get();
        if (appSnap.exists) return { appId, by: key.startsWith('p:') ? 'phone' : 'instagram' };
    }
    return null;
};

/* ── Public ───────────────────────────────────────────────────────────── */

export const handlePayoutFormView = async (req, res, { db }) => {
    const ctx = await fromFormToken(db, req.body?.token || req.query?.token);
    if (!ctx) return send(res, 404, { success: false, error: 'This link isn’t active. Ask the Newbi team for a new one.' });
    const c = ctx.campaign;
    return send(res, 200, {
        success: true,
        campaign: { title: c.title || '', artist: c.artist || '', eventDate: c.eventDate || '', image: c.image || c.coverImage || c.bannerImage || '' },
        consentText: PAYOUT_FORM_CONSENT,
    });
};

export const handlePayoutFormSubmit = async (req, res, { db, rateLimit, now = nowIso() }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const body = req.body || {};
    if (str(body.website)) return send(res, 200, { success: true });
    const ctx = await fromFormToken(db, body.token);
    if (!ctx) return send(res, 404, { success: false, error: 'This link isn’t active. Ask the Newbi team for a new one.' });
    const { ok, value, errors } = validatePayoutFormEntry(body);
    if (!ok) {
        const field = Object.keys(errors)[0];
        return send(res, 400, { success: false, code: 'invalid', errors, field, error: errors[field] });
    }
    if (rateLimit && (await rateLimit(db, req, { bucket: 'outreach-payout-form' })).limited) {
        return send(res, 429, { success: false, error: 'Too many tries from this network. Try again in a few minutes.' });
    }
    const match = await findMatch(db, ctx.campaignId, value);
    const ref = subsRef(db, ctx.campaignId).doc(`p_${value.phone.replace(/\D/g, '')}`);
    const prev = await ref.get();
    const cur = prev.exists ? prev.data() : null;
    const details = { ...value.details, upiName: value.details.mode === 'upi' ? value.details.name || null : null };
    await ref.set({
        fullName: value.fullName,
        phone: value.phone,
        instagramHandle: value.instagramHandle,
        email: value.email,
        details,
        consent: { text: PAYOUT_FORM_CONSENT, at: now },
        matchedAppId: match?.appId || null,
        matchedBy: match?.by || null,
        // Sending again always asks the team to check it again.
        status: 'new',
        appId: cur?.appId || null,
        count: (Number(cur?.count) || 0) + 1,
        createdAt: cur?.createdAt || now,
        updatedAt: now,
    });
    await auditRef(db, ctx.campaignId).set({
        appId: match?.appId || null, field: 'payout_form', from: null, to: 'submitted', source: 'payout_form',
        note: `${value.details.mode === 'bank' ? 'Bank account' : 'UPI'} from ${maskPhone(value.phone)}`, actorUid: null, actorEmail: null, at: now,
    });
    return send(res, 200, { success: true, updated: Boolean(cur) });
};

/* ── Admin ────────────────────────────────────────────────────────────── */

const formState = async (db, campaignId) => {
    const priv = await privateRef(db, campaignId).get();
    const form = (priv.exists ? priv.data().payoutForm : null) || {};
    const version = Number(form.version) || 1;
    return { enabled: Boolean(form.enabled), version, url: form.enabled ? payoutFormUrlFor(campaignId, version) : '', updatedAt: form.updatedAt || null, updatedBy: form.updatedBy || null };
};

const listSubmissions = async (db, campaignId) => {
    const snap = await subsRef(db, campaignId).get();
    const apps = db.collection(appsPath(campaignId));
    const out = [];
    for (const d of snap.docs) {
        const s = d.data();
        const target = s.appId || s.matchedAppId;
        const appSnap = target ? await apps.doc(target).get() : null;
        const a = appSnap?.exists ? appSnap.data() : null;
        out.push({
            id: d.id, ...s,
            match: a ? { appId: target, fullName: a.fullName || '', status: a.status || 'applied', hasDetails: hasPayoutDetails(a.payoutDetails), paid: a.payout?.status === 'paid' } : null,
        });
    }
    return out.sort((x, y) => String(y.updatedAt || '').localeCompare(String(x.updatedAt || '')));
};

/*
 * Adds a submission to payouts: onto the application it matches (moving it
 * onto the shortlist if it wasn't), or as a new approved creator. Their
 * details then show in Payouts and as a Vendor payee in Finance (Pending).
 */
const accept = async (db, campaignId, sub, subRef, { appId: chosen, actor, now }) => {
    const campRef = db.collection('campaigns').doc(campaignId);
    const campSnap = await campRef.get();
    if (!campSnap.exists) return { error: 'Campaign not found.' };
    const apps = campRef.collection('applications');
    const targetId = str(chosen, 120) || sub.appId || sub.matchedAppId || null;
    let appRef;
    let app;
    if (targetId) {
        appRef = apps.doc(targetId);
        const snap = await appRef.get();
        if (!snap.exists) return { error: 'That application is gone. Add them as new instead.' };
        app = snap.data();
        if (app.payout?.status === 'paid') return { error: `${app.fullName || 'They'} are already marked paid.` };
        const patch = { payoutDetailsVia: 'payout_form', updatedAt: now };
        if (!isOnShortlist(app.status)) {
            Object.assign(patch, { status: 'shortlisted', statusUpdatedAt: now, statusUpdatedBy: actor.actorEmail || null });
            await auditRef(db, campaignId).set({ appId: targetId, field: 'status', from: app.status || 'applied', to: 'shortlisted', source: 'admin', note: 'Added from the payout form', ...actor, at: now });
        }
        if (!app.phone) patch.phone = sub.phone;
        if (!app.email && sub.email) patch.email = sub.email;
        await appRef.set(patch, { merge: true });
        app = { ...app, ...patch };
    } else {
        appRef = apps.doc();
        const contactId = contactIdFor(sub.phone);
        app = {
            campaignId, fullName: sub.fullName, phone: sub.phone, email: sub.email || '', instagramHandle: sub.instagramHandle,
            followerCount: null, tier: null, city: '', status: 'shortlisted', addedVia: 'payout_form', contactId,
            consentAt: sub.consent?.at || now, consentText: sub.consent?.text || PAYOUT_FORM_CONSENT,
            firstSubmittedAt: sub.createdAt || now, lastSubmittedAt: sub.updatedAt || now, submitCount: 1,
            statusUpdatedAt: now, statusUpdatedBy: actor.actorEmail || null, createdAt: now, updatedAt: now,
        };
        await appRef.set(app);
        const keys = campRef.collection('application_keys');
        for (const key of [`p:${sub.phone}`, `ig:${sub.instagramHandle}`]) {
            const k = await keys.doc(key).get();
            if (!k.exists) await keys.doc(key).set({ appId: appRef.id });
        }
        await auditRef(db, campaignId).set({ appId: appRef.id, field: 'status', from: null, to: 'shortlisted', source: 'admin', note: 'Added from the payout form', ...actor, at: now });
    }
    const details = { ...sub.details, updatedAt: now };
    const payeeId = await syncCreatorPayee(db, { app, campaign: campSnap.data(), campaignId, appId: appRef.id }, details, now);
    await appRef.update({ payoutDetails: { ...details, payeeId }, updatedAt: now });
    await subRef.set({ status: 'added', appId: appRef.id, addedAt: now, addedBy: actor.actorEmail || null }, { merge: true });
    await auditRef(db, campaignId).set({ appId: appRef.id, field: 'payout_details', from: null, to: 'updated', source: 'payout_form', note: `${details.mode === 'bank' ? 'Bank account' : 'UPI'}, added by the team`, ...actor, at: now });
    return { appId: appRef.id, created: !targetId };
};

export const handlePayoutFormAdmin = async (req, res, { db, actor, now = nowIso() }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });
    const op = str(b.op, 20) || 'get';
    if (!payoutFormUrlFor(campaignId)) return send(res, 503, { success: false, error: 'Links aren’t set up (LINK_SIGNING_SECRET).' });

    if (['enable', 'disable', 'reset'].includes(op)) {
        const cur = await formState(db, campaignId);
        const next = { enabled: op !== 'disable', version: op === 'reset' ? cur.version + 1 : cur.version, updatedAt: now, updatedBy: actor.actorEmail || null };
        await privateRef(db, campaignId).set({ payoutForm: next }, { merge: true });
        await auditRef(db, campaignId).set({ appId: null, field: 'payout_form', from: cur.enabled ? 'on' : 'off', to: op === 'reset' ? 'new link' : next.enabled ? 'on' : 'off', source: 'admin', note: null, ...actor, at: now });
    } else if (op === 'accept' || op === 'dismiss') {
        const subRef = subsRef(db, campaignId).doc(str(b.submissionId, 120) || 'x');
        const snap = await subRef.get();
        if (!snap.exists) return send(res, 404, { success: false, error: 'That submission is gone.' });
        if (op === 'dismiss') {
            await subRef.set({ status: 'dismissed', dismissedAt: now, dismissedBy: actor.actorEmail || null }, { merge: true });
        } else {
            const out = await accept(db, campaignId, snap.data(), subRef, { appId: b.appId, actor, now });
            if (out.error) return send(res, 409, { success: false, error: out.error });
        }
    } else if (op !== 'get') {
        return send(res, 400, { success: false, error: 'Unknown action.' });
    }
    const [form, submissions] = await Promise.all([formState(db, campaignId), listSubmissions(db, campaignId)]);
    return send(res, 200, { success: true, form, submissions });
};
