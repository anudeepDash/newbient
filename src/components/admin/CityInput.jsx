import React from 'react';
import { PREDEFINED_CITIES } from '../../lib/constants';

/*
 * The city something happens in: any city can be typed, the usual ones are
 * suggested. Saved as `city` on events, guestlists, gigs, giveaways and forms;
 * the app shows it on the card and Community filters by it. Leave it empty for
 * online or everywhere.
 */

export const cleanCity = (v) => String(v || '').trim().replace(/\s+/g, ' ');

const CityInput = ({ value, onChange, className, placeholder = 'e.g. Mumbai' }) => (
    <>
        <input
            className={className}
            list="nb-city-options"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="words"
        />
        <datalist id="nb-city-options">
            {PREDEFINED_CITIES.map(c => <option key={c} value={c} />)}
        </datalist>
    </>
);

export default CityInput;
