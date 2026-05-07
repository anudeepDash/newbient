import React, { useState } from 'react';
import { Users, Target, Sparkles, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import CreatorManager from './CreatorManager';
import CampaignManager from './CampaignManager';

import { useLocation } from 'react-router-dom';

const CreatorHub = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(
        location.pathname.includes('campaigns') ? 'campaigns' : 'creators'
    );

    const tabs = [
        { id: 'creators', label: 'CREATORS', icon: Users, description: 'Manage creator profiles and verification' },
        { id: 'campaigns', label: 'CAMPAIGNS', icon: Target, description: 'Manage missions and task submissions' }
    ];

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'CREATOR',
                subtitle: 'ECOSYSTEM',
                accentClass: activeTab === 'creators' ? 'text-neon-pink' : 'text-neon-blue',
                icon: activeTab === 'creators' ? Users : Target
            }}
            hideTabs={true}
            accentColor={activeTab === 'creators' ? 'neon-pink' : 'neon-blue'}
            action={
                <div className="bg-black/40 backdrop-blur-3xl border border-white/10 p-1.5 rounded-full flex items-center gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-x-auto no-scrollbar max-w-[calc(100vw-2rem)] sm:max-w-none">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "group relative px-6 sm:px-8 py-3 rounded-full transition-all duration-500 flex items-center gap-2.5 sm:gap-3 overflow-hidden shrink-0",
                                activeTab === tab.id 
                                    ? "text-white" 
                                    : "text-gray-500 hover:text-white/80"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div 
                                    layoutId="creator-hub-active-pill"
                                    className={cn(
                                        "absolute inset-0 rounded-full -z-0",
                                        tab.id === 'creators' ? "bg-gradient-to-r from-neon-pink/20 to-neon-pink/10 border border-neon-pink/30" : "bg-gradient-to-r from-neon-blue/20 to-neon-blue/10 border border-neon-blue/30"
                                    )}
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                                />
                            )}
                            <tab.icon size={14} className={cn("relative z-10 transition-transform duration-500 group-hover:scale-110 sm:size-[16px]", activeTab === tab.id && (tab.id === 'creators' ? "text-neon-pink" : "text-neon-blue"))} /> 
                            <span className="relative z-10 text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
                        </button>
                    ))}
                </div>
            }
        >
            {/* Dynamic Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className={cn(
                    "absolute top-[20%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[150px] transition-all duration-1000 opacity-20",
                    activeTab === 'creators' ? "bg-neon-pink" : "bg-neon-blue"
                )} />
                <div className={cn(
                    "absolute bottom-[20%] right-[-10%] w-[30%] h-[30%] rounded-full blur-[150px] transition-all duration-1000 opacity-10",
                    activeTab === 'creators' ? "bg-neon-blue" : "bg-neon-pink"
                )} />
            </div>

            <div className="relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 1.02 }}
                        transition={{ 
                            type: "spring",
                            damping: 25,
                            stiffness: 150,
                            mass: 1
                        }}
                    >
                        {activeTab === 'creators' ? (
                            <CreatorManager isEmbedded />
                        ) : (
                            <CampaignManager isEmbedded />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default CreatorHub;
