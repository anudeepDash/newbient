import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "newbi-ent-v2.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "newbi-ent-v2",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "newbi-ent-v2.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "860370467784",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:860370467784:web:d7b4dfc66336f6da50defd"
};

let db = null;
try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.warn('[OG] Firebase init warning:', e.message);
}

async function getBaseHtml(req) {
    const candidatePaths = [
        path.join(process.cwd(), 'dist', 'index.html'),
        path.join(__dirname, '..', 'dist', 'index.html'),
        path.join(__dirname, 'dist', 'index.html'),
        path.join(process.cwd(), 'index.html')
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

    return { html: '', path: '' };
}

export default async function handler(req, res) {
    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
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

    // Metadata fetch with 2500ms safety timeout to avoid blocking page loads
    const fetchMetadata = async () => {
        if (!db) return;

        if (eventId) {
            const snap = await getDoc(doc(db, 'upcoming_events', eventId));
            if (snap.exists()) {
                const data = snap.data();
                meta.title = `${data.title}${data.city ? ` | ${data.city}` : ''}`;
                meta.description = `Featuring ${Array.isArray(data.artists) ? data.artists.join(', ') : 'Exclusive Artists'}. ${data.description || ''}`.substring(0, 155);
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = `${baseUrl}/?event=${eventId}`;
            }
        } else if (giveawaySlug) {
            const q = query(collection(db, 'giveaways'), where('slug', '==', giveawaySlug));
            const snaps = await getDocs(q);
            if (!snaps.empty) {
                const data = snaps.docs[0].data();
                meta.title = `${data.name} | Newbi Giveaway`;
                meta.description = data.description?.substring(0, 155) || `Join the ultimate giveaway to win ${data.name}!`;
                meta.image = data.posterUrl?.startsWith('http') ? data.posterUrl : `${baseUrl}${data.posterUrl || '/og-image.png'}`;
                meta.url = `${baseUrl}/giveaway/${giveawaySlug}`;
            }
        } else if (formId || queryFormId) {
            const id = formId || queryFormId;
            let found = false;
            const snap = await getDoc(doc(db, 'forms', id));
            if (snap.exists()) {
                const data = snap.data();
                meta.title = `${data.title} | Newbi Forms`;
                meta.description = data.description?.substring(0, 155) || `Participate in ${data.title} on Newbi Hub.`;
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = formId ? `${baseUrl}/forms/${id}` : `${baseUrl}/community-join?form=${id}`;
                found = true;
            }

            if (!found) {
                const eventSnap = await getDoc(doc(db, 'upcoming_events', id));
                if (eventSnap.exists()) {
                    const data = eventSnap.data();
                    meta.title = `${data.title} | Newbi Form`;
                    meta.description = data.description?.substring(0, 155) || `Participate in ${data.title} on Newbi Hub.`;
                    meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                    meta.url = `${baseUrl}/forms/${id}`;
                    found = true;
                }
            }

            if (!found) {
                const gigSnap = await getDoc(doc(db, 'volunteer_gigs', id));
                if (gigSnap.exists()) {
                    const data = gigSnap.data();
                    meta.title = `${data.title} | Volunteer Form`;
                    meta.description = data.description?.substring(0, 155) || `Participate in ${data.title} on Newbi Hub.`;
                    meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                    meta.url = `${baseUrl}/forms/${id}`;
                    found = true;
                }
            }
        } else if (gigId) {
            const snap = await getDoc(doc(db, 'volunteer_gigs', gigId));
            if (snap.exists()) {
                const data = snap.data();
                meta.title = `${data.title} | Volunteer Gig`;
                meta.description = data.description?.substring(0, 155) || `Join the Newbi Tribe as a volunteer for ${data.title}.`;
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = `${baseUrl}/community-join?gig=${gigId}`;
            }
        } else if (glId) {
            const snap = await getDoc(doc(db, 'guestlists', glId));
            if (snap.exists()) {
                const data = snap.data();
                meta.title = `${data.title} | VIP Guestlist`;
                meta.description = data.description?.substring(0, 155) || `Get on the exclusive guestlist for ${data.title}.`;
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = `${baseUrl}/community-join?gl=${glId}`;
            }
        } else if (proposalId) {
            const snap = await getDoc(doc(db, 'proposals', proposalId));
            if (snap.exists()) {
                const data = snap.data();
                meta.title = `${data.proposalNumber || 'Strategic Quote'} | ${data.clientName || 'Valued Partner'} | Newbi Ent.`;
                meta.description = `Strategic Proposal for ${data.campaignName || 'Campaign'}. Status: ${data.status || 'Draft'}.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/proposal/${proposalId}`;
            }
        } else if (invoiceId) {
            const snap = await getDoc(doc(db, 'invoices', invoiceId));
            if (snap.exists()) {
                const data = snap.data();
                meta.title = `${data.invoiceNumber || 'Tax Invoice'} | ${data.clientName || 'Valued Partner'} | Newbi Ent.`;
                meta.description = `Tax Invoice for ${data.campaignName || 'Services'}. Status: ${data.status || 'Unpaid'}.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/invoice/${invoiceId}`;
            }
        } else if (agreementId) {
            const snap = await getDoc(doc(db, 'agreements', agreementId));
            if (snap.exists()) {
                const data = snap.data();
                meta.title = `${data.agreementNumber || 'Agreement'} | ${data.clientName || 'Valued Partner'} | Newbi Ent.`;
                meta.description = `Service Agreement for ${data.campaignName || 'Services'}. Status: ${data.status || 'Draft'}.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/agreement/${agreementId}`;
            }
        } else if (blogSlug) {
            const q = query(collection(db, 'posts'), where('slug', '==', blogSlug));
            const snaps = await getDocs(q);
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
        // Safe minimal fallback HTML for direct browser visits without premature redirects
        html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${meta.title}</title><script type="module" crossorigin src="/src/main.jsx"></script></head><body><div id="root"></div></body></html>`;
    }

    // Inject dynamic Meta Tags into Head
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

