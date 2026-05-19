import React from 'react';

/**
 * Newbi Creator Logo — clean rounded-square monogram with stylised "N".
 */
const CreatorLogo = ({ className = 'w-10 h-10', ...props }) => {
    return (
        <svg
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`shrink-0 ${className}`}
            {...props}
        >
            <defs>
                <linearGradient id="nc-grad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00F0FF" />
                    <stop offset="100%" stopColor="#FF4F8B" />
                </linearGradient>
                <linearGradient id="nc-grad-rev" x1="80" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#00F0FF" />
                </linearGradient>
            </defs>

            {/* Rounded-square background */}
            <rect
                x="2" y="2" width="76" height="76"
                rx="22"
                fill="#000"
                stroke="url(#nc-grad)"
                strokeWidth="2.5"
            />

            {/* Stylised "N" — left vertical */}
            <rect x="22" y="22" width="8" height="36" rx="4" fill="url(#nc-grad)" />

            {/* Stylised "N" — diagonal */}
            <rect
                x="22" y="22" width="8" height="44" rx="4"
                fill="url(#nc-grad)"
                transform="rotate(-32 26 22)"
            />

            {/* Stylised "N" — right vertical */}
            <rect x="50" y="22" width="8" height="36" rx="4" fill="url(#nc-grad-rev)" />

            {/* Small accent dot */}
            <circle cx="64" cy="18" r="3.5" fill="#FF4F8B" />
        </svg>
    );
};

export default CreatorLogo;
