import { useEffect } from 'react';

/*
 * Makes Safari's address bar / status bar (and Chrome's on Android, and the
 * home-screen app's status bar) take the colour of whatever is at the top of
 * the page, so the browser chrome and the site read as one surface.
 *
 * It looks at the element under the top edge of the screen, walks up until it
 * finds a background, blends any transparency over what's behind it, and
 * writes that into <meta name="theme-color">. It re-checks on route changes,
 * theme changes and (throttled) on scroll, since navbars often change colour
 * as you scroll.
 */

const parse = (c) => {
    const m = String(c || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = '1'] = m[1].split(/[,\s/]+/).filter(Boolean);
    return { r: +r, g: +g, b: +b, a: +a };
};

const blend = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
});

const hex = ({ r, g, b }) => `#${[r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

// The page colour behind everything (html, then body), as a solid colour.
const pageBase = () => {
    for (const el of [document.body, document.documentElement]) {
        const c = parse(getComputedStyle(el).backgroundColor);
        if (c && c.a > 0) return c.a < 1 ? blend(c, { r: 255, g: 255, b: 255, a: 1 }) : c;
    }
    return document.documentElement.classList.contains('dark') ? { r: 0, g: 0, b: 0, a: 1 } : { r: 248, g: 249, b: 250, a: 1 };
};

// Solid colour of the stack at a point: blend each translucent layer over the next one down.
const colourAt = (x, y) => {
    const base = pageBase();
    let el = document.elementFromPoint(x, y);
    const layers = [];
    while (el && el !== document.documentElement) {
        const c = parse(getComputedStyle(el).backgroundColor);
        if (c && c.a > 0) {
            layers.push(c);
            if (c.a >= 0.98) break;
        }
        el = el.parentElement;
    }
    // Innermost first in `layers`; paint from the outermost (bottom) up.
    return layers.reverse().reduce((under, layer) => blend(layer, under), base);
};

let meta = null;
const setThemeColor = (color) => {
    if (!meta) {
        // One tag, no media query: a manual light/dark choice must win over the OS setting.
        document.querySelectorAll('meta[name="theme-color"]').forEach((m, i) => { if (i > 0) m.remove(); });
        meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.removeAttribute('media');
    }
    if (meta.getAttribute('content') !== color) meta.setAttribute('content', color);
};

export const updateBrowserChrome = () => {
    if (typeof document === 'undefined') return;
    try {
        const x = Math.round(window.innerWidth / 2);
        // Just below the status-bar inset, on the first real pixel row of the page.
        setThemeColor(hex(colourAt(x, 1)));
    } catch {
        /* never let this break the page */
    }
};

if (typeof window !== 'undefined') window.__nbUpdateChrome = updateBrowserChrome;

export const useSafariChrome = (routeKey) => {
    // Re-check after the route's content has painted (and once more for late layouts).
    useEffect(() => {
        const a = requestAnimationFrame(updateBrowserChrome);
        const b = setTimeout(updateBrowserChrome, 350);
        const c = setTimeout(updateBrowserChrome, 1200);
        return () => { cancelAnimationFrame(a); clearTimeout(b); clearTimeout(c); };
    }, [routeKey]);

    useEffect(() => {
        let pending = false;
        const onScroll = () => {
            if (pending) return;
            pending = true;
            setTimeout(() => { pending = false; updateBrowserChrome(); }, 200);
        };
        // Theme toggles flip the class on <html>; follow them.
        const observer = new MutationObserver(() => { setTimeout(updateBrowserChrome, 60); setTimeout(updateBrowserChrome, 420); }); // after the 0.3s colour transition too
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
        mq?.addEventListener?.('change', onScroll);
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            mq?.removeEventListener?.('change', onScroll);
        };
    }, []);
};
