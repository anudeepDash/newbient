import { useEffect } from 'react';
import {
    PAGES,
    BRANDS,
    DEFAULT_TITLE,
    DEFAULT_DESCRIPTION,
    brandOf,
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

/**
 * Sets the page's title, description and share tags while the page is mounted.
 * `page` is a key of PAGES in src/app/seo.js; title/description/url fall back to
 * that entry, and the entry's brand (Newbi or Concert Zone) picks the site name,
 * title suffix and default image. Server-side previews come from api/og.js,
 * which uses the same table.
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
        const fallbackImage = defaultOgImage(originFor('landing', host), brand.image);
        const resolved = (!LEGACY_DEFAULT_IMAGE.test(image || '') && toOgImage(image, window.location.origin)) || fallbackImage;

        applyMeta({
            title: pageTitle,
            description: pageDesc,
            url: pageLink.split('#')[0],
            image: { ...resolved, alt: imageAlt || resolved.alt || pageTitle },
            type: type || entry?.type || 'website',
            noindex: noindex ?? entry?.noindex,
            brand,
        });

        return () => {
            applyMeta({
                title: DEFAULT_TITLE,
                description: DEFAULT_DESCRIPTION,
                url: '',
                image: defaultOgImage(originFor('landing', host)),
                type: 'website',
                noindex: false,
                brand: BRANDS.newbi,
            });
        };
    }, [page, title, description, image, imageAlt, url, type, noindex]);
};

export default useDynamicMeta;
