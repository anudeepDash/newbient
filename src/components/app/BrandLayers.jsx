import React from 'react';
import { cn } from '../../lib/utils';
import newbiIcon from '../../assets/logo/newbi-icon.svg';

/*
 * The Newbi surface, from the app's "N." notice panels: a neon-green glow
 * from one corner (a soft mint wash in light mode), a faint dot grid fading
 * towards the content, and the big faded N. mark off the corner. Gradients
 * and one image only, so there's no live blur (cheap on iPhone Safari).
 *
 * Put it first inside a `relative isolate overflow-hidden` box:
 *   <section className="relative isolate overflow-hidden ..."><BrandLayers />...</section>
 *
 * mark: 'corner' (bottom-right, large) | 'small' (for cards) | 'large' | false
 * from: where the glow starts, 'top' (top-right) or 'bottom' (bottom-right, for cards with an image on top)
 */

const DOTS = 'radial-gradient(currentColor 1px, transparent 1.2px)';
const FADE_RIGHT = 'linear-gradient(to left, black 0%, black 35%, transparent 85%)';

const GLOW_LIGHT = 'radial-gradient(110% 90% at 100% 0%, rgba(57,255,20,0.30) 0%, rgba(16,185,129,0.12) 38%, transparent 65%), radial-gradient(80% 70% at 0% 100%, rgba(16,185,129,0.10), transparent 60%)';
const GLOW_DARK = 'radial-gradient(110% 90% at 100% 0%, rgba(57,255,20,0.32) 0%, rgba(57,255,20,0.08) 38%, transparent 65%), radial-gradient(80% 70% at 0% 100%, rgba(16,185,129,0.16), transparent 60%)';
// A quieter glow for big surfaces (modals), so text on top stays easy to read.
const GLOW_LIGHT_SOFT = 'radial-gradient(70% 55% at 100% 0%, rgba(57,255,20,0.22) 0%, rgba(16,185,129,0.08) 40%, transparent 70%), radial-gradient(60% 50% at 0% 100%, rgba(16,185,129,0.08), transparent 60%)';
const GLOW_LIGHT_BOTTOM = 'radial-gradient(90% 70% at 100% 100%, rgba(57,255,20,0.26) 0%, rgba(16,185,129,0.10) 40%, transparent 70%)';
const GLOW_DARK_BOTTOM = 'radial-gradient(90% 70% at 100% 100%, rgba(57,255,20,0.24) 0%, rgba(57,255,20,0.06) 40%, transparent 70%)';
const GLOW_DARK_SOFT = 'radial-gradient(70% 55% at 100% 0%, rgba(57,255,20,0.22) 0%, rgba(57,255,20,0.05) 40%, transparent 70%), radial-gradient(60% 50% at 0% 100%, rgba(16,185,129,0.12), transparent 60%)';

const MARKS = {
    corner: 'absolute -bottom-10 -right-8 w-52 rotate-[-8deg] opacity-[0.10] sm:w-72 dark:opacity-[0.12]',
    small: 'absolute -bottom-6 -right-5 w-28 rotate-[-8deg] opacity-[0.07] dark:opacity-[0.09]',
    large: 'absolute -bottom-16 -right-12 w-72 rotate-[-8deg] opacity-[0.08] sm:w-[26rem] dark:opacity-[0.10]',
};

const BrandLayers = ({ mark = 'corner', soft = false, dots = true, from = 'top', className }) => {
    const light = from === 'bottom' ? GLOW_LIGHT_BOTTOM : soft ? GLOW_LIGHT_SOFT : GLOW_LIGHT;
    const dark = from === 'bottom' ? GLOW_DARK_BOTTOM : soft ? GLOW_DARK_SOFT : GLOW_DARK;
    return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
        <div className="absolute inset-0 dark:hidden" style={{ background: light }} />
        <div className="absolute inset-0 hidden dark:block" style={{ background: dark }} />
        {dots && (
            <div
                className="absolute inset-0 text-emerald-900/[0.12] dark:text-white/[0.07]"
                style={{ backgroundImage: DOTS, backgroundSize: '16px 16px', WebkitMaskImage: FADE_RIGHT, maskImage: FADE_RIGHT }}
            />
        )}
        {mark && <img src={newbiIcon} alt="" className={MARKS[mark] || MARKS.corner} />}
    </div>
    );
};

/* The liquid-glass box the layers sit in (same as the notice panels). */
export const BRAND_GLASS = cn(
    'relative isolate overflow-hidden backdrop-blur-2xl backdrop-saturate-[1.8]',
    'bg-white/55 text-gray-900 ring-1 ring-inset ring-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_60px_-28px_rgba(0,0,0,0.3)]',
    'dark:bg-white/[0.05] dark:text-white dark:ring-white/[0.12] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_24px_60px_-28px_rgba(0,0,0,0.8)]'
);

export default BrandLayers;
