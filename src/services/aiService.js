import { GoogleGenerativeAI } from "@google/generative-ai";

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extracts and parses JSON from AI text response.
 */
const parseAiJson = (text) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (innerError) {
                throw new Error("AI returned malformed data. Please try again.");
            }
        }
        throw new Error("AI failed to generate a structured proposal.");
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

export const generateProposalContent = async (apiKey, prompt, context = {}, modelName = 'gemini-2.5-flash') => {
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

export const generateFieldRefinement = async (apiKey, fieldName, fieldLabel, currentContent, userPrompt, modelName = 'gemini-2.5-flash') => {
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
