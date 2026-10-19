#!/usr/bin/env node
/**
 * One-time migration: store each team member's admins record under their
 * email (admins/{email, lowercased}) instead of a random id.
 *
 * Why: the Firestore rules decide "is this person staff?" by reading
 * admins/{their email}. Rules can read a document by id but can't search by
 * email, so records with random ids are invisible to them. Run this BEFORE
 * publishing firestore.rules, after the app code that writes admins/{email}
 * is live.
 *
 * DRY RUN BY DEFAULT: reads and prints the plan.
 *
 *   node scripts/migrate-admins-to-email-ids.mjs --key <service-account.json>
 *   node scripts/migrate-admins-to-email-ids.mjs --key <file.json> --apply --project newbi-ent-v2
 *
 * For each admins/{id} whose id isn't its lowercased email:
 *   move      no record at admins/{email} yet → copy there (keeps every field, adds
 *             legacyId), then delete the old record
 *   merge     admins/{email} exists with the same role → delete the old duplicate
 *   conflict  admins/{email} exists with a different role → left alone, fix by hand
 *   no-email  the record has no email → left alone
 */
import { existsSync, readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const option = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const APPLY = flag('apply');
const PROJECT_ARG = option('project');
const KEY_PATH = option('key');
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

for (const file of ['.env.local', '.env']) {
    if (existsSync(file)) { try { process.loadEnvFile(file); } catch { /* shell env */ } }
}
if (KEY_PATH) {
    let key;
    try { key = JSON.parse(readFileSync(KEY_PATH, 'utf8')); } catch (e) { console.error(`Couldn't read the key file ${KEY_PATH}: ${e.message}`); process.exit(1); }
    if (!key.client_email || !key.private_key) { console.error(`${KEY_PATH} isn't a service-account key.`); process.exit(1); }
    if (PROJECT_ARG && key.project_id && key.project_id !== PROJECT_ARG) { console.error(`The key is for project ${key.project_id}, not ${PROJECT_ARG}.`); process.exit(1); }
    if (key.project_id) process.env.FIREBASE_PROJECT_ID = key.project_id;
    process.env.FIREBASE_CLIENT_EMAIL = key.client_email;
    process.env.FIREBASE_PRIVATE_KEY = key.private_key;
}
const projectId = (PROJECT_ARG || process.env.FIREBASE_PROJECT_ID || '').trim();
if (!projectId) { console.error('No project id. Pass --project <id> or --key <file.json>.'); process.exit(1); }
if (APPLY && !usingEmulator && !PROJECT_ARG) { console.error('Refusing to write without --project <id>.'); process.exit(1); }
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
if (!usingEmulator && !(clientEmail && privateKey)) {
    console.error('No admin key. Pass --key <service-account.json> (Firebase console → Project settings → Service accounts).');
    process.exit(1);
}
const app = usingEmulator
    ? initializeApp({ projectId })
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }), projectId });
const db = getFirestore(app);

const key = (email) => String(email || '').trim().toLowerCase();

const snap = await db.collection('admins').get();
const plan = [];
for (const d of snap.docs) {
    const data = d.data();
    const target = key(data.email);
    if (!target) { plan.push({ id: d.id, action: 'no-email' }); continue; }
    if (d.id === target) continue;
    const existing = await db.collection('admins').doc(target).get();
    if (!existing.exists) plan.push({ id: d.id, target, action: 'move', role: data.role, data });
    else if (String(existing.data().role) === String(data.role)) plan.push({ id: d.id, target, action: 'merge', role: data.role });
    else plan.push({ id: d.id, target, action: 'conflict', role: data.role, existingRole: existing.data().role });
}

console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} · project ${projectId} · ${snap.size} admin records, ${plan.length} to look at`);
for (const p of plan) console.log(`  ${p.action.padEnd(8)} ${p.id} → ${p.target || '-'}  (${p.role || '?'}${p.existingRole ? ` vs ${p.existingRole}` : ''})`);
if (!APPLY) { console.log('Nothing written. Re-run with --apply --project <id> to make these changes.'); process.exit(0); }

let done = 0;
for (const p of plan) {
    if (p.action === 'move') {
        await db.runTransaction(async (tx) => {
            const to = db.collection('admins').doc(p.target);
            if ((await tx.get(to)).exists) throw new Error(`${p.target} appeared meanwhile; re-run`);
            tx.set(to, { ...p.data, email: p.target, legacyId: p.id, movedAt: new Date().toISOString() });
            tx.delete(db.collection('admins').doc(p.id));
        });
        done += 1;
    } else if (p.action === 'merge') {
        await db.collection('admins').doc(p.id).delete();
        done += 1;
    }
}
console.log(`Done: ${done} records moved or merged. Conflicts and records without an email were left alone.`);
