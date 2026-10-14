import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import CityGroupManager from '../../components/admin/CityGroupManager';
import CreatorTestimonialsManager from '../../components/admin/CreatorTestimonialsManager';
import BrandPartnersManager from '../../components/admin/BrandPartnersManager';
import CreatorProgramSettingsManager from '../../components/admin/CreatorProgramSettingsManager';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import Settings from 'lucide-react/dist/esm/icons/settings';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Star from 'lucide-react/dist/esm/icons/star';
import Target from 'lucide-react/dist/esm/icons/target';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import MessageSquareQuote from 'lucide-react/dist/esm/icons/message-square-quote';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Sliders from 'lucide-react/dist/esm/icons/sliders';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';

export const CreatorSettingsContent = () => {
    useStoreSubscription(['creatorGroups', 'creatorTestimonials', 'pastClients', 'siteSettings']);
    const { creatorGroups, creatorTestimonials, pastClients } = useStore();

    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'groups';

    const setTab = (tabId) => {
        setSearchParams({ tab: tabId }, { replace: true });
    };

    const subTabs = [
        {
            id: 'groups',
            label: 'City groups',
            icon: MapPin,
            count: creatorGroups?.length || 0,
        },
        {
            id: 'testimonials',
            label: 'Testimonials',
            icon: MessageSquareQuote,
            count: creatorTestimonials?.length || 0,
        },
        {
            id: 'brands',
            label: 'Brand partners',
            icon: Building2,
            count: pastClients?.length || 0,
        },
        {
            id: 'program',
            label: 'Program & rules',
            icon: Sliders,
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-0.5 font-sans dark:border-zinc-800 dark:bg-zinc-900 sm:inline-flex">
                {subTabs.map(t => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={cn(
                                'inline-flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-sm transition-colors',
                                isActive
                                    ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
                            )}
                        >
                            <Icon size={15} />
                            {t.label}
                            {t.count !== undefined && <span className="text-xs tabular-nums text-gray-500 dark:text-zinc-500">{t.count}</span>}
                        </button>
                    );
                })}
            </div>

            {/* Sub-Tab Content View */}
            <div>
                {activeTab === 'groups' && <CityGroupManager />}
                {activeTab === 'testimonials' && <CreatorTestimonialsManager />}
                {activeTab === 'brands' && <BrandPartnersManager />}
                {activeTab === 'program' && <CreatorProgramSettingsManager />}
            </div>
        </div>
    );
};

const CreatorSettingsPage = ({ isEmbedded = false }) => {
    const personnelTabs = [
        { name: 'Creators', path: '/admin/creators', icon: Star },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target },
        { name: 'Leaderboard', path: '/admin/creators/leaderboard', icon: Trophy },
        { name: 'Settings', path: '/admin/creators/settings', icon: Settings },
    ];

    if (isEmbedded) {
        return <CreatorSettingsContent />;
    }

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'CREATOR',
                subtitle: 'PORTAL',
                icon: Settings,
                accentClass: 'text-neon-pink'
            }}
            accentColor="neon-pink"
            tabs={personnelTabs}
            action={
                <div className="flex items-center gap-3">
                    <a
                        href="/creator"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-zinc-200 hover:border-neon-pink/50 hover:text-neon-pink transition-all shadow-sm group"
                    >
                        <span>View Live Creator Page</span>
                        <ExternalLink size={13} className="text-gray-400 group-hover:text-neon-pink transition-colors" />
                    </a>
                </div>
            }
        >
            <div className="max-w-7xl mx-auto py-6">
                <CreatorSettingsContent />
            </div>
        </AdminCommunityHubLayout>
    );
};

export default CreatorSettingsPage;
