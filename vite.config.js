import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { GoogleGenAI } from "@google/genai"
import { landingPrerender } from './scripts/prerender.mjs'

// ── Dynamic Model Discovery (Local Dev) ─────────────────────────────────
// Mirrors the production api/ai.js logic so local dev never breaks on
// model deprecations either.
// ─────────────────────────────────────────────────────────────────────────

let cachedModels = null;
let modelCacheTimestamp = 0;
const MODEL_CACHE_TTL = 6 * 60 * 60 * 1000;

const FALLBACK_MODEL_LIST = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
    'gemini-2.5-flash',
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
      landingPrerender(),
      {
        // newbi.live landing pages are their own entry (landing.html); in production they are
        // prerendered (scripts/prerender.mjs) and routed by vercel.json.
        name: 'landing-dev-routes',
        configureServer(server) {
          const LANDING = new Set(['/', '/creator', '/community', '/contact', '/terms', '/privacy']);
          server.middlewares.use((req, res, next) => {
            const [pathname] = (req.url || '').split('?');
            const clean = pathname.replace(/\/+$/, '') || '/';
            if (req.method === 'GET' && LANDING.has(clean) && (req.headers.accept || '').includes('text/html')) {
              req.url = '/landing.html' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
            }
            next();
          });
        }
      },
      {
        // Local dev: the landing feed reads Firestore as an anonymous visitor (no keys needed),
        // and enquiries are validated but never written.
        name: 'api-landing-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url.startsWith('/api/forms')) return next();
            const url = new URL(req.url, 'http://localhost');
            const type = url.searchParams.get('type');
            if (type !== 'public-feed' && type !== 'enquiry') return next();
            res.status = (c) => { res.statusCode = c; return res; };
            res.json = (d) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(d)); return res; };
            try {
              if (type === 'public-feed') {
                const { getPublicFeed } = await import('./api/_lib/publicFeed.js');
                const { firestoreRest } = await import('./scripts/dev/firestoreRest.mjs');
                const projectId = env.VITE_FIREBASE_PROJECT_ID || 'newbi-ent-v2';
                const feed = await getPublicFeed(firestoreRest(projectId), { maintenanceDoc: 'maintenance_local' });
                return res.status(200).json({ success: true, ...feed });
              }
              let body = '';
              req.on('data', (c) => { body += c; });
              req.on('end', async () => {
                try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
                req.devDryRun = true;
                const { handleEnquiry } = await import('./api/_lib/enquiry.js');
                await handleEnquiry(null, req, res);
              });
            } catch (err) {
              res.status(500).json({ success: false, error: err.message });
            }
          });
        }
      },
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

                          if (status === 429 || status === 503 || msg.includes('quota') || msg.includes('rate') || msg.includes('high demand') || msg.includes('temporarily unavailable')) {
                            console.warn(`[LOCAL AI DEV PROXY] ⚠️ ${modelName} overloaded/rate-limited (${status}). Trying next...`);
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
                    const orModels = [
                      'google/gemini-2.0-flash-001',
                      'google/gemini-flash-1.5',
                      'meta-llama/llama-3.3-70b-instruct',
                      'openai/gpt-4o-mini',
                      'deepseek/deepseek-chat',
                    ];

                    for (const orModel of orModels) {
                      try {
                        console.log(`[LOCAL AI DEV PROXY] Trying OpenRouter (${orModel})...`);
                        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                            'HTTP-Referer': 'https://newbi.live', 
                            'X-Title': 'Newbi Entertainment Proxy'
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
                          const content = data.choices?.[0]?.message?.content;
                          if (content) {
                            res.statusCode = 200;
                            res.end(JSON.stringify({ content, provider: `openrouter-${orModel}` }));
                            return;
                          }
                        } else {
                          const err = await orRes.text();
                          console.warn(`[LOCAL AI DEV PROXY] OpenRouter ${orModel} failed:`, err.substring(0, 100));
                        }
                      } catch (e) {
                        console.warn(`[LOCAL AI DEV PROXY] OpenRouter ${orModel} failed:`, e.message);
                      }
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
                      if (data.choices?.[0]?.message?.content) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ content: data.choices[0].message.content, provider: 'airforce' }));
                        return;
                      }
                    }
                  } catch (e) {
                    console.warn('[LOCAL AI DEV PROXY] Airforce failed:', e.message);
                  }

                  // ── Try Pollinations proxy ──
                  try {
                    console.log('[LOCAL AI DEV PROXY] Trying Pollinations...');
                    const pollRes = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        messages: [
                          { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Return ONLY valid JSON matching the schema.' },
                          { role: 'user', content: userPrompt }
                        ],
                        model: 'openai',
                        jsonMode: true
                      })
                    });
                    if (pollRes.ok) {
                      const pollData = await pollRes.json();
                      const content = pollData.choices?.[0]?.message?.content;
                      if (content && content.length > 20) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ content, provider: 'pollinations' }));
                        return;
                      }
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
      },
      {
        name: 'api-sync-users-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url.startsWith('/api/sync-users')) {
              try {
                Object.assign(process.env, env);
                const { default: handler } = await import('./api/sync-users.js');
                await handler(req, res);
              } catch (err) {
                console.error('[LOCAL SYNC DEV PROXY] Error executing sync-users:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal local sync error' }));
              }
            } else {
              next();
            }
          });
        }
      },
      {
        name: 'api-get-members-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url.startsWith('/api/get-members')) {
              try {
                Object.assign(process.env, env);
                const { default: handler } = await import('./api/get-members.js');
                await handler(req, res);
              } catch (err) {
                console.error('[LOCAL GET-MEMBERS DEV PROXY] Error executing get-members:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal local get-members error' }));
              }
            } else {
              next();
            }
          });
        }
      },
      {
        name: 'api-creator-join-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url.startsWith('/api/creator-join')) {
              try {
                Object.assign(process.env, env);
                const { default: handler } = await import('./api/creator-join.js');
                if (!req.query) {
                  try {
                    const parsedUrl = new URL(req.url, 'http://localhost');
                    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
                  } catch (e) {
                    req.query = {};
                  }
                }
                if (!res.status) res.status = (c) => { res.statusCode = c; return res; };
                if (!res.json) res.json = (d) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(d)); return res; };
                if (req.method === 'POST' && !req.body) {
                  let body = '';
                  req.on('data', chunk => { body += chunk; });
                  req.on('end', async () => {
                    try {
                      req.body = body ? JSON.parse(body) : {};
                    } catch (e) {
                      req.body = {};
                    }
                    await handler(req, res);
                  });
                } else {
                  await handler(req, res);
                }
              } catch (err) {
                console.error('[LOCAL CREATOR-JOIN DEV PROXY] Error executing creator-join:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal local creator-join error' }));
              }
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
    esbuild: {
      drop: ['console', 'debugger'],
    },
    build: {
      // Read by scripts/prerender.mjs (to preload each landing page's chunk), then deleted.
      manifest: true,
      rollupOptions: {
        input: {
          main: 'index.html',
          landing: 'landing.html',
        },
        output: {
          manualChunks(id) {
            // Vite's own runtime helpers get a chunk of their own; otherwise Rollup can hoist
            // them into a vendor chunk (it put them in vendor-pdf), and every page that lazy-loads
            // anything would download that vendor chunk.
            if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) {
              return 'vite-helpers';
            }
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas') || id.includes('node_modules/jspdf-autotable')) {
              return 'vendor-pdf';
            }
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            // Only React itself and the router: the landing pages share this chunk with the app,
            // so it must not pull in other react-* packages.
            if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
              return 'vendor-react';
            }
            // lucide icons are left to Rollup, so each page only loads the icons it uses
            // (one shared icon chunk made the landing page download every admin icon).
          }
        }
      },
      chunkSizeWarningLimit: 1500
    }

  }
})

