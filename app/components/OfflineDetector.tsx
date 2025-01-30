'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function OfflineDetector({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  const checkConnection = useCallback(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    if (!online) {
      router.push('/offline');
    }
  }, [router]);

  useEffect(() => {
    // Immediate check on mount
    checkConnection();

    // Set up event listeners
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    // Monitor connection quality if available
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', checkConnection);
    }

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
      if (connection) {
        connection.removeEventListener('change', checkConnection);
      }
    };
  }, [checkConnection]);

  if (!isOnline) {
    return null; // Router will handle the redirect
  }

  return <>{children}</>;
}
