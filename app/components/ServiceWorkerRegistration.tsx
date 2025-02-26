'use client';

import { useEffect } from 'react';

export function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Clean up existing service workers
      navigator.serviceWorker.getRegistrations()
        .then(registrations => {
          registrations.forEach(registration => registration.unregister());
        })
        .then(() => {
          // Register new service worker
          return navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
