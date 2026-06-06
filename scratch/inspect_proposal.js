

async function run() {
    const url = 'https://firestore.googleapis.com/v1/projects/newbi-ent-v2/databases/(default)/documents/proposals/kCO4izjxpNZggC62Nm5N';
    try {
        console.log("Fetching proposal kCO4izjxpNZggC62Nm5N from Firestore REST API...");
        const res = await fetch(url);
        if (!res.ok) {
            console.error("HTTP Error:", res.status, res.statusText);
            const text = await res.text();
            console.error("Response:", text);
            return;
        }
        const data = await res.json();
        const fields = data.fields || {};
        console.log("\nDocument Fields & Sizes (in stringified characters):");
        console.log("=================================================");
        let totalSize = 0;
        for (const [key, value] of Object.entries(fields)) {
            const strVal = JSON.stringify(value);
            console.log(`- ${key}: ${strVal.length} chars (Type: ${Object.keys(value)[0]})`);
            totalSize += strVal.length;
            if (strVal.length > 500) {
                console.log(`  [Preview of ${key}]: ${strVal.substring(0, 300)}...`);
            }
        }
        console.log("=================================================");
        console.log(`Total stringified size of fields: ${totalSize} chars`);
    } catch (e) {
        console.error("Error occurred:", e);
    }
}

run();
