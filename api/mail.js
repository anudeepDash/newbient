import nodemailer from 'nodemailer';
import { verifyToken } from './lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decodedToken = await verifyToken(req);
    if (!decodedToken) {
        return res.status(401).json({ error: 'Unauthorized: Valid Firebase ID Token required' });
    }

    const { to, bcc, subject, text, html, attachments, accountType = 'official' } = req.body;

    if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine credentials based on account type
    let smtpUser = process.env.SMTP_USER;
    let smtpPass = process.env.SMTP_PASS;
    let fromDisplayName = "Newbi Entertainment";
    let fromEmail = process.env.SMTP_USER;

    if (accountType === 'weekly') {
        // Use dedicated weekly credentials if available, otherwise fallback to primary
        smtpUser = process.env.WEEKLY_SMTP_USER || process.env.SMTP_USER;
        smtpPass = process.env.WEEKLY_SMTP_PASS || process.env.SMTP_PASS;
        fromDisplayName = "Weekly by Concert Zone";
        fromEmail = process.env.WEEKLY_SMTP_USER || "weekly@newbi.live";
    } else {
        // Official/Primary
        fromDisplayName = "Newbi Entertainment";
        fromEmail = "partnership@newbi.live";
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    
    if (!smtpUser || !smtpPass) {
        console.error(`[MAIL] ❌ Missing credentials for account: ${accountType}`);
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    try {
        const fromAddress = `"${fromDisplayName}" <${fromEmail}>`;

        const info = await transporter.sendMail({
            from: fromAddress,
            to,
            bcc,
            subject,
            text,
            html,
            attachments: attachments || [],
        });

        console.log(`[MAIL] ✅ ${accountType} mail sent: ${info.messageId}`);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error(`[MAIL] 💥 ${accountType} mail failed:`, error);
        return res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
}
