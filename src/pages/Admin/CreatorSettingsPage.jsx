import React, { useState } from 'react';
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
            label: 'City Groups',
            icon: MapPin,
            count: creatorGroups?.length || 0,
            color: 'text-sky-600 dark:text-neon-blue',
            activeBg: 'bg-sky-500/10 dark:bg-neon-blue/15 text-sky-600 dark:text-neon-blue border-sky-500/30 dark:border-neon-blue/30',
            hoverBg: 'hover:bg-sky-500/5 dark:hover:bg-neon-blue/10 hover:text-sky-600 dark:hover:text-neon-blue'
        },
        {
            id: 'testimonials',
            label: 'Testimonials',
            icon: MessageSquareQuote,
            count: creatorTestimonials?.length || 0,
            color: 'text-rose-600 dark:text-neon-pink',
            activeBg: 'bg-rose-500/10 dark:bg-neon-pink/15 text-rose-600 dark:text-neon-pink border-rose-500/30 dark:border-neon-pink/30',
            hoverBg: 'hover:bg-rose-500/5 dark:hover:bg-neon-pink/10 hover:text-rose-600 dark:hover:text-neon-pink'
        },
        {
            id: 'brands',
            label: 'Brand Partners',
            icon: Building2,
            count: pastClients?.length || 0,
            color: 'text-emerald-600 dark:text-neon-green',
            activeBg: 'bg-emerald-500/10 dark:bg-neon-green/15 text-emerald-600 dark:text-neon-green border-emerald-500/30 dark:border-neon-green/30',
            hoverBg: 'hover:bg-emerald-500/5 dark:hover:bg-neon-green/10 hover:text-emerald-600 dark:hover:text-neon-green'
        },
        {
            id: 'program',
            label: 'Program & Rules',
            icon: Sliders,
            color: 'text-amber-600 dark:text-amber-400',
            activeBg: 'bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 border-amber-500/30 dark:border-amber-400/30',
            hoverBg: 'hover:bg-amber-500/5 dark:hover:bg-amber-400/10 hover:text-amber-600 dark:hover:text-amber-400'
        }
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 py-4">
            {/* Executive Sub-navigation Switcher */}
            <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    {subTabs.map(t => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={cn(
                                    "flex items-center justify-center gap-2.5 px-3 py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider transition-all border",
                                    isActive
                                        ? cn("shadow-sm font-black", t.activeBg)
                                        : cn("border-transparent text-gray-600 dark:text-zinc-400 bg-transparent", t.hoverBg)
                                )}
                            >
                                <Icon size={16} className={isActive ? t.color : 'text-gray-400 dark:text-zinc-500'} />
                                <span>{t.label}</span>
                                {t.count !== undefined && (
                                    <span className={cn(
                                        "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
                                        isActive
                                            ? "bg-black/10 dark:bg-white/10 text-inherit"
                                            : "bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-zinc-500"
                                    )}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
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

const CreatorSettingsPage = () => {
    const personnelTabs = [
        { name: 'Creators', path: '/admin/creators', icon: Star },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target },
        { name: 'Leaderboard', path: '/admin/creators/leaderboard', icon: Trophy },
        { name: 'Settings', path: '/admin/creators/settings', icon: Settings },
    ];

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'Creator',
                subtitle: 'Settings & Content',
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
            <CreatorSettingsContent />
        </AdminCommunityHubLayout>
    );
};

export default CreatorSettingsPage;
