// ═══════════════════════════════════════════════════════════════════════════
// NEWBI WHATSAPP VERIFICATION API (Meta Cloud API)
// Sends automated 1-click magic verification links directly to WhatsApp
// ═══════════════════════════════════════════════════════════════════════════

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export default async function handler(req, res) {
    // CORS headers
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        console.error('Missing WhatsApp credentials in environment variables');
        return res.status(500).json({ 
            success: false, 
            error: 'WhatsApp API credentials not configured on server.' 
        });
    }

    try {
        const { phone, creatorName = 'Creator', verificationUrl } = req.body || {};

        if (!phone || !verificationUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: phone and verificationUrl are required.' 
            });
        }

        // Clean and normalize phone number into E.164 without leading '+'
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) {
            // Default to India country code +91
            cleanPhone = `91${cleanPhone}`;
        }

        const metaApiUrl = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

        // 1. First attempt: Use official 'creator_verification' template
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
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        let data = await response.json();

        // 2. If template is not found or not approved yet, fallback to direct text message
        if (!response.ok && data?.error?.code === 132001) {
            console.warn("Template 'creator_verification' not active yet, falling back to direct text...");
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

            response = await fetch(metaApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            data = await response.json();
        }

        if (!response.ok) {
            console.error('Meta WhatsApp API Error:', data);
            return res.status(response.status).json({
                success: false,
                error: data?.error?.message || 'Failed to send WhatsApp message via Meta Cloud API.',
                details: data?.error
            });
        }

        return res.status(200).json({
            success: true,
            messageId: data?.messages?.[0]?.id,
            to: cleanPhone
        });

    } catch (error) {
        console.error('Unexpected error in whatsapp-verify handler:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        });
    }
}
