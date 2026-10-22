import { describe, it, expect } from 'vitest';
import { attendeeSpec, ordersSpec } from '../src/components/admin/ticketing/exports.js';

describe('attendee export', () => {
    const event = { title: 'Skyline', time: '8 PM onwards', location: 'Rooftop lounge, Bandra', locationUrl: 'https://maps.app.goo.gl/abc' };
    const entry = { id: 'e1', bookingRef: 'AB12CD34EF', name: 'Asha', guestsCount: 3, plusOneNames: ['Priya Shah', '', 'Arjun Rao'], status: 'confirmed', createdAt: '2026-10-01T10:00:00Z' };

    it('lists who is coming with each guest in its own column', () => {
        const spec = attendeeSpec(event, [], [entry]);
        expect(spec.columns.map(c => c.key)).toContain('guests');
        expect(spec.rows[0].guests).toBe('Priya Shah, Arjun Rao');
        expect(spec.rows[0].tickets).toBe(3);
    });

    it('puts the time, venue and map link in the sheet header', () => {
        const { subtitle } = attendeeSpec(event, [], [entry]);
        expect(subtitle).toContain('8 PM onwards');
        expect(subtitle).toContain('Rooftop lounge, Bandra');
        expect(subtitle).toContain('https://maps.app.goo.gl/abc');
    });

    it('leaves the guest-names column out of the orders-only export', () => {
        const spec = ordersSpec([{ id: 'ev', title: 'Skyline' }], [{ eventId: 'ev', bookingRef: 'ZZ', status: 'confirmed' }]);
        expect(spec.columns.map(c => c.key)).not.toContain('guests');
    });
});
