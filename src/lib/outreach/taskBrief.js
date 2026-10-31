/*
 * A deliverable's brief as plain text and tap-to-open links, for the
 * creator's posts page (/d/<token>) and the "task is live" WhatsApp
 * (campaign_task_live). The editor saves instructions as rich text (HTML).
 */

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&mdash;': '—', '&ndash;': '–' };

/** Rich text → plain lines (blocks and <br> become line breaks). */
export const plainBrief = (html) => String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ')
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l, i, all) => l || (i > 0 && all[i - 1]))
    .join('\n')
    .trim();

const isUrl = (u) => /^https?:\/\/\S+$/i.test(String(u || '').trim());

/** The task's buttons (submission form, ticket link, post to use, extra links) as [{ label, url }]. */
export const taskLinksOf = (task = {}) => {
    const out = [];
    const add = (label, url, fallback) => {
        const u = String(url || '').trim();
        if (isUrl(u) && !out.some(l => l.url === u)) out.push({ label: String(label || '').trim() || fallback, url: u.slice(0, 500) });
    };
    add(task.referencePostLabel, task.referencePostUrl, 'Post to use');
    add(task.ticketLabel, task.ticketLink, 'Ticket link');
    add(task.googleFormLabel, task.googleFormLink, 'Submission form');
    add(task.creativeLabel, task.creativeLink, 'Creative');
    (Array.isArray(task.taskLinks) ? task.taskLinks : []).forEach(l => add(l?.label, l?.url, 'Link'));
    return out.slice(0, 8);
};

const clip = (s, max) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/*
 * One line each, for WhatsApp template variables (Meta refuses line breaks
 * and long runs of spaces in them). Lines are joined with " · ".
 */
export const briefLine = (task, max = 420) => clip(plainBrief(task?.description).split('\n').filter(Boolean).join(' · '), max);
export const linksLine = (links, max = 220) => {
    let line = '';
    for (const l of links) {
        const next = `${line ? `${line} · ` : ''}${l.label}: ${l.url}`;
        if (next.length > max) break;
        line = next;
    }
    return line;
};
