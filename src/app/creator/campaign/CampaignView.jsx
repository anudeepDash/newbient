import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Award from 'lucide-react/dist/esm/icons/award';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Users from 'lucide-react/dist/esm/icons/users';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Flame from 'lucide-react/dist/esm/icons/flame';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import { AmbientBackdrop, Button, Sheet } from '../../../components/app';
import { useAppStore } from '../../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../../lib/store.js';
import { isPresent } from '../../../lib/present';
import { isCampaignCityMatch } from '../../../lib/constants';
import { linkifyContent } from '../../../lib/taskLinks';
import { submissionFor, taskProgress } from '../../../lib/creator/tasks';
import { copyToClipboard } from '../../../lib/clipboard';
import { cn } from '../../../lib/utils';
import { INTENTS, useAuthGate, useResumeIntent } from '../../auth/AuthGate';
import { appPath, appUrl, APP_ORIGIN } from '../../host';
import { callCreatorApi } from '../api';
import { compactCount, dueLabel } from '../format';
import { creatorWho, isShortlisted, matchesCollege } from '../useCreatorData';
import { Notice, STICKY_DOCK } from '../ui';
import TaskCard from './TaskCard';
import SubmitTaskSheet from './SubmitTaskSheet';
import TicketSlot from './TicketSlot';

/*
 * The campaign page body, shared by the sheet (opened over a list) and the
 * full page (opened from a shared link). Layout, top to bottom:
 *
 *   ambient glow · hero image · title · stat chips (only those with a value)
 *   · your status · Your ticket (Phase 5) · brief · deliverables
 *   and a sticky action bar: Apply / Submit / status, padded for the home bar.
 *
 * No fallback strings: an unset city, reward, follower minimum or brief is
 * simply not shown.
 */

const Chip = ({ icon: Icon, label, tone }) => {
    if (!isPresent(label)) return null;
    return (
        <span className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold',
            tone === 'accent'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:border-neon-green/25 dark:bg-neon-green/10 dark:text-neon-green'
                : 'border-black/[0.06] bg-white/80 text-gray-800 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-zinc-200'
        )}>
            {Icon && <Icon size={14} className="shrink-0" />}
            {label}
        </span>
    );
};

const RADIAL = 'radial-gradient(ellipse 65% 60% at 50% 38%, #000 25%, transparent 100%)';
const PAGE_GLOW_MASK = { WebkitMaskImage: RADIAL, maskImage: RADIAL };

const spotsLabel = (c) => {
    const left = c.spotsLeft;
    if (left !== null && left !== undefined && left !== '' && Number.isFinite(Number(left))) {
        const n = Number(left);
        return n > 0 ? `${n} ${n === 1 ? 'spot' : 'spots'} left` : null;
    }
    const total = Number(c.totalSpots) || 0;
    return total > 0 ? `${total} ${total === 1 ? 'spot' : 'spots'}` : null;
};
const isFull = (c) => c.spotsLeft !== null && c.spotsLeft !== undefined && c.spotsLeft !== '' && Number(c.spotsLeft) <= 0;
const isOpen = (c) => ['open', 'active', 'live', 'published'].includes(String(c.status || 'open').toLowerCase()) && c.websiteApplyEnabled !== false;

export const campaignShareUrl = (id) => {
    const url = appUrl(`/c/${encodeURIComponent(id)}`);
    return /^https?:/.test(url) ? url : `${typeof window !== 'undefined' ? window.location.origin : APP_ORIGIN}${url}`;
};

/* Why this creator can't apply, or null. Mirrors the server's checks for the message only. */
const blockerFor = (campaign, creator) => {
    if (!isOpen(campaign)) return 'This campaign isn’t taking applications.';
    if (isFull(campaign)) return 'All spots are taken.';
    if (['rejected', 'suspended'].includes(creator?.profileStatus)) return 'Your creator profile can’t apply right now.';
    const min = Number(campaign.minInstagramFollowers) || 0;
    if (min > 0 && (Number(creator?.instagramFollowers) || 0) < min) return `Needs ${compactCount(min)}+ Instagram followers.`;
    if (!isCampaignCityMatch(campaign.targetCity, creator?.city)) return `For creators in ${campaign.targetCity}.`;
    if (!matchesCollege(campaign, creator)) return `For ${campaign.targetCollege} students.`;
    return null;
};

const CampaignView = ({ campaign, variant = 'page', initialTaskId, onClose }) => {
    const location = useLocation();
    const gate = useAuthGate();
    const authUser = useAppStore(s => s.authUser);
    const creator = useAppStore(s => s.creatorProfile);
    const creatorLoaded = useAppStore(s => s.creatorLoaded);
    const records = useAppStore(s => s.mySubmissions);
    const subscribeMySubmission = useAppStore(s => s.subscribeMySubmission);
    const addToast = useLegacyStore(s => s.addToast);
    const [applying, setApplying] = useState(false);
    const [applyError, setApplyError] = useState(null);
    const [justApplied, setJustApplied] = useState(null);
    const [submitting, setSubmitting] = useState(null);

    const id = campaign.id;
    const joined = Boolean(justApplied) || (creator?.joinedCampaigns || []).includes(id);
    const shortlisted = Boolean(justApplied?.shortlisted) || isShortlisted(creator, id);
    const inCampaign = joined || shortlisted;
    const record = records[id];
    const who = creatorWho(creator, authUser, record);
    const tasks = campaign.tasks || [];
    const progress = useMemo(() => taskProgress(campaign, who), [campaign, who]);

    useEffect(() => {
        if (!authUser || !inCampaign) return undefined;
        return subscribeMySubmission(id);
    }, [authUser, inCampaign, id, subscribeMySubmission]);

    // ?taskId= scrolls to that deliverable.
    useEffect(() => {
        if (!initialTaskId) return undefined;
        const t = setTimeout(() => document.getElementById(`task-${initialTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
        return () => clearTimeout(t);
    }, [initialTaskId]);

    const apply = useCallback(async () => {
        setApplying(true);
        setApplyError(null);
        const res = await callCreatorApi('campaign-apply', { campaignId: id });
        setApplying(false);
        if (!res.ok) return setApplyError(res.error);
        setJustApplied({ shortlisted: Boolean(res.data.shortlisted) });
        addToast?.(res.data.shortlisted ? 'You’re in. Your deliverables are below.' : 'Applied. We’ll let you know if you’re picked.', 'success');
        return undefined;
    }, [id, addToast]);

    useResumeIntent(INTENTS.campaignApply, (payload) => {
        if (payload?.id === id && creator && !inCampaign) apply();
    });

    const share = () => {
        const url = campaignShareUrl(id);
        if (navigator.share) {
            navigator.share({ title: campaign.title || 'Newbi campaign', url }).catch(() => {});
        } else {
            copyToClipboard(url).then(ok => ok && addToast?.('Link copied', 'success'));
        }
    };

    const reward = campaign.reward;
    const city = isCampaignCityMatch(campaign.targetCity, '') ? null : campaign.targetCity;
    const min = Number(campaign.minInstagramFollowers) || 0;
    const brief = isPresent(String(campaign.description || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')) ? linkifyContent(campaign.description) : null;
    const blocker = creator && !inCampaign ? blockerFor(campaign, creator) : null;
    const nextTask = shortlisted ? tasks.find(t => ['not_started', 'rejected'].includes(submissionFor(t, who)?.status || 'not_started')) : null;

    /* ── Action bar ── */
    let action;
    if (!authUser) {
        action = <Button className="flex-1" size="lg" onClick={() => gate.requestSignIn({ type: INTENTS.campaignApply, payload: { id } })}>Apply</Button>;
    } else if (!creatorLoaded) {
        action = <Button className="flex-1" size="lg" loading disabled>Loading</Button>;
    } else if (!creator) {
        // The application opens in place, over whatever this campaign is open over.
        action = <Button className="flex-1" size="lg" to={`${appPath('/creator/apply')}?next=${encodeURIComponent(`/c/${id}`)}`} state={{ backgroundLocation: location.state?.backgroundLocation || location }}>Apply as a creator</Button>;
    } else if (!inCampaign) {
        action = blocker
            ? <p className="flex min-h-[48px] flex-1 items-center text-[14px] font-semibold text-gray-600 dark:text-zinc-400">{blocker}</p>
            : <Button className="flex-1" size="lg" loading={applying} onClick={apply}>Apply</Button>;
    } else if (!shortlisted) {
        action = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-semibold text-gray-700 dark:text-zinc-300"><Hourglass size={17} className="shrink-0 text-amber-600 dark:text-amber-300" /> Applied. We’ll let you know if you’re picked.</p>;
    } else if (progress.requiredDone) {
        action = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-bold text-emerald-700 dark:text-neon-green"><CircleCheck size={18} className="shrink-0" /> All required deliverables approved</p>;
    } else if (nextTask) {
        action = <Button className="flex-1" size="lg" onClick={() => setSubmitting(nextTask)}>Submit {tasks.length > 1 ? 'next deliverable' : 'deliverable'}</Button>;
    } else if (tasks.length) {
        action = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-semibold text-gray-700 dark:text-zinc-300"><Hourglass size={17} className="shrink-0 text-sky-600 dark:text-sky-300" /> Everything’s in review</p>;
    } else {
        action = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-bold text-emerald-700 dark:text-neon-green"><CircleCheck size={18} className="shrink-0" /> You’re in this campaign</p>;
    }

    const bar = (
        <div className="flex items-center gap-2">
            {action}
            <Button variant="secondary" size="lg" icon={Share2} onClick={share} aria-label="Share campaign" className="w-14 shrink-0 px-0" />
        </div>
    );

    const body = (
            <div className="relative isolate">
                {variant === 'page' && (
                    // On a page the glow fades out on every side, so it has no edges.
                    <div aria-hidden="true" className="pointer-events-none absolute -inset-x-4 -top-20 h-[560px] sm:-inset-x-24" style={PAGE_GLOW_MASK}>
                        <AmbientBackdrop image={campaign.thumbnail} fade={false} />
                    </div>
                )}
                <div className="relative space-y-5">
                    {campaign.thumbnail ? (
                        <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-black/[0.04] dark:border-white/[0.08] dark:bg-white/[0.04]">
                            <img src={campaign.thumbnail} alt="" className="aspect-video w-full object-cover" />
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        {(isPresent(campaign.brand) || campaign.brandLogo) && (
                            <div className="flex items-center gap-2">
                                {campaign.brandLogo && <img src={campaign.brandLogo} alt="" className="h-6 w-6 rounded-md border border-black/10 bg-white object-contain p-0.5 dark:border-white/10" />}
                                {isPresent(campaign.brand) && <span className="text-[12px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{campaign.brand}</span>}
                            </div>
                        )}
                        <h1 className="font-heading text-[26px] font-black leading-[1.15] tracking-tight sm:text-[32px]">{campaign.title}</h1>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Chip icon={Award} label={reward} tone="accent" />
                        <Chip icon={MapPin} label={city} />
                        <Chip icon={GraduationCap} label={isPresent(campaign.targetCollege) ? campaign.targetCollege : null} />
                        <Chip icon={Users} label={min > 0 ? `${compactCount(min)}+ followers` : null} />
                        <Chip icon={ListChecks} label={tasks.length ? `${tasks.length} ${tasks.length === 1 ? 'deliverable' : 'deliverables'}` : null} />
                        <Chip icon={Flame} label={spotsLabel(campaign)} />
                        <Chip icon={CalendarClock} label={dueLabel(campaign.deadline || campaign.endDate)} />
                    </div>

                    {inCampaign && (
                        <Notice tone={progress.requiredDone ? 'success' : shortlisted ? 'success' : 'info'} title={progress.requiredDone ? 'Completed' : shortlisted ? 'You’re in' : 'Applied'}>
                            {progress.requiredDone
                                ? 'Every required deliverable is approved. Nice work.'
                                : shortlisted
                                    ? (tasks.length ? `${progress.approved ? `${progress.approved} of ${tasks.length} approved. ` : ''}Submit each deliverable below once it’s live.` : 'You’re picked for this campaign.')
                                    : 'The brand is picking creators. You’ll hear from us either way.'}
                        </Notice>
                    )}
                    {applyError && <Notice tone="error">{applyError}</Notice>}

                    {shortlisted && isPresent(campaign.whatsappLink) && (
                        <Button variant="secondary" icon={MessageCircle} href={campaign.whatsappLink} target="_blank" rel="noopener noreferrer">Join the campaign WhatsApp group</Button>
                    )}

                    <TicketSlot campaign={campaign} creator={creator} />

                    {brief && (
                        <section className="space-y-2">
                            <h2 className="text-[13px] font-bold text-gray-500 dark:text-zinc-400">The brief</h2>
                            <div className="campaign-briefing-content break-words text-[15px] leading-relaxed text-gray-800 dark:text-zinc-200" dangerouslySetInnerHTML={{ __html: brief }} />
                        </section>
                    )}

                    {tasks.length > 0 && (
                        <section className="space-y-3">
                            <div className="flex items-end justify-between gap-3">
                                <h2 className="text-[13px] font-bold text-gray-500 dark:text-zinc-400">Deliverables</h2>
                                {shortlisted && progress.total > 0 && progress.approved > 0 && (
                                    <span className="text-[13px] font-bold text-gray-700 dark:text-zinc-300">{progress.approved}/{progress.total} approved</span>
                                )}
                            </div>
                            <ol className="space-y-3">
                                {tasks.map((task, i) => {
                                    const sub = shortlisted ? submissionFor(task, who) : null;
                                    return (
                                        <TaskCard
                                            key={task.id || i}
                                            task={task}
                                            index={i}
                                            status={sub?.status || 'not_started'}
                                            submission={sub}
                                            canSubmit={shortlisted}
                                            onSubmit={setSubmitting}
                                            highlight={String(task.id) === String(initialTaskId)}
                                        />
                                    );
                                })}
                            </ol>
                        </section>
                    )}

                    {!brief && !tasks.length && (
                        <p className="flex items-center gap-2 text-[14px] text-gray-500 dark:text-zinc-400"><Megaphone size={16} /> The full brief is shared with picked creators.</p>
                    )}
                </div>
            </div>
    );

    const submitSheet = (
        <SubmitTaskSheet
            open={Boolean(submitting)}
            onClose={() => setSubmitting(null)}
            campaign={campaign}
            task={submitting}
            current={submitting ? submissionFor(submitting, who) : null}
            onSubmitted={() => addToast?.('Sent for review', 'success')}
        />
    );

    if (variant === 'sheet') {
        return (
            <>
                <Sheet
                    open
                    onClose={onClose}
                    size="full"
                    width="lg"
                    header={<span className="sr-only">{campaign.title}</span>}
                    footer={bar}
                    bodyClassName="pt-0"
                    backdrop={<AmbientBackdrop image={campaign.thumbnail} className="bottom-auto h-[520px]" />}
                >
                    {body}
                </Sheet>
                {submitSheet}
            </>
        );
    }

    return (
        <>
            {body}
            {/* Full page: a solid dock under the app's tab pill. */}
            <div className={cn(STICKY_DOCK, 'mt-6')}>
                {bar}
            </div>
            {submitSheet}
        </>
    );
};

export default CampaignView;
