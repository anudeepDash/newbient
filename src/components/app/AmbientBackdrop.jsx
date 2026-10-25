import React, { useEffect, useMemo, useRef } from 'react';
import { cn } from '../../lib/utils';
import { isIOS } from '../../lib/platform';
import { AMBIENT_OFF, cleanAmbient, hexToHsl } from '../../lib/ambientColor';

/*
 * The ambient glow behind a hero: the image's own colours, blurred and faded
 * out, so the page takes on the poster's mood. Extracted from the campaign
 * modal (CampaignDetailModal), which stacked three live blur layers.
 *
 * Here there is at most one blur layer. On iPhone there is none: the glow is a
 * tiny version of the image stretched to size, which the browser smooths into
 * a blur for free (Cloudinary sends a pre-blurred 64px thumbnail; other hosts
 * draw into a 32px canvas). Live CSS blur over large areas is what makes iOS
 * Safari stutter and run out of GPU memory.
 *
 *   <div className="relative">
 *     <AmbientBackdrop image={poster} />
 *     ...content
 *   </div>
 */

const CLOUDINARY_UPLOAD = /(res\.cloudinary\.com\/[^/]+\/image\/upload\/)/;

/* A pre-blurred, tiny Cloudinary rendition, or null for other hosts. */
export const tinyBlurredUrl = (url) => {
    if (!url || !CLOUDINARY_UPLOAD.test(url)) return null;
    return url.replace(CLOUDINARY_UPLOAD, '$1w_64,e_blur:800,e_saturation:60,q_50,f_auto/');
};

/* A small (not blurred) Cloudinary rendition for the live-blur layer, or the original. */
const smallUrl = (url) => (url && CLOUDINARY_UPLOAD.test(url) ? url.replace(CLOUDINARY_UPLOAD, '$1w_480,q_60,f_auto/') : url);

const FADE = 'linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0) 100%)';

/* Draws the image into a small canvas; scaled up by CSS it reads as a soft blur. */
const TinyCanvas = ({ src, className, style }) => {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas || !src) return undefined;
        let cancelled = false;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            if (cancelled) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = src;
        return () => { cancelled = true; };
    }, [src]);
    return <canvas ref={ref} width={32} height={18} aria-hidden="true" className={className} style={style} />;
};

const AmbientBackdrop = ({
    image,
    className,
    /* Glow strength, 0–1. */
    intensity = 0.55,
    /* Blur radius for the single live layer (desktop/Android only). */
    blur = 80,
    /* Glow colour when there's no image (a gradient, so no blur either). */
    fallbackColor = 'rgba(16, 185, 129, 0.14)',
    /* Fade the glow out towards the bottom. */
    fade = true,
}) => {
    // Phones (and every iPhone) get the pre-blurred image instead of a live blur:
    // big live blurs are what made iPhone Safari paint the campaign page blank.
    const ios = useMemo(() => isIOS() || (typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width: 767px)').matches)), []);
    const tiny = useMemo(() => tinyBlurredUrl(image), [image]);
    const mask = fade ? { WebkitMaskImage: FADE, maskImage: FADE } : undefined;
    const layer = 'absolute -inset-[10%] h-[120%] w-[120%] transform-gpu';

    return (
        <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 -z-0 overflow-hidden', className)} style={mask}>
            {!image ? (
                <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${fallbackColor}, transparent 70%)` }} />
            ) : ios ? (
                tiny ? (
                    <div className={cn(layer, 'bg-cover bg-center')} style={{ backgroundImage: `url("${tiny}")`, opacity: intensity, filter: 'saturate(1.6) brightness(0.9)' }} />
                ) : (
                    <TinyCanvas src={image} className={cn(layer, 'object-cover')} style={{ opacity: intensity }} />
                )
            ) : (
                <div
                    className={cn(layer, 'bg-cover bg-center')}
                    style={{ backgroundImage: `url("${smallUrl(image)}")`, filter: `blur(${blur}px) saturate(1.9) brightness(0.9)`, opacity: intensity }}
                />
            )}
        </div>
    );
};

export default AmbientBackdrop;

/* ── Poster glow: a coloured light from the poster, not a blurred picture ── */

const colorCache = new Map();

/* A tiny rendition for sampling (Cloudinary resizes on the fly; others load as they are). */
const sampleUrl = (url) => (url && CLOUDINARY_UPLOAD.test(url) ? url.replace(CLOUDINARY_UPLOAD, '$1w_24,h_24,c_fill,f_png/') : url);

const toHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b); const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
};

/*
 * The poster's colours, or null while loading / if the image can't be read:
 * { main: [h, s, l] the strongest colour (what Auto glows), palette: up to
 * five distinct [h, s, l] (the admin's glow colour suggestions) }.
 */
const readPoster = (url) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
        try {
            const size = 24;
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            // Weight each pixel by how colourful it is (and not near black or white), and bin it by hue.
            const bins = Array.from({ length: 12 }, () => ({ x: 0, y: 0, w: 0, sat: 0 }));
            let x = 0; let y = 0; let wSum = 0; let satSum = 0;
            for (let i = 0; i < data.length; i += 4) {
                const [h, sat, l] = toHsl(data[i], data[i + 1], data[i + 2]);
                const w = sat * sat * (1 - Math.abs(l - 0.5) * 2);
                if (w <= 0.02) continue;
                const cx = Math.cos((h * Math.PI) / 180) * w;
                const cy = Math.sin((h * Math.PI) / 180) * w;
                x += cx; y += cy; satSum += sat * w; wSum += w;
                const bin = bins[Math.floor(h / 30) % 12];
                bin.x += cx; bin.y += cy; bin.w += w; bin.sat += sat * w;
            }
            if (!wSum) return resolve(null);
            const hueOf = (bx, by) => Math.round(((Math.atan2(by, bx) * 180) / Math.PI + 360) % 360);
            const vivid = (sat) => Math.min(1, Math.max(0.65, sat));
            const palette = bins
                .filter(b => b.w >= wSum * 0.06)
                .sort((a, b) => b.w - a.w)
                .slice(0, 5)
                .map(b => [hueOf(b.x, b.y), vivid(b.sat / b.w), 0.55]);
            // Auto is the strongest colour actually in the picture. Averaging every hue made
            // colours that aren't there (pink and green flowers glowed orange).
            resolve({ main: palette[0] || [hueOf(x, y), vivid(satSum / wSum), 0.55], palette });
        } catch {
            resolve(null); // a host without CORS: no glow
        }
    };
    img.onerror = () => resolve(null);
    img.src = sampleUrl(url);
});

const usePoster = (url) => {
    const [found, setFound] = React.useState(() => (url ? colorCache.get(url) ?? null : null));
    useEffect(() => {
        if (!url) { setFound(null); return undefined; }
        if (colorCache.has(url)) { setFound(colorCache.get(url)); return undefined; }
        let cancelled = false;
        readPoster(url).then((c) => {
            colorCache.set(url, c);
            if (!cancelled) setFound(c);
        });
        return () => { cancelled = true; };
    }, [url]);
    return found;
};

/* The poster's most vivid colour as [h, s, l], or null. */
export const usePosterColor = (url) => usePoster(url)?.main ?? null;

/* Up to five of the poster's colours as [h, s, l] (empty while loading). */
export const usePosterPalette = (url) => usePoster(url)?.palette ?? [];

/*
 * A soft light in the poster's own colour, glowing out from behind a top image
 * and fading into the surface (campaign cards and the campaign popup). Only
 * gradients: no blurred copy of the picture. Put it inside a `relative isolate` box.
 * `color` overrides the sampled colour, or turns the glow off ('none').
 */
export const PosterGlow = ({ image, color, className, height = '150%', strength = 1 }) => {
    // `color`: the admin's glow colour (lib/ambientColor.js); Auto samples the poster.
    const chosen = cleanAmbient(color);
    const sampled = usePosterColor(chosen ? null : image);
    const hsl = chosen === AMBIENT_OFF ? null : chosen ? hexToHsl(chosen) : sampled;
    if (!hsl) return null;
    const [h, sat, l] = hsl;
    const c = (a) => `hsla(${+h.toFixed(1)}, ${+(sat * 100).toFixed(1)}%, ${+(l * 100).toFixed(1)}%, ${(a * strength).toFixed(3)})`;
    return (
        <div
            aria-hidden="true"
            className={cn('pointer-events-none absolute inset-x-0 top-0 -z-10 transition-opacity duration-700', className)}
            style={{
                height,
                // Centred on the poster's bottom edge, so the light pours out from under the image.
                background: `radial-gradient(85% 42% at 50% 50%, ${c(0.55)} 0%, ${c(0.2)} 45%, transparent 78%), radial-gradient(40% 30% at 85% 62%, ${c(0.16)}, transparent 70%)`,
            }}
        />
    );
};
