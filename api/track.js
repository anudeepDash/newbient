import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

    const { 
        type, 
        tid, 
        email, 
        cid, 
        sub, 
        url, 
        target, 
        destination: customDest,
        code 
    } = { ...req.query, ...req.body };

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '';
    const nowIso = new Date().toISOString();

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
        if (!destination || destination === '#' || destination.startsWith('javascript:')) {
            destination = 'https://newbi.live';
        }

        // Ensure proper scheme for external URLs
        if (!destination.startsWith('http://') && !destination.startsWith('https://') && !destination.startsWith('/')) {
            destination = `https://${destination}`;
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
