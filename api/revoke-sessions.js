import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { verifyToken, auth } from './lib/auth.js';

export default async function handler(req, res) {
    // Enable CORS
    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decodedToken = await verifyToken(req);
    if (!decodedToken) {
        return res.status(401).json({ error: 'Unauthorized: Valid Firebase ID Token required' });
    }

    const { targetUid, targetEmail } = req.body;
    const callerUid = decodedToken.uid;
    let uidToRevoke = targetUid;

    try {
        if (!auth) {
            throw new Error('Firebase Admin Auth failed to initialize. Check environment variables.');
        }

        const db = getFirestore();

        // 1. Resolve UID if targetEmail is passed and targetUid is missing/invalid
        if (targetEmail && (!uidToRevoke || uidToRevoke.length < 20 || uidToRevoke === targetEmail)) {
            try {
                const userRecord = await auth.getUserByEmail(targetEmail);
                uidToRevoke = userRecord.uid;
            } catch (err) {
                console.error(`[REVOKE] User with email ${targetEmail} not found in Auth:`, err);
                return res.status(404).json({ error: `User with email ${targetEmail} not found` });
            }
        }

        // Default to caller's own uid if no target is specified
        if (!uidToRevoke) {
            uidToRevoke = callerUid;
        }

        // Fetch user record to resolve email and name details
        let userRecord = null;
        try {
            userRecord = await auth.getUser(uidToRevoke);
        } catch (err) {
            console.error(`[REVOKE] Failed to fetch user record for UID: ${uidToRevoke}`, err);
        }

        // 2. Perform permission checks if revoking someone else's sessions
        if (uidToRevoke !== callerUid) {
            // Find caller's role in admins collection
            const callerAdminSnap = await db.collection('admins').where('email', '==', decodedToken.email).get();
            if (callerAdminSnap.empty) {
                return res.status(403).json({ error: 'Forbidden: Admin clearance required.' });
            }
            const callerRole = callerAdminSnap.docs[0].data().role;
            if (!callerRole || callerRole === 'pending' || callerRole === 'unauthorized') {
                return res.status(403).json({ error: 'Forbidden: Pending or unauthorized admin.' });
            }

            // Find target email to check if target is an admin
            let targetEmailToCheck = targetEmail || userRecord?.email;

            let targetIsAdmin = false;
            if (targetEmailToCheck) {
                const targetAdminSnap = await db.collection('admins').where('email', '==', targetEmailToCheck).get();
                if (!targetAdminSnap.empty) {
                    const targetRole = targetAdminSnap.docs[0].data().role;
                    if (targetRole && targetRole !== 'pending' && targetRole !== 'unauthorized') {
                        targetIsAdmin = true;
                    }
                }
            }

            // Developer and Founders can log anyone out. Regular admins can only log out members (non-admins).
            if (targetIsAdmin) {
                if (callerRole !== 'developer' && callerRole !== 'founder') {
                    return res.status(403).json({ error: 'Forbidden: Only Developers or Founders can log out admins.' });
                }
            }
        }

        // 3. Revoke the sessions on Firebase Auth
        console.log(`[REVOKE] Revoking sessions for UID: ${uidToRevoke} initiated by UID: ${callerUid}`);
        await auth.revokeRefreshTokens(uidToRevoke);

        // 4. Update the user document to enforce local logout via real-time check
        const userRef = db.collection('users').doc(uidToRevoke);
        await userRef.set({ forceLogoutBefore: new Date().toISOString() }, { merge: true });

        // 5. Send confirmation email
        if (userRecord && userRecord.email) {
            try {
                const email = userRecord.email;
                const displayName = userRecord.displayName || 'User';

                const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
                const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
                let smtpUser = process.env.SMTP_USER_SECURITY || process.env.SMTP_USER;
                let smtpPass = process.env.SMTP_PASS_SECURITY || process.env.SMTP_PASS;

                if (smtpUser && smtpPass) {
                    smtpUser = smtpUser.trim();
                    smtpPass = smtpPass.trim();
                    if ((smtpUser.startsWith('"') && smtpUser.endsWith('"')) || (smtpUser.startsWith("'") && smtpUser.endsWith("'"))) {
                        smtpUser = smtpUser.slice(1, -1).trim();
                    }
                    if ((smtpPass.startsWith('"') && smtpPass.endsWith('"')) || (smtpPass.startsWith("'") && smtpPass.endsWith("'"))) {
                        smtpPass = smtpPass.slice(1, -1).trim();
                    }

                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: smtpUser,
                            pass: smtpPass,
                        },
                        connectionTimeout: 10000,
                        socketTimeout: 15000
                    });

                    const primaryGreen = '#39FF14';
                    const logoUrl = 'https://newbi.live/logo_full.png';
                    const requestOrigin = req.headers.origin || `https://${req.headers.host}` || 'https://newbi.live';

                    const html = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                                .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
                                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
                                .container { max-width: 600px; margin: 40px auto; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                                .header { padding: 40px; border-bottom: 1px solid #1a1a1a; text-align: left; }
                                .content { padding: 50px; text-align: left; }
                                .category-badge { display: inline-block; padding: 6px 12px; background: ${primaryGreen}; color: #000000; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; }
                                .title { font-size: 28px; font-weight: 800; color: #ffffff; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; }
                                .body-text { color: #888888; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 40px; }
                                .cta-button { display: inline-block; padding: 16px 30px; background-color: ${primaryGreen}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; text-transform: uppercase; letter-spacing: 1px; }
                                .footer { padding: 40px 50px; background-color: #050505; border-top: 1px solid #1a1a1a; text-align: center; }
                                .footer-text { font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
                                .social-links { margin-bottom: 20px; }
                                .social-icon { display: inline-block; margin: 0 12px; }
                                .social-img { width: 18px; height: 18px; opacity: 0.6; filter: invert(1); }
                                @media screen and (max-width: 600px) {
                                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; }
                                    .content { padding: 30px 20px !important; }
                                    .header { padding: 30px 20px !important; }
                                    .footer { padding: 30px 20px !important; }
                                }
                            </style>
                        </head>
                        <body>
                            <span class="preheader">Your Newbi Entertainment account has been signed out of all devices</span>
                            <div class="container">
                                <div class="header">
                                    <img src="${logoUrl}" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px; background: linear-gradient(#0a0a0a, #0a0a0a); background-color: #0a0a0a; padding: 4px 8px; border-radius: 6px;">
                                </div>
                                <div class="content">
                                    <div class="category-badge">SECURITY PROTOCOL</div>
                                    <h1 class="title">DEVICES LOGGED OUT</h1>
                                    <p class="body-text">
                                        Hello ${displayName},<br><br>
                                        This email confirms that your account was successfully logged out of all active devices. 
                                        All active refresh tokens have been revoked.
                                    </p>
                                    <p class="body-text">
                                        If you initiated this request, no further actions are required. You can authenticate again at any time.
                                        If you did not authorize this, please reset your password immediately and contact security support.
                                    </p>
                                    <a href="${requestOrigin}/login" class="cta-button">SIGN IN TO ACCOUNT</a>
                                </div>
                                <div class="footer">
                                    <div class="social-links">
                                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" alt="Instagram"></a>
                                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" alt="LinkedIn"></a>
                                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" alt="Website"></a>
                                    </div>
                                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT & MARKETING LLP. ALL RIGHTS RESERVED.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

                    let fromDisplayName = "Newbi Security";
                    let fromEmailAddress = "noreply@newbi.live";

                    const envFrom = process.env.SMTP_FROM_SECURITY;
                    if (envFrom) {
                        const match = envFrom.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
                        if (match) {
                            fromDisplayName = match[1]?.trim() || fromDisplayName;
                            fromEmailAddress = match[2]?.trim() || fromEmailAddress;
                        }
                    }

                    const fromAddress = `"${fromDisplayName}" <${fromEmailAddress}>`;

                    await transporter.sendMail({
                        from: fromAddress,
                        sender: smtpUser,
                        to: email,
                        subject: 'Devices Logged Out',
                        html: html,
                    });
                    console.log(`[REVOKE] Confirmation email dispatched successfully to: ${email}`);
                }
            } catch (mailError) {
                console.error('[REVOKE] Failed to send revocation email:', mailError);
            }
        }

        console.log(`[REVOKE] Successfully revoked all sessions for UID: ${uidToRevoke}`);
        return res.status(200).json({ success: true, message: 'Sessions successfully revoked.' });

    } catch (error) {
        console.error('[REVOKE] Error revoking sessions:', error);
        return res.status(500).json({ error: 'Failed to revoke sessions', details: error.message });
    }
}
