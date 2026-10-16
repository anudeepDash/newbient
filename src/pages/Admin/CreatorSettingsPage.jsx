import React from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Button, SegmentedTabs } from '../../components/admin/ui';
import CreatorTestimonialsManager from '../../components/admin/CreatorTestimonialsManager';
import BrandPartnersManager from '../../components/admin/BrandPartnersManager';
import CreatorProgramSettingsManager from '../../components/admin/CreatorProgramSettingsManager';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Star from 'lucide-react/dist/esm/icons/star';
import Target from 'lucide-react/dist/esm/icons/target';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import MessageSquareQuote from 'lucide-react/dist/esm/icons/message-square-quote';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Sliders from 'lucide-react/dist/esm/icons/sliders';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';

/* Creator settings: program rules, testimonials and brand partners (?tab=). */

export const CreatorSettingsContent = () => {
    useStoreSubscription(['creatorTestimonials', 'pastClients', 'siteSettings']);
    const creatorTestimonials = useStore(s => s.creatorTestimonials);
    const pastClients = useStore(s => s.pastClients);

    const [searchParams, setSearchParams] = useSearchParams();
    const requested = searchParams.get('tab');
    const activeTab = ['testimonials', 'brands', 'program'].includes(requested) ? requested : 'program';

    // City groups moved to their own Groups tab.
    if (requested === 'groups') return <Navigate to="/admin/creators/groups" replace />;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs
                        value={activeTab}
                        onChange={(id) => setSearchParams({ tab: id }, { replace: true })}
                        items={[
                            { value: 'program', label: 'Program and rules', icon: Sliders },
                            { value: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote, count: creatorTestimonials?.length || 0 },
                            { value: 'brands', label: 'Brand partners', icon: Building2, count: pastClients?.length || 0 },
                        ]}
                    />
                </div>
                <Button as="a" href="/creator" target="_blank" rel="noopener noreferrer" variant="secondary" className="h-11">
                    <ExternalLink size={14} /> View creator page
                </Button>
            </div>
            {/* All three stay mounted so unsaved program changes survive a tab switch. */}
            <div hidden={activeTab !== 'program'}><CreatorProgramSettingsManager /></div>
            <div hidden={activeTab !== 'testimonials'}><CreatorTestimonialsManager /></div>
            <div hidden={activeTab !== 'brands'}><BrandPartnersManager /></div>
        </div>
    );
};

const CreatorSettingsPage = ({ isEmbedded = false }) => {
    if (isEmbedded) return <CreatorSettingsContent />;

    // Standalone (old /admin/city-groups style links): same content in its own frame.
    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Creator settings', icon: Settings, description: 'Program rules, testimonials and brand partners' }}
            tabs={[
                { name: 'Creators', path: '/admin/creators', icon: Star },
                { name: 'Campaigns', path: '/admin/campaigns', icon: Target },
                { name: 'Leaderboard', path: '/admin/creators/leaderboard', icon: Trophy },
                { name: 'Settings', path: '/admin/creators/settings', icon: Settings },
            ]}
        >
            <CreatorSettingsContent />
        </AdminCommunityHubLayout>
    );
};

export default CreatorSettingsPage;
