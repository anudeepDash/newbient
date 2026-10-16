// Offline checks for api/_lib/passes.js and api/_lib/community.js.
// In-memory Firestore, fake Storage, fake SMTP, fake Meta API. No network, no Firebase.
//
//   node scripts/dev/passes-test/passes.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FakeDb, fakeBucket } from './fakeFirestore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// Never talk to a real project from a test.
delete process.env.FIREBASE_PRIVATE_KEY;
delete process.env.FIREBASE_CLIENT_EMAIL;
process.env.LINK_SIGNING_SECRET = 'test-secret-test-secret-test-secret';
process.env.PUBLIC_APP_URL = 'https://app.newbi.live';
process.env.WHATSAPP_ACCESS_TOKEN = 'fake';
process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
process.env.WHATSAPP_TEMPLATE_CAMPAIGN_TICKET = 'campaign_ticket';
process.env.WHATSAPP_TEMPLATE_CAMPAIGN_TICKET_LINK = 'campaign_ticket_link';
process.env.WHATSAPP_TEMPLATE_PASS_CONFIRMED = 'pass_confirmed';
process.env.SMTP_USER = 'fake@newbi.live';
process.env.SMTP_PASS = 'fake';

const { setDbForTests } = await import(`${ROOT}/api/_lib/db.js`);
const db = new FakeDb();
setDbForTests(db);
const { setTransportForTests } = await import(`${ROOT}/api/_lib/mail/transport.js`);
const { setWhatsAppFetchForTests } = await import(`${ROOT}/api/_lib/whatsapp.js`);
const passes = await import(`${ROOT}/api/_lib/passes.js`);
const community = await import(`${ROOT}/api/_lib/community.js`);
const events = await import(`${ROOT}/api/_lib/mail/events.js`);
const bucket = fakeBucket();
passes.setStorageForTests(bucket);

const mails = [];
setTransportForTests({ sendMail: async (m) => { mails.push(m); return { messageId: `m${mails.length}` }; } });
const waCalls = [];
let waFailNext = 0;
setWhatsAppFetchForTests(async (url, init) => {
    const body = JSON.parse(init.body);
    waCalls.push(body);
    if (waFailNext > 0) { waFailNext -= 1; return { ok: false, status: 500, json: async () => ({ error: { message: 'Meta down', code: 1 } }) }; }
    return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${waCalls.length}` }] }) };
});

const A = passes._internal.actions;
const C = community._internal.actions;
const user = (uid, extra = {}) => ({ uid, email: `${uid}@ex.com`, staff: false, token: { uid, email: `${uid}@ex.com`, ...extra } });
const staff = { uid: 'staff1', email: 'staff@newbi.live', staff: true, token: { uid: 'staff1', email: 'staff@newbi.live' } };
const expectErr = async (p, code) => { try { await p; assert.fail(`expected ${code}`); } catch (e) { assert.equal(e.code, code, e.message); return e; } };
const doc = (path) => db.store.get(path);
let n = 0;
const ok = (msg) => console.log(`  ✓ ${++n}. ${msg}`);

// ---- seed ----
const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const past = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
await db.doc('upcoming_events/ev1').set({ title: 'Varun Jain Live', date: future, location: 'Hard Rock Cafe', city: 'Bengaluru', isGuestlistEnabled: true, image: 'https://res.cloudinary.com/x/image/upload/p.jpg' });
await db.doc('upcoming_events/evPast').set({ title: 'Old show', date: past, isGuestlistEnabled: true });
await db.doc('guestlists/glSmall').set({ title: 'Tiny list', date: future, status: 'Open', maxSpots: 1, currentSpots: 0 });
await db.doc('guestlists/glTask').set({ title: 'Task list', date: future, status: 'Open', hasGuestlistTask: true, guestlistTask: { title: 'Share a reel', requireLink: true, allowFileUpload: false, allowText: false } });
await db.doc('users/u1').set({ name: 'Asha Rao', email: 'asha@ex.com', phone: '+919876543210', phoneVerified: true });
await db.doc('users/u2').set({ name: 'Ben', email: 'ben@ex.com', phone: '+919811111111', phoneVerified: true });
await db.doc('users/u3').set({ name: 'No Phone', email: 'np@ex.com' });

console.log('Guestlists (Flow 1)');
const info = await A.guestlist(db, { id: 'ev1' }, user('u1'));
assert.equal(info.guestlist.title, 'Varun Jain Live'); assert.equal(info.guestlist.open, true); assert.equal(info.guestlist.me, null);
assert.equal(info.guestlist.raw, undefined);
ok('public view of an event with its guestlist on (no list doc yet)');

const past1 = await A.guestlist(db, { id: 'evPast' }, user('u1'));
assert.equal(past1.guestlist.past, true); assert.equal(past1.guestlist.open, false);
await expectErr(A['register-guestlist'](db, { guestlistId: 'evPast' }, user('u1')), 'CLOSED');
ok('past events are not open and refuse registration');

const e3 = await expectErr(A['register-guestlist'](db, { guestlistId: 'ev1' }, user('u3')), 'PROFILE_INCOMPLETE');
assert.deepEqual(e3.extra.missing, ['phoneVerified']);
ok('missing verified phone → PROFILE_INCOMPLETE with only the missing field');

mails.length = 0;
const r1 = await A['register-guestlist'](db, { guestlistId: 'ev1', guests: 1 }, user('u1'));
assert.equal(r1.status, 'issued'); assert.equal(r1.ref.length, 10);
const p1 = doc(`passes/${r1.ref}`);
assert.equal(p1.source, 'guestlist'); assert.equal(p1.holderUid, 'u1'); assert.equal(p1.eventId, 'ev1'); assert.equal(p1.status, 'issued');
assert.equal(doc('guestlists/ev1').currentSpots, 1);
assert.equal(doc(`pass_keys/guestlist_ev1_u1`).ref, r1.ref);
assert.equal(mails.length, 1); assert.match(mails[0].html, new RegExp(`/p/${r1.ref}`));
assert.equal(p1.delivery.email.status, 'sent');
ok('register → entry + pass (10-char ref) + list counter + pass-confirmed email linking /p/REF');

const entries = db.dump('guestlists/ev1/entries/');
assert.equal(entries.length, 1); assert.equal(entries[0][1].passRef, r1.ref); assert.ok(entries[0][1].mail?.passConfirmedAt);
const dup = await A['register-guestlist'](db, { guestlistId: 'ev1' }, user('u1'));
assert.equal(dup.duplicate, true); assert.equal(dup.ref, r1.ref);
assert.equal(db.dump('guestlists/ev1/entries/').length, 1); assert.equal(mails.length, 1);
ok('registering twice returns the same pass, no second entry or email');

const me = await A.guestlist(db, { id: 'ev1' }, user('u1'));
assert.equal(me.guestlist.me.ref, r1.ref);
ok('guestlist view shows your own pass');

await A['register-guestlist'](db, { guestlistId: 'glSmall' }, user('u1'));
await expectErr(A['register-guestlist'](db, { guestlistId: 'glSmall' }, user('u2')), 'FULL');
ok('capacity is checked in the transaction');

await expectErr(A['register-guestlist'](db, { guestlistId: 'glTask' }, user('u2')), 'TASK_REQUIRED');
const rt = await A['register-guestlist'](db, { guestlistId: 'glTask', taskSubmission: { link: 'https://instagram.com/reel/x' } }, user('u2'));
assert.equal(rt.status, 'pending'); assert.equal(doc(`passes/${rt.ref}`), undefined);
ok('a guestlist task is required, and review lists stay pending with no pass yet');

const [[taskEntryPath]] = db.dump('guestlists/glTask/entries/');
await db.doc(taskEntryPath).update({ status: 'approved' });
const ev = await events.handleEvent('pass-confirmed', { guestlistId: 'glTask', entryId: taskEntryPath.split('/').pop() }, { uid: 'staff1', staff: true, email: 'staff@newbi.live' });
assert.equal(ev.status, 200, JSON.stringify(ev.body));
const approvedPass = doc(`passes/${rt.ref}`);
assert.equal(approvedPass.source, 'guestlist'); assert.equal(approvedPass.holderUid, 'u2');
ok('admin approval (existing pass-confirmed event) issues the pass with the reserved ref');

const pub = await A.get(db, { ref: r1.ref }, user('someoneElse'));
assert.equal(pub.pass.holderName, 'Asha'); assert.equal(pub.pass.isHolder, undefined);
const full = await A.get(db, { ref: r1.ref }, user('u1'));
assert.equal(full.pass.holderName, 'Asha Rao'); assert.equal(full.pass.isHolder, true);
ok('pass view: first name only for others, full for the holder');

console.log('Gate scanner');
const c1 = await A.checkin(db, { code: r1.ref, eventId: 'ev1', guestlistIds: ['ev1'] }, staff);
assert.equal(c1.reason, 'admitted');
const c2 = await A.checkin(db, { code: `https://app.newbi.live/p/${r1.ref}`, eventId: 'ev1', guestlistIds: ['ev1'] }, staff);
assert.equal(c2.reason, 'already');
assert.equal(db.dump('guestlists/ev1/entries/')[0][1].attended, true);
const c3 = await A.checkin(db, { code: r1.ref, eventId: 'other', guestlistIds: [] }, staff);
assert.equal(c3.reason, 'wrong_event');
const c4 = await A.checkin(db, { code: 'NB-ZZZZZ', eventId: 'ev1' }, staff);
assert.equal(c4.found, false);
await expectErr(A.checkin(db, { code: r1.ref, eventId: 'ev1' }, user('u1')), 'FORBIDDEN');
ok('check-in: admitted once, then already (pass link accepted), wrong event, unknown → legacy path, staff only');

console.log('Campaign tickets (Flow 2)');
await db.doc('campaigns/camp1').set({ title: 'Jazba Promo', eventId: 'ev1', ticketsPerCreator: 2 });
await db.doc('creators/cr1').set({ uid: 'cu1', name: 'Kiran', email: 'kiran@ex.com', phone: '9822222222', isPhoneVerified: true, shortlistedCampaigns: ['camp1'], joinedCampaigns: ['camp1'] });
await db.doc('creators/cr2').set({ uid: 'cu2', name: 'Lata', email: 'lata@ex.com', joinedCampaigns: ['camp1'] });
await db.doc('creators/randomId3').set({ name: 'Old Profile', email: 'old@ex.com', phone: '9833333333', isPhoneVerified: true, campaignStages: { camp1: 'shortlisted' }, joinedCampaigns: ['camp1'] });

await expectErr(A['issue-campaign'](db, { campaignId: 'camp1', creatorIds: ['cr1'] }, user('u1')), 'FORBIDDEN');
mails.length = 0; waCalls.length = 0; waFailNext = 1;
const ic = await A['issue-campaign'](db, { campaignId: 'camp1', creatorIds: ['cr1', 'cr2', 'randomId3'] }, staff);
const byId = Object.fromEntries(ic.results.map(r => [r.creatorId, r]));
assert.equal(byId.cr1.outcome, 'issued'); assert.equal(byId.cr2.outcome, 'skipped'); assert.equal(byId.randomId3.outcome, 'issued');
const cp = doc(`passes/${byId.cr1.ref}`);
assert.equal(cp.source, 'campaign'); assert.equal(cp.sourceId, 'camp1'); assert.equal(cp.qty, 2); assert.equal(cp.qr, true); assert.equal(cp.holderUid, 'cu1');
assert.equal(cp.event.title, 'Varun Jain Live');
assert.equal(doc(`passes/${byId.randomId3.ref}`).holderUid, 'randomId3');
ok('issue-campaign: selected and shortlisted creators get a QR pass for the linked event; others are skipped');

assert.equal(mails.length, 2);
const waToKiran = waCalls.filter(c => c.to === '919822222222');
assert.equal(waToKiran.length, 1); assert.equal(waToKiran[0].template.name, 'campaign_ticket_link');
assert.equal(cp.delivery.email.status, 'sent');
const failedOne = [cp, doc(`passes/${byId.randomId3.ref}`)].find(p => ['retrying', 'failed'].includes(p.delivery?.whatsapp?.status));
assert.ok(failedOne, 'one WhatsApp failed'); assert.equal(failedOne.delivery.email.status, 'sent');
assert.ok(db.dump('notifications/').some(([, v]) => v.userId === 'cu1' && v.link === 'https://app.newbi.live/c/camp1'));
ok('three channels: email + in-app sent even when WhatsApp fails (WhatsApp marked for retry)');

const again = await A['issue-campaign'](db, { campaignId: 'camp1', creatorIds: ['cr1'] }, staff);
assert.equal(again.results[0].outcome, 'skipped'); assert.match(again.results[0].error, /Already/);
ok('a creator never gets two passes for the same campaign');

console.log('Official tickets (CSV upload)');
await expectErr(A['upload-pdf'](db, { campaignId: 'camp1', creatorId: 'cr1', filename: 'x.pdf', data: Buffer.from('hello').toString('base64') }, staff), 'VALIDATION');
const pdf = Buffer.from('%PDF-1.4\n% fake ticket\n%%EOF');
const up = await A['upload-pdf'](db, { campaignId: 'camp1', creatorId: 'cr1', filename: 'Kiran Ticket.pdf', data: pdf.toString('base64') }, staff);
assert.match(up.storagePath, /^tickets\/camp1\/cu1\/.+-Kiran-Ticket\.pdf$/); assert.equal(up.size, pdf.length);
ok('PDF upload: checks it is a PDF, stores it privately at tickets/{campaignId}/{uid}/');

const log = await A['upload-start'](db, { campaignId: 'camp1', totals: { rows: 3, matched: 2, unmatched: 1 }, fileName: 'tickets.csv' }, staff);
mails.length = 0; waCalls.length = 0;
const ex = await A['issue-campaign-external'](db, { campaignId: 'camp1', uploadId: log.uploadId, rows: [
    { row: 2, creatorId: 'cr1', kind: 'pdf', storagePath: up.storagePath, filename: up.filename, size: up.size, qty: 1, tier: 'VIP' },
    { row: 3, creatorId: 'cr2', kind: 'link', url: 'https://tickets.example/abc', note: 'Gate 2' },
    { row: 4, creatorId: 'cr2', kind: 'link', url: 'http://insecure' },
    { row: 5, creatorId: 'cr1', kind: 'pdf', storagePath: 'tickets/otherCampaign/x.pdf' },
] }, staff);
const rows = Object.fromEntries(ex.results.map(r => [r.row, r]));
assert.equal(rows[2].outcome, 'updated'); assert.equal(rows[3].outcome, 'issued'); assert.equal(rows[4].outcome, 'failed'); assert.equal(rows[5].outcome, 'failed');
const kp = doc(`passes/${rows[2].ref}`);
assert.equal(kp.externalTicket.kind, 'pdf'); assert.equal(kp.qr, true); assert.equal(kp.tier, 'VIP');
const lp = doc(`passes/${rows[3].ref}`);
assert.equal(lp.qr, false); assert.equal(lp.externalTicket.url, 'https://tickets.example/abc');
ok('external tickets: PDF added to an existing pass, link creates a partner-only pass, bad link / foreign path refused');

const kiranMail = mails.find(m => m.to.includes('kiran@ex.com'));
assert.equal(kiranMail.attachments.length, 1); assert.equal(kiranMail.attachments[0].contentType, 'application/pdf');
const waDoc = waCalls.find(c => c.to === '919822222222');
assert.equal(waDoc.template.name, 'campaign_ticket');
const header = waDoc.template.components.find(c => c.type === 'header');
assert.match(header.parameters[0].document.link, /^https:\/\/storage\.example\/tickets/);
const button = waDoc.template.components.find(c => c.type === 'button');
assert.ok(button.parameters[0].text.includes('.'));
ok('email has the PDF attached; WhatsApp sends the PDF as the document header plus the /t/<token> button');

const ul = doc(`ticket_uploads/${log.uploadId}`);
assert.equal(ul.counts.updated, 1); assert.equal(ul.counts.issued, 1); assert.equal(ul.counts.failed, 2); assert.equal(ul.channels.email.sent, 2);
ok('every upload is logged in ticket_uploads with counts per outcome and channel');

mails.length = 0;
const ex2 = await A['issue-campaign-external'](db, { campaignId: 'camp1', rows: [
    { row: 2, creatorId: 'cr1', kind: 'pdf', storagePath: up.storagePath, filename: up.filename, size: up.size, qty: 1, tier: 'VIP' },
    { row: 3, creatorId: 'cr2', kind: 'link', url: 'https://tickets.example/abc-corrected', note: 'Gate 2' },
] }, staff);
assert.deepEqual(ex2.results.map(r => r.outcome).sort(), ['unchanged', 'updated']);
assert.equal(mails.length, 1);
ok('re-uploading a corrected CSV only resends the rows that changed');

await expectErr(A.file(db, { ref: rows[2].ref }, user('u1')), 'FORBIDDEN');
const f1 = await A.file(db, { ref: rows[2].ref }, user('cu1'));
assert.equal(f1.kind, 'pdf'); assert.match(f1.url, /storage\.example/);
const token = button.parameters[0].text;
const viaToken = await A['open-token'](db, { token });
assert.equal(viaToken.pass.ref, rows[2].ref); assert.equal(viaToken.pass.externalTicket.kind, 'pdf'); assert.equal(viaToken.pass.isHolder, true);
const f2 = await A.file(db, { token }, user(null));
assert.equal(f2.kind, 'pdf');
await expectErr(A['open-token'](db, { token: `${token}x` }), 'EXPIRED');
ok('ticket file: holder or signed /t/ token only; tampered tokens refused');

const ck = await A.checkin(db, { code: rows[3].ref, eventId: 'ev1' }, staff);
assert.equal(ck.reason, 'rejected'); assert.match(ck.message, /partner/);
const ck2 = await A.checkin(db, { code: rows[2].ref, eventId: 'ev1' }, staff);
assert.equal(ck2.reason, 'admitted'); assert.equal(ck2.data.type, 'Creator ticket');
ok('scanner: creator QR passes admitted; partner-only tickets are not valid at the Newbi gate');

await db.doc(`passes/${byId.randomId3.ref}`).set({ delivery: { whatsapp: { status: 'failed', error: 'Invalid number' } } }, { merge: true });
mails.length = 0; waCalls.length = 0;
const rs = await A.resend(db, { campaignId: 'camp1', failedOnly: true }, staff);
assert.equal(rs.results.length, 1); assert.equal(rs.results[0].ref, byId.randomId3.ref);
assert.equal(mails.length, 0, 'email already sent: not resent'); assert.equal(waCalls.length, 1);
ok('resend failures: only the failed channel goes out again');

await A.revoke(db, { ref: byId.randomId3.ref }, staff);
assert.equal(doc(`passes/${byId.randomId3.ref}`).status, 'revoked');
assert.equal(doc('pass_keys/campaign_camp1_randomId3'), undefined);
const reissue = await A['issue-campaign'](db, { campaignId: 'camp1', creatorIds: ['randomId3'] }, staff);
assert.equal(reissue.results[0].outcome, 'issued'); assert.notEqual(reissue.results[0].ref, byId.randomId3.ref);
ok('revoke frees the slot; reissue makes a new pass');

await A.revoke(db, { ref: r1.ref }, staff);
const ck3 = await A.checkin(db, { code: r1.ref, eventId: 'ev1' }, staff);
assert.equal(ck3.reason, 'rejected');
const reReg = await A['register-guestlist'](db, { guestlistId: 'ev1' }, user('u1'));
assert.equal(reReg.status, 'issued'); assert.notEqual(reReg.ref, r1.ref);
ok('revoked guestlist pass is refused at the gate and the person can register again');

console.log('Orders');
await db.doc('ticket_orders/o1').set({ eventId: 'ev1', bookingRef: 'NB-ABC12', status: 'approved', customerName: 'Paid Person', customerEmail: 'paid@ex.com', items: [{ name: 'GA', count: 2, price: 500 }], totalAmount: 1000, userId: 'u9' });
await events.sendOrderEmail('o1');
const op = doc('passes/NB-ABC12');
assert.equal(op.source, 'order'); assert.equal(op.qty, 2);
const oc = await A.checkin(db, { code: 'NB-ABC12', eventId: 'ev1' }, staff);
assert.equal(oc.reason, 'admitted'); assert.equal(doc('ticket_orders/o1').isScanned, true);
ok('confirmed paid orders also get a pass under their existing booking code; scanning marks the order');

console.log('Community');
await db.doc('giveaways/g1').set({ name: 'Win VIP', slug: 'win-vip', endDate: future, tasks: [{ id: 't1', type: 'instagram', label: 'Follow us', entryScore: 2, config: { url: 'https://instagram.com/newbi' } }, { id: 't2', type: 'link', label: 'Visit', entryScore: 1, config: { url: '' } }], question: 'Why you?' });
const gv = await C.giveaway(db, { slug: 'win-vip' }, user('u1'));
assert.equal(gv.giveaway.id, 'g1'); assert.equal(gv.giveaway.me, null);
await expectErr(C.giveaway(db, { slug: 'nope' }, user('u1')), 'NOT_FOUND');
const e1 = await expectErr(C['giveaway-enter'](db, { giveawayId: 'g1', answer: 'x' }, user('u1')), 'PROFILE_INCOMPLETE');
assert.deepEqual(e1.extra.missing, ['city']);
await expectErr(C['giveaway-enter'](db, { giveawayId: 'g1', city: 'Pune' }, user('u1')), 'VALIDATION');
const en = await C['giveaway-enter'](db, { giveawayId: 'g1', city: 'Pune', answer: 'Because', entryScore: 999 }, user('u1'));
assert.equal(en.entry.entryScore, 1);
ok('giveaway: unknown slug 404, only missing city asked, question required, client score ignored');

await expectErr(C['giveaway-enter'](db, { giveawayId: 'g1', city: 'Pune', answer: 'x' }, user('u1')), 'DUPLICATE');
await expectErr(C['giveaway-task'](db, { giveawayId: 'g1', taskId: 't1' }, user('u1')), 'VALIDATION');
const t1 = await C['giveaway-task'](db, { giveawayId: 'g1', taskId: 't1', instagram: 'asha.r' }, user('u1'));
assert.equal(t1.entry.entryScore, 3);
const t1b = await C['giveaway-task'](db, { giveawayId: 'g1', taskId: 't1', instagram: 'asha.r' }, user('u1'));
assert.equal(t1b.entry.entryScore, 3);
await expectErr(C['giveaway-task'](db, { giveawayId: 'g1', taskId: 'made-up' }, user('u1')), 'VALIDATION');
ok('tasks score once each, only tasks the giveaway defines');

const ref = en.entry.referralCode;
await C['giveaway-enter'](db, { giveawayId: 'g1', city: 'Pune', answer: 'me too', referredBy: ref }, user('u2'));
assert.equal(doc('giveaway_entries/g1_u1').referralCount, 1); assert.equal(doc('giveaway_entries/g1_u1').entryScore, 6);
const sp = await C['giveaway-spin'](db, { giveawayId: 'g1' }, user('u1'));
assert.ok([1, 2, 5].includes(sp.reward.points)); assert.equal(sp.entry.entryScore, 6 + sp.reward.points);
await expectErr(C['giveaway-spin'](db, { giveawayId: 'g1' }, user('u1')), 'DUPLICATE');
ok('referral +3 and one server-side spin, all recomputed by the same rule');

await db.doc('volunteer_gigs/gig1').set({ title: 'Backstage crew' });
const gi = await C['gig-interest'](db, { gigId: 'gig1' }, user('u1'));
assert.equal(gi.alreadyInterested, false); assert.equal(doc('gig_applications/gig1_u1').status, 'interested'); assert.equal(doc('volunteer_gigs/gig1').interestedCount, 1);
const gi2 = await C['gig-interest'](db, { gigId: 'gig1' }, user('u1'));
assert.equal(gi2.alreadyInterested, true); assert.equal(doc('volunteer_gigs/gig1').interestedCount, 1);
ok("gig \"I'm interested\" saves gig_applications/{gigId_uid} once");

console.log(`\nAll ${n} checks passed.`);
