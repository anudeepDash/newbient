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
        campaignId,
        docId,
        ticketId,
        category,
        page
    } = req.query;
    const baseUrl = 'https://newbi.live';

    // Fallback path detection if query parameters weren't explicitly supplied
    let detectedPath = '';
    const rawPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.url || '';
    if (rawPath) {
        try {
            detectedPath = new URL(rawPath, baseUrl).pathname;
        } catch (e) {
            detectedPath = rawPath.split('?')[0];
        }
    }

    let effectivePage = page;
    let effectiveCampaignId = campaignId;
    let effectiveDocId = docId;
    let effectiveTicketId = ticketId;
    let effectiveCategory = category;
    let effectiveBlogSlug = blogSlug;
    let effectiveFormId = formId || queryFormId;
    let effectiveGiveawaySlug = giveawaySlug;
    let effectiveGigId = gigId;
    let effectiveGlId = glId;
    let effectiveProposalId = proposalId;
    let effectiveInvoiceId = invoiceId;
    let effectiveAgreementId = agreementId;
    let effectiveEventId = eventId;

    if (detectedPath) {
        const cleanPath = detectedPath.replace(/\/+$/, '');
        if (!effectivePage && !effectiveCampaignId && !effectiveBlogSlug && !effectiveFormId && !effectiveDocId && !effectiveTicketId) {
            if (cleanPath === '/creator' || cleanPath === '/creator/landing') effectivePage = 'creator';
            else if (cleanPath === '/creator/join') effectivePage = 'creator-join';
            else if (cleanPath.startsWith('/creator-dashboard')) effectivePage = 'creator-dashboard';
            else if (cleanPath === '/verify-creator') effectivePage = 'verify-creator';
            else if (cleanPath === '/campaigns') effectivePage = 'campaigns';
            else if (cleanPath.startsWith('/campaign/')) effectiveCampaignId = cleanPath.split('/')[2];
            else if (cleanPath === '/concertzone') effectivePage = 'concertzone';
            else if (cleanPath.startsWith('/concertzone/')) {
                const parts = cleanPath.split('/').filter(Boolean);
                if (parts.length >= 3) {
                    effectiveBlogSlug = parts[2];
                    effectiveCategory = parts[1];
                } else if (parts.length === 2) {
                    effectiveCategory = parts[1];
                }
            }
            else if (cleanPath === '/community' || cleanPath === '/community-join') effectivePage = 'community';
            else if (cleanPath === '/forms' || cleanPath === '/form') effectivePage = 'forms';
            else if (cleanPath.startsWith('/forms/') || cleanPath.startsWith('/form/')) effectiveFormId = cleanPath.split('/')[2];
            else if (cleanPath.startsWith('/giveaway/')) effectiveGiveawaySlug = cleanPath.split('/')[2];
            else if (cleanPath.startsWith('/proposal/')) effectiveProposalId = cleanPath.split('/')[2];
            else if (cleanPath.startsWith('/invoice/')) effectiveInvoiceId = cleanPath.split('/')[2];
            else if (cleanPath.startsWith('/agreement/')) effectiveAgreementId = cleanPath.split('/')[2];
            else if (cleanPath.startsWith('/doc/')) effectiveDocId = cleanPath.split('/')[2];
            else if (cleanPath.startsWith('/ticket/')) effectiveTicketId = cleanPath.split('/')[2];
            else if (cleanPath === '/artistant') effectivePage = 'artistant';
            else if (cleanPath === '/contact') effectivePage = 'contact';
            else if (cleanPath === '/terms') effectivePage = 'terms';
            else if (cleanPath === '/privacy') effectivePage = 'privacy';
            else if (cleanPath === '/verify-payout') effectivePage = 'verify-payout';
            else if (cleanPath === '/register-payment') effectivePage = 'register-payment';
        }
    }

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
        // Fast paths that do not require Firestore queries
        if (effectivePage) {
            if (effectivePage === 'creator' || effectivePage === 'creator-landing') {
                meta.title = "Newbi Creator Network • Brand Campaigns & Live Gigs";
                meta.description = "Discover verified brand collaborations, creator campaigns, and experiential gigs in Bengaluru, Mumbai, Delhi-NCR, and across India. 100% free to join.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/creator`;
                return;
            } else if (effectivePage === 'creator-join') {
                meta.title = "Apply to Newbi Creator Network • 45-Second Onboarding";
                meta.description = "Connect with top brands and live events in your city. Fast creator onboarding with zero agency fees.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/creator/join`;
                return;
            } else if (effectivePage === 'creator-dashboard') {
                meta.title = "Creator Dashboard | Newbi Creator Network";
                meta.description = "Manage your active brand campaigns, submit deliverables, track compensation, and access exclusive gig invites.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/creator-dashboard`;
                return;
            } else if (effectivePage === 'campaigns') {
                meta.title = "Live Brand Campaigns & Creator Gigs | Newbi Creator Network";
                meta.description = "Explore open creator campaigns, sponsorship briefs, and campus gigs. Apply directly to collaborate with top brands.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/campaigns`;
                return;
            } else if (effectivePage === 'community') {
                meta.title = "Newbi Community Tribe • Exclusive Guestlists, Gigs & Events";
                meta.description = "Join the ultimate entertainment tribe. Get VIP guestlist entries, backstage volunteer gigs, and exclusive live music community access.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/community`;
                return;
            } else if (effectivePage === 'forms') {
                meta.title = "Newbi Forms & Community Registrations";
                meta.description = "Submit applications and registrations for Newbi events, community initiatives, and creator opportunities.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/forms`;
                return;
            } else if (effectivePage === 'concertzone') {
                meta.title = "Concert Zone • Music, Live Events & Tour Guides | Newbi Ent.";
                meta.description = "Your backstage pass to concerts, live music festivals, artist spotlights, and gig guides across India.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/concertzone`;
                return;
            } else if (effectivePage === 'artistant') {
                meta.title = "ArtistAnt • Premier Artist Bookings & Talent Agency";
                meta.description = "Book top DJs, live bands, singers, and performing artists for college fests, corporate events, and live concerts.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/artistant`;
                return;
            } else if (effectivePage === 'contact') {
                meta.title = "Contact Us | Newbi Entertainment & Marketing";
                meta.description = "Get in touch with Newbi for brand partnerships, creator collaborations, event activations, and media inquiries.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/contact`;
                return;
            } else if (effectivePage === 'terms') {
                meta.title = "Terms of Service | Newbi Entertainment";
                meta.description = "Read the Terms of Service for Newbi Entertainment and its digital platforms.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/terms`;
                return;
            } else if (effectivePage === 'privacy') {
                meta.title = "Privacy Policy | Newbi Entertainment";
                meta.description = "Read the Privacy Policy for Newbi Entertainment.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/privacy`;
                return;
            } else if (effectivePage === 'verify-creator') {
                meta.title = "Creator Verification | Newbi Creator Network";
                meta.description = "Verify and activate your Newbi Creator profile to access brand deals and campaigns.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/verify-creator`;
                return;
            } else if (effectivePage === 'verify-payout') {
                meta.title = "Verify Payout | Newbi Finance";
                meta.description = "Securely verify and confirm payout disbursements from Newbi Entertainment.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/verify-payout`;
                return;
            } else if (effectivePage === 'register-payment') {
                meta.title = "Payee Registration | Newbi Finance";
                meta.description = "Register banking and payee details for seamless vendor and creator disbursements.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/register-payment`;
                return;
            }
        }

        if (effectiveTicketId) {
            meta.title = "Digital Event Ticket | Newbi Live Pass";
            meta.description = "View your verified digital entry pass, booking reference, and QR ticket on Newbi.";
            meta.image = `${baseUrl}/og-image.png`;
            meta.url = `${baseUrl}/ticket/${effectiveTicketId}`;
            return;
        }

        if (effectiveCategory && !effectiveBlogSlug) {
            const catFormatted = effectiveCategory.charAt(0).toUpperCase() + effectiveCategory.slice(1);
            meta.title = `${catFormatted} Guides & Features • Concert Zone | Newbi Ent.`;
            meta.description = `Explore the latest ${effectiveCategory.toLowerCase()} stories, concert updates, and live music guides on Newbi.`;
            meta.image = `${baseUrl}/og-image.png`;
            meta.url = `${baseUrl}/concertzone/${effectiveCategory}`;
            return;
        }

        if (!adminDb) return;

        if (effectiveCampaignId) {
            const snap = await adminDb.collection('campaigns').doc(effectiveCampaignId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.title || 'Brand Campaign'} | Newbi Creator Network`;
                const brand = data.brandName ? `Brand: ${data.brandName}. ` : '';
                const payout = data.payout || data.budget ? `Compensation: ${data.payout || data.budget}. ` : '';
                meta.description = `${brand}${payout}${data.description || 'Join this verified brand campaign on Newbi Creator Network.'}`.substring(0, 155);
                const img = data.thumbnail || data.image || data.coverImage;
                meta.image = img?.startsWith('http') ? img : `${baseUrl}${img || '/og-image.png'}`;
                meta.url = `${baseUrl}/campaign/${effectiveCampaignId}`;
            } else {
                meta.title = "Brand Campaign Brief | Newbi Creator Network";
                meta.description = "Explore campaign requirements and apply to collaborate with verified brands on Newbi.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/campaign/${effectiveCampaignId}`;
            }
        } else if (effectiveDocId) {
            const snap = await adminDb.collection('gen_documents').doc(effectiveDocId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.title || 'Official Document'} | Newbi Ent.`;
                meta.description = `${data.documentType || 'Official Document'} #${data.docNumber || effectiveDocId}. Issued by Newbi Entertainment & Marketing.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/doc/${effectiveDocId}`;
            } else {
                meta.title = "Official Document | Newbi Ent.";
                meta.description = "View verified official document issued by Newbi Entertainment & Marketing.";
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/doc/${effectiveDocId}`;
            }
        } else if (effectiveEventId) {
            const snap = await adminDb.collection('upcoming_events').doc(effectiveEventId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.title}${data.city ? ` | ${data.city}` : ''}`;
                meta.description = `Featuring ${Array.isArray(data.artists) ? data.artists.join(', ') : 'Exclusive Artists'}. ${data.description || ''}`.substring(0, 155);
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = `${baseUrl}/?event=${effectiveEventId}`;
            }
        } else if (effectiveGiveawaySlug) {
            const snaps = await adminDb.collection('giveaways').where('slug', '==', effectiveGiveawaySlug).get();
            if (!snaps.empty) {
                const data = snaps.docs[0].data();
                meta.title = `${data.name} | Newbi Giveaway`;
                meta.description = data.description?.substring(0, 155) || `Join the ultimate giveaway to win ${data.name}!`;
                meta.image = data.posterUrl?.startsWith('http') ? data.posterUrl : `${baseUrl}${data.posterUrl || '/og-image.png'}`;
                meta.url = `${baseUrl}/giveaway/${effectiveGiveawaySlug}`;
            }
        } else if (effectiveFormId) {
            const id = effectiveFormId.trim();
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
        } else if (effectiveGigId) {
            const snap = await adminDb.collection('volunteer_gigs').doc(effectiveGigId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.title} | Volunteer Gig`;
                meta.description = data.description?.substring(0, 155) || `Join the Newbi Tribe as a volunteer for ${data.title}.`;
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = `${baseUrl}/community?gig=${effectiveGigId}`;
            }
        } else if (effectiveGlId) {
            const snap = await adminDb.collection('guestlists').doc(effectiveGlId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.title} | VIP Guestlist`;
                meta.description = data.description?.substring(0, 155) || `Get on the exclusive guestlist for ${data.title}.`;
                meta.image = data.image?.startsWith('http') ? data.image : `${baseUrl}${data.image || '/og-image.png'}`;
                meta.url = `${baseUrl}/community?gl=${effectiveGlId}`;
            }
        } else if (effectiveProposalId) {
            const snap = await adminDb.collection('proposals').doc(effectiveProposalId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.proposalNumber || 'Strategic Quote'} | ${data.clientName || 'Valued Partner'} | Newbi Ent.`;
                meta.description = `Strategic Proposal for ${data.campaignName || 'Campaign'}. Status: ${data.status || 'Draft'}.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/proposal/${effectiveProposalId}`;
            }
        } else if (effectiveInvoiceId) {
            const snap = await adminDb.collection('invoices').doc(effectiveInvoiceId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.invoiceNumber || 'Tax Invoice'} | ${data.clientName || 'Valued Partner'} | Newbi Ent.`;
                meta.description = `Tax Invoice for ${data.campaignName || 'Services'}. Status: ${data.status || 'Unpaid'}.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/invoice/${effectiveInvoiceId}`;
            }
        } else if (effectiveAgreementId) {
            const snap = await adminDb.collection('agreements').doc(effectiveAgreementId).get();
            if (snap.exists) {
                const data = snap.data();
                meta.title = `${data.agreementNumber || 'Agreement'} | ${data.clientName || 'Valued Partner'} | Newbi Ent.`;
                meta.description = `Service Agreement for ${data.campaignName || 'Services'}. Status: ${data.status || 'Draft'}.`;
                meta.image = `${baseUrl}/og-image.png`;
                meta.url = `${baseUrl}/agreement/${effectiveAgreementId}`;
            }
        } else if (effectiveBlogSlug) {
            const snaps = await adminDb.collection('posts').where('slug', '==', effectiveBlogSlug).get();
            if (!snaps.empty) {
                const data = snaps.docs[0].data();
                meta.title = `${data.title} | Concert Zone | Newbi Ent.`;
                meta.description = data.excerpt?.substring(0, 155) || data.content?.replace(/<[^>]*>/g, '').substring(0, 155) || '';
                meta.image = data.coverImage?.startsWith('http') ? data.coverImage : `${baseUrl}${data.coverImage || '/og-image.png'}`;
                meta.url = `${baseUrl}/concertzone/${data.category || 'music'}/${effectiveBlogSlug}`;
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
        <meta property="og:site_name" content="Newbi Entertainment &amp; Marketing" />
        <meta property="og:title" content="${meta.title}" />
        <meta property="og:description" content="${meta.description}" />
        <meta property="og:image" content="${meta.image}" />
        <meta property="og:image:secure_url" content="${meta.image}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="${meta.url}" />
        <meta property="og:type" content="${meta.type}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@newbi_live" />
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
