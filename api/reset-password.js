import nodemailer from 'nodemailer';
import { auth } from './lib/auth.js';

const rateLimitCache = new Map();
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
    if (!ip || ip === 'unknown') return true; // Fallback if IP cannot be determined
    const now = Date.now();
    const userRecord = rateLimitCache.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > userRecord.resetTime) {
        userRecord.count = 1;
        userRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
        userRecord.count++;
    }

    // Optional: cleanup old entries to prevent memory leak
    if (rateLimitCache.size > 10000) rateLimitCache.clear();
    
    rateLimitCache.set(ip, userRecord);
    return userRecord.count <= RATE_LIMIT_MAX_REQUESTS;
}

export default async function handler(req, res) {
    // Enable CORS
    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Missing email' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
        if (!auth) {
            throw new Error('Firebase Admin Auth failed to initialize. Check your environment variables.');
        }

        // 1. Generate the Firebase Password Reset Link
        const requestOrigin = req.headers.origin || `https://${req.headers.host}` || 'https://newbi.live';
        const actionCodeSettings = {
            url: `${requestOrigin}/login`,
        };
        
        const firebaseLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
        
        // Convert the Firebase link into a custom link pointing to our custom ActionHandler page
        const urlObj = new URL(firebaseLink);
        const originUrlObj = new URL(requestOrigin);
        urlObj.protocol = originUrlObj.protocol;
        urlObj.host = originUrlObj.host;
        urlObj.pathname = '/auth/action';
        
        const resetLink = urlObj.toString();

        // 2. Setup Transporter
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

        // Check for service-specific credentials
        let smtpUser = process.env.SMTP_USER_SECURITY || process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASS_SECURITY || process.env.SMTP_PASS;

        if (!smtpUser || !smtpPass) {
            throw new Error('CRITICAL: SMTP credentials are not configured. App refuses to start.');
        }

        smtpUser = smtpUser.trim();
        smtpPass = smtpPass.trim();

        // Strip surrounding quotes if present (e.g. from copy-pasting raw dotenv values)
        if ((smtpUser.startsWith('"') && smtpUser.endsWith('"')) || (smtpUser.startsWith("'") && smtpUser.endsWith("'"))) {
            smtpUser = smtpUser.slice(1, -1).trim();
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
            greetingTimeout: 5000,
            socketTimeout: 15000
        });

        // 3. Define the Template (Official Mailing Style)
        const primaryGreen = '#39FF14';
        const logoUrl = 'https://newbi.live/logo_full.png';

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
                <span class="preheader">Reset your Newbi Entertainment account password</span>
                <div class="container">
                    <div class="header">
                        <img src="${logoUrl}" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px; background: linear-gradient(#0a0a0a, #0a0a0a); background-color: #0a0a0a; padding: 4px 8px; border-radius: 6px;">
                    </div>
                    <div class="content">
                        <div class="category-badge">SECURITY</div>
                        <h1 class="title">RESET YOUR IDENTITY</h1>
                        <p class="body-text">
                            We received a request to reset your password for your Newbi Entertainment account. 
                            Security is paramount in the tribe infrastructure. Click below to establish a new protocol.
                        </p>
                        <a href="${resetLink}" class="cta-button">RESET PASSWORD</a>
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

        // 4. Send the Email
        // Default to "Newbi Security" <noreply@newbi.live>
        let fromDisplayName = "Newbi Security";
        let fromEmailAddress = "noreply@newbi.live";

        // Check for override
        const envFrom = process.env.SMTP_FROM_SECURITY;
        if (envFrom) {
            const match = envFrom.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
            if (match) {
                fromDisplayName = match[1]?.trim() || fromDisplayName;
                fromEmailAddress = match[2]?.trim() || fromEmailAddress;
            }
        }

        const fromAddress = `"${fromDisplayName}" <${fromEmailAddress}>`;
        
        const info = await transporter.sendMail({
            from: fromAddress,
            sender: smtpUser, // Envelope sender to prevent SMTP auth sender mismatch errors
            to: email,
            subject: 'Reset your Password',
            html: html,
        });

        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        const correlationId = Math.random().toString(36).substring(2, 15);
        console.error(`[RESET] Error [Correlation ID: ${correlationId}]:`, error);
        
        // Return generic error as requested (no internal details)
        return res.status(500).json({ error: 'Internal server error', correlationId });
    }
}

