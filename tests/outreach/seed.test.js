import { describe, it, expect } from 'vitest';
import { FakeFirestore } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { seedOutreach, CAMPAIGN_ID, PEOPLE } from '../../scripts/outreach-seed-data.mjs';

describe('seed data', () => {
    it('creates 20 applicants through the real handlers, merges the repeat and fills every panel', async () => {
        const db = new FakeFirestore();
        setDbForTests(db);
        const { created } = await seedOutreach(db);
        expect(PEOPLE).toHaveLength(20);
        expect(created).toBe(20);
        const apps = Object.values(db.dump(`campaigns/${CAMPAIGN_ID}/applications`));
        expect(apps).toHaveLength(20);
        expect(apps.find(a => a.instagramHandle === 'riya.sharma')).toMatchObject({ followerCount: 13100, submitCount: 2 });
        expect(apps.every(a => a.phone.startsWith('+1202555'))).toBe(true);
        const byStatus = apps.reduce((m, a) => ({ ...m, [a.status]: (m[a.status] || 0) + 1 }), {});
        expect(byStatus).toEqual({ applied: 14, message_sent: 5, joined: 1 });
        expect(db.store.get(`campaigns/${CAMPAIGN_ID}/private/outreach`).whatsappGroupLink).toContain('chat.whatsapp.com');
    });
});
