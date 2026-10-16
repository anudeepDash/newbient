/*
 * Local check of the production build: serves dist/ with the same landing and
 * app-shell rewrites as vercel.json, plus the public feed (read-only, anonymous
 * Firestore REST). Enquiries are validated only, never written.
 *   node scripts/dev/serve-dist.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { getPublicFeed } from '../../api/_lib/publicFeed.js';
import { handleEnquiry } from '../../api/_lib/enquiry.js';
import { firestoreRest } from './firestoreRest.mjs';

const port = Number(process.argv[2] || 4173);
const dist = path.resolve('dist');
const LANDING = { '/': '_landing/index.html', '/creator': '_landing/creator/index.html', '/contact': '_landing/contact/index.html', '/terms': '_landing/terms/index.html', '/privacy': '_landing/privacy/index.html' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

const send = (req, res, status, body, type) => {
    const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    res.writeHead(status, { 'Content-Type': type, ...(gz ? { 'Content-Encoding': 'gzip' } : {}) });
    res.end(gz ? zlib.gzipSync(body) : body);
};

http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (d) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(d)); return res; };
    if (url.pathname === '/api/forms' && url.searchParams.get('type') === 'public-feed') {
        const feed = await getPublicFeed(firestoreRest('newbi-ent-v2'));
        return send(req, res, 200, JSON.stringify({ success: true, ...feed }), 'application/json');
    }
    if (url.pathname === '/api/forms' && url.searchParams.get('type') === 'enquiry') {
        let body = ''; req.on('data', (c) => { body += c; });
        return req.on('end', () => { try { req.body = JSON.parse(body); } catch { req.body = {}; } req.devDryRun = true; handleEnquiry(null, req, res); });
    }
    const clean = url.pathname.replace(/\/+$/, '') || '/';
    let file = LANDING[clean] ? path.join(dist, LANDING[clean]) : path.join(dist, decodeURIComponent(url.pathname));
    if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'app-shell.html');
    send(req, res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
}).listen(port, () => console.log(`dist preview on http://localhost:${port}`));
