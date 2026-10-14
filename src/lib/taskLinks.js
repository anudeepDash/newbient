/**
 * Utility functions for extracting, classifying, and rendering dynamic task links
 * and linkifying descriptions for mobile-optimized creator experience.
 */

const TRAILING_PUNCTUATION = /[.,;:!?'"\]}>]+$/;

/**
 * Turns whatever an admin pasted into a usable absolute URL, or null.
 * Handles missing protocols ("forms.gle/abc", "www.bookmyshow.com/..."),
 * protocol-relative links, stray quotes/angle brackets and trailing punctuation
 * picked up from sentences ("...forms.gle/abc.").
 */
export const normalizeLinkUrl = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    let url = raw.trim().replace(/^[<("'\s]+/, '').replace(/[>"'\s]+$/, '');
    url = url.replace(TRAILING_PUNCTUATION, '');
    // Drop a trailing ")" only when it isn't closing a "(" inside the URL.
    while (url.endsWith(')') && (url.match(/\(/g) || []).length < (url.match(/\)/g) || []).length) {
        url = url.slice(0, -1);
    }
    if (!url || /\s/.test(url)) return null;

    if (url.startsWith('//')) url = `https:${url}`;
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
        if (!/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#].*)?$/i.test(url)) return null;
        url = `https://${url}`;
    }

    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.href;
    } catch {
        return null;
    }
};

// Splits a matched URL into the link itself and any trailing punctuation that
// belongs to the surrounding sentence.
const splitTrailing = (match) => {
    const clean = normalizeLinkUrl(match);
    if (!clean) return { url: null, trailing: '' };
    const trailingMatch = match.match(/[.,;:!?'"\]}>)]+$/);
    let trailing = trailingMatch ? trailingMatch[0] : '';
    // Keep balanced closing parens as part of the URL.
    if (trailing && clean.endsWith(')')) trailing = trailing.replace(/^\)+/, '');
    return { url: clean, trailing };
};

// Anchors typed in the rich editor often have hrefs like "forms.gle/x", which the
// browser resolves relative to newbi.live and 404s. Repair the href and open
// external links in a new tab.
const fixExistingAnchor = (anchorHtml) => {
    return anchorHtml.replace(/^<a\b([^>]*)>/i, (openTag, attrs) => {
        let nextAttrs = attrs.replace(/\bhref\s*=\s*(["'])(.*?)\1/i, (full, quote, href) => {
            if (/^(mailto:|tel:|#|\/)/i.test(href.trim())) return full;
            const fixed = normalizeLinkUrl(href.replace(/&amp;/g, '&'));
            return fixed ? `href="${fixed.replace(/&/g, '&amp;').replace(/"/g, '%22')}"` : full;
        });
        if (!/\btarget\s*=/i.test(nextAttrs)) nextAttrs += ' target="_blank" rel="noopener noreferrer"';
        return `<a${nextAttrs}>`;
    });
};

const renderAnchor = (url) => {
    let domain = url;
    try {
        domain = new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {}
    const safeHref = url.replace(/"/g, '%22');
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-neon-green hover:underline underline-offset-2 break-all" onclick="event.stopPropagation()">${domain} ↗</a>`;
};

export const classifyUrl = (url, customLabel = '') => {
    if (!url) return null;
    const cleanUrl = normalizeLinkUrl(url);
    if (!cleanUrl) return null;

    let domain = '';
    try {
        domain = new URL(cleanUrl).hostname.replace(/^www\./, '');
    } catch (e) {
        domain = cleanUrl.slice(0, 30);
    }

    const lower = cleanUrl.toLowerCase();
    const labelLower = (customLabel || '').toLowerCase();

    // Check Ticket Link
    if (
        labelLower.includes('ticket') ||
        lower.includes('bookmyshow') ||
        lower.includes('insider.in') ||
        lower.includes('paytm.com/event') ||
        lower.includes('zomato.com/live') ||
        lower.includes('eventbrite') ||
        lower.includes('townscript') ||
        lower.includes('ticket')
    ) {
        return {
            url: cleanUrl,
            type: 'ticket',
            label: customLabel || 'Ticket Link (Story Sticker)',
            shortLabel: customLabel || 'Ticket Link',
            domain,
            actionText: 'Copy Link Sticker',
            badge: '🎟️ Story Sticker'
        };
    }

    // Check Instagram Reference / Repost
    if (
        labelLower.includes('repost') ||
        labelLower.includes('poster') ||
        lower.includes('instagram.com/p/') ||
        lower.includes('instagram.com/reel/') ||
        lower.includes('instagram.com/tv/') ||
        lower.includes('instagram.com/stories/')
    ) {
        return {
            url: cleanUrl,
            type: 'repost',
            label: customLabel || 'Repost Poster / Post',
            shortLabel: customLabel || 'View Poster',
            domain: 'instagram.com',
            actionText: 'Open in Instagram',
            badge: '📸 Reference Post'
        };
    }

    // Check Story Creative / Drive / Dropbox / Asset
    if (
        labelLower.includes('creative') ||
        labelLower.includes('asset') ||
        labelLower.includes('drive') ||
        lower.includes('drive.google.com') ||
        lower.includes('dropbox.com') ||
        lower.includes('wetransfer.com') ||
        lower.includes('mega.nz') ||
        lower.includes('cloudinary.com') ||
        lower.includes('res.cloudinary')
    ) {
        return {
            url: cleanUrl,
            type: 'creative',
            label: customLabel || 'Story Creative / Assets',
            shortLabel: customLabel || 'Download Asset',
            domain,
            actionText: 'Open Creative Kit',
            badge: '🎨 Story Creative'
        };
    }

    // Check Google Form (Submission / File upload form)
    if (
        labelLower.includes('google form') ||
        labelLower.includes('submission form') ||
        labelLower.includes('file upload') ||
        labelLower.includes('form link') ||
        lower.includes('forms.gle') ||
        lower.includes('docs.google.com/forms')
    ) {
        return {
            url: cleanUrl,
            type: 'google_form',
            label: customLabel || 'Google Form (Deliverable Submission)',
            shortLabel: customLabel || 'Google Form',
            domain: lower.includes('forms.gle') ? 'forms.gle' : (domain || 'forms.google.com'),
            actionText: 'Submit via Form (New Tab)',
            badge: '📝 Google Form'
        };
    }

    // Generic link
    return {
        url: cleanUrl,
        type: 'general',
        label: customLabel || `Link (${domain})`,
        shortLabel: customLabel || domain,
        domain,
        actionText: 'Open Link',
        badge: '🔗 Resource'
    };
};

/**
 * Extracts all unique URLs from a task object (explicit fields + embedded in description)
 */
export const extractTaskActionLinks = (task) => {
    if (!task) return [];

    const linkMap = new Map();

    const addLink = (url, label, explicitType) => {
        const trimmed = normalizeLinkUrl(url);
        if (!trimmed) return;
        if (!linkMap.has(trimmed)) {
            const classified = classifyUrl(trimmed, label);
            if (classified) {
                if (explicitType) classified.type = explicitType;
                if (label) classified.label = label;
                linkMap.set(trimmed, classified);
            }
        }
    };

    // 0. Google Form link (Highest priority action link for task submissions)
    if (task.googleFormLink) {
        addLink(task.googleFormLink, task.googleFormLabel || 'Submission Google Form', 'google_form');
    }
    if (task.formLink && !task.googleFormLink) {
        addLink(task.formLink, task.formLabel || 'Submission Google Form', 'google_form');
    }

    // 1. Explicit fields from Task Editor (with custom user-defined text)
    if (task.ticketLink) {
        addLink(task.ticketLink, task.ticketLabel || 'Ticket Link (Story Sticker)', 'ticket');
    }
    if (task.referencePostUrl) {
        addLink(task.referencePostUrl, task.referencePostLabel || 'Repost Poster / Post', 'repost');
    }
    if (task.creativeLink) {
        addLink(task.creativeLink, task.creativeLabel || 'Story Creative Assets', 'creative');
    }

    // 2. Custom links array (task.taskLinks or task.links)
    const customLinks = task.taskLinks || task.links || [];
    if (Array.isArray(customLinks)) {
        customLinks.forEach(item => {
            if (typeof item === 'string') addLink(item);
            else if (item && item.url) addLink(item.url, item.label, item.type);
        });
    }

    // 3. creativeLinks field
    if (Array.isArray(task.creativeLinks)) {
        task.creativeLinks.forEach(url => addLink(url, 'Creative Asset', 'creative'));
    } else if (typeof task.creativeLinks === 'string') {
        addLink(task.creativeLinks, 'Creative Asset', 'creative');
    }

    // 4. Fallback for older tasks with no explicit action links: auto-extract from description
    if (linkMap.size === 0 && task.description && typeof task.description === 'string') {
        const urlRegex = /https?:\/\/[^\s<>"'`)]+/gi;
        const matches = task.description.match(urlRegex) || [];

        matches.forEach(match => {
            const clean = normalizeLinkUrl(match);
            if (!clean) return;
            let derivedLabel = '';
            const lowerDesc = task.description.toLowerCase();
            const idx = lowerDesc.indexOf(clean.toLowerCase());
            if (idx > -1) {
                const snippetBefore = lowerDesc.slice(Math.max(0, idx - 40), idx);
                if (snippetBefore.includes('form') || clean.includes('forms.gle') || clean.includes('docs.google.com/forms')) derivedLabel = 'Google Form (Submission)';
                else if (snippetBefore.includes('ticket')) derivedLabel = 'Ticket Link (Story Sticker)';
                else if (snippetBefore.includes('repost') || snippetBefore.includes('poster')) derivedLabel = 'Repost Poster';
                else if (snippetBefore.includes('creative') || snippetBefore.includes('story')) derivedLabel = 'Story Creative';
            }
            addLink(clean, derivedLabel);
        });
    }

    return Array.from(linkMap.values());
};

/**
 * Returns the Google Form URL configured on a task (if any)
 */
export const getTaskGoogleFormUrl = (task) => {
    if (!task) return null;
    const explicitForm = normalizeLinkUrl(task.googleFormLink) || normalizeLinkUrl(task.formLink);
    if (explicitForm) return explicitForm;
    const links = extractTaskActionLinks(task);
    const formLink = links.find(l => l.type === 'google_form' || l.url.includes('forms.gle') || l.url.includes('docs.google.com/forms'));
    return formLink ? formLink.url : null;
};

/**
 * Strips out lines from the task description that are merely raw URLs
 * or duplicate link pointers (e.g. "Repost this poster: https://..." or "Add this ticket link: https://...")
 * if those exact links are already rendered as clean Action Buttons.
 * This prevents repetitive text and drastically shortens the deliverable cards!
 */
export const cleanTaskDescription = (description, actionLinks = []) => {
    if (!description || typeof description !== 'string') return '';
    if (!actionLinks || actionLinks.length === 0) return description;

    // Normalizing action link urls for matching
    const knownUrls = actionLinks.map(l => l.url.trim().toLowerCase());

    // Split HTML or text lines
    const rawSegments = description.split(/<br\s*\/?>|<\/p>|<p>|\n/gi);

    const filtered = rawSegments.filter(seg => {
        const text = seg.replace(/<[^>]*>/g, '').trim();
        if (!text) return false;

        const lower = text.toLowerCase();

        // Check if segment points to one of our action link URLs
        const hasKnownUrl = knownUrls.some(u => {
            if (lower.includes(u)) return true;
            try {
                const uObj = new URL(u);
                return uObj.pathname.length > 5 && lower.includes(uObj.pathname);
            } catch (e) {
                return false;
            }
        });

        if (hasKnownUrl) {
            // If the line is an intro to a link (e.g. "Repost this poster: ...", "Add this ticket link: ...")
            if (
                lower.startsWith('repost') ||
                lower.startsWith('add this ticket') ||
                lower.startsWith('ticket link') ||
                lower.startsWith('google form') ||
                lower.startsWith('form:') ||
                lower.startsWith('submit form') ||
                lower.startsWith('fill form') ||
                lower.startsWith('poster:') ||
                lower.startsWith('link:') ||
                lower.startsWith('url:') ||
                lower.startsWith('story link') ||
                lower.startsWith('creative:') ||
                lower.startsWith('http')
            ) {
                return false; // drop this redundant line
            }

            // Or if the line is basically just the URL with a tiny prefix
            if (text.length <= 150 && (lower.includes('http://') || lower.includes('https://'))) {
                return false;
            }
        }

        return true;
    });

    const result = filtered.join('<br/>').trim();
    // Return empty if only whitespace/breaks remain
    if (result.replace(/<br\s*\/?>/gi, '').trim().length === 0) {
        return '';
    }
    return result;
};

/**
 * Safely linkifies plain text or HTML content so any remaining URLs become clickable.
 */
export const linkifyContent = (htmlOrText) => {
    if (!htmlOrText || typeof htmlOrText !== 'string') return '';

    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(htmlOrText);

    if (hasHtmlTags) {
        // Only linkify text outside existing <a>…</a> elements and outside tags.
        const parts = htmlOrText.split(/(<a\b[\s\S]*?<\/a>|<[^>]+>)/gi);
        return parts.map(part => {
            if (part && /^<a\b/i.test(part)) return fixExistingAnchor(part);
            if (!part || part.startsWith('<')) return part;
            return part.replace(/https?:\/\/[^\s<>"'`]+/gi, (match) => {
                const { url, trailing } = splitTrailing(match);
                return url ? `${renderAnchor(url)}${trailing}` : match;
            });
        }).join('');
    }

    const urlRegex = /https?:\/\/[^\s<>"'`]+/gi;
    return htmlOrText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(urlRegex, (match) => {
            const { url, trailing } = splitTrailing(match.replace(/&amp;/g, '&'));
            return url ? `${renderAnchor(url.replace(/&/g, '&amp;'))}${trailing}` : match;
        })
        .replace(/\n/g, '<br/>');
};
