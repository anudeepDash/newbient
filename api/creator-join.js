import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

export const maxDuration = 60;
let adminDb = null;
let adminAuth = null;

export const initFirebaseAdmin = () => {
    if (adminDb && adminAuth) return { adminDb, adminAuth };

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
                adminAuth = getAuth(app);
            } else if (projectId) {
                const app = initializeApp({ projectId });
                adminDb = getFirestore(app);
                adminAuth = getAuth(app);
            }
        } else {
            const app = getApps()[0];
            adminDb = getFirestore(app);
            adminAuth = getAuth(app);
        }
    } catch (e) {
        console.warn('[API/CREATOR-JOIN] Firebase Admin init notice:', e.message);
    }
    return { adminDb, adminAuth };
};

initFirebaseAdmin();

const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    return digits.slice(-10);
};

const extractSocialUsername = (input, platform = 'general') => {
    if (!input || typeof input !== 'string') return '';
    let val = input.trim();
    if (!val) return '';
    val = val.replace(/^[@/\s]+/, '');
    if (
        val.includes('/') || 
        val.includes('http://') || 
        val.includes('https://') || 
        val.includes('.com') || 
        val.includes('.be') || 
        val.includes('www.') ||
        val.includes('?')
    ) {
        try {
            const urlStr = val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`;
            const url = new URL(urlStr);
            const pathname = url.pathname.replace(/^\/+|\/+$/g, '');
            const segments = pathname.split('/').filter(Boolean);
            if (segments.length > 0) {
                let candidate = segments[segments.length - 1];
                if (segments.length >= 2 && segments[0] === 'in') candidate = segments[1];
                if (segments.length >= 2 && (segments[0] === 'c' || segments[0] === 'user')) candidate = segments[1];
                val = candidate;
            }
        } catch {
            const noQuery = val.split('?')[0].split('#')[0].replace(/\/+$/, '');
            const parts = noQuery.split('/').filter(Boolean);
            if (parts.length > 0) val = parts[parts.length - 1];
        }
    }
    return val.split('?')[0].split('#')[0].replace(/^[@/\s]+|[/@#\s]+$/g, '').trim();
};

const hasDisallowedLink = (input) => {
    if (!input || typeof input !== 'string') return false;
    const str = input.trim().toLowerCase();
    return str.startsWith('http://') || 
           str.startsWith('https://') || 
           str.startsWith('www.') || 
           str.includes('http:') ||
           str.includes('https:') ||
           str.includes('.com') || 
           str.includes('.net') || 
           str.includes('.org') || 
           str.includes('.io') || 
           str.includes('.me') || 
           str.includes('/') ||
           str.includes('://');
};

const parseFollowerCount = (str) => {
    if (!str && str !== 0) return 0;
    if (typeof str === 'number') return Math.round(str);
    const cleaned = String(str).trim().replace(/,/g, '');
    const match = cleaned.match(/^([0-9.]+)\s*([kKmMbB])?$/i);
    if (!match) {
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : Math.round(num);
    }
    const val = parseFloat(match[1]);
    const unit = (match[2] || '').toUpperCase();
    if (unit === 'K') return Math.round(val * 1000);
    if (unit === 'M') return Math.round(val * 1000000);
    if (unit === 'B') return Math.round(val * 1000000000);
    return Math.round(val);
};

const formatFollowerCount = (num) => {
    const val = Number(num) || 0;
    if (val >= 1000000) {
        return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (val >= 1000) {
        return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return val.toLocaleString();
};

const fetchInstagramProfile = async (rawHandle) => {
    const cleanHandle = extractSocialUsername(rawHandle, 'instagram').toLowerCase();
    if (!cleanHandle || !/^[a-zA-Z0-9._]{1,30}$/.test(cleanHandle)) {
        return { success: false, error: 'Links are not permitted. Please enter only your Instagram username (1-30 characters, letters, numbers, periods, underscores).' };
    }

    const decodeEntities = (str) => {
        if (!str) return '';
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&#064;/g, '@')
            .replace(/&#x2022;/g, '•')
            .replace(/&bull;/g, '•');
    };

    // Strategy 1: Social Crawler Previews (Instagram serves complete OpenGraph data to social sharing agents)
    const crawlers = [
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Twitterbot/1.0',
        'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
        'TelegramBot (like TwitterBot)',
        'WhatsApp/2.21.12.21 A',
        'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
        'Googlebot/2.1 (+http://www.google.com/bot.html)'
    ];


    const fetchWithUA = async (ua) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout per request
        try {
            const htmlUrl = `https://www.instagram.com/${cleanHandle}/`;
            const res = await fetch(htmlUrl, {
                headers: {
                    'User-Agent': ua,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                const html = await res.text();
                const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                                  html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                                  html.match(/content=["']([^"']+)["']\s+property=["']og:description["']/i);
                
                if (descMatch && descMatch[1]) {
                    const desc = decodeEntities(descMatch[1]);
                    // Format: "542 Followers, 541 Following, 13 Posts - See Instagram photos and videos from Anudeep Dash (@anudeepdash)"
                    const followerMatch = desc.match(/([0-9.,kKmMbB]+)\s+Followers/i);
                    if (followerMatch) {
                        const parsedCount = parseFollowerCount(followerMatch[1]);
                        
                        // Extract title for display name
                        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                                           html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i);
                        let fullName = cleanHandle;
                        if (titleMatch && titleMatch[1]) {
                            const rawTitle = decodeEntities(titleMatch[1]);
                            const namePart = rawTitle.split('(@')[0].split('•')[0].trim();
                            const cleanedName = namePart.replace(/^["'‘“”’`\s]+|["'‘“”’`\s]+$/g, '').trim();
                            if (cleanedName && cleanedName.length > 1) {
                                fullName = cleanedName;
                            }
                        }
                        
                        // Extract profile image
                        const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                                         html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
                        const profilePic = imgMatch ? decodeEntities(imgMatch[1]) : null;
                        
                        // Check if officially verified by Instagram (Meta verification is reflected in og:description)
                        const isVerifiedBadge = Boolean(
                            desc.toLowerCase().includes('verified account') || 
                            desc.toLowerCase().includes('verified profile')
                        );
                        
                        return {
                            success: true,
                            handle: cleanHandle,
                            name: fullName,
                            followers: parsedCount,
                            formattedFollowers: formatFollowerCount(parsedCount),
                            profilePic,
                            isPrivate: desc.toLowerCase().includes('private'),
                            isVerified: isVerifiedBadge
                        };
                    }
                }
            }
            throw new Error('No valid profile data found');
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    };

    let crawlerErrors = [];
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Fire crawlers concurrently, first to succeed wins immediately
            const result = await Promise.any(crawlers.map(ua => fetchWithUA(ua)));
            return result;
        } catch (err) {
            crawlerErrors = err.errors ? err.errors.map(e => e.message) : [err.message];
            
            if (attempt < maxRetries) {
                // Wait 800ms before retrying to allow Meta's CDN to generate and cache the OpenGraph page
                await new Promise(resolve => setTimeout(resolve, 800));
            } else {
                console.warn(`[API/CREATOR-JOIN] All concurrent social crawlers failed after ${maxRetries} attempts.`, crawlerErrors);
            }
        }
    }
    // Strategy 2: External RapidAPI fallback if key provided
    if (process.env.RAPIDAPI_KEY) {
        try {
            const rapidHost = process.env.RAPIDAPI_HOST || 'instagram-looter2.p.rapidapi.com';
            // Some APIs use /profile, some use /user, some use /v1/users. We'll default to the standard Looter V2 endpoint.
            const rapidEndpoint = process.env.RAPIDAPI_ENDPOINT || `https://${rapidHost}/profile?username=${cleanHandle}`;
            
            const rapidRes = await fetch(rapidEndpoint, {
                headers: {
                    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                    'x-rapidapi-host': rapidHost
                }
            });
            
            if (rapidRes.ok) {
                const rapidData = await rapidRes.json();
                
                // Supports both instagram-data12 AND instagram-looter2 JSON structures
                const count = rapidData?.follower_count || rapidData?.edge_followed_by?.count;
                
                if (count !== undefined) {
                    const parsedCount = Number(count) || 0;
                    return {
                        success: true,
                        handle: cleanHandle,
                        name: rapidData.full_name || cleanHandle,
                        followers: parsedCount,
                        formattedFollowers: formatFollowerCount(parsedCount),
                        profilePic: rapidData.hd_profile_pic_url_info?.url || rapidData.profile_pic_url || null,
                        isPrivate: Boolean(rapidData.is_private),
                        isVerified: Boolean(rapidData.is_verified)
                    };
                }
            }
        } catch (err) {
            console.warn('[API/CREATOR-JOIN] RapidAPI notice:', err.message);
        }
    }

    // Strategy 3: Apify integration if APIFY_API_TOKEN is provided
    if (process.env.APIFY_API_TOKEN) {
        try {
            const apifyRes = await fetch(`https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usernames: [cleanHandle] })
            });

            if (apifyRes.ok) {
                const dataset = await apifyRes.json();
                if (dataset && dataset.length > 0) {
                    const profile = dataset[0];
                    const count = profile.followersCount;
                    
                    if (count !== undefined) {
                        const parsedCount = Number(count) || 0;
                        return {
                            success: true,
                            handle: cleanHandle,
                            name: profile.fullName || cleanHandle,
                            followers: parsedCount,
                            formattedFollowers: formatFollowerCount(parsedCount),
                            profilePic: profile.profilePicUrlHD || profile.profilePicUrl || null,
                            isPrivate: Boolean(profile.isPrivate ?? profile.private),
                            isVerified: Boolean(profile.isVerified ?? profile.verified)
                        };
                    }
                }
            }
        } catch (err) {
            console.warn('[API/CREATOR-JOIN] Apify notice:', err.message);
        }
    }

    return {
        success: false,
        requiresManualEntry: true,
        error: `@${cleanHandle} could not be automatically verified (Anti-Bot Active).`
    };
};

// WhatsApp Meta Cloud API trigger helper
const sendWhatsAppVerification = async (phone, creatorName, verificationUrl) => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId || !phone || !verificationUrl) return;

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const metaApiUrl = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

    try {
        let payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'template',
            template: {
                name: 'creator_verification',
                language: { code: 'en_US' },
                components: [
                    {
                        type: 'body',
                        parameters: [
                            { type: 'text', text: creatorName },
                            { type: 'text', text: verificationUrl }
                        ]
                    }
                ]
            }
        };

        let response = await fetch(metaApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        let data = await response.json();
        if (!response.ok && data?.error?.code === 132001) {
            payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanPhone,
                type: 'text',
                text: {
                    preview_url: true,
                    body: `Hi ${creatorName}! 🚀 Tap this link to verify your phone number for Newbi Creator Network and activate priority campaign matching:\n\n${verificationUrl}`
                }
            };
            await fetch(metaApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        }
    } catch (err) {
        console.warn('[API/CREATOR-JOIN] WhatsApp notice:', err.message);
    }
};

const DEFAULT_CREATOR_GROUPS = [
    {
        city: 'Bengaluru',
        groupUrl: 'https://chat.whatsapp.com/K6MtDAOlZ7s7AUtOFHxduU?mode=gi_t',
        description: 'Official Bengaluru hub for brand campaigns, concert access, nightlife drops & creator meetups.'
    },
    {
        city: 'Hyderabad',
        groupUrl: 'https://chat.whatsapp.com/FXxILbsZCd56WuqLcCnPWL?mode=gi_t',
        description: 'Official Hyderabad hub for live concert guestlists, nightlife drops, brand briefs & creator collaborations.'
    },
    {
        city: 'Chandigarh',
        groupUrl: 'https://chat.whatsapp.com/EUAFdJReG6V1E0YMEoru3f?mode=gi_t',
        description: 'Official Chandigarh & Tricity hub for festival invites, college activations, campus buzz & brand campaigns.'
    },
    {
        city: 'Mumbai',
        groupUrl: 'https://chat.whatsapp.com/KG041Lyo94yL5208nwvZMR?mode=gi_t',
        description: 'Official Mumbai entertainment, nightlife, luxury brands & commercial collaboration network.'
    },
    {
        city: 'Pune',
        groupUrl: 'https://chat.whatsapp.com/EhAnTjZOt2S1MpB6vu7ogh?mode=gi_t',
        description: 'Official Pune hub for music festivals, college circuit alerts, local brand missions & creator collabs.'
    },
    {
        city: 'Kolkata',
        groupUrl: 'https://chat.whatsapp.com/CcLTOGYIcOC3FTbVxfLHq6?mode=gi_t',
        description: 'Official Kolkata hub for art, cultural showcases, music festivals, food culture & live brand drops.'
    },
    {
        city: 'Kochi',
        groupUrl: 'https://chat.whatsapp.com/ELgsYWnoBavLHEzo3u1c63?mode=gi_t',
        description: 'Official Kochi & Kerala hub for live music events, creator meetups, regional brand deals & festival passes.'
    },
    {
        city: 'Delhi',
        groupUrl: 'https://chat.whatsapp.com/DCScNxm2YRR4kbwpcYKI9R?mode=gi_t',
        description: 'Official Delhi NCR hub for mega arena tours, lifestyle campaigns, brand launches & creator networking.'
    },
    {
        city: 'Bhubaneswar & Cuttack',
        groupUrl: 'https://chat.whatsapp.com/HCDsLDRRx9003R7cppRnYr?mode=gi_t',
        description: 'Official Odisha twin cities hub for college fests, cultural showcases, brand drops & creator meetups.'
    },
    {
        city: 'Vizag',
        groupUrl: 'https://chat.whatsapp.com/CLPSGxEpBgYHCDYE3s87sr?mode=gi_t',
        description: 'Official Vizag & Coastal Andhra hub for beach festivals, youth events, brand briefs & creator collaborations.'
    },
    {
        city: 'Surat',
        groupUrl: 'https://chat.whatsapp.com/FUV21rcnGxe0wDe9rSTK5f?mode=gi_t',
        description: 'Official Surat hub for fashion, lifestyle, food culture, brand drops & creator meetups.'
    },
    {
        city: 'Ahmedabad',
        groupUrl: 'https://chat.whatsapp.com/BLheHwuewyd20imXdSVWgJ?mode=gi_t',
        description: 'Official Ahmedabad & Gujarat hub for heritage drops, festivals, startup culture & brand campaigns.'
    },
    {
        city: 'Jaipur',
        groupUrl: 'https://chat.whatsapp.com/EOAGzmMX7dD8STN2gJvReR?mode=gi_t',
        description: 'Official Pink City hub for heritage, culture, art festivals, lifestyle brands & creator collaborations.'
    },
    {
        city: 'Chennai',
        groupUrl: 'https://chat.whatsapp.com/IhJGGdmyIHN2sN7aTks1HF?mode=gi_t',
        description: 'Official Chennai & Tamil Nadu hub for music, cinema culture, college festivals & brand collaborations.'
    }
];

const resolveCityWhatsAppGroup = async (city = '', customUrl = '') => {
    if (customUrl) {
        return {
            city: city || 'Local',
            groupUrl: customUrl,
            description: 'Official city hub for brand campaigns, concert access & creator meetups.'
        };
    }
    const clean = String(city || '').trim().toLowerCase();

    // Check dynamic creator_groups collection in Firestore
    try {
        const snap = await adminDb.collection('creator_groups').get();
        const dynamicGroups = [];
        snap.forEach(d => {
            const data = d.data();
            if (data.isActive !== false) dynamicGroups.push({ id: d.id, ...data });
        });
        if (dynamicGroups.length > 0) {
            const exact = dynamicGroups.find(g => (g.city || '').toLowerCase().trim() === clean);
            if (exact) return exact;
            const partial = dynamicGroups.find(g => {
                const gc = (g.city || '').toLowerCase().trim();
                return clean.includes(gc) || gc.includes(clean);
            });
            if (partial) return partial;
        }
    } catch (err) {
        console.warn('[API/CREATOR-JOIN] Error reading dynamic creator_groups:', err.message);
    }

    if (!clean || clean === 'pan-india' || clean === 'all') return DEFAULT_CREATOR_GROUPS[0];

    if (clean.includes('bengaluru') || clean.includes('bangalore')) return DEFAULT_CREATOR_GROUPS[0];
    if (clean.includes('hyderabad') || clean.includes('secunderabad')) return DEFAULT_CREATOR_GROUPS[1];
    if (clean.includes('chandigarh') || clean.includes('mohali') || clean.includes('panchkula') || clean.includes('tricity')) return DEFAULT_CREATOR_GROUPS[2];
    if (clean.includes('mumbai') || clean.includes('bombay') || clean.includes('navi mumbai') || clean.includes('thane')) return DEFAULT_CREATOR_GROUPS[3];
    if (clean.includes('pune') || clean.includes('poona')) return DEFAULT_CREATOR_GROUPS[4];
    if (clean.includes('kolkata') || clean.includes('calcutta')) return DEFAULT_CREATOR_GROUPS[5];
    if (clean.includes('kochi') || clean.includes('cochin') || clean.includes('kerala') || clean.includes('ernakulam')) return DEFAULT_CREATOR_GROUPS[6];
    if (clean.includes('delhi') || clean.includes('ncr') || clean.includes('noida') || clean.includes('gurugram') || clean.includes('gurgaon') || clean.includes('ghaziabad') || clean.includes('faridabad')) return DEFAULT_CREATOR_GROUPS[7];
    if (clean.includes('bhubaneswar') || clean.includes('bhubaneshwar') || clean.includes('cuttack') || clean.includes('odisha') || clean.includes('orissa')) return DEFAULT_CREATOR_GROUPS[8];
    if (clean.includes('vizag') || clean.includes('visakhapatnam') || clean.includes('andhra')) return DEFAULT_CREATOR_GROUPS[9];
    if (clean.includes('surat')) return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'surat') || DEFAULT_CREATOR_GROUPS[10];
    if (clean.includes('ahmedabad')) return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'ahmedabad') || DEFAULT_CREATOR_GROUPS[11];
    if (clean.includes('jaipur')) return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'jaipur') || DEFAULT_CREATOR_GROUPS[12];
    if (clean.includes('chennai') || clean.includes('madras')) return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'chennai') || DEFAULT_CREATOR_GROUPS[13];

    const partial = DEFAULT_CREATOR_GROUPS.find(g => clean.includes(g.city.toLowerCase()) || g.city.toLowerCase().includes(clean));
    return partial || DEFAULT_CREATOR_GROUPS[0];
};

// Send Welcome Email helper
const sendWelcomeEmail = async (toEmail, creatorName, verificationUrl, creatorData = {}) => {
    const user = process.env.SMTP_USER_CREATORS || process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS_CREATORS || process.env.SMTP_PASS;
    if (!user || !pass || !toEmail) return;

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user, pass }
        });

        const baseUrl = 'https://newbi.live';
        const city = creatorData.city || 'Pan-India';
        const cityGroup = await resolveCityWhatsAppGroup(city, creatorData.customGroupUrl || creatorData.whatsappGroupUrl);
        const passId = (creatorData.passId || creatorData.creatorId || 'NWB-PASS').toString().toUpperCase().replace(/^NWB-CR-/, '');
        const fullPassId = `NWB-CR-${passId}`;
        const handle = (creatorData.handle || creatorData.instagram || creatorName || 'creator').toString().replace(/^@/, '');
        const niche = creatorData.niche || creatorData.primaryNiche || creatorData.categories || creatorData.category || 'Creator & Influencer';
        const avatar = creatorData.avatar || creatorData.profilePicture || creatorData.photoURL || '';
        const initialLetter = (creatorName ? creatorName.charAt(0) : 'C').toUpperCase();
        const firstName = (creatorName || 'Creator').trim().split(' ')[0];
        const interactivePassUrl = `${baseUrl}/creator-dashboard`;

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Your Newbi Creator Pass</title>
    <style>
        :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }
        .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; }
        a { text-decoration: none; }
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
            .content-padding { padding: 22px 18px !important; }
            .header-padding { padding: 20px 18px 14px 18px !important; }
            .pass-card { padding: 14px !important; }
            .wa-card { padding: 18px 16px !important; }
            .wa-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
        }

        /* Light Mode Rules */
        @media (prefers-color-scheme: light) {
            .light-logo { display: block !important; }
            .dark-logo { display: none !important; }
            .dark-logo-wrap { display: none !important; }
            .email-bg { background-color: #F4F6F9 !important; }
            .email-container { background-color: #FFFFFF !important; border-color: #E2E8F0 !important; box-shadow: 0 10px 30px rgba(0,0,0,0.06) !important; }
            .header-border { border-bottom-color: #F1F5F9 !important; }
            .chip-minted { background: #ECFDF5 !important; border-color: #A7F3D0 !important; color: #059669 !important; }
            .text-title { color: #0F172A !important; }
            .text-subtitle { color: #475569 !important; }
            .text-bold { color: #0F172A !important; }
            .pass-card { background: #F8FAFC !important; border-color: #E2E8F0 !important; }
            .pass-header-text { color: #0F172A !important; }
            .pass-id-pill { background: #FFFFFF !important; border-color: #CBD5E1 !important; color: #475569 !important; }
            .pass-avatar-fallback { background-color: #ECFDF5 !important; border-color: #10B981 !important; color: #059669 !important; }
            .pass-name { color: #0F172A !important; }
            .pass-meta { color: #475569 !important; }
            .pass-meta-sep { color: #94A3B8 !important; }
            .pass-footer-strip { border-top-color: #E2E8F0 !important; background: #F1F5F9 !important; }
            .pass-footer-text { color: #64748B !important; }
            .pass-barcode { color: #94A3B8 !important; }
            .wa-card { background: linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 100%) !important; border-color: #86EFAC !important; }
            .wa-chip { background: #DCFCE7 !important; color: #166534 !important; }
            .wa-title { color: #0F172A !important; }
            .wa-desc { color: #334155 !important; }
            .wa-sublink { color: #475569 !important; }
            .verify-note { color: #64748B !important; }
            .verify-link { color: #059669 !important; }
            .footer-bg { background-color: #F8FAFC !important; border-top-color: #E2E8F0 !important; }
            .social-icon { filter: invert(0) !important; opacity: 0.6 !important; }
            .footer-copy { color: #64748B !important; }
            .footer-support { color: #64748B !important; }
            .footer-support-link { color: #334155 !important; }
        }

        /* Dark Mode Rules */
        @media (prefers-color-scheme: dark) {
            .light-logo { display: none !important; }
            .dark-logo-wrap { display: block !important; max-height: none !important; max-width: none !important; overflow: visible !important; }
            .dark-logo { display: block !important; }
            .email-bg { background-color: #060709 !important; }
            .email-container { background-color: #0B0D14 !important; border-color: rgba(255, 255, 255, 0.08) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.7) !important; }
            .header-border { border-bottom-color: rgba(255, 255, 255, 0.06) !important; }
            .chip-minted { background: rgba(57, 255, 20, 0.08) !important; border-color: rgba(57, 255, 20, 0.25) !important; color: #39FF14 !important; }
            .text-title { color: #FFFFFF !important; }
            .text-subtitle { color: #8E96A4 !important; }
            .text-bold { color: #FFFFFF !important; }
            .pass-card { background: #111420 !important; border-color: rgba(255, 255, 255, 0.09) !important; }
            .pass-header-text { color: #E2E8F0 !important; }
            .pass-id-pill { background: rgba(255, 255, 255, 0.05) !important; border-color: rgba(255, 255, 255, 0.08) !important; color: #94A3B8 !important; }
            .pass-avatar-fallback { background-color: #171B2A !important; border-color: #39FF14 !important; color: #39FF14 !important; }
            .pass-name { color: #FFFFFF !important; }
            .pass-meta { color: #8E96A4 !important; }
            .pass-meta-sep { color: #475569 !important; }
            .pass-footer-strip { border-top-color: rgba(255, 255, 255, 0.06) !important; background: rgba(255, 255, 255, 0.015) !important; }
            .pass-footer-text { color: #64748B !important; }
            .pass-barcode { color: #475569 !important; }
            .wa-card { background: linear-gradient(180deg, rgba(37, 211, 102, 0.08) 0%, rgba(37, 211, 102, 0.02) 100%) !important; border-color: rgba(37, 211, 102, 0.22) !important; }
            .wa-chip { background: rgba(37, 211, 102, 0.12) !important; color: #25D366 !important; }
            .wa-title { color: #FFFFFF !important; }
            .wa-desc { color: #94A3B8 !important; }
            .wa-sublink { color: #64748B !important; }
            .verify-note { color: #64748B !important; }
            .verify-link { color: #39FF14 !important; }
            .footer-bg { background-color: #07090F !important; border-top-color: rgba(255, 255, 255, 0.06) !important; }
            .social-icon { filter: invert(1) !important; opacity: 0.4 !important; }
            .footer-copy { color: #475569 !important; }
            .footer-support { color: #475569 !important; }
            .footer-support-link { color: #8E96A4 !important; }
        }

        /* Outlook [data-ogsc] Dark Mode */
        [data-ogsc] .light-logo { display: none !important; }
        [data-ogsc] .dark-logo-wrap { display: block !important; max-height: none !important; max-width: none !important; overflow: visible !important; }
        [data-ogsc] .dark-logo { display: block !important; }
        [data-ogsc] .email-bg { background-color: #060709 !important; }
        [data-ogsc] .email-container { background-color: #0B0D14 !important; border-color: rgba(255, 255, 255, 0.08) !important; }
        [data-ogsc] .text-title { color: #FFFFFF !important; }
        [data-ogsc] .text-subtitle { color: #8E96A4 !important; }
        [data-ogsc] .text-bold { color: #FFFFFF !important; }
        [data-ogsc] .pass-card { background: #111420 !important; border-color: rgba(255, 255, 255, 0.09) !important; }
        [data-ogsc] .pass-name { color: #FFFFFF !important; }
        [data-ogsc] .pass-meta { color: #8E96A4 !important; }
        [data-ogsc] .footer-bg { background-color: #07090F !important; }
        [data-ogsc] .social-icon { filter: invert(1) !important; }
    </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #F4F6F9; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <span class="preheader">Your Newbi Creator Pass is active. Join the ${cityGroup.city} community to unlock drops.</span>

    <!-- Outer Wrapper -->
    <table role="presentation" class="email-bg" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F6F9; padding: 24px 8px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" class="email-container" width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                    
                    <!-- Clean Electric Lime Accent Bar -->
                    <tr>
                        <td style="height: 2px; background: #39FF14;"></td>
                    </tr>

                    <!-- Header: Brand Logo & Status Chip -->
                    <tr>
                        <td class="header-padding header-border" style="padding: 26px 30px 16px 30px; border-bottom: 1px solid #F1F5F9;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="left" valign="middle">
                                        <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                                            <img src="${baseUrl}/newbi-creators-logo-light.png" alt="Newbi Creators" class="light-logo" height="22" style="display: block; height: 22px; width: auto; max-width: 130px; border: 0;" />
                                            <!--[if !mso]><!-->
                                            <div class="dark-logo-wrap" style="display: none; mso-hide: all; overflow: hidden; max-height: 0; max-width: 0; line-height: 0;">
                                                <img src="${baseUrl}/newbi-creators-logo.png" alt="Newbi Creators" class="dark-logo" height="22" style="display: none; height: 22px; width: auto; max-width: 130px; border: 0;" />
                                            </div>
                                            <!--<![endif]-->
                                        </a>
                                    </td>
                                    <td align="right" valign="middle">
                                        <span class="chip-minted" style="display: inline-block; padding: 3px 9px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 100px; color: #059669; font-family: monospace, -apple-system, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                                            ● PASS MINTED
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content Body -->
                    <tr>
                        <td class="content-padding" style="padding: 26px 30px 24px 30px;">
                            
                            <!-- Salutation & Context -->
                            <div style="margin-bottom: 20px;">
                                <h1 class="text-title" style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #0F172A; line-height: 1.25; letter-spacing: -0.4px;">
                                    You're in, ${firstName}.
                                </h1>
                                <p class="text-subtitle" style="margin: 0; font-size: 13px; line-height: 1.55; color: #475569;">
                                    Your official digital creator pass for <strong class="text-bold" style="color: #0F172A;">${cityGroup.city}</strong> is live. You are now officially enrolled in the Newbi Creator Network.
                                </p>
                            </div>

                            <!-- ─── THE CREATOR PASS CARD ─── -->
                            <table role="presentation" class="pass-card" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; margin: 0 0 22px 0;">
                                
                                <!-- Pass Header: Brand & Pass ID -->
                                <tr>
                                    <td style="padding: 14px 18px 10px 18px;" align="left" valign="middle">
                                        <span class="pass-header-text" style="font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: #0F172A; text-transform: uppercase;">NEWBI CREATORS</span>
                                        <span style="display: inline-block; width: 5px; height: 5px; background-color: #10B981; border-radius: 50%; margin-left: 5px; vertical-align: middle;"></span>
                                    </td>
                                    <td style="padding: 14px 18px 10px 18px;" align="right" valign="middle">
                                        <span class="pass-id-pill" style="font-family: monospace, -apple-system, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.8px; color: #475569; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; padding: 3px 7px;">
                                            ${fullPassId}
                                        </span>
                                    </td>
                                </tr>

                                <!-- Pass Identity: Avatar, Name & Meta -->
                                <tr>
                                    <td colspan="2" style="padding: 8px 18px 16px 18px;">
                                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td width="54" valign="middle" style="width: 54px; padding-right: 14px;">
                                                    ${avatar ? `
                                                        <img src="${avatar}" alt="${creatorName}" width="48" height="48" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover; border: 1.5px solid #10B981; display: block;" />
                                                    ` : `
                                                        <table role="presentation" class="pass-avatar-fallback" width="48" height="48" border="0" cellspacing="0" cellpadding="0" style="width: 48px; height: 48px; background-color: #ECFDF5; border: 1.5px solid #10B981; border-radius: 12px; text-align: center;">
                                                            <tr>
                                                                <td align="center" valign="middle" style="font-size: 18px; font-weight: 800; color: #059669;">${initialLetter}</td>
                                                            </tr>
                                                        </table>
                                                    `}
                                                </td>
                                                <td valign="middle">
                                                    <div class="pass-name" style="font-size: 16px; font-weight: 800; color: #0F172A; line-height: 1.2; letter-spacing: -0.2px;">
                                                        ${creatorName}
                                                    </div>
                                                    <div class="pass-meta" style="font-size: 12px; font-weight: 500; color: #475569; margin-top: 3px;">
                                                        @${handle} <span class="pass-meta-sep" style="color: #94A3B8;">·</span> ${cityGroup.city} <span class="pass-meta-sep" style="color: #94A3B8;">·</span> ${niche}
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Pass Authentication & Barcode Strip -->
                                <tr>
                                    <td colspan="2" class="pass-footer-strip" style="border-top: 1px solid #E2E8F0; background: #F1F5F9; padding: 9px 18px;">
                                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="left" valign="middle">
                                                    <span class="pass-footer-text" style="font-family: monospace, -apple-system, sans-serif; font-size: 8px; font-weight: 700; letter-spacing: 1.2px; color: #64748B; text-transform: uppercase;">
                                                        ALL-ACCESS CREATOR ROSTER
                                                    </span>
                                                </td>
                                                <td align="right" valign="middle">
                                                    <span class="pass-barcode" style="font-family: monospace, -apple-system, sans-serif; font-size: 9px; letter-spacing: 2px; color: #94A3B8;">
                                                        ||| || | |||| || |
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- ─── ACTION: City WhatsApp Community ─── -->
                            <table role="presentation" class="wa-card" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 100%); border: 1px solid #86EFAC; border-radius: 16px; overflow: hidden; margin-bottom: 12px;">
                                <tr>
                                    <td style="padding: 22px 20px; text-align: center;">
                                        <div style="margin-bottom: 8px;">
                                            <span class="wa-chip" style="display: inline-block; background: #DCFCE7; color: #166534; font-size: 9px; font-weight: 800; letter-spacing: 1.2px; border-radius: 100px; padding: 3px 10px; text-transform: uppercase;">
                                                ⚡ PRIORITY DROPS · ${cityGroup.city.toUpperCase()}
                                            </span>
                                        </div>
                                        <h2 class="wa-title" style="margin: 0 0 6px 0; font-size: 17px; font-weight: 800; color: #0F172A; letter-spacing: -0.2px;">
                                            Join the ${cityGroup.city} Creator Circle
                                        </h2>
                                        <p class="wa-desc" style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #334155; max-width: 420px; margin-left: auto; margin-right: auto;">
                                            Commercial brand briefs, festival VIP guestlists, and backstage invites are posted here first before going public.
                                        </p>
                                        <div>
                                            <a href="${cityGroup.groupUrl}" target="_blank" class="wa-btn" style="display: inline-block; padding: 12px 28px; background-color: #25D366; color: #000000 !important; font-weight: 800; font-size: 12px; text-decoration: none; border-radius: 10px; letter-spacing: 0.4px; text-transform: uppercase;">
                                                Join ${cityGroup.city} WhatsApp Group &rarr;
                                            </a>
                                        </div>
                                        <div style="margin-top: 14px;">
                                            <a href="${interactivePassUrl}" class="wa-sublink" style="color: #475569; font-size: 11px; font-weight: 600; text-decoration: none;">
                                                or Open 3D Pass in Creator Studio &rarr;
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            </table>



                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 22px 30px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
                            <div style="margin-bottom: 12px;">
                                <a href="https://www.instagram.com/newbi.live" style="display: inline-block; margin: 0 8px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-icon" width="16" height="16" style="opacity: 0.6; filter: invert(0); display: block;" alt="Instagram"></a>
                                <a href="https://linkedin.com/company/newbi-ent" style="display: inline-block; margin: 0 8px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-icon" width="16" height="16" style="opacity: 0.6; filter: invert(0); display: block;" alt="LinkedIn"></a>
                                <a href="https://newbi.live" style="display: inline-block; margin: 0 8px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-icon" width="16" height="16" style="opacity: 0.6; filter: invert(0); display: block;" alt="Website"></a>
                            </div>
                            <p class="footer-copy" style="margin: 0 0 4px 0; font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">
                                &copy; ${new Date().getFullYear()} NEWBI ENTERTAINMENT &amp; MARKETING LLP
                            </p>
                            <p class="footer-support" style="margin: 0; font-size: 10px; font-weight: 500; color: #64748B;">
                                Support &amp; briefs: <a href="mailto:creators@newbi.live" class="footer-support-link" style="color: #334155; text-decoration: none;">creators@newbi.live</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();

        const creatorFromName = process.env.SMTP_FROM_NAME_CREATORS || 'Newbi Creators';
        const creatorFromEmail = process.env.SMTP_FROM_EMAIL_CREATORS || 'creators@newbi.live';
        const fromAddress = process.env.SMTP_FROM_CREATORS || `"${creatorFromName}" <${creatorFromEmail}>`;

        await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: `🎟️ Your Newbi Creator Pass & ${cityGroup.city} Community Access!`,
            html
        });
    } catch (err) {
        console.warn('[API/CREATOR-JOIN] Email notice:', err.message);
    }
};


// ── Access control ──────────────────────────────────────────────────────────
const PROD_ORIGINS = ['https://newbi.live', 'https://www.newbi.live', 'https://artistant.in', 'https://www.artistant.in'];

// True only for local development (Vite middleware or `vercel dev`), never on a deployed site.
const isDevRuntime = () => (process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === 'development'
    : process.env.NODE_ENV !== 'production');

const isAllowedOrigin = (origin) => {
    if (!origin) return false;
    if (PROD_ORIGINS.includes(origin)) return true;
    return isDevRuntime() && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const isLocalDevRequest = (req) => {
    const host = req.headers?.host || '';
    return isDevRuntime() && (host.includes('localhost') || host.includes('127.0.0.1'));
};

const CREATOR_ADMIN_ROLES = ['developer', 'super_admin', 'founder', 'admin', 'editor', 'content_admin'];

// Same lookup as api/sync-users.js: an `admins` entry for the caller's verified email,
// or an admin role on users/{uid}.
const isAdminCaller = async (decodedToken) => {
    if (!decodedToken || !adminDb) return false;
    try {
        const rawEmail = (decodedToken.email || '').trim();
        if (rawEmail && decodedToken.email_verified) {
            const emails = Array.from(new Set([rawEmail, rawEmail.toLowerCase()]));
            const snap = await adminDb.collection('admins').where('email', 'in', emails).limit(5).get();
            if (snap.docs.some(d => CREATOR_ADMIN_ROLES.includes(d.data()?.role))) return true;
        }
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists && CREATOR_ADMIN_ROLES.includes(userDoc.data()?.role)) return true;
    } catch (e) {
        console.warn('[API/CREATOR-JOIN] Admin check notice:', e.message);
    }
    return false;
};

// Fields only the server or an admin may set on a creator profile.
const PRIVILEGED_CREATOR_FIELDS = [
    'uid', 'creatorId', 'verificationToken', 'profileStatus', 'isVerified', 'verifiedAt', 'verifiedBy',
    'isPhoneVerified', 'phoneVerifiedAt', 'isEmailVerified', 'emailVerifiedAt',
    'phoneVerificationPending', 'phoneVerificationSuspendedAt', 'needsPhoneVerificationNotice',
    'instagramVerified', 'instagramVerifiedAt', 'manualFollowerEntry', 'requiresManualVerification',
    'isManualFollowerEntry', 'shortlistedCampaigns', 'cityGroupAddedBy', 'inviteLinkSent', 'inviteLinkSentAt',
    'inviteLinkChannel', 'role', 'isAdmin', 'points', 'earnings', 'walletBalance', 'balance', 'payouts',
    'adminNotes', 'rejectionReason', 'addedByAdmin', 'createdAt', 'updatedAt'
];

// Fields a creator may change on their own profile through creator-update.
const CREATOR_SELF_EDITABLE_FIELDS = [
    'name', 'displayName', 'email', 'phone', 'city', 'customCity', 'categories', 'category', 'niche', 'niches',
    'primaryNiche', 'specializations', 'cityPageFocus', 'collegeName', 'instagram', 'instagramFollowers',
    'instagramProfilePic', 'linkedin', 'youtube', 'twitter', 'website', 'bio', 'doBarter', 'commercials',
    'profilePicture', 'avatar', 'photoURL', 'handle', 'gender', 'dob', 'languages', 'joinedCampaigns',
    'hasJoinedCityGroup', 'joinedCityGroupAt'
];

const pickFields = (obj = {}, allowed = []) => {
    const out = {};
    for (const key of allowed) {
        if (obj[key] !== undefined) out[key] = obj[key];
    }
    return out;
};

const omitFields = (obj = {}, denied = []) => {
    const out = { ...obj };
    for (const key of denied) delete out[key];
    return out;
};

// The phone on a verified ID token proves the caller owns that number.
const tokenPhoneMatches = (decodedToken, phone) => {
    const tokenPhone = normalizePhoneNumber(decodedToken?.phone_number || '');
    return Boolean(tokenPhone) && tokenPhone === normalizePhoneNumber(phone || '');
};

// Creators may add a campaign to their own shortlist only when that campaign auto-shortlists.
const filterSelfShortlist = async (requested, current = []) => {
    if (!Array.isArray(requested)) return undefined;
    const currentSet = new Set(current || []);
    const additions = requested.filter(id => !currentSet.has(id));
    const allowedAdditions = [];
    for (const campaignId of additions.slice(0, 20)) {
        try {
            const snap = await adminDb.collection('campaigns').doc(String(campaignId)).get();
            if (snap.exists && snap.data()?.autoShortlistEligible) allowedAdditions.push(campaignId);
        } catch (e) { /* skip unknown campaign */ }
    }
    const kept = requested.filter(id => currentSet.has(id));
    return Array.from(new Set([...kept, ...allowedAdditions]));
};

// Finds a creator doc by doc id, uid field, or creatorId.
const findCreatorDoc = async (identifier) => {
    const target = String(identifier || '').trim();
    if (!target) return null;
    const direct = await adminDb.collection('creators').doc(target).get();
    if (direct.exists) return direct;
    let q = await adminDb.collection('creators').where('uid', '==', target).limit(1).get();
    if (!q.empty) return q.docs[0];
    q = await adminDb.collection('creators').where('creatorId', '==', target.toUpperCase()).limit(1).get();
    if (!q.empty) return q.docs[0];
    return null;
};

const isCreatorOwner = (snap, decodedToken) => Boolean(
    decodedToken?.uid && snap && (snap.id === decodedToken.uid || snap.data()?.uid === decodedToken.uid)
);

const ADMIN_ONLY_ACTIONS = new Set([
    'whatsapp-verify', 'creator-group-add', 'creator-group-update', 'creator-group-delete',
    'creator-groups-sync', 'creator-group-bulk-add', 'creator-group-invite-sent', 'creator-group-bulk-invite-sent',
    'creator-delete'
]);
const PUBLIC_ACTIONS = new Set(['join', 'verify-instagram', 'verify', 'creator-groups-get']);

export default async function handler(req, res) {
    if (!res.status) res.status = (c) => { res.statusCode = c; return res; };
    if (!res.json) res.json = (d) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(d)); return res; };

    initFirebaseAdmin();

    if (typeof req.body === 'string') {
        try {
            req.body = JSON.parse(req.body);
        } catch (e) {
            req.body = {};
        }
    }

    if (!req.query) {
        try {
            const parsedUrl = new URL(req.url || '', 'http://localhost');
            req.query = Object.fromEntries(parsedUrl.searchParams.entries());
        } catch (e) {
            req.query = {};
        }
    }

    const origin = req.headers?.origin || '';
    if (typeof res.setHeader === 'function') {
        if (isAllowedOrigin(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!adminDb) {
        return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    // Auth token resolution. Optional only for the public actions below.
    let decodedToken = null;
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && adminAuth) {
        try {
            const token = authHeader.split('Bearer ')[1];
            decodedToken = await adminAuth.verifyIdToken(token, true);
        } catch (e) {
            console.warn('[API/CREATOR-JOIN] Token decode notice:', e.message);
        }
    }

    const action = req.query?.action || req.body?.action || 'join';

    if (!PUBLIC_ACTIONS.has(action) && !decodedToken) {
        return res.status(401).json({ success: false, error: 'Please sign in to continue.' });
    }

    let callerIsAdmin = false;
    if (ADMIN_ONLY_ACTIONS.has(action)) {
        callerIsAdmin = await isAdminCaller(decodedToken);
        if (!callerIsAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required.' });
        }
    }

    // ── ACTION: VERIFY INSTAGRAM PROFILE & FOLLOWERS ──────────────────────────
    if (action === 'verify-instagram') {
        const rawHandle = req.query?.handle || req.body?.handle || '';
        const cleanHandle = extractSocialUsername(rawHandle, 'instagram').toLowerCase();

        if (!cleanHandle) {
            return res.status(400).json({ success: false, error: 'Instagram username is required. Links are not permitted.' });
        }

        try {
            // Check deduplication / existing creator linkage
            let alreadyRegistered = false;
            let registeredTo = null;
            if (adminDb) {
                try {
                    const matchSnap = await adminDb.collection('creators')
                        .where('instagram', '==', cleanHandle)
                        .limit(1)
                        .get();
                    if (!matchSnap.empty) {
                        const conflictDoc = matchSnap.docs[0].data();
                        alreadyRegistered = true;
                        registeredTo = conflictDoc.displayName || conflictDoc.name || 'Existing Account';
                    }
                } catch (snapErr) {
                    console.warn('[API/CREATOR-JOIN] Deduplication check notice:', snapErr.message);
                }
            }

            // Fetch minimum follower threshold from site_settings/general
            let minFollowersRequired = 1000;
            let requireVerification = true;
            if (adminDb) {
                try {
                    const settingsSnap = await adminDb.collection('site_settings').doc('general').get();
                    if (settingsSnap.exists) {
                        const sData = settingsSnap.data();
                        if (sData.minInstagramFollowersToJoin !== undefined) {
                            minFollowersRequired = Number(sData.minInstagramFollowersToJoin);
                        }
                        if (sData.requireInstagramVerification !== undefined) {
                            requireVerification = Boolean(sData.requireInstagramVerification);
                        }
                    }
                } catch (sErr) {
                    console.warn('[API/CREATOR-JOIN] site_settings read notice:', sErr.message);
                }
            }

            const isLocal = isLocalDevRequest(req);

            const result = await fetchInstagramProfile(cleanHandle);
            if (!result.success) {
                if (isLocal) {
                    return res.status(200).json({
                        success: true,
                        handle: cleanHandle,
                        name: cleanHandle,
                        followers: 5500,
                        formattedFollowers: '5.5K',
                        profilePic: null,
                        isPrivate: false,
                        isVerified: false,
                        minFollowersRequired,
                        requireVerification,
                        meetsMinimumFollowers: true,
                        alreadyRegistered,
                        registeredTo,
                        isSimulated: true
                    });
                }
                return res.status(200).json({
                    success: false,
                    error: result.error || `@${cleanHandle} was not found on Instagram. Please check handle spelling or make sure your account is public.`
                });
            }

            // Permanently save scraped profile picture to Cloudinary so it doesn't expire
            if (result.profilePic) {
                try {
                    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n";
                    const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || "maw1e4ud";
                    const data = new URLSearchParams();
                    data.append("file", result.profilePic);
                    data.append("upload_preset", uploadPreset);
                    
                    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: data
                    });
                    
                    if (uploadRes.ok) {
                        const json = await uploadRes.json();
                        result.profilePic = json.secure_url;
                    }
                } catch (e) {
                    console.warn('[API/CREATOR-JOIN] Failed to permanently save profile pic to Cloudinary:', e.message);
                }
            }

            const followers = Number(result.followers) || 0;
            const meetsMinimum = minFollowersRequired <= 0 || followers >= minFollowersRequired;

            return res.status(200).json({
                ...result,
                minFollowersRequired,
                requireVerification,
                meetsMinimumFollowers: meetsMinimum,
                alreadyRegistered,
                registeredTo
            });

        } catch (err) {
            console.error('[API/CREATOR-JOIN] verify-instagram error:', err);
            return res.status(500).json({
                success: false,
                error: err.message || 'Failed to verify Instagram profile.'
            });
        }
    }

    // ── ACTION: VERIFY CREATOR ──────────────────────────────────────────────
    if (action === 'verify') {
        const { id, creatorId, token } = req.body || req.query;
        const targetIdentifier = (id || creatorId || '').trim();
        const verificationToken = (token || '').trim();

        if (!targetIdentifier || !verificationToken) {
            return res.status(400).json({ success: false, error: 'Missing id or token parameter.' });
        }

        try {
            let docRef = adminDb.collection('creators').doc(targetIdentifier);
            let snap = await docRef.get();

            // If not found by direct doc ID, search by creatorId or uid
            if (!snap.exists) {
                const querySnap = await adminDb.collection('creators')
                    .where('creatorId', '==', targetIdentifier.toUpperCase())
                    .limit(1)
                    .get();

                if (!querySnap.empty) {
                    snap = querySnap.docs[0];
                    docRef = snap.ref;
                }
            }

            if (!snap.exists) {
                return res.status(404).json({ success: false, error: 'Creator profile not found.' });
            }

            const data = snap.data();
            // Only what the verify page shows; the link alone must not reveal contact details.
            const publicCreator = (d) => ({
                id: snap.id,
                name: d.name || '',
                displayName: d.displayName || '',
                instagram: d.instagram || '',
                city: d.city || '',
                creatorId: d.creatorId || '',
                profileStatus: d.profileStatus || ''
            });

            // If already verified
            if (data.isPhoneVerified && !data.verificationToken) {
                return res.status(200).json({ success: true, alreadyVerified: true, creator: publicCreator(data) });
            }

            // Verify token match. A profile with no stored token can't be verified by link.
            if (!data.verificationToken || data.verificationToken !== verificationToken) {
                return res.status(400).json({ success: false, error: 'This verification link is invalid or expired.' });
            }

            const now = new Date().toISOString();
            // Verification confirms contact details only; it never changes the review status.
            const updates = {
                isPhoneVerified: true,
                phoneVerifiedAt: now,
                phoneVerificationPending: false,
                needsPhoneVerificationNotice: false,
                isEmailVerified: true,
                emailVerifiedAt: now,
                verificationToken: null,
                updatedAt: now
            };

            await docRef.update(updates);

            return res.status(200).json({
                success: true,
                creator: publicCreator({ ...data, ...updates })
            });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Verify error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: WHATSAPP VERIFY DISPATCH ────────────────────────────────────
    if (action === 'whatsapp-verify') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        const { phone, creatorName = 'Creator', verificationUrl } = req.body || {};
        if (!phone || !verificationUrl) {
            return res.status(400).json({ success: false, error: 'phone and verificationUrl are required.' });
        }
        let verifyOrigin = '';
        try { verifyOrigin = new URL(verificationUrl).origin; } catch (e) { /* invalid URL */ }
        if (!isAllowedOrigin(verifyOrigin)) {
            return res.status(400).json({ success: false, error: 'verificationUrl must point to newbi.live.' });
        }
        try {
            await sendWhatsAppVerification(phone, creatorName, verificationUrl);
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] WhatsApp verify dispatch error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: CREATOR GROUPS GET ───────────────────────────────────────────
    if (action === 'creator-groups-get') {
        try {
            const snapshot = await adminDb.collection('creator_groups').get();
            const groups = [];
            snapshot.forEach(doc => {
                groups.push({ id: doc.id, ...doc.data() });
            });
            return res.status(200).json({ success: true, groups });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Get creator groups error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: CREATOR GROUP ADD ───────────────────────────────────────────
    if (action === 'creator-group-add') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            const groupData = req.body || {};
            const fallbackId = groupData.id || `group_${Date.now()}`;
            let newId = fallbackId;

            if (adminDb) {
                try {
                    const docRef = await adminDb.collection('creator_groups').add({
                        city: groupData.city || 'Bengaluru',
                        platform: groupData.platform || 'WhatsApp',
                        title: groupData.title || `${groupData.city} Creators Community`,
                        groupUrl: groupData.groupUrl,
                        description: groupData.description || '',
                        isActive: groupData.isActive !== false,
                        order: groupData.order || 1,
                        createdAt: new Date().toISOString()
                    });
                    newId = docRef.id;
                } catch (dbErr) {
                    console.warn('[API/CREATOR-JOIN] adminDb creator_groups add notice:', dbErr.message);
                }
            }
            return res.status(200).json({ success: true, id: newId });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Add creator group error:', err);
            return res.status(200).json({ success: true, id: req.body?.id || `group_${Date.now()}`, warning: err.message });
        }
    }

    // ── ACTION: CREATOR GROUP UPDATE ────────────────────────────────────────
    if (action === 'creator-group-update') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            const { id, updates } = req.body || {};
            if (!id) return res.status(400).json({ success: false, error: 'Group ID is required' });
            if (adminDb) {
                try {
                    await adminDb.collection('creator_groups').doc(id).update({
                        ...updates,
                        updatedAt: new Date().toISOString()
                    });
                } catch (dbErr) {
                    console.warn('[API/CREATOR-JOIN] adminDb creator_groups update notice:', dbErr.message);
                }
            }
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Update creator group error:', err);
            return res.status(200).json({ success: true, warning: err.message });
        }
    }

    // ── ACTION: CREATOR GROUP DELETE ────────────────────────────────────────
    if (action === 'creator-group-delete') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            const { id } = req.body || {};
            if (!id) return res.status(400).json({ success: false, error: 'Group ID is required' });
            if (adminDb) {
                try {
                    await adminDb.collection('creator_groups').doc(id).delete();
                } catch (dbErr) {
                    console.warn('[API/CREATOR-JOIN] adminDb creator_groups delete notice:', dbErr.message);
                }
            }
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Delete creator group error:', err);
            return res.status(200).json({ success: true, warning: err.message });
        }
    }

    // ── ACTION: CREATOR UPDATE ──────────────────────────────────────────────
    if (action === 'creator-update') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            const { id, uid, creatorId, updates } = req.body || {};
            const targetIdentifier = (id || uid || creatorId || '').trim();
            if (!targetIdentifier) {
                return res.status(400).json({ success: false, error: 'Creator ID or UID is required' });
            }

            const snap = await findCreatorDoc(targetIdentifier);
            if (!snap) {
                return res.status(404).json({ success: false, error: 'Creator profile not found.' });
            }
            const docRef = snap.ref;

            const data = snap.data();
            const prevStatus = data.profileStatus;
            const now = new Date().toISOString();

            callerIsAdmin = await isAdminCaller(decodedToken);
            let allowedUpdates;
            if (callerIsAdmin) {
                allowedUpdates = { ...(updates || {}) };
            } else {
                if (!isCreatorOwner(snap, decodedToken)) {
                    return res.status(403).json({ success: false, error: 'You can only edit your own creator profile.' });
                }
                const requested = updates || {};
                allowedUpdates = pickFields(requested, CREATOR_SELF_EDITABLE_FIELDS);
                const nextShortlist = await filterSelfShortlist(requested.shortlistedCampaigns, data.shortlistedCampaigns);
                if (nextShortlist) allowedUpdates.shortlistedCampaigns = nextShortlist;
                // Phone verification only counts when the signed-in account owns that number.
                if (requested.isPhoneVerified === true && tokenPhoneMatches(decodedToken, requested.phone || data.phone)) {
                    allowedUpdates.isPhoneVerified = true;
                    allowedUpdates.phoneVerifiedAt = data.phoneVerifiedAt || now;
                    allowedUpdates.phoneVerificationPending = false;
                    allowedUpdates.needsPhoneVerificationNotice = false;
                }
                // Changing the phone number drops a verification that belonged to the old number.
                if (allowedUpdates.phone && normalizePhoneNumber(allowedUpdates.phone) !== normalizePhoneNumber(data.phone)
                    && !allowedUpdates.isPhoneVerified) {
                    allowedUpdates.isPhoneVerified = false;
                }
            }
            const finalUpdates = {
                ...allowedUpdates,
                updatedAt: now
            };

            await docRef.set(finalUpdates, { merge: true });

            return res.status(200).json({ 
                success: true, 
                id: snap.id, 
                prevStatus, 
                email: data.email, 
                name: data.displayName || data.name || 'Creator' 
            });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Creator update error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: CREATOR DELETE ──────────────────────────────────────────────
    if (action === 'creator-delete') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            const { id, uid } = req.body || {};
            const targetIdentifier = (id || uid || '').trim();
            if (!targetIdentifier) {
                return res.status(400).json({ success: false, error: 'Creator ID is required' });
            }

            let docRef = adminDb.collection('creators').doc(targetIdentifier);
            let snap = await docRef.get();

            if (!snap.exists) {
                const querySnap = await adminDb.collection('creators')
                    .where('uid', '==', targetIdentifier)
                    .limit(1)
                    .get();
                if (!querySnap.empty) {
                    snap = querySnap.docs[0];
                    docRef = snap.ref;
                }
            }

            if (snap.exists) {
                await docRef.delete();
            }

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Delete creator error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: SUBMIT CAMPAIGN TASK (SERVERLESS FALLBACK) ───────────────────
    if (action === 'campaign-task-submit') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            const { campaignId, taskId, creatorUid, contentLink = '', proofUrl = '' } = req.body || {};
            if (!campaignId || !taskId || !creatorUid) {
                return res.status(400).json({ success: false, error: 'campaignId, taskId, and creatorUid are required' });
            }

            // The caller may only submit for themselves (their auth uid or their own creator doc).
            const callerUid = decodedToken.uid;
            if (String(creatorUid) !== callerUid) {
                const creatorSnap = await findCreatorDoc(creatorUid);
                if (!isCreatorOwner(creatorSnap, decodedToken)) {
                    return res.status(403).json({ success: false, error: 'You can only submit tasks for your own profile.' });
                }
            }

            const campRef = adminDb.collection('campaigns').doc(String(campaignId));
            const submissionData = {
                status: 'submitted',
                contentLink: String(contentLink || ''),
                proofUrl: String(proofUrl || ''),
                submittedAt: new Date().toISOString(),
                reviewedAt: null,
                rejectionReason: ''
            };
            const submitterIds = Array.from(new Set([String(creatorUid), callerUid]));

            // Only this creator's entry on this one task changes; a transaction keeps
            // concurrent submissions from other creators intact.
            const newTasks = await adminDb.runTransaction(async (tx) => {
                const campSnap = await tx.get(campRef);
                if (!campSnap.exists) return null;
                const tasks = (campSnap.data().tasks || []).map(t => {
                    if (t.id === taskId || String(t.id) === String(taskId)) {
                        const submissions = { ...(t.submissions || {}) };
                        submitterIds.forEach(id => { submissions[id] = submissionData; });
                        const completedBy = Array.from(new Set([...(t.completedBy || []), ...submitterIds]));
                        return { ...t, submissions, completedBy };
                    }
                    return t;
                });
                tx.update(campRef, { tasks });
                return tasks;
            });

            if (!newTasks) {
                return res.status(404).json({ success: false, error: 'Campaign not found' });
            }
            return res.status(200).json({ success: true });
        } catch (subErr) {
            console.error('[API/CREATOR-JOIN] campaign-task-submit error:', subErr);
            return res.status(500).json({ success: false, error: subErr.message || 'Failed to persist task submission' });
        }
    }

    // ── ACTION: GET PROFILE / RESOLVE CREATOR ───────────────────────────────
    if (action === 'get-profile' || action === 'resolve-creator') {
        if (req.method !== 'POST' && req.method !== 'GET') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            // Identity comes only from the verified ID token, never from request parameters.
            const searchUid = decodedToken.uid;
            const searchEmail = decodedToken.email_verified ? (decodedToken.email || '').trim().toLowerCase() : '';
            const searchPhone = normalizePhoneNumber(decodedToken.phone_number || '');

            let foundDoc = null;

            // 1. Try by exact uid (document ID or uid field)
            let snap = await adminDb.collection('creators').doc(searchUid).get();
            if (snap.exists) {
                foundDoc = snap;
            } else {
                const querySnap = await adminDb.collection('creators').where('uid', '==', searchUid).limit(1).get();
                if (!querySnap.empty) foundDoc = querySnap.docs[0];
            }

            // 2. Try by the token's verified email
            if (!foundDoc && searchEmail) {
                const emailSnap = await adminDb.collection('creators').where('email', '==', searchEmail).limit(1).get();
                if (!emailSnap.empty) {
                    foundDoc = emailSnap.docs[0];
                } else {
                    const creatorsSnap = await adminDb.collection('creators').get();
                    creatorsSnap.forEach(doc => {
                        const data = doc.data();
                        if (!foundDoc && data.email && data.email.trim().toLowerCase() === searchEmail) {
                            foundDoc = doc;
                        }
                    });
                }
            }

            // 3. Try by the token's verified phone number
            if (!foundDoc && searchPhone) {
                const creatorsSnap = await adminDb.collection('creators').get();
                creatorsSnap.forEach(doc => {
                    const data = doc.data();
                    if (!foundDoc && normalizePhoneNumber(data.phone) === searchPhone) {
                        foundDoc = doc;
                    }
                });
            }

            if (!foundDoc) {
                return res.status(200).json({ success: true, exists: false, creator: null, message: 'Creator profile not found.' });
            }

            const data = foundDoc.data();

            // Link the profile to this account. Safe here because the match came from
            // the token's own uid or its verified email or phone.
            if (data.uid !== searchUid) {
                await foundDoc.ref.update({
                    uid: searchUid,
                    updatedAt: new Date().toISOString()
                });
                data.uid = searchUid;
            }

            const { verificationToken: _omitToken, ...safeData } = data;
            return res.status(200).json({
                success: true,
                creator: { ...safeData, id: foundDoc.id }
            });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Resolve creator error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: CREATOR REFERRALS (own referrals + public leaderboard) ───────
    // Computed here so creator dashboards don't need every creator's record.
    if (action === 'creator-referrals') {
        try {
            const creatorsSnap = await adminDb.collection('creators').get();
            const all = creatorsSnap.docs.map(d => ({ ...d.data(), id: d.id, uid: d.data().uid || d.id }));
            const me = all.find(c => c.id === decodedToken.uid || c.uid === decodedToken.uid);
            if (!me) {
                return res.status(200).json({ success: true, referrals: [], leaderboard: [], myRank: 0 });
            }

            const uidMap = new Map();
            const creatorIdMap = new Map();
            const instagramMap = new Map();
            const linkedinMap = new Map();
            all.forEach(c => {
                uidMap.set(c.uid, c);
                if (c.creatorId) creatorIdMap.set(String(c.creatorId).toUpperCase(), c);
                if (c.instagram) instagramMap.set(String(c.instagram).toLowerCase(), c);
                if (c.linkedin) linkedinMap.set(String(c.linkedin).toLowerCase(), c);
            });
            const referrerOf = (c) => {
                if (!c.referredBy) return null;
                const refStr = String(c.referredBy);
                return uidMap.get(refStr) || creatorIdMap.get(refStr.toUpperCase())
                    || instagramMap.get(refStr.toLowerCase()) || linkedinMap.get(refStr.toLowerCase()) || null;
            };

            const counts = {};
            const referrals = [];
            all.forEach(c => {
                const referrer = referrerOf(c);
                if (!referrer) return;
                counts[referrer.uid] = (counts[referrer.uid] || 0) + 1;
                if (referrer.uid === me.uid) referrals.push(c);
            });

            const publicCard = (c) => ({
                uid: c.uid,
                name: c.name || c.displayName || '',
                instagram: c.instagram || '',
                profilePicture: c.profilePicture || c.instagramProfilePic || c.profilePic || c.photoURL || '',
                profileStatus: c.profileStatus || ''
            });
            const ranked = all
                .filter(c => counts[c.uid] > 0)
                .map(c => ({ ...publicCard(c), referralCount: counts[c.uid] }))
                .sort((a, b) => b.referralCount - a.referralCount);

            return res.status(200).json({
                success: true,
                referrals: referrals.map(publicCard),
                leaderboard: ranked.slice(0, 10),
                myRank: ranked.findIndex(c => c.uid === me.uid) + 1
            });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Creator referrals error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: CREATOR GROUPS SYNC / SEED ───────────────────────────────────
    if (action === 'creator-groups-sync') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            const { groups } = req.body || {};
            const list = Array.isArray(groups) ? groups : [];
            const snapshot = await adminDb.collection('creator_groups').get();
            const existingMap = new Map();
            snapshot.forEach(doc => {
                const d = doc.data();
                if (d.city) existingMap.set(d.city.toLowerCase().trim(), doc.id);
            });

            const batch = adminDb.batch();
            let count = 0;
            for (const item of list) {
                const cityKey = (item.city || '').toLowerCase().trim();
                if (existingMap.has(cityKey)) {
                    const docId = existingMap.get(cityKey);
                    batch.set(adminDb.collection('creator_groups').doc(docId), {
                        ...item,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                } else {
                    const newDoc = adminDb.collection('creator_groups').doc();
                    batch.set(newDoc, {
                        ...item,
                        createdAt: new Date().toISOString()
                    });
                }
                count++;
            }
            await batch.commit();
            return res.status(200).json({ success: true, count });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Sync creator groups error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: BULK ADD CREATORS OF A CITY TO GROUP ─────────────────────────
    if (action === 'creator-group-bulk-add') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            const { city, creatorIds = [] } = req.body || {};
            if (!city && (!creatorIds || !creatorIds.length)) {
                return res.status(400).json({ success: false, error: 'City or creator IDs required' });
            }

            const now = new Date().toISOString();
            let targetIds = [...creatorIds];

            // If city provided without explicit IDs, fetch all creators matching that city
            if ((!targetIds || targetIds.length === 0) && city) {
                const normCity = city.toLowerCase().trim();
                const snapshot = await adminDb.collection('creators').get();
                snapshot.forEach(doc => {
                    const d = doc.data();
                    const cCity = (d.city || '').toLowerCase().trim();
                    if (cCity === normCity || (normCity === 'bengaluru' && /bang[al]*o?re/i.test(cCity)) || cCity.includes(normCity)) {
                        targetIds.push(doc.id);
                    }
                });
            }

            // Batch update in chunks of 400
            let updatedCount = 0;
            const chunkSize = 400;
            for (let i = 0; i < targetIds.length; i += chunkSize) {
                const chunk = targetIds.slice(i, i + chunkSize);
                const batch = adminDb.batch();
                chunk.forEach(id => {
                    const docRef = adminDb.collection('creators').doc(id);
                    batch.set(docRef, {
                        hasJoinedCityGroup: true,
                        joinedCityGroupAt: now,
                        cityGroupAddedBy: 'admin'
                    }, { merge: true });
                });
                await batch.commit();
                updatedCount += chunk.length;
            }

            return res.status(200).json({
                success: true,
                count: updatedCount,
                city,
                timestamp: now
            });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Bulk add creators to group error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: BULK MARK CREATOR GROUP INVITES AS SENT ──────────────────────
    if (action === 'creator-group-invite-sent' || action === 'creator-group-bulk-invite-sent') {
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
        try {
            const { creatorIds = [], channel = 'whatsapp', city } = req.body || {};
            if (!creatorIds || !creatorIds.length) {
                return res.status(400).json({ success: false, error: 'Creator IDs required' });
            }

            const now = new Date().toISOString();
            const targetIds = [...creatorIds];

            let updatedCount = 0;
            const chunkSize = 400;
            for (let i = 0; i < targetIds.length; i += chunkSize) {
                const chunk = targetIds.slice(i, i + chunkSize);
                const batch = adminDb.batch();
                chunk.forEach(id => {
                    const docRef = adminDb.collection('creators').doc(id);
                    batch.set(docRef, {
                        inviteLinkSent: true,
                        inviteLinkSentAt: now,
                        inviteLinkChannel: channel || 'whatsapp'
                    }, { merge: true });
                });
                await batch.commit();
                updatedCount += chunk.length;
            }

            return res.status(200).json({
                success: true,
                count: updatedCount,
                channel: channel || 'whatsapp',
                timestamp: now
            });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Bulk mark invite sent error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ── ACTION: JOIN / REGISTER CREATOR ─────────────────────────────────────
    if (action !== 'join') {
        return res.status(400).json({ success: false, error: 'Unknown action.' });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const body = req.body || {};
        const { creator, sendWelcome = true } = body;
        const rawCreatorData = creator || body;
        // Admins onboarding a creator may set review fields; everyone else gets them from the server.
        callerIsAdmin = decodedToken ? await isAdminCaller(decodedToken) : false;
        const creatorData = callerIsAdmin
            ? { ...rawCreatorData }
            : omitFields(rawCreatorData, PRIVILEGED_CREATOR_FIELDS);
        delete creatorData.action;

        const name = (creatorData.displayName || creatorData.name || '').trim();
        const rawPhone = creatorData.phone || '';
        const rawEmail = creatorData.email || '';
        const rawInstagram = creatorData.instagram || '';

        if (!name || !rawPhone || !rawEmail) {
            return res.status(400).json({ success: false, error: 'Please complete all required fields (name, phone, email).' });
        }

        const normPhone = normalizePhoneNumber(rawPhone);
        const normEmail = rawEmail.trim().toLowerCase();
        const cleanInsta = extractSocialUsername(rawInstagram, 'instagram').toLowerCase();
        const cleanLinkedin = extractSocialUsername(creatorData.linkedin, 'linkedin');
        const cleanYoutube = extractSocialUsername(creatorData.youtube, 'youtube');
        const cleanTwitter = extractSocialUsername(creatorData.twitter, 'twitter');

        if (hasDisallowedLink(rawInstagram) && !cleanInsta) {
            return res.status(400).json({ success: false, error: 'Links are not permitted. Please submit only your Instagram username or handle.' });
        }
        if (hasDisallowedLink(creatorData.linkedin) && !cleanLinkedin) {
            return res.status(400).json({ success: false, error: 'Links are not permitted. Please submit only your LinkedIn username.' });
        }
        if (hasDisallowedLink(creatorData.youtube) && !cleanYoutube) {
            return res.status(400).json({ success: false, error: 'Links are not permitted. Please submit only your YouTube handle.' });
        }
        if (hasDisallowedLink(creatorData.twitter) && !cleanTwitter) {
            return res.status(400).json({ success: false, error: 'Links are not permitted. Please submit only your X/Twitter handle.' });
        }

        const callerUid = decodedToken?.uid || null;
        // A non-admin can only create or update the profile tied to their own account;
        // signed-out applicants always get a fresh document.
        const targetUid = callerIsAdmin
            ? (rawCreatorData.uid || adminDb.collection('creators').doc().id)
            : (callerUid || adminDb.collection('creators').doc().id);
        const existingSnap = await adminDb.collection('creators').doc(targetUid).get();
        const existingData = existingSnap.exists ? existingSnap.data() : null;
        if (existingData && !callerIsAdmin && callerUid && existingData.uid && existingData.uid !== callerUid) {
            return res.status(403).json({ success: false, error: 'This creator profile belongs to another account.' });
        }

        // 1. Phone number deduplication via targeted query
        if (normPhone) {
            try {
                const phoneQuery = await adminDb.collection('creators')
                    .where('phone', '==', rawPhone)
                    .limit(1)
                    .get();
                if (!phoneQuery.empty) {
                    const matchDoc = phoneQuery.docs[0];
                    if (matchDoc.id !== targetUid && matchDoc.data()?.uid !== targetUid) {
                        const conflictPhone = matchDoc.data();
                        return res.status(409).json({
                            success: false,
                            error: `The mobile number ${rawPhone} is already linked to another Creator profile (${conflictPhone.displayName || conflictPhone.name || 'Existing Account'}). Multiple creator accounts for the same mobile number are not allowed.`
                        });
                    }
                }
            } catch (phoneErr) {
                console.warn('[API/CREATOR-JOIN] Phone dedup check warning:', phoneErr.message);
            }
        }

        // 2. Email deduplication via targeted query
        if (normEmail) {
            try {
                const emailQuery = await adminDb.collection('creators')
                    .where('email', '==', normEmail)
                    .limit(1)
                    .get();
                if (!emailQuery.empty) {
                    const matchDoc = emailQuery.docs[0];
                    if (matchDoc.id !== targetUid && matchDoc.data()?.uid !== targetUid) {
                        return res.status(409).json({
                            success: false,
                            error: `The email address ${rawEmail} is already registered to an existing Creator profile. Please sign in to access your dashboard.`
                        });
                    }
                }
            } catch (emailErr) {
                console.warn('[API/CREATOR-JOIN] Email dedup check warning:', emailErr.message);
            }
        }

        // 3. Instagram handle deduplication via targeted query
        if (cleanInsta) {
            try {
                const instaQuery = await adminDb.collection('creators')
                    .where('instagram', '==', cleanInsta)
                    .limit(1)
                    .get();
                if (!instaQuery.empty) {
                    const matchDoc = instaQuery.docs[0];
                    if (matchDoc.id !== targetUid && matchDoc.data()?.uid !== targetUid) {
                        return res.status(409).json({
                            success: false,
                            error: `The Instagram handle @${cleanInsta} is already linked to an existing Creator profile.`
                        });
                    }
                }
            } catch (instaErr) {
                console.warn('[API/CREATOR-JOIN] Instagram dedup check warning:', instaErr.message);
            }
        }

        // 4. Instagram Followers Threshold & Verification Check
        let minInstagramFollowers = 1000;
        let requireInstagramVerification = true;
        if (adminDb) {
            try {
                const settingsSnap = await adminDb.collection('site_settings').doc('general').get();
                if (settingsSnap.exists) {
                    const sData = settingsSnap.data();
                    if (sData.minInstagramFollowersToJoin !== undefined) {
                        minInstagramFollowers = Number(sData.minInstagramFollowersToJoin);
                    }
                    if (sData.requireInstagramVerification !== undefined) {
                        requireInstagramVerification = Boolean(sData.requireInstagramVerification);
                    }
                }
            } catch (sErr) {
                console.warn('[API/CREATOR-JOIN] settings read error:', sErr.message);
            }
        }

        // Read from the raw payload: claiming manual entry only ever routes a profile to review.
        const isManualFollowers = Boolean(
            rawCreatorData.manualFollowerEntry || 
            rawCreatorData.isManualFollowerEntry || 
            rawCreatorData.requiresManualVerification
        );
        const submittedFollowers = Number(creatorData.instagramFollowers) || 0;
        if (cleanInsta && requireInstagramVerification && minInstagramFollowers > 0 && !isManualFollowers) {
            if (submittedFollowers < minInstagramFollowers) {
                return res.status(400).json({
                    success: false,
                    error: `Newbi Creator Network requires a minimum of ${minInstagramFollowers.toLocaleString()} Instagram followers to register. Your account has ${submittedFollowers.toLocaleString()} followers.`
                });
            }
        }

        const verificationToken = `vt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}${Math.random().toString(36).slice(2, 11)}`;
        const creatorId = ((callerIsAdmin && creatorData.creatorId) || existingData?.creatorId || targetUid.slice(0, 8)).toUpperCase();
        const now = new Date().toISOString();

        // Verified only by the signed-in account's own email or phone (or an admin onboarding).
        const isLocal = isLocalDevRequest(req);
        const tokenEmailMatches = Boolean(decodedToken?.email_verified && decodedToken?.email?.toLowerCase() === normEmail);
        const isEmailVerified = Boolean((callerIsAdmin && creatorData.isEmailVerified) || existingData?.isEmailVerified || tokenEmailMatches || isLocal);
        const isPhoneVerified = Boolean((callerIsAdmin && creatorData.isPhoneVerified)
            || (existingData?.isPhoneVerified && normalizePhoneNumber(existingData.phone) === normPhone)
            || tokenPhoneMatches(decodedToken, rawPhone) || isLocal);

        // Determine auto-verification:
        // Only creators who manually entered their followers require manual verification.
        // Status is decided here, never taken from the applicant. A profile that already
        // exists keeps its review status, so re-applying can't lift a rejection or suspension.
        const shouldAutoVerify = !isManualFollowers;
        let profileStatus = shouldAutoVerify ? 'approved' : 'pending';
        let isVerified = shouldAutoVerify;
        if (callerIsAdmin) {
            if (creatorData.profileStatus) profileStatus = creatorData.profileStatus;
            if (creatorData.isVerified !== undefined) isVerified = creatorData.isVerified;
        } else if (existingData?.profileStatus) {
            profileStatus = existingData.profileStatus;
            isVerified = existingData.isVerified ?? (profileStatus === 'approved');
        }
        const keepsExistingReview = !callerIsAdmin && Boolean(existingData?.profileStatus);

        const finalCreator = {
            ...creatorData,
            uid: targetUid,
            creatorId,
            verificationToken,
            profileStatus,
            isVerified,
            manualFollowerEntry: isManualFollowers,
            requiresManualVerification: isManualFollowers,
            verifiedAt: keepsExistingReview ? (existingData.verifiedAt || null) : (shouldAutoVerify ? now : (creatorData.verifiedAt || null)),
            verifiedBy: keepsExistingReview ? (existingData.verifiedBy || null) : (shouldAutoVerify ? (creatorData.verifiedBy || 'system_auto_verify') : null),
            instagram: cleanInsta,
            linkedin: cleanLinkedin,
            youtube: cleanYoutube,
            twitter: cleanTwitter,
            website: '',
            instagramFollowers: submittedFollowers ? String(submittedFollowers) : (creatorData.instagramFollowers || '0'),
            instagramVerified: Boolean((callerIsAdmin && creatorData.instagramVerified) || (cleanInsta && submittedFollowers >= minInstagramFollowers)),
            instagramVerifiedAt: (callerIsAdmin && creatorData.instagramVerifiedAt) || (cleanInsta ? now : null),
            isPhoneVerified,
            phoneVerifiedAt: isPhoneVerified ? (creatorData.phoneVerifiedAt || existingData?.phoneVerifiedAt || now) : null,
            phoneVerificationPending: !isPhoneVerified,
            phoneVerificationSuspendedAt: !isPhoneVerified ? (creatorData.phoneVerificationSuspendedAt || now) : null,
            needsPhoneVerificationNotice: !isPhoneVerified,
            isEmailVerified,
            createdAt: existingData?.createdAt || (callerIsAdmin && creatorData.createdAt) || now,
            updatedAt: now
        };

        if (!callerIsAdmin) {
            const nextShortlist = await filterSelfShortlist(rawCreatorData.shortlistedCampaigns, existingData?.shortlistedCampaigns);
            if (nextShortlist) finalCreator.shortlistedCampaigns = nextShortlist;
        }

        // Write to Firestore using Admin privileges (immune to client Firestore security rules)
        await adminDb.collection('creators').doc(targetUid).set(finalCreator, { merge: true });

        // Handle Referral notification
        if (creatorData.referredBy) {
            const referredBy = String(creatorData.referredBy).trim();
            try {
                let referrer = null;
                const refDoc = await adminDb.collection('creators').doc(referredBy).get();
                if (refDoc.exists) {
                    referrer = { id: refDoc.id, ...refDoc.data() };
                } else {
                    const refSnap = await adminDb.collection('creators').where('creatorId', '==', referredBy.toUpperCase()).limit(1).get();
                    if (!refSnap.empty) {
                        referrer = { id: refSnap.docs[0].id, ...refSnap.docs[0].data() };
                    }
                }

                if (referrer) {
                    await adminDb.collection('notifications').add({
                        userId: referrer.uid || referrer.id,
                        title: "New Creator Referral! 🚀",
                        message: `${finalCreator.displayName || finalCreator.name || 'A creator'} joined Newbi using your referral link!`,
                        type: "info",
                        isRead: false,
                        createdAt: now
                    });
                }
            } catch (notiErr) {
                console.warn('[API/CREATOR-JOIN] Referral notification notice:', notiErr.message);
            }
        }

        // Generate verification link
        const host = req.headers.host || 'newbi.live';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const verificationUrl = `${protocol}://${host}/verify-creator?id=${targetUid}&token=${verificationToken}`;

        // Trigger WhatsApp and Email async in background
        if (finalCreator.phone) {
            sendWhatsAppVerification(finalCreator.phone, finalCreator.displayName || finalCreator.name || 'Creator', verificationUrl)
                .catch(err => console.warn('WhatsApp background notice:', err));
        }

        if (sendWelcome && finalCreator.email) {
            sendWelcomeEmail(finalCreator.email, finalCreator.displayName || finalCreator.name || 'Creator', verificationUrl, finalCreator)
                .catch(err => console.warn('Email background notice:', err));
        }

        // The token only travels by WhatsApp/email; returning it would let anyone verify without the message.
        const { verificationToken: _omitToken, ...creatorResponse } = finalCreator;
        return res.status(200).json({
            success: true,
            id: targetUid,
            creatorId,
            creator: creatorResponse
        });

    } catch (err) {
        console.error('[API/CREATOR-JOIN] Submission error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Internal server error while submitting application.'
        });
    }
}
