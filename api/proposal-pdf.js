export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url, filename = 'Proposal.pdf', download } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing document url parameter' });
    }

    try {
        // Validate URL domain to prevent SSRF
        const parsedUrl = new URL(url);
        const allowedHosts = ['res.cloudinary.com', 'firebasestorage.googleapis.com', 'storage.googleapis.com'];
        const isAllowed = allowedHosts.some(h => parsedUrl.hostname.endsWith(h));
        
        if (!isAllowed) {
            return res.status(403).json({ error: 'Untrusted document source host' });
        }

        const upstreamResponse = await fetch(url);
        if (!upstreamResponse.ok) {
            return res.status(upstreamResponse.status).json({ 
                error: `Upstream storage returned ${upstreamResponse.status}` 
            });
        }

        const arrayBuffer = await upstreamResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const dispositionType = download === '1' || download === 'true' ? 'attachment' : 'inline';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeFilename}"`);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');

        return res.send(buffer);
    } catch (err) {
        console.error('[PROPOSAL-PDF] Proxy stream error:', err);
        return res.status(500).json({ error: 'Failed to stream proposal document' });
    }
}
