import { useEffect } from 'react';
import {
    PAGES,
    SITE_NAME,
    TWITTER_SITE,
    DEFAULT_TITLE,
    DEFAULT_DESCRIPTION,
    DEFAULT_IMAGE,
    defaultOgImage,
    formatTitle,
    originFor,
    pageUrl,
    toDescription,
    toOgImage,
} from '../app/seo';

// Callers used to pass these files as their fallback; they're now one default image.
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

const applyMeta = ({ title, description, url, image, type, noindex }) => {
    document.title = title;
    setTag('name', 'description', description);
    setCanonical(url);
    setTag('name', 'robots', noindex ? 'noindex' : '');

    setTag('property', 'og:site_name', SITE_NAME);
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
    setTag('name', 'twitter:site', TWITTER_SITE);
    setTag('name', 'twitter:url', url);
    setTag('name', 'twitter:title', title);
    setTag('name', 'twitter:description', description);
    setTag('name', 'twitter:image', image.url);
    setTag('name', 'twitter:image:alt', image.alt);
};

/**
 * Sets the page's title, description and share tags while the page is mounted.
 * `page` is a key of PAGES in src/app/seo.js; title/description/url fall back to
 * that entry. Server-side previews come from api/og.js, which uses the same table.
 */
const useDynamicMeta = ({ page, title, description, image, imageAlt, url, type, noindex } = {}) => {
    useEffect(() => {
        const host = window.location.host;
        const entry = PAGES[page];
        const pageTitle = title ? formatTitle(title) : (entry?.title || DEFAULT_TITLE);
        const pageDesc = toDescription(description) || entry?.description || DEFAULT_DESCRIPTION;
        // Pages with an id in their path (/c/:id…) use the address they're on.
        const pageLink = url || (entry && !entry.path.includes(':') ? pageUrl(page, {}, host) : window.location.href);
        const fallbackImage = defaultOgImage(originFor('landing', host));
        const resolved = (!LEGACY_DEFAULT_IMAGE.test(image || '') && toOgImage(image, window.location.origin)) || fallbackImage;
        const isDefault = resolved.url.endsWith(DEFAULT_IMAGE.path);

        applyMeta({
            title: pageTitle,
            description: pageDesc,
            url: pageLink.split('#')[0],
            image: { ...resolved, alt: imageAlt || (isDefault ? DEFAULT_IMAGE.alt : pageTitle) },
            type: type || entry?.type || 'website',
            noindex: noindex ?? entry?.noindex,
        });

        return () => {
            applyMeta({
                title: DEFAULT_TITLE,
                description: DEFAULT_DESCRIPTION,
                url: '',
                image: { ...fallbackImage, alt: DEFAULT_IMAGE.alt },
                type: 'website',
                noindex: false,
            });
        };
    }, [page, title, description, image, imageAlt, url, type, noindex]);
};

export default useDynamicMeta;
