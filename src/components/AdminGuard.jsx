import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import { ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import GlobalLoader from './ui/GlobalLoader';
import useDynamicMeta from '../hooks/useDynamicMeta';

const getAdminTitle = (pathname) => {
    const path = pathname.replace(/\/$/, '');
    if (path === '/admin') return 'Admin Dashboard';
    if (path === '/admin/system-command') return 'System Settings';
    if (path === '/admin/manage-admins') return 'Manage Admins';
    if (path === '/admin/invoices') return 'Invoice Management';
    if (path === '/admin/create-invoice') return 'Create Invoice';
    if (path.startsWith('/admin/edit-invoice/')) return 'Edit Invoice';
    if (path === '/admin/announcements') return 'Announcements';
    if (path === '/admin/concertzone') return 'Concert Manager';
    if (path === '/admin/messages') return 'Messages';
    if (path === '/admin/mailing') return 'Mailing Manager';
    if (path === '/admin/proposals') return 'Proposals';
    if (path === '/admin/create-proposal') return 'Create Proposal';
    if (path.startsWith('/admin/edit-proposal/')) return 'Edit Proposal';
    if (path === '/admin/agreements') return 'Agreements';
    if (path === '/admin/agreements/new') return 'New Agreement';
    if (path.startsWith('/admin/agreements/edit/')) return 'Edit Agreement';
    if (path === '/admin/forms') return 'Forms';
    if (path === '/admin/forms/create') return 'Create Form';
    if (path.startsWith('/admin/forms/edit/')) return 'Edit Form';
    if (path === '/admin/artists') return 'Artists';
    if (path === '/admin/client-requests') return 'Client Requests';
    if (path === '/admin/artistant') return 'Artistant Hub';
    if (path === '/admin/volunteer-gigs') return 'Volunteer Gigs';
    if (path === '/admin/guestlists') return 'Guestlist';
    if (path === '/admin/upcoming-events') return 'Upcoming Events';
    if (path === '/admin/creators') return 'Creators';
    if (path.startsWith('/admin/creators/')) return 'Creator Details';
    if (path === '/admin/campaigns') return 'Campaigns';
    if (path === '/admin/campaigns/create') return 'Create Campaign';
    if (path.startsWith('/admin/campaigns/edit/')) return 'Edit Campaign';
    if (path.startsWith('/admin/campaigns/manage/')) return 'Manage Campaign';
    if (path === '/admin/giveaways') return 'Giveaways';
    if (path.includes('/participants')) return 'Giveaway Participants';
    if (path === '/admin/blog') return 'Concert Zone Studio';
    if (path === '/admin/concertzone/studio') return 'Concert Zone Studio';
    if (path === '/admin/blog/create') return 'Create Blog Post';
    if (path.startsWith('/admin/blog/edit/')) return 'Edit Blog Post';
    if (path === '/admin/newsletter/studio') return 'Newsletter Studio';
    if (path === '/admin/scanner') return 'Event Scanner';
    if (path === '/admin/ticketing') return 'Ticketing Management';
    return 'Admin Command';
};

const AdminGuard = ({ children }) => {
    const { user, authInitialized, setAuthModal } = useStore();
    const location = useLocation();

    const adminTitle = getAdminTitle(location.pathname);
    useDynamicMeta({
        title: adminTitle,
        description: "Newbi Administrative Command.",
        url: window.location.href
    });

    const getColorByPath = (path) => {
        if (path.startsWith('/admin')) return '#00F0FF';
        if (path.startsWith('/concertzone')) return '#FF4F8B';
        if (path.startsWith('/artistant')) return '#A855F7';
        return '#39FF14';
    };

    if (!authInitialized) {
        return <GlobalLoader color={getColorByPath(location.pathname)} />;
    }



    if (!user || (
        user.role !== 'founder' &&
        user.role !== 'super_admin' && 
        user.role !== 'developer' && 
        user.role !== 'editor' && 
        user.role !== 'scanner' && 
        user.role !== 'content_admin' && 
        user.role !== 'gate_manager' && 
        user.role !== 'blog_writer'
    )) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full text-center space-y-8"
                >
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md">
                            <ShieldAlert size={14} className="text-red-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Restricted Access</span>
                        </div>
                    </div>

                    <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] border border-red-500/20 flex items-center justify-center mx-auto mb-8">
                        <ShieldAlert className="text-red-500" size={48} />
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black font-heading text-white uppercase italic tracking-tighter">ACCESS DENIED.</h1>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                            Your credentials do not have the required authority to access the <span className="text-neon-green">Newbi Admin Dashboard</span>.
                        </p>
                    </div>

                    <div className="pt-8 space-y-4">
                        {!user ? (
                            <button 
                                onClick={() => setAuthModal(true)}
                                className="px-8 h-14 bg-neon-blue text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all w-full shadow-[0_10px_30px_rgba(0,180,255,0.2)]"
                            >
                                AUTHENTICATE ACCESS
                            </button>
                        ) : (user.role === 'unauthorized') ? (
                            <button 
                                onClick={async () => {
                                    try {
                                        const btn = document.activeElement;
                                        btn.disabled = true;
                                        btn.innerText = 'SENDING REQUEST...';
                                        await useStore.getState().requestAdminAccess();
                                    } catch (err) {
                                        useStore.getState().addToast(err.message || "Failed to send request", 'error');
                                        const btn = document.activeElement;
                                        btn.disabled = false;
                                        btn.innerText = 'REQUEST COMMAND ACCESS';
                                    }
                                }}
                                className="px-8 h-14 bg-neon-green text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all w-full shadow-[0_10px_30px_rgba(57,255,20,0.2)]"
                            >
                                REQUEST ADMIN ACCESS
                            </button>
                        ) : user.role === 'pending' ? (
                            <div className="p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-center">
                                <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.2em]">AUTHORIZATION PENDING</p>
                                <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">AWAITING ADMIN APPROVAL</p>
                            </div>
                        ) : null}

                        <button 
                            onClick={() => window.location.href = '/'}
                            className="px-8 h-14 bg-white/5 border border-white/5 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 transition-all w-full"
                        >
                            Return to Safe Zone
                        </button>
                    </div>
                    
                    <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.4em]">
                        {user?.role === 'pending' ? 'Request Persistence Active' : 'Access Attempt Logged'}
                    </p>
                </motion.div>
            </div>
        );
    }

    return children;
};

export default AdminGuard;
