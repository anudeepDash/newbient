import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ConsentedAnalytics from '../components/consent/ConsentedAnalytics';
import ConsentBanner from '../components/consent/ConsentBanner';
// Self-hosted fonts: no request ever goes to Google's font servers.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import './landing.css';
import '../styles/glass-menu.css';
import LandingApp from './LandingApp';
import { findRoute } from './routes';
import { loadFeed } from './feed';
import { initLang } from '../i18n';

// Start the (edge-cached) feed request before React even starts.
loadFeed();

// Vercel previews (*.vercel.app) serve the app under /app on the same host, so
// links into app.newbi.live stay on the preview instead of leaving for production.
if (/\.vercel\.app$/i.test(window.location.hostname)) {
    document.addEventListener('click', (e) => {
        const a = e.target instanceof Element ? e.target.closest('a[href^="https://app.newbi.live"]') : null;
        if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        const url = new URL(a.href);
        window.location.assign(`/app${url.pathname === '/' ? '' : url.pathname}${url.search}${url.hash}`);
    }, true);
}

const container = document.getElementById('landing-root');
const app = (
    <StrictMode>
        <BrowserRouter>
            <LandingApp />
        </BrowserRouter>
        {/* Analytics (only after consent) and the consent banner render nothing until mounted, so hydration is unaffected. */}
        <ConsentedAnalytics />
        <ConsentBanner />
    </StrictMode>
);

const route = findRoute(window.location.pathname);
(route ? route.Page.preload() : Promise.resolve()).catch(() => {}).then(() => {
    // Prerendered pages are hydrated in place; the dev server serves an empty shell.
    if (container.firstElementChild) {
        // Hydration mismatches are kept on window.__nbHydrationErrors (production strips console output).
        hydrateRoot(container, app, {
            onRecoverableError: (err) => { (window.__nbHydrationErrors ||= []).push(String(err?.message || err)); },
        });
    }
    else createRoot(container).render(app);
    initLang();
});

// A new deploy renames chunks; reload once instead of leaving a broken page.
window.addEventListener('vite:preloadError', (event) => {
    try {
        const last = Number(sessionStorage.getItem('nb-landing-reload') || 0);
        if (Date.now() - last > 10000) {
            sessionStorage.setItem('nb-landing-reload', String(Date.now()));
            event.preventDefault();
            window.location.reload();
        }
    } catch { /* storage blocked: leave the page as it is */ }
});
