import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { GoogleGenerativeAI } from "@google/generative-ai"

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
                  
                  // Try Gemini SDK
                  if (GEMINI_API_KEY) {
                    try {
                      console.log('[LOCAL AI DEV PROXY] Trying Gemini...');
                      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                      const model = genAI.getGenerativeModel({ 
                        model: "gemini-2.0-flash",
                        generationConfig: { responseMimeType: "application/json" }
                      });
                      const result = await model.generateContent([
                        { text: systemPrompt + "\n\nReturn valid JSON." },
                        { text: userPrompt }
                      ]);
                      const text = result.response.text();
                      if (text && text.length > 20) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ content: text, provider: 'gemini-2.0' }));
                        return;
                      }
                    } catch (e) {
                      console.warn('[LOCAL AI DEV PROXY] Gemini failed:', e.message);
                    }
                  }

                  // Try OpenRouter
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

                  // Try Airforce proxy
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
