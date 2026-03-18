import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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
    const { event: eventId } = req.query;
    const baseUrl = 'https://newbi.live';

    let eventData = null;

    if (eventId) {
        try {
            const eventRef = doc(db, 'upcoming_events', eventId);
            const eventSnap = await getDoc(eventRef);
            if (eventSnap.exists()) {
                eventData = { ...eventSnap.data(), id: eventSnap.id };
            }
        } catch (error) {
            console.error("Error fetching event:", error);
        }
    }

    // Default Meta Tags
    const defaultMeta = {
        title: "Newbi Entertainment & Marketing",
        description: "Experience the pulse of entertainment with Newbi. Premier events, marketing, and the ultimate community tribe.",
        image: `${baseUrl}/logo.png`,
        url: baseUrl,
        type: 'website'
    };

    const meta = eventData ? {
        title: `${eventData.title}${eventData.city ? ` | ${eventData.city}` : ''}`,
        description: `Featuring ${Array.isArray(eventData.artists) ? eventData.artists.join(', ') : 'Exclusive Artists'} on ${eventData.date ? new Date(eventData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Upcoming Date'}. ${eventData.description || 'Join us for an unforgettable experience.'}`.substring(0, 155),
        image: eventData.image?.startsWith('http') ? eventData.image : `${baseUrl}${eventData.image || '/logo.png'}`,
        url: `${baseUrl}/?event=${eventId}`,
        type: 'website'
    } : defaultMeta;

    // Load the index.html from the filesystem
    // Note: In Vercel, this is usually at the root or relative to the function
    const indexPath = path.join(process.cwd(), 'index.html');
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
    `;

    // Replace the default title or head tags
    // Simple replacement: insert before </head> or replace existing ones if they exist
    // For simplicity, we'll strip existing og tags and add our own
    html = html.replace(/<title>.*?<\/title>/, '');
    html = html.replace('</head>', `${metaTags}</head>`);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
