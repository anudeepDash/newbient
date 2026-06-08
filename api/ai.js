console.log('[BOOT] 🛰️ AI Proxy Booting...');
import { GoogleGenAI } from "@google/genai";
import { verifyToken } from './lib/auth.js';

// ═══════════════════════════════════════════════════════════════════════════
// NEWBI AI BACKEND PROXY v2.0
// Self-healing model discovery — never breaks on Gemini deprecations
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
const PERPLEXITY_API_KEY = process.env.VITE_PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY;

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// ── Dynamic Model Discovery ────────────────────────────────────────────
// Instead of hardcoding model names that get deprecated, we query Google's
// API to discover which models are currently available.
// ────────────────────────────────────────────────────────────────────────

let cachedModels = null;
let modelCacheTimestamp = 0;
const MODEL_CACHE_TTL = 6 * 60 * 60 * 1000; // Re-discover every 6 hours

// Hardcoded fallback list in case model discovery itself fails.
// Ordered newest → oldest. Even if these go stale, discovery will override them.
const FALLBACK_MODEL_LIST = [
    'gemini-3.5-flash',
    'gemini-3.1-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
];

/**
 * Discover available Gemini Flash models by calling the models.list API.
 * Returns an ordered array of model IDs (best → worst).
 * Results are cached for MODEL_CACHE_TTL.
 */
async function discoverModels() {
    const now = Date.now();
    if (cachedModels && (now - modelCacheTimestamp) < MODEL_CACHE_TTL) {
        return cachedModels;
    }

    if (!GEMINI_API_KEY) {
        console.warn('[AI PROXY] ⚠️ No Gemini API key — skipping model discovery');
        return FALLBACK_MODEL_LIST;
    }

    try {
        console.log('[AI PROXY] 🔍 Discovering available Gemini models...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`Models API returned ${response.status}`);
        }

        const data = await response.json();
        const models = data.models || [];

        // Filter for Flash models that support generateContent
        const flashModels = models
            .filter(m => {
                const name = m.name?.replace('models/', '') || '';
                const supportsGenerate = m.supportedGenerationMethods?.includes('generateContent');
                const isFlash = name.includes('flash');
                // Exclude experimental/preview models for stability
                const isStable = !name.includes('exp') && !name.includes('preview');
                return supportsGenerate && isFlash && isStable;
            })
            .map(m => m.name.replace('models/', ''))
            // Sort by version number descending (highest version first)
            .sort((a, b) => {
                const versionA = parseModelVersion(a);
                const versionB = parseModelVersion(b);
                // Higher version first
                if (versionB !== versionA) return versionB - versionA;
                // Prefer non-lite over lite
                const aIsLite = a.includes('lite') ? 1 : 0;
                const bIsLite = b.includes('lite') ? 1 : 0;
                return aIsLite - bIsLite;
            });

        if (flashModels.length > 0) {
            cachedModels = flashModels;
            modelCacheTimestamp = now;
            console.log(`[AI PROXY] ✅ Discovered ${flashModels.length} Flash models: [${flashModels.join(', ')}]`);
            return flashModels;
        }

        console.warn('[AI PROXY] ⚠️ No Flash models found in API response, using fallback list');
        return FALLBACK_MODEL_LIST;
    } catch (err) {
        console.error('[AI PROXY] ❌ Model discovery failed:', err.message);
        // Use cached models if available (even if expired), otherwise fallback
        return cachedModels || FALLBACK_MODEL_LIST;
    }
}

/** Extract a numeric version from a model name like "gemini-3.5-flash" → 3.5 */
function parseModelVersion(modelName) {
    const match = modelName.match(/gemini[- ](\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

/** Invalidate cache so next request re-discovers models */
function invalidateModelCache() {
    cachedModels = null;
    modelCacheTimestamp = 0;
}

// ── Main Handler ────────────────────────────────────────────────────────

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

    // ── Health Check (GET) ──────────────────────────────────────────────
    if (req.method === 'GET') {
        try {
            const models = await discoverModels();
            return res.status(200).json({
                status: 'ok',
                version: '2.0',
                geminiAvailable: !!ai,
                discoveredModels: models,
                openrouterAvailable: !!(OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 10),
                cacheAge: cachedModels ? Math.round((Date.now() - modelCacheTimestamp) / 1000) + 's' : 'none'
            });
        } catch (e) {
            return res.status(200).json({ status: 'ok', version: '2.0', error: e.message });
        }
    }

    console.log(`[AI PROXY] 🛰️ Neural request from origin: ${origin}`);
    console.log(`[AI PROXY] 🔑 Key Status: Gemini=${!!GEMINI_API_KEY}, OpenRouter=${!!OPENROUTER_API_KEY}, Perplexity=${!!PERPLEXITY_API_KEY}`);

    const decodedToken = await verifyToken(req);
    if (!decodedToken) {
        console.warn('[AI PROXY] 🚨 Auth Failed: Missing or invalid token');
        return res.status(401).json({ error: 'Unauthorized: Valid Firebase ID Token required' });
    }
    console.log(`[AI PROXY] ✅ Auth Success: User=${decodedToken.email || decodedToken.uid}`);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { systemPrompt, userPrompt, type } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ error: 'User prompt is required' });
    }

    console.log(`[AI PROXY] Starting neural pulse for type: ${type}`);

    try {
        // ═══════════════════════════════════════════════════════════════
        // 1. TRY GEMINI (Modern SDK with Dynamic Model Discovery)
        // ═══════════════════════════════════════════════════════════════
        if (ai) {
            const models = await discoverModels();
            let geminiSucceeded = false;

            for (const modelName of models) {
                try {
                    console.log(`[AI PROXY] 🚀 Trying Gemini model: ${modelName}`);
                    const response = await ai.models.generateContent({
                        model: modelName,
                        contents: [
                            { role: 'user', parts: [{ text: systemPrompt + "\n\nReturn valid JSON.\n\n" + userPrompt }] }
                        ],
                        config: {
                            responseMimeType: "application/json"
                        }
                    });

                    const text = response.text;
                    if (text && text.length > 20) {
                        console.log(`[AI PROXY] ✨ Success: Gemini (${modelName})`);
                        return res.status(200).json({ content: text, provider: `gemini-${modelName}` });
                    }
                    console.warn(`[AI PROXY] ⚠️ ${modelName} returned empty/short response, trying next...`);
                } catch (modelError) {
                    const errMsg = modelError.message || '';
                    const status = modelError.status || modelError.httpStatusCode || 0;
                    
                    // If model is not found (404) or deprecated, invalidate cache and try next
                    if (status === 404 || errMsg.includes('not found') || errMsg.includes('not supported')) {
                        console.warn(`[AI PROXY] ⚠️ Model ${modelName} is gone (404). Trying next...`);
                        invalidateModelCache(); // Force re-discovery on next request
                        continue;
                    }
                    
                    // Rate limit / quota — try next model
                    if (status === 429 || errMsg.includes('quota') || errMsg.includes('rate')) {
                        console.warn(`[AI PROXY] ⚠️ ${modelName} rate limited. Trying next...`);
                        continue;
                    }
                    
                    // Other errors — log and try next
                    console.warn(`[AI PROXY] ⚠️ ${modelName} error: ${errMsg.substring(0, 150)}`);
                    continue;
                }
            }

            if (!geminiSucceeded) {
                console.warn('[AI PROXY] ⚠️ All Gemini models exhausted, falling through to backup providers...');
            }
        } else {
            console.warn('[AI PROXY] ⚠️ Skipping Gemini: GEMINI_API_KEY is not defined in environment');
        }

        // ═══════════════════════════════════════════════════════════════
        // 2. TRY OPENROUTER (FETCH)
        // ═══════════════════════════════════════════════════════════════
        if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 10) {
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
                    if (data.choices?.[0]?.message?.content) {
                        console.log('[AI PROXY] ✨ Success: OpenRouter');
                        return res.status(200).json({ 
                            content: data.choices[0].message.content, 
                            provider: 'openrouter' 
                        });
                    }
                } else {
                    const errText = await orRes.text();
                    console.warn('[AI PROXY] ⚠️ OpenRouter response not OK:', errText.substring(0, 100));
                }
            } catch (e) {
                console.error('[AI PROXY] OpenRouter path failed:', e.message);
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // 3. TRY AIRFORCE (FREE PROXY)
        // ═══════════════════════════════════════════════════════════════
        try {
            console.log('[AI PROXY] Path: Airforce');
            const afRes = await fetch('https://api.airforce/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
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
                    provider: `airforce` 
                });
            }
        } catch (e) {
            console.error('[AI PROXY] Airforce path failed:', e.message);
        }

        // ═══════════════════════════════════════════════════════════════
        // 4. TRY POLLINATIONS (FREE KEYLESS PROXY)
        // ═══════════════════════════════════════════════════════════════
        try {
            console.log('[AI PROXY] Path: Pollinations');
            const pollRes = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    model: 'openai',
                    jsonMode: true
                })
            });
            if (pollRes.ok) {
                const text = await pollRes.text();
                return res.status(200).json({ 
                    content: text, 
                    provider: 'pollinations' 
                });
            }
        } catch (e) {
            console.error('[AI PROXY] Pollinations path failed:', e.message);
        }

        // If all paths fail
        res.status(503).json({ error: 'All neural paths failed. Please try again later.' });

    } catch (globalError) {
        console.error('[AI PROXY] Global Collapse:', globalError);
        res.status(500).json({ error: 'Internal Neural Collapse', details: globalError.message });
    }
}
