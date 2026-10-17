import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Pin from 'lucide-react/dist/esm/icons/pin';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import Send from 'lucide-react/dist/esm/icons/send';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Users from 'lucide-react/dist/esm/icons/users';
import Star from 'lucide-react/dist/esm/icons/star';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import UserX from 'lucide-react/dist/esm/icons/user-x';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Gift from 'lucide-react/dist/esm/icons/gift';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Zap from 'lucide-react/dist/esm/icons/zap';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Layers from 'lucide-react/dist/esm/icons/layers';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Upload from 'lucide-react/dist/esm/icons/upload';
import MailCheck from 'lucide-react/dist/esm/icons/mail-check';
import { cn, getCampaignSpotsInfo, normalizePhoneNumber } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { notifySpecificUser } from '../../../lib/notificationTriggers';
import { notifyEvent } from '../../../lib/mailApi';
import { creatorCampaignPath, findCampaignById } from '../../../lib/campaignLinks';
import { copyToClipboard } from '../../../lib/clipboard';
import { exportSubtitle, fileDate } from '../../../lib/xlsx';
import { accent } from '../theme';
import {
    Avatar, Badge, Button, Card, EmptyState, Menu, MenuItem, SearchInput, SegmentedTabs, Select, StatTile,
} from '../ui';
import { Toggle } from '../uploads/UploadKit';
import ExportMenu from '../ExportMenu';
import CreatorDetailModal from '../CreatorDetailModal';
import ApplicantSheet from './ApplicantSheet';
import { MessageSheet, PayoutSheet, ChangesSheet } from './ActionSheets';
import TicketsSheet from './TicketsSheet';
import ShortlistUploadSheet from './ShortlistUploadSheet';
import { clientSheetSpec, newbiIdOf } from './shortlistModel';
import CampaignTickets from './CampaignTickets';
import { canGetTicket, passFor, passesByCreator, useCampaignPasses } from './ticketModel';
import { passesPost } from '../../../lib/passesApi';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import { BrandMark, CampaignStatusPill, CampaignThumb, CheckBox, ConfirmSheet, Spinner, StageBadge } from './parts';
import {
    STAGES, applicantsFor, campaignStatus, creatorHandle, creatorPhotoOf, creatorKeys, creatorRef, formatCount, formatDay,
    inr, stageMeta, taskTypeOf, platformOf, daysUntil, waNumber, isUniversalCity,
} from './campaignModel';
import { isRequiredTask } from '../../../lib/creator/tasks';
import OutreachTab from './outreach/OutreachTab';
import { canSeeOutreach } from './outreach/outreachApi';

const SELECTED_STAGES = ['selected', 'review', 'approved', 'paid'];
const SORTS = [
    { value: 'recommended', label: 'Best match first' },
    { value: 'followers', label: 'Most followers' },
    { value: 'name', label: 'Name A–Z' },
];

const CampaignManage = ({
    campaignId, onBack, onEdit, onDuplicate, onDelete, onSetStatus, onTogglePin, onPatch, onAnnounce, onCopyLink, onCopyTaskLink, busyId,
}) => {
    const campaigns = useStore(s => s.campaigns);
    const creators = useStore(s => s.creators);
    const loaded = useStore(s => Boolean(s.subscriptionsLoaded?.campaigns));
    const addToast = useStore(s => s.addToast);
    const showOutreach = useStore(s => canSeeOutreach(s.user?.role));
    const campaign = findCampaignById(campaigns, campaignId);

    const [searchParams, setSearchParams] = useSearchParams();
    const tab = ['applicants', 'deliverables', 'tickets', 'brief', ...(showOutreach ? ['outreach'] : [])].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'applicants';
    const stageFilter = ['all', ...STAGES.map(s => s.value)].includes(searchParams.get('stage')) ? searchParams.get('stage') : 'all';
    const openKey = searchParams.get('creator') || '';
    const setParams = (patch, push = false) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([key, value]) => {
            if (!value || value === 'all' || (key === 'tab' && value === 'applicants')) next.delete(key); else next.set(key, value);
        });
        setSearchParams(next, { replace: !push });
    };
    // Opening a creator adds a history entry, so Back closes the panel.
    const setParam = (key, value) => setParams({ [key]: value }, key === 'creator' && Boolean(value));
    const showStage = (value) => setParams({ tab: null, stage: stageFilter === value ? null : value });

    const [query, setQuery] = useState('');
    const [fit, setFit] = useState('all');
    const [sort, setSort] = useState('recommended');
    const [checked, setChecked] = useState(() => new Set());
    const [busy, setBusy] = useState(false);
    const [profile, setProfile] = useState(null);
    const [messageTo, setMessageTo] = useState(null);
    const [payTo, setPayTo] = useState(null);
    const [changes, setChanges] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [confirmToggle, setConfirmToggle] = useState(true);
    const [taskFilter, setTaskFilter] = useState('review');
    const [showBrief, setShowBrief] = useState(false);
    const [ticketsFor, setTicketsFor] = useState(null); // entries for the Send tickets sheet
    const [uploadOpen, setUploadOpen] = useState(false); // the client's shortlist CSV
    const { passes, loaded: passesLoaded, error: passesError } = useCampaignPasses(campaign?.id);
    const passMap = useMemo(() => passesByCreator(passes), [passes]);

    const applicants = useMemo(() => (campaign ? applicantsFor(campaign, creators) : []), [campaign, creators]);
    const byKey = useMemo(() => new Map(applicants.map(a => [a.key, a])), [applicants]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(STAGES.map(s => [s.value, 0]));
        applicants.forEach(a => { c[a.stage] += 1; });
        return c;
    }, [applicants]);
    const totalToReview = applicants.reduce((n, a) => n + a.progress.toReview, 0);
    const paidOut = applicants.reduce((n, a) => n + (a.payout?.status === 'paid' ? Number(a.payout.amount) || 0 : 0), 0);
    const selectedCount = applicants.filter(a => SELECTED_STAGES.includes(a.stage)).length;
    const qualifyingUndecided = applicants.filter(a => (a.stage === 'applied' || a.stage === 'shortlisted') && a.criteria.eligible);

    useEffect(() => { setChecked(new Set()); }, [stageFilter, tab, campaignId]);

    const visible = useMemo(() => {
        const term = query.trim().toLowerCase();
        const rank = (a) => (a.criteria.eligible ? 2 : 0) + (a.criteria.nicheMatch ? 1 : 0);
        return applicants
            .filter(a => stageFilter === 'all' || a.stage === stageFilter)
            .filter(a => fit === 'all' || (fit === 'match' ? a.criteria.eligible : !a.criteria.eligible))
            .filter(a => {
                if (!term) return true;
                const c = a.creator;
                return [c.name, c.instagram, c.city, c.phone, c.email, c.creatorId].some(v => String(v || '').toLowerCase().includes(term));
            })
            .sort((x, y) => {
                if (sort === 'name') return String(x.creator.name || '').localeCompare(String(y.creator.name || ''));
                if (sort === 'recommended') {
                    if (x.progress.toReview !== y.progress.toReview) return y.progress.toReview - x.progress.toReview;
                    if (rank(x) !== rank(y)) return rank(y) - rank(x);
                }
                return y.criteria.followers - x.criteria.followers;
            });
    }, [applicants, stageFilter, fit, query, sort]);

    if (!campaign) {
        return (
            <Card className="rounded-2xl">
                {loaded ? (
                    <EmptyState icon={AlertCircle} tone="rose" title="Campaign not found" description="It may have been deleted, or the link is wrong." action={<Button onClick={onBack}>Back to campaigns</Button>} />
                ) : (
                    <div className="flex justify-center py-16 text-gray-400"><Spinner className="h-6 w-6" /></div>
                )}
            </Card>
        );
    }

    const status = campaignStatus(campaign);
    const spots = getCampaignSpotsInfo(campaign, creators);
    const tasks = campaign.tasks || [];
    const checkedEntries = visible.filter(a => checked.has(a.key));
    const allChecked = visible.length > 0 && checkedEntries.length === visible.length;

    /* ---------- actions ---------- */

    const guard = async (fn) => {
        if (busy) return;
        setBusy(true);
        try { await fn(); } finally { setBusy(false); }
    };

    const reportPartial = (result, okText) => {
        const failed = result?.failed?.length || 0;
        if (failed) addToast(`${okText} ${failed} couldn't be saved. Please try those again.`, 'warning');
        else addToast(okText, 'success');
    };

    // The campaign's auto-send rule (editor → Event tickets): Newbi passes go out on selection or when the work is done.
    const autoIssue = async (entries, rule) => {
        if (!campaign.eventId || campaign.ticketAutoIssue !== rule) return;
        const ids = entries.filter(e => { const p = passFor(passMap, e.creator); return !p || p.qr === false; }).map(e => e.creator.id);
        if (!ids.length) return;
        const res = await passesPost('issue-campaign', { campaignId: campaign.id, creatorIds: ids.slice(0, 25) }, { timeoutMs: 60000 });
        if (!res.ok) { addToast(`Tickets weren't sent: ${res.error}`, 'warning'); return; }
        const sent = res.data.results.filter(r => ['issued', 'updated'].includes(r.outcome)).length;
        if (sent) addToast(`${sent === 1 ? 'Ticket' : `${sent} tickets`} sent automatically.`, 'success');
    };

    /*
     * The welcome for shortlisted creators: the server sends email, WhatsApp (template
     * campaign_shortlisted), push and the in-app alert with the group link, once per creator.
     * `again` resends to people who already got it.
     */
    const sendWelcome = async (entries, again = false) => {
        const ids = entries.map(e => e.creator.id || e.key);
        if (!ids.length) return;
        const res = await notifyEvent('campaign-shortlisted', { campaignId: campaign.id, creatorIds: ids, again });
        if (!res?.success) {
            addToast(`The welcome wasn't sent: ${res?.error || 'try again'}. Use “Send the welcome again”.`, 'warning');
            return;
        }
        const sent = (res.results || []).filter(r => r.delivery);
        const wa = sent.filter(r => r.delivery.whatsapp === 'sent').length;
        const mail = sent.filter(r => ['sent', 'queued', 'duplicate'].includes(r.delivery.email)).length;
        if (!sent.length) { addToast(again ? 'Nobody to send it to.' : 'They already had the welcome.', 'info'); return; }
        addToast(`Welcome sent to ${sent.length}: ${mail} by email, ${wa} on WhatsApp${wa < sent.length ? ' (the rest have no verified number, or the template isn’t live yet)' : ''}.`, 'success');
    };

    const selectEntries = (entries, notify = true) => guard(async () => {
        try {
            const keys = entries.map(e => e.key);
            const result = await useStore.getState().bulkShortlistCreators(campaign.id, keys, true);
            reportPartial(result, result.done.length === 1 ? 'Creator shortlisted.' : `${result.done.length} creators shortlisted.`);
            setChecked(new Set());
            const done = entries.filter(e => result.done.includes(e.key));
            if (notify) await sendWelcome(done);
            await autoIssue(done, 'selected');
        } catch {
            addToast("Couldn't shortlist those creators. Please try again.", 'error');
        }
    });

    const resendWelcome = (entries) => guard(() => sendWelcome(entries, true));

    const unselectEntries = (entries) => guard(async () => {
        try {
            const result = await useStore.getState().bulkShortlistCreators(campaign.id, entries.map(e => e.key), false);
            reportPartial(result, entries.length === 1 ? 'Removed from the campaign.' : `${result.done.length} removed from the campaign.`);
            setChecked(new Set());
        } catch {
            addToast("Couldn't remove them. Please try again.", 'error');
        }
    });

    const setStage = (entries, stage, notify = false) => guard(async () => {
        try {
            const result = await useStore.getState().setCampaignApplicantMeta(campaign.id, entries.map(e => e.key), { stage });
            if (stage === 'declined' && notify) {
                await Promise.allSettled(result.done.map(k => notifySpecificUser(
                    k, `About ${campaign.title}`, `Thanks for applying to "${campaign.title}". You weren't picked this time, but keep an eye out for the next one.`, '/creator-dashboard', 'campaign'
                )));
            }
            const label = stage === 'declined' ? 'Marked as not selected.' : stage === 'shortlisted' ? 'Marked as considering.' : 'Moved back to applied.';
            reportPartial(result, label);
            setChecked(new Set());
        } catch {
            addToast("Couldn't save that. Please try again.", 'error');
        }
    });

    const savePayout = async (entries, payout, notify) => {
        try {
            const record = { status: 'paid', amount: payout.amount, paidAt: payout.paidAt, note: payout.note, recordedAt: new Date().toISOString() };
            const result = await useStore.getState().setCampaignApplicantMeta(campaign.id, entries.map(e => e.key), { payout: record });
            if (notify) {
                await Promise.allSettled(result.done.map(k => notifySpecificUser(
                    k, 'Payment sent', `We've sent ${payout.amount ? inr(payout.amount) : 'your payment'} for "${campaign.title}". Thanks for the great work!`, creatorCampaignPath(campaign.id), 'campaign'
                )));
            }
            reportPartial(result, entries.length === 1 ? 'Marked as paid.' : `${result.done.length} marked as paid.`);
            setChecked(new Set());
        } catch {
            addToast("Couldn't save the payment. Please try again.", 'error');
            throw new Error('payout failed');
        }
    };

    const unpay = (entry) => guard(async () => {
        try {
            await useStore.getState().setCampaignApplicantMeta(campaign.id, [entry.key], { payout: null });
            addToast('Payment record removed.', 'success');
        } catch {
            addToast("Couldn't undo the payment. Please try again.", 'error');
        }
    });

    const review = async (items, statusValue, reason = '') => {
        // items: [{ entry, task }]
        try {
            await useStore.getState().reviewTaskSubmissions(campaign.id, items.map(({ entry, task }) => ({
                taskId: task.id, creatorUid: entry.key, keys: creatorKeys(entry.creator), status: statusValue, rejectionReason: reason,
            })));
            // The server tells each creator (email, push and the in-app alert).
            const told = await notifyEvent('submission-reviewed', {
                campaignId: campaign.id,
                campaignPath: creatorCampaignPath(campaign.id),
                reviews: items.map(({ entry, task }) => ({ uid: entry.key, taskId: task.id, taskTitle: task.title, status: statusValue === 'approved' ? 'approved' : 'changes', reason })),
            });
            if (!told?.success) {
                await Promise.allSettled(items.map(({ entry, task }) => notifySpecificUser(
                    entry.key,
                    statusValue === 'approved' ? 'Task approved' : 'Changes requested on your task',
                    statusValue === 'approved'
                        ? `Your submission for "${task.title}" has been approved. Great work!`
                        : `Your submission for "${task.title}" needs a few changes: ${reason}`,
                    creatorCampaignPath(campaign.id),
                    'campaign'
                )));
            }
            addToast(statusValue === 'approved' ? (items.length === 1 ? 'Approved.' : `${items.length} submissions approved.`) : 'Feedback sent.', 'success');
            if (statusValue === 'approved') {
                // Creators whose required tasks are now all approved (counting the ones just approved).
                const justApproved = new Map();
                items.forEach(({ entry, task }) => {
                    if (!justApproved.has(entry.key)) justApproved.set(entry.key, { entry, tasks: new Set() });
                    justApproved.get(entry.key).tasks.add(task.id);
                });
                const done = [...justApproved.values()].filter(({ entry, tasks }) => {
                    const required = entry.progress.items.filter(i => i.task.priority !== 'optional');
                    return required.length > 0 && required.every(i => i.status === 'approved' || tasks.has(i.task.id));
                }).map(x => x.entry);
                await autoIssue(done, 'completed');
            }
        } catch {
            addToast("Couldn't save your review. Please try again.", 'error');
            throw new Error('review failed');
        }
    };
    const approve = (entry, task) => guard(() => review([{ entry, task }], 'approved').catch(() => {}));

    const copyList = (entries, kind) => {
        const list = entries.map(a => (kind === 'handles'
            ? (creatorHandle(a.creator) ? `@${creatorHandle(a.creator)}` : null)
            : (a.creator.phone ? normalizePhoneNumber(a.creator.phone) : null))).filter(Boolean);
        if (!list.length) { addToast(kind === 'handles' ? 'No Instagram handles to copy.' : 'No phone numbers to copy.', 'info'); return; }
        copyToClipboard(list.join(', '));
        addToast(`${list.length} ${kind === 'handles' ? 'handles' : 'phone numbers'} copied.`, 'success');
    };

    const askSelect = (entries) => {
        const left = spots.hasSpots ? spots.spotsLeft : null;
        setConfirmToggle(true);
        setConfirm({
            kind: 'select',
            entries,
            title: entries.length === 1 ? `Shortlist ${entries[0].creator.name || 'this creator'}?` : `Shortlist ${entries.length} creators?`,
            message: (
                <>
                    They can then see and submit the deliverables in the campaign{campaign.whatsappLink ? ', and get the WhatsApp group link' : ''}.
                    {!campaign.whatsappLink && <span className="mt-2 block text-[13px] text-gray-500">No WhatsApp group link yet. Add one in the editor to include it in the welcome.</span>}
                    {spots.hasSpots && spots.totalSpots && selectedCount + entries.length > spots.totalSpots && (
                        <span className="mt-2 block font-semibold text-amber-600 dark:text-amber-300">
                            That makes {selectedCount + entries.length} selected for {spots.totalSpots} spots{left !== null ? ` (${left} left)` : ''}.
                        </span>
                    )}
                </>
            ),
            confirmLabel: 'Shortlist',
            toggleLabel: 'Send the welcome: email, WhatsApp and the app',
        });
    };
    const askDecline = (entries) => {
        setConfirmToggle(false);
        setConfirm({
            kind: 'decline',
            entries,
            title: entries.length === 1 ? 'Mark as not selected?' : `Mark ${entries.length} as not selected?`,
            message: 'They stay in the list under “Not selected”, and you can change this later.',
            confirmLabel: 'Not selected',
            tone: 'danger',
            toggleLabel: 'Send a polite “not this time” note',
        });
    };
    const askUnselect = (entries) => {
        setConfirm({
            kind: 'unselect',
            entries,
            title: entries.length === 1 ? `Remove ${entries[0].creator.name || 'this creator'} from the campaign?` : `Remove ${entries.length} creators from the campaign?`,
            message: 'They lose access to the deliverables. Anything they already submitted is kept.',
            confirmLabel: 'Remove',
            tone: 'danger',
        });
    };
    const askApproveAll = (task, items) => {
        setConfirm({
            kind: 'approveAll',
            task,
            items,
            title: `Approve ${items.length} submission${items.length === 1 ? '' : 's'}?`,
            message: `Everything waiting for review on “${task.title}” is approved and each creator is told.`,
            confirmLabel: 'Approve all',
            tone: 'success',
        });
    };
    const runConfirm = async () => {
        const c = confirm;
        if (!c) return;
        if (c.kind === 'select') await selectEntries(c.entries, confirmToggle);
        if (c.kind === 'decline') await setStage(c.entries, 'declined', confirmToggle);
        if (c.kind === 'unselect') await unselectEntries(c.entries);
        if (c.kind === 'approveAll') await guard(() => review(c.items, 'approved').catch(() => {}));
        setConfirm(null);
    };

    const openEntry = openKey ? byKey.get(openKey) : null;

    const exportSpec = () => ({
        filename: `${(campaign.title || 'campaign').replace(/[^\w-]+/g, '_').slice(0, 40)}_applicants_${fileDate()}`,
        sheetName: 'Applicants',
        title: `${campaign.title || 'Campaign'} · applicants`,
        subtitle: exportSubtitle(visible.length, 'applicant', stageFilter !== 'all' ? stageMeta(stageFilter).label : null),
        rows: visible,
        totals: { paid: true },
        columns: [
            { header: 'Newbi ID', value: a => newbiIdOf(a.creator) },
            { header: 'Name', width: 24, value: a => a.creator.name || '' },
            { header: 'Instagram', value: a => (creatorHandle(a.creator) ? `@${creatorHandle(a.creator)}` : '') },
            { header: 'Followers', type: 'number', value: a => a.criteria.followers },
            { header: 'City', value: a => a.creator.city || '' },
            { header: 'Phone', value: a => a.creator.phone || '' },
            { header: 'Email', width: 28, value: a => a.creator.email || '' },
            { header: 'Stage', value: a => stageMeta(a.stage).label },
            { header: 'Meets criteria', value: a => (a.criteria.eligible ? 'Yes' : 'No') },
            { header: 'Niche match', value: a => (a.criteria.nicheMatch ? 'Yes' : '') },
            { header: 'Tasks approved', type: 'number', value: a => a.progress.approved },
            { header: 'Tasks to review', type: 'number', value: a => a.progress.toReview },
            { header: 'Paid', key: 'paid', type: 'money', value: a => (a.payout?.status === 'paid' ? Number(a.payout.amount) || 0 : null) },
            { header: 'Paid on', type: 'date', value: a => (a.payout?.status === 'paid' ? a.payout.paidAt || null : null) },
            { header: 'Payment note', value: a => a.payout?.note || '' },
        ],
    });

    /* ---------- pieces ---------- */

    const primaryAction = (a) => {
        if (a.stage === 'review') return <Button size="sm" variant="secondary" onClick={() => setParam('creator', a.key)} className="h-10"><Inbox size={13} className="text-amber-500" /> Review {a.progress.toReview}</Button>;
        if (a.stage === 'approved') return <Button size="sm" variant="success" onClick={() => setPayTo([a])} className="h-10"><Wallet size={13} /> Mark paid</Button>;
        if (a.stage === 'paid') return <Badge tone="teal" className="h-8 px-3 text-[12px]"><Wallet size={11} /> {inr(a.payout?.amount)}</Badge>;
        if (a.stage === 'selected') {
            const wa = waNumber(a.creator.phone);
            return wa
                ? <Button as="a" size="sm" variant="secondary" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="h-10"><MessageCircle size={13} className="text-emerald-500" /> Chat</Button>
                : <Button size="sm" variant="secondary" onClick={() => setMessageTo([a])} className="h-10"><Send size={13} /> Message</Button>;
        }
        return <Button size="sm" variant="accent" onClick={() => askSelect([a])} disabled={busy} className="h-10"><UserCheck size={13} /> Shortlist</Button>;
    };

    const tasksTab = (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedTabs value={taskFilter} onChange={setTaskFilter} items={[
                    { value: 'review', label: 'To review', count: totalToReview, highlight: totalToReview > 0 },
                    { value: 'all', label: 'Everyone' },
                ]} />
                <Button variant="secondary" onClick={() => onEdit(campaign)} className="h-11"><Pencil size={14} /> Edit deliverables</Button>
            </div>
            {tasks.length === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState icon={Layers} title="No deliverables yet" description="Add the stories, reels or posts selected creators should make." action={<Button variant="accent" onClick={() => onEdit(campaign)}>Add deliverables</Button>} />
                </Card>
            ) : selectedCount === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState icon={UserCheck} title="Nobody selected yet" description="Select creators from the applicants, and their submissions show up here." action={<Button variant="accent" onClick={() => setParam('tab', 'applicants')}>Go to applicants</Button>} />
                </Card>
            ) : tasks.map((task, idx) => {
                const rows = applicants
                    .filter(a => SELECTED_STAGES.includes(a.stage) || a.progress.items.find(i => i.task.id === task.id)?.sub)
                    .map(a => ({ a, item: a.progress.items.find(i => i.task.id === task.id) }));
                const pending = rows.filter(r => r.item?.status === 'submitted');
                const approved = rows.filter(r => r.item?.status === 'approved').length;
                const shown = taskFilter === 'review' ? pending : rows;
                const TypeIcon = taskTypeOf(task.taskType).icon;
                const due = daysUntil(task.deadline);
                if (taskFilter === 'review' && pending.length === 0) return null;
                return (
                    <Card key={task.id || idx} className="overflow-hidden rounded-2xl">
                        <div className="flex flex-wrap items-center gap-3 border-b border-black/[0.06] p-4 dark:border-white/[0.06]">
                            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent('pink').chip)}><TypeIcon size={18} /></span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-bold">{task.title || `Deliverable ${idx + 1}`}</p>
                                <p className="flex flex-wrap items-center gap-x-2.5 text-[12px] text-gray-500">
                                    <span>{platformOf(task.platform).label}</span>
                                    {!isRequiredTask(task) && <span>Optional</span>}
                                    {task.deadline && <span className={cn(due !== null && due < 0 && 'font-semibold text-rose-600 dark:text-rose-300')}>Due {formatDay(task.deadline)}</span>}
                                    <span>{approved} of {rows.length} approved</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {pending.length > 1 && (
                                    <Button size="sm" variant="success" onClick={() => askApproveAll(task, pending.map(r => ({ entry: r.a, task })))} disabled={busy} className="h-10"><CheckCheck size={14} /> Approve all {pending.length}</Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => onCopyTaskLink(campaign.id, task.id)} aria-label="Copy task link" className="h-10 w-10 px-0"><Share2 size={14} /></Button>
                            </div>
                        </div>
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map(({ a, item }) => {
                                const st = item?.status || 'not_started';
                                const sub = item?.sub;
                                const link = sub?.contentLink && /^https?:\/\//i.test(sub.contentLink) ? sub.contentLink : sub?.proofUrl;
                                const wa = waNumber(a.creator.phone);
                                return (
                                    <li key={a.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                                        <button type="button" onClick={() => setParam('creator', a.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                            <Avatar src={creatorPhotoOf(a.creator)} name={a.creator.name} size={36} />
                                            <span className="min-w-0">
                                                <span className="block truncate text-[14px] font-semibold">{a.creator.name || 'Creator'}</span>
                                                <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-gray-500">
                                                    <Badge tone={st === 'approved' ? 'green' : st === 'submitted' ? 'amber' : st === 'rejected' ? 'rose' : 'gray'}>
                                                        {st === 'approved' ? 'Approved' : st === 'submitted' ? 'To review' : st === 'rejected' ? 'Changes asked' : 'Not started'}
                                                    </Badge>
                                                    {sub?.submittedAt && <span>{formatDay(sub.submittedAt)}</span>}
                                                </span>
                                            </span>
                                        </button>
                                        <div className="flex items-center gap-2 sm:justify-end">
                                            {link && (
                                                <Button as="a" size="sm" variant="secondary" href={link} target="_blank" rel="noopener noreferrer" className="h-10"><ExternalLink size={13} /> View</Button>
                                            )}
                                            {st === 'submitted' && (
                                                <>
                                                    <Button size="sm" variant="success" onClick={() => approve(a, task)} disabled={busy} className="h-10 flex-1 sm:flex-none"><Check size={14} /> Approve</Button>
                                                    <Button size="sm" variant="secondary" onClick={() => setChanges({ entry: a, task })} disabled={busy} className="h-10 flex-1 sm:flex-none"><X size={14} /> Changes</Button>
                                                </>
                                            )}
                                            {st === 'not_started' && wa && (
                                                <Button
                                                    as="a" size="sm" variant="ghost" target="_blank" rel="noopener noreferrer" className="h-10"
                                                    href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${a.creator.name || ''}! A quick reminder about "${task.title}" for ${campaign.title}${task.deadline ? `, due ${formatDay(task.deadline)}` : ''}. Send it in from your Creator Studio when it's live.`)}`}
                                                >
                                                    <MessageCircle size={13} className="text-emerald-500" /> Nudge
                                                </Button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                );
            })}
            {taskFilter === 'review' && totalToReview === 0 && tasks.length > 0 && selectedCount > 0 && (
                <Card className="rounded-2xl">
                    <EmptyState icon={CheckCheck} tone="green" title="All caught up" description="Nothing is waiting for review. New submissions appear here." action={<Button onClick={() => setTaskFilter('all')}>See everyone</Button>} />
                </Card>
            )}
        </div>
    );

    const settingsRow = (label, hint, checkedValue, onChange) => (
        <div className="py-2">
            <Toggle label={label} hint={hint} checked={checkedValue} onChange={(v) => { if (busyId !== campaign.id) onChange(v); }} />
        </div>
    );

    const briefTab = (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="rounded-2xl p-5">
                <h3 className="text-[15px] font-bold">Brief</h3>
                {campaign.description ? (
                    <div className="prose prose-sm mt-3 max-w-none text-gray-700 dark:prose-invert dark:text-zinc-300 [&_a]:text-sky-600" dangerouslySetInnerHTML={{ __html: campaign.description }} />
                ) : <p className="mt-2 text-[13px] text-gray-500">No brief yet.</p>}
                {tasks.length > 0 && (
                    <>
                        <h3 className="mt-6 text-[15px] font-bold">Deliverables</h3>
                        <ul className="mt-2 space-y-1.5">
                            {tasks.map((t, i) => (
                                <li key={t.id || i} className="flex items-center gap-2 text-[13px]">
                                    <span className={cn('h-1.5 w-1.5 rounded-full', accent('pink').dot)} />
                                    <span className="font-semibold">{t.title}</span>
                                    <span className="text-gray-500">{[platformOf(t.platform).label, !isRequiredTask(t) ? 'optional' : null, t.deadline ? `due ${formatDay(t.deadline)}` : null].filter(Boolean).join(' · ')}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                <Button variant="secondary" onClick={() => onEdit(campaign)} className="mt-5 h-11"><Pencil size={14} /> Edit campaign</Button>
            </Card>
            <div className="space-y-4">
                <Card className="rounded-2xl p-5">
                    <h3 className="mb-1 text-[15px] font-bold">Settings</h3>
                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        {settingsRow('Accepting applications', status === 'draft' ? 'Draft: turning this on publishes it' : 'Open campaigns take new applicants', status === 'open', (v) => onSetStatus(campaign, v ? 'Open' : 'Closed'))}
                        {settingsRow('Apply from the website', 'From the public campaign page', campaign.websiteApplyEnabled !== false, (v) => onPatch(campaign, { websiteApplyEnabled: v }, v ? 'Website applications are on.' : 'Website applications are off.'))}
                        {settingsRow('Pinned to the top', 'Shows first in lists', Boolean(campaign.isPinned), () => onTogglePin(campaign))}
                    </div>
                </Card>
                <Card className="rounded-2xl p-5">
                    <h3 className="mb-3 text-[15px] font-bold">Share</h3>
                    <div className="grid gap-2">
                        <Button variant="secondary" onClick={() => onCopyLink(campaign.id)} className="h-11 justify-start"><Share2 size={14} /> Copy public link</Button>
                        <Button as={Link} to={`/campaign/${encodeURIComponent(campaign.id)}`} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-11 justify-start"><ExternalLink size={14} /> Open public page</Button>
                        {campaign.whatsappLink && <Button as="a" href={campaign.whatsappLink} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-11 justify-start"><MessageCircle size={14} className="text-emerald-500" /> Creator WhatsApp group</Button>}
                        {status === 'open' && (
                            <Button variant="secondary" onClick={() => onAnnounce(campaign)} disabled={busyId === campaign.id} className="h-11 justify-start">
                                <Megaphone size={14} /> Tell matching creators again
                            </Button>
                        )}
                    </div>
                    {campaign.announcedAt && <p className="mt-2 text-[12px] text-gray-500">Last announced {formatDay(campaign.announcedAt, true)}</p>}
                </Card>
            </div>
        </div>
    );

    const applicantsTab = (
        <div className="space-y-4">
            {qualifyingUndecided.length > 0 && status !== 'closed' && (
                <div className={cn('flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center', accent('pink').border, accent('pink').soft)}>
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent('pink').chip)}><Zap size={18} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold">{qualifyingUndecided.length} applicant{qualifyingUndecided.length === 1 ? ' meets' : 's meet'} the rules</p>
                        <p className="text-[12px] text-gray-600 dark:text-zinc-400">
                            {Number(campaign.minInstagramFollowers) > 0 ? `${formatCount(campaign.minInstagramFollowers)}+ followers` : 'Any follower count'}
                            {!isUniversalCity(campaign.targetCity) ? `, based in ${campaign.targetCity}` : ''}. Shortlist them all at once, go one by one, or upload the client&apos;s picks.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => { setFit('match'); setParams({ stage: 'applied' }); }} className="h-11 flex-1 sm:flex-none">Review them</Button>
                        <Button variant="accent" onClick={() => askSelect(qualifyingUndecided)} disabled={busy} className="h-11 flex-1 sm:flex-none"><UserCheck size={14} /> Shortlist {qualifyingUndecided.length}</Button>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <SearchInput value={query} onChange={setQuery} placeholder="Name, @handle, city or phone" className="xl:w-80 xl:shrink-0" />
                <div className="flex flex-1 items-center gap-2">
                    <Select value={fit} onChange={setFit} label="Fit" className="min-w-0 flex-1 xl:w-48 xl:flex-none" options={[
                        { value: 'all', label: 'Everyone' },
                        { value: 'match', label: 'Meets the rules' },
                        { value: 'below', label: "Doesn't meet them" },
                    ]} />
                    <Select value={sort} onChange={setSort} label="Sort" className="hidden min-w-0 flex-1 sm:inline-flex xl:w-48 xl:flex-none" options={SORTS} />
                    <ExportMenu getSpec={() => clientSheetSpec(campaign, applicants, { fileDate, exportSubtitle })} label="Client sheet" hint="Every applicant, no phone or email, with a Shortlist column" />
                    <Button variant="secondary" onClick={() => setUploadOpen(true)} disabled={!applicants.length} className="h-11"><Upload size={14} /><span className="hidden sm:inline">Upload shortlist</span></Button>
                    <ExportMenu getSpec={exportSpec} label="Export" hint="Everything we hold, with phone and email (internal)" className="hidden sm:inline-flex" />
                </div>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs
                    value={stageFilter}
                    onChange={(v) => setParam('stage', v)}
                    items={[
                        { value: 'all', label: 'All', count: applicants.length },
                        ...STAGES.filter(s => counts[s.value] > 0 || s.value === stageFilter || ['applied', 'selected'].includes(s.value)).map(s => ({
                            value: s.value, label: s.label, count: counts[s.value], highlight: s.value === 'review' && counts.review > 0,
                        })),
                    ]}
                />
            </div>

            {applicants.length === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState
                        icon={Users}
                        title="No applications yet"
                        description={status === 'open' ? 'Share the campaign link with creators, or tell matching creators about it.' : status === 'draft' ? 'Publish the campaign so creators can apply.' : 'Reopen applications to let creators apply.'}
                        action={status === 'open'
                            ? <Button variant="accent" onClick={() => onCopyLink(campaign.id)}><Share2 size={14} /> Copy link</Button>
                            : <Button variant="accent" onClick={() => onSetStatus(campaign, 'Open')}>{status === 'draft' ? 'Publish' : 'Reopen applications'}</Button>}
                    />
                </Card>
            ) : visible.length === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState icon={Users} title="Nobody here" description="Try another stage, filter or search." action={<Button onClick={() => { setQuery(''); setFit('all'); setParam('stage', null); }}>Show everyone</Button>} />
                </Card>
            ) : (
                <Card className="overflow-hidden rounded-2xl">
                    <div className="flex items-center gap-2 border-b border-black/[0.06] px-2 py-1.5 dark:border-white/[0.06] sm:px-3">
                        <CheckBox
                            checked={allChecked}
                            mixed={!allChecked && checkedEntries.length > 0}
                            onChange={() => setChecked(allChecked ? new Set() : new Set(visible.map(a => a.key)))}
                            label="Select all shown"
                        />
                        <span className="text-[12px] font-semibold text-gray-500">
                            {checkedEntries.length ? `${checkedEntries.length} of ${visible.length} ticked` : `${visible.length} shown`}
                        </span>
                    </div>
                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                        {visible.map(a => {
                            const c = a.creator;
                            const handle = creatorHandle(c);
                            return (
                                <li key={a.key} className={cn('relative flex items-start gap-1 py-2.5 pl-2 pr-3 transition-colors sm:items-center sm:pl-3', checked.has(a.key) ? accent('pink').soft : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.02]')}>
                                    <CheckBox
                                        checked={checked.has(a.key)}
                                        onChange={(v) => setChecked(prev => { const n = new Set(prev); if (v) n.add(a.key); else n.delete(a.key); return n; })}
                                        label={`Tick ${c.name || 'creator'}`}
                                    />
                                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                        <button type="button" onClick={() => setParam('creator', a.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                            <Avatar src={creatorPhotoOf(c)} name={c.name} size={42} />
                                            <span className="min-w-0">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="truncate text-[15px] font-bold">{c.name || 'Creator'}</span>
                                                    {c.instagramVerified && <ShieldCheck size={14} className="shrink-0 text-sky-500" aria-label="Instagram verified" />}
                                                </span>
                                                <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-gray-500">
                                                    {handle && <span className="inline-flex items-center gap-1"><Instagram size={11} /> @{handle}</span>}
                                                    <span className={cn('inline-flex items-center gap-1', !a.criteria.meetsFollowers && 'font-semibold text-amber-600 dark:text-amber-300')}>
                                                        <Users size={11} /> {formatCount(a.criteria.followers)}
                                                    </span>
                                                    <span className={cn('inline-flex items-center gap-1', a.criteria.cityTargeted && !a.criteria.meetsCity && 'font-semibold text-amber-600 dark:text-amber-300')}>
                                                        <MapPin size={11} /> {c.city || 'No city'}
                                                    </span>
                                                </span>
                                            </span>
                                        </button>
                                        <div className="flex flex-wrap items-center gap-1.5 pl-[54px] sm:w-[260px] sm:pl-0">
                                            <StageBadge stage={a.stage} />
                                            {a.criteria.eligible ? <Badge tone="green"><Check size={10} strokeWidth={3} /> Meets rules</Badge> : <Badge tone="amber">Below rules</Badge>}
                                            {a.criteria.nicheMatch && <Badge tone="violet"><Sparkles size={10} /> Niche</Badge>}
                                            {SELECTED_STAGES.includes(a.stage) && a.progress.total > 0 && (
                                                <span className="text-[11px] font-semibold text-gray-500">{a.progress.approved}/{a.progress.total} done</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 pl-[54px] sm:pl-0">
                                            {primaryAction(a)}
                                            <Button size="sm" variant="ghost" onClick={() => setParam('creator', a.key)} aria-label="Open" className="hidden h-10 w-10 px-0 sm:inline-flex"><ChevronRight size={16} /></Button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            )}

            {/* Bulk actions for ticked applicants */}
            {checkedEntries.length > 0 && (
                <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 lg:bottom-4">
                    <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95">
                        <span className="px-2 text-[13px] font-bold">{checkedEntries.length} ticked</span>
                        <div className="ml-auto flex flex-wrap items-center gap-1.5">
                            {checkedEntries.some(a => !SELECTED_STAGES.includes(a.stage)) && (
                                <Button size="sm" variant="accent" onClick={() => askSelect(checkedEntries.filter(a => !SELECTED_STAGES.includes(a.stage)))} disabled={busy} className="h-10"><UserCheck size={13} /> Shortlist</Button>
                            )}
                            {checkedEntries.some(a => a.stage === 'approved' || a.stage === 'selected' || a.stage === 'review') && (
                                <Button size="sm" variant="success" onClick={() => setPayTo(checkedEntries.filter(a => SELECTED_STAGES.includes(a.stage) && a.stage !== 'paid'))} disabled={busy} className="hidden h-10 sm:inline-flex"><Wallet size={13} /> Mark paid</Button>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => setMessageTo(checkedEntries)} className="h-10"><Send size={13} /> Message</Button>
                            {checkedEntries.some(canGetTicket) && (
                                <Button size="sm" variant="secondary" onClick={() => setTicketsFor(checkedEntries.filter(canGetTicket))} className="h-10"><Ticket size={13} /> Tickets</Button>
                            )}
                            <Menu trigger={({ toggle }) => (
                                <Button size="sm" variant="secondary" onClick={toggle} aria-label="More bulk actions" className="h-10 w-10 px-0"><MoreHorizontal size={15} /></Button>
                            )}>
                                {checkedEntries.some(a => a.stage === 'applied' || a.stage === 'declined') && (
                                    <MenuItem icon={Star} onClick={() => setStage(checkedEntries.filter(a => a.stage === 'applied' || a.stage === 'declined'), 'shortlisted')} hint="Your private list; they aren't told">Mark as considering</MenuItem>
                                )}
                                {checkedEntries.some(a => a.stage === 'applied' || a.stage === 'shortlisted') && (
                                    <MenuItem icon={UserX} onClick={() => askDecline(checkedEntries.filter(a => a.stage === 'applied' || a.stage === 'shortlisted'))}>Mark as not selected</MenuItem>
                                )}
                                {checkedEntries.some(a => a.stage === 'shortlisted' || a.stage === 'declined') && (
                                    <MenuItem icon={Undo2} onClick={() => setStage(checkedEntries.filter(a => a.stage === 'shortlisted' || a.stage === 'declined'), null)}>Move back to applied</MenuItem>
                                )}
                                {checkedEntries.some(a => SELECTED_STAGES.includes(a.stage)) && (
                                    <MenuItem icon={MailCheck} onClick={() => resendWelcome(checkedEntries.filter(a => SELECTED_STAGES.includes(a.stage)))} hint="Email, WhatsApp and the app, with the group link">Send the welcome again</MenuItem>
                                )}
                                {checkedEntries.some(a => SELECTED_STAGES.includes(a.stage) && a.stage !== 'paid') && (
                                    <MenuItem icon={Wallet} onClick={() => setPayTo(checkedEntries.filter(a => SELECTED_STAGES.includes(a.stage) && a.stage !== 'paid'))}>Mark paid</MenuItem>
                                )}
                                <MenuItem icon={Instagram} onClick={() => copyList(checkedEntries, 'handles')}>Copy Instagram handles</MenuItem>
                                <MenuItem icon={Phone} onClick={() => copyList(checkedEntries, 'phones')} hint="For a WhatsApp broadcast list">Copy phone numbers</MenuItem>
                                {checkedEntries.some(a => SELECTED_STAGES.includes(a.stage)) && (
                                    <MenuItem icon={UserX} danger onClick={() => askUnselect(checkedEntries.filter(a => SELECTED_STAGES.includes(a.stage)))}>Remove from campaign</MenuItem>
                                )}
                            </Menu>
                            <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())} aria-label="Clear ticks" className="h-10 w-10 px-0"><X size={15} /></Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center gap-2">
                <button type="button" onClick={onBack} className="-ml-2 flex h-10 items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    <ChevronLeft size={16} /> Campaigns
                </button>
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="secondary" onClick={() => onCopyLink(campaign.id)} className="h-10"><Share2 size={14} /><span className="hidden sm:inline">Copy link</span></Button>
                    <Button variant="secondary" onClick={() => onEdit(campaign)} className="h-10"><Pencil size={14} /> Edit</Button>
                    <Menu trigger={({ toggle }) => (
                        <Button variant="secondary" onClick={toggle} aria-label="More campaign actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
                    )}>
                        <MenuItem as={Link} to={`/campaign/${encodeURIComponent(campaign.id)}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open public page</MenuItem>
                        <MenuItem icon={Ticket} onClick={() => setTicketsFor([])} hint="Newbi passes or official tickets (CSV)">Send tickets</MenuItem>
                        <MenuItem icon={Copy} onClick={() => onDuplicate(campaign)} hint="Opens a copy as a draft">Duplicate</MenuItem>
                        <MenuItem icon={Pin} disabled={busyId === campaign.id} onClick={() => onTogglePin(campaign)}>{campaign.isPinned ? 'Unpin' : 'Pin to top'}</MenuItem>
                        {status === 'open' && <MenuItem icon={Megaphone} disabled={busyId === campaign.id} onClick={() => onAnnounce(campaign)} hint="Email + app notification">Tell matching creators again</MenuItem>}
                        {status === 'draft' && <MenuItem icon={Send} disabled={busyId === campaign.id} onClick={() => onSetStatus(campaign, 'Open')}>Publish</MenuItem>}
                        {status === 'open' && <MenuItem icon={Lock} disabled={busyId === campaign.id} onClick={() => onSetStatus(campaign, 'Closed')}>Close applications</MenuItem>}
                        {status === 'closed' && <MenuItem icon={Unlock} disabled={busyId === campaign.id} onClick={() => onSetStatus(campaign, 'Open')}>Reopen applications</MenuItem>}
                        <div className="my-1 border-t border-black/[0.05] dark:border-white/[0.08]" />
                        <MenuItem icon={Trash2} danger disabled={busyId === campaign.id} onClick={() => onDelete(campaign)}>Delete campaign</MenuItem>
                    </Menu>
                </div>
            </div>

            <Card className="overflow-hidden rounded-2xl">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                    <CampaignThumb campaign={campaign} className="aspect-video w-full shrink-0 self-start rounded-xl sm:w-56" />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <CampaignStatusPill campaign={campaign} />
                            {campaign.isPinned && <Badge tone="blue"><Pin size={10} /> Pinned</Badge>}
                            {campaign.websiteApplyEnabled === false && <Badge tone="gray">Website apply off</Badge>}
                            <BrandMark campaign={campaign} />
                        </div>
                        <h2 className="mt-2 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">{campaign.title || 'Untitled campaign'}</h2>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-600 dark:text-zinc-300">
                            <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-pink-500 dark:text-neon-pink" /> {campaign.targetCity || 'Any city'}</span>
                            {campaign.targetCollege && campaign.targetCollege !== 'Any' && <span className="inline-flex items-center gap-1.5"><GraduationCap size={14} className="text-sky-500" /> {campaign.targetCollege}</span>}
                            {campaign.reward && <span className="inline-flex items-center gap-1.5"><Gift size={14} className="text-emerald-500" /> {campaign.reward}</span>}
                            <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-violet-500" /> {Number(campaign.minInstagramFollowers) > 0 ? `${formatCount(campaign.minInstagramFollowers)}+ followers` : 'Any follower count'}</span>
                            {spots.hasSpots && <span className={cn('inline-flex items-center gap-1.5', spots.isFull && 'font-semibold text-rose-600 dark:text-rose-300')}>{spots.isFull ? 'All spots taken' : `${spots.spotsLeft}${spots.totalSpots ? ` of ${spots.totalSpots}` : ''} spots left`}</span>}
                        </div>
                        {campaign.description && (
                            <div className="mt-3">
                                <div className={cn('prose prose-sm max-w-none text-[13px] text-gray-600 dark:prose-invert dark:text-zinc-400', !showBrief && 'line-clamp-2')} dangerouslySetInnerHTML={{ __html: campaign.description }} />
                                <button type="button" onClick={() => setShowBrief(v => !v)} className="mt-1 h-8 text-[12px] font-semibold text-pink-600 dark:text-neon-pink">{showBrief ? 'Show less' : 'Read the brief'}</button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <StatTile icon={Users} tone="blue" label="Applied" value={counts.applied} hint={counts.declined ? `${counts.declined} not selected` : `${applicants.length} in total`} active={stageFilter === 'applied' && tab === 'applicants'} onClick={() => showStage('applied')} />
                <StatTile icon={Star} tone="violet" label="Considering" value={counts.shortlisted} hint="Not told yet" active={stageFilter === 'shortlisted' && tab === 'applicants'} onClick={() => showStage('shortlisted')} />
                <StatTile icon={UserCheck} tone="pink" label="Shortlisted" value={selectedCount} hint={spots.totalSpots ? `of ${spots.totalSpots} spots` : 'Working on deliverables'} active={stageFilter === 'selected' && tab === 'applicants'} onClick={() => showStage('selected')} />
                <StatTile icon={Inbox} tone={totalToReview ? 'amber' : 'gray'} label="To review" value={totalToReview} hint={counts.review ? `From ${counts.review} creator${counts.review === 1 ? '' : 's'}` : 'All caught up'} active={tab === 'deliverables'} onClick={() => setParam('tab', tab === 'deliverables' ? null : 'deliverables')} />
                <StatTile icon={CheckCheck} tone="green" label="Approved" value={counts.approved} hint="Ready to pay" active={stageFilter === 'approved' && tab === 'applicants'} onClick={() => showStage('approved')} />
                <StatTile icon={Wallet} tone="teal" label="Paid" value={inr(paidOut)} hint={`${counts.paid} creator${counts.paid === 1 ? '' : 's'}${campaign.payoutPerCreator ? ` · ${inr(campaign.payoutPerCreator)} each` : ''}`} active={stageFilter === 'paid' && tab === 'applicants'} onClick={() => showStage('paid')} />
            </div>

            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs
                    value={tab}
                    onChange={(v) => setParam('tab', v)}
                    items={[
                        { value: 'applicants', label: 'Applicants', count: applicants.length },
                        { value: 'deliverables', label: 'Deliverables', count: totalToReview || undefined, highlight: totalToReview > 0 },
                        ...(campaign.eventId || passes.length ? [{ value: 'tickets', label: 'Tickets', count: passes.filter(p => p.status !== 'revoked').length || undefined }] : []),
                        ...(showOutreach ? [{ value: 'outreach', label: 'Outreach' }] : []),
                        { value: 'brief', label: 'Brief and settings' },
                    ]}
                />
            </div>

            {tab === 'applicants' ? applicantsTab : tab === 'deliverables' ? tasksTab : tab === 'outreach' ? <OutreachTab campaign={campaign} /> : tab === 'tickets' ? (
                <CampaignTickets campaign={campaign} applicants={applicants} passes={passes} loaded={passesLoaded} error={passesError} onSend={() => setTicketsFor([])} />
            ) : briefTab}

            <ApplicantSheet
                open={Boolean(openEntry)}
                onClose={() => setParam('creator', null)}
                campaign={campaign}
                entry={openEntry}
                busy={busy}
                onSelect={(e) => askSelect([e])}
                onUnselect={(e) => askUnselect([e])}
                onStage={(e, stage) => (stage === 'declined' ? askDecline([e]) : setStage([e], stage))}
                onPay={(e) => setPayTo([e])}
                onUnpay={unpay}
                onApprove={approve}
                onRequestChanges={(entry, task) => setChanges({ entry, task })}
                onMessage={(e) => setMessageTo([e])}
                onOpenProfile={(c) => setProfile(c)}
                ticket={openEntry ? passFor(passMap, openEntry.creator) : null}
                onSendTicket={(e) => setTicketsFor([e])}
            />

            <TicketsSheet
                open={Boolean(ticketsFor)}
                onClose={() => setTicketsFor(null)}
                campaign={campaign}
                applicants={applicants}
                preselected={ticketsFor || []}
                passes={passes}
            />

            <ShortlistUploadSheet
                open={uploadOpen}
                onClose={() => setUploadOpen(false)}
                campaign={campaign}
                applicants={applicants}
                onShortlist={(entries, welcome) => selectEntries(entries, welcome)}
            />

            <MessageSheet open={Boolean(messageTo)} onClose={() => setMessageTo(null)} campaign={campaign} entries={messageTo || []} />
            <PayoutSheet
                open={Boolean(payTo)}
                onClose={() => setPayTo(null)}
                campaign={campaign}
                entries={payTo || []}
                onSave={(payout, notify) => savePayout(payTo || [], payout, notify)}
            />
            <ChangesSheet
                open={Boolean(changes)}
                onClose={() => setChanges(null)}
                title={changes ? `${changes.entry.creator.name || 'Creator'} · ${changes.task.title}` : ''}
                onSend={(reason) => review([changes], 'rejected', reason)}
            />
            <ConfirmSheet
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                title={confirm?.title}
                message={confirm?.message}
                confirmLabel={confirm?.confirmLabel}
                tone={confirm?.tone || 'accent'}
                onConfirm={runConfirm}
                toggle={confirm?.toggleLabel ? { label: confirm.toggleLabel, value: confirmToggle, onChange: setConfirmToggle } : null}
            />
            {profile && <CreatorDetailModal creator={profile} onClose={() => setProfile(null)} />}
        </div>
    );
};

export default CampaignManage;
