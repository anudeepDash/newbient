import { useEffect } from 'react';

const toAbsoluteUrl = (path) => {
    if (!path) return 'https://www.newbi.live/og-image.png';
    // Reject SVG files for OpenGraph images because WhatsApp, Instagram, and Twitter don't render SVGs in link previews
    if (path.endsWith('.svg') || path.includes('.svg?')) {
        return 'https://www.newbi.live/og-image.png';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://www.newbi.live';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${origin}${cleanPath}`;
};

const stripHtml = (input) => {
    if (!input) return '';
    return String(input)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, ' ')
        .replace(/<(br|hr)\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&ndash;/gi, '–')
        .replace(/&mdash;/gi, '—')
        .replace(/&hellip;/gi, '...')
        .replace(/&bull;/gi, '•')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\s+/g, ' ')
        .trim();
};

const useDynamicMeta = ({ title, description, image, url }) => {
    useEffect(() => {
        const defaultTitle = "Newbi Entertainment & Marketing";
        const defaultDesc = "Newbi Entertainment connects brands, colleges, and creators through talent management, live events, influencer marketing, and experiential campaigns.";
        const defaultImage = "https://www.newbi.live/og-image.png";
        const defaultUrl = typeof window !== 'undefined' ? window.location.href : "https://www.newbi.live/";

        const resolvedImage = toAbsoluteUrl(image);
        const resolvedUrl = url ? (url.startsWith('http') ? url : toAbsoluteUrl(url)) : defaultUrl;

        const setMeta = (name, property, content) => {
            if (!content) return;
            let el;
            if (property) {
                el = document.querySelector(`meta[property="${property}"]`);
                if (!el) {
                    el = document.createElement('meta');
                    el.setAttribute('property', property);
                    document.head.appendChild(el);
                }
            } else if (name) {
                el = document.querySelector(`meta[name="${name}"]`);
                if (!el) {
                    el = document.createElement('meta');
                    el.setAttribute('name', name);
                    document.head.appendChild(el);
                }
            }
            if (el) el.setAttribute('content', content);
        };

        const pageTitle = stripHtml(title ? (title.includes('Newbi') ? title : `${title} | Newbi Ent.`) : defaultTitle);
        const pageDesc = stripHtml(description) || defaultDesc;

        document.title = pageTitle;

        // Standard Meta
        setMeta('description', null, pageDesc);

        // Open Graph / Facebook / WhatsApp / Instagram
        setMeta(null, 'og:site_name', 'Newbi Entertainment & Marketing');
        setMeta(null, 'og:type', 'website');
        setMeta(null, 'og:title', title || defaultTitle);
        setMeta(null, 'og:description', pageDesc);
        setMeta(null, 'og:url', resolvedUrl);
        setMeta(null, 'og:image', resolvedImage);
        setMeta(null, 'og:image:secure_url', resolvedImage);
        setMeta(null, 'og:image:width', '1200');
        setMeta(null, 'og:image:height', '630');
        setMeta(null, 'og:image:type', resolvedImage.endsWith('.jpg') || resolvedImage.endsWith('.jpeg') ? 'image/jpeg' : 'image/png');

        // Twitter / X
        setMeta('twitter:card', null, 'summary_large_image');
        setMeta('twitter:site', null, '@newbi_live');
        setMeta('twitter:title', title || defaultTitle);
        setMeta('twitter:description', pageDesc);
        setMeta('twitter:url', resolvedUrl);
        setMeta('twitter:image', resolvedImage);

        return () => {
            // Cleanup: Revert to default
            document.title = defaultTitle;
            setMeta('description', null, defaultDesc);
            setMeta(null, 'og:title', defaultTitle);
            setMeta(null, 'og:description', defaultDesc);
            setMeta(null, 'og:image', defaultImage);
            setMeta(null, 'og:image:secure_url', defaultImage);
            setMeta(null, 'og:url', "https://www.newbi.live/");
            setMeta('twitter:title', null, defaultTitle);
            setMeta('twitter:description', null, defaultDesc);
            setMeta('twitter:image', null, defaultImage);
            setMeta('twitter:url', null, "https://www.newbi.live/");
        };
    }, [title, description, image, url]);
};

export default useDynamicMeta;
