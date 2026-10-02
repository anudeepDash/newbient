/**
 * Utility functions for extracting, classifying, and rendering dynamic task links
 * and linkifying descriptions for mobile-optimized creator experience.
 */

export const classifyUrl = (url, customLabel = '') => {
    if (!url) return null;
    const cleanUrl = url.trim();
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
        if (!url || typeof url !== 'string') return;
        const trimmed = url.trim();
        if (!/^https?:\/\//i.test(trimmed)) return;
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
            const clean = match.replace(/[.,;!]+$/, '');
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
    if (task.googleFormLink && typeof task.googleFormLink === 'string' && /^https?:\/\//i.test(task.googleFormLink.trim())) {
        return task.googleFormLink.trim();
    }
    if (task.formLink && typeof task.formLink === 'string' && /^https?:\/\//i.test(task.formLink.trim())) {
        return task.formLink.trim();
    }
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
        return htmlOrText.replace(
            /(?<!href=["']|src=["']|">)(https?:\/\/[^\s<>"'`)]+)/gi,
            (url) => {
                let domain = url;
                try {
                    domain = new URL(url).hostname.replace(/^www\./, '');
                } catch (e) {}
                return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-neon-green hover:underline underline-offset-2 break-all" onclick="event.stopPropagation()">${domain} ↗</a>`;
            }
        );
    }

    const urlRegex = /(https?:\/\/[^\s<>"'`)]+)/gi;
    return htmlOrText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(urlRegex, (url) => {
            let domain = url;
            try {
                domain = new URL(url).hostname.replace(/^www\./, '');
            } catch (e) {}
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-neon-green hover:underline underline-offset-2 break-all" onclick="event.stopPropagation()">${domain} ↗</a>`;
        })
        .replace(/\n/g, '<br/>');
};
