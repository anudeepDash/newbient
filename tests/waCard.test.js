import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waCardFor, waCardUrl, readWaCard, renderWaCard } from '../api/_lib/waCard.js';

let kept;
beforeEach(() => { kept = process.env.LINK_SIGNING_SECRET; process.env.LINK_SIGNING_SECRET = 'test-secret'; });
afterEach(() => { if (kept === undefined) delete process.env.LINK_SIGNING_SECRET; else process.env.LINK_SIGNING_SECRET = kept; });

const parts = (url) => Object.fromEntries(new URL(url).searchParams);

describe('WhatsApp cards drawn per message', () => {
    it('show the event or campaign, never the person’s name', () => {
        expect(waCardFor('pass_confirmed', ['Riya', 'Sunburn Arena', 'Sat, 14 Nov', 'NB7K2Q'])).toEqual({ k: 'pass_confirmed', v: ['Sunburn Arena', 'Sat, 14 Nov'] });
        expect(waCardFor('campaign_payout_sent', ['Riya', '1,500', 'NH7 Hype', 'REF1'])).toEqual({ k: 'campaign_payout_sent', v: ['1,500', 'NH7 Hype'] });
        expect(JSON.stringify(waCardFor('creator_city_group', ['Riya', 'Arijit Live', 'Pune', 'https://chat']))).not.toContain('Riya');
        expect(waCardFor('creator_verification', ['Riya', 'https://x'])).toBeNull();
    });

    it('only draw from signed links', () => {
        const card = waCardFor('campaign_invite', ['Riya', 'NH7 Hype']);
        const { wa, sig } = parts(waCardUrl(card));
        expect(readWaCard(wa, sig)).toEqual(card);
        const forged = Buffer.from(JSON.stringify({ k: 'campaign_invite', v: ['Anything we like'] })).toString('base64url');
        expect(readWaCard(forged, sig)).toBeNull();
        expect(readWaCard(wa, 'x'.repeat(sig.length))).toBeNull();
    });

    it('render a 1200×630 PNG', async () => {
        const png = await renderWaCard(waCardFor('campaign_payout_sent', ['Riya', '1,500', 'NH7 Hype', 'REF1']));
        expect(png.subarray(1, 4).toString()).toBe('PNG');
        expect(png.readUInt32BE(16)).toBe(1200);
        expect(png.readUInt32BE(20)).toBe(630);
    }, 20000);
});
