import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Award from 'lucide-react/dist/esm/icons/award';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Users from 'lucide-react/dist/esm/icons/users';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Flame from 'lucide-react/dist/esm/icons/flame';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import { PosterGlow, BrandLayers, BRAND_GLASS, Button, CARD_TYPES, GlassChip, MetaPill, Sheet, Stat, StatRow, WhatsAppLogo } from '../../../components/app';
import { useAppStore } from '../../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../../lib/store.js';
import { isPresent } from '../../../lib/present';
import { isCampaignCityMatch } from '../../../lib/constants';
import { linkifyContent } from '../../../lib/taskLinks';
import { canSubmitTask, submissionFor, taskProgress, taskWindow } from '../../../lib/creator/tasks';
import { copyToClipboard } from '../../../lib/clipboard';
import { cn } from '../../../lib/utils';
import { INTENTS, useAuthGate, useResumeIntent } from '../../auth/AuthGate';
import { appPath, appUrl, APP_ORIGIN } from '../../host';
import { callCreatorApi } from '../api';
import { compactCount, dueLabel } from '../format';
import { creatorWho, isShortlisted, matchesCollege, creatorCity } from '../useCreatorData';
import { isTesterRole } from '../../../constants/roles';
import { Notice } from '../ui';
import TaskCard, { hasSubmitForm } from './TaskCard';
import SubmitTaskSheet from './SubmitTaskSheet';
import TicketSlot from './TicketSlot';
import ApplyPanel from './ApplyPanel';
import GoogleFormSheet from './GoogleFormSheet';
import { applyMethodOf, formValuesFor, googleFormUrl } from './applyMethod';
import { useT, t as translateNow } from '../../../i18n';
import { useLocalizedCampaign } from '../../../i18n/useHinglish';

/*
 * The campaign, shared by the sheet (opened over a list) and the full page
 * (opened from a shared link).
 *
 *   Phones: poster · title · stat chips · status · ticket · brief ·
 *           deliverables, and the apply bar pinned at the bottom.
 *   Desktop: two columns. The poster stays put on the left; on the right the
 *           title, chips, the apply panel (Newbi ID card + 1-click apply, or
 *           the Google Form), then the brief and deliverables.
 *
 * No fallback strings: an unset city, reward, follower minimum or brief is
 * simply not shown.
 */


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

/* The brief in the app's type style; a long one shows its start with "Read the full brief". */
const BriefText = ({ html }) => {
    const t = useT();
    const [open, setOpen] = useState(false);
    const long = String(html || '').replace(/<[^>]+>/g, '').length > 600;
    const fade = 'linear-gradient(to bottom, #000 60%, transparent)';
    return (
        <div>
            <div
                className={cn('nb-brief', long && !open && 'max-h-[17rem] overflow-hidden')}
                style={long && !open ? { WebkitMaskImage: fade, maskImage: fade } : undefined}
                dangerouslySetInnerHTML={{ __html: html }}
            />
            {long && (
                <button type="button" onClick={() => setOpen(v => !v)} className="mt-2 text-[14px] font-bold text-gray-900 underline decoration-neon-green decoration-2 underline-offset-4 dark:text-white">
                    {open ? t('Show less') : t('Read the full brief')}
                </button>
            )}
        </div>
    );
};

export const campaignShareUrl = (id) => {
    const url = appUrl(`/c/${encodeURIComponent(id)}`);
    return /^https?:/.test(url) ? url : `${typeof window !== 'undefined' ? window.location.origin : APP_ORIGIN}${url}`;
};

/* Why this creator can't apply, or null. Mirrors the server's checks for the message only. */
const blockerFor = (campaign, creator, profile) => {
    if (!isOpen(campaign)) return translateNow('This campaign isn’t taking applications.');
    if (isFull(campaign)) return translateNow('All spots are taken.');
    if (['rejected', 'suspended'].includes(creator?.profileStatus)) return translateNow('Your creator profile can’t apply right now.');
    const min = Number(campaign.minInstagramFollowers) || 0;
    if (min > 0 && (Number(creator?.instagramFollowers) || 0) < min) return translateNow('Needs {count}+ Instagram followers.', { count: compactCount(min) });
    if (!isCampaignCityMatch(campaign.targetCity, creatorCity(creator, profile))) return translateNow('For creators in {city}.', { city: campaign.targetCity });
    if (!matchesCollege(campaign, creator, profile)) return translateNow('For {college} students.', { college: campaign.targetCollege });
    return null;
};

const CampaignView = ({ campaign: source, variant = 'page', initialTaskId, onClose }) => {
    const t = useT();
    // Hinglish title, brief and task text when the site is in Hinglish (English until it's ready).
    const campaign = useLocalizedCampaign(source);
    const location = useLocation();
    const navigate = useNavigate();
    const gate = useAuthGate();
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const creator = useAppStore(s => s.creatorProfile);
    const creatorLoaded = useAppStore(s => s.creatorLoaded);
    const records = useAppStore(s => s.mySubmissions);
    const subscribeMySubmission = useAppStore(s => s.subscribeMySubmission);
    const addToast = useLegacyStore(s => s.addToast);
    const [applying, setApplying] = useState(false);
    const [applyError, setApplyError] = useState(null);
    const [justApplied, setJustApplied] = useState(null);
    const [submitting, setSubmitting] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [pendingApply, setPendingApply] = useState(false);
    const [marking, setMarking] = useState(null); // task id being marked as submitted

    const id = campaign.id;
    const method = applyMethodOf(campaign);
    const joined = Boolean(justApplied) || (creator?.joinedCampaigns || []).includes(id);
    const shortlisted = Boolean(justApplied?.shortlisted) || isShortlisted(creator, id);
    const inCampaign = joined || shortlisted;
    // Developers see and can apply to any campaign; submitting needs the shortlist, as for everyone.
    const tester = isTesterRole(authUser?.role);
    const canWork = shortlisted;
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
        const timer = setTimeout(() => document.getElementById(`task-${initialTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
        return () => clearTimeout(timer);
    }, [initialTaskId]);

    const apply = useCallback(async (via = 'newbi') => {
        setApplying(true);
        setApplyError(null);
        const res = await callCreatorApi('campaign-apply', { campaignId: id, via });
        setApplying(false);
        if (!res.ok) { setApplyError(res.error); return false; }
        setJustApplied({ shortlisted: Boolean(res.data.shortlisted) });
        if (res.data.shortlisted) addToast?.(t('Your deliverables are below.'), 'success', { title: t('You’re in') });
        else addToast?.(t('We’ll message you if you’re shortlisted.'), 'success', { title: t('Applied') });
        return true;
    }, [id, addToast, t]);

    // A deliverable sent through its Google Form: one tap tells the team it's in.
    const markSubmitted = useCallback(async (task) => {
        if (marking) return;
        setMarking(String(task.id));
        const res = await callCreatorApi('campaign-submit', { campaignId: id, taskId: String(task.id), via: 'google_form' });
        setMarking(null);
        if (!res.ok) { addToast?.(res.error || t('Please try again.'), 'error', { title: t('Couldn’t mark it as submitted'), action: { label: t('Try again'), onClick: () => markSubmitted(task) } }); return; }
        useAppStore.getState().noteMySubmission(id, String(task.id), res.data.submission);
        addToast?.(t('The team will review it.'), 'success', { title: t('Marked as submitted') });
    }, [id, marking, addToast, t]);

    // No Newbi ID yet: the 30-second creator form, which applies to this campaign when it's done.
    const getId = useCallback(() => {
        navigate(`${appPath('/creator/apply')}?next=${encodeURIComponent(`/c/${id}`)}`, { state: { backgroundLocation: location.state?.backgroundLocation || location } });
    }, [navigate, id, location]);

    // Back from signing in: wait for the creator profile, then apply (or get a Newbi ID first).
    useResumeIntent(INTENTS.campaignApply, (payload) => { if (payload?.id === id) setPendingApply(true); });
    useEffect(() => {
        if (!pendingApply || !authUser || !creatorLoaded) return;
        setPendingApply(false);
        if (inCampaign) return;
        if (creator) { if (!blockerFor(campaign, creator, profile)) apply(); } else getId();
    }, [pendingApply, authUser, creatorLoaded, creator, inCampaign, campaign, apply, getId]);

    const share = () => {
        const url = campaignShareUrl(id);
        if (navigator.share) {
            navigator.share({ title: campaign.title || t('Newbi campaign'), url }).catch(() => {});
        } else {
            copyToClipboard(url).then(ok => ok && addToast?.(t('Link copied'), 'success'));
        }
    };

    const formValues = useMemo(() => formValuesFor({ creator, profile }), [creator, profile]);
    const formEmbed = method !== 'newbi' ? googleFormUrl(campaign.applyFormUrl, formValues, { embed: true }) : null;
    const formOpenUrl = method !== 'newbi' ? googleFormUrl(campaign.applyFormUrl, formValues) : null;
    const formSent = async () => {
        if (!creator || inCampaign) { setFormOpen(false); return; }
        const ok = await apply('google_form');
        if (ok) setFormOpen(false);
    };

    const reward = campaign.reward;
    const city = isCampaignCityMatch(campaign.targetCity, '') ? null : campaign.targetCity;
    const min = Number(campaign.minInstagramFollowers) || 0;
    const brief = isPresent(String(campaign.description || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')) ? linkifyContent(campaign.description) : null;
    const blocker = creator && !inCampaign && !tester ? blockerFor(campaign, creator, profile) : null;
    // The next deliverable that's open for submissions (the team opens them one at a time; the deadline closes them).
    const statusOf = (tk) => submissionFor(tk, who)?.status || 'not_started';
    const nextTask = canWork ? tasks.find(tk => ['not_started', 'rejected'].includes(statusOf(tk)) && canSubmitTask(tk, statusOf(tk))) : null;

    /* ── Once you're in the campaign: your status (or the next thing to do) ── */
    let status = null;
    if (inCampaign) {
        if (!canWork) {
            status = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-semibold text-gray-700 dark:text-zinc-300"><Hourglass size={17} className="shrink-0 text-amber-600 dark:text-amber-300" /> {t('Applied. We’ll let you know if you’re picked.')}</p>;
        } else if (progress.requiredDone) {
            status = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-bold text-emerald-700 dark:text-neon-green"><CircleCheck size={18} className="shrink-0" /> {t('All required deliverables approved')}</p>;
        } else if (nextTask) {
            status = <Button className="flex-1" size="lg" onClick={() => setSubmitting(nextTask)}>{tasks.length > 1 ? t('Submit next deliverable') : t('Submit deliverable')}</Button>;
            if (hasSubmitForm(nextTask)) {
                status = <Button className="flex-1" size="lg" href={nextTask.googleFormLink} target="_blank" rel="noopener noreferrer">{t('Open the submission form')}</Button>;
            }
        } else if (tasks.some(tk => taskWindow(tk) === 'upcoming' && statusOf(tk) === 'not_started')) {
            status = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-semibold text-gray-700 dark:text-zinc-300"><Hourglass size={17} className="shrink-0 text-sky-600 dark:text-sky-300" /> {t('Your next deliverable opens soon. We’ll let you know.')}</p>;
        } else if (!tasks.some(tk => statusOf(tk) === 'submitted') && tasks.some(tk => taskWindow(tk) === 'closed')) {
            status = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-semibold text-gray-700 dark:text-zinc-300"><Lock size={17} className="shrink-0 text-gray-500 dark:text-zinc-400" /> {t('Submissions are closed')}</p>;
        } else if (tasks.length) {
            status = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-semibold text-gray-700 dark:text-zinc-300"><Hourglass size={17} className="shrink-0 text-sky-600 dark:text-sky-300" /> {t('Everything’s in review')}</p>;
        } else {
            status = <p className="flex min-h-[48px] flex-1 items-center gap-2 text-[14px] font-bold text-emerald-700 dark:text-neon-green"><CircleCheck size={18} className="shrink-0" /> {t('You’re in this campaign')}</p>;
        }
    }

    const panelProps = {
        method,
        creator,
        profile,
        signedIn: Boolean(authUser),
        loading: Boolean(authUser) && !creatorLoaded,
        blocker,
        status,
        applying,
        onApply: () => apply('newbi'),
        onGetId: getId,
        onSignIn: () => gate.requestSignIn({ type: INTENTS.campaignApply, payload: { id } }),
        onOpenForm: () => {
            // Forms that need a Google sign-in open in a new tab, straight from the tap (so Safari allows it).
            if (campaign.applyFormNeedsSignIn && formOpenUrl) window.open(formOpenUrl, '_blank', 'noopener');
            setFormOpen(true);
        },
        onShare: share,
    };
    // The apply bar: Newbi ID line, the apply button and share, and the Google Form link when there is one.
    const bar = <ApplyPanel {...panelProps} compact />;

    const KindIcon = CARD_TYPES.campaign.icon;
    const shownMeta = [
        { icon: Users, label: min > 0 ? t('{count}+ followers', { count: compactCount(min) }) : null },
        { icon: CalendarClock, label: dueLabel(campaign.deadline || campaign.endDate) },
    ].filter(m => isPresent(m.label));

    /* The campaign card, expanded: the 16:9 poster starts at the very top, bleeds to the edges, and
       a soft light in the poster's own colour glows out behind it and fades into the popup. */
    const hero = (
        <div className="relative aspect-video w-full shrink-0">
            <PosterGlow image={campaign.thumbnail} height="200%" />
            <div className="absolute inset-0" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)' }}>
                {campaign.thumbnail ? (
                    <>
                        <img src={campaign.thumbnail} alt="" className="relative h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.35)_100%)]" />
                    </>
                ) : (
                    <div className="flex h-full w-full items-center justify-center"><KindIcon size={64} strokeWidth={1.25} className="text-emerald-600/25 dark:text-neon-green/20" /></div>
                )}
            </div>
            <div className="absolute left-4 top-4 z-10 flex max-w-[75%] flex-wrap items-center gap-2">
                <GlassChip icon={KindIcon} />
                {isPresent(city) && <GlassChip icon={MapPin} label={city} />}
                {isPresent(campaign.targetCollege) && <GlassChip icon={GraduationCap} label={campaign.targetCollege} />}
            </div>
        </div>
    );

    const content = (
        <div className="relative space-y-6 px-5 pb-6 sm:px-7">
            <div className="space-y-3">
                {shownMeta.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        {shownMeta.map(m => <MetaPill key={m.label} {...m} />)}
                    </div>
                )}
                {(isPresent(campaign.brand) || campaign.brandLogo) && (
                    <div className="flex items-center gap-2">
                        {campaign.brandLogo && <img src={campaign.brandLogo} alt="" className="h-5 w-5 rounded-md border border-black/10 bg-white object-contain p-0.5 dark:border-white/10" />}
                        {isPresent(campaign.brand) && <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{campaign.brand}</span>}
                    </div>
                )}
                <h1 className="font-heading text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[30px]">{campaign.title}</h1>
                <StatRow className="flex-wrap sm:flex-nowrap">
                    {/* A long reward gets the whole row on phones instead of being cut off. */}
                    <Stat label={t('Reward')} value={reward} icon={Award} tone="accent" className={String(reward || '').length > 14 ? 'basis-full sm:basis-0' : undefined} />
                    <Stat label={t('Tasks')} value={tasks.length || null} icon={ListChecks} />
                    <Stat label={t('Spots')} value={spotsLabel(campaign) ? spotsLabel(campaign).replace(/ (spots?|left)/g, '').trim() : null} icon={Flame} />
                </StatRow>
            </div>

            {inCampaign && (
                <Notice tone={progress.requiredDone ? 'success' : shortlisted ? 'success' : 'info'} title={progress.requiredDone ? t('Completed') : shortlisted ? t('You’re in') : t('Applied')}>
                    {progress.requiredDone
                        ? t('Every required deliverable is approved. Nice work.')
                        : shortlisted
                            ? (tasks.length ? `${progress.approved ? `${t('{approved} of {total} approved.', { approved: progress.approved, total: tasks.length })} ` : ''}${t('Submit each deliverable below once it’s live.')}` : t('You’re picked for this campaign.'))
                            : t('The brand is picking creators. If you’re shortlisted, we’ll send the WhatsApp group and your deliverables by email and WhatsApp.')}
                </Notice>
            )}
            {tester && !shortlisted && (
                <Notice tone="info" title={t('Developer test mode')}>
                    {`${t('You can open any campaign from its link and apply without meeting its criteria')}${isOpen(campaign) ? '' : ` ${t('(this one isn’t open to creators)')}`}. ${t('To test submitting, shortlist yourself in the admin; what you send is marked Test.')}`}
                </Notice>
            )}
            {applyError && <Notice tone="error">{applyError}</Notice>}

            {shortlisted && isPresent(campaign.whatsappLink) && (
                <Button variant="secondary" icon={WhatsAppLogo} href={campaign.whatsappLink} target="_blank" rel="noopener noreferrer">{t('Join the campaign WhatsApp group')}</Button>
            )}

            <TicketSlot campaign={campaign} creator={creator} />

            {brief && (
                <section className="space-y-3">
                    <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-400">{t('The brief')}</h2>
                    <BriefText html={brief} />
                </section>
            )}

            {tasks.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-400">{t('Deliverables')}</h2>
                        {canWork && progress.total > 0 && progress.approved > 0 && (
                            <span className="text-[13px] font-bold text-gray-700 dark:text-zinc-300">{t('{approved}/{total} approved', { approved: progress.approved, total: progress.total })}</span>
                        )}
                    </div>
                    <ol className="space-y-3">
                        {tasks.map((task, i) => {
                            const sub = canWork ? submissionFor(task, who) : null;
                            return (
                                <TaskCard
                                    key={task.id || i}
                                    task={task}
                                    index={i}
                                    status={sub?.status || 'not_started'}
                                    submission={sub}
                                    canSubmit={canWork}
                                    onSubmit={setSubmitting}
                                    onMarkSubmitted={markSubmitted}
                                    marking={marking === String(task.id)}
                                    highlight={String(task.id) === String(initialTaskId)}
                                />
                            );
                        })}
                    </ol>
                </section>
            )}

            {!brief && !tasks.length && (
                <p className="flex items-center gap-2 text-[14px] text-gray-500 dark:text-zinc-400"><Megaphone size={16} /> {t('The full brief is shared with picked creators.')}</p>
            )}
        </div>
    );

    const sheets = (
        <>
            <SubmitTaskSheet
                open={Boolean(submitting)}
                onClose={() => setSubmitting(null)}
                campaign={campaign}
                task={submitting}
                current={submitting ? submissionFor(submitting, who) : null}
                onSubmitted={(submission) => {
                    if (submitting) useAppStore.getState().noteMySubmission(campaign.id, String(submitting.id), submission);
                    addToast?.(t('Sent for review'), 'success');
                }}
            />
            {method !== 'newbi' && (
                <GoogleFormSheet
                    open={formOpen}
                    onClose={() => setFormOpen(false)}
                    title={campaign.title}
                    embedUrl={formEmbed}
                    openUrl={formOpenUrl}
                    external={Boolean(campaign.applyFormNeedsSignIn)}
                    canMarkApplied={Boolean(creator) && !inCampaign}
                    marking={applying}
                    onSent={formSent}
                />
            )}
        </>
    );

    if (variant === 'sheet') {
        return (
            <>
                <Sheet
                    open
                    onClose={onClose}
                    size="full"
                    width="lg"
                    bleed
                    header={<span className="sr-only">{campaign.title}</span>}
                    footer={bar}
                    bodyClassName="px-0 pb-0 pt-0 sm:px-0"
                >
                    {hero}
                    {content}
                </Sheet>
                {sheets}
            </>
        );
    }

    // Opened from a shared link: the same expanded card, centred on the page, with the apply bar pinned.
    return (
        <>
            <article className={cn('mx-auto max-w-2xl rounded-[2rem]', BRAND_GLASS)}>
                <BrandLayers soft mark={false} />
                {hero}
                {content}
                {/* Desktop: pinned to the card's bottom edge. */}
                <div className="sticky bottom-0 z-20 hidden rounded-b-[2rem] border-t border-black/[0.06] bg-[#f7f7f3]/90 px-7 py-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0b0d12]/90 lg:block">
                    {bar}
                </div>
                <div className="h-4 lg:hidden" aria-hidden="true" />
            </article>
            {/* Phones: the apply bar docks at the bottom edge (the tab pill steps aside on this page). */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-[#f7f7f3]/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0b0d12]/90 lg:hidden">
                <div className="mx-auto max-w-2xl">{bar}</div>
            </div>
            {sheets}
        </>
    );
};

export default CampaignView;
