import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import CampaignDetailModal from '../components/creator/CampaignDetailModal';
import GlobalLoader from '../components/ui/GlobalLoader';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { ArrowLeft, Compass } from 'lucide-react';

const CampaignPublicView = () => {
    useStoreSubscription(['campaigns']);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { campaigns, subscriptionsLoaded } = useStore();

    const [campaign, setCampaign] = useState(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!campaigns || campaigns.length === 0) return;
        const targetId = (id || '').toLowerCase();
        const found = campaigns.find(c => c.id === id || (c.id && c.id.toLowerCase() === targetId));
        if (found) {
            setCampaign(found);
            setNotFound(false);
        } else if (subscriptionsLoaded) {
            setNotFound(true);
        }
    }, [id, campaigns, subscriptionsLoaded]);

    useDynamicMeta({
        title: campaign ? `${campaign.title} | Creator Brief` : "Creator Campaign",
        description: campaign ? campaign.description?.replace(/<[^>]*>/g, '').slice(0, 160) : "Join this exclusive creator campaign.",
        image: campaign?.thumbnail || campaign?.image || "/og-image.png",
        url: window.location.href
    });

    const handleClose = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/creator-dashboard');
        }
    };

    const taskId = new URLSearchParams(location.search).get('taskId');

    if (notFound) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0c0e14] text-gray-950 dark:text-white flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-5 p-8 rounded-3xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] shadow-xl">
                    <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto text-gray-400">
                        <Compass size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black font-heading uppercase tracking-tight">Campaign Not Found</h2>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            This creator campaign may have concluded or is no longer accepting submissions.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/creator-dashboard')}
                        className="w-full h-12 rounded-2xl bg-black text-white hover:bg-neon-green hover:text-black dark:bg-white dark:text-black dark:hover:bg-neon-green dark:hover:text-black font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={14} />
                        <span>Go to Creator Hub</span>
                    </button>
                </div>
            </div>
        );
    }

    if (!campaign) {
        return <GlobalLoader color="#39ff14" />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#090a0f] relative overflow-hidden flex items-center justify-center">
            {/* Ambient Background Lighting */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-green/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            {/* Campaign Detail Modal rendered as pop-up */}
            <CampaignDetailModal 
                campaign={campaign}
                onClose={handleClose}
                initialTaskId={taskId}
            />
        </div>
    );
};

export default CampaignPublicView;
