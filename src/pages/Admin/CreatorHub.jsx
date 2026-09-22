import React, { useState } from 'react';
import Users from 'lucide-react/dist/esm/icons/users';
import Target from 'lucide-react/dist/esm/icons/target';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Settings from 'lucide-react/dist/esm/icons/settings';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import CreatorManager from './CreatorManager';
import CampaignManager from './CampaignManager';
import { CreatorSettingsContent } from './CreatorSettingsPage';

import { useLocation } from 'react-router-dom';

const CreatorHub = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(
        location.pathname.includes('campaigns') ? 'campaigns' : (location.pathname.includes('settings') || location.pathname.includes('groups')) ? 'settings' : 'creators'
    );

    const tabs = [
        { id: 'creators', label: 'Creators', icon: Users, count: null },
        { id: 'campaigns', label: 'Campaigns', icon: Target, count: null },
        { id: 'settings', label: 'Settings', icon: Settings, count: null }
    ];

    const getAccentClass = () => {
        if (activeTab === 'creators') return 'text-neon-pink';
        if (activeTab === 'campaigns') return 'text-neon-blue';
        return 'text-neon-yellow dark:text-amber-400';
    };

    const getIcon = () => {
        if (activeTab === 'creators') return Users;
        if (activeTab === 'campaigns') return Target;
        return Settings;
    };

    const getAccentColor = () => {
        if (activeTab === 'creators') return 'neon-pink';
        if (activeTab === 'campaigns') return 'neon-blue';
        return 'neon-green';
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'Creator',
                subtitle: 'Ecosystem',
                accentClass: getAccentClass(),
                icon: getIcon()
            }}
            hideTabs={true}
            accentColor={getAccentColor()}
        >
            {/* Underline Tab Navigation */}
            <div className="border-b border-black/[0.08] dark:border-white/[0.08] mb-6 -mx-1 overflow-x-auto no-scrollbar">
                <div className="flex">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative flex items-center gap-2.5 px-5 py-3.5 transition-all duration-200 shrink-0",
                                activeTab === tab.id 
                                    ? "text-gray-900 dark:text-white" 
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <tab.icon size={15} className={cn(
                                "transition-colors",
                                activeTab === tab.id 
                                    ? (tab.id === 'creators' ? "text-neon-pink" : tab.id === 'campaigns' ? "text-neon-blue" : "text-neon-green") 
                                    : "text-gray-400 dark:text-gray-500"
                            )} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                            {tab.count !== null && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/5 dark:bg-white/5">{tab.count}</span>
                            )}
                            {activeTab === tab.id && (
                                <motion.div 
                                    layoutId="creator-hub-tab-underline"
                                    className="absolute -bottom-px left-0 right-0 h-0.5 bg-neon-green"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ 
                            type: "spring",
                            damping: 25,
                            stiffness: 200,
                            mass: 0.8
                        }}
                    >
                        {activeTab === 'creators' ? (
                            <CreatorManager isEmbedded />
                        ) : activeTab === 'campaigns' ? (
                            <CampaignManager isEmbedded />
                        ) : (
                            <div className="max-w-7xl mx-auto py-4">
                                <CreatorSettingsContent />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default CreatorHub;
