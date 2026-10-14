import React, { useEffect, useMemo, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import Users from 'lucide-react/dist/esm/icons/users';
import Star from 'lucide-react/dist/esm/icons/star';
import Target from 'lucide-react/dist/esm/icons/target';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import Zap from 'lucide-react/dist/esm/icons/zap';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StatTile } from '../../components/admin/creatorPortal/ui';
import { isPendingCreator, isOpenCampaign, countPendingSubmissions } from '../../components/admin/creatorPortal/creatorUtils';

// Unique key per section so switching tabs cross-fades like the rest of admin.
const getSection = (pathname) => {
    if (pathname.startsWith('/admin/campaigns')) return 'campaigns';
    if (pathname.startsWith('/admin/creators/leaderboard')) return 'leaderboard';
    if (pathname.startsWith('/admin/creators/settings')) return 'settings';
    return 'creators';
};

const CreatorPortalLayout = () => {
    useStoreSubscription(['creators', 'campaigns']);
    const location = useLocation();
    const creators = useStore(state => state.creators);
    const campaigns = useStore(state => state.campaigns);

    // Prefetch sibling routes so clicking tabs is instant.
    useEffect(() => {
        import('./CampaignManager');
        import('./CreatorSettingsPage');
        import('./CreatorManager');
    }, []);

    const stats = useMemo(() => {
        const list = creators || [];
        const camps = campaigns || [];
        return {
            creators: list.length,
            verified: list.filter(c => c.profileStatus === 'approved').length,
            pending: list.filter(isPendingCreator).length,
            openCampaigns: camps.filter(isOpenCampaign).length,
            campaigns: camps.length,
            submissions: camps.reduce((acc, c) => acc + countPendingSubmissions(c), 0),
        };
    }, [creators, campaigns]);

    const section = getSection(location.pathname);
    // Focused screens (a single campaign, the editor) skip the summary strip.
    const isFocusedScreen = /^\/admin\/campaigns\/(create|edit|manage)/.test(location.pathname);
    const showSummary = !isFocusedScreen && (section === 'creators' || section === 'campaigns');

    const tabs = useMemo(() => [
        { name: 'Creators', path: '/admin/creators', icon: Star, badge: stats.pending > 0 ? stats.pending : null },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target, badge: stats.submissions > 0 ? stats.submissions : null },
        { name: 'Leaderboard', path: '/admin/creators/leaderboard', icon: Trophy },
        { name: 'Settings', path: '/admin/creators/settings', icon: Settings },
    ], [stats.pending, stats.submissions]);

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'CREATOR',
                subtitle: 'PORTAL',
                icon: Users,
                accentClass: 'text-neon-pink'
            }}
            accentColor="neon-pink"
            tabs={tabs}
        >
            {showSummary && (
                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile
                        label="Creator roster"
                        value={stats.creators.toLocaleString()}
                        hint={`${stats.verified.toLocaleString()} verified`}
                        icon={Users}
                        to="/admin/creators"
                    />
                    <StatTile
                        label="Pending verification"
                        value={stats.pending.toLocaleString()}
                        hint={stats.pending ? 'Awaiting review' : 'All clear'}
                        icon={Clock}
                        tone={stats.pending ? 'amber' : 'gray'}
                        to="/admin/creators?status=pending"
                    />
                    <StatTile
                        label="Active campaigns"
                        value={stats.openCampaigns.toLocaleString()}
                        hint={`${stats.campaigns.toLocaleString()} total`}
                        icon={Zap}
                        tone="green"
                        to="/admin/campaigns?status=open"
                    />
                    <StatTile
                        label="Pending review"
                        value={stats.submissions.toLocaleString()}
                        hint="Task submissions"
                        icon={Inbox}
                        tone={stats.submissions ? 'amber' : 'gray'}
                        to="/admin/campaigns?status=review"
                    />
                </div>
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={section}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-24">
                            <LoadingSpinner size="md" color="#FF007F" />
                        </div>
                    }>
                        <Outlet />
                    </Suspense>
                </motion.div>
            </AnimatePresence>
        </AdminCommunityHubLayout>
    );
};

export default CreatorPortalLayout;
