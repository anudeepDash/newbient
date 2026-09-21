import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

let adminDb = null;
let adminAuth = null;

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

const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    return digits.slice(-10);
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
        groupUrl: 'https://chat.whatsapp.com/HT64p5ex3Fm0nJr8znaR9Q?mode=gi_t',
        description: 'Official Kochi & Kerala hub for live music events, creator meetups, regional brand deals & festival passes.'
    },
    {
        city: 'Delhi',
        groupUrl: 'https://chat.whatsapp.com/I3TM6ZGFz0X2YNd2YgLjZD?mode=gi_t',
        description: 'Official Delhi NCR hub for mega arena tours, lifestyle campaigns, brand launches & creator networking.'
    }
];

const resolveCityWhatsAppGroup = (city = '', customUrl = '') => {
    if (customUrl) {
        return {
            city: city || 'Local',
            groupUrl: customUrl,
            description: 'Official city hub for brand campaigns, concert access & creator meetups.'
        };
    }
    const clean = String(city || '').trim().toLowerCase();
    if (!clean || clean === 'pan-india' || clean === 'all') return DEFAULT_CREATOR_GROUPS[0];

    if (clean.includes('bengaluru') || clean.includes('bangalore')) return DEFAULT_CREATOR_GROUPS[0];
    if (clean.includes('hyderabad') || clean.includes('secunderabad')) return DEFAULT_CREATOR_GROUPS[1];
    if (clean.includes('chandigarh') || clean.includes('mohali') || clean.includes('panchkula') || clean.includes('tricity')) return DEFAULT_CREATOR_GROUPS[2];
    if (clean.includes('mumbai') || clean.includes('bombay') || clean.includes('navi mumbai') || clean.includes('thane')) return DEFAULT_CREATOR_GROUPS[3];
    if (clean.includes('pune') || clean.includes('poona')) return DEFAULT_CREATOR_GROUPS[4];
    if (clean.includes('kolkata') || clean.includes('calcutta')) return DEFAULT_CREATOR_GROUPS[5];
    if (clean.includes('kochi') || clean.includes('cochin') || clean.includes('kerala') || clean.includes('ernakulam')) return DEFAULT_CREATOR_GROUPS[6];
    if (clean.includes('delhi') || clean.includes('ncr') || clean.includes('noida') || clean.includes('gurugram') || clean.includes('gurgaon') || clean.includes('ghaziabad') || clean.includes('faridabad')) return DEFAULT_CREATOR_GROUPS[7];

    const partial = DEFAULT_CREATOR_GROUPS.find(g => clean.includes(g.city.toLowerCase()) || g.city.toLowerCase().includes(clean));
    return partial || DEFAULT_CREATOR_GROUPS[0];
};

// Send Welcome Email helper
const sendWelcomeEmail = async (toEmail, creatorName, verificationUrl, creatorData = {}) => {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
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
        const cityGroup = resolveCityWhatsAppGroup(city, creatorData.customGroupUrl || creatorData.whatsappGroupUrl);
        const passId = (creatorData.passId || creatorData.creatorId || 'NWB-PASS').toString().toUpperCase().replace(/^NWB-CR-/, '');
        const fullPassId = `NWB-CR-${passId}`;
        const handle = (creatorData.handle || creatorData.instagram || creatorName || 'creator').toString().replace(/^@/, '');
        const niche = creatorData.niche || creatorData.primaryNiche || creatorData.categories || creatorData.category || 'Creator & Influencer';
        const avatar = creatorData.avatar || creatorData.profilePicture || creatorData.photoURL || '';
        const points = Number(creatorData.points || 500).toLocaleString();
        const initialLetter = (creatorName ? creatorName.charAt(0) : 'C').toUpperCase();
        const interactivePassUrl = `${baseUrl}/creator-dashboard`;

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Welcome to Newbi Creators - Your Creator Pass</title>
    <style>
        .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
        body { margin: 0; padding: 0; background-color: #07080C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; }
        a { text-decoration: none; }
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; border-radius: 0 !important; border: none !important; }
            .content-padding { padding: 24px 18px !important; }
            .header-padding { padding: 24px 18px !important; }
            .pass-card { padding: 16px !important; }
            .stats-col { display: table-cell !important; width: 33.33% !important; padding: 6px 2px !important; }
            .stat-value { font-size: 13px !important; }
            .stat-label { font-size: 7px !important; }
            .wa-btn { padding: 14px 20px !important; font-size: 12px !important; }
        }
        @media (prefers-color-scheme: light) {
            .dark-theme-wrapper { background-color: #07080C !important; }
        }
    </style>
</head>
<body class="dark-theme-wrapper" style="margin: 0; padding: 0; background-color: #07080C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <span class="preheader">Your Newbi Creator Pass is ready. Join the ${cityGroup.city} WhatsApp community to unlock campaigns &amp; guestlists.</span>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07080C; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" class="email-container" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #0D0F18; border: 1px solid #1E2333; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
                    
                    <tr>
                        <td style="height: 4px; background: linear-gradient(90deg, #00F0FF 0%, #FF007A 50%, #39FF14 100%);"></td>
                    </tr>

                    <tr>
                        <td class="header-padding" style="padding: 32px 36px 20px 36px; border-bottom: 1px solid #181C2B;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="left" valign="middle">
                                        <img src="${baseUrl}/logo_full.png" alt="Newbi" height="26" style="display: block; height: 26px; width: auto; max-width: 150px; border: 0;" />
                                    </td>
                                    <td align="right" valign="middle">
                                        <span style="display: inline-block; padding: 5px 12px; background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.35); border-radius: 8px; color: #00F0FF; font-size: 9px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">
                                            CREATOR ROSTER
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td class="content-padding" style="padding: 36px 36px 20px 36px;">
                            
                            <div style="margin-bottom: 24px;">
                                <span style="display: inline-block; padding: 4px 10px; background: rgba(57, 255, 20, 0.12); border: 1px solid rgba(57, 255, 20, 0.35); color: #39FF14; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px;">
                                    MEMBERSHIP ACTIVATED
                                </span>
                                <h1 style="margin: 0 0 10px 0; font-size: 26px; font-weight: 900; color: #FFFFFF; line-height: 1.25; letter-spacing: -0.5px; text-transform: uppercase;">
                                    Welcome to Newbi, <span style="color: #00F0FF;">${creatorName.toUpperCase()}</span>!
                                </h1>
                                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94A3B8; font-weight: 400;">
                                    You are officially enrolled in the Newbi Creator Network. Your digital pass has been minted and linked to the <strong style="color: #FFFFFF;">${cityGroup.city}</strong> creator hub.
                                </p>
                            </div>

                            <!-- THE CREATOR PASS CARD -->
                            <table role="presentation" class="pass-card" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #0A0C13; border: 1px solid rgba(0, 240, 255, 0.35); border-radius: 20px; overflow: hidden; margin: 28px 0; box-shadow: 0 12px 36px rgba(0, 240, 255, 0.12);">
                                
                                <tr>
                                    <td colspan="2" style="height: 3px; background: linear-gradient(90deg, #00F0FF 0%, #FF007A 50%, #39FF14 100%);"></td>
                                </tr>

                                <tr>
                                    <td style="padding: 18px 22px 14px 22px;" align="left" valign="middle">
                                        <span style="font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: #FFFFFF; text-transform: uppercase;">NEWBI CREATORS</span>
                                        <span style="display: inline-block; width: 6px; height: 6px; background-color: #39FF14; border-radius: 50%; margin-left: 6px; vertical-align: middle;"></span>
                                    </td>
                                    <td style="padding: 18px 22px 14px 22px;" align="right" valign="middle">
                                        <span style="font-family: monospace; font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #00F0FF; background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 6px; padding: 4px 8px;">
                                            ${fullPassId}
                                        </span>
                                    </td>
                                </tr>

                                <tr>
                                    <td colspan="2" style="padding: 10px 22px 18px 22px;">
                                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td width="60" valign="middle" style="width: 60px; padding-right: 16px;">
                                                    ${avatar ? `
                                                        <img src="${avatar}" alt="${creatorName}" width="54" height="54" style="width: 54px; height: 54px; border-radius: 14px; object-fit: cover; border: 2px solid #39FF14; display: block;" />
                                                    ` : `
                                                        <table role="presentation" width="54" height="54" border="0" cellspacing="0" cellpadding="0" style="width: 54px; height: 54px; background-color: #141824; border: 2px solid #39FF14; border-radius: 14px; text-align: center;">
                                                            <tr>
                                                                <td align="center" valign="middle" style="font-size: 22px; font-weight: 900; color: #39FF14;">${initialLetter}</td>
                                                            </tr>
                                                        </table>
                                                    `}
                                                </td>
                                                <td valign="middle">
                                                    <div style="font-size: 18px; font-weight: 900; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.3px;">
                                                        ${creatorName}
                                                    </div>
                                                    <div style="font-size: 12px; font-weight: 500; color: #94A3B8; margin-top: 4px;">
                                                        @${handle} <span style="color: #475569;">&bull;</span> ${cityGroup.city} <span style="color: #475569;">&bull;</span> ${niche}
                                                    </div>
                                                    <div style="margin-top: 6px;">
                                                        <span style="display: inline-block; font-size: 8px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #39FF14; background: rgba(57, 255, 20, 0.12); border: 1px solid rgba(57, 255, 20, 0.35); border-radius: 4px; padding: 2px 7px;">
                                                            ● OFFICIAL CREATOR PASS
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Pass Authentication & Barcode Strip -->
                                <tr>
                                    <td colspan="2" style="border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.015); padding: 12px 22px;">
                                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="left" valign="middle">
                                                    <span style="font-family: monospace; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: #94A3B8; text-transform: uppercase;">
                                                        AUTHENTICATED PASS // ALL-ACCESS
                                                    </span>
                                                </td>
                                                <td align="right" valign="middle">
                                                    <span style="font-family: monospace; font-size: 10px; letter-spacing: 2px; color: #475569;">
                                                        ||| |||| || ||||| ||||
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Pass Footer: 3D Pass Link -->
                                <tr>
                                    <td colspan="2" style="padding: 10px 22px 14px 22px;" align="right" valign="middle">
                                        <a href="${interactivePassUrl}" style="color: #00F0FF; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-decoration: none;">
                                            View 3D Pass Online &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- CITY WHATSAPP COMMUNITY SECTION -->
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, rgba(37, 211, 102, 0.12) 0%, rgba(37, 211, 102, 0.03) 100%); border: 1px solid rgba(37, 211, 102, 0.35); border-radius: 18px; overflow: hidden; margin: 26px 0 20px 0;">
                                <tr>
                                    <td style="padding: 26px 24px; text-align: center;">
                                        <div style="margin-bottom: 12px;">
                                            <span style="display: inline-block; background: rgba(37, 211, 102, 0.18); border: 1px solid #25D366; color: #25D366; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; border-radius: 6px; padding: 4px 10px; text-transform: uppercase;">
                                                💬 ${cityGroup.city.toUpperCase()} CREATOR HUB
                                            </span>
                                        </div>
                                        <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.3px;">
                                            Join the ${cityGroup.city} Creators WhatsApp Group
                                        </h2>
                                        <p style="margin: 0 0 16px 0; font-size: 13px; line-line: 1.6; color: #CBD5E1; max-width: 480px; margin-left: auto; margin-right: auto;">
                                            ${cityGroup.description}
                                        </p>
                                        <p style="margin: 0 0 22px 0; font-size: 12px; line-height: 1.5; color: #94A3B8;">
                                            ⚡ <strong>Priority drops:</strong> Commercial brand deals, VIP festival guestlists, and backstage invites are posted here first.
                                        </p>
                                        <div style="margin-top: 10px;">
                                            <a href="${cityGroup.groupUrl}" target="_blank" class="wa-btn" style="display: inline-block; padding: 16px 36px; background-color: #25D366; color: #000000 !important; font-weight: 900; font-size: 13px; text-decoration: none; border-radius: 12px; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 8px 24px rgba(37, 211, 102, 0.35);">
                                                💬 JOIN ${cityGroup.city.toUpperCase()} WHATSAPP COMMUNITY &rarr;
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- 1-CLICK VERIFICATION -->
                            ${verificationUrl ? `
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: rgba(57, 255, 20, 0.05); border: 1px solid rgba(57, 255, 20, 0.28); border-radius: 16px; margin: 20px 0; overflow: hidden;">
                                <tr>
                                    <td style="padding: 22px; text-align: center;">
                                        <div style="font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: #39FF14; text-transform: uppercase; margin-bottom: 6px;">
                                            ⚡ FAST-TRACK ACTIVATION
                                        </div>
                                        <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 900; color: #FFFFFF;">
                                            1-Click Profile &amp; Contact Verification
                                        </h3>
                                        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #94A3B8;">
                                            Confirm your registered mobile number to unlock instant payouts and priority brand matching.
                                        </p>
                                        <a href="${verificationUrl}" style="display: inline-block; padding: 13px 28px; background-color: #39FF14; color: #000000 !important; font-weight: 900; font-size: 12px; text-decoration: none; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 14px rgba(57, 255, 20, 0.25);">
                                            VERIFY PROFILE &amp; CONTACT &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}

                            <!-- PRIVILEGES -->
                            <div style="margin: 28px 0 20px 0;">
                                <div style="font-size: 10px; font-weight: 900; letter-spacing: 2px; color: #64748B; text-transform: uppercase; margin-bottom: 14px; text-align: left;">
                                    YOUR CREATOR PRIVILEGES
                                </div>
                                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #111420; border: 1px solid #1C2234; border-radius: 16px; padding: 18px 20px;">
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td width="30" valign="top" style="font-size: 16px; padding-top: 1px;">💸</td>
                                                    <td valign="top">
                                                        <strong style="color: #FFFFFF; font-size: 13px;">0% Agency Commission</strong>
                                                        <p style="margin: 3px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.4;">Brands pay directly to your account. 100% of commercial budgets go to you.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td width="30" valign="top" style="font-size: 16px; padding-top: 1px;">🎟️</td>
                                                    <td valign="top">
                                                        <strong style="color: #FFFFFF; font-size: 13px;">VIP Festival &amp; Concert Guestlists</strong>
                                                        <p style="margin: 3px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.4;">Exclusive guestlist access &amp; backstage passes for concerts, tours, and nightlife in ${cityGroup.city}.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0 4px 0;">
                                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td width="30" valign="top" style="font-size: 16px; padding-top: 1px;">⚡</td>
                                                    <td valign="top">
                                                        <strong style="color: #FFFFFF; font-size: 13px;">Direct Brand Briefs</strong>
                                                        <p style="margin: 3px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.4;">Personalized campaign briefs matched to your niche, aesthetic, and follower demographic.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <div style="text-align: center; margin: 32px 0 10px 0;">
                                <a href="${interactivePassUrl}" style="display: inline-block; padding: 16px 36px; background: linear-gradient(90deg, #00F0FF, #FF007A); color: #FFFFFF !important; font-weight: 900; font-size: 13px; text-decoration: none; border-radius: 12px; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 20px rgba(0, 240, 255, 0.25);">
                                    GO TO CREATOR STUDIO DASHBOARD &rarr;
                                </a>
                            </div>

                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 30px 36px 36px 36px; background-color: #080A10; border-top: 1px solid #181C2B; text-align: center;">
                            <div style="margin-bottom: 16px;">
                                <a href="https://www.instagram.com/newbi.live" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" width="18" height="18" style="opacity: 0.6; filter: invert(1); display: block;" alt="Instagram"></a>
                                <a href="https://linkedin.com/company/newbi-ent" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" width="18" height="18" style="opacity: 0.6; filter: invert(1); display: block;" alt="LinkedIn"></a>
                                <a href="https://newbi.live" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" width="18" height="18" style="opacity: 0.6; filter: invert(1); display: block;" alt="Website"></a>
                            </div>
                            <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1.5px;">
                                &copy; ${new Date().getFullYear()} NEWBI ENTERTAINMENT &amp; MARKETING LLP. ALL RIGHTS RESERVED.
                            </p>
                            <p style="margin: 0; font-size: 10px; font-weight: 500; color: #475569;">
                                Queries or campaign support: <a href="mailto:creators@newbi.live" style="color: #00F0FF; text-decoration: none;">creators@newbi.live</a>
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

        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Newbi Creators" <creators@newbi.live>`,
            to: toEmail,
            subject: `🎟️ Your Newbi Creator Pass & ${cityGroup.city} Community Access!`,
            html
        });
    } catch (err) {
        console.warn('[API/CREATOR-JOIN] Email notice:', err.message);
    }
};


export default async function handler(req, res) {
    if (!res.status) res.status = (c) => { res.statusCode = c; return res; };
    if (!res.json) res.json = (d) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(d)); return res; };

    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!adminDb) {
        return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    // Optional Auth Token Resolution
    let decodedToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && adminAuth) {
        try {
            const token = authHeader.split('Bearer ')[1];
            decodedToken = await adminAuth.verifyIdToken(token, true);
        } catch (e) {
            // Token verification failure is non-fatal for guest registration
            console.warn('[API/CREATOR-JOIN] Token decode notice:', e.message);
        }
    }

    const action = req.query.action || req.body?.action || 'join';

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

            // If already verified
            if (data.isPhoneVerified && !data.verificationToken) {
                return res.status(200).json({ success: true, alreadyVerified: true, creator: { ...data, id: snap.id } });
            }

            // Verify token match
            if (data.verificationToken && data.verificationToken !== verificationToken) {
                return res.status(400).json({ success: false, error: 'This verification link is invalid or expired.' });
            }

            const now = new Date().toISOString();
            const updates = {
                isPhoneVerified: true,
                phoneVerifiedAt: now,
                isEmailVerified: true,
                emailVerifiedAt: now,
                verificationToken: null,
                profileStatus: data.profileStatus === 'pending' ? 'approved' : (data.profileStatus || 'approved'),
                updatedAt: now
            };

            await docRef.update(updates);

            return res.status(200).json({
                success: true,
                creator: { ...data, ...updates, id: snap.id }
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
        try {
            await sendWhatsAppVerification(phone, creatorName, verificationUrl);
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] WhatsApp verify dispatch error:', err);
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
            return res.status(200).json({ success: true, id: docRef.id });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Add creator group error:', err);
            return res.status(500).json({ success: false, error: err.message });
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
            await adminDb.collection('creator_groups').doc(id).update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Update creator group error:', err);
            return res.status(500).json({ success: false, error: err.message });
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
            await adminDb.collection('creator_groups').doc(id).delete();
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('[API/CREATOR-JOIN] Delete creator group error:', err);
            return res.status(500).json({ success: false, error: err.message });
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

            let docRef = adminDb.collection('creators').doc(targetIdentifier);
            let snap = await docRef.get();

            // If not found by direct doc ID, try searching by uid or creatorId
            if (!snap.exists) {
                let querySnap = await adminDb.collection('creators')
                    .where('uid', '==', targetIdentifier)
                    .limit(1)
                    .get();

                if (querySnap.empty) {
                    querySnap = await adminDb.collection('creators')
                        .where('creatorId', '==', targetIdentifier.toUpperCase())
                        .limit(1)
                        .get();
                }

                if (!querySnap.empty) {
                    snap = querySnap.docs[0];
                    docRef = snap.ref;
                }
            }

            if (!snap.exists) {
                return res.status(404).json({ success: false, error: 'Creator profile not found.' });
            }

            const data = snap.data();
            const prevStatus = data.profileStatus;
            const now = new Date().toISOString();
            const finalUpdates = {
                ...updates,
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

    // ── ACTION: JOIN / REGISTER CREATOR ─────────────────────────────────────
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const body = req.body || {};
        const { creator, sendWelcome = true } = body;
        const creatorData = creator || body;

        const name = (creatorData.displayName || creatorData.name || '').trim();
        const rawPhone = creatorData.phone || '';
        const rawEmail = creatorData.email || '';
        const rawInstagram = creatorData.instagram || '';

        if (!name || !rawPhone || !rawEmail) {
            return res.status(400).json({ success: false, error: 'Please complete all required fields (name, phone, email).' });
        }

        const normPhone = normalizePhoneNumber(rawPhone);
        const normEmail = rawEmail.trim().toLowerCase();
        const cleanInsta = rawInstagram.trim().replace(/^@/, '').toLowerCase();

        const callerUid = decodedToken?.uid || null;
        const targetUid = creatorData.uid || callerUid || adminDb.collection('creators').doc().id;

        // Fetch existing creators for deduplication
        const creatorsSnap = await adminDb.collection('creators').get();
        const existingCreators = [];
        creatorsSnap.forEach(d => {
            existingCreators.push({ id: d.id, ...d.data() });
        });

        // 1. Phone number deduplication
        if (normPhone) {
            const conflictPhone = existingCreators.find(c =>
                c.id !== targetUid &&
                c.uid !== targetUid &&
                normalizePhoneNumber(c.phone) === normPhone
            );
            if (conflictPhone) {
                return res.status(409).json({
                    success: false,
                    error: `The mobile number ${rawPhone} is already linked to another Creator profile (${conflictPhone.displayName || conflictPhone.name || 'Existing Account'}). Multiple creator accounts for the same mobile number are not allowed.`
                });
            }
        }

        // 2. Email deduplication
        if (normEmail) {
            const conflictEmail = existingCreators.find(c =>
                c.id !== targetUid &&
                c.uid !== targetUid &&
                c.email && c.email.trim().toLowerCase() === normEmail
            );
            if (conflictEmail) {
                return res.status(409).json({
                    success: false,
                    error: `The email address ${rawEmail} is already registered to an existing Creator profile. Please sign in to access your dashboard.`
                });
            }
        }

        // 3. Instagram handle deduplication
        if (cleanInsta) {
            const conflictInsta = existingCreators.find(c =>
                c.id !== targetUid &&
                c.uid !== targetUid &&
                c.instagram && c.instagram.trim().replace(/^@/, '').toLowerCase() === cleanInsta
            );
            if (conflictInsta) {
                return res.status(409).json({
                    success: false,
                    error: `The Instagram handle @${cleanInsta} is already linked to an existing Creator profile.`
                });
            }
        }

        const verificationToken = creatorData.verificationToken || `vt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const creatorId = (creatorData.creatorId || targetUid.slice(0, 8)).toUpperCase();
        const now = new Date().toISOString();

        // Check if verified via phone auth or token email match
        const isEmailVerified = creatorData.isEmailVerified || (decodedToken?.email_verified && decodedToken?.email?.toLowerCase() === normEmail) || false;
        const isPhoneVerified = Boolean(creatorData.isPhoneVerified) || (Boolean(decodedToken?.phone_number) && normalizePhoneNumber(decodedToken?.phone_number) === normPhone);

        const finalCreator = {
            ...creatorData,
            uid: targetUid,
            creatorId,
            verificationToken,
            profileStatus: creatorData.profileStatus || 'pending',
            isVerified: creatorData.isVerified || false,
            isPhoneVerified,
            phoneVerifiedAt: isPhoneVerified ? (creatorData.phoneVerifiedAt || now) : null,
            isEmailVerified,
            createdAt: creatorData.createdAt || now,
            updatedAt: now
        };

        // Write to Firestore using Admin privileges (immune to client Firestore security rules)
        await adminDb.collection('creators').doc(targetUid).set(finalCreator, { merge: true });

        // Handle Referral notification
        if (creatorData.referredBy) {
            const referredBy = String(creatorData.referredBy).trim();
            const referrer = existingCreators.find(c =>
                c.uid === referredBy ||
                c.id === referredBy ||
                (c.creatorId && c.creatorId.toUpperCase() === referredBy.toUpperCase()) ||
                (c.instagram && c.instagram.toLowerCase() === referredBy.toLowerCase()) ||
                (c.linkedin && c.linkedin.toLowerCase() === referredBy.toLowerCase())
            );

            if (referrer) {
                try {
                    await adminDb.collection('notifications').add({
                        userId: referrer.uid || referrer.id,
                        title: "New Creator Referral! 🚀",
                        message: `${finalCreator.displayName || finalCreator.name || 'A creator'} joined Newbi using your referral link!`,
                        type: "info",
                        isRead: false,
                        createdAt: now
                    });
                } catch (notiErr) {
                    console.warn('[API/CREATOR-JOIN] Referral notification notice:', notiErr.message);
                }
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

        return res.status(200).json({
            success: true,
            id: targetUid,
            creatorId,
            verificationToken,
            creator: finalCreator
        });

    } catch (err) {
        console.error('[API/CREATOR-JOIN] Submission error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Internal server error while submitting application.'
        });
    }
}
