import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { buildCampaignUrl, findCampaignById } from '../../lib/campaignLinks';
import { copyToClipboard } from '../../lib/clipboard';
import { Button } from '../../components/admin/ui';
import CampaignList from '../../components/admin/creatorPortal/CampaignList';
import CampaignEditor from '../../components/admin/campaigns/CampaignEditor';
import CampaignManage from '../../components/admin/campaigns/CampaignManage';
import { ConfirmSheet } from '../../components/admin/campaigns/parts';
import { campaignStatus, indexApplicants, summarize, isUniversalCity } from '../../components/admin/campaigns/campaignModel';

/*
 * Creator campaigns: the list (/admin/campaigns), the editor (/create,
 * /create?from=<id> to duplicate, /edit/:id) and one campaign's applicants,
 * deliverables and payments (/manage/:id). Campaign-level actions (status,
 * pin, announce, delete) live here so the list and the manage screen behave
 * the same way.
 */
const CampaignManager = () => {
    useStoreSubscription(['campaigns', 'creators']);
    const campaigns = useStore(s => s.campaigns);
    const creators = useStore(s => s.creators);
    const campaignsLoaded = useStore(s => Boolean(s.subscriptionsLoaded?.campaigns));
    const addToast = useStore(s => s.addToast);
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [searchParams] = useSearchParams();

    const isEditing = location.pathname.includes('/edit/');
    const isCreating = location.pathname.endsWith('/create') || isEditing;
    const editingId = isEditing ? params.id : null;
    const manageId = location.pathname.includes('/manage/') ? params.id : null;
    const duplicateFrom = !isEditing && isCreating ? searchParams.get('from') : null;

    const [busyId, setBusyId] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [notifyToggle, setNotifyToggle] = useState(false);

    const editing = editingId ? findCampaignById(campaigns, editingId) : null;
    const source = duplicateFrom ? findCampaignById(campaigns, duplicateFrom) : null;
    const byCampaign = useMemo(() => indexApplicants(creators), [creators]);

    const goList = () => navigate('/admin/campaigns');
    const goManage = (id) => navigate(`/admin/campaigns/manage/${encodeURIComponent(id)}`);
    const goEdit = (c) => navigate(`/admin/campaigns/edit/${encodeURIComponent(c.id)}`);

    const withBusy = async (id, fn) => {
        if (busyId) return;
        setBusyId(id);
        try { await fn(); } finally { setBusyId(null); }
    };

    const copyLink = (id) => {
        copyToClipboard(buildCampaignUrl(id));
        addToast('Campaign link copied.', 'success');
    };
    const copyTaskLink = (campaignId, taskId) => {
        copyToClipboard(buildCampaignUrl(campaignId, taskId));
        addToast('Task link copied.', 'success');
    };

    const save = async (payload, { notify } = {}) => {
        const store = useStore.getState();
        if (editingId) {
            await store.updateCampaign(editing?.id || editingId, payload, { notify });
            addToast(notify ? 'Saved and announced to matching creators.' : 'Campaign saved.', 'success');
            goManage(editing?.id || editingId);
        } else {
            const id = await store.addCampaign(payload, { notify: notify !== false });
            addToast(payload.status === 'Open'
                ? (notify !== false ? 'Campaign is live. Matching creators are being told.' : 'Campaign is live.')
                : payload.status === 'Draft' ? 'Draft saved.' : 'Campaign created.', 'success');
            if (id) navigate(`/admin/campaigns/manage/${encodeURIComponent(id)}`, { replace: true });
            else goList();
        }
    };

    const patch = (c, updates, okMessage, options) => withBusy(c.id, async () => {
        try {
            await useStore.getState().updateCampaign(c.id, updates, options);
            if (okMessage) addToast(okMessage, 'success');
        } catch {
            addToast("Couldn't update the campaign. Please try again.", 'error');
        }
    });

    const setStatus = (c, status) => {
        const current = campaignStatus(c);
        if (status === 'Open' && current !== 'open') {
            setNotifyToggle(!c.announcedAt);
            setConfirm({ kind: 'open', campaign: c });
            return;
        }
        patch(c, { status }, status === 'Closed' ? 'Applications closed. Selected creators can still submit.' : 'Status updated.');
    };

    const togglePin = (c) => patch(c, { isPinned: !c.isPinned }, c.isPinned ? 'Unpinned.' : 'Pinned to the top.');

    const announce = (c) => setConfirm({ kind: 'announce', campaign: c });

    const askDelete = (c) => setConfirm({ kind: 'delete', campaign: c, stats: summarize(c, byCampaign.get(c.id) || []) });

    const runConfirm = async () => {
        const { kind, campaign: c } = confirm || {};
        if (!c) return;
        if (kind === 'open') {
            await patch(c, { status: 'Open' }, notifyToggle ? 'Campaign is open. Matching creators are being told.' : 'Campaign is open for applications.', { notify: notifyToggle });
        } else if (kind === 'announce') {
            await withBusy(c.id, async () => {
                try {
                    await useStore.getState().announceCampaign(c.id);
                    addToast('Matching creators have been told.', 'success');
                } catch {
                    addToast("Couldn't send the announcement. Please try again.", 'error');
                }
            });
        } else if (kind === 'delete') {
            await withBusy(c.id, async () => {
                try {
                    const result = await useStore.getState().deleteCampaign(c.id);
                    addToast(result?.failed
                        ? `Campaign deleted. ${result.failed} creator profile${result.failed === 1 ? '' : 's'} still list it; they'll be tidied next time.`
                        : 'Campaign deleted.', result?.failed ? 'warning' : 'success');
                    if (manageId || editingId) goList();
                } catch {
                    addToast("Couldn't delete the campaign. Please try again.", 'error');
                }
            });
        }
        setConfirm(null);
    };

    const confirmCampaign = confirm?.campaign;
    const confirmProps = !confirm ? {} : confirm.kind === 'open' ? {
        title: campaignStatus(confirmCampaign) === 'draft' ? 'Publish this campaign?' : 'Reopen applications?',
        message: `Creators can see “${confirmCampaign.title || 'this campaign'}” and apply.`,
        confirmLabel: campaignStatus(confirmCampaign) === 'draft' ? 'Publish' : 'Reopen',
        tone: 'accent',
        toggle: {
            label: 'Tell matching creators',
            hint: confirmCampaign.announcedAt ? 'They were told before. Only turn this on if it’s worth another email.' : `Email and app notification to creators ${isUniversalCity(confirmCampaign.targetCity) ? 'everywhere' : `in ${confirmCampaign.targetCity}`}`,
            value: notifyToggle,
            onChange: setNotifyToggle,
        },
    } : confirm.kind === 'announce' ? {
        title: 'Tell matching creators again?',
        message: `Creators ${isUniversalCity(confirmCampaign.targetCity) ? 'everywhere' : `in ${confirmCampaign.targetCity}`} get an email and an app notification about “${confirmCampaign.title || 'this campaign'}”.`,
        confirmLabel: 'Send',
        tone: 'accent',
    } : {
        title: 'Delete this campaign?',
        tone: 'danger',
        confirmLabel: 'Delete for good',
        message: (
            <>
                “{confirmCampaign.title || 'This campaign'}” and its deliverables go away for good
                {confirm.stats?.applicants ? `, along with ${confirm.stats.applicants} application${confirm.stats.applicants === 1 ? '' : 's'}` : ''}
                {confirm.stats?.toReview ? ` and ${confirm.stats.toReview} submission${confirm.stats.toReview === 1 ? '' : 's'} waiting for review` : ''}.
                {' '}Payment records stay on the creators&apos; profiles.
            </>
        ),
        children: campaignStatus(confirmCampaign) === 'open' ? (
            <Button
                variant="secondary"
                className="h-11 w-full"
                onClick={async () => { const c = confirmCampaign; setConfirm(null); await patch(c, { status: 'Closed' }, 'Applications closed instead. Nothing was deleted.'); }}
            >
                Close applications instead
            </Button>
        ) : null,
    };

    let body;
    if (isCreating) {
        body = (
            <CampaignEditor
                key={editingId || (duplicateFrom ? `copy-${duplicateFrom}` : 'new')}
                isEdit={Boolean(editingId)}
                campaign={editing}
                source={source}
                loaded={campaignsLoaded}
                creators={creators}
                onSave={save}
                onCancel={() => (editingId ? goManage(editing?.id || editingId) : goList())}
                onCopyTaskLink={(taskId) => copyTaskLink(editing?.id || editingId, taskId)}
            />
        );
    } else if (manageId) {
        body = (
            <CampaignManage
                campaignId={manageId}
                onBack={goList}
                onEdit={goEdit}
                onDuplicate={(c) => navigate(`/admin/campaigns/create?from=${encodeURIComponent(c.id)}`)}
                onDelete={askDelete}
                onSetStatus={setStatus}
                onTogglePin={togglePin}
                onPatch={(c, updates, msg) => patch(c, updates, msg)}
                onAnnounce={announce}
                onCopyLink={copyLink}
                onCopyTaskLink={copyTaskLink}
                busyId={busyId}
            />
        );
    } else {
        body = (
            <CampaignList
                campaigns={campaigns}
                creators={creators}
                loaded={campaignsLoaded}
                onOpen={(c) => goManage(c.id)}
                onEdit={goEdit}
                onCreate={() => navigate('/admin/campaigns/create')}
                onDuplicate={(c) => navigate(`/admin/campaigns/create?from=${encodeURIComponent(c.id)}`)}
                onDelete={askDelete}
                onSetStatus={setStatus}
                onTogglePin={togglePin}
                onCopyLink={copyLink}
                busyId={busyId}
            />
        );
    }

    return (
        <>
            {body}
            <ConfirmSheet
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                onConfirm={runConfirm}
                busy={Boolean(busyId)}
                {...confirmProps}
            />
        </>
    );
};

export default CampaignManager;
