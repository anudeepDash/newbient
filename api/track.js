import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import { recordUnsubscribe, recordResubscribe, unsubscribePage, isValidEmail, normalizeEmail } from './_lib/mailing.js';
import { isValidSignature, isOwnHost, isValidUnsubscribeSig, readSignedToken } from './_lib/linkSign.js';
import { recordWhatsAppStatus } from './_lib/whatsapp.js';

// The WhatsApp webhook signs the exact bytes Meta sent, so this function reads
// the body itself (see readBody) instead of letting the runtime parse it.
export const config = { api: { bodyParser: false } };

const escapeHtml = (v) => String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

let adminDb = null;

try {
    if (!getApps().length) {
        const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "newbi-ent-v2")?.trim();
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
        let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

        if (projectId && clientEmail && privateKey) {
            let formattedKey = privateKey.trim();
            if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || 
                (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
                formattedKey = formattedKey.slice(1, -1).trim();
            }
            const header = '-----BEGIN PRIVATE KEY-----';
            const footer = '-----END PRIVATE KEY-----';
            let rawBase64 = formattedKey;
            if (rawBase64.includes(header)) rawBase64 = rawBase64.replace(header, '');
            if (rawBase64.includes(footer)) rawBase64 = rawBase64.replace(footer, '');
            rawBase64 = rawBase64.replace(/\\n/g, '').replace(/\s+/g, '');
            const pemLines = [];
            for (let i = 0; i < rawBase64.length; i += 64) {
                pemLines.push(rawBase64.substring(i, i + 64));
            }
            formattedKey = `${header}\n${pemLines.join('\n')}\n${footer}`;

            const app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: formattedKey,
                }),
            });
            adminDb = getFirestore(app);
        } else if (projectId) {
            const app = initializeApp({ projectId });
            adminDb = getFirestore(app);
        }
    } else {
        adminDb = getFirestore(getApps()[0]);
    }
} catch (e) {
    console.warn('[TRACK API] Firebase Admin init notice:', e.message);
}

// 1x1 transparent GIF buffer
const TRANSPARENT_1PX_GIF = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

const readRawBody = async (req) => {
    let parsed;
    try { parsed = req.body; } catch { parsed = undefined; }
    if (Buffer.isBuffer(parsed)) return parsed;
    if (typeof parsed === 'string') return Buffer.from(parsed);
    if (parsed && typeof parsed === 'object') return null; // already parsed by the runtime: raw bytes are gone
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return Buffer.alloc(0);
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) break; // nothing we accept is this big
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

const parseBody = (raw, contentType = '', fallback = {}) => {
    if (!raw) return fallback && typeof fallback === 'object' ? fallback : {};
    const text = raw.toString('utf8');
    if (!text) return {};
    try {
        if (/json/i.test(contentType)) return JSON.parse(text);
        if (/x-www-form-urlencoded/i.test(contentType) || /^[\w%.-]+=/.test(text)) return Object.fromEntries(new URLSearchParams(text));
    } catch { /* fall through */ }
    return {};
};

/** Meta's X-Hub-Signature-256: "sha256=" + HMAC-SHA256(app secret, raw body). */
const isValidMetaSignature = (raw, header) => {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret || !raw || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
    return expected.length === header.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
};

const handleWhatsAppWebhook = async (req, res, raw, body) => {
    // Meta's one-time check when the webhook URL is saved.
    if (req.method === 'GET') {
        const q = req.query || {};
        const token = process.env.WHATSAPP_VERIFY_TOKEN;
        if (q['hub.mode'] === 'subscribe' && token && q['hub.verify_token'] === token) {
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).end(String(q['hub.challenge'] || ''));
        }
        return res.status(403).json({ error: 'Verification failed' });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!isValidMetaSignature(raw, req.headers['x-hub-signature-256'])) {
        console.warn('[TRACK API] WhatsApp webhook with a bad or missing signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }
    const statuses = [];
    (body.entry || []).forEach(e => (e.changes || []).forEach(c => (c.value?.statuses || []).forEach(st => statuses.push(st))));
    try {
        await Promise.all(statuses.slice(0, 100).map(st => recordWhatsAppStatus(st).catch(err => console.warn('[TRACK API] WhatsApp status not saved:', err.message))));
    } catch (err) {
        console.error('[TRACK API] WhatsApp webhook failed:', err.message);
    }
    // Always 200 once the signature checks out, or Meta keeps retrying.
    return res.status(200).json({ received: statuses.length });
};

export default async function handler(req, res) {
    if (!res.status) {
        res.status = function (code) {
            this.statusCode = code;
            return this;
        };
    }
    if (!res.json) {
        res.json = function (data) {
            this.setHeader('Content-Type', 'application/json');
            this.end(JSON.stringify(data));
            return this;
        };
    }

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let parsedFallback;
    try { parsedFallback = req.body; } catch { parsedFallback = undefined; }
    const rawBody = await readRawBody(req);
    req.body = parseBody(rawBody, req.headers['content-type'] || '', parsedFallback);

    if (req.query?.type === 'whatsapp') {
        return handleWhatsAppWebhook(req, res, rawBody, req.body || {});
    }

    const { 
        type, 
        tid, 
        email, 
        cid, 
        sub, 
        url, 
        target, 
        destination: customDest,
        code,
        sig,
        token
    } = { ...req.query, ...req.body };

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '';
    const nowIso = new Date().toISOString();

    // -------------------------------------------------------------
    // 0. Unsubscribe (link in every campaign email + one-click header)
    //    GET shows a confirm page; POST unsubscribes. Mail scanners that
    //    prefetch links only GET, so they can't unsubscribe anyone.
    // -------------------------------------------------------------
    if (type === 'unsubscribe') {
        const sendPage = (status, html) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            return res.end(html);
        };
        const campaignId = cid || tid || '';
        const linkEmail = email ? normalizeEmail(email) : '';
        if (req.method !== 'POST') {
            const signedLink = linkEmail && isValidUnsubscribeSig(linkEmail, sig);
            return sendPage(200, unsubscribePage({ state: 'confirm', email: linkEmail, campaignId, sig: signedLink ? sig : '' }));
        }
        const target = normalizeEmail((req.body && req.body.email) || email || '');
        if (!isValidEmail(target)) {
            return sendPage(400, unsubscribePage({ state: 'confirm', email: target, campaignId, message: "That doesn't look like an email address." }));
        }
        // Links we email carry a signature for that address. Old unsigned links
        // and the type-your-email form still work, but are recorded as unsigned.
        const signed = isValidUnsubscribeSig(target, (req.body && req.body.sig) || sig);
        const oneClick = Boolean(req.body && req.body['List-Unsubscribe']);
        try {
            await recordUnsubscribe({ email: target, campaignId, source: oneClick ? 'one_click' : signed ? 'email_link' : 'unsigned_form', userAgent, signed });
            if (oneClick) return res.status(200).json({ success: true });
            return sendPage(200, unsubscribePage({ state: 'done', email: target }));
        } catch (err) {
            console.error('[TRACK API] Unsubscribe failed:', err.message);
            return sendPage(500, unsubscribePage({ state: 'confirm', email: target, campaignId, message: "Couldn't unsubscribe you just now. Please try again in a minute." }));
        }
    }

    // -------------------------------------------------------------
    // 0b. Confirm a re-subscribe (double opt-in link from the signup form)
    // -------------------------------------------------------------
    if (type === 'resubscribe') {
        const sendPage = (status, html) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            return res.end(html);
        };
        const payload = readSignedToken(token);
        if (!payload || payload.purpose !== 'resubscribe' || !isValidEmail(payload.email)) {
            return sendPage(400, unsubscribePage({ state: 'invalid', message: 'This confirmation link is invalid or has expired. Sign up again to get a new one.' }));
        }
        if (req.method !== 'POST') {
            const safeToken = String(token).replace(/[^\w.-]/g, '');
            return sendPage(200, `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Confirm · Newbi</title></head>
<body style="margin:0;font-family:-apple-system,system-ui,sans-serif;background:#f6f6f7;color:#111;display:flex;min-height:100dvh;align-items:center;justify-content:center;padding:16px">
<form method="POST" action="/api/track?type=resubscribe&token=${safeToken}" style="max-width:420px;width:100%;background:#fff;border:1px solid #e7e7ea;border-radius:20px;padding:28px">
<h1 style="font-size:22px;margin:0 0 10px">Subscribe to Newbi emails?</h1><p style="color:#555;font-size:15px;line-height:1.5">Start sending Newbi emails to ${escapeHtml(payload.email)} again.</p>
<button type="submit" style="width:100%;height:48px;border:0;border-radius:12px;background:#111;color:#fff;font-size:15px;font-weight:700">Yes, subscribe me</button></form></body></html>`);
        }
        try {
            await recordResubscribe(payload.email, undefined, { source: 'double_opt_in' });
            return sendPage(200, unsubscribePage({ state: 'resubscribed', email: payload.email }));
        } catch (err) {
            console.error('[TRACK API] Resubscribe failed:', err.message);
            return sendPage(500, unsubscribePage({ state: 'invalid', message: "Couldn't confirm just now. Please try the link again in a minute." }));
        }
    }

    // Determine event type: open pixel vs click redirect vs custom short code
    const isExplicitOpen = type === 'open' || type === 'pixel';
    const rawTargetUrl = url || target || customDest;
    const isClick = type === 'click' || (!!rawTargetUrl && !isExplicitOpen);

    // -------------------------------------------------------------
    // 1. Handle Link Click Tracking & Immediate Redirection
    // -------------------------------------------------------------
    if (isClick && rawTargetUrl) {
        let destination = String(rawTargetUrl).trim();
        try {
            destination = decodeURIComponent(destination);
        } catch (e) {}

        // Fallback for empty / invalid destinations
        if (!destination || destination === '#' || /^\s*(javascript|data|vbscript):/i.test(destination)) {
            destination = 'https://newbi.live';
        }

        // Only our own sites, or links we signed when the email was sent, redirect
        // straight away. Anything else gets a "you're leaving" page (no open redirect).
        let trusted = destination.startsWith('/') && !destination.startsWith('//');
        try {
            const parsed = new URL(/^https?:\/\//i.test(destination) ? destination : `https://${destination}`);
            trusted = trusted || isOwnHost(parsed.hostname) || isValidSignature(String(rawTargetUrl), sig);
        } catch { /* unparseable: treated as untrusted */ }

        // Ensure proper scheme for external URLs
        if (!destination.startsWith('http://') && !destination.startsWith('https://') && !destination.startsWith('/')) {
            destination = `https://${destination}`;
        }

        try {
            const destUrl = new URL(destination, 'https://newbi.live');
            if (destUrl.hostname.includes('newbi.live') || destUrl.hostname.includes('newbient.com') || destination.startsWith('/')) {
                if (email) {
                    destUrl.searchParams.set('email', email);
                    destUrl.searchParams.set('via', 'email');
                }
                if (cid) destUrl.searchParams.set('cid', cid);
                if (tid) destUrl.searchParams.set('tid', tid);
                
                destination = destination.startsWith('/') ? `${destUrl.pathname}${destUrl.search}${destUrl.hash}` : destUrl.href;
            }
        } catch (e) {
            console.warn('[TRACK API] URL parse error:', e.message);
        }

        // Asynchronously log the click event to Firestore
        if (adminDb) {
            try {
                const normEmail = email ? String(email).toLowerCase().trim() : null;
                const clickEvent = {
                    eventType: 'click',
                    trackingId: tid || null,
                    campaignId: cid || null,
                    email: normEmail,
                    subject: sub || null,
                    targetUrl: destination,
                    ip: clientIp,
                    userAgent,
                    referrer,
                    timestamp: nowIso,
                    createdAt: FieldValue.serverTimestamp()
                };

                // Remove undefined values
                Object.keys(clickEvent).forEach(k => clickEvent[k] === undefined && delete clickEvent[k]);

                // 1. Record in email_events stream
                const eventPromise = adminDb.collection('email_events').add(clickEvent);

                // 2. Update campaign / broadcast aggregate document if campaignId or trackingId provided
                const targetId = cid || tid;
                let updatePromise = Promise.resolve();

                if (targetId) {
                    const campaignRef = adminDb.collection('email_campaigns').doc(targetId);
                    updatePromise = campaignRef.get().then(docSnap => {
                        if (docSnap.exists) {
                            const updates = {
                                clicksCount: FieldValue.increment(1),
                                lastClickedAt: nowIso,
                                clickedUrls: FieldValue.arrayUnion(destination)
                            };
                            if (normEmail) {
                                updates.clickedEmails = FieldValue.arrayUnion(normEmail);
                            }
                            return campaignRef.update(updates).then(() => {
                                return campaignRef.get().then(updatedSnap => {
                                    const data = updatedSnap.data() || {};
                                    const uniqueCount = Array.isArray(data.clickedEmails) ? data.clickedEmails.length : 0;
                                    return campaignRef.update({ uniqueClicks: uniqueCount });
                                });
                            });
                        }
                    }).catch(err => console.warn('[TRACK API] Update campaign click error:', err.message));
                }

                // Wait with a small timeout so redirect remains fast
                await Promise.race([
                    Promise.all([eventPromise, updatePromise]),
                    new Promise(r => setTimeout(r, 450))
                ]);
            } catch (err) {
                console.error('[TRACK API] Click log error:', err);
            }
        }

        if (!trusted) {
            const safeHref = escapeHtml(destination);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            return res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Leaving Newbi</title></head>
<body style="margin:0;font-family:-apple-system,system-ui,sans-serif;background:#0b0c10;color:#f2f2f2;display:flex;min-height:100dvh;align-items:center;justify-content:center;padding:24px">
<div style="max-width:420px;text-align:center"><p style="font-size:18px;font-weight:700;margin:0 0 8px">You're leaving newbi.live</p>
<p style="font-size:14px;color:#a0a0a8;margin:0 0 20px;word-break:break-all">${safeHref}</p>
<a href="${safeHref}" rel="noopener noreferrer" style="display:inline-block;background:#39FF14;color:#000;font-weight:700;padding:12px 22px;border-radius:12px;text-decoration:none">Continue</a></div></body></html>`);
        }

        res.writeHead(302, {
            'Location': destination,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        return res.end();
    }

    // -------------------------------------------------------------
    // 2. Handle Custom Short Link Lookup (/api/track?code=XYZ)
    // -------------------------------------------------------------
    if (code) {
        if (adminDb) {
            try {
                const linkSnap = await adminDb.collection('custom_links').doc(code).get();
                if (linkSnap.exists) {
                    const linkData = linkSnap.data() || {};
                    const destination = linkData.targetUrl || 'https://newbi.live';

                    adminDb.collection('custom_links').doc(code).update({
                        clicksCount: FieldValue.increment(1),
                        lastClickedAt: nowIso
                    }).catch(() => {});

                    adminDb.collection('link_events').add({
                        code,
                        targetUrl: destination,
                        ip: clientIp,
                        userAgent,
                        timestamp: nowIso,
                        createdAt: FieldValue.serverTimestamp()
                    }).catch(() => {});

                    res.writeHead(302, { 
                        'Location': destination,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    });
                    return res.end();
                }
            } catch (err) {
                console.error('[TRACK API] Short code lookup error:', err);
            }
        }
        res.writeHead(302, { Location: 'https://newbi.live' });
        return res.end();
    }

    // -------------------------------------------------------------
    // 3. Handle Email Open Pixel (type=open / default image response)
    // -------------------------------------------------------------
    if (adminDb && (tid || cid || email)) {
        try {
            const normEmail = email ? String(email).toLowerCase().trim() : null;
            const openEvent = {
                eventType: 'open',
                trackingId: tid || null,
                campaignId: cid || null,
                email: normEmail,
                subject: sub || null,
                ip: clientIp,
                userAgent,
                referrer,
                timestamp: nowIso,
                createdAt: FieldValue.serverTimestamp()
            };

            // Remove undefined values
            Object.keys(openEvent).forEach(k => openEvent[k] === undefined && delete openEvent[k]);

            // 1. Record in email_events stream
            const eventPromise = adminDb.collection('email_events').add(openEvent);

            // 2. Update campaign / broadcast aggregate document
            const targetId = cid || tid;
            let updatePromise = Promise.resolve();

            if (targetId) {
                const campaignRef = adminDb.collection('email_campaigns').doc(targetId);
                updatePromise = campaignRef.get().then(docSnap => {
                    if (docSnap.exists) {
                        const updates = {
                            opensCount: FieldValue.increment(1),
                            lastOpenedAt: nowIso
                        };
                        if (normEmail) {
                            updates.openedEmails = FieldValue.arrayUnion(normEmail);
                        }
                        return campaignRef.update(updates).then(() => {
                            return campaignRef.get().then(updatedSnap => {
                                const data = updatedSnap.data() || {};
                                const uniqueCount = Array.isArray(data.openedEmails) ? data.openedEmails.length : 0;
                                return campaignRef.update({ uniqueOpens: uniqueCount });
                            });
                        });
                    }
                }).catch(err => console.warn('[TRACK API] Update open campaign error:', err.message));
            }

            // Wait with a small timeout
            await Promise.race([
                Promise.all([eventPromise, updatePromise]),
                new Promise(r => setTimeout(r, 450))
            ]);
        } catch (err) {
            console.error('[TRACK API] Open pixel log error:', err);
        }
    }

    // Return 1x1 transparent GIF with cache-busting headers
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', TRANSPARENT_1PX_GIF.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).end(TRANSPARENT_1PX_GIF);
}
