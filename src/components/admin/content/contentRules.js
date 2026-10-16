/*
 * Rules for the Content module (announcements, blog, portfolio). Pure
 * functions, no React, so public pages can use the same checks as the admin.
 */

const pad = (n) => String(n).padStart(2, '0');

/** Date from a Firestore Timestamp, ISO string, "YYYY-MM-DD", number or Date. */
export const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string') {
        // A bare date means that day in local time, not UTC midnight.
        const bare = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (bare) return new Date(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3]));
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

/** "YYYY-MM-DD" in local time, for <input type="date">. */
export const toDateInput = (value) => {
    const d = toDate(value);
    return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
};

/** "HH:MM" in local time, for <input type="time">. */
export const toTimeInput = (value) => {
    const d = toDate(value);
    return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
};

/** Local date + time inputs → ISO string ('' when no date). */
export const fromDateTimeInputs = (date, time, fallbackTime = '00:00') => {
    if (!date) return '';
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = (time || fallbackTime).split(':').map(Number);
    const out = new Date(y, m - 1, d, hh || 0, mm || 0);
    return isNaN(out.getTime()) ? '' : out.toISOString();
};

export const todayInput = () => toDateInput(new Date());

export const formatDay = (value, withYear = true) => {
    const d = toDate(value);
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
};

export const formatDayTime = (value) => {
    const d = toDate(value);
    if (!d) return '';
    const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    return `${day}, ${time}`;
};

export const relativeTime = (value) => {
    const d = toDate(value);
    if (!d) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (Math.abs(mins) < 1) return 'just now';
    if (mins > 0 && mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (mins > 0 && hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    if (mins > 0 && days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return formatDay(d);
};

/* ── Announcements ─────────────────────────────────────────────────────── */

export const ANNOUNCEMENT_CATEGORIES = [
    { value: 'NEWS', label: 'News', tone: 'blue' },
    { value: 'UPDATE', label: 'Update', tone: 'teal' },
    { value: 'ALERT', label: 'Alert', tone: 'red' },
    { value: 'EVENT', label: 'Event', tone: 'pink' },
    { value: 'OPPORTUNITY', label: 'Opportunity', tone: 'violet' },
];

export const announcementCategory = (value) =>
    ANNOUNCEMENT_CATEGORIES.find(c => c.value === String(value || '').toUpperCase())
    || { value: value || 'NEWS', label: value ? String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase() : 'News', tone: 'gray' };

export const ANNOUNCEMENT_PRIORITIES = [
    { value: 'Normal', label: 'Normal', tone: 'gray' },
    { value: 'High', label: 'High', tone: 'amber' },
    { value: 'Critical', label: 'Critical', tone: 'red' },
];

/**
 * When an announcement shows. New records carry `startsAt` / `endsAt` (ISO,
 * '' for none). Older records only have `date`, which the old admin treated as
 * the last day (it deleted them the day after), so it stays the end date.
 */
export const announcementWindow = (a) => {
    if (!a) return { start: null, end: null };
    const hasWindow = Object.prototype.hasOwnProperty.call(a, 'endsAt') || Object.prototype.hasOwnProperty.call(a, 'startsAt');
    if (hasWindow) return { start: toDate(a.startsAt), end: toDate(a.endsAt) };
    const day = toDate(a.date);
    if (!day) return { start: null, end: null };
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    return { start: null, end };
};

/** 'scheduled' | 'live' | 'ended' */
export const announcementState = (a, now = Date.now()) => {
    const { start, end } = announcementWindow(a);
    if (start && start.getTime() > now) return 'scheduled';
    if (end && end.getTime() < now) return 'ended';
    return 'live';
};

export const isAnnouncementLive = (a, now = Date.now()) => announcementState(a, now) === 'live';

export const ANNOUNCEMENT_STATE_LABEL = {
    live: { label: 'Live', tone: 'green' },
    scheduled: { label: 'Scheduled', tone: 'blue' },
    ended: { label: 'Ended', tone: 'gray' },
};

/* ── Blog ──────────────────────────────────────────────────────────────── */

// The public blog filters by these exact labels.
export const BLOG_CATEGORIES = [
    { value: 'Live Events', tone: 'cyan', color: '#00F0FF' },
    { value: 'Artists', tone: 'violet', color: '#A855F7' },
    { value: 'Guides', tone: 'green', color: '#39FF14' },
    { value: 'Buzz', tone: 'pink', color: '#FF4F8B' },
];

export const blogCategoryTone = (cat) => BLOG_CATEGORIES.find(c => c.value === cat)?.tone || 'gray';

/** Matches the public link builder: "Live Events" → "live-events". */
export const categoryPath = (cat) => cat?.toLowerCase().replace(' ', '-') || 'news';

export const postPath = (post) => `/concertzone/${categoryPath(post?.category)}/${post?.slug || ''}`;

export const slugify = (text) => String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

/** Another post already uses this slug (links are found by slug alone). */
export const slugTakenBy = (slug, posts, selfId) =>
    (posts || []).find(p => p.id !== selfId && p.slug && p.slug === slug) || null;

export const uniqueSlug = (base, posts, selfId) => {
    const root = slugify(base) || 'post';
    if (!slugTakenBy(root, posts, selfId)) return root;
    for (let n = 2; n < 500; n++) {
        const next = `${root}-${n}`;
        if (!slugTakenBy(next, posts, selfId)) return next;
    }
    return `${root}-${Date.now().toString(36)}`;
};

/**
 * 'draft' | 'scheduled' | 'published'. A scheduled post whose time has come is
 * published (the store also flips it for everyone reading the blog).
 */
export const postState = (post, now = Date.now()) => {
    const status = String(post?.status || 'Draft');
    if (status === 'Published') return 'published';
    if (status === 'Scheduled') {
        const at = toDate(post.publishAt || post.publishDate);
        return at && at.getTime() <= now ? 'published' : 'scheduled';
    }
    return 'draft';
};

export const isPostPublic = (post) => postState(post) === 'published';

export const POST_STATE_LABEL = {
    published: { label: 'Published', tone: 'green' },
    scheduled: { label: 'Scheduled', tone: 'blue' },
    draft: { label: 'Draft', tone: 'amber' },
};

export const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const wordCount = (html) => {
    const text = stripHtml(html);
    return text ? text.split(' ').length : 0;
};

export const readingTime = (html) => Math.max(1, Math.ceil(wordCount(html) / 200));

/* ── Images ────────────────────────────────────────────────────────────── */

export const MAX_IMAGE_MB = 10;

/** A problem with a picked image, or '' when it's fine. */
export const imageProblem = (file, maxMb = MAX_IMAGE_MB) => {
    if (!file) return 'No file picked.';
    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|heic|heif|svg)$/i.test(file.name || '');
    if (!isImage) return "That isn't an image. Use a JPG, PNG or WebP.";
    if (file.size > maxMb * 1024 * 1024) return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${maxMb} MB.`;
    return '';
};
