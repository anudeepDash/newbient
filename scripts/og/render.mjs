// Renders the link-preview cards in scripts/og/cards.html to public/og/
// (1200×630 JPEG) with headless Chrome. macOS only (uses sips for the JPEG step).
//   node scripts/og/render.mjs            all cards
//   node scripts/og/render.mjs creator    one card
// Each card is written to its path in OG_IMAGES (src/app/seo.js). Chats cache a
// preview by its image URL, so after changing a card bump OG_CARD_VERSION there
// first, render, and delete the old files.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { OG_IMAGES } from '../../src/app/seo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, '..', '..', 'public');
const CARDS = Object.keys(OG_IMAGES);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const only = process.argv.slice(2);
const cards = only.length ? CARDS.filter((c) => only.includes(c)) : CARDS;
fs.mkdirSync(path.join(publicDir, 'og'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'newbi-og-'));

for (const card of cards) {
    const png = path.join(tmp, `${card}.png`);
    const url = `${pathToFileURL(path.join(here, 'cards.html')).href}?card=${card}`;
    execFileSync(CHROME, [
        '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--allow-file-access-from-files', '--virtual-time-budget=8000',
        '--window-size=1200,630', `--screenshot=${png}`, url,
    ], { stdio: 'ignore' });
    const jpg = path.join(publicDir, OG_IMAGES[card].path);
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', png, '--out', jpg], { stdio: 'ignore' });
    console.log(`public${OG_IMAGES[card].path}  ${Math.round(fs.statSync(jpg).size / 1024)} KB`);
}
fs.rmSync(tmp, { recursive: true, force: true });
