import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../api/_lib/whatsapp.js';
import { handleEvent } from '../api/_lib/mail/events.js';

/*
 * Announcing a campaign (Campaigns → go live / "Tell matching creators") emails and pushes everyone in its
 * city, with no follower or niche check. On 4 Nov 2026 it also queued ~850 WhatsApps for a campaign open to
 * "Any" city. It must never queue WhatsApp: that goes only from Outreach → Campaign open, to people the team picks.
 */
let db;
let sent;
beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_INVITE', 'campaign_invite');
    vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_LIVE_BRIEF', 'campaign_live_brief');
    db = new FakeFirestore({
        'campaigns/c1': { title: 'Sneaker Fest', status: 'Open', targetCity: 'Any' },
        'creators/cr1': { displayName: 'Meera', city: 'Lucknow', phone: '+919876500011', isPhoneVerified: true },
        'creators/cr2': { displayName: 'Dev', city: 'Delhi', phone: '+919876500012', isPhoneVerified: true },
    });
    setDbForTests(db);
    sent = [];
    setWhatsAppFetchForTests(async (url, init) => { sent.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.1' }] }) }; });
});
afterEach(() => { vi.unstubAllEnvs(); setDbForTests(null); setWhatsAppFetchForTests(null); });

describe('announcing a campaign', () => {
    it('queues no WhatsApp, even to everyone with verified numbers in an “Any” city campaign', async () => {
        const out = await handleEvent('campaign-invite', { campaignId: 'c1' }, { staff: true, email: 'ops@newbi.live' });
        expect(out.status).toBe(200);
        expect(out.body.whatsapp).toBe(0);
        const jobs = [...db.store.keys()].filter(k => k.startsWith('outreach_queue/'));
        expect(jobs).toEqual([]);
        expect(sent).toEqual([]);
    });
});
