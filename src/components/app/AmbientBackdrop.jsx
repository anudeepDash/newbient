import React, { useEffect, useMemo, useRef } from 'react';
import { cn } from '../../lib/utils';
import { isIOS } from '../../lib/platform';

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
                    <div className={cn(layer, 'bg-cover bg-center')} style={{ backgroundImage: `url("${tiny}")`, opacity: intensity }} />
                ) : (
                    <TinyCanvas src={image} className={cn(layer, 'object-cover')} style={{ opacity: intensity }} />
                )
            ) : (
                <div
                    className={cn(layer, 'bg-cover bg-center')}
                    style={{ backgroundImage: `url("${smallUrl(image)}")`, filter: `blur(${blur}px) saturate(1.6)`, opacity: intensity }}
                />
            )}
        </div>
    );
};

export default AmbientBackdrop;
