import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
    apiKey: "AIzaSyBnl7hSfXXUj4khyV3yrhT5oUtMQfdoH_A",
    authDomain: "newbi-ent-v2.firebaseapp.com",
    projectId: "newbi-ent-v2",
    storageBucket: "newbi-ent-v2.firebasestorage.app",
    messagingSenderId: "860370467784",
    appId: "1:860370467784:web:d7b4dfc66336f6da50defd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
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
    const baseUrl = 'https://newbi.live'; // Assuming default domain

    let meta = {
        title: "Newbi Entertainment & Marketing",
        description: "Experience the pulse of entertainment with Newbi. Premier events, marketing, and the ultimate community tribe.",
        image: `${baseUrl}/og-image.png`,
        url: baseUrl,
        type: 'website'
    };

    try {
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
            const snap = await getDoc(doc(db, 'forms', id));
            if (snap.exists()) {
                const data = snap.data();
                meta.title = `${data.title} | Newbi Forms`;
                meta.description = data.description?.substring(0, 155) || `Participate in ${data.title} on Newbi Hub.`;
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = formId ? `${baseUrl}/forms/${id}` : `${baseUrl}/community-join?form=${id}`;
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
            if (page === 'contact') {
                meta.title = "Contact Us | Newbi Ent.";
                meta.description = "Get in touch with Newbi Entertainment & Marketing.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/contact`;
            } else if (page === 'concertzone') {
                meta.title = "Concert Zone | Newbi Ent.";
                meta.description = "Latest music, live events, artists, guides, and concert news from Newbi.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/concertzone`;
            } else if (page === 'creator') {
                meta.title = "Creator Elite Network | Newbi Ent.";
                meta.description = "Apply for professional backing and gain access to premium brand campaigns.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/creator`;
            } else if (page === 'creator-join') {
                meta.title = "Join Creator Network | Newbi Ent.";
                meta.description = "Register to join Newbi's Elite Creator Network.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/creator/join`;
            } else if (page === 'creator-dashboard') {
                meta.title = "Creator Dashboard | Newbi Ent.";
                meta.description = "Manage your creator profile and track campaigns.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/creator-dashboard`;
            }
        }
    } catch (error) {
        console.error("Error fetching dynamic OG data:", error);
    }

    // Load the index.html from the filesystem
    // In Vercel production, we read the compiled dist/index.html which contains correct production asset links.
    // In local development, we fallback to the root index.html.
    let indexPath = path.join(process.cwd(), 'dist', 'index.html');
    if (!fs.existsSync(indexPath)) {
        indexPath = path.join(process.cwd(), 'index.html');
    }
    let html = '';
    
    try {
        html = fs.readFileSync(indexPath, 'utf8');
    } catch (err) {
        // Fallback skeleton if file can't be read
        html = `<!DOCTYPE html><html><head><title>${meta.title}</title></head><body><div id="root"></div></body></html>`;
    }

    // Inject Meta Tags into Head
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

    // Strip original title, icon, and open graph tags to avoid duplicates
    html = html.replace(/<title>.*?<\/title>/gi, '');
    html = html.replace(/<meta property="og:.*?".*?>/gi, '');
    html = html.replace(/<meta name="twitter:.*?".*?>/gi, '');
    html = html.replace(/<meta name="description".*?>/gi, '');
    html = html.replace(/<link rel="(icon|shortcut icon)"[^>]*>/gi, '');
    
    html = html.replace('</head>', `${metaTags}\n</head>`);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300'); // Cache for performance
    res.status(200).send(html);
}
