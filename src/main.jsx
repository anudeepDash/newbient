import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initLang } from './i18n'
import ErrorBoundary from './components/ErrorBoundary.jsx'

import { reloadForNewChunks } from './lib/chunkReload'

// Handle dynamic import failures (common after new deployments)
window.addEventListener('vite:preloadError', () => {
  reloadForNewChunks();
});
initLang()

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
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
