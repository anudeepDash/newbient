import { describe, it, expect } from 'vitest';
import { tokensFromUser, isAppOrigin, pushLink } from '../api/_lib/push.js';

const T = (n) => `token-${n}-${'x'.repeat(30)}`;

describe('push devices', () => {
    it('only pushes to devices registered on the app, never admin or the landing site', () => {
        const user = {
            fcmTokens: [T(1), T(2), T(3)],
            pushDevices: {
                a: { token: T(1), origin: 'https://app.newbi.live' },
                b: { token: T(2), origin: 'https://admin.newbi.live' },
                c: { token: T(3), origin: 'https://www.newbi.live' },
            },
        };
        expect(tokensFromUser(user)).toEqual([T(1)]);
    });

    it('falls back to the old token list for people who have not opened the app since', () => {
        expect(tokensFromUser({ fcmToken: T(1), fcmTokens: [T(1), T(2)] })).toEqual([T(1), T(2)]);
    });

    it('knows the app hosts', () => {
        expect(isAppOrigin('https://app.newbi.live')).toBe(true);
        expect(isAppOrigin('http://localhost:5173')).toBe(true);
        expect(isAppOrigin('https://admin.newbi.live')).toBe(false);
        expect(isAppOrigin('https://newbi.live')).toBe(false);
        expect(isAppOrigin('not a url')).toBe(false);
    });

    it('opens relative links in the app', () => {
        expect(pushLink('/creator')).toBe('https://app.newbi.live/creator');
        expect(pushLink('https://chat.whatsapp.com/x')).toBe('https://chat.whatsapp.com/x');
    });
});
