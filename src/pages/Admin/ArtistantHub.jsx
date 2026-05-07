import React, { useState } from 'react';
import { Mic2, Briefcase, Sparkles, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import ArtistManager from './ArtistManager';
import ClientRequestManager from './ClientRequestManager';
import CreatorManager from './CreatorManager';
import CampaignManager from './CampaignManager';
import artistantLogo from '../../assets/logo/artistant.png';
import { Users, Target } from 'lucide-react';

const ArtistantHub = () => {
    const [activeTab, setActiveTab] = useState('talent'); // 'talent' | 'requests'

    const tabs = [
        { id: 'talent', label: 'TALENT ROSTER', icon: Mic2, description: 'Manage and verify artist profiles' },
        { id: 'requests', label: 'CLIENT REQUESTS', icon: Briefcase, description: 'Track and process booking inquiries' },
        { id: 'creators', label: 'CREATORS', icon: Users, description: 'Manage creator profiles and verification' },
        { id: 'campaigns', label: 'CAMPAIGNS', icon: Target, description: 'Manage missions and task submissions' }
    ];

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'ARTISTANT',
                subtitle: 'COMMAND CENTER',
                accentClass: activeTab === 'talent' ? 'text-neon-blue' : 
                             activeTab === 'requests' ? 'text-neon-green' :
                             activeTab === 'creators' ? 'text-neon-pink' : 'text-neon-blue',
                logo: artistantLogo
            }}
            hideTabs={true}
            accentColor={activeTab === 'talent' ? 'neon-blue' : 
                         activeTab === 'requests' ? 'neon-green' :
                         activeTab === 'creators' ? 'neon-pink' : 'neon-blue'}
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
                                    layoutId="artistant-hub-active-pill"
                                    className={cn(
                                        "absolute inset-0 rounded-full -z-0",
                                        tab.id === 'talent' ? "bg-gradient-to-r from-neon-blue/20 to-neon-blue/10 border border-neon-blue/30" : 
                                        tab.id === 'requests' ? "bg-gradient-to-r from-neon-green/20 to-neon-green/10 border border-neon-green/30" :
                                        tab.id === 'creators' ? "bg-gradient-to-r from-neon-pink/20 to-neon-pink/10 border border-neon-pink/30" :
                                        "bg-gradient-to-r from-neon-blue/20 to-neon-blue/10 border border-neon-blue/30"
                                    )}
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                                />
                            )}

                            <tab.icon size={14} className={cn("relative z-10 transition-transform duration-500 group-hover:scale-110 sm:size-[16px]", 
                                activeTab === tab.id && (
                                    tab.id === 'talent' ? "text-neon-blue" : 
                                    tab.id === 'requests' ? "text-neon-green" :
                                    tab.id === 'creators' ? "text-neon-pink" : "text-neon-blue"
                                ))} /> 
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
                    activeTab === 'talent' ? "bg-neon-blue" : 
                    activeTab === 'requests' ? "bg-neon-green" :
                    activeTab === 'creators' ? "bg-neon-pink" : "bg-neon-blue"
                )} />
                <div className={cn(
                    "absolute bottom-[20%] right-[-10%] w-[30%] h-[30%] rounded-full blur-[150px] transition-all duration-1000 opacity-10",
                    activeTab === 'talent' ? "bg-neon-pink" : 
                    activeTab === 'requests' ? "bg-neon-blue" :
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
                        {activeTab === 'talent' ? (
                            <ArtistManager isEmbedded />
                        ) : activeTab === 'requests' ? (
                            <ClientRequestManager isEmbedded />
                        ) : activeTab === 'creators' ? (
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

export default ArtistantHub;

