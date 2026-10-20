import { useLayoutEffect } from 'react';
import { holdSplash } from '../../lib/splash';

/*
 * Keeps the N. splash on screen while mounted (src/lib/splash.js). Use it as a
 * Suspense fallback or wherever a whole page is loading. It renders nothing
 * itself: the splash is the full-screen #nb-splash from index.html, which plays
 * its animation to the end of a cycle before fading out.
 */
const SplashHold = ({ color }) => {
    useLayoutEffect(() => holdSplash(color), [color]);
    return null;
};

export default SplashHold;
