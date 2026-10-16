import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Newspaper from 'lucide-react/dist/esm/icons/newspaper';
import Send from 'lucide-react/dist/esm/icons/send';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Star from 'lucide-react/dist/esm/icons/star';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import X from 'lucide-react/dist/esm/icons/x';
import Check from 'lucide-react/dist/esm/icons/check';
import Eye from 'lucide-react/dist/esm/icons/eye';
import PenLine from 'lucide-react/dist/esm/icons/pen-line';
import FlaskConical from 'lucide-react/dist/esm/icons/flask-conical';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import History from 'lucide-react/dist/esm/icons/history';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { generateNewsletterBriefing } from '../../lib/ai';
import { sendCampaignTest } from '../../lib/mailApi';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Button, EmptyState, SearchInput, SegmentedTabs } from '../../components/admin/ui';
import { accent, useAccent } from '../../components/admin/theme';
import { Field, areaCls, fieldCls } from '../../components/admin/uploads/UploadKit';
import { BuilderCard } from '../../components/admin/events/EditorParts';
import RichEditor from '../../components/admin/RichEditor';
import AudienceBuilder from '../../components/admin/mailing/AudienceBuilder';
import EmailPreview from '../../components/admin/mailing/EmailPreview';
import SendSheet from '../../components/admin/mailing/SendSheet';
import { ConfirmDialog, useSuppression } from '../../components/admin/mailing/shared';
import { DEFAULT_AUDIENCE, buildAudience, describeAudience, normalizeEmail } from '../../components/admin/mailing/audience';
import { stripHtml } from '../../components/admin/mailing/mailingApi';
import { buildNewsletterHtml, defaultNewsletterSummary } from '../../components/admin/mailing/newsletterHtml';

/*
 * Newsletter studio: pick up to six published stories (the first is the
 * featured one), add an editorial note (or have AI draft it) and an optional
 * sponsored block, choose who gets it, preview, test, and send.
 */

const DRAFT_KEY = 'nb_newsletter_draft';
const MAX_STORIES = 6;
const NEWSLETTER_SEGMENTS = ['subscribers', 'users', 'team', 'custom'];

const readDraft = () => { try { return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } };

const postTime = (p) => Date.parse(p?.publishDate || '') || 0;

const NewsletterStudio = () => {
    useStoreSubscription(['posts', 'subscribers', 'allUsers', 'admins']);
    const posts = useStore(s => s.posts);
    const subscribers = useStore(s => s.subscribers);
    const allUsers = useStore(s => s.allUsers);
    const admins = useStore(s => s.admins);
    const user = useStore(s => s.user);
    const addToast = useStore(s => s.addToast);
    const moduleAccent = useAccent();
    const navigate = useNavigate();

    const draft = useMemo(readDraft, []);
    const [selectedIds, setSelectedIds] = useState(draft?.selectedIds || []);
    const [editorialText, setEditorialText] = useState(draft?.editorialText || '');
    const [commercialContent, setCommercialContent] = useState(draft?.commercialContent || '');
    const [theme, setTheme] = useState(draft?.theme || 'light');
    const [subject, setSubject] = useState(draft?.subject || '');
    const [preheader, setPreheader] = useState(draft?.preheader || '');
    const [aiGuidance, setAiGuidance] = useState(draft?.aiGuidance || '');
    const [audience, setAudience] = useState(() => ({ ...DEFAULT_AUDIENCE, ...(draft?.audience || {}), creatorFilters: DEFAULT_AUDIENCE.creatorFilters }));
    const [storySearch, setStorySearch] = useState('');
    const [storyLimit, setStoryLimit] = useState(24);
    const [mobilePane, setMobilePane] = useState('edit');
    const [generatingAI, setGeneratingAI] = useState(false);
    const [confirmAi, setConfirmAi] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testedAt, setTestedAt] = useState(null);
    const [sendJob, setSendJob] = useState(null);

    useEffect(() => {
        try {
            window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
                selectedIds, editorialText, commercialContent, theme, subject, preheader, aiGuidance,
                audience: { ...audience, custom: audience.custom.slice(0, 5000) },
            }));
        } catch { /* storage full or private mode */ }
    }, [selectedIds, editorialText, commercialContent, theme, subject, preheader, aiGuidance, audience]);

    /* ---------- Stories ---------- */

    const published = useMemo(() => (posts || [])
        .filter(p => p.status === 'Published')
        .sort((a, b) => postTime(b) - postTime(a)), [posts]);
    const byId = useMemo(() => new Map((posts || []).map(p => [p.id, p])), [posts]);
    // Keep the chosen order; drop stories that were deleted or unpublished.
    const selectedPosts = useMemo(() => selectedIds.map(id => byId.get(id)).filter(p => p && p.status === 'Published'), [selectedIds, byId]);

    const toggleStory = (post) => {
        if (selectedIds.includes(post.id)) { setSelectedIds(ids => ids.filter(id => id !== post.id)); return; }
        if (selectedIds.length >= MAX_STORIES) { addToast(`Newsletters read best with ${MAX_STORIES} stories or fewer. Remove one first.`, 'info'); return; }
        setSelectedIds(ids => [...ids, post.id]);
    };
    const move = (id, dir) => setSelectedIds(ids => {
        const i = ids.indexOf(id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= ids.length) return ids;
        const next = [...ids];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });

    const storyRows = useMemo(() => {
        const q = storySearch.trim().toLowerCase();
        return published.filter(p => !q || [p.title, p.category].some(v => String(v || '').toLowerCase().includes(q)));
    }, [published, storySearch]);

    /* ---------- Audience ---------- */

    const suppression = useSuppression();
    const sources = useMemo(() => ({ subscribers: subscribers || [], users: allUsers || [], creators: [], team: admins || [] }), [subscribers, allUsers, admins]);
    const audienceResult = useMemo(() => buildAudience(sources, { ...audience, segments: audience.segments.filter(s => NEWSLETTER_SEGMENTS.includes(s)) }, suppression.set), [sources, audience, suppression.set]);
    const knownPeople = useMemo(() => {
        const map = new Map();
        const add = (list, label) => (list || []).forEach(r => {
            const email = normalizeEmail(r.email);
            if (email && !map.has(email)) map.set(email, { email, name: String(r.displayName || r.name || '').trim(), sourceLabel: label });
        });
        add(admins, 'Team'); add(allUsers, 'User'); add(subscribers, 'Subscriber');
        return [...map.values()];
    }, [admins, allUsers, subscribers]);

    /* ---------- Email ---------- */

    const defaultSubject = selectedPosts[0] ? `Weekly by Concert Zone: ${selectedPosts[0].title}` : 'Weekly by Concert Zone';
    const finalSubject = subject.trim() || defaultSubject;
    const summary = preheader.trim() || defaultNewsletterSummary(selectedPosts);
    const htmlFor = (isPreview) => buildNewsletterHtml({ selectedPosts, theme, editorialText, commercialContent, summary, isPreview });
    const previewHtml = useMemo(() => htmlFor(true), [selectedPosts, theme, editorialText, commercialContent, summary]); // eslint-disable-line react-hooks/exhaustive-deps

    const problems = [
        selectedPosts.length === 0 && 'Pick at least one story.',
        audienceResult.stats.final === 0 && 'Choose who gets the newsletter.',
    ].filter(Boolean);

    /* ---------- AI ---------- */

    const writeBriefing = async () => {
        setConfirmAi(false);
        if (!selectedPosts.length) { addToast('Pick at least one story first.', 'info'); return; }
        setGeneratingAI(true);
        try {
            const html = await generateNewsletterBriefing(selectedPosts, aiGuidance);
            if (!html || !stripHtml(html)) throw new Error('Empty briefing');
            setEditorialText(html);
            addToast('Briefing drafted. Read it through before sending.', 'success');
        } catch (err) {
            console.error('AI briefing failed:', err);
            addToast("Couldn't write the briefing. Please try again.", 'error');
        } finally {
            setGeneratingAI(false);
        }
    };

    /* ---------- Test and send ---------- */

    const myEmail = normalizeEmail(user?.email);
    const sendTest = async () => {
        if (!myEmail) { addToast('Your account has no email address to send a test to.', 'error'); return; }
        if (!selectedPosts.length) { addToast('Pick at least one story first.', 'error'); return; }
        setTesting(true);
        try {
            const sent = await sendCampaignTest({ subject: finalSubject, html: htmlFor(false), accountType: 'weekly' });
            setTestedAt(Date.now());
            addToast(`Test sent to ${sent.to || myEmail}.`, 'success');
        } catch (err) {
            console.error('Newsletter test failed:', err);
            addToast("Couldn't send the test. Please try again.", 'error');
        } finally {
            setTesting(false);
        }
    };

    const openReview = () => {
        if (problems.length) { addToast(problems[0], 'error'); return; }
        const recipients = audienceResult.recipients;
        const stats = audienceResult.stats;
        const label = describeAudience({ ...audience, segments: audience.segments.filter(s => NEWSLETTER_SEGMENTS.includes(s)) });
        const skipped = [
            stats.unsubscribed && `${stats.unsubscribed} unsubscribed`,
            stats.duplicates && `${stats.duplicates} duplicates`,
            stats.invalid && `${stats.invalid} invalid`,
            stats.excluded && `${stats.excluded} left out`,
        ].filter(Boolean);
        setSendJob({
            recipients,
            subject: finalSubject,
            html: htmlFor(false),
            accountType: 'weekly',
            summary: [
                { label: 'To', value: `${recipients.length.toLocaleString('en-IN')} ${recipients.length === 1 ? 'person' : 'people'} · ${label}` },
                skipped.length ? { label: 'Left out', value: skipped.join(', ') } : null,
                { label: 'From', value: 'Weekly by Concert Zone <weekly@newbi.live>' },
                { label: 'Subject', value: finalSubject },
                { label: 'Stories', value: `${selectedPosts.length}, featuring “${selectedPosts[0]?.title || ''}”` },
            ].filter(Boolean),
            warnings: [
                !testedAt && "You haven't sent yourself a test of this newsletter yet.",
                suppression.status === 'error' && "The unsubscribe list didn't load here. The server still skips unsubscribed people.",
            ].filter(Boolean),
            options: { audience: { label, segments: audience.segments, final: recipients.length } },
        });
    };

    const actionButtons = (phone) => (
        <>
            <Button variant="secondary" onClick={sendTest} disabled={testing} className={phone ? 'h-12 flex-1' : 'h-11'}>
                <FlaskConical size={15} /> {testing ? 'Sending…' : phone ? 'Test' : 'Send me a test'}
            </Button>
            <Button variant="primary" onClick={openReview} className={phone ? 'h-12 flex-[2]' : 'h-11'}>
                <Send size={15} /> Review &amp; send{audienceResult.stats.final ? ` · ${audienceResult.stats.final.toLocaleString('en-IN')}` : ''}
            </Button>
        </>
    );

    return (
        <AdminCommunityHubLayout
            hideTabs
            studioHeader={{ title: 'Newsletter studio', icon: Newspaper, description: 'Weekly by Concert Zone: stories, a note from the editor, and who gets it' }}
            action={<Button as={Link} to="/admin/mailing?tab=history" variant="secondary" className="w-full sm:w-auto"><History size={15} /> Sent newsletters</Button>}
        >
            <div className="pb-36 sm:pb-6">
                <div className="mb-4 xl:hidden">
                    <SegmentedTabs value={mobilePane} onChange={setMobilePane} className="w-full [&>button]:flex-1 [&>button]:justify-center" items={[
                        { value: 'edit', label: 'Build', icon: PenLine },
                        { value: 'preview', label: 'Preview', icon: Eye },
                    ]} />
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
                    <div className={cn('min-w-0 space-y-5', mobilePane === 'preview' && 'hidden xl:block')}>
                        <BuilderCard
                            title="Stories"
                            hint={`Pick up to ${MAX_STORIES}. The first one is featured.`}
                            action={<span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums', moduleAccent.chip)}>{selectedPosts.length} / {MAX_STORIES}</span>}
                        >
                            {selectedPosts.length > 0 && (
                                <ol className="mb-4 space-y-2">
                                    {selectedPosts.map((p, i) => (
                                        <li key={p.id} className={cn('flex items-center gap-3 rounded-xl border p-2', i === 0 ? cn(moduleAccent.border, moduleAccent.soft) : 'border-black/[0.06] dark:border-white/[0.08]')}>
                                            <img src={p.coverImage} alt="" className="h-12 w-16 shrink-0 rounded-lg bg-black/5 object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500">
                                                    {i === 0 ? <><Star size={12} className={moduleAccent.text} /> Featured</> : `Story ${i + 1}`}
                                                </p>
                                                <p className="truncate text-[14px] font-semibold">{p.title}</p>
                                            </div>
                                            <div className="flex shrink-0 items-center">
                                                <button type="button" onClick={() => move(p.id, -1)} disabled={i === 0} aria-label="Move up" className="flex h-10 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"><ArrowUp size={15} /></button>
                                                <button type="button" onClick={() => move(p.id, 1)} disabled={i === selectedPosts.length - 1} aria-label="Move down" className="flex h-10 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"><ArrowDown size={15} /></button>
                                                <button type="button" onClick={() => toggleStory(p)} aria-label="Remove story" className="flex h-10 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"><X size={15} /></button>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                            <SearchInput value={storySearch} onChange={(v) => { setStorySearch(v); setStoryLimit(24); }} placeholder="Search published stories" />
                            {storyRows.length === 0 ? (
                                <EmptyState icon={Newspaper} title={published.length ? 'No matching stories' : 'No published stories yet'} description={published.length ? 'Try another word.' : 'Publish a story in Concert Zone first.'} />
                            ) : (
                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {storyRows.slice(0, storyLimit).map(post => {
                                        const index = selectedIds.indexOf(post.id);
                                        const picked = index >= 0;
                                        return (
                                            <button
                                                key={post.id}
                                                type="button"
                                                onClick={() => toggleStory(post)}
                                                aria-pressed={picked}
                                                className={cn('overflow-hidden rounded-xl border text-left transition-colors',
                                                    picked ? cn(moduleAccent.border, moduleAccent.soft) : 'border-black/[0.08] hover:border-black/20 dark:border-white/[0.08] dark:hover:border-white/20')}
                                            >
                                                <div className="relative aspect-[16/10] bg-black/5 dark:bg-white/5">
                                                    {post.coverImage && <img src={post.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />}
                                                    {picked && (
                                                        <span className={cn('absolute right-2 top-2 flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5 text-[12px] font-bold', moduleAccent.solid)}>
                                                            {index === 0 ? <Star size={13} /> : index + 1}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-2.5">
                                                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{post.title}</p>
                                                    <p className="mt-0.5 truncate text-[11px] text-gray-500">{post.category || 'Story'}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {storyRows.length > storyLimit && (
                                <Button variant="secondary" className="mt-3 h-11 w-full" onClick={() => setStoryLimit(l => l + 24)}>Show more stories</Button>
                            )}
                        </BuilderCard>

                        <BuilderCard title="Editor's note" hint="Opens the newsletter. Optional, but it's what people read first.">
                            <div className={cn('mb-4 space-y-2 rounded-2xl border p-3', accent('violet').border, accent('violet').soft)}>
                                <p className="flex items-center gap-2 text-[13px] font-bold"><Sparkles size={15} className={accent('violet').text} /> Draft it with AI</p>
                                <textarea value={aiGuidance} onChange={(e) => setAiGuidance(e.target.value)} rows={2} className={areaCls} placeholder="Optional guidance, e.g. keep it upbeat and focus on local artists" />
                                <Button variant="secondary" className="h-11 w-full" disabled={generatingAI || !selectedPosts.length} onClick={() => (stripHtml(editorialText) ? setConfirmAi(true) : writeBriefing())}>
                                    <Sparkles size={14} /> {generatingAI ? 'Writing…' : 'Write the note from my stories'}
                                </Button>
                                {!selectedPosts.length && <p className="text-[12px] text-gray-500">Pick a story above first.</p>}
                            </div>
                            <RichEditor value={editorialText} onChange={setEditorialText} placeholder="A few lines to open this week's newsletter…" minHeight={180} label="Editor's note" />
                        </BuilderCard>

                        <BuilderCard title="Sponsored block" hint="Optional. Shown at the end, marked as sponsored.">
                            <RichEditor value={commercialContent} onChange={setCommercialContent} placeholder="Promotional copy…" minHeight={120} label="Sponsored block" />
                        </BuilderCard>

                        <BuilderCard title="Subject and preview text">
                            <div className="space-y-3">
                                <Field label="Subject" hint={subject.trim() ? undefined : `Leave empty to use “${defaultSubject}”`}>
                                    <input className={fieldCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={defaultSubject} />
                                </Field>
                                <Field label="Preview text" optional hint="Shown next to the subject in most inboxes.">
                                    <input className={fieldCls} value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder={defaultNewsletterSummary(selectedPosts)} />
                                </Field>
                            </div>
                        </BuilderCard>

                        <BuilderCard title="Who gets it" hint="Subscribers by default">
                            <AudienceBuilder
                                sources={sources}
                                audience={audience}
                                onChange={setAudience}
                                result={audienceResult}
                                suppression={{ status: suppression.status, onRetry: suppression.reload }}
                                allowed={NEWSLETTER_SEGMENTS}
                                knownPeople={knownPeople}
                            />
                        </BuilderCard>

                        <div className="sticky bottom-4 z-20 hidden items-center gap-2 rounded-2xl border border-black/[0.08] bg-white/95 p-3 shadow-lg backdrop-blur-xl dark:border-white/[0.1] dark:bg-[#0d0f15]/95 sm:flex">
                            <div className="min-w-0 flex-1">
                                {problems.length ? (
                                    <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-amber-700 dark:text-amber-300"><AlertTriangle size={14} className="shrink-0" /> {problems[0]}</p>
                                ) : (
                                    <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-gray-600 dark:text-zinc-300"><Check size={14} className="shrink-0" /> Ready for {audienceResult.stats.final.toLocaleString('en-IN')} people{testedAt ? ' · test sent' : ''}</p>
                                )}
                            </div>
                            {actionButtons(false)}
                        </div>
                    </div>

                    <aside className={cn('min-w-0 space-y-3 xl:sticky xl:top-24 xl:self-start', mobilePane === 'edit' && 'hidden xl:block')}>
                        <p className="text-[12px] font-bold text-gray-500">Preview</p>
                        {selectedPosts.length || stripHtml(editorialText) ? (
                            <EmailPreview
                                html={previewHtml}
                                subject={finalSubject}
                                preheader={summary}
                                fromName="Weekly by Concert Zone"
                                fromEmail="weekly@newbi.live"
                                theme={theme}
                                onThemeChange={setTheme}
                            />
                        ) : (
                            <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10">
                                <EmptyState icon={Newspaper} title="Nothing to preview yet" description="Pick a story and the newsletter appears here." />
                            </div>
                        )}
                    </aside>
                </div>

                <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b10]/95 sm:hidden">
                    {problems.length > 0 && <p className="mb-2 truncate text-[12px] font-semibold text-amber-700 dark:text-amber-300">{problems[0]}</p>}
                    <div className="flex gap-2">{actionButtons(true)}</div>
                </div>
            </div>

            <SendSheet
                open={!!sendJob}
                job={sendJob}
                onClose={() => setSendJob(null)}
                onFinished={(res) => { if (res.success) addToast(`Newsletter sent to ${res.sent.toLocaleString('en-IN')} people.`, 'success'); }}
                onViewReport={(id) => { setSendJob(null); navigate(`/admin/mailing?tab=history&campaign=${encodeURIComponent(id)}`); }}
            />

            <ConfirmDialog
                open={confirmAi}
                onClose={() => setConfirmAi(false)}
                title="Replace your note?"
                confirmLabel="Replace it"
                danger
                onConfirm={writeBriefing}
            >
                The AI draft will replace what's in the editor's note now.
            </ConfirmDialog>
        </AdminCommunityHubLayout>
    );
};

export default NewsletterStudio;
