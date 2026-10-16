import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './landing.css';
import LandingApp from './LandingApp';
import { findRoute } from './routes';
import { loadFeed } from './feed';

// Start the (edge-cached) feed request before React even starts.
loadFeed();

const container = document.getElementById('landing-root');
const app = (
    <StrictMode>
        <BrowserRouter>
            <LandingApp />
        </BrowserRouter>
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
