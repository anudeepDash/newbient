// Checks firestore.rules on the Firebase Rules API (projects.test): compiles the file and runs
// the cases below against it. Publishes nothing and touches no data.
//
//   node scripts/dev/rules-test/run.cjs                 # firestore.rules
//   node scripts/dev/rules-test/run.cjs other.rules     # any rules file (e.g. the live snapshot)
const fs = require('fs');
// Access token from the Firebase CLI login (`npx firebase-tools login`), never printed.
const path = require('path');
const os = require('os');
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
  return require(`${FT}/lib/apiv2.js`).getAccessToken();
};

const P = 'newbi-ent-v2';
const DB = '/databases/(default)/documents';
const rulesPath = process.argv[2] || 'firestore.rules';

const google = (uid, email) => ({ uid, token: { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } } });
const pwd = (uid, email, verified) => ({ uid, token: { email, email_verified: verified, firebase: { sign_in_provider: 'password' } } });
// Team record mocks: role or null (no record).
const team = (email, role) => {
  const path = `${DB}/admins/${email.toLowerCase()}`;
  return role
    ? [{ function: 'exists', args: [{ exactValue: path }], result: { value: true } }, { function: 'get', args: [{ exactValue: path }], result: { value: { data: { role } } } }]
    : [{ function: 'exists', args: [{ exactValue: path }], result: { value: false } }];
};
const R = {
  rando: google('u_rando', 'rando@ex.com'),
  founder: pwd('u_founder', 'anurag@newbi.live', true),
  developer: google('u_dev', 'team.newbi@gmail.com'),
  superAdmin: google('u_sa', 'mukulkumar.ni@gmail.com'),
  editor: google('u_ed', 'editor@ex.com'),
  scanner: google('u_sc', 'scanner@ex.com'),
  unverifiedSA: pwd('u_uv', 'jhasaurav1608@gmail.com', false),
};
const ROLE = { rando: null, founder: 'founder', developer: 'developer', superAdmin: 'super_admin', editor: 'editor', scanner: 'scanner', unverifiedSA: 'super_admin' };
const mocks = (who) => (who ? team(R[who].token.email, ROLE[who]) : []);

const T = [];
const t = (name, expectation, { who, method, path, data, existing }) => T.push({ name, tc: {
  expectation,
  request: { auth: who ? R[who] : null, path: `${DB}/${path}`, method, ...(data ? { resource: { data } } : {}) },
  ...(existing ? { resource: { data: existing } } : {}),
  functionMocks: mocks(who),
} });

// --- team ---
t('random user makes themselves admin', 'DENY', { who: 'rando', method: 'create', path: 'admins/rando@ex.com', data: { email: 'rando@ex.com', role: 'admin' } });
t('random user requests access (pending, own email)', 'ALLOW', { who: 'rando', method: 'create', path: 'admins/rando@ex.com', data: { email: 'rando@ex.com', role: 'pending' } });
t('random user requests access under someone else\'s email', 'DENY', { who: 'rando', method: 'create', path: 'admins/team.newbi@gmail.com', data: { email: 'team.newbi@gmail.com', role: 'pending' } });
t('random user promotes their own pending request', 'DENY', { who: 'rando', method: 'update', path: 'admins/rando@ex.com', existing: { email: 'rando@ex.com', role: 'pending' }, data: { email: 'rando@ex.com', role: 'founder' } });
t('random user renames their own record', 'ALLOW', { who: 'rando', method: 'update', path: 'admins/rando@ex.com', existing: { email: 'rando@ex.com', role: 'pending' }, data: { email: 'rando@ex.com', role: 'pending', displayName: 'R' } });
t('founder (password, verified) changes a role', 'ALLOW', { who: 'founder', method: 'update', path: 'admins/x@ex.com', existing: { email: 'x@ex.com', role: 'pending' }, data: { email: 'x@ex.com', role: 'editor' } });
t('developer adds a team member', 'ALLOW', { who: 'developer', method: 'create', path: 'admins/new@ex.com', data: { email: 'new@ex.com', role: 'scanner' } });
t('super_admin changes a role', 'DENY', { who: 'superAdmin', method: 'update', path: 'admins/x@ex.com', existing: { email: 'x@ex.com', role: 'pending' }, data: { email: 'x@ex.com', role: 'founder' } });
t('signed-out visitor lists the team', 'DENY', { who: null, method: 'list', path: 'admins/any' });
t('staff list the team', 'ALLOW', { who: 'editor', method: 'list', path: 'admins/any' });
t('person reads their own team record', 'ALLOW', { who: 'rando', method: 'get', path: 'admins/rando@ex.com', existing: { email: 'rando@ex.com', role: 'pending' } });
t('random user reads someone else\'s team record', 'DENY', { who: 'rando', method: 'get', path: 'admins/team.newbi@gmail.com', existing: { email: 'team.newbi@gmail.com', role: 'developer' } });
t('unverified password account with a staff email edits a campaign', 'DENY', { who: 'unverifiedSA', method: 'update', path: 'campaigns/c1', existing: { title: 'a' }, data: { title: 'b' } });

// --- content ---
t('visitor reads events', 'ALLOW', { who: null, method: 'get', path: 'upcoming_events/e1', existing: { title: 'x' } });
t('random user edits a campaign', 'DENY', { who: 'rando', method: 'update', path: 'campaigns/c1', existing: { title: 'a' }, data: { title: 'b' } });
t('editor edits a campaign', 'ALLOW', { who: 'editor', method: 'update', path: 'campaigns/c1', existing: { title: 'a' }, data: { title: 'b' } });
t('random user edits site settings', 'DENY', { who: 'rando', method: 'update', path: 'site_settings/general', existing: { a: 1 }, data: { a: 2 } });
t('random user marks an invoice paid', 'DENY', { who: 'rando', method: 'update', path: 'invoices/i1', existing: { status: 'Due' }, data: { status: 'Paid' } });
t('visitor opens an invoice link (unchanged)', 'ALLOW', { who: null, method: 'get', path: 'invoices/i1', existing: { status: 'Due' } });

// --- shared invoice / proposal / contract links ---
t('signed-out visitor lists invoices', 'DENY', { who: null, method: 'list', path: 'invoices/i1' });
t('signed-in user lists proposals', 'DENY', { who: 'rando', method: 'list', path: 'proposals/p1' });
t('signed-out visitor lists contracts', 'DENY', { who: null, method: 'list', path: 'agreements/a1' });
t('visitor opens a proposal link', 'ALLOW', { who: null, method: 'get', path: 'proposals/p1', existing: { status: 'Sent' } });
t('visitor opens a contract link', 'ALLOW', { who: null, method: 'get', path: 'agreements/a1', existing: { status: 'Final' } });
t('visitor writes a view log on an invoice', 'DENY', { who: null, method: 'update', path: 'invoices/i1', existing: { status: 'Due' }, data: { status: 'Due', lastOpened: 'now', accessLogs: [{ ip: 'x' }] } });
t('visitor claims an invoice payment directly', 'DENY', { who: null, method: 'update', path: 'invoices/i1', existing: { status: 'Due' }, data: { status: 'Verification Pending', paymentClaim: { status: 'pending' } } });
t('visitor accepts a proposal directly', 'DENY', { who: null, method: 'update', path: 'proposals/p1', existing: { status: 'Sent' }, data: { status: 'Accepted', clientSignature: 'x' } });
t('signed-in user signs a contract directly', 'DENY', { who: 'rando', method: 'update', path: 'agreements/a1', existing: { status: 'Final' }, data: { status: 'Executed' } });
t('staff list invoices', 'ALLOW', { who: 'editor', method: 'list', path: 'invoices/i1' });
t('staff list proposals', 'ALLOW', { who: 'editor', method: 'list', path: 'proposals/p1' });

// --- money ---
t('random user reads spends', 'DENY', { who: 'rando', method: 'list', path: 'spends/s1' });
t('super_admin reads spends', 'DENY', { who: 'superAdmin', method: 'list', path: 'spends/s1' });
t('founder reads spends', 'ALLOW', { who: 'founder', method: 'list', path: 'spends/s1' });
t('random user reads payees', 'DENY', { who: 'rando', method: 'get', path: 'finance_payees/p1', existing: { name: 'x' } });

// --- people ---
t('random user lists ticket orders', 'DENY', { who: 'rando', method: 'list', path: 'ticket_orders/o1' });
t('scanner lists ticket orders', 'ALLOW', { who: 'scanner', method: 'list', path: 'ticket_orders/o1' });
t('visitor places an order', 'ALLOW', { who: null, method: 'create', path: 'ticket_orders/o2', data: { name: 'A' } });
t('random user lists guestlist entries', 'DENY', { who: 'rando', method: 'list', path: 'guestlists/g1/entries/e1' });
t('visitor joins a guestlist', 'ALLOW', { who: null, method: 'create', path: 'guestlists/g1/entries/e2', data: { name: 'A' } });
t('registration raises the spot count by 1', 'ALLOW', { who: 'rando', method: 'update', path: 'guestlists/g1', existing: { currentSpots: 5, title: 'x' }, data: { currentSpots: 6, title: 'x' } });
t('random user resets the spot count', 'DENY', { who: 'rando', method: 'update', path: 'guestlists/g1', existing: { currentSpots: 5, title: 'x' }, data: { currentSpots: 0, title: 'x' } });
t('random user lists creators', 'DENY', { who: 'rando', method: 'list', path: 'creators/c9' });
t('creator reads own profile', 'ALLOW', { who: 'rando', method: 'get', path: 'creators/u_rando', existing: { uid: 'u_rando', name: 'R' } });
t('creator edits own bio', 'ALLOW', { who: 'rando', method: 'update', path: 'creators/u_rando', existing: { uid: 'u_rando', bio: 'a', profileStatus: 'pending' }, data: { uid: 'u_rando', bio: 'b', profileStatus: 'pending' } });
t('creator approves themselves', 'DENY', { who: 'rando', method: 'update', path: 'creators/u_rando', existing: { uid: 'u_rando', profileStatus: 'pending' }, data: { uid: 'u_rando', profileStatus: 'approved' } });
t('user gives themselves a role', 'DENY', { who: 'rando', method: 'update', path: 'users/u_rando', existing: { name: 'R' }, data: { name: 'R', role: 'admin' } });
t('user gives themselves the creator capability', 'DENY', { who: 'rando', method: 'update', path: 'users/u_rando', existing: { name: 'R' }, data: { name: 'R', capabilities: { creator: true } } });
t('user joins the community (member capability)', 'ALLOW', { who: 'rando', method: 'update', path: 'users/u_rando', existing: { name: 'R' }, data: { name: 'R', capabilities: { member: true } } });
t('user edits own name', 'ALLOW', { who: 'rando', method: 'update', path: 'users/u_rando', existing: { name: 'R' }, data: { name: 'Rin' } });
t('user reads someone else\'s profile', 'DENY', { who: 'rando', method: 'get', path: 'users/u_other', existing: { name: 'O' } });
t('staff list users (mailing)', 'ALLOW', { who: 'editor', method: 'list', path: 'users/u_other' });

// --- phone and verification (written by the server only) ---
t('user marks own phone verified', 'DENY', { who: 'rando', method: 'update', path: 'users/u_rando', existing: { name: 'R' }, data: { name: 'R', phone: '+919800000000', phoneVerified: true } });
t('user swaps the number under a verified flag', 'DENY', { who: 'rando', method: 'update', path: 'users/u_rando', existing: { name: 'R', phone: '+919800000000', phoneVerified: true }, data: { name: 'R', phone: '+919811111111', phoneVerified: true } });
t('user sets the legacy phoneNumber', 'DENY', { who: 'rando', method: 'update', path: 'users/u_rando', existing: { name: 'R' }, data: { name: 'R', phoneNumber: '+919811111111' } });
t('user signs up with a verified phone', 'DENY', { who: 'rando', method: 'create', path: 'users/u_rando', data: { email: 'rando@ex.com', isPhoneVerified: true } });
t('user with a verified phone edits their name', 'ALLOW', { who: 'rando', method: 'update', path: 'users/u_rando', existing: { name: 'R', phone: '+919800000000', phoneVerified: true }, data: { name: 'Rin', phone: '+919800000000', phoneVerified: true } });
t('creator marks own phone verified', 'DENY', { who: 'rando', method: 'update', path: 'creators/u_rando', existing: { uid: 'u_rando', phone: '+919800000000', isPhoneVerified: false }, data: { uid: 'u_rando', phone: '+919800000000', isPhoneVerified: true } });
t('creator changes phone directly (goes through the API)', 'DENY', { who: 'rando', method: 'update', path: 'creators/u_rando', existing: { uid: 'u_rando', phone: '+919800000000', isPhoneVerified: true }, data: { uid: 'u_rando', phone: '+919811111111', isPhoneVerified: true } });
t('creator saves settings with phone unchanged', 'ALLOW', { who: 'rando', method: 'update', path: 'creators/u_rando', existing: { uid: 'u_rando', phone: '+919800000000', isPhoneVerified: true, bio: 'a' }, data: { uid: 'u_rando', phone: '+919800000000', isPhoneVerified: true, bio: 'b' } });
t('signed-out visitor verifies a creator by link', 'DENY', { who: null, method: 'update', path: 'creators/c1', existing: { uid: 'u_x', verificationToken: 'abc' }, data: { uid: 'u_x', verificationToken: null, isPhoneVerified: true, isEmailVerified: true } });

// --- passes ---
t('holder reads own pass', 'ALLOW', { who: 'rando', method: 'get', path: 'passes/ABC', existing: { holderUid: 'u_rando' } });
t('someone else reads a pass', 'DENY', { who: 'rando', method: 'get', path: 'passes/ABC', existing: { holderUid: 'u_other' } });
t('staff list passes', 'ALLOW', { who: 'scanner', method: 'list', path: 'passes/ABC' });
t('anyone writes a pass', 'DENY', { who: 'developer', method: 'create', path: 'passes/NEW', data: { holderUid: 'u_dev' } });

(async () => {
  const token = await cliToken(P);
  const body = { source: { files: [{ name: 'firestore.rules', content: fs.readFileSync(rulesPath, 'utf8') }] }, testSuite: { testCases: T.map(x => x.tc) } };
  const r = await fetch(`https://firebaserules.googleapis.com/v1/projects/${P}:test`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': P, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) { console.log('API error', r.status, JSON.stringify(j.error?.message || j).slice(0, 800)); return; }
  if (j.issues?.length) console.log('Compile issues:', JSON.stringify(j.issues, null, 1).slice(0, 2000));
  let pass = 0;
  (j.testResults || []).forEach((res, i) => {
    const ok = res.state === 'SUCCESS';
    if (ok) pass += 1;
    console.log(`${ok ? '✓' : '✗'} ${T[i].tc.expectation.padEnd(5)} ${T[i].name}${ok ? '' : `  → ${(res.debugMessages || []).join(' | ').slice(0, 300)} ${JSON.stringify(res.errorPosition || '')}`}`);
  });
  console.log(`\n${pass}/${T.length} passed`);
  if (pass !== T.length) process.exitCode = 1;
})().catch(e => console.error('failed:', e.message));
