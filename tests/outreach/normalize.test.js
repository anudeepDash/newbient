import { describe, it, expect } from 'vitest';
import { normalizeHandle, normalizePhone, maskPhone, firstNameOf, normalizeEmail, slugify, isValidSlug } from '../../src/lib/outreach/normalize.js';

describe('normalizeHandle', () => {
    it.each([
        ['@Riya.Sharma', 'riya.sharma'],
        ['riya_sharma', 'riya_sharma'],
        ['  @@riya  ', 'riya'],
        ['https://www.instagram.com/Riya.Sharma/', 'riya.sharma'],
        ['https://instagram.com/riya.sharma?igsh=abc123', 'riya.sharma'],
        ['instagram.com/riya.sharma/?hl=en', 'riya.sharma'],
        ['http://m.instagram.com/riya', 'riya'],
        ['https://www.instagram.com/stories/riya.sharma/3456789/', 'riya.sharma'],
        ['instagr.am/riya', 'riya'],
    ])('%s → %s', (input, out) => expect(normalizeHandle(input)).toBe(out));

    it.each([
        '', null, undefined, '@', 'riya sharma', 'riya!', '.riya', 'riya.', 'ri..ya',
        'a'.repeat(31), 'https://www.instagram.com/p/C1234xyz/', 'https://www.instagram.com/reel/abc/',
        'https://instagram.com/', 'https://twitter.com/riya',
    ])('rejects %s', (input) => expect(normalizeHandle(input)).toBeNull());
});

describe('normalizePhone', () => {
    it.each([
        ['9876543210', '+919876543210'],
        ['98765 43210', '+919876543210'],
        ['+91 98765-43210', '+919876543210'],
        ['+91 (987) 654 3210', '+919876543210'],
        ['09876543210', '+919876543210'],
        ['919876543210', '+919876543210'],
        ['0091 98765 43210', '+919876543210'],
        ['+1 415 555 2671', '+14155552671'],
        ['+44 7911 123456', '+447911123456'],
        ['+971 50 123 4567', '+971501234567'],
    ])('%s → %s', (input, out) => expect(normalizePhone(input)).toBe(out));

    it.each([
        '', null, '12345', '5876543210', '+91 12345 67890', '+91 98765 4321', '98765432101',
        '+1234567', '+1234567890123456', '98765abcde', 'call me', '9876543210 ext 2', '+91 98765#43210',
    ])('rejects %s', (input) => expect(normalizePhone(input)).toBeNull());
});

describe('maskPhone', () => {
    it('keeps only the country code and last four digits', () => {
        expect(maskPhone('+919876543210')).toBe('+91******3210');
        expect(maskPhone('+14155552671')).toBe('+*******2671');
        expect(maskPhone('')).toBe('');
    });
});

describe('firstNameOf', () => {
    it.each([
        ['Riya Sharma', 'Riya'],
        ['riya sharma', 'Riya'],
        ['RIYA SHARMA', 'Riya'],
        ['McKenzie Rao', 'McKenzie'],
        ['Dr. Aditi Rao', 'Aditi'],
        ['Anne-Marie D’Souza', 'Anne-Marie'],
        ['अनन्या शर्मा', 'अनन्या'],
        ['  Arjun  ', 'Arjun'],
    ])('%s → %s', (input, out) => expect(firstNameOf(input)).toBe(out));

    it.each(['', '   ', 'R', 'R Sharma', 'rj_riya', 'riya123', '@riya', '🔥🔥', 'R.', 'https://x.y'])(
        'unclear name %s → ""', (input) => expect(firstNameOf(input)).toBe(''),
    );
});

describe('normalizeEmail', () => {
    it('lowercases and validates', () => {
        expect(normalizeEmail('  Riya@Example.COM ')).toBe('riya@example.com');
        expect(normalizeEmail('riya@example')).toBeNull();
        expect(normalizeEmail('riya example.com')).toBeNull();
    });
});

describe('slugify', () => {
    it('makes a URL-safe slug', () => {
        expect(slugify('Arijit Singh — Bangalore 2026!')).toBe('arijit-singh-bangalore-2026');
        expect(slugify('Café Night')).toBe('cafe-night');
        expect(isValidSlug('arijit-singh-blr')).toBe(true);
        expect(isValidSlug('-bad')).toBe(false);
        expect(isValidSlug('Bad')).toBe(false);
    });
});
