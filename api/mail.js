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

    const { to, subject, text, html, attachments } = req.body;

    if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Security check: In a real app, verify Firebase ID Token here
    // For now, we rely on Vercel environment variables for SMTP
    
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `"Newbi Support" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html,
            attachments: attachments || [],
        });

        console.log('Message sent: %s', info.messageId);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
}
