import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import Lock from 'lucide-react/dist/esm/icons/lock';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Send from 'lucide-react/dist/esm/icons/send';
import Home from 'lucide-react/dist/esm/icons/home';
import AccessNotice from './admin/workspace/AccessNotice';
import { Button } from './admin/ui';
import GlobalLoader from './ui/GlobalLoader';
import useDynamicMeta from '../hooks/useDynamicMeta';

const getAdminTitle = (pathname) => {
    const path = pathname.replace(/\/$/, '');
    if (path === '/admin') return 'Dashboard';
    if (path === '/admin/system-command' || path === '/admin/settings' || path === '/admin/dev-settings') return 'System Settings';
    if (path === '/admin/manage-admins') return 'Manage Admins';
    if (path === '/admin/invoices') return 'Invoice Management';
    if (path === '/admin/create-invoice') return 'Create Invoice';
    if (path.startsWith('/admin/edit-invoice/')) return 'Edit Invoice';
    if (path === '/admin/announcements') return 'Announcements';
    if (path === '/admin/concertzone') return 'Concert Manager';
    if (path === '/admin/messages') return 'Messages';
    if (path === '/admin/whatsapp') return 'WhatsApp';
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
    return 'Admin';
};

const AdminGuard = ({ children }) => {
    const { user, authInitialized, setAuthModal } = useStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [requesting, setRequesting] = useState(false);

    const adminTitle = getAdminTitle(location.pathname);
    useDynamicMeta({ page: 'admin', title: adminTitle, url: window.location.href });

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
        user.role !== 'admin' &&
        user.role !== 'editor' && 
        user.role !== 'scanner' && 
        user.role !== 'content_admin' && 
        user.role !== 'gate_manager' && 
        user.role !== 'blog_writer'
    )) {
        const isPending = user?.role === 'pending';
        const canRequest = user?.role === 'unauthorized';
        return (
            <AccessNotice
                icon={!user ? LogIn : isPending ? Clock : Lock}
                tone={!user ? 'blue' : isPending ? 'amber' : 'gray'}
                title={!user ? 'Sign in to open the admin' : isPending ? 'Your request is waiting for approval' : "You don't have admin access"}
                note={user?.email ? `Signed in as ${user.email}` : undefined}
                actions={(
                    <>
                        {!user ? (
                            <Button variant="primary" onClick={() => setAuthModal(true)} className="h-12 w-full">
                                <LogIn size={16} /> Sign in
                            </Button>
                        ) : canRequest ? (
                            <Button
                                variant="primary"
                                disabled={requesting}
                                onClick={async () => {
                                    try {
                                        setRequesting(true);
                                        await useStore.getState().requestAdminAccess();
                                    } catch (err) {
                                        useStore.getState().addToast(err?.message || 'Please try again.', 'error', { title: "Couldn't send your access request" });
                                        setRequesting(false);
                                    }
                                }}
                                className="h-12 w-full"
                            >
                                <Send size={15} /> {requesting ? 'Sending request…' : 'Ask for admin access'}
                            </Button>
                        ) : null}
                        <Button variant="secondary" onClick={() => navigate('/')} className="h-12 w-full">
                            <Home size={15} /> Go to the website
                        </Button>
                    </>
                )}
            >
                {!user
                    ? 'The admin is for the Newbi team. Sign in with the account your team added.'
                    : isPending
                        ? "A founder will review it soon. You'll get an email when you're in, then reload this page."
                        : canRequest
                            ? 'This account is not on the team yet. You can ask for access and a founder will review it.'
                            : "This account can't open this part of the admin. Ask a founder if you need it."}
            </AccessNotice>
        );
    }

    return children;
};

export default AdminGuard;
