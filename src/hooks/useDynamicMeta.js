import { useEffect } from 'react';
import {
    PAGES,
    DEFAULT_TITLE,
    DEFAULT_DESCRIPTION,
    brandOf,
    defaultOgImage,
    formatTitle,
    isShareCard,
    ogImageOf,
    originFor,
    pageUrl,
    toDescription,
    toOgImage,
} from '../app/seo';

// Callers used to pass these files as their fallback; the page's own card replaces them.
const LEGACY_DEFAULT_IMAGE = /\/(og-image|og-brand)\.(png|jpe?g)(\?.*)?$/i;

const setTag = (attr, key, content) => {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (content === undefined || content === null || content === '') {
        el?.remove();
        return;
    }
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute('content', String(content));
};

const setCanonical = (href) => {
    let el = document.head.querySelector('link[rel="canonical"]');
    if (!href) {
        el?.remove();
        return;
    }
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
    }
    el.setAttribute('href', href);
};

const applyMeta = ({ title, description, url, image, type, noindex, brand }) => {
    document.title = title;
    setTag('name', 'description', description);
    setCanonical(url);
    setTag('name', 'robots', noindex ? 'noindex' : '');

    setTag('property', 'og:site_name', brand.siteName);
    setTag('property', 'og:type', type);
    setTag('property', 'og:title', title);
    setTag('property', 'og:description', description);
    setTag('property', 'og:url', url);
    setTag('property', 'og:image', image.url);
    setTag('property', 'og:image:secure_url', image.url.startsWith('https:') ? image.url : '');
    setTag('property', 'og:image:type', image.type);
    setTag('property', 'og:image:width', image.width);
    setTag('property', 'og:image:height', image.height);
    setTag('property', 'og:image:alt', image.alt);

    setTag('name', 'twitter:card', 'summary_large_image');
    setTag('name', 'twitter:site', brand.twitterSite);
    setTag('name', 'twitter:url', url);
    setTag('name', 'twitter:title', title);
    setTag('name', 'twitter:description', description);
    setTag('name', 'twitter:image', image.url);
    setTag('name', 'twitter:image:alt', image.alt);
};

const META_TAGS = [
    ['name', 'description'], ['name', 'robots'],
    ['property', 'og:site_name'], ['property', 'og:type'], ['property', 'og:title'], ['property', 'og:description'],
    ['property', 'og:url'], ['property', 'og:image'], ['property', 'og:image:secure_url'], ['property', 'og:image:type'],
    ['property', 'og:image:width'], ['property', 'og:image:height'], ['property', 'og:image:alt'],
    ['name', 'twitter:card'], ['name', 'twitter:site'], ['name', 'twitter:url'], ['name', 'twitter:title'],
    ['name', 'twitter:description'], ['name', 'twitter:image'], ['name', 'twitter:image:alt'],
];

// What was in <head> before a page set its own tags: the page underneath a
// sheet, or the defaults from index.html.
const snapshotMeta = () => ({
    title: document.title,
    canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    tags: META_TAGS.map(([attr, key]) => [attr, key, document.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? '']),
});

const restoreMeta = ({ title, canonical, tags }) => {
    document.title = title;
    setCanonical(canonical);
    tags.forEach(([attr, key, content]) => setTag(attr, key, content));
};

/**
 * Sets the page's title, description and share tags while the page is mounted.
 * `page` is a key of PAGES in src/app/seo.js; title/description/url fall back to
 * that entry, the entry's brand (Newbi or Concert Zone) picks the site name and
 * title suffix, and its section's card is the image when the page has none. Server-side previews come from api/og.js,
 * which uses the same table. On unmount the previous tags come back, so closing
 * a sheet gives the page underneath its title again.
 */
const useDynamicMeta = ({ page, title, description, image, imageAlt, url, type, noindex } = {}) => {
    useEffect(() => {
        const host = window.location.host;
        const entry = PAGES[page];
        const brand = brandOf(page);
        const pageTitle = title ? formatTitle(title, brand) : formatTitle(entry?.title || DEFAULT_TITLE, brand);
        const pageDesc = toDescription(description) || entry?.description || DEFAULT_DESCRIPTION;
        // Pages with an id in their path (/c/:id…) use the address they're on.
        const pageLink = url || (entry && !entry.path.includes(':') ? pageUrl(page, {}, host) : window.location.href);
        const fallbackImage = defaultOgImage(originFor('landing', host), ogImageOf(page));
        const ownImage = image && !LEGACY_DEFAULT_IMAGE.test(image) && !isShareCard(image) ? image : '';
        const resolved = toOgImage(ownImage, window.location.origin) || fallbackImage;

        const previous = snapshotMeta();
        applyMeta({
            title: pageTitle,
            description: pageDesc,
            url: pageLink.split('#')[0],
            image: { ...resolved, alt: imageAlt || resolved.alt || pageTitle },
            type: type || entry?.type || 'website',
            noindex: noindex ?? entry?.noindex,
            brand,
        });

        return () => restoreMeta(previous);
    }, [page, title, description, image, imageAlt, url, type, noindex]);
};

export default useDynamicMeta;
