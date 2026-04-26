import { GoogleGenerativeAI } from "@google/generative-ai";

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extracts and parses JSON from AI text response.
 */
const parseAiJson = (text) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        // Match either an object { ... } or an array [ ... ]
        const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (innerError) {
                throw new Error("AI returned malformed data. Please try again.");
            }
        }
        throw new Error("AI failed to generate a structured response.");
    }
};

const handleAiError = (error) => {
    console.error("AI Service Error:", error);
    const msg = error.message || "";

    // Extract HTTP status code from error message
    const statusMatch = msg.match(/\[(\d{3})\s?\]/);
    const status = statusMatch ? parseInt(statusMatch[1]) : error.status;

    const errors = {
        400: { code: 'NB-400', title: 'Bad Request', message: 'The AI request was malformed. Try simplifying your prompt.' },
        401: { code: 'NB-401', title: 'Unauthorized', message: 'Your API key is missing or invalid. Check AI Settings.' },
        403: { code: 'NB-403', title: 'Access Denied', message: 'Your API key does not have permission. Verify it in Google AI Studio.' },
        404: { code: 'NB-404', title: 'Model Not Found', message: 'The selected AI model is unavailable. Try switching models in Settings.' },
        429: { code: 'NB-429', title: 'Rate Limited', message: 'Too many requests. Please wait 60 seconds and retry.' },
        500: { code: 'NB-500', title: 'Server Error', message: 'Google AI servers encountered an issue. Try again shortly.' },
        503: { code: 'NB-503', title: 'Model Overloaded', message: 'The AI model is under high demand. Retry in a few moments.' },
    };

    // Check for specific known messages
    if (msg.includes('API Key required')) {
        throw new Error(JSON.stringify({ code: 'NB-001', title: 'Key Missing', message: 'No API key configured. Add one in AI Settings.' }));
    }
    if (msg.includes('malformed') || msg.includes('failed to generate')) {
        throw new Error(JSON.stringify({ code: 'NB-002', title: 'Parse Error', message: 'AI returned unreadable data. Try regenerating.' }));
    }

    const mapped = errors[status];
    if (mapped) {
        throw new Error(JSON.stringify(mapped));
    }

    // Fallback for unmapped errors
    throw new Error(JSON.stringify({ code: 'NB-999', title: 'Unknown Error', message: 'Something went wrong with AI generation. Please retry.' }));
};

const withRetry = async (fn, maxRetries = 2) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if ((error.message?.includes('429') || error.status === 429) && i < maxRetries - 1) {
                await wait(2000);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
};

// =====================================================
// PROPOSAL FUNCTIONS (existing)
// =====================================================

export const generateProposalContent = async (apiKey, prompt, context = {}, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const fullPrompt = `SYSTEM INSTRUCTION: You are an expert marketing planner for Newbi. 
    CONTEXT: ${JSON.stringify(context)}
    TASK: Generate a campaign proposal based on this brief: ${prompt}
    FORMAT: Return ONLY a valid JSON object. No other text.`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return parseAiJson(response.text());
        });
    } catch (error) {
        return handleAiError(error);
    }
};

export const generateFieldRefinement = async (apiKey, fieldName, fieldLabel, currentContent, userPrompt, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const fullPrompt = `SYSTEM INSTRUCTION: Refine the "${fieldLabel}" section of a Newbi proposal.
    CURRENT CONTENT: "${currentContent}"
    INSTRUCTION: "${userPrompt}"
    FORMAT: Return ONLY the refined text as a plain string. No JSON.`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text().trim();
        });
    } catch (error) {
        return handleAiError(error);
    }
};

// =====================================================
// AGREEMENT FUNCTIONS (existing — kept for backwards compat)
// =====================================================

export const generateAgreementContent = async (apiKey, prompt, type, parties, details, commercials, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const fullPrompt = `SYSTEM INSTRUCTION: You are a professional legal drafting assistant for Newbi Entertainment.
    TASK: Generate a set of standard and specific legal clauses for a ${type.toUpperCase()} agreement.
    USER BRIEF: ${prompt}
    PARTIES: ${JSON.stringify(parties)}
    DETAILS: ${JSON.stringify(details)}
    COMMERCIALS: ${JSON.stringify(commercials)}
    
    GUIDELINES:
    1. Generate 6-8 essential clauses (e.g., Scope, Confidentiality, IP, Termination, Payment, Liability).
    2. Use professional yet modern legal language.
    3. Ensure clauses are specific to the ${type} context and the USER BRIEF provided.
    4. Format each clause as an object in a list.
    5. Each ID should be a unique string.

    FORMAT: Return ONLY a valid JSON array of objects: [{ "id": "string", "title": "Clause Title", "content": "Full clause text", "isActive": true, "isCustom": false }]`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return parseAiJson(response.text());
        });
    } catch (error) {
        return handleAiError(error);
    }
};

export const generateClauseAction = async (apiKey, action, clauseContent, context = {}, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const actions = {
        simplify: "Rewrite this clause in plain, non-intimidating English while retaining all legal protections.",
        enhance: "Strengthen this clause to be more legally robust and protective for Newbi / the client.",
        summarize: "Provide a one-sentence plain English summary of this clause.",
        draft: `Convert these user notes into a professional legal clause: "${clauseContent}"`
    };

    const instruction = actions[action] || action;

    const fullPrompt = `SYSTEM INSTRUCTION: You are a legal editor.
    CONTEXT: ${JSON.stringify(context)}
    TASK: ${instruction}
    ORIGINAL CLAUSE: "${clauseContent}"
    FORMAT: Return ONLY the processed text as a plain string.`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text().trim();
        });
    } catch (error) {
        return handleAiError(error);
    }
};

// =====================================================
// CONTRACT VAULT — NEW AI FUNCTIONS
// =====================================================

/**
 * FEATURE 0 — AI Requirement Box
 * Converts a natural language requirement into structured contract data.
 */
export const generateContractFromRequirement = async (apiKey, prompt, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const fullPrompt = `SYSTEM INSTRUCTION: You are an expert legal AI for Newbi Entertainment, an event management and entertainment company based in India.

TASK: Parse the following natural language requirement into a comprehensive structured contract. Extract every detail mentioned and infer reasonable defaults for anything missing.

USER REQUIREMENT: "${prompt}"

EXTRACTION RULES:
1. Detect the contract/agreement template type (e.g., Artist Agreement, Service Agreement, Event Agreement, Influencer Agreement, Vendor Agreement, MOU, NDA, Revenue Share Agreement).
2. Identify Party A (usually Newbi Entertainment) and Party B (the other party).
3. Extract scope of work, deliverables, payment terms, dates, location.
4. Auto-detect risk level: LOW (standard services), MEDIUM (significant payment or dependencies), HIGH (large payments, celebrity, exclusivity, complex terms).
5. Determine which standard clauses are needed based on context.
6. Generate actual clause content for each required clause — not just titles.

RETURN FORMAT: Return ONLY a valid JSON object with this EXACT structure:
{
  "template": "Agreement Type Name",
  "risk": "Low|Medium|High",
  "parties": {
    "firstParty": { "name": "Newbi Entertainment", "address": "Bangalore, India", "role": "Service Provider" },
    "secondParty": { "name": "Extracted Name", "address": "Extracted or TBD", "role": "Client/Artist/Vendor" }
  },
  "details": {
    "projectName": "Descriptive project name",
    "purpose": "2-3 paragraph detailed purpose and scope of engagement",
    "duration": "Duration or date range",
    "territory": "Geographic scope"
  },
  "commercials": {
    "totalValue": "Amount as string",
    "paymentSchedule": "Detailed payment schedule with milestones",
    "currency": "INR",
    "gstIncluded": true
  },
  "suggestedClauses": ["Exclusivity", "Cancellation", "Force Majeure", "IP Rights", "Confidentiality", "Non-compete", "Penalties", "Performance Metrics", "Termination", "Liability", "Indemnification", "Dispute Resolution"],
  "clauses": [
    {
      "id": "unique-id",
      "title": "CLAUSE TITLE",
      "content": "Full professional legal clause text (2-4 paragraphs). Use formal legal language. Reference parties as Provider and Client. Include specific details from the requirement.",
      "strictness": "medium",
      "category": "standard|financial|protection|compliance",
      "isActive": true
    }
  ],
  "missingInputs": ["List of important fields the user should review or fill in"],
  "revenueTerms": null
}

IMPORTANT:
- Generate 8-12 comprehensive clauses with FULL legal text.
- Clauses must be specific to the context, not generic boilerplate.
- If revenue sharing is mentioned, populate revenueTerms: { "percentage": "X%", "source": "description", "trigger": "condition", "minimumGuarantee": "amount", "cap": "amount or Uncapped" }
- Always include Termination, Liability, and Dispute Resolution clauses.
- Use Indian legal context (Indian Contract Act, Arbitration governed by Indian law).`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return parseAiJson(response.text());
        });
    } catch (error) {
        return handleAiError(error);
    }
};

/**
 * FEATURE 2 — AI Negotiation Mode
 * Analyzes requested changes against an existing contract and provides response options.
 */
export const negotiateContract = async (apiKey, existingContract, requestedChanges, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const fullPrompt = `SYSTEM INSTRUCTION: You are a contract negotiation AI for Newbi Entertainment. You protect the company's interests while maintaining a professional and fair negotiation tone.

EXISTING CONTRACT SUMMARY:
${JSON.stringify({
    type: existingContract.type || existingContract.template,
    parties: existingContract.parties,
    details: existingContract.details,
    commercials: existingContract.commercials,
    clauses: (existingContract.clauses || []).map(c => ({ title: c.title, content: c.content?.substring(0, 200) }))
})}

CLIENT'S REQUESTED CHANGES:
"${requestedChanges}"

TASK: Analyze each requested change and provide negotiation guidance.

RETURN FORMAT: Return ONLY a valid JSON object:
{
  "changeSummary": "Brief overview of all requested changes",
  "overallRiskImpact": "Low|Medium|High",
  "riskExplanation": "How these changes affect Newbi's position",
  "changes": [
    {
      "id": "change-1",
      "description": "What the client wants to change",
      "affectedClause": "Which clause this impacts",
      "riskLevel": "Low|Medium|High",
      "options": {
        "accept": {
          "recommendation": false,
          "reasoning": "Why accepting is/isn't advisable",
          "modifiedClause": "The clause text if accepted as-is"
        },
        "modify": {
          "recommendation": true,
          "reasoning": "Why a balanced modification is better",
          "counterClause": "A balanced counter-clause that protects both parties",
          "negotiationTip": "How to present this to the client"
        },
        "reject": {
          "recommendation": false,
          "reasoning": "Why rejection might be necessary",
          "professionalResponse": "Professional language to communicate rejection"
        }
      }
    }
  ],
  "suggestedAdditions": ["Any new clauses that should be added given the negotiation context"]
}`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return parseAiJson(response.text());
        });
    } catch (error) {
        return handleAiError(error);
    }
};

/**
 * FEATURE 3 — Redline Comparison
 * Compares two versions of a contract and generates a diff summary.
 */
export const compareContractVersions = async (apiKey, versionA, versionB, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const fullPrompt = `SYSTEM INSTRUCTION: You are a legal document comparison specialist. Compare two versions of a contract and identify all changes.

VERSION A (Original):
${JSON.stringify(versionA)}

VERSION B (Modified):
${JSON.stringify(versionB)}

TASK: Identify every difference between the two versions. Categorize each change.

RETURN FORMAT: Return ONLY a valid JSON object:
{
  "summary": "Brief overview of the key differences",
  "totalChanges": 0,
  "riskShift": "Unchanged|Increased|Decreased",
  "riskExplanation": "How the changes affect overall risk",
  "changes": [
    {
      "id": "diff-1",
      "type": "addition|deletion|modification",
      "section": "Which section/clause was changed",
      "original": "Original text (null for additions)",
      "modified": "New text (null for deletions)",
      "impact": "Low|Medium|High",
      "explanation": "What this change means practically"
    }
  ],
  "affectedClauses": ["List of clause titles that were modified"],
  "recommendation": "Overall recommendation about accepting these changes"
}`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return parseAiJson(response.text());
        });
    } catch (error) {
        return handleAiError(error);
    }
};

/**
 * FEATURE 4 — Revenue Contract Builder
 * Generates revenue-based contract clauses from parameters.
 */
export const generateRevenueContract = async (apiKey, revenueParams, context = {}, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const fullPrompt = `SYSTEM INSTRUCTION: You are a revenue contract specialist for Newbi Entertainment.

REVENUE PARAMETERS:
${JSON.stringify(revenueParams)}

CONTRACT CONTEXT:
${JSON.stringify(context)}

TASK: Generate comprehensive revenue-sharing contract clauses based on the parameters above.

RETURN FORMAT: Return ONLY a valid JSON object:
{
  "revenueFormula": {
    "title": "Revenue Sharing Formula",
    "content": "Full legal clause text defining the revenue calculation methodology, percentages, deductions, and net revenue definition. Be very specific about what constitutes 'revenue' and what deductions are allowed."
  },
  "auditRights": {
    "title": "Audit & Verification Rights",
    "content": "Full legal clause granting audit rights, frequency, notice period, cost allocation, and remedies for discrepancies."
  },
  "paymentTimeline": {
    "title": "Payment Schedule & Reporting",
    "content": "Full legal clause defining payment frequency, reporting requirements, statement format, payment method, and late payment penalties."
  },
  "disputeHandling": {
    "title": "Revenue Dispute Resolution",
    "content": "Full legal clause for handling revenue calculation disputes, independent auditor appointment, binding resolution, and cost allocation."
  },
  "minimumGuarantee": {
    "title": "Minimum Guarantee",
    "content": "Full legal clause for minimum guaranteed payments, shortfall handling, and recoupment terms. Only include if a minimum guarantee was specified."
  },
  "revenueCap": {
    "title": "Revenue Cap & Ceiling",
    "content": "Full legal clause defining the maximum revenue share payable, excess handling, and renegotiation triggers. Only include if a cap was specified."
  },
  "summary": "Plain English summary of the revenue arrangement"
}`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return parseAiJson(response.text());
        });
    } catch (error) {
        return handleAiError(error);
    }
};

/**
 * FEATURE 7 — Risk Engine
 * Analyzes a contract and auto-detects risk factors.
 */
export const analyzeContractRisk = async (apiKey, contractData, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const fullPrompt = `SYSTEM INSTRUCTION: You are a legal risk assessment AI for Newbi Entertainment.

CONTRACT DATA:
${JSON.stringify({
    type: contractData.type || contractData.template,
    parties: contractData.parties,
    details: contractData.details,
    commercials: contractData.commercials,
    clauses: (contractData.clauses || []).map(c => ({ title: c.title, isActive: c.isActive, strictness: c.strictness })),
    revenueTerms: contractData.revenueTerms
})}

TASK: Perform a comprehensive risk analysis of this contract.

RISK DETECTION RULES:
- High payment (>5 lakh) without advance → HIGH risk
- No termination clause → CRITICAL (flag as error)
- Revenue sharing without audit rights → WARNING
- No force majeure → WARNING
- No confidentiality with sensitive data → MEDIUM risk
- Celebrity/artist involvement → inherently MEDIUM+
- No liability cap → WARNING
- Missing dispute resolution → WARNING
- No IP clause for creative work → HIGH risk

RETURN FORMAT: Return ONLY a valid JSON object:
{
  "riskLevel": "Low|Medium|High|Critical",
  "riskScore": 0,
  "protectionStrength": "Weak|Moderate|Strong|Fortress",
  "keyRisks": [
    {
      "id": "risk-1",
      "title": "Risk Title",
      "severity": "Low|Medium|High|Critical",
      "description": "What the risk is",
      "recommendation": "How to mitigate it",
      "affectedClause": "Which clause relates to this"
    }
  ],
  "missingProtections": [
    {
      "clause": "Missing Clause Name",
      "importance": "Required|Recommended|Optional",
      "reason": "Why this clause is needed"
    }
  ],
  "strengths": ["List of strong protections already in the contract"],
  "overallAssessment": "2-3 sentence summary of the contract's risk profile"
}`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return parseAiJson(response.text());
        });
    } catch (error) {
        return handleAiError(error);
    }
};

/**
 * SMART BEHAVIOR — Clause Suggestions
 * Suggests missing clauses based on contract type and existing clauses.
 */
export const suggestMissingClauses = async (apiKey, contractType, existingClauses, modelName = 'gemini-3.0-flash') => {
    if (!apiKey) throw new Error("API Key required.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

    const fullPrompt = `SYSTEM INSTRUCTION: You are a contract completeness checker.

CONTRACT TYPE: ${contractType}
EXISTING CLAUSES: ${JSON.stringify(existingClauses.map(c => c.title))}

TASK: Identify important clauses that are missing from this contract. Only suggest truly relevant clauses for this specific contract type.

CONTEXT RULES:
- Influencer contracts → Usage Rights, Content Approval, Exclusivity
- Event contracts → Force Majeure, Cancellation, Artist Rider, Venue Terms
- Service contracts → SLA, Warranties, Acceptance Criteria
- NDA → Definition of Confidential Info, Exceptions, Duration
- Revenue share → Audit Rights, Revenue Definition, Minimum Guarantee

RETURN FORMAT: Return ONLY a valid JSON array:
[
  {
    "id": "suggested-1",
    "title": "Clause Title",
    "category": "protection|financial|compliance|standard",
    "importance": "Required|Recommended|Optional",
    "reason": "Why this clause is important for this contract type",
    "defaultContent": "Full professional legal clause text (ready to insert)"
  }
]`;

    try {
        return await withRetry(async () => {
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return parseAiJson(response.text());
        });
    } catch (error) {
        return handleAiError(error);
    }
};
