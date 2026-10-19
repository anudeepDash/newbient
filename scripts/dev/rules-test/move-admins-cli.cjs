// Moves admins/{randomId} → admins/{email, lowercased}, using the Firebase CLI login
// (`npx firebase-tools login`) instead of a service-account key. Same plan as
// scripts/migrate-admins-to-email-ids.mjs.
//
// DRY RUN BY DEFAULT (reads only):
//   node scripts/dev/rules-test/move-admins-cli.cjs
// Writes only with:
//   node scripts/dev/rules-test/move-admins-cli.cjs --apply --project newbi-ent-v2
//
// Each move is one atomic commit: create admins/{email} only if it doesn't exist yet,
// and delete the old record only if it still exists. Every field is kept; adds legacyId.
const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const pi = args.indexOf('--project');
const PROJECT = pi >= 0 ? args[pi + 1] : 'newbi-ent-v2';
if (APPLY && pi < 0) { console.error('Refusing to write without --project <id>.'); process.exit(1); }

const findFirebaseTools = () => {
  if (process.env.FIREBASE_TOOLS_DIR) return process.env.FIREBASE_TOOLS_DIR;
  const root = path.join(os.homedir(), '.npm', '_npx');
  for (const d of (fs.existsSync(root) ? fs.readdirSync(root) : [])) {
    const p = path.join(root, d, 'node_modules', 'firebase-tools');
    if (fs.existsSync(path.join(p, 'lib', 'requireAuth.js'))) return p;
  }
  throw new Error('Firebase CLI not found. Run: npx -y firebase-tools@latest login');
};
const cliToken = async (project) => {
  const FT = findFirebaseTools();
  const { requireAuth } = require(`${FT}/lib/requireAuth.js`);
  const acct = require(`${FT}/lib/auth.js`).getGlobalDefaultAccount();
  if (!acct) throw new Error('Not logged in. Run: npx -y firebase-tools@latest login');
  await requireAuth({ project, user: acct.user, tokens: acct.tokens });
  return { token: await require(`${FT}/lib/apiv2.js`).getAccessToken(), who: acct.user?.email };
};

(async () => {
  const { token, who } = await cliToken(PROJECT);
  const H = { Authorization: `Bearer ${token}`, 'x-goog-user-project': PROJECT, 'Content-Type': 'application/json' };
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const r = await fetch(`${base}/admins?pageSize=500`, { headers: H });
  const j = await r.json();
  if (!r.ok) throw new Error(`reading admins failed: ${r.status} ${j.error?.message}`);
  const docs = (j.documents || []).map(d => ({ name: d.name, id: d.name.split('/').pop(), fields: d.fields || {} }));
  const str = (f, k) => f[k]?.stringValue || '';
  const ids = new Set(docs.map(d => d.id));
  const byId = new Map(docs.map(d => [d.id, d]));

  const plan = [];
  for (const d of docs) {
    const target = str(d.fields, 'email').trim().toLowerCase();
    if (!target) { plan.push({ d, action: 'no-email' }); continue; }
    if (target.includes('/')) { plan.push({ d, target, action: 'bad-email' }); continue; }
    if (d.id === target) continue;
    if (!ids.has(target)) plan.push({ d, target, action: 'move' });
    else if (str(byId.get(target).fields, 'role') === str(d.fields, 'role')) plan.push({ d, target, action: 'merge' });
    else plan.push({ d, target, action: 'conflict', other: str(byId.get(target).fields, 'role') });
  }
  // Two old records with the same email: the first moves, the rest wait for a second run.
  const seen = new Set();
  plan.forEach(p => { if (p.action === 'move') { if (seen.has(p.target)) p.action = 'duplicate'; seen.add(p.target); } });

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN (nothing written)'} · project ${PROJECT} · signed in as ${who}`);
  console.log(`${docs.length} admin records · ${docs.length - plan.length} already stored under their email · ${plan.length} to handle\n`);
  for (const p of plan) {
    console.log(`  ${p.action.padEnd(9)} ${str(p.d.fields, 'role').padEnd(12)} admins/${p.d.id}  →  admins/${p.target || '-'}${p.other ? `  (already there as ${p.other})` : ''}`);
  }
  if (!APPLY) { console.log('\nTo make these changes: --apply --project ' + PROJECT); return; }

  let done = 0;
  for (const p of plan) {
    let writes;
    if (p.action === 'move') {
      const fields = { ...p.d.fields, email: { stringValue: p.target }, legacyId: { stringValue: p.d.id }, movedAt: { stringValue: new Date().toISOString() } };
      writes = [
        { update: { name: `projects/${PROJECT}/databases/(default)/documents/admins/${p.target}`, fields }, currentDocument: { exists: false } },
        { delete: p.d.name, currentDocument: { exists: true } },
      ];
    } else if (p.action === 'merge') {
      writes = [{ delete: p.d.name, currentDocument: { exists: true } }];
    } else continue;
    const c = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:commit`, { method: 'POST', headers: H, body: JSON.stringify({ writes }) });
    const cj = await c.json();
    if (!c.ok) { console.log(`  ✗ ${p.d.id} → ${p.target}: ${cj.error?.message}`); continue; }
    done += 1;
    console.log(`  ✓ ${p.action} ${p.d.id} → ${p.target}`);
  }
  console.log(`\nDone: ${done} of ${plan.filter(p => ['move', 'merge'].includes(p.action)).length}.`);
})().catch(e => { console.error('failed:', e.message); process.exit(1); });
