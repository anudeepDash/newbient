#!/usr/bin/env node
/**
 * Seeds a sample outreach campaign with 20 fake applicants into the LOCAL
 * Firestore emulator, through the same server code the public form uses
 * (validation, duplicate merge, contacts, audit log).
 *
 *   npx firebase-tools emulators:start --only firestore --project demo-newbi
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:outreach
 *
 * It refuses to run without FIRESTORE_EMULATOR_HOST, so it can never write to
 * the live project. Phones are in +1 202-555-01xx, a range reserved for
 * fiction, so a stray "Open WhatsApp" can't reach a real person.
 */

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host) {
    console.error('Refusing to seed: FIRESTORE_EMULATOR_HOST is not set. This script only writes to the local emulator.');
    process.exit(1);
}
if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(host)) {
    console.error(`Refusing to seed: FIRESTORE_EMULATOR_HOST (${host}) is not a local address.`);
    process.exit(1);
}

const PROJECT_ID = 'demo-newbi';
const { initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const { seedOutreach, CAMPAIGN_ID } = await import('./outreach-seed-data.mjs');

const db = getFirestore(initializeApp({ projectId: PROJECT_ID }, 'outreach-seed'));

seedOutreach(db).then(({ created }) => {
    console.log(`Seeded campaign ${CAMPAIGN_ID} with ${created} applicants (+1 duplicate merged) in the emulator at ${host}.`);
    console.log('Form: /app/c/seed-arijit-blr/apply on the dev server (start it with the same FIRESTORE_EMULATOR_HOST).');
    process.exit(0);
}).catch((e) => {
    console.error(e);
    process.exit(1);
});
