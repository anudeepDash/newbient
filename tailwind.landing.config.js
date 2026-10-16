import base from './tailwind.config.js';

// Tailwind for the landing pages only (src/landing/landing.css): the same theme, but
// scanning just the files those pages use, so they don't download the app's CSS.
export default {
    ...base,
    content: [
        './landing.html',
        './src/landing/**/*.{js,jsx}',
        './src/pages/CreatorLanding.jsx',
        './src/pages/Contact.jsx',
        './src/pages/Terms.jsx',
        './src/pages/Privacy.jsx',
        './src/components/ui/HorizontalCarousel.jsx',
    ],
    safelist: [],
};
