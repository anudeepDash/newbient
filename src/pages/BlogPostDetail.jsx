import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Eye from 'lucide-react/dist/esm/icons/eye';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import BlogNewsletter from '../components/blog/BlogNewsletter';
import AdSenseSlot from '../components/blog/AdSenseSlot';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { TEST_POSTS } from './concertzone/testPosts';
import { isAdminRole } from '../constants/roles';
import { isPostPublic } from '../components/admin/content/contentRules';
import { CzShell, CzHeader, StoryCard, PostMedia, CategoryChip, Label, formatDate } from './concertzone/czShared';

const isTest = (p) => String(p?.id || '').includes('-test');

const shareBtn = 'h-11 px-4 inline-flex items-center gap-2 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15 text-sm font-semibold text-gray-800 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors';

function ShareRow({ post }) {
    const [canNative, setCanNative] = useState(false);
    useEffect(() => { setCanNative(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);

    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `Read "${post.title}" on ConcertZone`;
    const count = () => { if (!isTest(post)) useStore.getState().incrementPostShare?.(post.id); };
    const open = (href) => { count(); window.open(href, '_blank', 'noopener,noreferrer'); };

    const native = async () => {
        try { await navigator.share({ title: post.title, text, url }); count(); } catch { /* closed the sheet */ }
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            count();
            useStore.getState().addToast?.('Link copied.', 'success');
        } catch {
            useStore.getState().addToast?.('Could not copy the link.', 'error');
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {canNative && <button type="button" onClick={native} className={shareBtn}><Share2 size={16} aria-hidden="true" /> Share</button>}
            <button type="button" onClick={() => open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`)} className={shareBtn}><MessageCircle size={16} aria-hidden="true" /> WhatsApp</button>
            <button type="button" onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)} className={shareBtn} aria-label="Share on X"><Twitter size={16} aria-hidden="true" /> X</button>
            <button type="button" onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)} className={shareBtn}><Linkedin size={16} aria-hidden="true" /> LinkedIn</button>
            <button type="button" onClick={copy} className={shareBtn}><LinkIcon size={16} aria-hidden="true" /> Copy link</button>
        </div>
    );
}

const BlogPostDetail = () => {
    useStoreSubscription(['posts']);
    const { slug } = useParams();
    const { posts } = useStore();
    const viewerRole = useStore((state) => state.user?.role);
    const articleRef = useRef(null);

    const { scrollYProgress } = useScroll({ target: articleRef, offset: ['start start', 'end end'] });
    const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

    const post = useMemo(() => {
        // Drafts and posts scheduled for later are only visible to the admin team (for previews).
        const canPreview = isAdminRole(viewerRole) && !['scanner', 'gate_manager'].includes(viewerRole);
        const found = posts.find((p) => p.slug === slug && (isPostPublic(p) || canPreview));
        return found || TEST_POSTS.find((p) => p.slug === slug);
    }, [posts, slug, viewerRole]);

    useDynamicMeta({
        title: post ? (post.seoTitle || post.title) : undefined,
        description: post ? post.shortDescription : 'Read this article on ConcertZone.',
        image: post?.coverImage,
        url: window.location.href,
        page: 'post',
    });

    // Same section first, then the newest of the rest.
    const relatedPosts = useMemo(() => {
        if (!post) return [];
        const pool = (posts.length > 0 ? posts.filter((p) => isPostPublic(p)) : TEST_POSTS)
            .filter((p) => p.id !== post.id)
            .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
        const same = pool.filter((p) => p.category === post.category);
        const other = pool.filter((p) => p.category !== post.category);
        return [...same, ...other].slice(0, 3);
    }, [posts, post]);

    useEffect(() => {
        if (post?.id && !isTest(post)) useStore.getState().incrementPostView?.(post.id);
    }, [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!post) {
        return (
            <CzShell>
                <div className="max-w-xl mx-auto px-4 py-28 text-center">
                    <Label>404</Label>
                    <h1 className="mt-3 font-heading text-4xl md:text-5xl font-extrabold tracking-[-0.04em]">This story isn't here.</h1>
                    <p className="mt-4 text-gray-600 dark:text-zinc-400">It may have been moved or unpublished.</p>
                    <Link to="/concertzone" className="mt-8 inline-flex h-12 px-6 items-center gap-2 rounded-full bg-gray-950 text-white dark:bg-white dark:text-black font-heading font-bold">
                        <ArrowLeft size={16} aria-hidden="true" /> All stories
                    </Link>
                </div>
            </CzShell>
        );
    }

    const isPreview = !isTest(post) && !isPostPublic(post);
    const tags = (post.tags || []).map((t) => (typeof t === 'string' ? t : (t?.name || t?.label || ''))).filter(Boolean);
    const categoryPath = post.category ? `/concertzone/${post.category.toLowerCase().replace(' ', '-')}` : '/concertzone';

    const header = (
        <CzHeader
            progressBar={(
                <motion.div aria-hidden="true" className="absolute left-0 right-0 bottom-0 h-0.5 origin-left bg-[var(--cz-accent)]" style={{ scaleX: progress }} />
            )}
        />
    );

    return (
        <CzShell header={header}>
            {isPreview && (
                <p role="status" className="bg-amber-300 text-black text-sm font-semibold text-center px-4 py-2.5">
                    Preview: this story isn't public yet. Only the team can see it.
                </p>
            )}

            <article ref={articleRef}>
                {/* Title block */}
                <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 md:pt-14">
                    <Link to={categoryPath} className="inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white">
                        <ArrowLeft size={16} aria-hidden="true" /> {post.category || 'ConcertZone'}
                    </Link>
                    <h1 className="mt-4 font-heading font-extrabold tracking-[-0.04em] leading-[1.02] text-[2.4rem] sm:text-5xl md:text-6xl text-gray-950 dark:text-white break-words">
                        {post.title}
                    </h1>
                    {post.shortDescription && (
                        <p className="mt-5 text-lg md:text-xl leading-relaxed text-gray-600 dark:text-zinc-400">{post.shortDescription}</p>
                    )}
                    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                        <div className="flex items-center gap-3">
                            <span aria-hidden="true" className="w-10 h-10 rounded-full bg-[var(--cz-accent)] text-black font-heading font-extrabold flex items-center justify-center">
                                {(post.author || 'N').trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="leading-tight">
                                <span className="block text-sm font-semibold text-gray-950 dark:text-white">{post.author || 'Newbi Editorial'}</span>
                                <span className="block text-[13px] text-gray-500 dark:text-zinc-400">
                                    {[formatDate(post.publishDate, { day: 'numeric', month: 'long', year: 'numeric' }), `${post.readingTime || 5} min read`].filter(Boolean).join(' · ')}
                                </span>
                            </span>
                        </div>
                        {post.viewCount > 0 && (
                            <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-zinc-400">
                                <Eye size={14} aria-hidden="true" /> {post.viewCount.toLocaleString()} reads
                            </span>
                        )}
                    </div>
                </header>

                {/* Cover */}
                {(post.coverImage || post.videoUrl) && (
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 md:mt-10">
                        <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden rounded-[1.5rem] bg-zinc-900">
                            <PostMedia post={post} video eager />
                            {post.category && <CategoryChip className="absolute top-4 left-4">{post.category}</CategoryChip>}
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 md:pt-14">
                    <div className="cz-article">
                        <div dangerouslySetInnerHTML={{ __html: post.content || '' }} />
                    </div>

                    {post.ticketingLink && (
                        <div className="mt-12 rounded-[1.5rem] bg-gray-950 text-white dark:bg-white/[0.06] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
                            <div className="flex-1">
                                <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/60"><Ticket size={14} aria-hidden="true" /> Live</p>
                                <p className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-[-0.03em]">See it for yourself.</p>
                            </div>
                            <a
                                href={post.ticketingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="self-start sm:self-auto h-12 px-6 inline-flex items-center gap-2 rounded-full bg-[var(--cz-accent)] text-black font-heading font-bold hover:scale-[1.03] active:scale-[0.98] transition"
                            >
                                {post.ticketingButtonText || 'Get tickets'} <ArrowUpRight size={17} aria-hidden="true" />
                            </a>
                        </div>
                    )}

                    {post.sponsorName && (
                        <a href={post.sponsorLink || undefined} target="_blank" rel="noopener noreferrer sponsored" className="mt-8 flex items-center gap-4 rounded-2xl ring-1 ring-black/10 dark:ring-white/10 p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors">
                            {post.sponsorLogo && (
                                <span className="w-16 h-12 shrink-0 rounded-xl bg-white flex items-center justify-center p-2">
                                    <img src={post.sponsorLogo} alt="" className="max-w-full max-h-full object-contain" />
                                </span>
                            )}
                            <span className="min-w-0">
                                <span className="block text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500 dark:text-zinc-500">Supported by</span>
                                <span className="block font-heading font-bold text-gray-950 dark:text-white truncate">{post.sponsorName}</span>
                            </span>
                            {post.sponsorLink && <ArrowUpRight size={18} className="ml-auto shrink-0 text-gray-400" aria-hidden="true" />}
                        </a>
                    )}

                    {tags.length > 0 && (
                        <ul aria-label="Tags" className="mt-10 flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <li key={tag} className="h-8 px-3 inline-flex items-center rounded-full bg-black/[0.05] dark:bg-white/[0.06] text-[13px] text-gray-700 dark:text-zinc-300">#{tag}</li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-10 pt-8 border-t border-black/[0.08] dark:border-white/10">
                        <Label className="mb-3">Share this story</Label>
                        <ShareRow post={post} />
                    </div>

                    {import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_FOOTER && (
                        <AdSenseSlot className="mt-12" adSlot={import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_FOOTER} adFormat="horizontal" style={{ display: 'block', minHeight: '96px' }} />
                    )}
                </div>
            </article>

            {relatedPosts.length > 0 && (
                <section aria-labelledby="cz-more" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 mt-16 md:mt-24">
                    <div className="flex items-baseline justify-between gap-4 mb-6">
                        <h2 id="cz-more" className="font-heading text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">Keep reading</h2>
                        <Link to="/concertzone" className="min-h-[44px] inline-flex items-center text-sm font-semibold underline underline-offset-4 decoration-2 decoration-[var(--cz-accent)]">All stories</Link>
                    </div>
                    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {relatedPosts.map((p) => <li key={p.id}><StoryCard post={p} /></li>)}
                    </ul>
                </section>
            )}

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 mt-16 md:mt-24 mb-16">
                <BlogNewsletter />
            </div>
        </CzShell>
    );
};

export default BlogPostDetail;
