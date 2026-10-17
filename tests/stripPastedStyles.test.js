import { describe, it, expect } from 'vitest';
import { stripPastedStyles, linkifyContent } from '../src/lib/taskLinks.js';

describe('stripPastedStyles', () => {
    it('drops pasted colours and sizes, keeps other inline styles', () => {
        expect(stripPastedStyles('<p style="caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: medium;">Hi</p>')).toBe('<p>Hi</p>');
        expect(stripPastedStyles('<span style="color:#000;text-align:center">x</span>')).toBe('<span style="text-align:center">x</span>');
    });

    it('drops colour, face and size from font tags', () => {
        expect(stripPastedStyles('<font color="#ffffff" face="Arial" size=3>x</font>')).toBe('<font>x</font>');
    });

    it('runs inside linkifyContent and keeps links working', () => {
        const out = linkifyContent('<p style="color: rgb(0,0,0)">See https://newbi.live</p>');
        expect(out).not.toContain('color');
        expect(out).toContain('href="https://newbi.live/"');
    });

    it('leaves plain text alone', () => {
        expect(linkifyContent('color: red')).toBe('color: red');
    });
});
