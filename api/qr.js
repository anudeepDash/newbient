import QRCode from 'qrcode';

export default async function handler(req, res) {
    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
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

    const { text, size = 300, margin = 2 } = req.query;

    if (!text) {
        return res.status(400).json({ error: 'Missing text parameter' });
    }

    try {
        const qrImage = await QRCode.toBuffer(text, {
            width: parseInt(size),
            margin: parseInt(margin),
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
