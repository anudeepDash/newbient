// Lists t('…') string literals in src/ that have no Hinglish entry.
// Usage: node scripts/dev/i18n-coverage.mjs   (exit 1 when something is missing)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('../../src/', import.meta.url).pathname;
const dictDir = join(root, 'i18n/hinglish');
const dict = {};
for (const f of readdirSync(dictDir)) {
    if (f === 'index.js' || !f.endsWith('.js')) continue;
    Object.assign(dict, (await import(pathToFileURL(join(dictDir, f)).href)).default);
}

const files = [];
(function walk(dir) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { if (!p.includes('/i18n')) walk(p); } else if (/\.jsx?$/.test(name)) files.push(p);
    }
})(root);

const re = /\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`)/g;
const missing = new Map();
for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(re)) {
        const key = (m[1] ?? m[2] ?? m[3]).replace(/\\(['"`\\])/g, '$1');
        if (!(key in dict)) missing.set(`${f.replace(root, 'src/')}  ${key}`, 1);
    }
}
console.log(`${Object.keys(dict).length} entries; ${missing.size} t() literals without one`);
for (const k of missing.keys()) console.log(' -', k);
process.exit(missing.size ? 1 : 0);
