import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// CRASH REPORTER REMOVED

// Handle dynamic import failures (common after new deployments)
window.addEventListener('vite:preloadError', (event) => {
  const lastReload = sessionStorage.getItem('last-chunk-reload');
  const now = Date.now();
  
  // Only reload if we haven't reloaded in the last 5 seconds to avoid infinite loops
  if (!lastReload || now - parseInt(lastReload) > 5000) {
    sessionStorage.setItem('last-chunk-reload', now.toString());
    console.warn('Dynamic import failed, reloading page to fetch latest version...', event);
    window.location.reload();
  }
});
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.log('Service Worker registration failed', err));
  });
}
