// Unregister old service workers to prevent cache conflicts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('Service worker unregistered');
    });
  });
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { setupOnlineSync } from './services/offline-queue.service.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);

// Initialise offline queue auto-sync on reconnect
setupOnlineSync();

// Register service worker with update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    import('./services/db.service.js');

    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    }).then(registration => {
      // Check for updates on page visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });

      // Listen for waiting service worker (new version available)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }).catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
