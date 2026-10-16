import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SearchX from 'lucide-react/dist/esm/icons/search-x';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { Button, Sheet } from '../../../components/app';
import { useAppStore } from '../../../lib/store/appStore';
import useDynamicMeta from '../../../hooks/useDynamicMeta';
import { appPath } from '../../host';
import { PageBody } from '../../pages/PageHeader';
import { EmptyState } from '../../pages/parts';
import CampaignView from './CampaignView';

/*
 * /c/:id, the campaign page.
 *
 * Opened from a list (link state { backgroundLocation }), it's a sheet over
 * that list: full height on phones, a dialog on desktop, and closing goes
 * back. Opened from a shared link, it's a normal page in the app shell.
 */

const useCampaign = (id) => {
    const open = useAppStore(s => s.openCampaigns.find(c => c.id === id));
    const loaded = useAppStore(s => s.campaignsById[id]);
    const loadCampaign = useAppStore(s => s.loadCampaign);
    useEffect(() => { if (!open) loadCampaign(id); }, [id, open, loadCampaign]);
    // undefined while loading, null when it doesn't exist.
    return open || loaded;
};

const Loading = () => (
    <div className="space-y-4">
        <div className="aspect-video animate-pulse rounded-3xl bg-black/[0.05] dark:bg-white/[0.05]" />
        <div className="h-8 w-3/4 animate-pulse rounded-xl bg-black/[0.05] dark:bg-white/[0.05]" />
        <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
    </div>
);

const Missing = () => (
    <EmptyState
        icon={SearchX}
        title="Campaign not found"
        message="It may have ended or the link is wrong."
        action={<Button variant="secondary" to={appPath('/creator')}>See open campaigns</Button>}
    />
);

const CampaignPage = ({ overlay = false }) => {
    const { id } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const campaign = useCampaign(id);
    const taskId = params.get('taskId');

    useDynamicMeta(campaign ? {
        title: campaign.title,
        description: String(campaign.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || undefined,
        image: campaign.thumbnail || undefined,
    } : { page: 'campaign' });

    const close = () => {
        if (location.state?.backgroundLocation) navigate(-1);
        else navigate(appPath('/creator'), { replace: true });
    };

    if (overlay) {
        if (campaign) return <CampaignView campaign={campaign} variant="sheet" initialTaskId={taskId} onClose={close} />;
        return (
            <Sheet open onClose={close} size="full" width="lg" header={<span className="sr-only">Campaign</span>}>
                {campaign === null ? <Missing /> : <Loading />}
            </Sheet>
        );
    }

    return (
        <PageBody>
            <div className="mx-auto max-w-2xl">
                <Button variant="ghost" size="sm" icon={ArrowLeft} to={appPath('/creator')} className="-ml-2 mb-3">Campaigns</Button>
                {campaign ? <CampaignView campaign={campaign} variant="page" initialTaskId={taskId} /> : campaign === null ? <Missing /> : <Loading />}
            </div>
        </PageBody>
    );
};

export default CampaignPage;
