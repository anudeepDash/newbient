import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './landing.css';
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
        {/* Vercel Web Analytics + Speed Insights; both render nothing, so hydration is unaffected. */}
        <Analytics />
        <SpeedInsights />
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
window.addEventListener('vite:preloadError', () => {
    try {
        const last = Number(sessionStorage.getItem('nb-landing-reload') || 0);
        if (Date.now() - last > 10000) {
            sessionStorage.setItem('nb-landing-reload', String(Date.now()));
            window.location.reload();
        }
    } catch { /* storage blocked: leave the page as it is */ }
});
