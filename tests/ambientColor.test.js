import { describe, it, expect } from 'vitest';
import { AMBIENT_OFF, cleanAmbient, firstAmbient, hexToHsl, hslToHex } from '../src/lib/ambientColor.js';
import { buildFeed } from '../src/lib/store/community.js';

describe('ambient colour', () => {
    it('keeps a colour, Off, or Auto and nothing else', () => {
        expect(cleanAmbient('#FF4F8B')).toBe('#ff4f8b');
        expect(cleanAmbient(' #abc ')).toBe('#aabbcc');
        expect(cleanAmbient('none')).toBe(AMBIENT_OFF);
        expect(cleanAmbient('')).toBe('');
        expect(cleanAmbient(undefined)).toBe('');
        expect(cleanAmbient('red')).toBe('');
        expect(cleanAmbient('url(javascript:alert(1))')).toBe('');
    });

    it('takes the first value that is not Auto', () => {
        expect(firstAmbient('', 'bad', '#112233', '#445566')).toBe('#112233');
        expect(firstAmbient('', null)).toBe('');
    });

    it('converts between hex and hsl', () => {
        const [h, s, l] = hexToHsl('#ff0000');
        expect([h, s, l]).toEqual([0, 1, 0.5]);
        expect(hslToHex([120, 1, 0.5])).toBe('#00ff00');
        expect(hslToHex(hexToHsl('#39ff14'))).toBe('#39ff14');
    });

    it('reaches community cards, the guestlist list winning over its event', () => {
        const feed = buildFeed({
            events: [{ id: 'e1', title: 'Show', isGuestlistEnabled: true, ambientColor: '#111111' }],
            guestlists: [{ id: 'g1', eventId: 'e1', title: 'List', ambientColor: '#222222' }],
            forms: [{ id: 'f1', title: 'Form', ambientColor: 'none' }],
        });
        expect(feed.find(i => i.id === 'e1').ambientColor).toBe('#111111');
        expect(feed.find(i => i.id === 'f1').ambientColor).toBe(AMBIENT_OFF);
    });
});
