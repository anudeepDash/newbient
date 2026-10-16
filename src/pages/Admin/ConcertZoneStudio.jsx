import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import PenSquare from 'lucide-react/dist/esm/icons/pen-square';
import Newspaper from 'lucide-react/dist/esm/icons/newspaper';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import FileEdit from 'lucide-react/dist/esm/icons/file-edit';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Star from 'lucide-react/dist/esm/icons/star';
import Edit from 'lucide-react/dist/esm/icons/edit-3';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Send from 'lucide-react/dist/esm/icons/send';
import Settings from 'lucide-react/dist/esm/icons/settings-2';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Clock from 'lucide-react/dist/esm/icons/clock';
import X from 'lucide-react/dist/esm/icons/x';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import Sheet from '../../components/admin/Sheet';
import { Card, Button, Badge, StatTile, SearchInput, Select, SegmentedTabs, EmptyState, Menu, MenuItem, ViewToggle, useViewMode } from '../../components/admin/ui';
import ExportMenu from '../../components/admin/ExportMenu';
import { fieldCls, Field } from '../../components/admin/uploads/UploadKit';
import { CONTENT_TABS, ConfirmSheet } from '../../components/admin/content/ContentKit';
import {
    BLOG_CATEGORIES, blogCategoryTone, postState, POST_STATE_LABEL, postPath, toDate, formatDay, formatDayTime,
    relativeTime, stripHtml, uniqueSlug, toDateInput,
} from '../../components/admin/content/contentRules';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'draft', label: 'Drafts' },
    { value: 'featured', label: 'Featured' },
    { value: 'sponsored', label: 'Tickets & sponsors' },
];

const PAGE = 30;

/** Blog posts on the public Concert Zone (/admin/blog). */
const ConcertZoneStudio = () => {
    useStoreSubscription(['posts', 'subscribers']);
    const { posts, subscribers = [], updatePost, deletePost, addPost, addToast } = useStore();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [sort, setSort] = useState('newest');
    const [view, setView] = useViewMode('blog', 'cards');
    const [limit, setLimit] = useState(PAGE);
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(params.get('settings') === '1');
    const busyRef = useRef(false);

    const filter = FILTERS.some(f => f.value === params.get('filter')) ? params.get('filter') : 'all';
    const setFilter = (v) => { const next = new URLSearchParams(params); if (v === 'all') next.delete('filter'); else next.set('filter', v); setParams(next, { replace: true }); setLimit(PAGE); };

    const rows = useMemo(() => posts.map(p => ({
        p,
        state: postState(p),
        when: toDate(p.publishAt || p.publishDate || p.createdAt),
        updated: toDate(p.updatedAt || p.createdAt),
    })), [posts]);

    const counts = useMemo(() => ({
        all: rows.length,
        published: rows.filter(r => r.state === 'published').length,
        scheduled: rows.filter(r => r.state === 'scheduled').length,
        draft: rows.filter(r => r.state === 'draft').length,
        featured: rows.filter(r => r.p.featured).length,
        sponsored: rows.filter(r => r.p.ticketingLink || r.p.sponsorName).length,
    }), [rows]);
    const totalViews = useMemo(() => posts.reduce((sum, p) => sum + (Number(p.viewCount) || 0), 0), [posts]);
    const nextScheduled = useMemo(() => rows.filter(r => r.state === 'scheduled').sort((a, b) => (a.when?.getTime() || 0) - (b.when?.getTime() || 0))[0], [rows]);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = rows.filter(({ p, state }) => {
            if (filter === 'featured' && !p.featured) return false;
            if (filter === 'sponsored' && !(p.ticketingLink || p.sponsorName)) return false;
            if (['published', 'scheduled', 'draft'].includes(filter) && state !== filter) return false;
            if (category !== 'all' && p.category !== category) return false;
            if (!q) return true;
            return [p.title, p.shortDescription, p.author, p.slug, ...(Array.isArray(p.tags) ? p.tags : [])].some(v => String(v || '').toLowerCase().includes(q));
        });
        const t = (d) => d?.getTime() || 0;
        if (sort === 'views') list.sort((a, b) => (Number(b.p.viewCount) || 0) - (Number(a.p.viewCount) || 0));
        else if (sort === 'updated') list.sort((a, b) => t(b.updated) - t(a.updated));
        else if (sort === 'title') list.sort((a, b) => String(a.p.title || '').localeCompare(String(b.p.title || '')));
        else list.sort((a, b) => t(b.when) - t(a.when));
        return list;
    }, [rows, filter, category, search, sort]);

    const guard = async (fn) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        try { await fn(); } finally { busyRef.current = false; setBusy(false); }
    };

    const publicUrl = (p) => `${window.location.origin}${postPath(p)}`;
    const copyLink = async (p) => {
        try { await navigator.clipboard.writeText(publicUrl(p)); addToast('Link copied.', 'success'); }
        catch { addToast("Couldn't copy. The link is " + publicUrl(p), 'info'); }
    };
    const toggleFeatured = (p) => guard(async () => {
        try {
            await updatePost(p.id, { featured: !p.featured });
            addToast(p.featured ? 'No longer featured.' : 'Featured on the blog and home page.', 'success');
        } catch (err) { console.error(err); addToast("Couldn't update the post. Please try again.", 'error'); }
    });
    const unpublish = (p) => guard(async () => {
        try {
            await updatePost(p.id, { status: 'Draft' });
            addToast('Moved to drafts. It is no longer on the site.', 'success');
        } catch (err) { console.error(err); addToast("Couldn't update the post. Please try again.", 'error'); }
    });
    const duplicate = (p) => guard(async () => {
        try {
            // eslint-disable-next-line no-unused-vars
            const { id, viewCount, shareCount, createdAt, updatedAt, notifiedAt, notifyCount, publishAt, ...rest } = p;
            const slug = uniqueSlug(`${p.slug || p.title}-copy`, posts);
            const ref = await addPost({ ...rest, title: `${p.title || 'Untitled'} (copy)`, slug, status: 'Draft', featured: false, publishDate: toDateInput(new Date()) });
            addToast('Copied as a new draft.', 'success');
            if (ref?.id) navigate(`/admin/blog/edit/${ref.id}`);
        } catch (err) { console.error(err); addToast("Couldn't copy the post. Please try again.", 'error'); }
    });
    const emailViaMailing = (p) => {
        const qs = new URLSearchParams({
            subject: p.title || 'New on Concert Zone',
            header: p.title || '',
            body: p.shortDescription || `${stripHtml(p.content).slice(0, 200)}…`,
            heroImage: p.coverImage || '',
            ctaText: 'Read the story',
            ctaUrl: publicUrl(p),
        });
        navigate(`/admin/mailing?${qs.toString()}`);
    };

    const runConfirm = () => guard(async () => {
        const { kind, item, email } = confirm || {};
        if (!item) return;
        try {
            if (kind === 'delete') {
                await deletePost(item.id);
                addToast('Post deleted.', 'success');
            } else if (kind === 'publish') {
                await updatePost(item.id, { status: 'Published', publishAt: new Date().toISOString(), publishDate: toDateInput(new Date()) });
                addToast('Published. It is live on the blog.', 'success');
            } else if (kind === 'notify') {
                const claimed = await useStore.getState().claimContentNotification('posts', item.id, { force: !!item.notifiedAt });
                if (!claimed) addToast('It was already sent a moment ago.', 'info');
                else {
                    await notifyAllUsers(`New article: ${item.title}`, item.shortDescription || 'Our latest blog post is up. Take a look.', postPath(item), item.coverImage || '', !!email);
                    addToast(email ? 'Notification and email sent.' : 'Notification sent to everyone.', 'success');
                }
            }
            setConfirm(null);
        } catch (err) {
            console.error(err);
            addToast("That didn't work. Please try again.", 'error');
        }
    });

    const exportSpec = () => ({
        filename: `blog_posts_${filter}`,
        sheetName: 'Posts',
        title: 'Blog posts',
        subtitle: `${shown.length} post${shown.length === 1 ? '' : 's'}`,
        rows: shown,
        totals: { views: true, shares: true },
        columns: [
            { header: 'Title', value: r => r.p.title || '' },
            { header: 'Status', value: r => POST_STATE_LABEL[r.state].label },
            { header: 'Category', value: r => r.p.category || '' },
            { header: 'Author', value: r => r.p.author || '' },
            { header: 'Publish date', type: 'datetime', value: r => r.when || null },
            { header: 'Featured', value: r => (r.p.featured ? 'Yes' : '') },
            { header: 'Views', key: 'views', type: 'number', value: r => Number(r.p.viewCount) || 0 },
            { header: 'Shares', key: 'shares', type: 'number', value: r => Number(r.p.shareCount) || 0 },
            { header: 'Tags', value: r => (Array.isArray(r.p.tags) ? r.p.tags.join(', ') : '') },
            { header: 'Sponsor', value: r => r.p.sponsorName || '' },
            { header: 'Ticket link', value: r => r.p.ticketingLink || '' },
            { header: 'Link', value: r => (r.state === 'published' ? publicUrl(r.p) : '') },
        ],
    });

    const actions = (p, state) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            <MenuItem icon={Edit} onClick={() => navigate(`/admin/blog/edit/${p.id}`)}>Edit</MenuItem>
            {state === 'published'
                ? <MenuItem as="a" href={postPath(p)} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>View on the site</MenuItem>
                : <MenuItem as="a" href={postPath(p)} target="_blank" rel="noopener noreferrer" icon={Eye} hint="Only the admin team can open it">Preview</MenuItem>}
            {state === 'published' && <MenuItem icon={Link2} onClick={() => copyLink(p)}>Copy link</MenuItem>}
            <MenuItem icon={Star} onClick={() => toggleFeatured(p)}>{p.featured ? 'Remove from featured' : 'Feature it'}</MenuItem>
            {state !== 'published' && <MenuItem icon={Send} onClick={() => setConfirm({ kind: 'publish', item: p })}>Publish now</MenuItem>}
            {state === 'published' && (
                <MenuItem icon={Bell} onClick={() => setConfirm({ kind: 'notify', item: p, email: false })} hint={p.notifiedAt ? `Already sent ${relativeTime(p.notifiedAt)}` : 'In-app and phone notification'}>
                    {p.notifiedAt ? 'Send notification again' : 'Send notification'}
                </MenuItem>
            )}
            {state === 'published' && <MenuItem icon={Mail} onClick={() => emailViaMailing(p)} hint="Opens Mailing with this filled in">Email as a campaign</MenuItem>}
            <MenuItem icon={Copy} onClick={() => duplicate(p)}>Duplicate as draft</MenuItem>
            {state !== 'draft' && <MenuItem icon={Undo2} onClick={() => unpublish(p)} hint="Takes it off the site">Move to drafts</MenuItem>}
            <MenuItem icon={Trash2} danger onClick={() => setConfirm({ kind: 'delete', item: p })}>Delete</MenuItem>
        </Menu>
    );

    const meta = ({ p, state, when }) => {
        if (state === 'scheduled') return `Goes live ${formatDayTime(when)}`;
        if (state === 'draft') return `Draft · edited ${relativeTime(p.updatedAt || p.createdAt) || 'recently'}`;
        return `${formatDay(when)} · ${Number(p.viewCount) || 0} views`;
    };

    const visible = shown.slice(0, limit);

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Blog', icon: PenSquare, description: 'Stories on Concert Zone, from draft to published' }}
            tabs={CONTENT_TABS}
            action={(
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                    <Button variant="accent" as={Link} to="/admin/blog/create" className="col-span-2 sm:order-last"><Plus size={15} /> New post</Button>
                    <Button variant="secondary" onClick={() => setSettingsOpen(true)}><Settings size={14} /> Blog page</Button>
                    <Button variant="secondary" as={Link} to="/admin/newsletter/studio"><Mail size={14} /> Newsletter</Button>
                </div>
            )}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={CheckCircle2} tone="green" label="Published" value={counts.published} hint={`${counts.featured} featured`} active={filter === 'published'} onClick={() => setFilter(filter === 'published' ? 'all' : 'published')} />
                    <StatTile icon={CalendarClock} tone="blue" label="Scheduled" value={counts.scheduled} hint={nextScheduled ? `Next ${formatDay(nextScheduled.when, false)}` : 'Nothing queued'} active={filter === 'scheduled'} onClick={() => setFilter(filter === 'scheduled' ? 'all' : 'scheduled')} />
                    <StatTile icon={FileEdit} tone="amber" label="Drafts" value={counts.draft} hint={counts.draft ? 'Waiting to go out' : 'All caught up'} active={filter === 'draft'} onClick={() => setFilter(filter === 'draft' ? 'all' : 'draft')} />
                    <StatTile icon={Eye} tone="indigo" label="Total views" value={totalViews.toLocaleString('en-IN')} hint={`${subscribers.length} newsletter subscribers`} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={(v) => { setSearch(v); setLimit(PAGE); }} placeholder="Title, author, tag or link" className="lg:w-80" />
                    <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-1 lg:items-center">
                        <Select value={category} onChange={(v) => { setCategory(v); setLimit(PAGE); }} label="Category" className="min-w-0 lg:w-44" options={[{ value: 'all', label: 'All categories' }, ...BLOG_CATEGORIES.map(c => ({ value: c.value, label: c.value }))]} />
                        <Select value={sort} onChange={setSort} label="Sort" className="min-w-0 lg:w-44" options={[
                            { value: 'newest', label: 'Newest first' },
                            { value: 'updated', label: 'Recently edited' },
                            { value: 'views', label: 'Most viewed' },
                            { value: 'title', label: 'Title A–Z' },
                        ]} />
                        <div className="col-span-2 flex items-center justify-end gap-2 lg:ml-auto">
                            <ExportMenu getSpec={exportSpec} />
                            <ViewToggle value={view} onChange={setView} />
                        </div>
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={filter} onChange={setFilter} items={FILTERS.filter(f => ['all', 'published', 'draft'].includes(f.value) || counts[f.value] > 0 || f.value === filter).map(f => ({ ...f, count: counts[f.value] }))} />
                </div>

                {visible.length === 0 ? (
                    <Card className="rounded-2xl">
                        <EmptyState
                            icon={Newspaper}
                            title={rows.length ? 'No posts match' : 'No posts yet'}
                            description={rows.length ? 'Try another filter, category or search.' : 'Write your first story. You can save it as a draft and publish when it is ready.'}
                            action={!rows.length && <Button variant="accent" as={Link} to="/admin/blog/create"><Plus size={14} /> New post</Button>}
                        />
                    </Card>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {visible.map((r) => {
                            const { p, state } = r;
                            const cfg = POST_STATE_LABEL[state];
                            return (
                                <Card key={p.id} className="relative flex flex-col overflow-hidden rounded-2xl transition-colors hover:border-black/15 dark:hover:border-white/15">
                                    <Link to={`/admin/blog/edit/${p.id}`} className="relative block aspect-[16/9] overflow-hidden bg-indigo-500/[0.07] dark:bg-indigo-400/[0.07]">
                                        {p.coverImage
                                            ? <img src={p.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" style={{ transform: `scale(${Math.max(0.5, Number(p.coverImageScale) || 1)})`, transformOrigin: `${p.coverImagePosX ?? 50}% ${p.coverImagePosY ?? 50}%` }} />
                                            : <span className="flex h-full w-full items-center justify-center text-indigo-500/50 dark:text-indigo-300/40"><Newspaper size={32} /></span>}
                                        {p.featured && <span className="absolute left-3 top-3"><Badge tone="amber" className="bg-white/90 dark:bg-black/70"><Star size={10} className="fill-current" /> Featured</Badge></span>}
                                    </Link>
                                    <div className="flex flex-1 flex-col p-4">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                            {p.category && <Badge tone={blogCategoryTone(p.category)}>{p.category}</Badge>}
                                            {p.ticketingLink && <Badge tone="orange"><Ticket size={10} /> Tickets</Badge>}
                                            {p.sponsorName && <Badge tone="fuchsia"><Sparkles size={10} /> {p.sponsorName}</Badge>}
                                        </div>
                                        <Link to={`/admin/blog/edit/${p.id}`} className="mt-2.5 min-w-0">
                                            <p className="line-clamp-2 text-[16px] font-extrabold leading-snug">{p.title || 'Untitled'}</p>
                                            {p.shortDescription && <p className="mt-1 line-clamp-2 text-[13px] text-gray-500 dark:text-zinc-400">{p.shortDescription}</p>}
                                        </Link>
                                        <p className={cn('mt-3 flex items-center gap-1.5 text-[12px] text-gray-500', state === 'scheduled' && 'font-semibold text-sky-600 dark:text-neon-blue')}>
                                            <Clock size={12} /> {meta(r)}
                                        </p>
                                        <p className="mt-0.5 text-[12px] text-gray-500">{p.author ? `By ${p.author}` : ''}{p.author && p.readingTime ? ' · ' : ''}{p.readingTime ? `${p.readingTime} min read` : ''}</p>
                                        <div className="flex-1" />
                                        <div className="mt-4 flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                            <Button size="sm" variant="secondary" as={Link} to={`/admin/blog/edit/${p.id}`} className="h-10 flex-1"><Edit size={13} /> Edit</Button>
                                            {state === 'published'
                                                ? <Button size="sm" variant="secondary" as="a" href={postPath(p)} target="_blank" rel="noopener noreferrer" className="h-10 flex-1"><ExternalLink size={13} /> View</Button>
                                                : <Button size="sm" variant="accent" onClick={() => setConfirm({ kind: 'publish', item: p })} className="h-10 flex-1"><Send size={13} /> Publish</Button>}
                                            {actions(p, state)}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="overflow-hidden rounded-2xl">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {visible.map((r) => {
                                const { p, state } = r;
                                const cfg = POST_STATE_LABEL[state];
                                return (
                                    <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                        <Link to={`/admin/blog/edit/${p.id}`} className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-indigo-500/[0.08] dark:bg-indigo-400/[0.08]">
                                            {p.coverImage ? <img src={p.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-indigo-500 dark:text-indigo-300"><Newspaper size={16} /></span>}
                                        </Link>
                                        <Link to={`/admin/blog/edit/${p.id}`} className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-[15px] font-bold">{p.title || 'Untitled'}</span>
                                                <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                                {p.featured && <Badge tone="amber"><Star size={10} className="fill-current" /> Featured</Badge>}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12px] text-gray-500">{[p.category, p.author, meta(r)].filter(Boolean).join(' · ')}</span>
                                        </Link>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => toggleFeatured(p)} disabled={busy} aria-label={p.featured ? 'Remove from featured' : 'Feature it'} className={cn('hidden h-10 w-10 px-0 sm:inline-flex', p.featured && 'text-amber-500')}>
                                                <Star size={15} className={p.featured ? 'fill-current' : ''} />
                                            </Button>
                                            {actions(p, state)}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                )}
                {shown.length > limit && (
                    <div className="text-center">
                        <Button variant="ghost" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, shown.length - limit)} more of {shown.length - limit}</Button>
                    </div>
                )}
            </div>

            <ConfirmSheet open={confirm?.kind === 'delete'} onClose={() => setConfirm(null)} title="Delete this post?" confirmLabel="Delete" busy={busy} onConfirm={runConfirm}>
                <p><span className="font-semibold text-gray-900 dark:text-white">{confirm?.item?.title}</span>{confirm?.item && postState(confirm.item) === 'published' ? ' is live. Its link will stop working and its view count will be lost.' : ' will be deleted.'} This can't be undone.</p>
                <p>To take it off the site but keep it, use <span className="font-semibold">Move to drafts</span>.</p>
            </ConfirmSheet>

            <ConfirmSheet open={confirm?.kind === 'publish'} onClose={() => setConfirm(null)} title="Publish now?" confirmLabel="Publish" tone="accent" busy={busy} onConfirm={runConfirm}>
                <p><span className="font-semibold text-gray-900 dark:text-white">{confirm?.item?.title}</span> goes live on the blog straight away{confirm?.item?.status === 'Scheduled' ? ', instead of at its scheduled time' : ''}.</p>
                <p>You can send a notification about it from its menu afterwards.</p>
            </ConfirmSheet>

            <ConfirmSheet open={confirm?.kind === 'notify'} onClose={() => setConfirm(null)} title={confirm?.item?.notifiedAt ? 'Notify everyone again?' : 'Notify everyone?'} confirmLabel={confirm?.email ? 'Send notification and email' : 'Send notification'} tone="accent" busy={busy} onConfirm={runConfirm}>
                <p>Everyone gets "New article: {confirm?.item?.title}" as an in-app and phone notification.</p>
                {confirm?.item?.notifiedAt && <p className="font-semibold text-amber-600 dark:text-amber-400">It was already sent {formatDayTime(confirm.item.notifiedAt)}. People will get it twice.</p>}
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-black/10 px-3 dark:border-white/10">
                    <input type="checkbox" className="h-5 w-5 accent-indigo-500" checked={!!confirm?.email} onChange={(e) => setConfirm(c => ({ ...c, email: e.target.checked }))} />
                    <span className="text-[13px] font-semibold text-gray-800 dark:text-zinc-200">Also email all registered users</span>
                </label>
            </ConfirmSheet>

            <BlogPageSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </AdminCommunityHubLayout>
    );
};

const DEFAULT_TICKER = ["Welcome to ConcertZone — India's music culture hub", 'New artist spotlights every week', 'Submit your story → editorial@newbi.live'];
const DEFAULT_LAYOUT = { mastheadVol: 'VOL 01', mastheadEst: 'EST. 2026', heroSubtitle: 'MUSIC, LIFE & CULTURE.', accentColor: '#00ffff' };

/** The scrolling ticker on the blog page, plus the masthead text. */
const BlogPageSettings = ({ open, onClose }) => {
    const { siteSettings = {}, updateGeneralSettings, addToast } = useStore();
    const [ticker, setTicker] = useState([]);
    const [layout, setLayout] = useState(DEFAULT_LAYOUT);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setTicker([...(Array.isArray(siteSettings.blogTicker) ? siteSettings.blogTicker : DEFAULT_TICKER)]);
        setLayout({ ...DEFAULT_LAYOUT, ...(siteSettings.concertzone || {}) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const save = async () => {
        if (saving) return;
        setSaving(true);
        try {
            await updateGeneralSettings({ blogTicker: ticker.map(t => t.trim()).filter(Boolean), concertzone: layout });
            addToast('Blog page saved.', 'success');
            onClose();
        } catch (err) {
            console.error(err);
            addToast("Couldn't save. Please try again.", 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={saving ? () => {} : onClose}
            size="md"
            title="Blog page"
            subtitle="The ticker that scrolls across the top of Concert Zone"
            footer={(
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={saving} className="h-12 flex-1">Cancel</Button>
                    <Button variant="accent" onClick={save} disabled={saving} className="h-12 flex-[2]">{saving ? 'Saving…' : 'Save'}</Button>
                </div>
            )}
        >
            <div className="space-y-6">
                <section className="space-y-2">
                    <h3 className="text-[15px] font-bold">Ticker lines</h3>
                    {ticker.map((line, i) => (
                        <div key={i} className="flex gap-2">
                            <input className={fieldCls} value={line} onChange={(e) => setTicker(t => t.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Short line of news" aria-label={`Ticker line ${i + 1}`} />
                            <button type="button" onClick={() => setTicker(t => t.filter((_, j) => j !== i))} aria-label="Remove line" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/10 text-gray-500 hover:text-red-500 dark:border-white/10"><X size={16} /></button>
                        </div>
                    ))}
                    <Button variant="secondary" onClick={() => setTicker(t => [...t, ''])} className="h-11 w-full"><Plus size={14} /> Add a line</Button>
                    {ticker.filter(t => t.trim()).length === 0 && <p className="text-[12px] text-gray-500">With no lines, the page shows its default ticker.</p>}
                </section>
                <section className="space-y-3">
                    <div>
                        <h3 className="text-[15px] font-bold">Masthead</h3>
                        <p className="text-[12px] text-gray-500">Saved for the blog header. The current blog design doesn't show these yet.</p>
                    </div>
                    <Field label="Subtitle"><input className={fieldCls} value={layout.heroSubtitle || ''} onChange={(e) => setLayout(l => ({ ...l, heroSubtitle: e.target.value }))} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Volume"><input className={fieldCls} value={layout.mastheadVol || ''} onChange={(e) => setLayout(l => ({ ...l, mastheadVol: e.target.value }))} /></Field>
                        <Field label="Established"><input className={fieldCls} value={layout.mastheadEst || ''} onChange={(e) => setLayout(l => ({ ...l, mastheadEst: e.target.value }))} /></Field>
                    </div>
                    <div>
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Accent colour</span>
                        <div className="flex flex-wrap items-center gap-2">
                            {['#00ffff', '#ff0055', '#bb00ff', '#00ff66', '#facc15'].map(c => (
                                <button key={c} type="button" onClick={() => setLayout(l => ({ ...l, accentColor: c }))} aria-label={`Accent ${c}`} aria-pressed={layout.accentColor === c}
                                    className={cn('h-10 w-10 rounded-xl border-2', layout.accentColor === c ? 'border-gray-900 dark:border-white' : 'border-transparent')} style={{ backgroundColor: c }} />
                            ))}
                            <input type="color" value={layout.accentColor || '#00ffff'} onChange={(e) => setLayout(l => ({ ...l, accentColor: e.target.value }))} aria-label="Custom accent colour" className="h-10 w-12 cursor-pointer rounded-xl border border-black/10 bg-transparent dark:border-white/10" />
                        </div>
                    </div>
                </section>
            </div>
        </Sheet>
    );
};

export default ConcertZoneStudio;
