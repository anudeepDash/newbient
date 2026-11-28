import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { setWhatsAppFetchForTests, resetTemplateBodiesForTests } from '../api/_lib/whatsapp.js';
import { setTransportForTests } from '../api/_lib/mail/transport.js';
import { notify } from '../api/_lib/notify.js';
import { contactIdFor } from '../api/_lib/outreachThreads.js';

const PHONE = '+919876500001';
const BODY = "✅ *You're on the list, {{1}}*\n\n*Event:* {{2}}\n*Date:* {{3}}\n*Name on the list:* {{4}}";
let db;
let sent;
let templateFetches;

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('WHATSAPP_WABA_ID', 'waba1');
    vi.stubEnv('WHATSAPP_TEMPLATE_GUESTLIST_RSVP_CONFIRMED', 'guestlist_rsvp_confirmed');
    vi.stubEnv('WHATSAPP_TEMPLATE_NEW_SIGN_IN', 'new_sign_in');
    db = new FakeFirestore({ 'users/u1': { email: 'riya@example.com', displayName: 'Riya Sharma', phoneNumber: PHONE } });
    setDbForTests(db);
    resetTemplateBodiesForTests();
    sent = [];
    templateFetches = 0;
    setWhatsAppFetchForTests(async (url, init) => {
        if (String(url).includes('/message_templates')) {
            templateFetches += 1;
            return { ok: true, status: 200, json: async () => ({ data: [{ name: 'guestlist_rsvp_confirmed', components: [{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: BODY }] }] }) };
        }
        sent.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
    });
    setTransportForTests({ sendMail: async () => ({ messageId: 'mail-1' }) });
});

afterEach(() => {
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
    setTransportForTests(null);
    resetTemplateBodiesForTests();
});

const threadMessages = () => [...db.store.entries()]
    .filter(([path]) => path.startsWith(`outreach_inbox/${contactIdFor(PHONE)}/inbox_messages/`))
    .map(([, doc]) => doc);

describe('automatic WhatsApp in the Inbox', () => {
    it('puts a guestlist pass message in their chat, as WhatsApp showed it', async () => {
        await notify('campaign-ticket', 'u1', { guestlist: true, eventName: 'Jasmine Sandlas Pune', date: '2026-11-28', qty: 2, campaignId: 'c1' }, { skip: ['email', 'push', 'inApp'] });
        expect(sent).toHaveLength(1);
        const [copy] = threadMessages();
        expect(copy).toMatchObject({ direction: 'out', type: 'template', wamid: 'wamid.1', status: 'sent', sentBy: 'Newbi (automatic)', campaignId: 'c1' });
        expect(copy.text).toContain("You're on the list, Riya");
        expect(copy.text).toContain('*Name on the list:* Riya Sharma + 1');
        expect(db.store.get(`outreach_inbox/${contactIdFor(PHONE)}`)).toMatchObject({ phone: PHONE, name: 'Riya Sharma', lastDirection: 'out' });

        // Meta's template list is asked once, not per message.
        await notify('campaign-ticket', 'u1', { guestlist: true, eventName: 'Jasmine Sandlas Pune', date: '2026-11-28', qty: 1 }, { skip: ['email', 'push', 'inApp'] });
        expect(threadMessages()).toHaveLength(2);
        expect(templateFetches).toBe(1);
    });

    it('keeps security alerts out of the chats', async () => {
        await notify('new-sign-in', 'u1', { device: 'Chrome on Android', when: '23 Oct, 9:42 PM' }, { skip: ['email', 'push', 'inApp'] });
        expect(sent).toHaveLength(1);
        expect(threadMessages()).toHaveLength(0);
    });
});
