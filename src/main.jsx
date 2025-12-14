import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// CRASH REPORTER RESTORED
window.onerror = function (message, source, lineno, colno, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:black;color:#ff5555;padding:20px;font-family:monospace;white-space:pre-wrap;overflow:auto;font-size:16px;';
  errorDiv.innerHTML = `<h1>SITE CRASHED</h1><h2>${message}</h2><p>Source: ${source}:${lineno}</p><pre>${error?.stack || 'No stack trace'}</pre>`;
  document.body.appendChild(errorDiv);
};

window.onunhandledrejection = function (event) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:50%;z-index:99999;background:rgba(0,0,0,0.9);color:yellow;padding:20px;font-family:monospace;border-top:1px solid yellow;';
  errorDiv.innerHTML = `<h3>ASYNC ERROR</h3><p>${event.reason}</p>`;
  document.body.appendChild(errorDiv);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
