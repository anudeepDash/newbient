#!/usr/bin/env node
/**
 * One-time migration: copy Cloudinary pictures into Firebase Storage and point
 * Firestore at the copies.
 *
 * New uploads already go to Firebase Storage (src/lib/media.js). This moves the
 * older ones, so pages stop loading from Cloudinary, whose free bandwidth ran out.
 *
 * DRY RUN BY DEFAULT. It reads Firestore and prints what it would copy.
 *
 *   node scripts/migrate-cloudinary-to-firebase.mjs                         # dry run
 *   node scripts/migrate-cloudinary-to-firebase.mjs --sizes                 # dry run + total size (HEAD requests)
 *   node scripts/migrate-cloudinary-to-firebase.mjs --apply --project newbi-ent-v2 --limit 20   # trial: 20 pictures
 *   node scripts/migrate-cloudinary-to-firebase.mjs --apply --project newbi-ent-v2             # everything
 *   node scripts/migrate-cloudinary-to-firebase.mjs --rollback --project newbi-ent-v2          # links back to Cloudinary
 *
 * Options:
 *   --collections a,b   only these top-level collections (and their subcollections)
 *   --map <file>        where the old → new link list is kept (default scratch/cloudinary-map.json).
 *                       Written as it goes, so a stopped run picks up where it left off,
 *                       and --rollback reads it.
 *   --report <file>     write every document and link found to a JSON file
 *
 * Credentials: the Firebase CLI login (run `npx -y firebase-tools@14 login` as
 * the project owner first), or --key <service-account.json>.
 *
 * What moves: Cloudinary image uploads (JPEG, PNG, WebP, HEIC…), saved as the
 * same sized WebP copies + email.jpg that the browser makes on upload, and GIF
 * and SVG pictures, copied as they are. A stored link that carries a Cloudinary
 * transformation (a crop, say) is copied as it looks, not as the original.
 * What stays on Cloudinary: PDFs, videos and raw files (proposal and contract
 * documents use Cloudinary to draw their page previews).
 *
 * Firestore documents are changed field by field, only where a link was found,
 * and only if the document hasn't changed since it was read (else it is read
 * again and retried once).
 */

import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import { MEDIA_WIDTHS, MEDIA_MAX_WIDTH, MEDIA_EMAIL_WIDTH } from '../src/lib/image.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

if (flag('help') || flag('h')) {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
    process.exit(0);
}

const APPLY = flag('apply');
const ROLLBACK = flag('rollback');
const SIZES = flag('sizes');
const LIMIT = Number(option('limit')) || Infinity;
const PROJECT_ARG = option('project');
const ONLY = option('collections')?.split(',').map((s) => s.trim()).filter(Boolean);
const MAP_PATH = option('map') || 'scratch/cloudinary-map.json';
const REPORT_PATH = option('report');
const CLOUD = 'dgtalrz4n';

for (const file of ['.env.local', '.env']) {
    if (existsSync(file)) { try { process.loadEnvFile(file); } catch { /* shell env */ } }
}

const projectId = (PROJECT_ARG || process.env.VITE_FIREBASE_PROJECT_ID || '').trim();
if (!projectId) { console.error('No project id. Pass --project <id>.'); process.exit(1); }
if ((APPLY || ROLLBACK) && !PROJECT_ARG) {
    console.error('Refusing to write without --project <id>. Run a dry run first.');
    process.exit(1);
}
const bucketName = (process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`).trim();

/* ---------- credentials ---------- */

// The Firebase CLI's own login, so no key file has to be downloaded: written as
// "application default credentials" to a file only you can read, deleted on exit.
const useCliLogin = () => {
    const npx = join(homedir(), '.npm', '_npx');
    const apiJs = existsSync(npx) && readdirSync(npx)
        .map((d) => join(npx, d, 'node_modules', 'firebase-tools', 'lib', 'api.js'))
        .find((p) => existsSync(p));
    const store = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
    if (!apiJs || !existsSync(store)) return false;
    const refresh = JSON.parse(readFileSync(store, 'utf8')).tokens?.refresh_token;
    if (!refresh) return false;
    const api = createRequire(apiJs)(apiJs);
    const file = join(tmpdir(), `adc-${randomUUID()}.json`);
    writeFileSync(file, JSON.stringify({ type: 'authorized_user', client_id: api.clientId(), client_secret: api.clientSecret(), refresh_token: refresh, quota_project_id: projectId }), { mode: 0o600 });
    const cleanup = () => { try { rmSync(file); } catch { /* gone */ } };
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(130); });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = file;
    return true;
};

const keyCredential = () => {
    const path = option('key');
    if (!path) return null;
    const key = JSON.parse(readFileSync(path, 'utf8'));
    return cert({ projectId: key.project_id, clientEmail: key.client_email, privateKey: key.private_key });
};

const keyCred = keyCredential();
if (!keyCred && !useCliLogin()) {
    console.error('No credentials. Run `npx -y firebase-tools@14 login` as the project owner, or pass --key <service-account.json>.');
    process.exit(1);
}
initializeApp({ ...(keyCred ? { credential: keyCred } : { credential: applicationDefault() }), projectId, storageBucket: bucketName });
const db = getFirestore();
if (process.env.FIRESTORE_REST) db.settings({ preferRest: true }); // REST instead of gRPC when gRPC keeps timing out
const bucket = getStorage().bucket(bucketName);

/* ---------- finding links ---------- */

// A Cloudinary delivery link of this account, up to the first character that can't be in one.
const LINK = new RegExp(`https?://res\\.cloudinary\\.com/${CLOUD}/(image|video|raw)/upload/[^\\s"'<>()\\\\]+`, 'g');
const COPY_AS_IS = /\.(gif|svg)$/i;
const STAYS = /\.(pdf)$/i;

const classify = (link) => {
    const resource = link.match(/\/(image|video|raw)\/upload\//)[1];
    const path = decodeURIComponent(new URL(link).pathname);
    if (resource !== 'image' || STAYS.test(path)) return 'stays';
    return COPY_AS_IS.test(path) ? 'as-is' : 'resize';
};

/* Every Cloudinary link in a value (deep), as a Set. */
const linksIn = (value, out = new Set()) => {
    if (typeof value === 'string') { for (const m of value.matchAll(LINK)) out.add(m[0].replace(/[.,;:]+$/, '')); }
    else if (Array.isArray(value)) value.forEach((v) => linksIn(v, out));
    else if (value && typeof value === 'object' && !(value instanceof Date) && typeof value.toDate !== 'function' && !value._path && !value.latitude) {
        Object.values(value).forEach((v) => linksIn(v, out));
    }
    return out;
};

/* The value with links replaced (deep). Leaves Timestamps, refs and other objects alone. */
const replaceIn = (value, map) => {
    if (typeof value === 'string') {
        let s = value;
        for (const [from, to] of map) if (s.includes(from)) s = s.split(from).join(to);
        return s;
    }
    if (Array.isArray(value)) return value.map((v) => replaceIn(v, map));
    if (value && typeof value === 'object' && value.constructor === Object) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceIn(v, map)]));
    }
    return value;
};

/* Every document of a collection and its subcollections, depth first. */
async function* walk(collection) {
    const refs = await collection.listDocuments();
    for (let i = 0; i < refs.length; i += 100) {
        const chunk = refs.slice(i, i + 100);
        const snaps = await db.getAll(...chunk);
        for (const snap of snaps) if (snap.exists) yield snap;
        const subs = await Promise.all(chunk.map((r) => r.listCollections()));
        for (const list of subs) for (const sub of list) yield* walk(sub);
    }
}

/* ---------- copying ---------- */

const mediaUrl = (path) => `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`;
const CACHE = 'public, max-age=31536000, immutable';

const save = (path, buf, contentType) => bucket.file(path).save(buf, { resumable: false, contentType, metadata: { cacheControl: CACHE } });

/* Downloads one Cloudinary link and saves it under media/<id>/; resolves to the new link. */
const copyOne = async (link, kind) => {
    const res = await fetch(link);
    if (!res.ok) throw new Error(`Cloudinary answered ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const id = randomUUID().replace(/-/g, '');

    if (kind === 'as-is') {
        const name = decodeURIComponent(new URL(link).pathname.split('/').pop()).replace(/[^A-Za-z0-9._-]/g, '_').slice(-100);
        await save(`media/${id}/${name}`, buf, res.headers.get('content-type') || 'application/octet-stream');
        return mediaUrl(`media/${id}/${name}`);
    }

    // The same copies the browser makes (src/lib/media.js): WebP widths, the largest first, + email.jpg.
    const upright = sharp(buf, { failOn: 'none' }).rotate();
    const { width } = await upright.clone().metadata().then(async (m) => {
        // metadata() is before rotate(); swap for 90°-rotated photos.
        const w = (m.orientation || 1) >= 5 ? m.height : m.width;
        return { width: w };
    });
    if (!width) throw new Error('not a picture sharp can read');
    const top = Math.min(width, MEDIA_MAX_WIDTH);
    const widths = [top, ...MEDIA_WIDTHS.filter((w) => w < top).reverse()];
    for (const w of widths) {
        const out = await upright.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        await save(`media/${id}/w${w}.webp`, out, 'image/webp');
    }
    const email = await upright.clone().resize({ width: Math.min(top, MEDIA_EMAIL_WIDTH), withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    await save(`media/${id}/email.jpg`, email, 'image/jpeg');
    return mediaUrl(`media/${id}/w${top}.webp`);
};

const pool = async (items, n, fn) => {
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const item = items[i++]; await fn(item); } }));
};

/* ---------- rewriting documents ---------- */

// A changed document (precondition) or a slow/busy write (deadline, unavailable,
// aborted) is read again and retried. A timed-out write may still have landed;
// the fresh read then has nothing left to change.
const RETRYABLE = /FAILED_PRECONDITION|precondition|DEADLINE_EXCEEDED|UNAVAILABLE|ABORTED|RESOURCE_EXHAUSTED/i;
const rewrite = async (snap, pairs) => {
    for (let attempt = 0; attempt < 4; attempt++) {
        if (!snap.exists) return 0;
        const data = snap.data();
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            const next = replaceIn(value, pairs);
            if (JSON.stringify(next) !== JSON.stringify(value)) updates.push(new FieldPath(key), next);
        }
        if (!updates.length) return 0;
        try {
            await snap.ref.update(...updates, { lastUpdateTime: snap.updateTime });
            return updates.length / 2;
        } catch (err) {
            if (attempt < 3 && RETRYABLE.test(`${err.code} ${err.message}`)) {
                await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
                snap = await snap.ref.get();
                continue;
            }
            throw err;
        }
    }
    return 0;
};

/* ---------- run ---------- */

const loadMap = () => (existsSync(MAP_PATH) ? JSON.parse(readFileSync(MAP_PATH, 'utf8')) : {});
const saveMap = async (map) => { mkdirSync(dirname(MAP_PATH), { recursive: true }); await writeFile(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`); };

const main = async () => {
    const map = loadMap();
    console.log(`${ROLLBACK ? 'ROLLBACK' : APPLY ? 'APPLY' : 'DRY RUN'} · project ${projectId} · bucket ${bucketName}`);

    // 1. Scan.
    const roots = (await db.listCollections()).filter((c) => !ONLY || ONLY.includes(c.id));
    const found = []; // { snap, links: [] }
    const perCollection = {};
    let scanned = 0;
    for (const root of roots) {
        for await (const snap of walk(root)) {
            scanned++;
            const links = ROLLBACK
                ? Object.values(map).filter((to) => JSON.stringify(snap.data()).includes(to))
                : [...linksIn(snap.data())];
            if (links.length) {
                found.push({ snap, links });
                const group = snap.ref.path.split('/').filter((_, i) => i % 2 === 0).join('/');
                perCollection[group] = (perCollection[group] || 0) + 1;
            }
            if (scanned % 2000 === 0) console.log(`  …${scanned} documents read`);
        }
    }

    if (ROLLBACK) {
        const back = new Map(Object.entries(map).map(([from, to]) => [to, from]));
        let fields = 0;
        for (const { snap } of found) fields += await rewrite(snap, back);
        console.log(`Rolled back ${fields} fields in ${found.length} documents. Files in Storage were left in place.`);
        return;
    }

    const unique = [...new Set(found.flatMap((f) => f.links))];
    const kinds = { resize: [], 'as-is': [], stays: [] };
    for (const link of unique) kinds[classify(link)].push(link);
    const todo = [...kinds.resize, ...kinds['as-is']].filter((l) => !map[l]);

    console.log(`\n${scanned} documents read, ${found.length} with Cloudinary links:`);
    for (const [group, n] of Object.entries(perCollection).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(6)}  ${group}`);
    console.log(`\n${unique.length} distinct links: ${kinds.resize.length} pictures to resize, ${kinds['as-is'].length} GIF/SVG to copy as they are, ${kinds.stays.length} PDFs/videos/files staying on Cloudinary.`);
    console.log(`${Object.keys(map).length} already copied (${MAP_PATH}), ${todo.length} left.`);

    if (SIZES) {
        let bytes = 0; let unknown = 0;
        await pool(todo, 8, async (l) => {
            const r = await fetch(l, { method: 'HEAD' }).catch(() => null);
            const n = Number(r?.headers.get('content-length'));
            if (n) bytes += n; else unknown++;
        });
        console.log(`Downloading them from Cloudinary: about ${(bytes / 1e9).toFixed(2)} GB${unknown ? ` (+${unknown} of unknown size)` : ''}.`);
    }

    if (REPORT_PATH) {
        await writeFile(REPORT_PATH, JSON.stringify(found.map((f) => ({ path: f.snap.ref.path, links: f.links })), null, 2));
        console.log(`Report: ${REPORT_PATH}`);
    }
    if (!APPLY) { console.log('\nDry run: nothing was copied or changed. Add --apply --project <id> to do it.'); return; }

    // 2. Copy.
    const batch = todo.slice(0, LIMIT);
    let done = 0; const failed = [];
    await pool(batch, 6, async (link) => {
        try {
            map[link] = await copyOne(link, classify(link));
            done++;
            if (done % 25 === 0) { await saveMap(map); console.log(`  copied ${done}/${batch.length}`); }
        } catch (err) {
            failed.push({ link, error: err.message });
        }
    });
    await saveMap(map);
    console.log(`Copied ${done} files${failed.length ? `, ${failed.length} failed (left on Cloudinary)` : ''}.`);
    for (const f of failed.slice(0, 20)) console.log(`  ✗ ${f.link} — ${f.error}`);

    // 3. Point documents at the copies (only links copied so far).
    const pairs = new Map(Object.entries(map).sort((a, b) => b[0].length - a[0].length)); // longest first
    let docs = 0; let fields = 0; const notUpdated = [];
    for (const { snap, links } of found) {
        if (!links.some((l) => map[l])) continue;
        try {
            const n = await rewrite(snap, pairs);
            if (n) { docs++; fields += n; }
        } catch (err) {
            notUpdated.push({ path: snap.ref.path, error: err.code || err.message });
        }
    }
    console.log(`Updated ${fields} fields in ${docs} documents. Old Cloudinary files were left in place.`);
    if (notUpdated.length) {
        console.log(`${notUpdated.length} documents could not be updated (run again to retry):`);
        for (const f of notUpdated.slice(0, 20)) console.log(`  ✗ ${f.path} — ${f.error}`);
        process.exitCode = 1;
    }
};

main().catch((err) => { console.error(err); process.exit(1); });
