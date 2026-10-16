import React from 'react';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import { useAppStore } from '../../lib/store/appStore';
import { guestlistPasses } from '../../lib/store/passes';
import { Card, Section } from '../../components/app';
import { landingUrl } from '../host';
import PageHeader, { PageBody } from './PageHeader';

/*
 * Community. Phase 5 replaces this with the one feed of cards (guestlists,
 * gigs, giveaways, forms) and "My guestlists". Until then it points to the
 * current community page and lists any passes you already hold.
 */
const CommunityPage = () => {
    const authUser = useAppStore(s => s.authUser);
    const passes = useAppStore(guestlistPasses);

    return (
        <PageBody>
            <PageHeader
                eyebrow="Community"
                title="What’s on"
                subtitle="Guestlists, gigs, giveaways and forms from Newbi."
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <Card
                    type="guestlist"
                    title="Guestlists and events"
                    description="Register for upcoming Newbi nights and partner events."
                    cta={{ label: 'See what’s on' }}
                    href={landingUrl('/community')}
                />
                <Card
                    type="gig"
                    title="Gigs"
                    description="Volunteer and crew roles at upcoming shows."
                    cta={{ label: 'Browse gigs' }}
                    href={landingUrl('/community')}
                />
            </div>

            {authUser && (
                <Section title="My guestlists" when={passes.length > 0}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {passes.map(pass => (
                            <Card
                                key={pass.ref}
                                type="guestlist"
                                title={pass.eventTitle || pass.title}
                                chips={[{ icon: Ticket, label: pass.tier }]}
                                stats={[
                                    { label: 'Qty', value: pass.qty },
                                    { label: 'Status', value: pass.status === 'checked_in' ? 'Checked in' : pass.status === 'issued' ? 'Ready' : null, tone: 'accent' },
                                ]}
                                cta={{ label: 'Open pass' }}
                            />
                        ))}
                    </div>
                </Section>
            )}
        </PageBody>
    );
};

export default CommunityPage;
