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

// Send Welcome Email helper
const sendWelcomeEmail = async (toEmail, creatorName, verificationUrl) => {
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

        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #0a0a0c; color: #ffffff; border-radius: 20px;">
                <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 15px; color: #ffffff;">Welcome to <span style="color: #00F0FF;">Newbi</span> <span style="color: #FF007A;">Creators</span>! 🚀</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa; margin-bottom: 20px;">
                    Hi ${creatorName}, your creator application has been received and approved! You are now part of India's elite influencer roster.
                </p>
                ${verificationUrl ? `
                <div style="margin: 25px 0;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background: #39FF14; color: #000000; font-weight: 900; text-decoration: none; border-radius: 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
                        Verify Profile &amp; Contact
                    </a>
                </div>
                ` : ''}
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-top: 25px;">
                    <p style="font-size: 12px; color: #71717a; margin: 0;">
                        100% direct payouts • 0% agency commission • Direct WhatsApp briefs
                    </p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Newbi Creators" <creators@newbi.live>`,
            to: toEmail,
            subject: 'Welcome to Newbi Creators! Confirm your profile 🚀',
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
            sendWelcomeEmail(finalCreator.email, finalCreator.displayName || finalCreator.name || 'Creator', verificationUrl)
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
