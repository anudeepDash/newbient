import QRCode from 'qrcode';
import { readWaCard, renderWaCard } from './_lib/waCard.js';

export default async function handler(req, res) {
    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://app.newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // WhatsApp template image headers (api/_lib/waCard.js), drawn per message from a signed URL.
    if (req.query.wa) {
        const card = readWaCard(req.query.wa, req.query.sig);
        if (!card) return res.status(404).json({ error: 'Unknown card' });
        try {
            const png = await renderWaCard(card);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.send(png);
        } catch (error) {
            console.error('[QR] WhatsApp card failed:', error.message);
            return res.status(500).json({ error: 'Failed to draw the card' });
        }
    }

    const { text, size = 300, margin = 2 } = req.query;

    if (!text) {
        return res.status(400).json({ error: 'Missing text parameter' });
    }
    if (String(text).length > 2000) {
        return res.status(400).json({ error: 'Text too long' });
    }
    // Emails, passes and invoices link here now, so keep requests to sane sizes.
    const width = Math.min(1200, Math.max(64, parseInt(size, 10) || 300));
    const quiet = Math.min(8, Math.max(0, parseInt(margin, 10) || 0));

    try {
        const qrImage = await QRCode.toBuffer(String(text), {
            width,
            margin: quiet,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(qrImage);
    } catch (error) {
        const correlationId = Math.random().toString(36).substring(2, 15);
        console.error(`[QR] Error [Correlation ID: ${correlationId}]:`, error);
        return res.status(500).json({ error: 'Failed to generate QR code', correlationId });
    }
}
