import { describe, it, expect, beforeEach } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { _internal, MAX_ACCESS_LOGS } from '../api/_lib/sharedDocs.js';

const { actions } = _internal;
const ctx = { caller: null, ip: '203.0.113.7', userAgent: 'Test/1.0', now: '2026-10-19T10:00:00.000Z' };
let db;

const fails = async (p, code) => {
    try { await p; } catch (err) { expect(err.code).toBe(code); return; }
    throw new Error(`expected ${code}`);
};

beforeEach(() => {
    db = new FakeFirestore({
        'invoices/i1': { invoiceNumber: 'NB-1', total: 5000, status: 'Pending' },
        'invoices/paid': { status: 'Paid' },
        'proposals/p1': { status: 'Sent' },
        'proposals/done': { status: 'Accepted' },
        'agreements/a1': { status: 'Final' },
        'agreements/signed': { status: 'Executed' },
        'admins/anurag@newbi.live': { email: 'anurag@newbi.live', role: 'founder', uid: 'u_founder' },
        'admins/editor@ex.com': { email: 'editor@ex.com', role: 'editor', uid: 'u_editor' },
    });
});

describe('view', () => {
    it('adds a log entry with the server time and caps the history', async () => {
        db.collection('proposals').doc('p1').set({ status: 'Sent', accessLogs: Array.from({ length: MAX_ACCESS_LOGS }, (_, i) => ({ n: i })) });
        await actions.view(db, { kind: 'proposal', id: 'p1', via: 'email', screen: '390x844' }, ctx);
        const p = db.dump('proposals').p1;
        expect(p.accessLogs).toHaveLength(MAX_ACCESS_LOGS);
        expect(p.accessLogs.at(-1)).toMatchObject({ ip: ctx.ip, via: 'email', userEmail: 'Guest', timestamp: ctx.now });
        expect(p.lastOpened).toBe(ctx.now);
        expect(p.status).toBe('Sent');
    });

    it('refuses an unknown kind or a missing document', async () => {
        await fails(actions.view(db, { kind: 'spends', id: 's1' }, ctx), 'VALIDATION');
        await fails(actions.view(db, { kind: 'invoice', id: 'nope' }, ctx), 'NOT_FOUND');
    });
});

describe('invoice claims', () => {
    it('records a pending claim and tells finance (not every admin)', async () => {
        const res = await actions.claim(db, { id: 'i1', name: 'Asha', email: 'asha@ex.com', method: 'upi', transactionId: 'UTR1', status: 'approved' }, ctx);
        expect(res.duplicate).toBe(false);
        const inv = db.dump('invoices').i1;
        expect(inv.status).toBe('Verification Pending');
        expect(inv.paymentClaim).toMatchObject({ name: 'Asha', status: 'pending', claimedAt: ctx.now, ip: ctx.ip });
        const notes = Object.values(db.dump('notifications'));
        expect(notes.map(n => n.userId)).toEqual(['u_founder']);
    });

    it('does not claim twice or reopen a paid invoice', async () => {
        await actions.claim(db, { id: 'i1', name: 'Asha', email: 'asha@ex.com' }, ctx);
        const again = await actions['gateway-claim'](db, { id: 'i1', txid: 'X' }, ctx);
        expect(again.duplicate).toBe(true);
        await fails(actions.claim(db, { id: 'paid', name: 'Asha', email: 'asha@ex.com' }, ctx), 'CLOSED');
    });

    it('needs a name and an email', async () => {
        await fails(actions.claim(db, { id: 'i1', name: '', email: 'asha@ex.com' }, ctx), 'VALIDATION');
        await fails(actions.claim(db, { id: 'i1', name: 'Asha', email: 'nope' }, ctx), 'VALIDATION');
    });
});

describe('proposal responses', () => {
    it('accepts with a signature link, server time and IP', async () => {
        await actions.respond(db, { id: 'p1', response: 'Accepted', signedBy: 'Asha', email: 'asha@ex.com', clientSignature: 'https://cdn.example.com/sig.png', signedAt: '1999-01-01' }, ctx);
        const p = db.dump('proposals').p1;
        expect(p.status).toBe('Accepted');
        expect(p.approvalMetadata).toMatchObject({ signedBy: 'Asha', signedAt: ctx.now, ip: ctx.ip, clientSignature: 'https://cdn.example.com/sig.png' });
    });

    it('drops a signature that is not an https link', async () => {
        await actions.respond(db, { id: 'p1', response: 'Accepted', signedBy: 'Asha', email: 'asha@ex.com', clientSignature: 'data:image/png;base64,AAAA' }, ctx);
        expect(db.dump('proposals').p1.clientSignature).toBeNull();
    });

    it('declines, and never answers a closed proposal', async () => {
        await actions.respond(db, { id: 'p1', response: 'Rejected', reason: 'Budget' }, ctx);
        expect(db.dump('proposals').p1).toMatchObject({ status: 'Rejected', rejectionMetadata: { reason: 'Budget' } });
        await fails(actions.respond(db, { id: 'done', response: 'Rejected' }, ctx), 'CLOSED');
        await fails(actions.respond(db, { id: 'p1', response: 'Draft' }, ctx), 'VALIDATION');
    });
});

describe('contract signing', () => {
    it('signs once', async () => {
        await actions.sign(db, { id: 'a1', signedBy: 'Asha', email: 'asha@ex.com' }, ctx);
        expect(db.dump('agreements').a1).toMatchObject({ status: 'Executed', executedAt: ctx.now, approvalMetadata: { signedBy: 'Asha', ip: ctx.ip } });
        await fails(actions.sign(db, { id: 'signed', signedBy: 'Asha', email: 'asha@ex.com' }, ctx), 'CLOSED');
    });
});
