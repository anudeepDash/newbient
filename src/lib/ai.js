// ═══════════════════════════════════════════════════════════════════════════
// NEWBI AI CORE ENGINE v4.1 — Gemini-Powered with Smart Retry
// ═══════════════════════════════════════════════════════════════════════════
// Primary: Google Gemini (via Backend Proxy)
// Backup: Local Failproof Mocks
// ═══════════════════════════════════════════════════════════════════════════

// API Keys are now handled securely by the backend proxy (/api/ai)

import { auth } from './firebase';
import { useStore } from './store';
import { DEFAULT_V2_PROPOSAL_DATA } from './proposalTemplateV2';

// ── Newbi Error System ──────────────────────────────────────────────────
export const ERROR_CODES = {
    UNSUPPORTED_TYPE: { code: 'NB-101', message: "Whoa, we don't support that document type yet! Try a proposal, contract, or invoice." },
    EMPTY_PROMPT: { code: 'NB-202', message: "Your prompt is too short for us to work with. Give us a bit more detail about what you need!" },
    PARSING_FAILED: { code: 'NB-302', message: "Our AI got a bit confused with the response. Mind trying again with a clearer prompt?" },
    AUTH_FAILED: { code: 'NB-401', message: "Looks like your session expired. Please sign in again to use the AI features." },
    RATE_LIMITED: { code: 'NB-429', message: "Our AI is super busy right now! Give it a moment and try again — we're on it." },
    ORCHESTRATION_COLLAPSE: { code: 'NB-503', message: "All our AI paths are taking a nap. Don't worry, we've activated a backup to keep things moving!" },
    TIMEOUT: { code: 'NB-504', message: "The AI took too long to think. Try a shorter or simpler prompt and we'll get it done faster." }
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
            await new Promise(resolve => setTimeout(resolve, 500));
            user = auth.currentUser;
        }

        const token = user ? await user.getIdToken() : null;

        if (!token) {
            console.warn('[NEWBI AI] ⚠️ No active session found. Attempting AI proxy request.');
        }

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
            
            // Update the live model in the Zustand store
            let displayModel = 'Gemini Flash';
            if (data.provider) {
                if (data.provider.startsWith('gemini-')) {
                    const raw = data.provider.replace('gemini-', '');
                    displayModel = raw.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                } else if (data.provider.startsWith('openrouter')) {
                    displayModel = `OpenRouter (${data.provider.replace('openrouter-', '')})`;
                } else if (data.provider === 'airforce') {
                    displayModel = 'Airforce GPT-4o-Mini';
                } else if (data.provider === 'pollinations') {
                    displayModel = 'Pollinations AI (OpenAI)';
                } else {
                    displayModel = data.provider;
                }
            }
            try {
                useStore.setState({ activeModel: displayModel });
            } catch (e) {
                console.error("Failed to update store with activeModel:", e);
            }

            return data.content;
        }

        const errorData = await response.json().catch(() => ({}));
        console.warn('[NEWBI AI] ✗ Proxy path failed:', errorData.error || response.statusText);
    } catch (e) {
        console.warn('[NEWBI AI] ✗ Proxy connection failed:', e.message);
    }

    // Try keyless direct Pollinations path from client side as a capable fallback
    try {
        console.log('[NEWBI AI] → Requesting keyless direct AI path (Pollinations)...');
        const pollResponse = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Return ONLY a valid JSON object matching the requested schema. No markdown fences, no conversational text.' },
                    { role: 'user', content: userPrompt }
                ],
                model: 'openai',
                jsonMode: true
            })
        });

        if (pollResponse.ok) {
            const data = await pollResponse.json();
            const text = data.choices?.[0]?.message?.content;
            if (text && text.length > 20) {
                console.log('[NEWBI AI] ✨ Success: Keyless Direct AI Path (Pollinations)');
                try {
                    useStore.setState({ activeModel: 'Pollinations AI (OpenAI)' });
                } catch (e) {}
                return text;
            }
        }
        console.warn('[NEWBI AI] ✗ Pollinations direct path response not OK');
    } catch (pe) {
        console.warn('[NEWBI AI] ✗ Pollinations direct path failed:', pe.message);
    }

    // FINAL FAILPROOF DYNAMIC FALLBACK
    console.warn('[NEWBI AI] Activating Dynamic Failproof Generator.');
    try {
        useStore.setState({ activeModel: 'Newbi Intelligent Synthesizer' });
    } catch (e) {}
    
    const docType = systemPrompt.toLowerCase().includes('bulk_proposal') ? 'bulk_proposal' :
                 systemPrompt.toLowerCase().includes('proposal') ? 'proposal' : 
                 systemPrompt.toLowerCase().includes('contract') ? 'contract' : 
                 systemPrompt.toLowerCase().includes('agreement') ? 'agreement' : 
                 systemPrompt.toLowerCase().includes('invoice') ? 'invoice' : 'proposal';
                 
    return JSON.stringify(getAbsoluteFailproofMock(docType, userPrompt));
};

// ── Absolute Failproof Mock Generator (Dynamic & Context-Aware) ───────────
const getAbsoluteFailproofMock = (type, userPrompt) => {
    let clientName = "Premium Client";
    let campaignTitle = "Strategic Brand Experience & Production";
    
    try {
        const clientMatch = userPrompt.match(/for ([\w\s&]+?)(?:\s+in|\s+with|\s+at|\.|\n|$)/i);
        if (clientMatch && clientMatch[1] && clientMatch[1].trim().length > 1) {
            clientName = clientMatch[1].trim();
        }
        const titleMatch = userPrompt.match(/(?:create|generate|proposal for|brief for|plan for)\s+(?:a\s+)?([\w\s&'-]+?)(?:\s+for|\s+in|\.|\n|$)/i);
        if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 3) {
            campaignTitle = titleMatch[1].trim().toUpperCase();
        }
    } catch (e) {
        console.warn('[NEWBI AI] Regex extraction note:', e.message);
    }
    
    if (type === 'proposal' || type === 'bulk_proposal') {
        return {
            ...DEFAULT_V2_PROPOSAL_DATA,
            templateVersion: 'v2',
            clientName: clientName,
            clientAddress: "Corporate Headquarters, Commercial Business District, India",
            campaignName: campaignTitle,
            campaignDuration: "Scheduled Execution 2026–27",
            introParagraph: `NewBi Entertainment & Marketing LLP is pleased to present this comprehensive strategic promotion and execution proposal for ${campaignTitle}, curated exclusively for ${clientName}. Our approach combines targeted community engagement, multi-channel influencer networks, and rigorous on-ground execution.`,
            preparedForText: `This quotation has been prepared exclusively for ${clientName}, in connection with ${campaignTitle}. All figures and scope items are indicative and open to discussion ahead of final sign-off.`,
            executiveParagraphs: [
                `This proposal outlines the strategic marketing and execution plan NewBi will deliver for ${campaignTitle} presented by ${clientName}. NewBi is an entertainment and youth marketing company connecting high-value audience segments with premium cultural and live experiences.`,
                `Through a calibrated combination of fan community engagement, creator marketing, and targeted campus outreach, our primary objective is to maximize brand equity and attendance across all designated target markets.`
            ],
            primaryObjectiveText: `To build a highly engaged audience base and manage end-to-end promotional rollout for ${campaignTitle}, supporting scalable conversions across all target cities.`,
            whyThisApproachText: `Audience demographics respond significantly higher to peer-to-peer amplification and creator-led storytelling than to legacy advertising. By leading with organic communities and layering regional on-ground outreach, the campaign drives active engagement and real ticket conversions.`,
            closingText: `We would welcome the opportunity to walk ${clientName} through this strategic plan in detail and finalize city scope, creator tier mix, and commercial allocations against your project schedule.`
        };
    }

    if (type === 'invoice') {
        return {
            clientName: clientName,
            clientAddress: "Corporate Office, Business District, India",
            clientGst: "Unregistered",
            invoiceDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
            note: "Thank you for your partnership with Newbi Entertainment. Please process payment within 15 days.",
            items: [
                { name: "Professional Services", description: "Strategic Consultation & Operational Production", qty: 1, price: 75000 }
            ]
        };
    }
    
    // Default fallback for contracts/agreements
    return {
        parties: {
            firstParty: { name: "Newbi Entertainment", role: "Service Provider" },
            secondParty: { name: clientName, role: "Client" }
        },
        details: { 
            projectName: campaignTitle, 
            purpose: `This agreement establishes the framework for professional entertainment production and strategic marketing collaboration between Newbi Entertainment and ${clientName}.`,
            duration: "12 Months", territory: "India" 
        },
        commercials: { totalValue: "250000", paymentSchedule: "50% Advance, Balance on Delivery", currency: "INR" },
        clauses: [
            { title: "Scope of Services", content: "The Provider shall deliver professional entertainment, production, and marketing services as defined in the associated Statement of Work.", isActive: true },
            { title: "Confidentiality", content: "Both parties agree to maintain strict confidentiality regarding proprietary business data, commercial terms, and production trade secrets.", isActive: true },
            { title: "Payment Terms", content: "Payments shall be made via electronic wire transfer according to the agreed milestone schedule.", isActive: true },
            { title: "Termination & Cancellation", content: "Either party may terminate this agreement with 14 days written notice subject to settlement of incurred production expenses.", isActive: true }
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
        templateVersion: "string — MUST be 'v2'",
        clientName: "string — Client entity name (e.g. 'ITW Playworks')",
        clientSubtitle: "string — In association with or division (e.g. 'In association with Playworx')",
        clientAddress: "string — Full business address",
        campaignName: "string — Project Specification title (e.g. 'Sonu Nigam Revolution')",
        campaignSubtitle: "string — Project Subtitle (e.g. 'India Tour 2026–27')",
        campaignDuration: "string — Duration (e.g. 'OCT 26 – MAR 27')",
        introParagraph: "string — 2-4 sentences executive introduction on cover page",
        whatsInside: [{ num: "string — '01'", title: "string — Section title" }],
        preparedForText: "string — Formal statement of exclusivity and confidentiality",
        classification: "string — 'Strategic Commercial'",
        strategySub: "string — 'STRATEGIC OUTLINE'",
        strategyTitle: "string — 'Executive Summary'",
        executiveParagraphs: ["string — Paragraph 1", "string — Paragraph 2"],
        primaryObjectiveTitle: "string — 'PRIMARY OBJECTIVE'",
        primaryObjectiveText: "string — Core campaign objective",
        anchorMarketsTitle: "string — 'KEY ANCHOR MARKETS'",
        anchorMarkets: ["string — 6 to 9 target cities/markets"],
        anchorMarketsCaption: "string — Caption explaining the anchor markets",
        whyThisApproachTitle: "string — 'WHY THIS APPROACH'",
        whyThisApproachText: "string — Strategic rationale for audience activation",
        blueprintSub: "string — 'HOW WE\\'LL EXECUTE'",
        blueprintTitle: "string — 'Process & Execution Blueprint'",
        blueprintSteps: [{ number: "string — '01'", title: "string — Step title", bullets: ["string — Action 1", "string — Action 2"] }],
        deliverablesSub: "string — 'SCOPE SUMMARY'",
        deliverablesTitle: "string — 'Per City Deliverables'",
        deliverablesTable: [{ id: "number", deliverable: "string", qty: "string", timeline: "string" }],
        deliverablesIndicativeNote: "string — Note explaining deliverables",
        cityNoteTitle: "string — 'NOTE ON PRIMARY HUB'",
        cityNoteText: "string — Explanatory note on primary hub management",
        commercialsSub: "string — 'COMMERCIALS'",
        commercialsTitle: "string — '04 · Pricing Structure'",
        commercialsSubtitle: "string — Subtitle regarding indicative scaling",
        pricingTable: [{ id: "number", package: "string", scope: "string", price: "string — e.g. '₹1,50,000 / city'" }],
        whatsIncludedTitle: "string — 'WHAT\\'S INCLUDED'",
        whatsIncludedText: "string — Scope inclusions overview",
        paymentScalingTitle: "string — 'PAYMENT & SCALING'",
        paymentScalingText: "string — Payment milestone schedule and terms",
        deepDiveSub: "string — 'CITY DEEP-DIVE · PRIMARY HUB'",
        deepDiveTitle: "string — '05 · Primary Hub Management'",
        deepDiveIntro: "string — Context for primary market",
        deepDiveSubsections: [{ badge: "string — '5.1'", title: "string", bullets: ["string", "string"] }],
        closingSub: "string — 'CLOSING'",
        closingTitle: "string — '06 · Next Steps'",
        closingText: "string — Closing invitation and next steps",
        preparedBy: "string — 'NewBi Entertainment & Marketing LLP'"
    },
    bulk_proposal: {
        templateVersion: "string — MUST be 'v2'",
        clientName: "string — Client entity name",
        clientSubtitle: "string — In association with or division",
        clientAddress: "string — Full business address",
        campaignName: "string — Project Specification title",
        campaignSubtitle: "string — Project Subtitle",
        campaignDuration: "string — Duration",
        introParagraph: "string — Executive introduction on cover page",
        whatsInside: [{ num: "string", title: "string" }],
        preparedForText: "string — Exclusivity and confidentiality text",
        classification: "string — 'Strategic Commercial'",
        strategySub: "string — 'STRATEGIC OUTLINE'",
        strategyTitle: "string — 'Executive Summary'",
        executiveParagraphs: ["string — Paragraph 1", "string — Paragraph 2"],
        primaryObjectiveTitle: "string — 'PRIMARY OBJECTIVE'",
        primaryObjectiveText: "string — Core campaign objective",
        anchorMarketsTitle: "string — 'KEY ANCHOR MARKETS'",
        anchorMarkets: ["string"],
        anchorMarketsCaption: "string",
        whyThisApproachTitle: "string — 'WHY THIS APPROACH'",
        whyThisApproachText: "string",
        blueprintSub: "string — 'HOW WE\\'LL EXECUTE'",
        blueprintTitle: "string — 'Process & Execution Blueprint'",
        blueprintSteps: [{ number: "string", title: "string", bullets: ["string"] }],
        deliverablesSub: "string — 'SCOPE SUMMARY'",
        deliverablesTitle: "string — 'Per City Deliverables'",
        deliverablesTable: [{ id: "number", deliverable: "string", qty: "string", timeline: "string" }],
        deliverablesIndicativeNote: "string",
        cityNoteTitle: "string",
        cityNoteText: "string",
        commercialsSub: "string — 'COMMERCIALS'",
        commercialsTitle: "string — '04 · Pricing Structure'",
        commercialsSubtitle: "string",
        pricingTable: [{ id: "number", package: "string", scope: "string", price: "string" }],
        whatsIncludedTitle: "string — 'WHAT\\'S INCLUDED'",
        whatsIncludedText: "string",
        paymentScalingTitle: "string — 'PAYMENT & SCALING'",
        paymentScalingText: "string",
        deepDiveSub: "string — 'CITY DEEP-DIVE · PRIMARY HUB'",
        deepDiveTitle: "string — '05 · Primary Hub Management'",
        deepDiveIntro: "string",
        deepDiveSubsections: [{ badge: "string", title: "string", bullets: ["string"] }],
        closingSub: "string — 'CLOSING'",
        closingTitle: "string — '06 · Next Steps'",
        closingText: "string",
        preparedBy: "string — 'NewBi Entertainment & Marketing LLP'"
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
    proposal: `You are an elite proposal writer and strategic consultant for Newbi Entertainment, a premier entertainment, youth marketing, and event production agency in India.
Generate an 8-page master executive strategic quotation proposal following the modern Newbi v2 standard.

MUST RETURN JSON MATCHING THE SCHEMA WITH "templateVersion": "v2":
- Page 1 Cover: clientName, clientSubtitle, campaignName, campaignSubtitle, campaignDuration, introParagraph, whatsInside (list of 6 sections), preparedForText, classification ("Strategic Commercial").
- Page 2 Strategy: strategySub ("STRATEGIC OUTLINE"), strategyTitle ("Executive Summary"), executiveParagraphs (2 rich paragraphs), primaryObjectiveTitle ("PRIMARY OBJECTIVE"), primaryObjectiveText, anchorMarketsTitle ("KEY ANCHOR MARKETS"), anchorMarkets (6-9 cities/markets), anchorMarketsCaption, whyThisApproachTitle ("WHY THIS APPROACH"), whyThisApproachText.
- Pages 3 & 4 Blueprint: blueprintSub ("HOW WE'LL EXECUTE"), blueprintTitle ("Process & Execution Blueprint"), blueprintSteps (4 to 5 numbered steps, each with title and 2-3 bullet items).
- Page 5 Scope Deliverables: deliverablesSub ("SCOPE SUMMARY"), deliverablesTitle ("Per City Deliverables"), deliverablesTable (array of deliverables with id, deliverable, qty, timeline), deliverablesIndicativeNote, cityNoteTitle, cityNoteText.
- Page 6 Commercials: commercialsSub ("COMMERCIALS"), commercialsTitle ("04 · Pricing Structure"), commercialsSubtitle, pricingTable (packages with package, scope, price in INR), whatsIncludedTitle ("WHAT'S INCLUDED"), whatsIncludedText, paymentScalingTitle ("PAYMENT & SCALING"), paymentScalingText.
- Page 7 Deep Dive: deepDiveSub ("CITY DEEP-DIVE · PRIMARY HUB"), deepDiveTitle ("05 · Primary Hub Management"), deepDiveIntro, deepDiveSubsections (array of 2-3 subsections with badge like '5.1', title, and bullets).
- Page 8 Closing: closingSub ("CLOSING"), closingTitle ("06 · Next Steps"), closingText, preparedBy ("NewBi Entertainment & Marketing LLP").

Ensure tone is authoritative, corporate, and tailored to the client's industry and scale. Return ONLY valid JSON.`,

    bulk_proposal: `You are an elite proposal architect and document structurer for Newbi Entertainment, India.
The user is providing pre-generated proposal text, a comprehensive brief, raw unformatted draft, meeting notes, or pasted proposal document.
Parse and extract all information into the 8-page master executive strategic quotation proposal following the Newbi v2 standard with "templateVersion": "v2".

Extract/map:
- clientName, clientSubtitle, campaignName, campaignSubtitle, campaignDuration, introParagraph
- whatsInside (6 sections)
- executiveParagraphs, primaryObjectiveText, anchorMarkets, whyThisApproachText
- blueprintSteps (numbered steps with bullets)
- deliverablesTable (deliverable, qty, timeline)
- pricingTable (package, scope, price)
- deepDiveSubsections (sections with badge, title, bullets)
- closingText
Return ONLY valid JSON matching the schema.`,

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
    - Modify the JSON document EXACTLY according to the user's instructions.
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
- 2-6 line items with realistic INR prices (₹1,000 – ₹10,000,000)
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

    // Try AI generation with a generous 35s timeout
    try {
        const rawResponse = await Promise.race([
            executeAIPulse(systemPrompt, userPrompt),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 35000))
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
        // For proposals, preserve markdown formatting (bullets, headers, bold)
        // Only strip actual HTML tags for non-proposal types
        if (type === 'proposal' || type === 'bulk_proposal') {
            return parsed;
        }
        return stripHTML(parsed);

    } catch (error) {
        console.warn('[NEWBI AI] ⚠️ AI Orchestration fallback activated.', error.message);
        return getAbsoluteFailproofMock(type, prompt);
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
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 35000))
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
        // If it looks like a proposal (has deliverables, items, scopeOfWork), preserve markdown
        if (parsed.deliverables || parsed.scopeOfWork) {
            return parsed;
        }
        return stripHTML(parsed);
    } catch (error) {
        console.warn('[NEWBI AI] ⚠️ Document revision network failed. Applying smart local revision.', error.message);
        // Resilient fallback: return modified document with prompt applied where appropriate
        const fallback = { ...currentData };
        if (revisionPrompt.toLowerCase().includes('client') || revisionPrompt.toLowerCase().includes('name')) {
            const match = revisionPrompt.match(/(?:to|name|for)\s+([A-Za-z0-9\s&]+)/i);
            if (match && match[1]) fallback.clientName = match[1].trim();
        }
        return fallback;
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

/**
 * Generate a rich, compelling editorial briefing for the Weekly Newsletter.
 */
export const generateNewsletterBriefing = async (selectedPosts = [], guidancePrompt = '', tone = 'Premium') => {
    try {
        const storiesList = selectedPosts.map((post, index) => 
            `Story #${index + 1}:\nTitle: ${post.title}\nCategory: ${post.category}\nSummary: ${post.shortDescription || post.content?.replace(/<[^>]*>/g, '').substring(0, 150)}`
        ).join('\n\n');

        const sys = `You are the chief editor of Concert Zone, India's premier music, nightlife, and culture publication.
Write a highly engaging, sharp, premium, and intellectual lead editorial briefing note (2-3 paragraphs) for this week's newsletter.
The briefing note should introduce the theme of the newsletter, hook the readers, and weave the following selected stories together seamlessly.

ADDITIONAL CREATIVE DIRECTION OR THEME REQUESTED BY THE ADMIN:
"${guidancePrompt || 'None specified'}"

RULES:
- Tone: ${tone} (editorial, premium, culturally aware, engaging, and authoritative).
- Format: Return ONLY raw HTML containing paragraphs (<p>...</p>) and bold/italic elements (<strong>, <em>) if necessary. Do not include any wrapper div, HTML, body, head, or markdown code blocks (fences).
- Do not output a title or greeting. Start directly with the first paragraph.
- Write naturally like a premium Substack, Puck, or Pitchfork writer. Focus on flow and substance.`;

        const user = `Here are the selected stories for this week's edition:\n\n${storiesList}\n\nWrite the editorial briefing.`;
        const result = await executeAIPulse(sys, user);
        
        // Strip markdown code fences if generated
        let cleanHTML = result.trim();
        if (cleanHTML.startsWith('```')) {
            cleanHTML = cleanHTML.replace(/^```(html|json)?/i, '').replace(/```$/i, '').trim();
        }
        return cleanHTML;
    } catch (error) {
        console.error("AI briefing generation failed:", error);
        return `<p>Welcome to this week's briefing from the Concert Zone ecosystem. We've compiled the premier highlights, stories, and cultural pulse for your curation. Scroll down to read our full selection.</p>`;
    }
};

/**
 * Refine a single specific field based on user instructions.
 */
export const refineFieldContent = async (type, fieldLabel, currentContent, userInstruction, tone = 'Premium') => {
    const sys = `You are a professional ${type} writer. You are refining the field "${fieldLabel}" based on the user's specific instructions. Return ONLY the refined, complete value of the field, with no surrounding quotes, markdown block ticks, explanations or meta-commentary.`;
    const user = `Field: "${fieldLabel}"\nCurrent Content:\n"""\n${currentContent}\n"""\n\nInstruction: "${userInstruction}"\nTone: ${tone}\n\nReturn ONLY the revised field content.`;
    try {
        const result = await executeAIPulse(sys, user);
        return result
            .replace(/^```[a-zA-Z]*\n/, '')
            .replace(/\n```$/, '')
            .replace(/^["']|["']$/g, '')
            .trim();
    } catch (e) {
        console.error('[NEWBI AI] Field refinement failed:', e.message);
        throw e;
    }
};

