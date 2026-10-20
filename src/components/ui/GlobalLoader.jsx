import React from 'react';
import SplashHold from './SplashHold';

/*
 * The full-screen loader: holds the N. splash (index.html #nb-splash, src/lib/splash.js)
 * while mounted. The splash finishes its animation cycle before it fades out, so
 * nothing cuts off mid-animation. `color` tints the dot (per section).
 */
const GlobalLoader = ({ color = '#39FF14' }) => <SplashHold color={color} />;

export default GlobalLoader;
