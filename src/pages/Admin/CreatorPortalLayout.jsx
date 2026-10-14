import React, { useEffect, useMemo, Suspense } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import Users from 'lucide-react/dist/esm/icons/users';
import Target from 'lucide-react/dist/esm/icons/target';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button, StatTile } from '../../components/admin/creatorPortal/ui';
import { isPendingCreator, isOpenCampaign, countPendingSubmissions } from '../../components/admin/creatorPortal/creatorUtils';

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

    // Warm up sibling screens so switching tabs doesn't wait on a chunk download.
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
    // Focused screens (a single campaign, the campaign editor) get the full width.
    const isFocusedScreen = /^\/admin\/campaigns\/(create|edit|manage)/.test(location.pathname);

    const tabs = [
        { id: 'creators', label: 'Creators', to: '/admin/creators', icon: Users, count: stats.pending || null, countTone: 'amber' },
        { id: 'campaigns', label: 'Campaigns', to: '/admin/campaigns', icon: Target, count: stats.submissions || null, countTone: 'amber' },
        { id: 'leaderboard', label: 'Referrals', to: '/admin/creators/leaderboard', icon: Trophy },
        { id: 'settings', label: 'Settings', to: '/admin/creators/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-24 pt-24 font-sans text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 md:pt-28">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white">
                            <ArrowLeft size={14} /> Admin
                        </Link>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Creator portal</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                            Review creators, run campaigns and manage the creator program.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button as="a" href="/creator" target="_blank" rel="noopener noreferrer" variant="secondary">
                            Public page <ExternalLink size={14} />
                        </Button>
                        <Button as="a" href="/creator-dashboard" target="_blank" rel="noopener noreferrer" variant="secondary">
                            Creator dashboard <ExternalLink size={14} />
                        </Button>
                    </div>
                </div>

                {/* Summary */}
                {!isFocusedScreen && (
                    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile label="Creators" value={stats.creators.toLocaleString()} hint={`${stats.verified.toLocaleString()} verified`} icon={Users} to="/admin/creators" />
                        <StatTile
                            label="Pending review"
                            value={stats.pending.toLocaleString()}
                            hint={stats.pending ? 'Applications waiting for a decision' : 'Nothing waiting'}
                            icon={Clock}
                            tone={stats.pending ? 'amber' : 'gray'}
                            to="/admin/creators?status=pending"
                        />
                        <StatTile label="Open campaigns" value={stats.openCampaigns.toLocaleString()} hint={`${stats.campaigns.toLocaleString()} in total`} icon={Target} to="/admin/campaigns?status=open" />
                        <StatTile
                            label="Submissions to review"
                            value={stats.submissions.toLocaleString()}
                            hint="Task submissions across campaigns"
                            icon={Inbox}
                            tone={stats.submissions ? 'amber' : 'gray'}
                            to="/admin/campaigns?status=review"
                        />
                    </div>
                )}

                {/* Section tabs */}
                <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-zinc-800" aria-label="Creator portal sections">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = section === tab.id;
                        return (
                            <NavLink
                                key={tab.id}
                                to={tab.to}
                                className={cn(
                                    '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors',
                                    active
                                        ? 'border-gray-900 font-medium text-gray-900 dark:border-white dark:text-white'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200'
                                )}
                            >
                                <Icon size={15} />
                                {tab.label}
                                {tab.count ? (
                                    <span className="rounded-full bg-amber-100 px-1.5 text-xs font-medium tabular-nums text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                                        {tab.count}
                                    </span>
                                ) : null}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="pt-6">
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-24">
                            <LoadingSpinner size="md" color="#71717a" />
                        </div>
                    }>
                        <Outlet />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default CreatorPortalLayout;
