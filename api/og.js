import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.warn('[OG] Firebase Admin init warning:', e.message);
}

const normalizeString = (str) => String(str || '').trim().toLowerCase();
const createSlug = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function getBaseHtml(req) {
    const candidatePaths = [
        path.join(process.cwd(), 'dist', 'index.html'),
        path.join(__dirname, '..', 'dist', 'index.html'),
        path.join(__dirname, 'dist', 'index.html')
    ];

    for (const p of candidatePaths) {
        try {
            if (fs.existsSync(p)) {
                const content = fs.readFileSync(p, 'utf8');
                if (content && content.length > 50 && content.includes('<div id="root">')) {
                    return { html: content, path: p };
                }
            }
        } catch (e) {}
    }

    try {
        const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host || 'newbi.live';
        const proto = req?.headers?.['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
        const res = await fetch(`${proto}://${host}/index.html`);
        if (res.ok) {
            const fetched = await res.text();
            if (fetched && fetched.length > 50 && fetched.includes('<div id="root">')) {
                return { html: fetched, path: 'remote' };
            }
        }
    } catch (e) {
        console.warn('[OG] Remote index.html fetch failed:', e);
    }

    // Fallback: Check root index.html
    const rootPath = path.join(process.cwd(), 'index.html');
    try {
        if (fs.existsSync(rootPath)) {
            const content = fs.readFileSync(rootPath, 'utf8');
            if (content && content.includes('<div id="root">')) {
                return { html: content, path: rootPath };
            }
        }
    } catch (e) {}

    return { html: '', path: '' };
}

export default async function handler(req, res) {
    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { 
        event: eventId, 
        giveaway: giveawaySlug, 
        formId, 
        gig: gigId, 
        gl: glId, 
        form: queryFormId,
        proposalId,
        invoiceId,
        agreementId,
        blogSlug,
        page
    } = req.query;
    const baseUrl = 'https://newbi.live';

    let meta = {
        title: "Newbi Entertainment & Marketing",
        description: "Experience the pulse of entertainment with Newbi. Premier events, marketing, and the ultimate community tribe.",
        image: `${baseUrl}/og-image.png`,
        url: baseUrl,
        type: 'website'
    };

    let initialData = null;

    // Metadata fetch with 2500ms safety timeout to avoid blocking page loads
    const fetchMetadata = async () => {
        if (!adminDb) return;

        if (eventId) {
            const snap = await adminDb.collection('upcoming_events').doc(eventId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.title}${data.city ? ` | ${data.city}` : ''}`;
                meta.description = `Featuring ${Array.isArray(data.artists) ? data.artists.join(', ') : 'Exclusive Artists'}. ${data.description || ''}`.substring(0, 155);
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = `${baseUrl}/?event=${eventId}`;
            }
        } else if (giveawaySlug) {
            const snaps = await adminDb.collection('giveaways').where('slug', '==', giveawaySlug).get();
            if (!snaps.empty) {
                const data = snaps.docs[0].data();
                meta.title = `${data.name} | Newbi Giveaway`;
                meta.description = data.description?.substring(0, 155) || `Join the ultimate giveaway to win ${data.name}!`;
                meta.image = data.posterUrl?.startsWith('http') ? data.posterUrl : `${baseUrl}${data.posterUrl || '/og-image.png'}`;
                meta.url = `${baseUrl}/giveaway/${giveawaySlug}`;
            }
        } else if (formId || queryFormId) {
            const id = (formId || queryFormId || '').trim();
            const clean = normalizeString(id);
            const cleanSlug = createSlug(id);

            // Tier 1: Look in 'forms' collection by ID
            const snap = await adminDb.collection('forms').doc(id).get();
            if (snap.exists) {
                const data = snap.data();
                initialData = { id: snap.id, ...data };
                meta.title = `${data.title} | Newbi Forms`;
                meta.description = data.description?.substring(0, 155) || `Participate in ${data.title} on Newbi Hub.`;
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = formId ? `${baseUrl}/forms/${id}` : `${baseUrl}/community?form=${id}`;
            } else {
                // Scan forms for slug or title
                const allFormsSnap = await adminDb.collection('forms').get();
                let foundDoc = null;
                allFormsSnap.forEach(d => {
                    if (foundDoc) return;
                    const dData = d.data();
                    if (
                        normalizeString(d.id) === clean ||
                        normalizeString(dData.slug) === clean ||
                        normalizeString(dData.formId) === clean ||
                        (dData.title && createSlug(dData.title) === cleanSlug) ||
                        (dData.link && normalizeString(dData.link).endsWith(`/${clean}`))
                    ) {
                        foundDoc = { id: d.id, ...dData };
                    }
                });

                if (foundDoc) {
                    initialData = foundDoc;
                    meta.title = `${foundDoc.title} | Newbi Forms`;
                    meta.description = foundDoc.description?.substring(0, 155) || `Participate in ${foundDoc.title} on Newbi Hub.`;
                    meta.image = foundDoc.image?.startsWith('http') ? foundDoc.image : `${baseUrl}${foundDoc.image || '/og-image.png'}`;
                    meta.url = formId ? `${baseUrl}/forms/${foundDoc.id}` : `${baseUrl}/community?form=${foundDoc.id}`;
                } else {
                    // Check upcoming_events
                    const eventSnap = await adminDb.collection('upcoming_events').doc(id).get();
                    if (eventSnap.exists) {
                        const data = eventSnap.data();
                        const refFormId = data.formId || data.relatedArtistFormId;
                        if (refFormId) {
                            const refSnap = await adminDb.collection('forms').doc(refFormId).get();
                            if (refSnap.exists) {
                                initialData = { id: refSnap.id, ...refSnap.data() };
                            }
                        }
                        if (!initialData) {
                            initialData = {
                                id: eventSnap.id,
                                title: data.title,
                                description: data.description,
                                formUrl: data.formUrl || data.link,
                                activeLabel: data.status || 'Live',
                                image: data.image,
                                highlightColor: data.highlightColor || '#2ebfff',
                                bottomText: data.location || 'Event Form'
                            };
                        }
                        meta.title = `${data.title} | Newbi Form`;
                        meta.description = data.description?.substring(0, 155) || `Participate in ${data.title} on Newbi Hub.`;
                        meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                        meta.url = `${baseUrl}/forms/${id}`;
                    } else {
                        // Check volunteer_gigs
                        const gigSnap = await adminDb.collection('volunteer_gigs').doc(id).get();
                        if (gigSnap.exists) {
                            const data = gigSnap.data();
                            initialData = {
                                id: gigSnap.id,
                                title: data.title,
                                description: data.description,
                                formUrl: data.formUrl || data.applyLink || data.link,
                                activeLabel: data.status || 'Live',
                                image: data.image,
                                highlightColor: data.highlightColor || '#39FF14',
                                bottomText: data.location || 'Gig Form'
                            };
                            meta.title = `${data.title} | Volunteer Form`;
                            meta.description = data.description?.substring(0, 155) || `Participate in ${data.title} on Newbi Hub.`;
                            meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                            meta.url = `${baseUrl}/forms/${id}`;
                        }
                    }
                }
            }
        } else if (gigId) {
            const snap = await adminDb.collection('volunteer_gigs').doc(gigId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.title} | Volunteer Gig`;
                meta.description = data.description?.substring(0, 155) || `Join the Newbi Tribe as a volunteer for ${data.title}.`;
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = `${baseUrl}/community?gig=${gigId}`;
            }
        } else if (glId) {
            const snap = await adminDb.collection('guestlists').doc(glId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.title} | VIP Guestlist`;
                meta.description = data.description?.substring(0, 155) || `Get on the exclusive guestlist for ${data.title}.`;
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = `${baseUrl}/community?gl=${glId}`;
            }
        } else if (proposalId) {
            const snap = await adminDb.collection('proposals').doc(proposalId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.proposalNumber || 'Strategic Quote'} | ${data.clientName || 'Valued Partner'} | Newbi Ent.`;
                meta.description = `Strategic Proposal for ${data.campaignName || 'Campaign'}. Status: ${data.status || 'Draft'}.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/proposal/${proposalId}`;
            }
        } else if (invoiceId) {
            const snap = await adminDb.collection('invoices').doc(invoiceId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.invoiceNumber || 'Tax Invoice'} | ${data.clientName || 'Valued Partner'} | Newbi Ent.`;
                meta.description = `Tax Invoice for ${data.campaignName || 'Services'}. Status: ${data.status || 'Unpaid'}.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/invoice/${invoiceId}`;
            }
        } else if (agreementId) {
            const snap = await adminDb.collection('agreements').doc(agreementId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.agreementNumber || 'Agreement'} | ${data.clientName || 'Valued Partner'} | Newbi Ent.`;
                meta.description = `Service Agreement for ${data.campaignName || 'Services'}. Status: ${data.status || 'Draft'}.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/agreement/${agreementId}`;
            }
        } else if (blogSlug) {
            const snaps = await adminDb.collection('posts').where('slug', '==', blogSlug).get();
            if (!snaps.empty) {
                const data = snaps.docs[0].data();
                meta.title = `${data.title} | Concert Zone | Newbi Ent.`;
                meta.description = data.excerpt?.substring(0, 155) || data.content?.replace(/<[^>]*>/g, '').substring(0, 155) || '';
                meta.image = data.coverImage?.startsWith('http') ? data.coverImage : `${baseUrl}${data.coverImage || '/og-image.png'}`;
                meta.url = `${baseUrl}/concertzone/${data.category || 'music'}/${blogSlug}`;
            }
        } else if (page) {
            if (page === 'creator' || page === 'creator-landing') {
                meta.title = "Newbi Creator Network • Brand Campaigns & Live Gigs";
                meta.description = "Discover verified brand collaborations and experiential gigs in Bengaluru, Mumbai, Delhi-NCR, and across India. 100% free to join.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/creator`;
            } else if (page === 'creator-join') {
                meta.title = "Apply to Newbi Creator Network • 45-Second Onboarding";
                meta.description = "Connect with top brands and live events in your city. Fast creator onboarding with zero agency fees.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/creator/join`;
            }
        }
    };

    try {
        await Promise.race([
            fetchMetadata(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('OG Fetch Timeout')), 2500))
        ]);
    } catch (error) {
        console.warn('[OG] Metadata fetch note:', error.message);
    }

    // Load base HTML from distribution
    const { html: loadedHtml } = await getBaseHtml(req);
    let html = loadedHtml;

    if (!html) {
        html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${meta.title}</title></head><body><div id="root"></div></body></html>`;
    }

    // Inject dynamic Meta Tags & Initial Data into Head
    let initialScript = '';
    if (initialData) {
        initialScript = `<script>window.__INITIAL_FORM_DATA__ = ${JSON.stringify(initialData)};</script>`;
    }

    const metaTags = `
        <title>${meta.title}</title>
        <meta name="description" content="${meta.description}" />
        <meta property="og:title" content="${meta.title}" />
        <meta property="og:description" content="${meta.description}" />
        <meta property="og:image" content="${meta.image}" />
        <meta property="og:url" content="${meta.url}" />
        <meta property="og:type" content="${meta.type}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${meta.title}" />
        <meta name="twitter:description" content="${meta.description}" />
        <meta name="twitter:image" content="${meta.image}" />
        <link rel="icon" type="image/png" href="${baseUrl}/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="${baseUrl}/favicon.png" />
        ${initialScript}
    `;

    // Strip static title and duplicate meta tags to avoid conflicting tags
    html = html.replace(/<title>.*?<\/title>/gi, '');
    html = html.replace(/<meta property="og:.*?".*?>/gi, '');
    html = html.replace(/<meta name="twitter:.*?".*?>/gi, '');
    html = html.replace(/<meta name="description".*?>/gi, '');
    html = html.replace(/<link rel="(icon|shortcut icon)"[^>]*>/gi, '');
    
    html = html.replace('</head>', `${metaTags}\n</head>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).send(html);
}
