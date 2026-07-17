import { GoogleGenAI } from "@google/genai";
import { verifyToken } from './lib/auth.js';

// ═══════════════════════════════════════════════════════════════════════════
// NEWBI AI BACKEND PROXY v2.0
// Self-healing model discovery — never breaks on Gemini deprecations
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
const PERPLEXITY_API_KEY = process.env.VITE_PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY;

if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
    throw new Error('CRITICAL: Missing AI API keys. App refuses to start.');
}

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
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        );

        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            // 400 or 403 = key leaked/revoked/invalid — mark as dead
            if (response.status === 403 || response.status === 400) {
                const isKeyDead = errBody.includes('leaked') || errBody.includes('PERMISSION_DENIED') || errBody.includes('API key') || errBody.includes('API_KEY_INVALID');
                if (isKeyDead) {
                    console.error('[AI PROXY] 🚨 GEMINI API KEY IS DEAD (invalid/leaked/revoked). Skipping ALL Gemini models.');
                    cachedModels = ['__KEY_DEAD__'];
                    modelCacheTimestamp = Date.now();
                    return cachedModels;
                }
            }
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
            const correlationId = Math.random().toString(36).substring(2, 15);
            console.error(`[AI PROXY] Health Check Error [Correlation ID: ${correlationId}]:`, e);
            return res.status(500).json({ status: 'error', error: 'Internal server error', correlationId });
        }
    }

    const decodedToken = await verifyToken(req);
    if (!decodedToken) {
        console.warn('[AI PROXY] 🚨 Auth Failed: Missing or invalid token');
        return res.status(401).json({ error: 'Unauthorized: Valid Firebase ID Token required' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { systemPrompt, userPrompt, type } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ error: 'User prompt is required' });
    }

    try {
        // ═══════════════════════════════════════════════════════════════
        // 1. TRY GEMINI (Modern SDK with Dynamic Model Discovery)
        // ═══════════════════════════════════════════════════════════════
        if (ai) {
            const models = await discoverModels();

            // If key is dead (leaked/revoked), skip Gemini entirely
            if (models.length === 1 && models[0] === '__KEY_DEAD__') {
                console.warn('[AI PROXY] ⚠️ Skipping Gemini: API key is dead (leaked/revoked). Get a new key from https://aistudio.google.com/apikey');
            } else {
                for (const modelName of models) {
                    try {
                        const response = await ai.models.generateContent({
                            model: modelName,
                            contents: userPrompt,
                            config: {
                                systemInstruction: systemPrompt + "\n\nReturn valid JSON.",
                                responseMimeType: "application/json"
                            }
                        });

                        const text = response.text;
                        if (text && text.length > 20) {
                            return res.status(200).json({ content: text, provider: `gemini-${modelName}` });
                        }
                        console.warn(`[AI PROXY] ⚠️ ${modelName} returned empty/short response, trying next...`);
                    } catch (modelError) {
                        const errMsg = modelError.message || '';
                        const status = modelError.status || modelError.httpStatusCode || 0;

                        // KEY-LEVEL ERROR: leaked, revoked, invalid, or permission denied
                        // Immediately break out — no point trying other models with the same dead key
                        if (status === 403 || status === 400 || errMsg.includes('leaked') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('API Key not found')) {
                            console.error(`[AI PROXY] 🚨 API KEY ERROR (${status}): ${errMsg.substring(0, 150)}`);
                            console.error('[AI PROXY] 🚨 Skipping ALL remaining Gemini models — key is dead.');
                            // Cache the dead state so future requests don't waste time
                            cachedModels = ['__KEY_DEAD__'];
                            modelCacheTimestamp = Date.now();
                            break;
                        }
                        
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
                console.warn('[AI PROXY] ⚠️ All Gemini models exhausted, falling through to backup providers...');
            }
        } else {
            console.warn('[AI PROXY] ⚠️ Skipping Gemini: GEMINI_API_KEY is not defined in environment');
        }

        // ═══════════════════════════════════════════════════════════════
        // 2. TRY OPENROUTER (FETCH)
        // ═══════════════════════════════════════════════════════════════
        if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 10) {
            // Try multiple OpenRouter models — best first, with a free fallback
            const orModels = [
                'google/gemini-3.5-flash',
                'google/gemini-3.1-flash-lite',
                'google/gemini-2.5-flash',
                'meta-llama/llama-4-scout:free',
            ];

            for (const orModel of orModels) {
                try {
                    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                            'HTTP-Referer': 'https://newbi.live', 
                            'X-Title': 'Newbi Entertainment'
                        },
                        body: JSON.stringify({
                            model: orModel,
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: userPrompt }
                            ],
                            max_tokens: 4096,
                            response_format: { type: "json_object" }
                        })
                    });

                    if (orRes.ok) {
                        const data = await orRes.json();
                        if (data.choices?.[0]?.message?.content) {
                            return res.status(200).json({ 
                                content: data.choices[0].message.content, 
                                provider: `openrouter-${orModel}` 
                            });
                        }
                    } else {
                        const errText = await orRes.text();
                        console.warn(`[AI PROXY] ⚠️ OpenRouter ${orModel} not OK:`, errText.substring(0, 120));
                        // If it's a credits issue, try the next (cheaper/free) model
                        if (errText.includes('credits') || errText.includes('max_tokens')) continue;
                    }
                } catch (e) {
                    console.error(`[AI PROXY] OpenRouter ${orModel} failed:`, e.message);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // 3. TRY AIRFORCE (FREE PROXY)
        // ═══════════════════════════════════════════════════════════════
        try {
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
        const correlationId = Math.random().toString(36).substring(2, 15);
        console.error(`[AI PROXY] Global Collapse [Correlation ID: ${correlationId}]:`, globalError);
        res.status(500).json({ error: 'Internal server error', correlationId });
    }
}
