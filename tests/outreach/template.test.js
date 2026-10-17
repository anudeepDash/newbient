import { describe, it, expect } from 'vitest';
import { renderMessage, DEFAULT_TEMPLATE, waLink, unknownPlaceholders, formatDeadline, deadlineLineFor } from '../../src/lib/outreach/template.js';

const campaign = {
    title: 'Arijit Singh Live, Bangalore',
    whatsappGroupLink: 'https://chat.whatsapp.com/AbCdEf123',
    postingDeadline: '2026-11-02',
};

describe('renderMessage', () => {
    it('fills every placeholder', () => {
        const text = renderMessage(DEFAULT_TEMPLATE, { application: { fullName: 'riya sharma' }, campaign });
        expect(text).toContain('Hey Riya! 👋');
        expect(text).toContain("You're shortlisted for Arijit Singh Live, Bangalore with Newbi.");
        expect(text).toContain('https://chat.whatsapp.com/AbCdEf123');
        expect(text).toContain('Please post by Monday, 2 November.');
        expect(text).not.toMatch(/\{[a-z_]+\}/);
    });

    it('falls back to "Hey!" when the first name is unclear', () => {
        const text = renderMessage(DEFAULT_TEMPLATE, { application: { fullName: 'rj_riya' }, campaign });
        expect(text.startsWith('Hey! 👋')).toBe(true);
        expect(renderMessage('Hi {first_name}, welcome', { application: { fullName: 'R' }, campaign })).toBe('Hey! welcome');
    });

    it('drops {first_name} cleanly when it is not after a greeting', () => {
        expect(renderMessage('Thanks {first_name}, see you!', { application: { fullName: '' }, campaign })).toBe('Thanks, see you!');
    });

    it('removes the deadline line and its blank line when there is no posting deadline', () => {
        const text = renderMessage(DEFAULT_TEMPLATE, { application: { fullName: 'Riya' }, campaign: { ...campaign, postingDeadline: '' } });
        expect(text).not.toContain('Please post');
        expect(text).not.toMatch(/\n{3,}/);
    });

    it('leaves unknown placeholders in place so the admin sees them', () => {
        expect(renderMessage('Hi {first_name} {name}', { application: { fullName: 'Riya' }, campaign })).toBe('Hi Riya {name}');
        expect(unknownPlaceholders('Hi {first_name} {name} {link}')).toEqual(['name', 'link']);
    });
});

describe('deadlines', () => {
    it('formats calendar days without shifting them', () => {
        expect(formatDeadline('2026-11-02')).toBe('Monday, 2 November');
        expect(formatDeadline('')).toBe('');
        expect(deadlineLineFor({})).toBe('');
    });
});

describe('waLink', () => {
    it('builds a wa.me link without the plus and with the text encoded', () => {
        expect(waLink('+919876543210', 'Hey Riya! 👋\nJoin')).toBe('https://wa.me/919876543210?text=Hey%20Riya!%20%F0%9F%91%8B%0AJoin');
        expect(waLink('', 'x')).toBe('');
    });
});
