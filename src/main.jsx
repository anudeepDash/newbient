import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initLang } from './i18n'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ConsentedAnalytics from './components/consent/ConsentedAnalytics.jsx'
import ConsentBanner from './components/consent/ConsentBanner.jsx'

import { reloadForNewChunks } from './lib/chunkReload'

// A page chunk or its CSS failed to load (usually right after a deploy). While a reload is
// on its way, don't let the error reach the page: it would flash the error screen first.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewChunks()) event.preventDefault();
});
initLang()

createRoot(document.getElementById('root')).render(
  <>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    {/* Vercel Web Analytics + Speed Insights, only after the visitor allows analytics. */}
    <ConsentedAnalytics />
    <ConsentBanner />
  </>
)


// Register the service worker: push notifications where supported, and on the
// app (passes keep working offline at the gate) everywhere else too.
const wantsServiceWorker = typeof window !== 'undefined' && 'serviceWorker' in navigator
  && ('PushManager' in window || /^app\./i.test(window.location.hostname) || /^\/(app\/)?(p|t)\//.test(window.location.pathname));
if (wantsServiceWorker) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(reg => console.log('Service Worker registered', reg))
        .catch(err => console.warn('Service Worker registration failed', err));
    } catch (e) {
      console.warn('Service Worker registration skipped:', e);
    }
  });
}
