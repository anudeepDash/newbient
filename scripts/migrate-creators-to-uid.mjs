#!/usr/bin/env node
/**
 * One-time migration: re-key creator profiles to the user's auth uid.
 *
 * Target model: creators/{uid} always has the same id as users/{uid}, so the
 * app never matches creators by email or phone again.
 *
 * DRY RUN BY DEFAULT. It only reads and prints what it would do.
 *
 *   node scripts/migrate-creators-to-uid.mjs                 # dry run, prints the plan
 *   node scripts/migrate-creators-to-uid.mjs --report out.json
 *   node scripts/migrate-creators-to-uid.mjs --apply          # writes (asks nothing, so run a dry run first)
 *
 * Test it against the Firestore + Auth emulators or a staging project first:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *     node scripts/migrate-creators-to-uid.mjs --project demo-newbi
 *
 * Credentials: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY,
 * read from the environment or .env.local / .env in the working directory.
 * Applying to production needs --apply AND --project <id> matching the key.
 *
 * For each creators/{docId}:
 *   ok          docId is already the owner's uid → make sure users/{uid}.capabilities.creator is set
 *   rekey       docId is random; owner found → copy to creators/{uid}, keep the old id in
 *               legacyIds, move the old doc to creators_legacy/{docId}, rewrite references
 *   conflict    creators/{uid} already exists as a different doc → left alone, merge by hand
 *   unresolved  no auth account found for this creator → left alone
 *
 * The owner uid comes from the doc's `uid` field (checked against Auth), then
 * the creator's email, then their phone. Email/phone matching is only allowed
 * here, once, never at runtime.
 *
 * References rewritten (old id → uid):
 *   campaigns/*.tasks[].submissions keys, .completedBy[], .verifiedBy[]
 *   creators/*.referredBy
 */

import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// ── Arguments ───────────────────────────────────────────────────────────────
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
    console.log('Usage: node scripts/migrate-creators-to-uid.mjs [--apply] [--project <id>] [--report <file.json>]');
    process.exit(0);
}

// ── Environment ─────────────────────────────────────────────────────────────
for (const file of ['.env.local', '.env']) {
    if (existsSync(file)) {
        try { process.loadEnvFile(file); } catch (e) { /* malformed file: rely on the shell env */ }
    }
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
const app = usingEmulator || !(clientEmail && privateKey)
    ? initializeApp({ projectId })
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey: formatKey(privateKey) }), projectId });

const db = getFirestore(app);
const auth = getAuth(app);

// ── Helpers ─────────────────────────────────────────────────────────────────
const toE164 = (phone) => {
    const raw = String(phone || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (raw.startsWith('+')) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return null;
};

const authLookup = async (fn) => {
    try { return await fn(); } catch (e) {
        if (e?.code === 'auth/user-not-found' || e?.code === 'auth/invalid-phone-number' || e?.code === 'auth/invalid-email') return null;
        throw e;
    }
};

async function resolveOwner(data) {
    if (data.uid) {
        const user = await authLookup(() => auth.getUser(String(data.uid)));
        if (user) return { uid: user.uid, via: 'uid' };
    }
    const email = String(data.email || '').trim().toLowerCase();
    if (email) {
        const user = await authLookup(() => auth.getUserByEmail(email));
        if (user) return { uid: user.uid, via: 'email' };
    }
    const phone = toE164(data.phone || data.phoneNumber);
    if (phone) {
        const user = await authLookup(() => auth.getUserByPhoneNumber(phone));
        if (user) return { uid: user.uid, via: 'phone' };
    }
    return null;
}

const swapIds = (list, map) => {
    if (!Array.isArray(list)) return { value: list, changed: false };
    let changed = false;
    const next = Array.from(new Set(list.map(id => {
        if (map.has(id)) { changed = true; return map.get(id); }
        return id;
    })));
    return { value: next, changed: changed || next.length !== list.length };
};

function rewriteTasks(tasks, map) {
    if (!Array.isArray(tasks)) return { tasks, changed: false };
    let changed = false;
    const next = tasks.map((task) => {
        if (!task || typeof task !== 'object') return task;
        const out = { ...task };
        if (task.submissions && typeof task.submissions === 'object') {
            const subs = {};
            for (const [key, value] of Object.entries(task.submissions)) {
                const target = map.get(key) || key;
                if (target !== key) changed = true;
                // Keep an existing uid-keyed submission over the legacy one.
                if (!(target in subs) || target === key) subs[target] = value;
            }
            out.submissions = subs;
        }
        for (const field of ['completedBy', 'verifiedBy']) {
            const { value, changed: c } = swapIds(task[field], map);
            if (c) { out[field] = value; changed = true; }
        }
        return out;
    });
    return { tasks: next, changed };
}

// ── Plan ────────────────────────────────────────────────────────────────────
console.log(`\nCreators → uid migration · project ${projectId}${usingEmulator ? ' (emulator)' : ''} · ${APPLY ? 'APPLY' : 'dry run'}\n`);

const creatorsSnap = await db.collection('creators').get();
const plan = { ok: [], rekey: [], conflict: [], unresolved: [] };

for (const docSnap of creatorsSnap.docs) {
    const data = docSnap.data();
    const label = data.name || data.displayName || data.email || docSnap.id;
    const owner = await resolveOwner(data);
    if (!owner) {
        plan.unresolved.push({ id: docSnap.id, label, email: data.email || null });
        continue;
    }
    if (owner.uid === docSnap.id) {
        plan.ok.push({ id: docSnap.id, uid: owner.uid, label });
        continue;
    }
    const target = await db.collection('creators').doc(owner.uid).get();
    if (target.exists) {
        plan.conflict.push({ id: docSnap.id, uid: owner.uid, via: owner.via, label });
        continue;
    }
    // Two legacy docs for one person: only the first moves, the rest need a manual merge.
    if (plan.rekey.some(r => r.uid === owner.uid)) {
        plan.conflict.push({ id: docSnap.id, uid: owner.uid, via: owner.via, label, reason: 'second profile for the same account' });
        continue;
    }
    plan.rekey.push({ id: docSnap.id, uid: owner.uid, via: owner.via, label, data });
}

const idMap = new Map(plan.rekey.map(r => [r.id, r.uid]));

// Campaign references
const campaignsSnap = await db.collection('campaigns').get();
const campaignUpdates = [];
for (const c of campaignsSnap.docs) {
    const { tasks, changed } = rewriteTasks(c.data().tasks, idMap);
    if (changed) campaignUpdates.push({ id: c.id, title: c.data().title || c.id, tasks });
}

// Referral references
const referralUpdates = creatorsSnap.docs
    .filter(d => idMap.has(String(d.data().referredBy || '')))
    .map(d => ({ id: idMap.get(d.id) || d.id, referredBy: idMap.get(String(d.data().referredBy)) }));

console.log(`  ok          ${plan.ok.length}`);
console.log(`  rekey       ${plan.rekey.length}`);
console.log(`  conflict    ${plan.conflict.length}`);
console.log(`  unresolved  ${plan.unresolved.length}`);
console.log(`  campaigns with references to rewrite: ${campaignUpdates.length}`);
console.log(`  referral links to rewrite: ${referralUpdates.length}\n`);

for (const r of plan.rekey) console.log(`  rekey    ${r.id} → ${r.uid}  (matched by ${r.via})  ${r.label}`);
for (const r of plan.conflict) console.log(`  conflict ${r.id} vs creators/${r.uid}  ${r.reason || 'target exists'}  ${r.label}`);
for (const r of plan.unresolved) console.log(`  no owner ${r.id}  ${r.label}`);

if (REPORT_PATH) {
    const strip = ({ data, ...rest }) => rest;
    await writeFile(REPORT_PATH, JSON.stringify({
        projectId, apply: APPLY, at: new Date().toISOString(),
        ok: plan.ok, rekey: plan.rekey.map(strip), conflict: plan.conflict, unresolved: plan.unresolved,
        campaigns: campaignUpdates.map(c => ({ id: c.id, title: c.title })), referrals: referralUpdates,
    }, null, 2));
    console.log(`\nReport written to ${REPORT_PATH}`);
}

if (!APPLY) {
    console.log('\nDry run: nothing was written. Re-run with --apply --project <id> to migrate.\n');
    process.exit(0);
}

// ── Apply ───────────────────────────────────────────────────────────────────
const now = new Date().toISOString();
let written = 0;

for (const r of plan.rekey) {
    const batch = db.batch();
    const legacyIds = Array.from(new Set([...(r.data.legacyIds || []), r.id]));
    batch.set(db.collection('creators').doc(r.uid), { ...r.data, uid: r.uid, legacyIds, migratedAt: now });
    batch.set(db.collection('creators_legacy').doc(r.id), { ...r.data, migratedTo: r.uid, migratedAt: now });
    batch.delete(db.collection('creators').doc(r.id));
    batch.set(db.collection('users').doc(r.uid), { capabilities: { creator: true } }, { merge: true });
    await batch.commit();
    written += 1;
    console.log(`  moved ${r.id} → ${r.uid}`);
}

for (const r of plan.ok) {
    await db.collection('users').doc(r.uid).set({ capabilities: { creator: true } }, { merge: true });
}

for (const c of campaignUpdates) {
    await db.collection('campaigns').doc(c.id).update({ tasks: c.tasks, creatorIdsMigratedAt: now });
    console.log(`  campaign ${c.id} references rewritten`);
}

for (const ref of referralUpdates) {
    await db.collection('creators').doc(ref.id).update({ referredBy: ref.referredBy });
}

await db.collection('app_state').doc('migrations').set({
    creatorsToUid: { at: now, moved: written, ok: plan.ok.length, conflicts: plan.conflict.length, unresolved: plan.unresolved.length },
}, { merge: true });

console.log(`\nDone: ${written} moved, ${plan.ok.length} capability flags set, ${campaignUpdates.length} campaigns rewritten.`);
console.log(`Left for a manual look: ${plan.conflict.length} conflicts, ${plan.unresolved.length} without an account.\n`);
