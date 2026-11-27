import { describe, it, expect } from 'vitest';
import { WA_TEMPLATES, templateParamsFor, renderTemplatePreview, doorNameOf } from '../src/lib/outreach/whatsappTemplate.js';
import { fieldsFor } from '../src/lib/outreach/waFields.js';

describe('Outreach → Guestlist message', () => {
    it('uses the approved guestlist template', () => {
        expect(WA_TEMPLATES.guestlist.name).toBe('guestlist_rsvp_confirmed');
        expect(fieldsFor({ name: 'guestlist_rsvp_confirmed', bodyVars: 4 }).body).toEqual(['first_name', 'event_name', 'event_date', 'door_name']);
    });

    it('fills the event, date and the name at the door', () => {
        const params = templateParamsFor('guestlist', {
            application: { fullName: 'Riya  Sharma' },
            campaign: { title: 'Pinnacle x Newbi', eventName: 'Arijit Singh Live' },
            data: { eventDate: 'Sat, 19 Dec', guests: 1 },
        });
        expect(params).toEqual(['Riya', 'Arijit Singh Live', 'Sat, 19 Dec', 'Riya Sharma + 1']);
    });

    it('prefers the event typed in, and never sends an empty variable', () => {
        const params = templateParamsFor('guestlist', { application: {}, campaign: { title: 'Camp' }, data: { eventName: 'Techno Tuesdays' } });
        expect(params).toEqual(['there', 'Techno Tuesdays', 'See the campaign', 'Your name']);
        expect(renderTemplatePreview('guestlist', { application: { fullName: 'Riya' }, campaign: { title: 'Camp' }, data: { eventDate: 'Tue' } })).toContain("You're on the list, Riya");
    });

    it('caps the guests', () => {
        expect(doorNameOf('Ann', 3)).toBe('Ann + 3');
        expect(doorNameOf('Ann', 99)).toBe('Ann + 10');
        expect(doorNameOf('Ann', -2)).toBe('Ann');
    });
});
