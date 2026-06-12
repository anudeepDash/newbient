import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { GoogleGenAI } from "@google/genai"

// ── Dynamic Model Discovery (Local Dev) ─────────────────────────────────
// Mirrors the production api/ai.js logic so local dev never breaks on
// model deprecations either.
// ─────────────────────────────────────────────────────────────────────────

let cachedModels = null;
let modelCacheTimestamp = 0;
const MODEL_CACHE_TTL = 6 * 60 * 60 * 1000;

const FALLBACK_MODEL_LIST = [
    'gemini-3.5-flash',
    'gemini-3.1-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
];

function parseModelVersion(modelName) {
    const match = modelName.match(/gemini[- ](\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

async function discoverModels(apiKey) {
    const now = Date.now();
    if (cachedModels && (now - modelCacheTimestamp) < MODEL_CACHE_TTL) {
        return cachedModels;
    }
    if (!apiKey) return FALLBACK_MODEL_LIST;

    try {
        console.log('[LOCAL AI DEV PROXY] 🔍 Discovering available Gemini models...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          if (response.status === 403 || response.status === 400) {
              const isKeyDead = errBody.includes('leaked') || errBody.includes('PERMISSION_DENIED') || errBody.includes('API key') || errBody.includes('API_KEY_INVALID');
              if (isKeyDead) {
                  console.error('[LOCAL AI DEV PROXY] 🚨 GEMINI API KEY IS DEAD (invalid/leaked/revoked). Skipping ALL Gemini models.');
                  cachedModels = ['__KEY_DEAD__'];
                  modelCacheTimestamp = Date.now();
                  return cachedModels;
              }
          }
          throw new Error(`Models API returned ${response.status}`);
        }
        const data = await response.json();
        const models = data.models || [];

        const flashModels = models
            .filter(m => {
                const name = m.name?.replace('models/', '') || '';
                const supportsGenerate = m.supportedGenerationMethods?.includes('generateContent');
                const isFlash = name.includes('flash');
                const isStable = !name.includes('exp') && !name.includes('preview');
                return supportsGenerate && isFlash && isStable;
            })
            .map(m => m.name.replace('models/', ''))
            .sort((a, b) => {
                const vA = parseModelVersion(a);
                const vB = parseModelVersion(b);
                if (vB !== vA) return vB - vA;
                return (a.includes('lite') ? 1 : 0) - (b.includes('lite') ? 1 : 0);
            });

        if (flashModels.length > 0) {
            cachedModels = flashModels;
            modelCacheTimestamp = now;
            console.log(`[LOCAL AI DEV PROXY] ✅ Discovered ${flashModels.length} Flash models: [${flashModels.join(', ')}]`);
            return flashModels;
        }
        return FALLBACK_MODEL_LIST;
    } catch (err) {
        console.error('[LOCAL AI DEV PROXY] ❌ Model discovery failed:', err.message);
        return cachedModels || FALLBACK_MODEL_LIST;
    }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const GEMINI_API_KEY = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const OPENROUTER_API_KEY = env.VITE_OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

  return {
    plugins: [
      react(),
      {
        name: 'api-ai-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url.startsWith('/api/ai') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                res.setHeader('Content-Type', 'application/json');
                try {
                  const { systemPrompt, userPrompt, type } = JSON.parse(body);
                  
                  // ── Try Gemini with dynamic model discovery ──
                  if (GEMINI_API_KEY) {
                    const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
                    const models = await discoverModels(GEMINI_API_KEY);

                    if (models.length === 1 && models[0] === '__KEY_DEAD__') {
                      console.warn('[LOCAL AI DEV PROXY] ⚠️ Skipping Gemini: API key is dead (leaked/revoked/invalid).');
                    } else {
                      for (const modelName of models) {
                        try {
                          console.log(`[LOCAL AI DEV PROXY] 🚀 Trying: ${modelName}`);
                          const response = await genAI.models.generateContent({
                            model: modelName,
                            contents: userPrompt,
                            config: {
                              systemInstruction: systemPrompt + "\n\nReturn valid JSON.",
                              responseMimeType: "application/json"
                            }
                          });
                          const text = response.text;
                          if (text && text.length > 20) {
                            console.log(`[LOCAL AI DEV PROXY] ✨ Success: ${modelName}`);
                            res.statusCode = 200;
                            res.end(JSON.stringify({ content: text, provider: `gemini-${modelName}` }));
                            return;
                          }
                        } catch (e) {
                          const msg = e.message || '';
                          const status = e.status || e.httpStatusCode || 0;
                          
                          // KEY-LEVEL ERROR: leaked, revoked, invalid, or permission denied
                          if (status === 403 || status === 400 || msg.includes('leaked') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID') || msg.includes('API Key not found')) {
                            console.error(`[LOCAL AI DEV PROXY] 🚨 API KEY ERROR (${status}): ${msg.substring(0, 150)}`);
                            console.error('[LOCAL AI DEV PROXY] 🚨 Skipping ALL remaining Gemini models — key is dead.');
                            cachedModels = ['__KEY_DEAD__'];
                            modelCacheTimestamp = Date.now();
                            break;
                          }

                          if (status === 404 || msg.includes('not found') || msg.includes('not supported')) {
                            console.warn(`[LOCAL AI DEV PROXY] ⚠️ ${modelName} gone (404), trying next...`);
                            cachedModels = null; // Invalidate cache
                            continue;
                          }
                          console.warn(`[LOCAL AI DEV PROXY] ⚠️ ${modelName} failed:`, msg.substring(0, 100));
                          continue;
                        }
                      }
                      console.warn('[LOCAL AI DEV PROXY] All Gemini models exhausted');
                    }
                  }

                  // ── Try OpenRouter ──
                  if (OPENROUTER_API_KEY) {
                    try {
                      console.log('[LOCAL AI DEV PROXY] Trying OpenRouter...');
                      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                          'HTTP-Referer': 'https://newbi.ent', 
                          'X-Title': 'Newbi Entertainment Proxy'
                        },
                        body: JSON.stringify({
                          model: "google/gemini-2.5-flash",
                          messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                          ],
                          response_format: { type: "json_object" }
                        })
                      });
                      if (orRes.ok) {
                        const data = await orRes.json();
                        const content = data.choices?.[0]?.message?.content;
                        if (content) {
                          res.statusCode = 200;
                          res.end(JSON.stringify({ content, provider: 'openrouter' }));
                          return;
                        }
                      } else {
                        const err = await orRes.text();
                        console.warn('[LOCAL AI DEV PROXY] OpenRouter response failed:', err);
                      }
                    } catch (e) {
                      console.warn('[LOCAL AI DEV PROXY] OpenRouter failed:', e.message);
                    }
                  }

                  // ── Try Airforce proxy ──
                  try {
                    console.log('[LOCAL AI DEV PROXY] Trying Airforce...');
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
                      res.statusCode = 200;
                      res.end(JSON.stringify({ content: data.choices[0].message.content, provider: 'airforce' }));
                      return;
                    }
                  } catch (e) {
                    console.warn('[LOCAL AI DEV PROXY] Airforce failed:', e.message);
                  }

                  // ── Try Pollinations proxy ──
                  try {
                    console.log('[LOCAL AI DEV PROXY] Trying Pollinations...');
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
                      res.statusCode = 200;
                      res.end(JSON.stringify({ content: text, provider: 'pollinations' }));
                      return;
                    }
                  } catch (e) {
                    console.warn('[LOCAL AI DEV PROXY] Pollinations failed:', e.message);
                  }

                  res.statusCode = 503;
                  res.end(JSON.stringify({ error: 'All dev AI paths failed.' }));
                } catch (err) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Internal Dev Proxy Collapse', details: err.message }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    optimizeDeps: {
      include: ['lucide-react'],
    },
    build: {
      rollupOptions: {
        output: {
          // Default chunking is safer for preventing dependency execution order issues
        }
      },
      chunkSizeWarningLimit: 2000
    }
  }
})

