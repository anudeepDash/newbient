async function run() {
    const url = 'https://firestore.googleapis.com/v1/projects/newbi-ent-v2/databases/(default)/documents/admins';
    try {
        console.log("Fetching admins from Firestore REST API...");
        const res = await fetch(url);
        if (!res.ok) {
            console.error("HTTP Error:", res.status, res.statusText);
            return;
        }
        const data = await res.json();
        const docs = data.documents || [];
        console.log(`Found ${docs.length} admins:`);
        for (const doc of docs) {
            const name = doc.name.split('/').pop();
            const fields = doc.fields || {};
            const email = fields.email?.stringValue || 'N/A';
            const role = fields.role?.stringValue || 'N/A';
            console.log(`- ID: ${name}, Email: ${email}, Role: ${role}`);
        }
    } catch (e) {
        console.error("Error occurred:", e);
    }
}
run();
