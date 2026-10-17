/*
 * A small in-memory stand-in for the Firestore Admin SDK: enough for the
 * outreach handlers (doc get/set/update, where/orderBy/limit, transactions).
 * Transactions buffer writes and apply them at the end, like the real thing.
 */

let autoId = 0;
const nextId = () => `auto${String(++autoId).padStart(5, '0')}`;
const clone = (v) => (v === undefined ? undefined : structuredClone(v));
// FieldValue.delete() and friends: objects with isEqual(). Only delete is supported.
const isSentinel = (v) => v !== null && typeof v === 'object' && typeof v.isEqual === 'function';
const stripSentinels = (data) => Object.fromEntries(Object.entries(data || {}).filter(([, v]) => !isSentinel(v)));
const deletedKeys = (data) => Object.entries(data || {}).filter(([, v]) => isSentinel(v)).map(([k]) => k);
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
// set(..., { merge: true }) merges nested maps, like Firestore.
const deepMerge = (a, b) => {
    const out = { ...a };
    Object.entries(b).forEach(([k, v]) => { out[k] = isPlain(v) && isPlain(a?.[k]) ? deepMerge(a[k], v) : v; });
    return out;
};
// update() treats "a.b.c" keys as paths, like Firestore.
const applyPaths = (base, data) => {
    const out = structuredClone(base || {});
    Object.entries(data).forEach(([k, v]) => {
        const parts = k.split('.');
        let node = out;
        parts.slice(0, -1).forEach(p => { if (!isPlain(node[p])) node[p] = {}; node = node[p]; });
        if (isSentinel(v)) delete node[parts[parts.length - 1]];
        else node[parts[parts.length - 1]] = clone(v);
    });
    return out;
};

class DocSnap {
    constructor(ref, data) { this.ref = ref; this.id = ref.id; this._data = data; this.exists = data !== undefined; }
    data() { return clone(this._data); }
}

class DocRef {
    constructor(db, path) { this.db = db; this.path = path; this.id = path.split('/').pop(); }
    collection(name) { return new CollectionRef(this.db, `${this.path}/${name}`); }
    async get() { return new DocSnap(this, clone(this.db.store.get(this.path))); }
    async set(data, opts) { this.db._write(this.path, data, opts); }
    async update(data) {
        if (!this.db.store.has(this.path)) throw new Error(`No document to update: ${this.path}`);
        this.db._update(this.path, data);
    }
}

class Query {
    constructor(db, path, filters = [], order = null, max = null) { Object.assign(this, { db, path, filters, order, max }); }
    where(field, op, value) { return new Query(this.db, this.path, [...this.filters, { field, op, value }], this.order, this.max); }
    orderBy(field, dir = 'asc') { return new Query(this.db, this.path, this.filters, { field, dir }, this.max); }
    limit(n) { return new Query(this.db, this.path, this.filters, this.order, n); }
    async get() {
        const prefix = `${this.path}/`;
        let docs = [...this.db.store.entries()]
            .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
            .map(([p, d]) => new DocSnap(new DocRef(this.db, p), clone(d)))
            .filter(s => this.filters.every(({ field, op, value }) => {
                const v = s._data[field];
                if (op === '==') return v === value;
                if (op === 'in') return value.includes(v);
                if (op === 'array-contains') return Array.isArray(v) && v.includes(value);
                if (op === '<=') return v !== undefined && v !== null && v <= value;
                if (op === '<') return v !== undefined && v !== null && v < value;
                if (op === '>=') return v !== undefined && v !== null && v >= value;
                if (op === '>') return v !== undefined && v !== null && v > value;
                throw new Error(`fake firestore: unsupported op ${op}`);
            }));
        if (this.order) {
            const { field, dir } = this.order;
            docs.sort((a, b) => (String(a._data[field]) < String(b._data[field]) ? -1 : 1) * (dir === 'desc' ? -1 : 1));
        }
        if (this.max !== null) docs = docs.slice(0, this.max);
        return { docs, empty: docs.length === 0, size: docs.length };
    }
}

class CollectionRef extends Query {
    constructor(db, path) { super(db, path); this.id = path.split('/').pop(); }
    doc(id) { return new DocRef(this.db, `${this.path}/${id || nextId()}`); }
    async add(data) { const ref = this.doc(); await ref.set(data); return ref; }
}

export class FakeFirestore {
    constructor(seed = {}) {
        this.store = new Map(Object.entries(seed).map(([p, d]) => [p, clone(d)]));
        this.failNextTransaction = false;
    }

    collection(name) { return new CollectionRef(this, name); }

    _write(path, data, opts) {
        const prev = this.store.get(path);
        const next = opts?.merge && prev ? deepMerge(prev, clone(stripSentinels(data))) : clone(stripSentinels(data));
        deletedKeys(data).forEach(k => delete next[k]);
        this.store.set(path, next);
    }

    _update(path, data) {
        this.store.set(path, applyPaths(this.store.get(path), data));
    }

    async runTransaction(fn) {
        const writes = [];
        let wrote = false;
        const tx = {
            get: async (refOrQuery) => {
                if (wrote) throw new Error('Firestore transactions require all reads before writes.');
                return refOrQuery.get();
            },
            set: (ref, data, opts) => { wrote = true; writes.push(() => this._write(ref.path, data, opts)); },
            update: (ref, data) => {
                wrote = true;
                writes.push(() => {
                    if (!this.store.has(ref.path)) throw new Error(`No document to update: ${ref.path}`);
                    this._update(ref.path, data);
                });
            },
        };
        const result = await fn(tx);
        writes.forEach(w => w());
        return result;
    }

    /** Every document under a collection path, as { id: data }. */
    dump(path) {
        const prefix = `${path}/`;
        return Object.fromEntries([...this.store.entries()]
            .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
            .map(([p, d]) => [p.slice(prefix.length), d]));
    }
}

/* A minimal Express-style response that records what the handler sent. */
export const fakeRes = () => {
    const res = { statusCode: 200, body: null, headers: {} };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    res.setHeader = (k, v) => { res.headers[k] = v; };
    return res;
};

export const fakeReq = ({ method = 'POST', body = {}, query = {}, ip = '203.0.113.7' } = {}) => ({
    method, body, query, headers: { 'x-forwarded-for': ip },
});
