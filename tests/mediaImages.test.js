import { describe, it, expect } from 'vitest';
import { sizedImage, sizedJpeg, isSizedMedia } from '../src/lib/image.js';
import { toOgImage } from '../src/app/seo.js';

const BASE = 'https://firebasestorage.googleapis.com/v0/b/newbi-ent-v2.firebasestorage.app/o/media%2F0123456789abcdef0123456789abcdef%2F';
const FB = `${BASE}w2000.webp?alt=media`;
const SMALL = `${BASE}w800.webp?alt=media`; // an upload narrower than 960
const JPG = `${BASE}w1600.jpg?alt=media`; // a browser that couldn't write WebP
const CLOUD = 'https://res.cloudinary.com/dgtalrz4n/image/upload/v1712/poster.png';

describe('sizedImage on Firebase uploads', () => {
    it('picks the smallest saved copy that is wide enough', () => {
        expect(sizedImage(FB, 100)).toBe(`${BASE}w160.webp?alt=media`);
        expect(sizedImage(FB, 480)).toBe(`${BASE}w480.webp?alt=media`);
        expect(sizedImage(FB, 700)).toBe(`${BASE}w960.webp?alt=media`);
        expect(sizedImage(FB, 1700)).toBe(FB);
        expect(sizedImage(FB, 4000)).toBe(FB);
    });

    it('never asks for a copy wider than the upload has', () => {
        expect(sizedImage(SMALL, 700)).toBe(SMALL);
        expect(sizedImage(SMALL, 1600)).toBe(SMALL);
        expect(sizedImage(SMALL, 300)).toBe(`${BASE}w480.webp?alt=media`);
    });

    it('keeps the format the upload was saved in', () => {
        expect(sizedImage(JPG, 400)).toBe(`${BASE}w480.jpg?alt=media`);
    });

    it('gives email.jpg for mail, push and link previews', () => {
        expect(sizedJpeg(FB, 720)).toBe(`${BASE}email.jpg?alt=media`);
        expect(sizedJpeg(JPG, 1080)).toBe(`${BASE}email.jpg?alt=media`);
    });

    it('leaves files stored as they are alone', () => {
        const pdf = `${BASE}receipt.pdf?alt=media`;
        const gif = `${BASE}party.gif?alt=media`;
        const tokenLink = 'https://firebasestorage.googleapis.com/v0/b/b/o/uploads%2Fx.png?alt=media&token=abc';
        for (const u of [pdf, gif, tokenLink]) {
            expect(sizedImage(u, 480)).toBe(u);
            expect(sizedJpeg(u, 480)).toBe(u);
            expect(isSizedMedia(u)).toBe(false);
        }
        expect(isSizedMedia(FB)).toBe(true);
    });
});

describe('Cloudinary links still work', () => {
    it('resizes old uploads in the URL as before', () => {
        expect(sizedImage(CLOUD, 480)).toBe('https://res.cloudinary.com/dgtalrz4n/image/upload/f_auto,q_auto,c_limit,w_480/v1712/poster.png');
        expect(sizedJpeg(CLOUD, 700)).toBe('https://res.cloudinary.com/dgtalrz4n/image/upload/f_jpg,q_auto,c_limit,w_720/v1712/poster.png');
    });

    it('leaves other hosts and previews alone', () => {
        expect(sizedImage('https://example.com/a.jpg', 480)).toBe('https://example.com/a.jpg');
        expect(sizedImage('blob:https://app/1', 480)).toBe('blob:https://app/1');
        expect(sizedImage(undefined, 480)).toBe(undefined);
    });
});

describe('link previews of Firebase uploads', () => {
    it('use the JPEG copy, which WhatsApp and crawlers can show', () => {
        expect(toOgImage(FB)).toEqual({ url: `${BASE}email.jpg?alt=media`, type: 'image/jpeg' });
    });
});
