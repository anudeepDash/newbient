import { GoogleGenerativeAI } from "@google/generative-ai";

// ═══════════════════════════════════════════════════════════════════════════
// NEWBI AI BACKEND PROXY v1.0
// Hides API keys from the client and handles multi-path orchestration
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
const PERPLEXITY_API_KEY = process.env.VITE_PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export default async function handler(req, res) {
    // Enable CORS
    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Newbi-Secret');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Origin & Secret Enforcement
    if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: 'Access Denied: Origin not allowed' });
    }

    const secret = req.headers['x-newbi-secret'];
    if (secret !== 'nb-sec-9921-xp') {
        return res.status(401).json({ error: 'Unauthorized: Invalid neural pulse secret' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { systemPrompt, userPrompt, type } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ error: 'User prompt is required' });
    }

    console.log(`[AI PROXY] Starting neural pulse for type: ${type}`);

    try {
        // 1. TRY GEMINI (SDK)
        if (genAI) {
            try {
                console.log('[AI PROXY] Path: Gemini SDK');
                const model = genAI.getGenerativeModel({ 
                    model: "gemini-1.5-flash",
                    generationConfig: { responseMimeType: "application/json" }
                });
                
                const result = await model.generateContent([
                    { text: systemPrompt + "\n\nReturn valid JSON." },
                    { text: userPrompt }
                ]);
                
                const text = result.response.text();
                if (text && text.length > 20) {
                    return res.status(200).json({ content: text, provider: 'gemini' });
                }
            } catch (e) {
                console.error('[AI PROXY] Gemini path failed:', e.message);
            }
        }

        // 2. TRY OPENROUTER (FETCH)
        if (OPENROUTER_API_KEY) {
            try {
                console.log('[AI PROXY] Path: OpenRouter');
                const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'https://newbi.ent', 
                        'X-Title': 'Newbi Entertainment Proxy'
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.0-flash-001",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        response_format: { type: "json_object" }
                    })
                });

                if (orRes.ok) {
                    const data = await orRes.json();
                    return res.status(200).json({ 
                        content: data.choices[0].message.content, 
                        provider: 'openrouter' 
                    });
                }
            } catch (e) {
                console.error('[AI PROXY] OpenRouter path failed:', e.message);
            }
        }

        // 3. TRY PERPLEXITY
        if (PERPLEXITY_API_KEY) {
            try {
                console.log('[AI PROXY] Path: Perplexity');
                const pRes = await fetch('https://api.perplexity.ai/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "llama-3.1-sonar-large-128k-online",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ]
                    })
                });

                if (pRes.ok) {
                    const data = await pRes.json();
                    return res.status(200).json({ 
                        content: data.choices[0].message.content, 
                        provider: 'perplexity' 
                    });
                }
            } catch (e) {
                console.error('[AI PROXY] Perplexity path failed:', e.message);
            }
        }

        // 4. TRY AIRFORCE (FREE PROXY)
        try {
            console.log('[AI PROXY] Path: Airforce');
            const models = ['gpt-4o-mini', 'llama-3.3-70b-versatile'];
            for (const model of models) {
                const afRes = await fetch('https://api.airforce/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: systemPrompt + '\n\nReturn ONLY JSON.' },
                            { role: 'user', content: userPrompt }
                        ]
                    })
                });
                if (afRes.ok) {
                    const data = await afRes.json();
                    return res.status(200).json({ 
                        content: data.choices[0].message.content, 
                        provider: `airforce-${model}` 
                    });
                }
            }
        } catch (e) {
            console.error('[AI PROXY] Airforce path failed:', e.message);
        }

        // If all paths fail
        res.status(503).json({ error: 'All neural paths failed. Please try again later.' });

    } catch (globalError) {
        console.error('[AI PROXY] Global Collapse:', globalError);
        res.status(500).json({ error: 'Internal Neural Collapse', details: globalError.message });
    }
}
