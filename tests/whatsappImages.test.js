import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { setWhatsAppFetchForTests, headerImageUrl, imageHeaderFor, sendTemplate, campaignImageOf, resetNoHeaderForTests } from '../api/_lib/whatsapp.js';
import { notify } from '../api/_lib/notify.js';

/* Image headers carry the event's or campaign's own picture when WhatsApp can show it, else the Newbi card. */

const CLOUDINARY = 'https://res.cloudinary.com/newbi/image/upload/v1712/events/nh7-poster.png';
const CARD = /\/og\/wa-pass-v\d+\.jpg$/;

let sent;
const headerOf = (m) => m.template.components.find(c => c.type === 'header')?.parameters[0];

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('WHATSAPP_TEMPLATE_GUESTLIST_PENDING', 'guestlist_pending');
    setDbForTests(new FakeFirestore({ 'users/u1': { displayName: 'Riya Sharma', phoneNumber: '+919876500001' } }));
    sent = [];
    setWhatsAppFetchForTests(async (url, init) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
    resetNoHeaderForTests();
});

describe('headerImageUrl', () => {
    it('turns a Cloudinary picture into the 1200×630 JPEG crop', () => {
        expect(headerImageUrl(CLOUDINARY)).toBe('https://res.cloudinary.com/newbi/image/upload/w_1200,h_630,c_fill,f_jpg,q_auto/v1712/events/nh7-poster.jpg');
    });

    it('keeps an https JPEG or PNG as it is', () => {
        expect(headerImageUrl('https://firebasestorage.googleapis.com/v0/b/x/o/events%2Fposter.jpg?alt=media')).toMatch(/poster\.jpg\?alt=media$/);
        expect(headerImageUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    });

    it('refuses what WhatsApp can’t show', () => {
        for (const bad of ['https://cdn.example.com/a.webp', 'https://cdn.example.com/a.gif', 'https://cdn.example.com/a.svg', 'http://cdn.example.com/a.jpg', 'data:image/png;base64,xx', '', null, ['x']]) {
            expect(headerImageUrl(bad)).toBeNull();
        }
    });
});

describe('campaignImageOf', () => {
    it('finds the picture whichever field it was saved in', () => {
        expect(campaignImageOf({ thumbnail: 't.jpg' })).toBe('t.jpg');
        expect(campaignImageOf({ image: 'i.jpg', thumbnail: 't.jpg' })).toBe('i.jpg');
        expect(campaignImageOf(null)).toBeNull();
    });
});

describe('imageHeaderFor', () => {
    it('uses the picture when it can, else the card, and nothing for templates without an image header', () => {
        expect(imageHeaderFor('pass_confirmed', CLOUDINARY).link).toMatch(/f_jpg.*nh7-poster\.jpg$/);
        expect(imageHeaderFor('pass_confirmed', 'https://cdn.example.com/a.webp').link).toMatch(CARD);
        expect(imageHeaderFor('pass_confirmed').link).toMatch(CARD);
        expect(imageHeaderFor('new_sign_in', CLOUDINARY)).toBeNull();
        // Every guestlist and event message has its own card now, not the pass card.
        expect(imageHeaderFor('event_cancelled').link).toMatch(/wa-cancelled-v\d+\.jpg$/);
        expect(imageHeaderFor('campaign_shortlist', CLOUDINARY).link).toMatch(/f_jpg/);
    });
});

describe('sending', () => {
    it('puts the event picture on a guestlist message', async () => {
        await notify('guestlist-pending', 'u1', { eventName: 'NH7 Weekender', date: '2030-12-05', qty: 1, image: CLOUDINARY });
        expect(headerOf(sent[0])).toEqual({ type: 'image', image: { link: expect.stringContaining('f_jpg') } });
    });

    it('falls back to the card for an event without a usable picture', async () => {
        await notify('guestlist-pending', 'u1', { eventName: 'NH7 Weekender', date: '2030-12-05', qty: 1 });
        expect(headerOf(sent[0]).image.link).toMatch(/\/og\/wa-signedup-v\d+\.jpg$/);
    });

    it('keeps a given header (a PDF ticket) over the picture', async () => {
        await sendTemplate({ to: '+919876500001', template: 'pass_confirmed', header: { type: 'document', link: 'https://x/t.pdf', filename: 't.pdf' }, image: CLOUDINARY });
        expect(headerOf(sent[0]).type).toBe('document');
    });

    it('sends without the picture when the approved template has no header', async () => {
        setWhatsAppFetchForTests(async (url, init) => {
            const body = JSON.parse(init.body);
            sent.push(body);
            if (headerOf(body)) {
                return { ok: false, status: 400, json: async () => ({ error: { code: 132012, message: '(#132012) Parameter format does not match format in the created template', error_data: { details: 'header: Template does not contain title component, no parameters allowed' } } }) };
            }
            return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
        });
        const first = await sendTemplate({ to: '+919876500001', template: 'pass_confirmed', bodyParams: ['Riya'] });
        expect(first.ok).toBe(true);
        expect(sent.map(headerOf)).toEqual([expect.objectContaining({ type: 'image' }), undefined]);

        // Remembered: the next pass goes out plain on the first try.
        await sendTemplate({ to: '+919876500001', template: 'pass_confirmed', bodyParams: ['Riya'] });
        expect(sent).toHaveLength(3);
        expect(headerOf(sent[2])).toBeUndefined();
    });

    it('drops the picture whichever error code Meta files the header mismatch under', async () => {
        setWhatsAppFetchForTests(async (url, init) => {
            const body = JSON.parse(init.body);
            sent.push(body);
            if (headerOf(body)) return { ok: false, status: 400, json: async () => ({ error: { code: 100, message: 'Invalid parameter', error_data: { details: 'header: Template does not contain title component, no parameters allowed' } } }) };
            return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.1' }] }) };
        });
        const res = await sendTemplate({ to: '+919876500001', template: 'pass_confirmed', bodyParams: ['Riya'] });
        expect(res.ok).toBe(true);
        expect(sent.map(headerOf)).toEqual([expect.objectContaining({ type: 'image' }), undefined]);
    });

    it('keeps a given header when Meta rejects it', async () => {
        setWhatsAppFetchForTests(async (url, init) => {
            sent.push(JSON.parse(init.body));
            return { ok: false, status: 400, json: async () => ({ error: { code: 132012, error_data: { details: 'header: Template does not contain title component, no parameters allowed' } } }) };
        });
        const res = await sendTemplate({ to: '+919876500001', template: 'campaign_ticket', header: { type: 'document', link: 'https://x/t.pdf' } });
        expect(res.ok).toBe(false);
        expect(sent).toHaveLength(1);
    });
});
