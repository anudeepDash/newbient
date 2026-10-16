/*
 * Local dev only (used by vite.config.js). A tiny read-only stand-in for the
 * Admin SDK's Firestore, backed by Firestore's public REST API without
 * credentials. It sees exactly what the security rules let anonymous visitors
 * read, so the landing page can be previewed without service-account keys.
 * It never writes.
 */

const decode = (v) => {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('mapValue' in v) return fields(v.mapValue.fields);
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
    return null;
};
const fields = (f = {}) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decode(v)]));

export function firestoreRest(projectId) {
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const getJson = async (url) => {
        const r = await fetch(url);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`Firestore REST ${r.status}`);
        return r.json();
    };
    return {
        collection(name) {
            const list = (n) => ({
                async get() {
                    const j = await getJson(`${base}/${name}?pageSize=${Math.min(n, 300)}`);
                    return { docs: (j?.documents || []).map((d) => ({ id: d.name.split('/').pop(), data: () => fields(d.fields) })) };
                },
            });
            return {
                limit: list,
                get: () => list(300).get(),
                doc(id) {
                    return {
                        async get() {
                            const j = await getJson(`${base}/${name}/${encodeURIComponent(id)}`);
                            return j ? { exists: true, data: () => fields(j.fields) } : { exists: false, data: () => undefined };
                        },
                    };
                },
            };
        },
    };
}
