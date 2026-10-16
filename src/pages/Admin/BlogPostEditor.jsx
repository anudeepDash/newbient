import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Check from 'lucide-react/dist/esm/icons/check';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Newspaper from 'lucide-react/dist/esm/icons/newspaper';
import User from 'lucide-react/dist/esm/icons/user';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Wand from 'lucide-react/dist/esm/icons/wand-2';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { cn } from '../../lib/utils';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { AccentContext } from '../../components/admin/theme';
import { Button, Badge } from '../../components/admin/ui';
import { fieldCls, areaCls, Field, Toggle, Choice } from '../../components/admin/uploads/UploadKit';
import { BuilderCard } from '../../components/admin/events/EditorParts';
import { ConfirmSheet, CharCount, LabelRow, ImagePicker, Slider } from '../../components/admin/content/ContentKit';
import {
    BLOG_CATEGORIES, blogCategoryTone, postState, postPath, slugify, slugTakenBy, uniqueSlug, wordCount, readingTime,
    stripHtml, toDate, toDateInput, toTimeInput, fromDateTimeInputs, todayInput, formatDay, formatDayTime,
} from '../../components/admin/content/contentRules';
import ThemedSelect from '../../components/admin/ThemedSelect';

const ACCENTS = ['#00F0FF', '#A855F7', '#39FF14', '#FF4F8B', '#FFD700', '#FF6B35', '#FFFFFF'];

const blankPost = (user) => ({
    title: '', slug: '', category: 'Live Events', author: user?.displayName || 'Newbi Team',
    shortDescription: '', seoTitle: '', content: '', tags: '',
    coverImage: '', coverImageScale: 1, coverImagePosX: 50, coverImagePosY: 50, accentColor: '#00F0FF',
    featured: false,
    ticketingLink: '', ticketingButtonText: 'Get tickets', sponsorName: '', sponsorLogo: '', sponsorLink: '',
    mode: 'draft', publishDate: todayInput(), scheduleDate: '', scheduleTime: '18:00',
    notifyPush: true, notifyEmail: false,
});

const fromPost = (p) => {
    const state = postState(p);
    const at = toDate(p.publishAt);
    return {
        ...blankPost(),
        title: p.title || '',
        slug: p.slug || '',
        category: p.category || 'Live Events',
        author: p.author || '',
        shortDescription: p.shortDescription || '',
        seoTitle: p.seoTitle || '',
        content: p.content || '',
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
        coverImage: p.coverImage || '',
        coverImageScale: Number(p.coverImageScale) > 0 ? Number(p.coverImageScale) : 1,
        coverImagePosX: p.coverImagePosX ?? 50,
        coverImagePosY: p.coverImagePosY ?? 50,
        accentColor: p.accentColor || BLOG_CATEGORIES.find(c => c.value === p.category)?.color || '#00F0FF',
        featured: !!p.featured,
        ticketingLink: p.ticketingLink || '',
        ticketingButtonText: p.ticketingButtonText || 'Get tickets',
        sponsorName: p.sponsorName || '',
        sponsorLogo: p.sponsorLogo || '',
        sponsorLink: p.sponsorLink || '',
        mode: state === 'published' ? 'now' : state === 'scheduled' ? 'schedule' : 'draft',
        publishDate: toDateInput(p.publishDate || p.createdAt) || todayInput(),
        scheduleDate: state === 'scheduled' && at ? toDateInput(at) : '',
        scheduleTime: state === 'scheduled' && at ? toTimeInput(at) : '18:00',
        notifyPush: false,
        notifyEmail: false,
    };
};

const SECTIONS = [
    { id: 'story', label: 'Story' },
    { id: 'body', label: 'Body' },
    { id: 'cover', label: 'Cover' },
    { id: 'seo', label: 'Search' },
    { id: 'extras', label: 'Tickets' },
    { id: 'publish', label: 'Publish' },
];

const BlogPostEditor = () => {
    useStoreSubscription(['posts']);
    const { id } = useParams();
    const navigate = useNavigate();
    const { posts, addPost, updatePost, user, addToast, subscriptionsLoaded } = useStore();
    const original = id ? posts.find(p => p.id === id) : null;
    const notFound = id && subscriptionsLoaded?.posts && !original;

    const [form, setForm] = useState(() => blankPost(user));
    const [baseline, setBaseline] = useState(() => JSON.stringify(blankPost(user)));
    const [loadedId, setLoadedId] = useState(null);
    const [slugTouched, setSlugTouched] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewKind, setPreviewKind] = useState('article');
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);
    const [confirm, setConfirm] = useState(null); // 'leave' | 'slug'
    const lock = useRef(false);

    // Load the post once. Later snapshots (someone reading it bumps the view
    // count) must not wipe what you are typing.
    useEffect(() => {
        if (!id || !original || loadedId === id) return;
        const next = fromPost(original);
        setForm(next);
        setBaseline(JSON.stringify(next));
        setSlugTouched(true);
        setLoadedId(id);
    }, [id, original, loadedId]);

    const dirty = JSON.stringify(form) !== baseline;
    useEffect(() => {
        if (!dirty) return undefined;
        const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const set = (patch) => setForm(f => ({ ...f, ...patch }));
    const setTitle = (title) => setForm(f => ({ ...f, title, ...(slugTouched ? {} : { slug: uniqueSlug(title, posts, id) }) }));

    const wasPublished = original ? postState(original) === 'published' : false;
    // The link is cleaned (lowercase, dashes) when saved; check that version.
    const cleanSlug = slugify(form.slug);
    const slugClash = cleanSlug ? slugTakenBy(cleanSlug, posts, id) : null;
    const slugChangedLive = wasPublished && original?.slug && cleanSlug !== original.slug;
    const scheduledAt = form.mode === 'schedule' ? fromDateTimeInputs(form.scheduleDate, form.scheduleTime) : '';
    const words = useMemo(() => wordCount(form.content), [form.content]);
    const minutes = useMemo(() => readingTime(form.content), [form.content]);
    const becomingLive = form.mode === 'now' && !wasPublished;

    const problems = useMemo(() => {
        const out = {};
        if (!form.title.trim()) out.title = 'Add a headline.';
        if (!cleanSlug) out.slug = 'Add a link for the post (letters and numbers).';
        else if (slugClash) out.slug = `"${slugClash.title || 'Another post'}" already uses this link.`;
        if (form.mode !== 'draft' && !stripHtml(form.content)) out.content = 'Write the story before publishing.';
        if (form.mode === 'schedule') {
            if (!scheduledAt) out.schedule = 'Pick a date and time.';
            else if (new Date(scheduledAt).getTime() <= Date.now()) out.schedule = 'Pick a time in the future, or choose Publish now.';
        }
        if (form.ticketingLink && !/^https?:\/\//i.test(form.ticketingLink)) out.ticketingLink = 'Start the link with https://';
        if (form.sponsorLink && !/^https?:\/\//i.test(form.sponsorLink)) out.sponsorLink = 'Start the link with https://';
        return out;
    }, [form, cleanSlug, slugClash, scheduledAt]);

    const goBack = () => { if (dirty) setConfirm('leave'); else navigate('/admin/blog'); };

    const doSave = async () => {
        if (lock.current) return;
        lock.current = true;
        setSaving(true);
        const nowIso = new Date().toISOString();
        const status = form.mode === 'draft' ? 'Draft' : form.mode === 'schedule' ? 'Scheduled' : 'Published';
        const publishAt = form.mode === 'schedule' ? scheduledAt
            : form.mode === 'now' ? (wasPublished ? (original?.publishAt || '') : nowIso)
                : '';
        const payload = {
            title: form.title.trim(),
            slug: cleanSlug,
            category: form.category,
            author: form.author.trim() || 'Newbi Team',
            shortDescription: form.shortDescription.trim(),
            seoTitle: form.seoTitle.trim(),
            content: form.content,
            tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
            readingTime: minutes,
            coverImage: form.coverImage || '',
            coverImageScale: form.coverImageScale,
            coverImagePosX: form.coverImagePosX,
            coverImagePosY: form.coverImagePosY,
            accentColor: form.accentColor,
            featured: !!form.featured,
            ticketingLink: form.ticketingLink.trim(),
            ticketingButtonText: form.ticketingButtonText.trim() || 'Get tickets',
            sponsorName: form.sponsorName.trim(),
            sponsorLogo: form.sponsorLogo || '',
            sponsorLink: form.sponsorLink.trim(),
            status,
            publishAt,
            publishDate: form.mode === 'schedule' ? form.scheduleDate : (becomingLive ? todayInput() : (form.publishDate || todayInput())),
        };
        const notify = becomingLive && form.notifyPush;
        const notice = () => notifyAllUsers(
            `New article: ${payload.title}`,
            payload.shortDescription || 'Our latest blog post is up. Take a look.',
            postPath(payload),
            payload.coverImage,
            !!form.notifyEmail,
        );
        try {
            if (id) {
                await updatePost(id, payload);
                if (notify) {
                    const claimed = await useStore.getState().claimContentNotification('posts', id);
                    if (claimed) await notice();
                }
            } else {
                await addPost({ ...payload, ...(notify ? { notifiedAt: nowIso, notifyCount: 1 } : {}) });
                if (notify) await notice();
            }
            setBaseline(JSON.stringify(form));
            addToast(
                status === 'Draft' ? 'Draft saved.'
                    : status === 'Scheduled' ? `Scheduled for ${formatDayTime(scheduledAt)}.`
                        : becomingLive ? (notify ? 'Published and everyone was notified.' : 'Published. It is live on the blog.')
                            : 'Changes saved.',
                'success'
            );
            navigate('/admin/blog');
        } catch (err) {
            console.error('Post save failed:', err);
            addToast("Couldn't save the post. Please try again.", 'error');
        } finally {
            lock.current = false;
            setSaving(false);
        }
    };

    const save = () => {
        setTouched(true);
        const keys = Object.keys(problems);
        if (keys.length) {
            const first = keys[0];
            const where = ['title', 'slug'].includes(first) ? 'story' : first === 'content' ? 'body' : first === 'schedule' ? 'publish' : 'extras';
            document.getElementById(`post-${where}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            addToast(problems[first], 'error');
            return;
        }
        if (slugChangedLive) { setConfirm('slug'); return; }
        doSave();
    };

    const primaryLabel = saving ? 'Saving…'
        : form.mode === 'draft' ? 'Save draft'
            : form.mode === 'schedule' ? 'Schedule'
                : wasPublished ? 'Update' : 'Publish';
    const err = (k) => touched && problems[k] ? <span role="alert" className="mt-1 block text-[12px] font-semibold text-red-600 dark:text-red-400">{problems[k]}</span> : null;
    const jump = (sid) => document.getElementById(`post-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (notFound) {
        return (
            <AccentContext.Provider value="indigo">
                <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f6f7f9] p-6 text-center font-heading dark:bg-[#07080b]">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"><Newspaper size={24} /></span>
                    <div>
                        <h1 className="text-[18px] font-bold">This post doesn't exist</h1>
                        <p className="text-[13px] text-gray-500">It may have been deleted.</p>
                    </div>
                    <Button variant="accent" as={Link} to="/admin/blog">Back to the blog</Button>
                </div>
            </AccentContext.Provider>
        );
    }

    const loading = id && !original;

    return (
        <AccentContext.Provider value="indigo">
            <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f7f9] font-heading text-gray-900 dark:bg-[#07080b] dark:text-white admin-hub-content-container">
                <header className="relative z-50 shrink-0 border-b border-black/[0.06] bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07080b]/90">
                    <div className="flex h-14 items-center gap-2 px-2 sm:px-4">
                        <button type="button" onClick={goBack} aria-label="Back to the blog" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-bold leading-tight">{id ? (form.title || 'Edit post') : 'New post'}</p>
                            <p className={cn('truncate text-[11px] font-medium', dirty ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500')}>
                                {loading ? 'Loading…' : dirty ? 'Unsaved changes' : wasPublished ? `Live since ${formatDay(original?.publishDate || original?.createdAt)}` : original ? 'Saved' : 'Not saved yet'}
                            </p>
                        </div>
                        <Button variant="secondary" onClick={() => setShowPreview(v => !v)} aria-label={showPreview ? 'Back to editing' : 'Preview'} className="h-10 xl:hidden">
                            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />} <span className="hidden sm:inline">{showPreview ? 'Edit' : 'Preview'}</span>
                        </Button>
                        {wasPublished && (
                            <Button variant="secondary" as="a" href={postPath(original)} target="_blank" rel="noopener noreferrer" className="hidden h-10 sm:inline-flex"><ExternalLink size={14} /> View</Button>
                        )}
                        <Button variant="accent" onClick={save} disabled={saving || loading} className="hidden h-10 px-5 sm:inline-flex">{primaryLabel}</Button>
                    </div>
                    <nav aria-label="Sections" className={cn('flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden', showPreview && 'hidden xl:flex')}>
                        {SECTIONS.map((s, i) => (
                            <button key={s.id} type="button" onClick={() => jump(s.id)} className="flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/5 text-[11px] font-bold dark:bg-white/10">{i + 1}</span>
                                {s.label}
                            </button>
                        ))}
                    </nav>
                </header>

                <main className="flex min-h-0 flex-1 overflow-hidden">
                    <section className={cn('min-w-0 flex-1 overflow-y-auto overscroll-contain', showPreview && 'hidden xl:block')}>
                        <div className="mx-auto max-w-3xl space-y-5 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-12">
                            {loading ? (
                                <div className="space-y-4">{[0, 1, 2].map(i => <div key={i} className="h-40 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />)}</div>
                            ) : (
                                <>
                                    <BuilderCard id="post-story" title="Story" hint="Headline, link and who wrote it">
                                        <div className="space-y-4">
                                            <label className="block">
                                                <LabelRow label="Headline" right={<CharCount value={form.title} ideal={30} max={90} />} />
                                                <textarea className={cn(areaCls, 'min-h-[76px] resize-none text-[18px] font-bold leading-snug')} rows={2} value={form.title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the story?" />
                                                {err('title')}
                                            </label>
                                            <div>
                                                <LabelRow label="Link" right={slugTouched && form.title && (
                                                    <button type="button" onClick={() => { set({ slug: uniqueSlug(form.title, posts, id) }); setSlugTouched(false); }} className="flex h-7 items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-300"><RefreshCw size={11} /> From headline</button>
                                                )} />
                                                <div className={cn('flex h-12 items-center overflow-hidden rounded-xl border bg-white dark:bg-white/[0.04]', touched && problems.slug ? 'border-red-400' : 'border-black/10 dark:border-white/10')}>
                                                    <span className="hidden shrink-0 pl-3.5 text-[13px] text-gray-400 sm:block">/concertzone/{form.category.toLowerCase().replace(' ', '-')}/</span>
                                                    <input
                                                        className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] font-semibold outline-none sm:pl-0.5"
                                                        value={form.slug}
                                                        onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }); }}
                                                        onBlur={() => set({ slug: slugify(form.slug) })}
                                                        placeholder="your-story-link"
                                                        autoCapitalize="off" autoCorrect="off" spellCheck={false}
                                                        aria-label="Link"
                                                    />
                                                    {cleanSlug && (problems.slug
                                                        ? <AlertCircle size={16} className="mr-3 shrink-0 text-red-500" />
                                                        : <Check size={16} className="mr-3 shrink-0 text-emerald-500" />)}
                                                </div>
                                                {problems.slug && cleanSlug ? (
                                                    <span role="alert" className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-red-600 dark:text-red-400">
                                                        {problems.slug}
                                                        {slugClash && <button type="button" onClick={() => set({ slug: uniqueSlug(form.slug, posts, id) })} className="text-indigo-600 underline dark:text-indigo-300">Use {uniqueSlug(form.slug, posts, id)}</button>}
                                                    </span>
                                                ) : err('slug') || (
                                                    <span className="mt-1 block text-[11px] text-gray-500">
                                                        {slugChangedLive ? <span className="font-semibold text-amber-600 dark:text-amber-400">This post is live: changing the link breaks links people have shared.</span> : slugTouched ? 'Free to use.' : 'Made from the headline. Edit it if you like.'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <Field label="Category">
                                                    <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={form.category} onChange={(e) => set({ category: e.target.value, accentColor: form.accentColor === BLOG_CATEGORIES.find(c => c.value === form.category)?.color ? (BLOG_CATEGORIES.find(c => c.value === e.target.value)?.color || form.accentColor) : form.accentColor })}>
                                                        {BLOG_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
                                                        {!BLOG_CATEGORIES.some(c => c.value === form.category) && <option value={form.category}>{form.category}</option>}
                                                    </ThemedSelect>
                                                </Field>
                                                <Field label="Author">
                                                    <input className={fieldCls} value={form.author} onChange={(e) => set({ author: e.target.value })} placeholder="Newbi Team" />
                                                </Field>
                                            </div>
                                            <label className="block">
                                                <LabelRow label="Short summary" right={<CharCount value={form.shortDescription} ideal={110} max={160} />} />
                                                <textarea className={cn(areaCls, 'min-h-[80px] resize-y')} value={form.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} placeholder="One or two sentences. Shows on cards, in notifications and in Google." />
                                                {!form.shortDescription && stripHtml(form.content) && (
                                                    <button type="button" onClick={() => set({ shortDescription: stripHtml(form.content).slice(0, 157).replace(/\s+\S*$/, '') + '…' })} className="mt-1 flex h-8 items-center gap-1 text-[12px] font-semibold text-indigo-600 dark:text-indigo-300"><Wand size={12} /> Use the start of the story</button>
                                                )}
                                            </label>
                                        </div>
                                    </BuilderCard>

                                    <BuilderCard id="post-body" title="Body" hint={`${words} word${words === 1 ? '' : 's'} · about ${minutes} min read`}>
                                        <StudioRichEditor value={form.content} onChange={(val) => set({ content: val })} placeholder="Write the story. Paste images straight in." minHeight="420px" accentColor="neon-blue" />
                                        {err('content')}
                                    </BuilderCard>

                                    <BuilderCard id="post-cover" title="Cover and colour" hint="The cover fills the top of the article and the card">
                                        <div className="space-y-4">
                                            <ImagePicker
                                                value={form.coverImage}
                                                onChange={(url) => set({ coverImage: url, coverImageScale: 1, coverImagePosX: 50, coverImagePosY: 50 })}
                                                aspect="aspect-video"
                                                imgStyle={{ transform: `scale(${form.coverImageScale})`, transformOrigin: `${form.coverImagePosX}% ${form.coverImagePosY}%` }}
                                                hint="Wide image, 1600 px or more · up to 10 MB"
                                            />
                                            {form.coverImage && (
                                                <div className="space-y-2 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
                                                    <Slider label="Zoom" value={Number(Number(form.coverImageScale).toFixed(2))} min={1} max={3} step={0.01} format={(v) => `${v}×`} onChange={(v) => set({ coverImageScale: v })} />
                                                    <Slider label="Focus left / right" value={form.coverImagePosX} min={0} max={100} step={1} format={(v) => `${v}%`} onChange={(v) => set({ coverImagePosX: v })} />
                                                    <Slider label="Focus up / down" value={form.coverImagePosY} min={0} max={100} step={1} format={(v) => `${v}%`} onChange={(v) => set({ coverImagePosY: v })} />
                                                    <button type="button" onClick={() => set({ coverImageScale: 1, coverImagePosX: 50, coverImagePosY: 50 })} className="flex h-8 items-center gap-1 text-[12px] font-semibold text-gray-500"><RefreshCw size={12} /> Reset framing</button>
                                                </div>
                                            )}
                                            <div>
                                                <span className="mb-1 block text-[12px] font-bold text-gray-500">Accent colour</span>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {ACCENTS.map(c => (
                                                        <button key={c} type="button" onClick={() => set({ accentColor: c })} aria-label={`Accent ${c}`} aria-pressed={form.accentColor?.toLowerCase() === c.toLowerCase()}
                                                            className={cn('h-10 w-10 rounded-xl border-2 shadow-sm', form.accentColor?.toLowerCase() === c.toLowerCase() ? 'border-gray-900 dark:border-white' : 'border-black/10 dark:border-white/10')} style={{ backgroundColor: c }} />
                                                    ))}
                                                    <input type="color" value={form.accentColor || '#00F0FF'} onChange={(e) => set({ accentColor: e.target.value })} aria-label="Custom accent colour" className="h-10 w-12 cursor-pointer rounded-xl border border-black/10 bg-transparent dark:border-white/10" />
                                                </div>
                                                <p className="mt-1 text-[11px] text-gray-500">Used for the category tag and highlights on the article.</p>
                                            </div>
                                        </div>
                                    </BuilderCard>

                                    <BuilderCard id="post-seo" title="Search and sharing" hint="How it looks in Google and when shared">
                                        <div className="space-y-4">
                                            <label className="block">
                                                <LabelRow label="Search title" optional right={<CharCount value={form.seoTitle || form.title} ideal={40} max={60} />} />
                                                <input className={fieldCls} value={form.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} placeholder={form.title || 'Uses the headline if empty'} />
                                            </label>
                                            <div>
                                                <LabelRow label="Search description" right={<CharCount value={form.shortDescription} ideal={110} max={160} />} />
                                                <p className="text-[12px] text-gray-500">Uses the short summary above.</p>
                                            </div>
                                            <div className="rounded-xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                                                <p className="truncate text-[12px] text-emerald-700 dark:text-neon-green">newbi.live › concertzone › {form.slug || '…'}</p>
                                                <p className="line-clamp-1 text-[17px] font-medium text-sky-700 dark:text-neon-blue">{(form.seoTitle || form.title || 'Your headline')} | Concert Zone</p>
                                                <p className="line-clamp-2 text-[13px] text-gray-600 dark:text-zinc-400">{form.shortDescription || 'Add a short summary so people know what the story is about.'}</p>
                                            </div>
                                            <Field label="Tags" optional hint="Separate with commas">
                                                <input className={fieldCls} value={form.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="techno, bangalore, festival" autoCapitalize="off" />
                                            </Field>
                                            {form.tags.trim() && (
                                                <div className="flex flex-wrap gap-1.5">{form.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => <Badge key={t} tone="indigo">#{t}</Badge>)}</div>
                                            )}
                                        </div>
                                    </BuilderCard>

                                    <BuilderCard id="post-extras" title="Tickets and sponsor" hint="Optional. Shown at the end of the article">
                                        <div className="space-y-4">
                                            <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                                                <label className="block">
                                                    <LabelRow label="Ticket link" optional />
                                                    <input className={fieldCls} value={form.ticketingLink} onChange={(e) => set({ ticketingLink: e.target.value.trim() })} placeholder="https://…" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                                                    {err('ticketingLink')}
                                                </label>
                                                <Field label="Button text">
                                                    <input className={fieldCls} value={form.ticketingButtonText} onChange={(e) => set({ ticketingButtonText: e.target.value })} placeholder="Get tickets" />
                                                </Field>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <Field label="Sponsor name" optional>
                                                    <input className={fieldCls} value={form.sponsorName} onChange={(e) => set({ sponsorName: e.target.value })} placeholder="Brand" />
                                                </Field>
                                                <label className="block">
                                                    <LabelRow label="Sponsor website" optional />
                                                    <input className={fieldCls} value={form.sponsorLink} onChange={(e) => set({ sponsorLink: e.target.value.trim() })} placeholder="https://brand.com" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                                                    {err('sponsorLink')}
                                                </label>
                                            </div>
                                            {(form.sponsorName || form.sponsorLogo) && (
                                                <ImagePicker label="Sponsor logo" optional value={form.sponsorLogo} onChange={(url) => set({ sponsorLogo: url })} aspect="aspect-[3/1]" contain />
                                            )}
                                        </div>
                                    </BuilderCard>

                                    <BuilderCard id="post-publish" title="Publish" hint="Drafts and scheduled posts are hidden from the public">
                                        <div className="space-y-4">
                                            <Choice
                                                value={form.mode}
                                                onChange={(v) => set({ mode: v, ...(v === 'schedule' && !form.scheduleDate ? { scheduleDate: toDateInput(new Date(Date.now() + 86400000)) } : {}) })}
                                                options={[
                                                    { value: 'draft', label: 'Draft', hint: 'Only the team' },
                                                    { value: 'now', label: wasPublished ? 'Published' : 'Publish now', hint: 'Live on the blog' },
                                                    { value: 'schedule', label: 'Schedule', hint: 'At a set time' },
                                                ]}
                                            />
                                            {form.mode === 'schedule' && (
                                                <div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="date" className={fieldCls} value={form.scheduleDate} min={todayInput()} onChange={(e) => set({ scheduleDate: e.target.value })} aria-label="Publish date" />
                                                        <input type="time" className={fieldCls} value={form.scheduleTime} onChange={(e) => set({ scheduleTime: e.target.value })} aria-label="Publish time" />
                                                    </div>
                                                    {err('schedule') || (scheduledAt && <p className="mt-1 text-[12px] text-gray-500">Goes live by itself on {formatDayTime(scheduledAt)}.</p>)}
                                                </div>
                                            )}
                                            {form.mode === 'now' && wasPublished && (
                                                <Field label="Date shown on the article">
                                                    <input type="date" className={fieldCls} value={form.publishDate} onChange={(e) => set({ publishDate: e.target.value })} />
                                                </Field>
                                            )}
                                            <Toggle label="Feature it" hint="Shows first on the blog and in the home page carousel" checked={form.featured} onChange={(v) => set({ featured: v })} />
                                            {becomingLive ? (
                                                <div className="space-y-3 border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                                                    <Toggle label="Notify everyone" hint={'In-app and phone notification: "New article: …"'} checked={form.notifyPush} onChange={(v) => set({ notifyPush: v, notifyEmail: v ? form.notifyEmail : false })} />
                                                    <Toggle label="Also write an email" hint="Opens Mailing with this filled in, so you pick who gets it" checked={form.notifyEmail} onChange={(v) => set({ notifyEmail: v, notifyPush: v ? true : form.notifyPush })} />
                                                </div>
                                            ) : form.mode === 'schedule' ? (
                                                <p className="border-t border-black/[0.06] pt-4 text-[12px] text-gray-500 dark:border-white/[0.06]">Notifications go out when you send them, so none is sent for a scheduled post. Once it's live, use "Send notification" in the blog list.</p>
                                            ) : wasPublished && original?.notifiedAt ? (
                                                <p className="border-t border-black/[0.06] pt-4 text-[12px] text-gray-500 dark:border-white/[0.06]">Everyone was notified {formatDayTime(original.notifiedAt)}.</p>
                                            ) : null}
                                        </div>
                                    </BuilderCard>
                                </>
                            )}
                        </div>
                    </section>

                    <aside className={cn('w-full flex-col overflow-hidden border-l border-black/[0.06] bg-white dark:border-white/[0.06] dark:bg-[#0b0c11] xl:flex xl:w-[440px] 2xl:w-[520px]', showPreview ? 'flex' : 'hidden')}>
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-2 dark:border-white/[0.06]">
                            <p className="text-[12px] font-bold text-gray-500">Live preview</p>
                            <div className="inline-flex rounded-xl bg-black/[0.04] p-1 dark:bg-white/[0.05]">
                                {[{ v: 'article', l: 'Article' }, { v: 'card', l: 'Card' }].map(o => (
                                    <button key={o.v} type="button" onClick={() => setPreviewKind(o.v)} aria-pressed={previewKind === o.v}
                                        className={cn('h-9 rounded-lg px-3 text-[12px] font-semibold', previewKind === o.v ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : 'text-gray-500')}>{o.l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-6">
                            {previewKind === 'card' ? <CardPreview form={form} minutes={minutes} /> : <ArticlePreview form={form} minutes={minutes} />}
                        </div>
                    </aside>
                </main>

                {/* Phone save bar */}
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07080b]/95 sm:hidden">
                    <div className="flex h-16 items-center gap-2 px-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-gray-500">{form.mode === 'draft' ? 'Draft' : form.mode === 'schedule' ? 'Scheduled' : 'Published'}</p>
                            <p className="truncate text-[13px] font-bold">{words} words · {minutes} min</p>
                        </div>
                        <Button variant="accent" onClick={save} disabled={saving || loading} className="h-12 px-5">{primaryLabel}</Button>
                    </div>
                </div>

                <ConfirmSheet open={confirm === 'leave'} onClose={() => setConfirm(null)} title="Leave without saving?" confirmLabel="Leave" onConfirm={() => { setConfirm(null); setBaseline(JSON.stringify(form)); navigate('/admin/blog'); }}>
                    <p>Your changes to this post will be lost.</p>
                </ConfirmSheet>
                <ConfirmSheet open={confirm === 'slug'} onClose={() => setConfirm(null)} title="Change the link of a live post?" confirmLabel="Change link" tone="accent" busy={saving} onConfirm={() => { setConfirm(null); doSave(); }}>
                    <p>The old link <span className="break-all font-mono text-[12px]">/{original?.slug}</span> will stop working. Anyone who shared it will land on a "not found" page.</p>
                </ConfirmSheet>
            </div>
        </AccentContext.Provider>
    );
};

const CardPreview = ({ form, minutes }) => (
    <div className="p-4">
        <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-black/[0.06] bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="relative aspect-[16/10] overflow-hidden bg-black/5 dark:bg-white/5">
                {form.coverImage
                    ? <img src={form.coverImage} alt="" className="h-full w-full object-cover" style={{ transform: `scale(${form.coverImageScale})`, transformOrigin: `${form.coverImagePosX}% ${form.coverImagePosY}%` }} />
                    : <span className="flex h-full w-full items-center justify-center text-gray-400"><Newspaper size={28} /></span>}
                <span className="absolute left-3 top-3 rounded-lg px-2.5 py-1 text-[11px] font-bold text-black" style={{ backgroundColor: form.accentColor }}>{form.category}</span>
            </div>
            <div className="space-y-2 p-4">
                <p className="line-clamp-2 text-[17px] font-extrabold leading-snug">{form.title || 'Your headline'}</p>
                <p className="line-clamp-3 text-[13px] text-gray-600 dark:text-zinc-400">{form.shortDescription || 'Your short summary shows here.'}</p>
                <p className="flex items-center gap-3 text-[12px] text-gray-500"><span>{formatDay(form.mode === 'schedule' ? form.scheduleDate : form.publishDate) || 'Today'}</span><span className="flex items-center gap-1"><Clock size={11} /> {minutes} min</span></p>
            </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-gray-500">How it appears in the blog grid and the home page.</p>
    </div>
);

const ArticlePreview = ({ form, minutes }) => (
    <div>
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-900">
            {form.coverImage && <img src={form.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ transform: `scale(${form.coverImageScale})`, transformOrigin: `${form.coverImagePosX}% ${form.coverImagePosY}%` }} />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 text-white">
                <span className="inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold text-black" style={{ backgroundColor: form.accentColor }}>{form.category}</span>
                <p className="text-[22px] font-extrabold leading-tight">{form.title || 'Your headline'}</p>
                <p className="flex flex-wrap items-center gap-3 text-[12px] text-white/70">
                    <span className="flex items-center gap-1"><User size={12} /> {form.author || 'Newbi Team'}</span>
                    <span>{formatDay(form.mode === 'schedule' ? form.scheduleDate : form.publishDate) || 'Today'}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {minutes} min</span>
                </p>
            </div>
        </div>
        <div className="p-5">
            {stripHtml(form.content)
                ? <div className="article-content" dangerouslySetInnerHTML={{ __html: form.content }} />
                : <p className="text-[13px] text-gray-400">The story shows here as you write it.</p>}
            {form.ticketingLink && (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-black" style={{ backgroundColor: form.accentColor }}><Ticket size={15} /> {form.ticketingButtonText || 'Get tickets'}</div>
            )}
            {form.sponsorName && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                    {form.sponsorLogo && <img src={form.sponsorLogo} alt="" className="h-8 w-16 object-contain" />}
                    <p className="text-[12px] text-gray-500">In partnership with <span className="font-semibold text-gray-900 dark:text-white">{form.sponsorName}</span></p>
                </div>
            )}
        </div>
    </div>
);

export default BlogPostEditor;
