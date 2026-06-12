async function testPollinations() {
    try {
        console.log("Testing Pollinations...");
        const res = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'Say hello!' }
                ],
                model: 'openai',
                jsonMode: false
            })
        });
        console.log("Response status:", res.status);
        const text = await res.text();
        console.log("Response content:", text);
    } catch(e) {
        console.error("Pollinations failed:", e);
    }
}

testPollinations();
