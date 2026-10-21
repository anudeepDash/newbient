import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import { createHmac } from 'node:crypto';
import { fakeRes } from './helpers/fakeFirestore.js';
import handler from '../api/track.js';

const SECRET = 'test-app-secret';
const sign = (raw) => `sha256=${createHmac('sha256', SECRET).update(raw).digest('hex')}`;

/*
 * A request the way Vercel's Node runtime hands it over: the body is a stream,
 * and req.body is a lazy getter that parses it on first access and in doing so
 * consumes it. Reading req.body before the stream used to leave no raw bytes,
 * so every Meta signature failed.
 */
const vercelReq = (raw, headers = {}) => {
    const req = Readable.from([Buffer.from(raw)]);
    Object.assign(req, { method: 'POST', url: '/api/track?type=whatsapp', query: { type: 'whatsapp' }, headers: { 'content-type': 'application/json', ...headers } });
    let parsed;
    Object.defineProperty(req, 'body', {
        configurable: true,
        get() {
            if (parsed === undefined) { req.resume(); parsed = JSON.parse(raw); }
            return parsed;
        },
        set(v) { parsed = v; },
    });
    return req;
};

let saved;
beforeEach(() => { saved = process.env.WHATSAPP_APP_SECRET; process.env.WHATSAPP_APP_SECRET = SECRET; });
afterEach(() => { if (saved === undefined) delete process.env.WHATSAPP_APP_SECRET; else process.env.WHATSAPP_APP_SECRET = saved; });

describe('WhatsApp webhook signature', () => {
    it('checks Meta’s signature against the raw bytes the runtime delivers', async () => {
        const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
        const res = fakeRes();
        await handler(vercelReq(raw, { 'x-hub-signature-256': sign(raw) }), res);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ received: 0 });
    });

    it('still refuses a wrong signature', async () => {
        const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
        const res = fakeRes();
        await handler(vercelReq(raw, { 'x-hub-signature-256': sign(`${raw} `) }), res);
        expect(res.statusCode).toBe(401);
    });
});
