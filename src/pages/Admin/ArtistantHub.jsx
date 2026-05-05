import React, { useState } from 'react';
import { Mic2, Briefcase, Users, FileText, ClipboardList, Ticket, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import ArtistManager from './ArtistManager';
import ClientRequestManager from './ClientRequestManager';
import artistantLogo from '../../assets/logo/artistant.png';

const ArtistantHub = () => {
    const [activeTab, setActiveTab] = useState('talent'); // 'talent' | 'requests'

    const tabs = [
        { id: 'talent', label: 'TALENT', icon: Mic2 },
        { id: 'requests', label: 'REQUESTS', icon: Briefcase }
    ];

    const hubTabs = [
        { name: 'Artistant', path: '/admin/artistant', icon: Mic2 },
        { name: 'Ticketing', path: '/admin/tickets', icon: Ticket },
        { name: 'Invoices', path: '/admin/invoices', icon: FileText },
    ];

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'ARTISTANT',
                subtitle: 'HUB',
                accentClass: activeTab === 'talent' ? 'text-neon-blue' : 'text-neon-green',
                logo: artistantLogo
            }}
            hideTabs={true}
            accentColor={activeTab === 'talent' ? 'neon-blue' : 'neon-green'}
            action={
                <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-1.5 rounded-full flex items-center gap-1 shadow-2xl">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 relative",
                                activeTab === tab.id 
                                    ? "text-black" 
                                    : "text-gray-500 hover:text-white"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div 
                                    layoutId="artistant-hub-active-pill"
                                    className="absolute inset-0 bg-white rounded-full -z-0"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <tab.icon size={14} className="relative z-10" /> 
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>
            }
        >
            <div className="relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'talent' ? (
                            <ArtistManager isEmbedded />
                        ) : (
                            <ClientRequestManager isEmbedded />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default ArtistantHub;
