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
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { useAccent } from '../../components/admin/theme';
import { cn } from '../../lib/utils';
import { isPendingCreator, countPendingSubmissions } from '../../components/admin/creatorPortal/creatorUtils';
import { indexApplicants } from '../../components/admin/campaigns/campaignModel';

// Unique key per section so switching tabs cross-fades like the rest of admin.
const getSection = (pathname) => {
    if (pathname.startsWith('/admin/campaigns')) return 'campaigns';
    if (pathname.startsWith('/admin/creators/leaderboard')) return 'leaderboard';
    if (pathname.startsWith('/admin/creators/settings')) return 'settings';
    if (pathname.startsWith('/admin/creators/groups')) return 'groups';
    return 'creators';
};

const CreatorPortalLayout = () => {
    useStoreSubscription(['creators', 'campaigns']);
    const location = useLocation();
    const a = useAccent();
    const creators = useStore(state => state.creators);
    const campaigns = useStore(state => state.campaigns);

    // Prefetch sibling routes so clicking tabs is instant.
    useEffect(() => {
        import('./CampaignManager');
        import('./CreatorSettingsPage');
        import('./CreatorManager');
        import('./CreatorGroupsPage');
    }, []);

    const stats = useMemo(() => {
        const list = creators || [];
        const camps = campaigns || [];
        // Same count as the campaigns screens: per applicant, per task.
        const byCampaign = indexApplicants(list);
        return {
            pending: list.filter(isPendingCreator).length,
            submissions: camps.reduce((acc, c) => acc + countPendingSubmissions(c, byCampaign.get(c.id) || []), 0),
        };
    }, [creators, campaigns]);

    const section = getSection(location.pathname);
    // The creators list and the campaigns list each have their own KPI tiles
    // (they filter the list), so the portal adds no summary strip of its own.

    // Campaigns, Groups and Settings have their own sidebar entries (App · Creators); the layout
    // drops tabs that repeat one. The leaderboard is a view of the Creators list, so it only
    // shows there.
    const onCreatorsList = /^\/admin\/creators(\/leaderboard|\/[^/]+)?\/?$/.test(location.pathname) && !/\/(groups|settings)\/?$/.test(location.pathname);
    const tabs = useMemo(() => [
        { name: 'Creators', path: '/admin/creators', icon: Star, badge: stats.pending > 0 ? stats.pending : null },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target, badge: stats.submissions > 0 ? stats.submissions : null },
        { name: 'Groups', path: '/admin/creators/groups', icon: MessageCircle },
        ...(onCreatorsList ? [{ name: 'Leaderboard', path: '/admin/creators/leaderboard', icon: Trophy }] : []),
        { name: 'Settings', path: '/admin/creators/settings', icon: Settings },
    ], [stats.pending, stats.submissions, onCreatorsList]);

    return (
        <AdminCommunityHubLayout
            studioHeader={
                location.pathname.startsWith('/admin/campaigns') ? { title: 'Campaigns', icon: Target, description: 'Briefs, applicants, deliverables and tickets' }
                    : /\/admin\/creators\/groups/.test(location.pathname) ? { title: 'Groups', icon: MessageCircle, description: 'City WhatsApp groups for creators' }
                        : /\/admin\/creators\/settings/.test(location.pathname) ? { title: 'Creator settings', icon: Settings, description: 'Instagram check, minimum followers, welcome points and sign-ups' }
                            : { title: 'Creators', icon: Users, description: 'Roster, approvals and referrals' }
            }
            tabs={tabs}
        >
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
                            <Loader2 size={22} className={cn('animate-spin', a.text)} />
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
