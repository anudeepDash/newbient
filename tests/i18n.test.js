import { describe, it, expect } from 'vitest';
import { translate } from '../src/i18n/index.js';

describe('i18n translate (English, the default)', () => {
    it('returns the text as is', () => {
        expect(translate('Join free')).toBe('Join free');
    });
    it('fills {placeholders} and leaves unknown ones', () => {
        expect(translate('Hi {name}, {x}', { name: 'Asha' })).toBe('Hi Asha, {x}');
    });
});
