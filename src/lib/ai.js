// ═══════════════════════════════════════════════════════════════════════════
// NEWBI AI NEURAL ENGINE v4.1 — Gemini-Powered with Smart Retry
// ═══════════════════════════════════════════════════════════════════════════
// Primary: Google Gemini (with 429 retry + model fallback chain)
// Backup: Pollinations AI (free proxy)

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Gemini model fallback chain — if one is rate-limited, try next
const GEMINI_MODELS = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
];

// ── Gemini Call with 429 Retry ──────────────────────────────────────────
const callGemini = async (systemPrompt, userPrompt) => {
    if (!GEMINI_API_KEY) throw new Error('No Gemini API key');

    for (const model of GEMINI_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);

            console.log(`[NEWBI AI] → Gemini ${model}...`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                        responseMimeType: 'application/json'
                    }
                })
            });

            clearTimeout(timeout);

            // Rate-limited: try ONE more time after a short wait, then move on
            if (response.status === 429) {
                console.warn(`[NEWBI AI] ⏳ ${model} rate-limited, retrying in 1.5s...`);
                await new Promise(r => setTimeout(r, 1500));
                
                const retryController = new AbortController();
                const retryTimeout = setTimeout(() => retryController.abort(), 15000);
                const retryRes = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: retryController.signal,
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: systemPrompt }] },
                        contents: [{ parts: [{ text: userPrompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: 'application/json' }
                    })
                });
                clearTimeout(retryTimeout);
                
                if (retryRes.status === 429) {
                    console.warn(`[NEWBI AI] ✗ ${model} still rate-limited, trying next...`);
                    continue; // Next model
                }
                if (!retryRes.ok) continue;
                
                const retryData = await retryRes.json();
                const retryText = retryData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (retryText && retryText.trim().length >= 20) {
                    console.log(`[NEWBI AI] ✓ Gemini ${model} success on retry (${retryText.length} chars)`);
                    return retryText;
                }
                continue;
            }

            if (!response.ok) {
                console.warn(`[NEWBI AI] ✗ ${model} HTTP ${response.status}`);
                continue; // Next model
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text || text.trim().length < 20) {
                console.warn(`[NEWBI AI] ✗ ${model} empty response`);
                continue;
            }

            console.log(`[NEWBI AI] ✓ Gemini ${model} success (${text.length} chars)`);
            return text;
        } catch (error) {
            console.warn(`[NEWBI AI] ✗ ${model}: ${error.name === 'AbortError' ? 'timeout' : error.message}`);
            continue;
        }
    }

    throw new Error('All Gemini models rate-limited or unavailable');
};

// ── Airforce Proxy Fallback ─────────────────────────────────────────────
const callAirforce = async (systemPrompt, userPrompt) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
        console.log('[NEWBI AI] → Airforce fallback...');

        const response = await fetch('https://api.airforce/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt + '\n\nYou MUST respond with ONLY a valid JSON object. No markdown, no explanation, no code fences.' },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 4096,
            })
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;

        if (!text || text.trim().length < 20) throw new Error('Empty response');

        console.log(`[NEWBI AI] ✓ Airforce success (${text.length} chars)`);
        return text;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
};

// ── Pollinations Fallback ───────────────────────────────────────────────
const callPollinations = async (systemPrompt, userPrompt) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
        console.log('[NEWBI AI] → Pollinations fallback...');

        const response = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                model: 'openai',
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: systemPrompt + '\n\nYou MUST respond with ONLY a valid JSON object. No markdown, no explanation, no code fences.' },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 4096,
            })
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;

        if (!text || text.trim().length < 20) throw new Error('Empty response');

        console.log(`[NEWBI AI] ✓ Pollinations success (${text.length} chars)`);
        return text;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
};

// ── Master Orchestrator ─────────────────────────────────────────────────
const executeNeuralPulse = async (systemPrompt, userPrompt) => {
    // Try Gemini first (fast, reliable with proper API key)
    try {
        return await callGemini(systemPrompt, userPrompt);
    } catch (e) {
        console.warn('[NEWBI AI] Gemini chain failed:', e.message);
    }

    // Try Airforce proxy as backup
    try {
        return await callAirforce(systemPrompt, userPrompt);
    } catch (e) {
        console.warn('[NEWBI AI] Airforce proxy failed:', e.message);
    }

    // Try Pollinations as backup
    try {
        return await callPollinations(systemPrompt, userPrompt);
    } catch (e) {
        console.warn('[NEWBI AI] Pollinations failed:', e.message);
    }

    throw new Error('All AI engines failed. Please check your API key and try again.');
};

// ── Robust JSON Extraction (6 strategies) ───────────────────────────────
const extractJSON = (rawText) => {
    const text = rawText.trim();
    
    // Log for debugging
    console.log('[NEWBI AI] Raw response preview:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));

    // Strategy 1: Direct parse
    try { return JSON.parse(text); } catch (e) {
        console.log('[NEWBI AI] Strategy 1 (direct) failed:', e.message?.substring(0, 80));
    }

    // Strategy 2: Code fences (```json ... ```)
    const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenced) {
        try { return JSON.parse(fenced[1].trim()); } catch {}
        // Try fixing newlines in fenced content
        try {
            const fixed = fixNewlinesInJSON(fenced[1].trim());
            return JSON.parse(fixed);
        } catch {}
    }

    // Strategy 3: Extract content between first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = text.substring(firstBrace, lastBrace + 1);
        
        // Try direct parse
        try { return JSON.parse(jsonCandidate); } catch {}
        
        // Try with newline fixes
        try { return JSON.parse(fixNewlinesInJSON(jsonCandidate)); } catch {}
    }

    // Strategy 4: Fix common issues and retry
    const cleaned = text
        .replace(/^[^{]*/, '')            // Remove text before first {
        .replace(/[^}]*$/, '')            // Remove text after last }
        .replace(/,\s*([\]}])/g, '$1')    // Trailing commas
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' '); // Control chars (keep \n \r \t)
    
    try { return JSON.parse(cleaned); } catch {}
    try { return JSON.parse(fixNewlinesInJSON(cleaned)); } catch {}

    // Strategy 5: Line-by-line reconstruction
    try {
        const lines = text.split('\n');
        let jsonStr = '';
        let inJson = false;
        for (const line of lines) {
            if (line.includes('{') && !inJson) inJson = true;
            if (inJson) jsonStr += line + ' ';
            if (line.includes('}') && inJson) {
                // Check if we have balanced braces
                const opens = (jsonStr.match(/{/g) || []).length;
                const closes = (jsonStr.match(/}/g) || []).length;
                if (opens === closes) {
                    try { return JSON.parse(jsonStr.trim()); } catch {}
                    try { return JSON.parse(fixNewlinesInJSON(jsonStr.trim())); } catch {}
                }
            }
        }
    } catch {}

    // Strategy 6: Nuclear option — regex extract all key-value pairs and reconstruct
    try {
        const jsonBlock = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        // Replace actual newlines inside quoted strings with \\n
        const fixed = jsonBlock.replace(/"([^"]*?)"/g, (match) => {
            return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        });
        return JSON.parse(fixed);
    } catch {}

    console.error('[NEWBI AI] All 6 JSON extraction strategies failed. Raw response:', text.substring(0, 500));
    throw new Error('Could not parse AI response. Raw output was: "' + text.substring(0, 100).replace(/\n/g, ' ') + '..."');
};

// Fix literal newlines inside JSON string values
const fixNewlinesInJSON = (str) => {
    let result = '';
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        
        if (escaped) {
            result += char;
            escaped = false;
            continue;
        }
        
        if (char === '\\') {
            result += char;
            escaped = true;
            continue;
        }
        
        if (char === '"') {
            inString = !inString;
            result += char;
            continue;
        }
        
        if (inString) {
            // Replace literal newlines/tabs inside strings with escaped versions
            if (char === '\n') { result += '\\n'; continue; }
            if (char === '\r') { result += '\\r'; continue; }
            if (char === '\t') { result += '\\t'; continue; }
        }
        
        result += char;
    }
    
    return result;
};

// ── HTML Stripper ───────────────────────────────────────────────────────
const stripHTML = (obj) => {
    if (typeof obj === 'string') return obj.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    if (Array.isArray(obj)) return obj.map(stripHTML);
    if (obj && typeof obj === 'object') {
        const r = {}; for (const [k, v] of Object.entries(obj)) r[k] = stripHTML(v); return r;
    }
    return obj;
};

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const SCHEMAS = {
    proposal: {
        clientName: "string — Client/company name",
        clientAddress: "string — Full business address",
        campaignName: "string — Project, Event, or Mission title",
        campaignDuration: "string — e.g. '3 Months' or 'Oct 15-20, 2024'",
        coverDescription: "string — 2-3 sentence cover summary, plain text only",
        overview: "string — Executive summary or strategic vision, plain text only",
        primaryGoal: "string — Primary objective of the project, plain text only",
        scopeOfWork: "string — Scope with bullet points, each on new line starting with •",
        deliverables: [{ item: "string", qty: "string", timeline: "string" }],
        clientRequirements: [{ description: "string" }],
        items: [{ description: "string — Service line item", qty: "number", unit: "string", price: "number — INR price (Estimated Cost)" }],
        terms: "string — Numbered terms on separate lines"
    },
    agreement: {
        parties: {
            firstParty: { name: "Newbi Entertainment", address: "string", role: "Service Provider", email: "string" },
            secondParty: { name: "string", address: "string", role: "Client", email: "string" }
        },
        details: { projectName: "string", purpose: "string — 2-3 paragraphs", duration: "string", territory: "string" },
        commercials: { totalValue: "string — number string e.g. '75000'", paymentSchedule: "string", currency: "string" },
        clauses: [{ title: "string", content: "string — 2-4 sentences", isActive: true }]
    },
    invoice: {
        clientName: "string",
        clientAddress: "string",
        clientGst: "string — GSTIN or 'Unregistered'",
        invoiceDate: "string — YYYY-MM-DD",
        dueDate: "string — YYYY-MM-DD",
        note: "string — Thank-you note",
        items: [{ name: "string", description: "string", qty: "number", price: "number — INR" }]
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

const today = new Date().toISOString().split('T')[0];
const dueDate = new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0];

const SYSTEM_PROMPTS = {
    proposal: `You are an elite proposal writer for Newbi Entertainment, a premium event production, entertainment, and marketing agency in India. Generate polished, client-ready business proposals.

SERVICES WE OFFER:
- Event Production & Management (Sound, Stage, Lighting, AV)
- Artist Logistics (Hospitality, Travel, Backstage)
- Event Consultation & Strategic Planning
- Volunteer Provider & On-ground Staffing
- Digital Marketing & Social Media Campaigns

RULES:
- ALL text: plain text, NO HTML
- Make content specific to the user's request — NO generic placeholders
- scopeOfWork: use "• " bullet points on separate lines
- deliverables: 3-6 items with timelines like "Phase 1", "Day 1", or "Month 1"
- items: 3-5 service line items with realistic INR prices (₹5,000 – ₹10,00,000) — this section is the "Estimated Cost"
- clientRequirements: 2-4 items
- terms: 4-5 numbered items on separate lines, include "Advance Fee" instead of "activation fee"
- Return valid JSON matching the schema`,

    agreement: `You are an expert legal drafter for Newbi Entertainment, a premium entertainment & marketing company in India.

RULES:
- ALL text: plain text, NO HTML
- firstParty.name = "Newbi Entertainment" always
- 5-8 detailed clauses covering: Scope, Confidentiality, IP, Payment, Termination, Liability, Force Majeure, Disputes
- Each clause: 2-4 legally-precise sentences
- commercials.totalValue: number as string like "50000"
- purpose: 2-3 paragraphs
- Make ALL content specific to the user's prompt
- Return valid JSON matching the schema`,

    invoice: `You are a billing specialist for Newbi Entertainment, a premium entertainment & marketing agency in India.

RULES:
- ALL text: plain text, NO HTML
- 2-6 line items with realistic INR prices (₹1,000 – ₹10,00,000)
- invoiceDate: ${today}
- dueDate: ${dueDate}
- clientGst: "Unregistered" if not specified
- Return valid JSON matching the schema`
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a complete document from a natural language prompt.
 * Primary: Gemini 2.0 Flash | Fallback: Pollinations
 */
export const generateFullDocument = async (type, prompt, tone = 'Premium', config = {}) => {
    if (!SYSTEM_PROMPTS[type]) {
        throw new Error(`Unknown document type: ${type}`);
    }

    const systemPrompt = SYSTEM_PROMPTS[type];
    const schema = JSON.stringify(SCHEMAS[type], null, 2);

    const userPrompt = `Generate a ${type} document for this request:

"${prompt}"

Tone: ${tone}
Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

Return ONLY a valid JSON object matching this schema:
${schema}

CRITICAL: Every field must have specific, relevant content based on the request. No placeholders. Arrays must have multiple items. Numbers must be actual numbers.`;

    // Try AI generation — NO silent fallback to mocks
    const rawResponse = await executeNeuralPulse(systemPrompt, userPrompt);
    console.log('[NEWBI AI] Got response, length:', rawResponse.length, 'chars. Parsing JSON...');
    const parsed = extractJSON(rawResponse);

    // Ensure numeric fields in items
    if (parsed.items) {
        parsed.items = parsed.items.map(item => ({
            ...item,
            qty: Number(item.qty) || 1,
            price: Number(item.price) || 0
        }));
    }

    // Ensure agreement clauses have isActive
    if (type === 'agreement' && parsed.clauses) {
        parsed.clauses = parsed.clauses.map(c => ({ ...c, isActive: c.isActive !== false }));
        if (parsed.parties?.firstParty) {
            parsed.parties.firstParty.name = parsed.parties.firstParty.name || "Newbi Entertainment";
        }
    }

    console.log(`[NEWBI AI] ✓ ${type} generated successfully`);
    return stripHTML(parsed);
};

/**
 * Improve/rewrite a specific text field.
 */
export const improveContent = async (type, fieldLabel, currentContent, tone = 'Premium') => {
    try {
        const sys = `You are a professional ${type} writer. Improve the text to be more polished and impactful. Return ONLY the improved plain text, nothing else.`;
        const user = `Field: "${fieldLabel}"\nContent: "${currentContent}"\nTone: ${tone}\n\nReturn ONLY the improved plain text.`;
        const result = await executeNeuralPulse(sys, user);
        return result.replace(/<[^>]*>/g, '').replace(/^["']|["']$/g, '').trim();
    } catch {
        return currentContent;
    }
};

/**
 * Regenerate a single field.
 */
export const regenerateField = async (type, fieldLabel, originalPrompt, fieldContext, tone = 'Premium') => {
    try {
        const sys = `You are a professional ${type} writer. Generate content for a specific field. Return ONLY plain text.`;
        const user = `Goal: "${originalPrompt}"\nField: "${fieldLabel}"\nContext: "${fieldContext}"\nTone: ${tone}\n\nReturn ONLY the text.`;
        const result = await executeNeuralPulse(sys, user);
        return result.replace(/<[^>]*>/g, '').replace(/^["']|["']$/g, '').trim();
    } catch {
        return "Content pending review.";
    }
};
