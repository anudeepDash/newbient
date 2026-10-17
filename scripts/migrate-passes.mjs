#!/usr/bin/env node
/**
 * One-time migration: copy upcoming tickets and guestlist places into passes/{ref}.
 *
 * After Phase 5 every pass the app and the gate scanner use is a passes/{ref}
 * record. Old records stay where they are and keep working; this only adds a
 * pass for the ones still ahead of us, so they show in Community → My
 * guestlists and open at /p/<ref>. Each pass keeps its existing booking code
 * as the ref, so QR codes people already have keep scanning.
 *
 * DRY RUN BY DEFAULT. It only reads and prints what it would do.
 *
 *   node scripts/migrate-passes.mjs                          # dry run
 *   node scripts/migrate-passes.mjs --report out.json        # dry run + details
 *   node scripts/migrate-passes.mjs --apply --project <id>   # writes
 *
 * Run it against the Firestore emulator or a staging project first:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-passes.mjs --project demo-newbi --apply
 *
 * Credentials: --key <service-account.json> (Firebase console → Project settings →
 * Service accounts → Generate new private key), or FIREBASE_PROJECT_ID /
 * FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY,
 * from the environment or .env.local / .env. Writing to a real project needs
 * --apply AND --project <id>.
 *
 * Copies:
 *   ticket_orders           status confirmed | approved | dispatched | attended, event today or later
 *                           → passes/{bookingRef} { source: 'order', sourceId: orderId }
 *   guestlists/{id}/entries status approved | confirmed (or attended), list's event today or later
 *                           → passes/{bookingRef} { source: 'guestlist', sourceId, entryId }
 *                             + pass_keys/guestlist_{id}_{uid} and entries.passRef
 * Skipped: past events, pending/rejected records, codes that already have a
 * pass, and codes used by two different records (listed as conflicts).
 */

import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
};
const APPLY = flag('apply');
const REPORT_PATH = option('report');
const PROJECT_ARG = option('project');
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (flag('help') || flag('h')) {
    console.log('Usage: node scripts/migrate-passes.mjs [--apply --project <id>] [--key <service-account.json>] [--report <file.json>]');
    console.log('Dry run unless --apply. Copies upcoming confirmed orders and guestlist places into passes/{ref}.');
    process.exit(0);
}

for (const file of ['.env.local', '.env']) {
    if (existsSync(file)) {
        try { process.loadEnvFile(file); } catch { /* rely on the shell env */ }
    }
}

// --key <file.json>: the service-account key downloaded from Firebase console →
// Project settings → Service accounts. Overrides the FIREBASE_* variables.
const KEY_PATH = option('key');
if (KEY_PATH) {
    let key;
    try { key = JSON.parse(readFileSync(KEY_PATH, 'utf8')); } catch (e) {
        console.error(`Couldn't read the key file ${KEY_PATH}: ${e.message}`);
        process.exit(1);
    }
    if (!key.client_email || !key.private_key) {
        console.error(`${KEY_PATH} isn't a service-account key (no client_email / private_key).`);
        process.exit(1);
    }
    if (PROJECT_ARG && key.project_id && key.project_id !== PROJECT_ARG) {
        console.error(`The key is for project ${key.project_id}, not ${PROJECT_ARG}.`);
        process.exit(1);
    }
    if (key.project_id) process.env.FIREBASE_PROJECT_ID = key.project_id;
    process.env.FIREBASE_CLIENT_EMAIL = key.client_email;
    process.env.FIREBASE_PRIVATE_KEY = key.private_key;
}


const projectId = (PROJECT_ARG || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '').trim();
if (!projectId) {
    console.error('No project id. Pass --project <id> or set FIREBASE_PROJECT_ID.');
    process.exit(1);
}
if (APPLY && !usingEmulator && !PROJECT_ARG) {
    console.error('Refusing to write without --project <id>. Run a dry run first, then pass --apply --project <id>.');
    process.exit(1);
}

const formatKey = (raw) => {
    let key = String(raw || '').trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1).trim();
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    const body = key.replace(header, '').replace(footer, '').replace(/\\n/g, '').replace(/\s+/g, '');
    return `${header}\n${body.match(/.{1,64}/g)?.join('\n') || ''}\n${footer}`;
};

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
if (!usingEmulator && !(clientEmail && privateKey)) {
    console.error('No admin key. Download one from Firebase console → Project settings → Service accounts →');
    console.error('"Generate new private key", save it outside this folder, and pass it with --key <file.json>.');
    process.exit(1);
}
const app = usingEmulator
    ? initializeApp({ projectId })
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey: formatKey(privateKey) }), projectId });
const db = getFirestore(app);

// ── Helpers ─────────────────────────────────────────────────────────────────
const now = new Date().toISOString();
const toE164 = (phone) => {
    const raw = String(phone || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.startsWith('+')) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return '';
};
const toIso = (v) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v ? String(v) : null);
/* Still ahead: the event day hasn't ended in India yet. No date counts as upcoming. */
const isUpcoming = (date) => {
    const raw = toIso(date);
    if (!raw) return true;
    const day = raw.slice(0, 10);
    const end = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T23:59:59+05:30`) : new Date(raw);
    return Number.isNaN(end.getTime()) || end.getTime() >= Date.now();
};
const refOk = (v) => /^[A-Z0-9-]{5,16}$/.test(String(v || ''));
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

const eventView = (ev = {}, gl = {}) => compact({
    title: ev.title || gl.title,
    date: toIso(ev.date || gl.date),
    time: ev.time || gl.time,
    venue: ev.location || ev.venue || gl.location || gl.venue,
    city: ev.city || gl.city,
    image: ev.hubImage || ev.image || gl.image || gl.poster,
});

// ── Load ────────────────────────────────────────────────────────────────────
console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} · project ${projectId}${usingEmulator ? ' (emulator)' : ''}`);
const [eventsSnap, listsSnap, ordersSnap, passesSnap] = await Promise.all([
    db.collection('upcoming_events').get(),
    db.collection('guestlists').get(),
    db.collection('ticket_orders').get(),
    db.collection('passes').select().get(),
]);
const events = new Map(eventsSnap.docs.map(d => [d.id, d.data()]));
const lists = new Map(listsSnap.docs.map(d => [d.id, d.data()]));
const existing = new Set(passesSnap.docs.map(d => d.id));

const report = { order: [], guestlist: [], skipped: { past: 0, notConfirmed: 0, noRef: 0, exists: 0 }, conflicts: [] };
const planned = new Map(); // ref → pass
const extra = []; // { ref: DocumentReference, data, merge }

const plan = (ref, pass, kind, extraWrites = []) => {
    if (existing.has(ref)) { report.skipped.exists += 1; return; }
    if (planned.has(ref)) {
        report.conflicts.push({ ref, first: `${planned.get(ref).source}:${planned.get(ref).sourceId}`, second: `${pass.source}:${pass.sourceId}` });
        return;
    }
    planned.set(ref, pass);
    extra.push(...extraWrites);
    report[kind].push({ ref, sourceId: pass.sourceId, holder: pass.holderName, event: pass.event?.title || '' });
};

// Orders
for (const d of ordersSnap.docs) {
    const o = d.data();
    const ref = String(o.bookingRef || '').toUpperCase();
    if (!refOk(ref)) { report.skipped.noRef += 1; continue; }
    if (!['confirmed', 'approved', 'dispatched', 'attended'].includes(String(o.status))) { report.skipped.notConfirmed += 1; continue; }
    const ev = events.get(o.eventId) || {};
    if (!isUpcoming(ev.date)) { report.skipped.past += 1; continue; }
    const qty = (o.items || []).reduce((n, i) => n + (Number(i.count) || 0), 0) || Number(o.quantity) || 1;
    plan(ref, compact({
        ref,
        eventId: o.eventId || null,
        holderUid: o.userId || null,
        holderName: o.customerName || '',
        holderEmail: String(o.customerEmail || o.email || '').trim().toLowerCase(),
        holderPhone: toE164(o.customerPhone),
        source: 'order',
        sourceId: d.id,
        status: (o.isScanned || o.attended || o.status === 'attended') ? 'checked_in' : 'issued',
        qty,
        tier: (o.items || []).map(i => i.name).filter(Boolean).join(', ') || null,
        qr: true,
        mode: 'qr',
        event: eventView(ev),
        issuedAt: o.createdAt || now,
        issuedBy: 'migration',
        migratedAt: now,
    }), 'order');
}

// Guestlist places
for (const [listId, gl] of lists) {
    const ev = events.get(listId) || (gl.eventId ? events.get(gl.eventId) : null) || {};
    const date = ev.date || gl.date;
    if (!isUpcoming(date)) continue;
    const entries = await db.collection('guestlists').doc(listId).collection('entries').get();
    for (const e of entries.docs) {
        const x = e.data();
        const ref = String(x.passRef || x.bookingRef || '').toUpperCase();
        if (!refOk(ref)) { report.skipped.noRef += 1; continue; }
        if (!(['approved', 'confirmed', 'attended'].includes(String(x.status)) || x.attended)) { report.skipped.notConfirmed += 1; continue; }
        const mode = (x.guestlistMode || gl.guestlistMode) === 'rsvp' ? 'rsvp' : 'qr';
        const writes = [{ ref: e.ref, data: { passRef: ref }, merge: true }];
        if (x.userId) writes.push({ ref: db.collection('pass_keys').doc(`guestlist_${listId}_${x.userId}`), data: { ref, entryId: e.id, source: 'guestlist', sourceId: listId, uid: x.userId, at: now }, merge: true });
        plan(ref, compact({
            ref,
            eventId: events.has(listId) ? listId : (gl.eventId || listId),
            holderUid: x.userId || null,
            holderName: x.customerName || x.name || '',
            holderEmail: String(x.customerEmail || x.email || '').trim().toLowerCase(),
            holderPhone: toE164(x.customerPhone || x.phone),
            source: 'guestlist',
            sourceId: listId,
            entryId: e.id,
            status: x.attended ? 'checked_in' : 'issued',
            qty: Math.max(1, Number(x.guestsCount) || 1),
            qr: mode !== 'rsvp',
            mode,
            event: eventView(ev, gl),
            issuedAt: x.createdAt || x.appliedAt || now,
            issuedBy: 'migration',
            migratedAt: now,
        }), 'guestlist', writes);
    }
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`Orders → passes:            ${report.order.length}`);
console.log(`Guestlist places → passes:  ${report.guestlist.length}`);
console.log(`Skipped: past ${report.skipped.past}, not confirmed ${report.skipped.notConfirmed}, no code ${report.skipped.noRef}, already a pass ${report.skipped.exists}`);
if (report.conflicts.length) {
    console.log(`Conflicts (same code on two records, left alone): ${report.conflicts.length}`);
    report.conflicts.slice(0, 20).forEach(c => console.log(`  ${c.ref}: ${c.first} vs ${c.second}`));
}
if (REPORT_PATH) {
    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`Details written to ${REPORT_PATH}`);
}

if (!APPLY) {
    console.log('Dry run: nothing was written. Re-run with --apply --project <id> to write.');
    process.exit(0);
}

// ── Write ───────────────────────────────────────────────────────────────────
const writes = [
    ...[...planned.entries()].map(([ref, data]) => ({ ref: db.collection('passes').doc(ref), data, create: true })),
    ...extra,
];
let done = 0;
for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    writes.slice(i, i + 400).forEach(w => (w.create ? batch.create(w.ref, w.data) : batch.set(w.ref, w.data, { merge: Boolean(w.merge) })));
    await batch.commit();
    done += Math.min(400, writes.length - i);
    console.log(`Wrote ${done}/${writes.length}`);
}
console.log('Done.');
