import { describe, it, expect } from 'vitest';
import { getV2PaginatedPages, chunkSteps } from '../src/lib/proposalTemplateV2.js';

const types = (data) => getV2PaginatedPages({ templateVersion: 'v2', ...data }).map(p => (p.type === 'v2-custom' ? `custom:${p.title}` : p.type));

describe('v2 proposal pages', () => {
    it('places extra pages after the page they name, and at the end by default', () => {
        const out = types({
            customPages: [
                { title: 'Booth', placeAfter: 'v2-executive' },
                { title: 'Terms', insertAfter: 'commercials' },
                { title: 'Calendar', placeAfter: 'v2-blueprint' },
            ],
        });
        expect(out.indexOf('custom:Booth')).toBe(out.indexOf('v2-executive') + 1);
        expect(out.indexOf('custom:Calendar')).toBe(out.lastIndexOf('v2-blueprint-2') + 1);
        expect(out[out.length - 1]).toBe('custom:Terms');
    });

    it('carries blocks and the grey aside onto the page', () => {
        const blocks = [{ type: 'text', text: 'Hi' }];
        const page = getV2PaginatedPages({ templateVersion: 'v2', customPages: [{ title: 'X', aside: '(continued)', blocks }] }).find(p => p.type === 'v2-custom');
        expect(page.blocks).toEqual(blocks);
        expect(page.aside).toBe('(continued)');
    });

    it('skips hidden extra pages', () => {
        expect(types({ customPages: [{ title: 'Gone', hidden: true }] })).not.toContain('custom:Gone');
    });

    it('fits short plans on one page and splits long ones, numbering on', () => {
        const short = chunkSteps([{ title: 'a', bullets: ['x'] }, { title: 'b', bullets: ['y'] }]);
        expect(short).toHaveLength(1);
        const long = chunkSteps(Array.from({ length: 8 }, (_, i) => ({ title: `s${i}`, bullets: ['x'.repeat(300), 'y'.repeat(300)] })));
        expect(long.length).toBeGreaterThan(1);
        expect(long[1].start).toBe(long[0].steps.length);
        expect(long.flatMap(c => c.steps)).toHaveLength(8);
    });
});
