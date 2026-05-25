import nodemailer from 'nodemailer';
import { auth } from './lib/auth.js';

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

    console.log(`[RESET] 🚀 Initializing reset protocol for: ${email}`);

    try {
        if (!auth) {
            throw new Error('Firebase Admin Auth failed to initialize. Check your environment variables.');
        }

        // 1. Generate the Firebase Password Reset Link
        const requestOrigin = req.headers.origin || `https://${req.headers.host}` || 'https://newbi.live';
        const actionCodeSettings = {
            url: `${requestOrigin}/login`,
        };
        
        console.log(`[RESET] 🔗 Generating link via Firebase...`);
        const firebaseLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
        
        // Convert the Firebase link into a custom link pointing to our custom ActionHandler page
        const urlObj = new URL(firebaseLink);
        const originUrlObj = new URL(requestOrigin);
        urlObj.protocol = originUrlObj.protocol;
        urlObj.host = originUrlObj.host;
        urlObj.pathname = '/auth/action';
        
        const resetLink = urlObj.toString();
        console.log(`[RESET] ✅ Custom link generated successfully: ${resetLink}`);

        // 2. Setup Transporter
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('[RESET] ❌ Missing SMTP_USER or SMTP_PASS environment variables!');
            throw new Error('SMTP credentials are not configured. Please set SMTP_USER and SMTP_PASS in your environment.');
        }

        let smtpUser = process.env.SMTP_USER?.trim() || '';
        let smtpPass = process.env.SMTP_PASS?.trim() || '';

        // Strip surrounding quotes if present (e.g. from copy-pasting raw dotenv values)
        if ((smtpUser.startsWith('"') && smtpUser.endsWith('"')) || (smtpUser.startsWith("'") && smtpUser.endsWith("'"))) {
            smtpUser = smtpUser.slice(1, -1).trim();
        }
        if ((smtpPass.startsWith('"') && smtpPass.endsWith('"')) || (smtpPass.startsWith("'") && smtpPass.endsWith("'"))) {
            smtpPass = smtpPass.slice(1, -1).trim();
        }

        console.log(`[RESET] 🔧 SMTP Config: host=${smtpHost}, port=${smtpPort}, user=${smtpUser}, passLength=${smtpPass.length}`);

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
                        <img src="${logoUrl}" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
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
                            <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                            <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                            <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                        </div>
                        <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // 4. Send the Email
        // Always use cleaned SMTP_USER as sender address to prevent SMTP sender rejection errors
        const fromAddress = `"Newbi Security" <${smtpUser}>`;
        
        console.log(`[RESET] ✉️ Sending email via SMTP...`);
        const info = await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: 'Reset your Password',
            html: html,
        });

        console.log(`[RESET] 🎊 Email sent successfully: ${info.messageId}`);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('[RESET] ❌ FATAL ERROR:', error.message);
        console.error('[RESET] ❌ Error code:', error.code);
        console.error('[RESET] ❌ Error response:', error.response);
        console.error('[RESET] ❌ Error responseCode:', error.responseCode);
        console.error('[RESET] ❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // Categorize common errors for better UI feedback
        let userMessage = error.message;
        if (error.code === 'auth/user-not-found' || error.message?.includes('no user')) {
            userMessage = 'This email address is not registered in our system.';
        } else if (error.code === 'EAUTH' || error.message?.includes('Invalid login')) {
            userMessage = 'SMTP Authentication failed. The App Password may be expired or revoked. Please generate a new one in Google Account settings.';
        } else if (error.message?.includes('DECODER') || error.message?.includes('OAuth2')) {
            userMessage = 'Firebase Admin credential error. Private key may be malformed.';
        }
        
        return res.status(500).json({ error: 'Failed to process request', details: userMessage });
    }
}

