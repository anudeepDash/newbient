import base from './tailwind.config.js';

// Tailwind for the landing pages only (src/landing/landing.css): the same theme, but
// scanning just the files those pages use, so they don't download the app's CSS.
export default {
    ...base,
    content: [
        './landing.html',
        './src/landing/**/*.{js,jsx}',
        './src/i18n/**/*.{js,jsx}',
        './src/pages/Contact.jsx',
        './src/pages/Terms.jsx',
        './src/pages/Privacy.jsx',
        './src/pages/legal/**/*.{js,jsx}',
        './src/components/ui/HorizontalCarousel.jsx',
        './src/components/brand/**/*.{js,jsx}',
        './src/components/ui/GlassSelect.jsx',
        './src/components/ui/GlassSheet.jsx',
        './src/components/consent/**/*.{js,jsx}',
        './src/components/app/BrandLayers.jsx',
    ],
    safelist: [],
};
