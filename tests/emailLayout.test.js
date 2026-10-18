import { describe, it, expect } from 'vitest';
import { excerpt, sanitizeHtml } from '../api/_lib/mail/layout.js';
import { render } from '../api/_lib/mail/templates/index.js';

const brief = '<p dir="ltr" style="caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: medium;">Promote&nbsp;<em>The Tour</em> in Bengaluru.</p><p>Post <strong>2 reels</strong>.</p>';

describe('email layout', () => {
    it('shows an editor brief as text, not markup', () => {
        const { html, text } = render('campaign-invite', { campaignTitle: 'Tour', description: brief }, { origin: 'https://www.newbi.live' });
        expect(html).not.toContain('&lt;p');
        expect(html).toContain('Promote The Tour in Bengaluru.');
        expect(text).toContain('Promote The Tour in Bengaluru.\n\nPost 2 reels.');
    });

    it('cuts long briefs at a word', () => {
        const out = excerpt('word '.repeat(200), 50);
        expect(out.length).toBeLessThanOrEqual(51);
        expect(out.endsWith('word…')).toBe(true);
    });

    it('drops pasted colours from staff html', () => {
        expect(sanitizeHtml('<p style="color: rgb(0,0,0); text-align:center">Hi</p>')).toBe('<p style="text-align:center">Hi</p>');
    });

    it('has social links, unsubscribe only on marketing mail, and a copyright line', () => {
        const marketing = render('campaign-invite', {}, { origin: 'https://www.newbi.live' }).html;
        const transactional = render('welcome', {}, { origin: 'https://www.newbi.live' }).html;
        expect(marketing).toContain('https://www.newbi.live/unsubscribe');
        expect(transactional).not.toContain('/unsubscribe');
        for (const html of [marketing, transactional]) {
            expect(html).toContain('instagram.com/newbi.live');
            expect(html).toContain('linkedin.com/company/newbi-ent');
            expect(html).toMatch(/© \d{4} Newbi Entertainment &amp; Marketing LLP/);
        }
    });
});
