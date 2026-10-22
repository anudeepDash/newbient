import { describe, it, expect } from 'vitest';
import { shareDrafts } from '../src/components/admin/share/shareDrafts.js';

const seance = {
    title: 'SÉANCE — A PRE-HALLOWEEN SOIRÉE',
    date: '2026-10-24',
    time: '9PM',
    location: 'Foulplay Bar, Hauz Khas, Delhi',
    city: 'Delhi',
    locationUrl: 'https://maps.app.goo.gl/iAh2y7EDM6mow47x7',
    description: 'Foul Play × Cue Chamber\n\nA night of spirits, music & rituals with independent artists.\n\n📅 Saturday, 24th October\n⏳ 9 PM onwards',
    perUserLimit: 3,
    guestlist: true,
    link: 'https://app.newbi.live/community/g/gl1',
};

describe('share drafts', () => {
    const [community, group, instagram] = shareDrafts(seance);

    it('writes the community post from the guestlist', () => {
        expect(community.text).toContain('GUESTLIST OPEN');
        expect(community.text).toContain('📅 Sat, 24 Oct · 9PM');
        expect(community.text).toContain('📍 Foulplay Bar, Hauz Khas, Delhi');
        expect(community.text).not.toContain('Delhi, Delhi');
        expect(community.text).toContain('🗺️ https://maps.app.goo.gl/iAh2y7EDM6mow47x7');
        expect(community.text).toContain('Bring up to 2 friends');
        expect(community.text).toContain('👉 Get on the list: https://app.newbi.live/community/g/gl1');
        // The description's own date lines aren't repeated.
        expect(community.text).not.toContain('Saturday, 24th October');
        expect(community.whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
    });

    it('keeps the group message short and the caption link-free', () => {
        expect(group.text.split('\n')).toHaveLength(3);
        expect(instagram.text).not.toContain('https://');
        expect(instagram.whatsapp).toBeNull();
    });

    it('speaks about tickets for a ticket sale', () => {
        const [post] = shareDrafts({ ...seance, guestlist: false, isTicketed: true, link: 'https://app.newbi.live/tickets?event=e1' });
        expect(post.text).toContain('TICKETS ARE LIVE');
        expect(post.text).toContain('Get your tickets: https://app.newbi.live/tickets?event=e1');
        expect(post.text).not.toContain('Bring up to');
    });
});
