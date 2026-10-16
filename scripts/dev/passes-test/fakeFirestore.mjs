// A small in-memory Firestore for offline tests: docs, subcollections, queries
// (==, in, limit, select), collectionGroup, transactions and the
// increment/delete sentinels from firebase-admin.
let autoId = 0;
const newId = () => `auto${String(++autoId).padStart(5, '0')}`;

const isIncrement = (v) => v && typeof v === 'object' && /Increment/i.test(v.constructor?.name || '') ;
const incOperand = (v) => v.operand ?? v._operand ?? v.incrementBy;
const isDelete = (v) => v && typeof v === 'object' && /Delete/i.test(v.constructor?.name || '');
const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

const applyValue = (current, value) => {
    if (isIncrement(value)) return (Number(current) || 0) + Number(incOperand(value));
    return value;
};

const mergeDeep = (target, patch) => {
    const out = isPlain(target) ? { ...target } : {};
    for (const [k, v] of Object.entries(patch)) {
        if (isDelete(v)) { delete out[k]; continue; }
        if (isPlain(v)) out[k] = mergeDeep(out[k], v);
        else out[k] = applyValue(out[k], v);
    }
    return out;
};

const resolveSentinels = (obj, prev = {}) => {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (isDelete(v)) continue;
        if (isPlain(v)) out[k] = resolveSentinels(v, prev?.[k]);
        else out[k] = applyValue(prev?.[k], v);
    }
    return out;
};

const applyUpdate = (data, patch) => {
    const out = clone(data) || {};
    for (const [path, v] of Object.entries(patch)) {
        const parts = path.split('.');
        let node = out;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!isPlain(node[parts[i]])) node[parts[i]] = {};
            node = node[parts[i]];
        }
        const last = parts[parts.length - 1];
        if (isDelete(v)) delete node[last];
        else if (isPlain(v)) node[last] = resolveSentinels(v);
        else node[last] = applyValue(node[last], v);
    }
    return out;
};

class Snap {
    constructor(ref, data) { this.ref = ref; this.id = ref.id; this._data = data; this.exists = data !== undefined; }
    data() { return clone(this._data); }
    get(field) { return field.split('.').reduce((o, k) => o?.[k], this._data); }
}

class DocRef {
    constructor(db, path) { this._db = db; this.path = path; this.id = path.split('/').pop(); }
    get parent() { const parts = this.path.split('/'); return new CollRef(this._db, parts.slice(0, -1).join('/')); }
    collection(name) { return new CollRef(this._db, `${this.path}/${name}`); }
    async get() { return new Snap(this, clone(this._db.store.get(this.path))); }
    async set(data, opts = {}) { this._db._write(this.path, data, opts); }
    async update(patch) {
        if (!this._db.store.has(this.path)) throw Object.assign(new Error(`NOT_FOUND ${this.path}`), { code: 5 });
        this._db.store.set(this.path, applyUpdate(this._db.store.get(this.path), patch));
    }
    async create(data) {
        if (this._db.store.has(this.path)) throw Object.assign(new Error(`ALREADY_EXISTS ${this.path}`), { code: 6 });
        this._db._write(this.path, data, {});
    }
    async delete() { this._db.store.delete(this.path); }
}

class Query {
    constructor(db, base, { group = false, filters = [], lim = null } = {}) { this._db = db; this._base = base; this._group = group; this._filters = filters; this._limit = lim; }
    where(field, op, value) { return new Query(this._db, this._base, { group: this._group, filters: [...this._filters, { field, op, value }], lim: this._limit }); }
    limit(n) { return new Query(this._db, this._base, { group: this._group, filters: this._filters, lim: n }); }
    select() { return this; }
    orderBy() { return this; }
    _docs() {
        const out = [];
        for (const [path, data] of this._db.store) {
            const parts = path.split('/');
            const parent = parts.slice(0, -1).join('/');
            const match = this._group ? parts[parts.length - 2] === this._base : parent === this._base;
            if (!match) continue;
            const ok = this._filters.every(({ field, op, value }) => {
                const v = field.split('.').reduce((o, k) => o?.[k], data);
                if (op === '==') return v === value;
                if (op === 'in') return value.includes(v);
                if (op === 'array-contains') return Array.isArray(v) && v.includes(value);
                throw new Error(`op ${op} not faked`);
            });
            if (ok) out.push(new Snap(new DocRef(this._db, path), clone(data)));
        }
        return this._limit ? out.slice(0, this._limit) : out;
    }
    async get() { const docs = this._docs(); return { docs, empty: docs.length === 0, size: docs.length, forEach: (fn) => docs.forEach(fn) }; }
}

class CollRef extends Query {
    constructor(db, path) { super(db, path); this.path = path; this.id = path.split('/').pop(); }
    doc(id) { return new DocRef(this._db, `${this.path}/${id || newId()}`); }
    async add(data) { const ref = this.doc(); await ref.set(data); return ref; }
}

export class FakeDb {
    constructor() { this.store = new Map(); }
    collection(name) { return new CollRef(this, name); }
    collectionGroup(name) { return new Query(this, name, { group: true }); }
    doc(path) { return new DocRef(this, path); }
    _write(path, data, opts) {
        const prev = this.store.get(path);
        this.store.set(path, opts.merge ? mergeDeep(prev, data) : resolveSentinels(data));
    }
    batch() {
        const ops = [];
        return {
            set: (ref, d, o) => ops.push(() => ref.set(d, o)),
            create: (ref, d) => ops.push(() => ref.create(d)),
            update: (ref, d) => ops.push(() => ref.update(d)),
            delete: (ref) => ops.push(() => ref.delete()),
            commit: async () => { for (const op of ops) await op(); },
        };
    }
    async runTransaction(fn) {
        let wrote = false;
        const queue = [];
        const tx = {
            get: async (refOrQuery) => {
                if (wrote) throw new Error('Firestore transactions require all reads to be executed before all writes.');
                return refOrQuery.get();
            },
            set: (ref, d, o = {}) => { wrote = true; queue.push(() => ref.set(d, o)); return tx; },
            update: (ref, d) => { wrote = true; queue.push(() => ref.update(d)); return tx; },
            delete: (ref) => { wrote = true; queue.push(() => ref.delete()); return tx; },
            create: (ref, d) => { wrote = true; queue.push(() => ref.create(d)); return tx; },
        };
        const result = await fn(tx);
        for (const op of queue) await op();
        return result;
    }
    dump(prefix) { return [...this.store.entries()].filter(([p]) => p.startsWith(prefix)); }
}

export const fakeBucket = () => {
    const files = new Map();
    return {
        files,
        file: (path) => ({
            save: async (buf, opts) => { files.set(path, { buf: Buffer.from(buf), opts }); },
            exists: async () => [files.has(path)],
            download: async () => { if (!files.has(path)) throw new Error('No such object'); return [files.get(path).buf]; },
            getSignedUrl: async ({ expires }) => [`https://storage.example/${encodeURIComponent(path)}?expires=${expires}`],
        }),
    };
};
