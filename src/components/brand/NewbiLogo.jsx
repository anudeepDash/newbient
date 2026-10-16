import React from 'react';
import logoOnDark from '../../assets/logo/newbi-logo.svg';
import logoOnLight from '../../assets/logo/newbi-logo-black.svg';

const RATIO = 1433 / 697;

/*
 * The newbi.live logo, themed: solid black letters in light mode, the
 * white-lettered outlined version in dark mode. Both files share one shape
 * (src/assets/logo), so swapping them never shifts the layout.
 * ConcertZone keeps its own brand and never uses this.
 */
export default function NewbiLogo({ height, className = '', alt = 'newbi.live', priority = false }) {
    const size = height ? { width: Math.round(height * RATIO), height, style: { height, width: 'auto' } } : { width: 1433, height: 697 };
    const common = { alt, decoding: 'async', fetchPriority: priority ? 'high' : undefined, ...size };
    return (
        <>
            <img src={logoOnLight} {...common} className={`${className} inline-block dark:hidden`} />
            <img src={logoOnDark} {...common} alt="" aria-hidden="true" className={`${className} hidden dark:inline-block`} />
        </>
    );
}
