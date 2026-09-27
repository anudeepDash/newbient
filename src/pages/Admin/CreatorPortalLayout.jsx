import React, { useMemo, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { useStore } from '../../lib/store';
import Users from 'lucide-react/dist/esm/icons/users';
import Star from 'lucide-react/dist/esm/icons/star';
import Target from 'lucide-react/dist/esm/icons/target';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Settings from 'lucide-react/dist/esm/icons/settings';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const CreatorPortalLayout = () => {
    const location = useLocation();
    const { creators } = useStore();

    // Prefetch sibling routes so clicking tabs is instantaneous with zero chunk load delay
    useEffect(() => {
        import('./CampaignManager');
        import('./CreatorSettingsPage');
        import('./CreatorManager');
    }, []);

    const pendingCount = useMemo(() => {
        return (creators || []).filter(c => !c.profileStatus || c.profileStatus === 'pending').length;
    }, [creators]);

    const personnelTabs = useMemo(() => [
        { name: 'Creators', path: '/admin/creators', icon: Star, badge: pendingCount > 0 ? pendingCount : null },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target },
        { name: 'Leaderboard', path: '/admin/creators/leaderboard', icon: Trophy },
        { name: 'Settings', path: '/admin/creators/settings', icon: Settings },
    ], [pendingCount]);

    // Unique key per tab for buttery smooth cross-fade animation
    const getTabKey = (pathname) => {
        if (pathname.includes('/leaderboard')) return 'leaderboard';
        if (pathname.includes('/settings') || pathname.includes('/groups')) return 'settings';
        if (pathname.startsWith('/admin/campaigns')) return 'campaigns';
        return 'creators';
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'CREATOR',
                subtitle: 'PORTAL',
                icon: Users,
                accentClass: 'text-neon-pink'
            }}
            accentColor="neon-pink"
            tabs={personnelTabs}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={getTabKey(location.pathname)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ 
                        duration: 0.2, 
                        ease: [0.25, 0.1, 0.25, 1] 
                    }}
                >
                    <Suspense fallback={
                        <div className="py-24 flex items-center justify-center">
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
