import DOMPurify from 'dompurify';

// Embeds we allow inside rich content (blog posts, documents, task briefs).
const TRUSTED_EMBED_HOSTS = [
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'open.spotify.com',
    'w.soundcloud.com',
    'www.instagram.com',
    'www.google.com',
    'docs.google.com',
    'drive.google.com',
];

let hooksInstalled = false;

const installHooks = () => {
    if (hooksInstalled) return;
    hooksInstalled = true;

    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
        if (data.tagName !== 'iframe') return;
        try {
            const src = new URL(node.getAttribute('src') || '', window.location.origin);
            if (src.protocol !== 'https:' || !TRUSTED_EMBED_HOSTS.includes(src.hostname)) {
                node.parentNode?.removeChild(node);
            }
        } catch {
            node.parentNode?.removeChild(node);
        }
    });

    // Links that open a new tab must not hand the opener to the target page.
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
            node.setAttribute('rel', 'noopener noreferrer');
        }
    });
};

/**
 * Sanitize HTML before rendering it with dangerouslySetInnerHTML.
 * Keeps formatting, inline styles, images, tables and trusted embeds;
 * strips scripts, event handlers and javascript: URLs.
 */
export const sanitizeHtml = (html) => {
    if (html === null || html === undefined) return '';
    const str = typeof html === 'string' ? html : String(html);
    if (!str) return '';
    if (typeof window === 'undefined') return str;
    installHooks();
    return DOMPurify.sanitize(str, {
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['target', 'allow', 'allowfullscreen', 'frameborder', 'scrolling'],
    });
};
