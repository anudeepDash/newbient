import { ChevronsDown, ChevronsRight } from 'lucide-react';

/*
 * "Scroll or swipe" at the bottom of a pinned section whose slides move
 * sideways with the scroll (Story, CaseStudies). Both work there: scrolling
 * down moves the slides, and so does a sideways swipe (useSidewaysScroll).
 * Shown only where those sections pin (landing.css,
 * .nb-scroll-cue); it fades in as the section pins and out near its end.
 * `dark` is for sections on a black background.
 */
export default function ScrollCue({ dark = false }) {
    return (
        <div aria-hidden="true" className="nb-scroll-cue hidden pointer-events-none absolute inset-x-0 bottom-6 z-10 justify-center">
            <span
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.24em] ring-1 ring-inset backdrop-blur-md ${dark
                    ? 'bg-white/10 text-white ring-white/20'
                    : 'bg-white/80 text-gray-900 ring-black/10 dark:bg-white/10 dark:text-white dark:ring-white/20'}`}
            >
                <span className="nb-cue-bob flex text-emerald-600 dark:text-neon-green"><ChevronsDown size={15} strokeWidth={2.5} /></span>
                Scroll or swipe
                <span className="nb-cue-nudge flex text-emerald-600 dark:text-neon-green"><ChevronsRight size={15} strokeWidth={2.5} /></span>
            </span>
        </div>
    );
}
