const prompt = `You are a professional proposal generator. Generate a comprehensive business proposal based on the user prompt. Tone: Premium. You MUST return valid JSON matching the schema.\n\nUser Request: "make me a proposal"\n\nSchema to strictly follow:\n{}\n\nOutput only the valid JSON.`;

fetch('https://text.pollinations.ai/openai', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({
        messages: [{role: 'user', content: prompt}], 
        model: 'openai', 
        jsonMode: true
    }) 
})
.then(r => r.json())
.then(r => console.log("CONTENT: ", r.choices[0].message.content))
.catch(console.error);
