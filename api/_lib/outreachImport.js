/**
 * Outreach → Import: adds creators from a sheet to a campaign as applications,
 * so the team can reach numbers that never filled the form (a Google Form from
 * before, a college list, DMs). They start as applicants (or straight on the
 * shortlist, which the browser asks for afterwards through outreach-status).
 *
 * WhatsApp only allows messages to people who agreed to hear from Newbi, so
 * the team confirms where the numbers came from; that note is kept as their
 * consent record. Numbers that said STOP stay opted out.
 *
 * Action: outreach-import { campaignId, rows: [{ fullName, phone, instagramHandle, followerCount, city, email,
 *         collegeOrEmployer, category, agreedAmount }], consentNote, purpose? }
 *   → { added: [appId], existing: [{ line, appId }], invalid: [{ line, problem }], matched: [appId] }
 *
 * purpose 'payout' (Payouts → Add from a sheet): the people to pay. New numbers are added straight onto the
 * shortlist (addedVia payout_sheet), numbers already on the campaign are matched and moved onto the shortlist
 * if they weren't (not if they were removed), and an Amount column is kept as agreedAmount for "Mark paid".
 * Nothing is sent: the browser then asks them for payout details if the team chose to.
 */
import { nowIso } from './db.js';
import { contactIdFor } from './outreachQueue.js';
import { cleanImportRow, MAX_IMPORT_ROWS } from '../../src/lib/outreach/importSheet.js';
import { tierFor } from '../../src/lib/outreach/application.js';
import { isOnShortlist } from '../../src/lib/outreach/status.js';
import { firstNameOf } from '../../src/lib/outreach/normalize.js';

const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);

export const IMPORT_CONSENT_PREFIX = 'Imported by the Newbi team. Where the number came from: ';
export const PAYOUT_SHEET_NOTE = 'Payout sheet: creators the team approved for this campaign, to be paid';

export const handleImport = async (req, res, { db, actor, now = nowIso() }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const consentNote = str(b.consentNote, 300);
    const rows = Array.isArray(b.rows) ? b.rows.slice(0, MAX_IMPORT_ROWS + 1) : [];
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });
    if (!rows.length) return send(res, 400, { success: false, error: 'There are no rows to import.' });
    if (rows.length > MAX_IMPORT_ROWS) return send(res, 400, { success: false, error: `Up to ${MAX_IMPORT_ROWS} rows at a time.` });
    const forPayout = b.purpose === 'payout';
    if (!forPayout && consentNote.length < 3) return send(res, 400, { success: false, field: 'consentNote', error: 'Say where these numbers came from.' });
    const note = forPayout ? PAYOUT_SHEET_NOTE : consentNote;

    const campRef = db.collection('campaigns').doc(campaignId);
    const campSnap = await campRef.get();
    if (!campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const campaign = campSnap.data();
    const batchId = `imp_${Date.now().toString(36)}`;
    const keys = campRef.collection('application_keys');

    const added = [];
    const existing = [];
    const invalid = [];
    const toMatch = [];
    const seen = new Set();
    // Clean every row first; then look up which numbers and handles the campaign already has.
    const clean = rows.map((raw, i) => ({ line: Number(raw?.line) || i + 1, ...cleanImportRow(raw || {}) }));
    const usable = clean.filter((r) => {
        if (r.problem) { invalid.push({ line: r.line, problem: r.problem }); return false; }
        if (seen.has(r.value.phone)) { invalid.push({ line: r.line, problem: 'Same number twice in the sheet' }); return false; }
        seen.add(r.value.phone);
        return true;
    });

    for (let start = 0; start < usable.length; start += 100) {
        const chunk = usable.slice(start, start + 100);
        const lookups = await Promise.all(chunk.map(r => Promise.all([
            keys.doc(`p:${r.value.phone}`).get(),
            r.value.instagramHandle ? keys.doc(`ig:${r.value.instagramHandle}`).get() : null,
            db.collection('creator_contacts').doc(contactIdFor(r.value.phone)).get(),
        ])));
        const batch = db.batch();
        let writes = 0;
        chunk.forEach((r, i) => {
            const [pk, hk, contactSnap] = lookups[i];
            if (pk.exists) {
                existing.push({ line: r.line, appId: pk.data().appId });
                if (forPayout) toMatch.push({ line: r.line, appId: pk.data().appId, agreedAmount: r.value.agreedAmount });
                return;
            }
            const v = r.value;
            const appRef = campRef.collection('applications').doc();
            const dupOf = hk?.exists ? hk.data().appId : null;
            batch.set(appRef, {
                ...v,
                firstName: firstNameOf(v.fullName) || null,
                fullName: v.fullName || (v.instagramHandle ? `@${v.instagramHandle}` : 'Unnamed creator'),
                tier: v.followerCount !== null ? tierFor(v.followerCount, campaign.perksByTier) : null,
                registeredNewbiCreator: false,
                campaignId,
                contactId: contactIdFor(v.phone),
                creatorId: null,
                uid: null,
                status: forPayout ? 'shortlisted' : 'applied',
                ...(forPayout ? { statusUpdatedAt: now, statusUpdatedBy: actor.actorEmail || null, shortlistedAt: now, shortlistedBy: actor.actorEmail || null, addedVia: 'payout_sheet' } : {}),
                source: 'import',
                importBatch: batchId,
                importedAt: now,
                importedBy: actor.actorEmail || null,
                consentAt: now,
                consentText: `${IMPORT_CONSENT_PREFIX}${note}`,
                submitCount: 0,
                firstSubmittedAt: now,
                lastSubmittedAt: now,
                updatedAt: now,
                ...(dupOf ? { possibleDuplicateOf: dupOf } : {}),
            });
            batch.set(keys.doc(`p:${v.phone}`), { appId: appRef.id });
            if (v.instagramHandle && !dupOf) batch.set(keys.doc(`ig:${v.instagramHandle}`), { appId: appRef.id });
            // Their contact record: replies on WhatsApp find this campaign through it. An earlier STOP is kept.
            batch.set(db.collection('creator_contacts').doc(contactIdFor(v.phone)), {
                phone: v.phone,
                campaignIds: [...new Set([...(contactSnap.exists ? contactSnap.data().campaignIds || [] : []), campaignId])],
                importConsent: { via: forPayout ? 'payout_sheet' : 'import', note, campaignId, by: actor.actorEmail || null, at: now },
                updatedAt: now,
            }, { merge: true });
            writes += 3;
            added.push(appRef.id);
        });
        if (writes) await batch.commit();
    }

    // A payout sheet: people already on the campaign are the ones to pay, so they go onto the shortlist too.
    const matched = [];
    for (const m of toMatch) {
        const ref = campRef.collection('applications').doc(m.appId);
        const outcome = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) return 'gone';
            const app = snap.data();
            const from = app.status || 'applied';
            if (from === 'removed') return 'removed';
            const patch = { updatedAt: now, ...(m.agreedAmount ? { agreedAmount: m.agreedAmount } : {}) };
            if (!isOnShortlist(from)) {
                Object.assign(patch, { status: 'shortlisted', statusUpdatedAt: now, statusUpdatedBy: actor.actorEmail || null, shortlistedAt: now, shortlistedBy: actor.actorEmail || null });
                tx.set(campRef.collection('audit').doc(), { appId: m.appId, field: 'status', from, to: 'shortlisted', source: 'import', note: 'On the payout sheet', ...actor, at: now });
            }
            tx.update(ref, patch);
            return 'ok';
        });
        if (outcome === 'ok') matched.push(m.appId);
        else invalid.push({ line: m.line, problem: outcome === 'removed' ? 'Removed from this campaign' : 'No longer on this campaign' });
    }

    if (added.length) {
        await campRef.collection('audit').doc().set({
            appId: null, field: 'import', from: null, to: `${added.length} added`, source: 'import',
            note: forPayout ? `Added ${added.length} from a payout sheet` : `Imported ${added.length} from a sheet (${consentNote})`, ...actor, at: now,
        });
    }
    return send(res, 200, { success: true, added, existing, invalid, matched, batchId });
};
