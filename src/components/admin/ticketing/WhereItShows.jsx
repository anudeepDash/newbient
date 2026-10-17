import React from 'react';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import { Section, Toggle } from '../uploads/UploadKit';

/*
 * Where a ticket sale or guestlist shows, besides its own page:
 *   showOnSite  the Upcoming section on the newbi.live home page
 *   showInApp   the Upcoming rail on the app's Home
 * Ticket sales are always in the app's Tickets tab and guestlists in its
 * Community tab, whatever these say.
 */
const WhereItShows = ({ value, onChange, kind = 'ticket' }) => (
    <Section title="Where it shows">
        <Toggle
            label={<span className="inline-flex items-center gap-2"><Globe size={15} className="text-gray-400" /> newbi.live home · Upcoming</span>}
            hint="In the Upcoming section on the website's home page"
            checked={value.showOnSite}
            onChange={(v) => onChange({ showOnSite: v })}
        />
        <Toggle
            label={<span className="inline-flex items-center gap-2"><Smartphone size={15} className="text-gray-400" /> App home · Upcoming</span>}
            hint="In the Upcoming rail on the app's Home"
            checked={value.showInApp}
            onChange={(v) => onChange({ showInApp: v })}
        />
        <p className="text-[12px] text-gray-500">
            {kind === 'ticket'
                ? 'Always listed in the app’s Tickets tab, where people buy.'
                : 'Always listed in the app’s Community tab, where people register.'}
        </p>
    </Section>
);

export default WhereItShows;
