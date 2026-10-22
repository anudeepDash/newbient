import { describe, it, expect } from 'vitest';
import { fieldsFor, isAuto, fillTokens, missingTokens } from '../../src/lib/outreach/waFields.js';

describe('WhatsApp template fields', () => {
    it('knows what our templates’ variables mean', () => {
        expect(fieldsFor({ name: 'campaign_shortlisted', bodyVars: 3 })).toEqual({ body: ['first_name', 'campaign_title', 'group_link'], button: 'campaign_id' });
        expect(fieldsFor({ name: 'campaign_deliverables', bodyVars: 2 })).toEqual({ body: ['first_name', 'campaign_title'], button: 'submit_token' });
    });

    it('guesses a first name only after a greeting in templates it doesn’t know', () => {
        expect(fieldsFor({ name: 'x', body: 'Hi {{1}}, {{2}}', bodyVars: 2 }).body).toEqual(['first_name', null]);
        expect(fieldsFor({ name: 'x', body: 'Gate: {{1}}', bodyVars: 1 }).body).toEqual([null]);
    });

    it('fills what the audience allows, and leaves the rest visible', () => {
        expect(isAuto('first_name')).toBe(true);
        expect(isAuto('campaign_title')).toBe(false);
        expect(isAuto('campaign_title', { campaign: true })).toBe(true);
        expect(isAuto('city', { campaign: true })).toBe(false);
        expect(fillTokens('{first_name} in {city}', { first_name: 'Riya' })).toBe('Riya in {city}');
        expect(missingTokens('Riya in {city} {notafield}')).toEqual(['city']);
    });
});
