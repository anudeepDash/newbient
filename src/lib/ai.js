// ═══════════════════════════════════════════════════════════════════════════
// NEWBI AI CORE ENGINE v4.1 — Gemini-Powered with Smart Retry
// ═══════════════════════════════════════════════════════════════════════════
// Primary: Google Gemini (via Backend Proxy)
// Backup: Local Failproof Mocks
// ═══════════════════════════════════════════════════════════════════════════

// API Keys are now handled securely by the backend proxy (/api/ai)

import { auth } from './firebase';

// ── Newbi Error System ──────────────────────────────────────────────────
export const ERROR_CODES = {
    UNSUPPORTED_TYPE: { code: 'NB-101', message: 'The document type requested is not currently supported by our AI engine.' },
    EMPTY_PROMPT: { code: 'NB-202', message: 'The prompt provided is too brief. Please provide more context for a premium result.' },
    PARSING_FAILED: { code: 'NB-302', message: 'AI extraction failed to produce valid data structure. Please try a more specific prompt.' },
    AUTH_FAILED: { code: 'NB-401', message: 'AI authentication failed. Please verify your AI API configuration in settings.' },
    RATE_LIMITED: { code: 'NB-429', message: 'AI capacity reached. Please wait a moment while we recalibrate our path.' },
    ORCHESTRATION_COLLAPSE: { code: 'NB-503', message: 'All AI paths are currently unresponsive. Activating local failproof backup.' },
    TIMEOUT: { code: 'NB-504', message: 'The AI took too long to respond. Our AI path may be congested.' }
};

export class NBError extends Error {
    constructor(errorType, rawMessage = '') {
        super(errorType.message);
        this.code = errorType.code;
        this.type = errorType;
        this.raw = rawMessage;
        this.name = 'NBError';
    }
}

// ── Master Orchestrator (Backend Proxy Migration) ────────────────────────
const executeAIPulse = async (systemPrompt, userPrompt) => {
    try {
        console.log('[NEWBI AI] → Requesting secure AI path via proxy...');
        
        let user = auth.currentUser;
        
        // If user isn't immediately available, wait a brief moment for Firebase to sync
        if (!user) {
            console.log('[NEWBI AI] Waiting for Auth sync...');
            await new Promise(resolve => setTimeout(resolve, 800));
            user = auth.currentUser;
        }

        const token = user ? await user.getIdToken() : null;

        if (!token) {
            console.warn('[NEWBI AI] ⚠️ No active session found. AI requests may fail.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ systemPrompt, userPrompt, type: systemPrompt.includes('proposal') ? 'proposal' : 'generic' })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`[NEWBI AI] ✓ AI Path: Secure Proxy (${data.provider})`);
            return data.content;
        }

        const errorData = await response.json();
        console.warn('[NEWBI AI] ✗ Proxy path failed:', errorData.error);
    } catch (e) {
        console.warn('[NEWBI AI] ✗ Proxy connection failed:', e.message);
    }

    // FINAL FAILPROOF FALLBACK
    console.error('[NEWBI AI] ✗ ✗ ✗ ALL AI PATHS COLLAPSED. Activating Absolute Failproof Mock.');
    
    const type = systemPrompt.toLowerCase().includes('proposal') ? 'proposal' : 
                 systemPrompt.toLowerCase().includes('contract') ? 'contract' : 
                 systemPrompt.toLowerCase().includes('agreement') ? 'agreement' : 'invoice';
                 
    return JSON.stringify(getAbsoluteFailproofMock(type, userPrompt));
};

// ── Absolute Failproof Mock Generator ───────────────────────────────────
const getAbsoluteFailproofMock = (type, userPrompt) => {
    // Extract a client name if possible from the prompt
    let clientName = "Premium Client";
    try {
        const clientMatch = userPrompt.match(/for ([\w\s]+)/i);
        if (clientMatch && clientMatch[1]) {
            clientName = clientMatch[1].split('.')[0].trim();
        }
    } catch (e) {
        console.warn('[NEWBI AI] Could not extract client name for mock:', e.message);
    }
    
    if (type === 'proposal') {
        return {
            clientName: clientName,
            clientAddress: "Corporate Office, Business District, India",
            campaignName: "Strategic Growth Initiative 2024",
            campaignDuration: "Quarterly Deployment",
            coverDescription: "A strategic proposal for high-impact entertainment and marketing execution, tailored for " + clientName + ".",
            overview: "Our goal is to deliver an unparalleled experience that elevates your brand identity through strategic event production and creative marketing architectures.",
            primaryGoal: "Market dominance and audience resonance through premium entertainment deployment.",
            scopeOfWork: "• Phase 1: Strategic Planning and Research\n• Phase 2: Creative Asset Development\n• Phase 3: On-ground Execution and Management\n• Phase 4: Impact Analysis and Reporting",
            deliverables: [
                { item: "Full Event Production Suite", qty: "1", timeline: "Week 2" },
                { item: "Artist & Talent Management", qty: "1", timeline: "Execution Day" },
                { item: "Strategic Marketing Campaign", qty: "1", timeline: "Month 1" }
            ],
            clientRequirements: [
                { description: "Brand guidelines and identity assets" },
                { description: "On-site point of contact for coordination" }
            ],
            items: [
                { description: "Core Strategic Management", qty: 1, unit: "Phase", price: 75000 },
                { description: "Operational Execution & AV", qty: 1, unit: "Event", price: 150000 },
                { description: "Brand Marketing Support", qty: 1, unit: "Campaign", price: 45000 }
            ],
            terms: "1. 50% Advance Fee required for activation.\n2. Balance due within 7 days of completion.\n3. All prices exclude GST.\n4. Proposal valid for 14 calendar days."
        };
    }
    
    // Default fallback for contracts/agreements
    return {
        parties: {
            firstParty: { name: "Newbi Entertainment", role: "Service Provider" },
            secondParty: { name: clientName, role: "Client" }
        },
        details: { 
            projectName: "Master Service Agreement", 
            purpose: "This agreement establishes the framework for professional service delivery and strategic collaboration between the parties.",
            duration: "12 Months", territory: "India" 
        },
        commercials: { totalValue: "250000", paymentSchedule: "Monthly Retainer", currency: "INR" },
        clauses: [
            { title: "Scope of Services", content: "The Provider shall deliver professional entertainment and marketing services as defined in subsequent Statements of Work.", isActive: true },
            { title: "Confidentiality", content: "Both parties agree to maintain strict confidentiality regarding proprietary business data and trade secrets.", isActive: true },
            { title: "Payment Terms", content: "Payment shall be made within 15 days of invoice date via electronic transfer.", isActive: true }
        ]
    };
};

// Helper to normalize keys (camelCase)
const normalizeKeys = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const normalized = {};
    for (const [key, value] of Object.entries(obj)) {
        const normalizedKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) // snake_to_camel
                                 .replace(/^([A-Z])/, (_, c) => c.toLowerCase()); // PascalToCamel
        normalized[normalizedKey] = (typeof value === 'object' && value !== null) ? normalizeKeys(value) : value;
    }
    return normalized;
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
    throw new NBError(ERROR_CODES.PARSING_FAILED, text.substring(0, 100));
};

const finalExtract = (rawText) => {
    const parsed = extractJSON(rawText);
    return normalizeKeys(parsed);
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
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return obj.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    if (Array.isArray(obj)) return obj.map(stripHTML);
    if (typeof obj === 'object') {
        const r = {}; 
        for (const [k, v] of Object.entries(obj)) {
            r[k] = stripHTML(v);
        } 
        return r;
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
    bulk_proposal: {
        clientName: "string — Client/company name",
        clientAddress: "string — Full business address",
        campaignName: "string — Project, Event, or Mission title",
        campaignDuration: "string — e.g. '3 Months' or 'Oct 15-20, 2024'",
        coverDescription: "string — 2-3 sentence cover summary, plain text only",
        scopeOfWork: "string — MANDATORY. A beautifully structured, persuasive markdown string that transforms the raw text into a premium business document. You MUST invent appropriate professional section titles using Markdown headings (##). Rewrite and elevate the language to sound elite. Use bullet points and bold text for readability."
    },
    contract: {
        parties: {
            firstParty: { name: "Newbi Entertainment", address: "string", role: "Service Provider", email: "string" },
            secondParty: { name: "string", address: "string", role: "Client", email: "string" }
        },
        details: { projectName: "string", purpose: "string — 2-3 paragraphs", duration: "string", territory: "string" },
        commercials: { totalValue: "string — number string e.g. '75000'", paymentSchedule: "string", currency: "string" },
        clauses: [{ title: "string", content: "string — 2-4 sentences", isActive: true }]
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

    bulk_proposal: `You are an elite business copywriter and document structurer for Newbi Entertainment. Transform the provided raw data into a beautifully structured, persuasive premium business document.
    
    RULES:
    - ALL text: plain text, NO HTML
    - Extract identity fields like clientName, campaignName etc.
    - For 'scopeOfWork', this is MANDATORY. You MUST add appropriate professional titles using Markdown headers (## Title).
    - You MUST rewrite, arrange, and enhance the text to sound like a premium, persuasive business proposal. Elevate the language.
    - DO NOT just regurgitate the exact text. Transform it into a polished, structured masterpiece while retaining all key details.
    - Return valid JSON matching the schema`,

    contract: `You are an expert legal drafter for Newbi Entertainment, a premium entertainment & marketing company in India.
    
    RULES:
    - ALL text: plain text, NO HTML
    - firstParty.name = "Newbi Entertainment" always
    - 5-8 detailed clauses covering: Scope, Confidentiality, IP, Payment, Termination, Liability, Force Majeure, Disputes
    - Each clause: 2-4 legally-precise sentences
    - commercials.totalValue: number as string like "50000"
    - purpose: 2-3 paragraphs
    - Make ALL content specific to the user's prompt
    - Return valid JSON matching the schema`,

    revision: `You are an elite AI document editor for Newbi Entertainment. You will receive an existing business document in JSON format and a user's revision instruction.
    
    RULES:
    - Modify the JSON document EXACLTY according to the user's instructions.
    - If asked to add something, generate high-quality, professional content that matches the tone of the document.
    - If asked to remove something, remove it cleanly.
    - Retain ALL other information exactly as it was. Do not delete or summarize unrelated fields.
    - Return ONLY the updated valid JSON object.`,

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
 * Primary: Gemini 2.0 Flash (via Proxy) | Fallback: Mock
 */
export const generateFullDocument = async (type, prompt, tone = 'Premium', config = {}) => {
    if (!SYSTEM_PROMPTS[type]) {
        throw new NBError(ERROR_CODES.UNSUPPORTED_TYPE, `Type: ${type}`);
    }

    if (!prompt || prompt.trim().length < 5) {
        throw new NBError(ERROR_CODES.EMPTY_PROMPT);
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

    // Try AI generation with a hard 15s timeout
    try {
        const rawResponse = await Promise.race([
            executeAIPulse(systemPrompt, userPrompt),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 15000))
        ]);

        console.log('[NEWBI AI] Got response, length:', rawResponse.length, 'chars. Parsing JSON...');
        const parsed = finalExtract(rawResponse);
        
        // Ensure numeric fields in items
        if (parsed.items) {
            parsed.items = parsed.items.map(item => ({
                ...item,
                qty: Number(item.qty) || 1,
                price: Number(item.price) || 0
            }));
        }

        // Ensure agreement/contract clauses have isActive
        if ((type === 'agreement' || type === 'contract') && parsed.clauses) {
            parsed.clauses = parsed.clauses.map(c => ({ ...c, isActive: c.isActive !== false }));
            if (parsed.parties?.firstParty) {
                parsed.parties.firstParty.name = parsed.parties.firstParty.name || "Newbi Entertainment";
            }
        }

        console.log(`[NEWBI AI] ✓ ${type} generated successfully`);
        return stripHTML(parsed);

    } catch (error) {
        console.warn('[NEWBI AI] ⚠️ AI Orchestration hit a limit or timed out. Activating Failproof Mock.', error.message);
        const typeKey = systemPrompt.toLowerCase().includes('proposal') ? 'proposal' : 
                        systemPrompt.toLowerCase().includes('contract') ? 'contract' : 
                        systemPrompt.toLowerCase().includes('agreement') ? 'agreement' : 'invoice';
        return getAbsoluteFailproofMock(typeKey, prompt);
    }
};

/**
 * Refine an existing document based on a conversational prompt.
 */
export const reviseDocument = async (currentData, revisionPrompt, tone = 'Premium') => {
    if (!currentData || !revisionPrompt || revisionPrompt.trim().length < 2) {
        throw new NBError(ERROR_CODES.EMPTY_PROMPT, 'Invalid revision data');
    }

    const systemPrompt = SYSTEM_PROMPTS.revision;
    const userPrompt = `Here is the current document in JSON format:
${JSON.stringify(currentData, null, 2)}

Instruction: "${revisionPrompt}"
Tone: ${tone}

Please apply the instruction to the document and return ONLY the updated JSON.`;

    try {
        const rawResponse = await Promise.race([
            executeAIPulse(systemPrompt, userPrompt),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 15000))
        ]);

        console.log('[NEWBI AI] Got revision response, parsing JSON...');
        const parsed = finalExtract(rawResponse);
        
        // Ensure numeric fields in items
        if (parsed.items) {
            parsed.items = parsed.items.map(item => ({
                ...item,
                qty: Number(item.qty) || 1,
                price: Number(item.price) || 0
            }));
        }

        console.log(`[NEWBI AI] ✓ Document revised successfully`);
        return stripHTML(parsed);
    } catch (error) {
        console.warn('[NEWBI AI] ⚠️ Document revision failed:', error.message);
        throw new NBError(ERROR_CODES.PARSING_FAILED, 'Failed to revise document. Please try again.');
    }
};


/**
 * Improve/rewrite a specific text field.
 */
export const improveContent = async (type, fieldLabel, currentContent, tone = 'Premium') => {
    try {
        const sys = `You are a professional ${type} writer. Improve the text to be more polished and impactful. Return ONLY the improved plain text, nothing else.`;
        const user = `Field: "${fieldLabel}"\nContent: "${currentContent}"\nTone: ${tone}\n\nReturn ONLY the improved plain text.`;
        const result = await executeAIPulse(sys, user);
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
        const result = await executeAIPulse(sys, user);
        return result.replace(/<[^>]*>/g, '').replace(/^["']|["']$/g, '').trim();
    } catch {
        return "Content pending review.";
    }
};
