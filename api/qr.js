import QRCode from 'qrcode';

export default async function handler(req, res) {
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
        console.error('Error generating QR code:', error);
        return res.status(500).json({ error: 'Failed to generate QR code' });
    }
}
