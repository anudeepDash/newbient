import nodemailer from 'nodemailer';
import { admin } from './lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Missing email' });
    }

    try {
        // 1. Generate the Firebase Password Reset Link
        const actionCodeSettings = {
            url: process.env.NEXT_PUBLIC_APP_URL || 'https://newbi.live/login',
        };
        const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

        // 2. Setup Transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // 3. Define the High-Fidelity Template
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: sans-serif; background-color: #000; color: #fff; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 40px; overflow: hidden; }
                    .header { padding: 40px; text-align: center; border-bottom: 1px solid #111; }
                    .hero { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
                    .content { padding: 40px 60px; text-align: left; }
                    .title { font-size: 32px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-bottom: 20px; line-height: 1.1; letter-spacing: -1px; }
                    .accent-line { width: 40px; height: 4px; background-color: #39FF14; border-radius: 2px; margin-bottom: 30px; }
                    .body-text { color: #888; font-size: 14px; line-height: 1.6; font-weight: 500; margin-bottom: 40px; }
                    .cta-button { display: inline-block; padding: 16px 32px; background-color: #39FF14; color: #000; text-decoration: none; font-weight: 900; text-transform: uppercase; font-size: 12px; border-radius: 12px; box-shadow: 0 10px 30px rgba(57,255,20,0.3); }
                    .footer { padding: 40px; background-color: #000; border-top: 1px solid #111; text-align: center; }
                    .footer-text { font-size: 10px; font-weight: 900; color: #333; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
                    .sub-footer-text { font-size: 8px; font-weight: 700; color: #222; text-transform: uppercase; letter-spacing: 1px; max-width: 300px; margin: 0 auto; line-height: 1.4; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="https://newbi.live/logo_full.png" alt="Newbi Ent" height="32">
                    </div>
                    <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop" class="hero" alt="Hero">
                    <div class="content">
                        <div class="title">RESET YOUR<br/><span style="color: #39FF14">IDENTITY.</span></div>
                        <div class="accent-line"></div>
                        <p class="body-text">
                            We received a request to reset your password for your Newbi Entertainment account. 
                            Security is paramount in the tribe infrastructure. Click below to establish a new protocol.
                        </p>
                        <a href="${resetLink}" class="cta-button">RESET PASSWORD</a>
                    </div>
                    <div class="footer">
                        <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENT. ALL RIGHTS RESERVED.</p>
                        <p class="sub-footer-text">IF YOU DID NOT REQUEST THIS RESET, PLEASE IGNORE THIS EMAIL OR CONTACT SECURITY@NEWBI.LIVE.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // 4. Send the Email
        await transporter.sendMail({
            from: `"Newbi Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: email,
            subject: 'RESET YOUR IDENTITY // NEWBI ENT.',
            html: html,
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error generating reset link or sending email:', error);
        return res.status(500).json({ error: 'Failed to process request', details: error.message });
    }
}
