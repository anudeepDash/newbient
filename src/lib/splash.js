/*
 * The N. splash (#nb-splash in index.html): the one loading screen for the app
 * and the admin.
 *
 * It's on screen from the first paint, before any script runs. Anything that is
 * loading holds it (holdSplash, or <SplashHold /> while mounted: page chunks,
 * sign-in checks, redirects). When the last hold is released, the animation
 * finishes the cycle it's in (and always plays at least one full cycle), ends
 * on its empty frame, then the splash fades out. It never cuts off mid-animation.
 *
 * Holds that come and go within SHOW_DELAY_MS (a page that was already
 * downloaded) never bring it back, so quick navigations don't flash.
 */

const LOOP_MS = 2600;       // one cycle of the CSS animation (nb-sp-* keyframes)
const FADE_MS = 400;        // the opacity transition on #nb-splash
const SHOW_DELAY_MS = 120;  // after start-up, how long a load must take before the splash shows
const BOOT_SAFETY_MS = 15000;

let holds = 0;
let state = 'shown';        // 'shown' | 'hiding' | 'hidden'; the page starts with it on screen
let startedAt = 0;          // when the current run started (performance.now)
let showTimer = null;
let hideTimer = null;

const el = () => (typeof document !== 'undefined' ? document.getElementById('nb-splash') : null);
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* How long until the running animation reaches the end of a cycle (at least one full cycle). */
const untilCycleEnd = (node) => {
    if (reducedMotion()) return 300;
    const anim = node.querySelector('.nb-splash-n')?.getAnimations?.()[0];
    const elapsed = typeof anim?.currentTime === 'number' ? anim.currentTime : performance.now() - startedAt;
    if (elapsed < LOOP_MS) return LOOP_MS - elapsed;
    const rest = LOOP_MS - (elapsed % LOOP_MS);
    return rest < 40 ? 0 : rest;
};

const show = () => {
    const node = el();
    if (!node) return;
    clearTimeout(hideTimer);
    if (state === 'hidden') {
        // Restart the animation from its first frame.
        node.classList.remove('nb-splash-run', 'nb-splash-out');
        node.hidden = false;
        void node.offsetWidth; // reflow, so the animation starts again
        node.classList.add('nb-splash-run');
        startedAt = performance.now();
    } else {
        // Was fading out: come back, the animation carries on where it is.
        node.classList.remove('nb-splash-out');
    }
    state = 'shown';
};

const scheduleHide = () => {
    const node = el();
    if (!node || state !== 'shown') return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        if (holds > 0) return;
        state = 'hiding';
        node.classList.add('nb-splash-out');
        hideTimer = setTimeout(() => {
            if (holds > 0 || state !== 'hiding') return;
            state = 'hidden';
            node.hidden = true;
            node.classList.remove('nb-splash-run'); // stop animating while hidden
        }, FADE_MS);
    }, untilCycleEnd(node));
};

/** Keeps the splash up until the returned function is called. `color` tints the dot. */
export const holdSplash = (color) => {
    const node = el();
    if (!node) return () => {};
    if (color) node.style.setProperty('--nb-splash-dot', color);
    holds += 1;
    clearTimeout(hideTimer);
    if (state === 'shown') {
        // Already on screen (start-up, or another load): just stay.
    } else if (state === 'hiding') {
        show();
    } else if (!showTimer) {
        showTimer = setTimeout(() => { showTimer = null; if (holds > 0) show(); }, SHOW_DELAY_MS);
    }
    let released = false;
    return () => {
        if (released) return;
        released = true;
        holds = Math.max(0, holds - 1);
        if (holds > 0) return;
        if (showTimer) { clearTimeout(showTimer); showTimer = null; }
        scheduleHide();
    };
};

/*
 * Start-up: the splash is held from the first paint until the app has rendered
 * (releaseBootSplash from App). Loads that begin in that first render hold it on.
 */
let releaseBoot = null;
if (typeof document !== 'undefined' && document.getElementById('nb-splash')) {
    holds += 1;
    releaseBoot = () => {
        releaseBoot = null;
        holds = Math.max(0, holds - 1);
        if (holds === 0) scheduleHide();
    };
    // Never leave it covering the page if something goes wrong before the app renders.
    setTimeout(() => releaseBoot?.(), BOOT_SAFETY_MS);
}
export const releaseBootSplash = () => releaseBoot?.();

/** Hides it now (an error screen must be visible). */
export const forceHideSplash = () => {
    const node = el();
    holds = 0;
    releaseBoot = null;
    clearTimeout(showTimer); showTimer = null;
    clearTimeout(hideTimer);
    if (!node) return;
    state = 'hidden';
    node.hidden = true;
    node.classList.remove('nb-splash-run', 'nb-splash-out');
};
