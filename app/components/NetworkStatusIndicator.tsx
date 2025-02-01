"use client";

import { useState, useEffect } from "react";
import { WifiIcon, WifiOff, WifiOffIcon } from "lucide-react";

export function NetworkStatusIndicator({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      document.body.classList.add("connection-lost");
    };

    const handleOnline = async () => {
      try {
        const response = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-store",
        });

        if (response.ok) {
          setIsOnline(true);
          document.body.classList.remove("connection-lost");
          // Only reload if we're on the offline page
          if (window.location.pathname === '/offline') {
            window.location.href = '/';  // Redirect to home instead of reload
          }
        }
      } catch (error) {
        console.log("Connection not fully restored yet");
        // Retry after 3 seconds if the connection check fails
        setTimeout(handleOnline, 3000);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 transition-all duration-300 rounded-full px-2 bg-slate-800 ${className}`}
        title={isOnline ? "Connected" : "Connection Lost"}
      >
        {isOnline ? (
          <WifiIcon className="h-5 w-3 text-green-500 animate-pulse" />
        ) : (
          <>
            <WifiOff className="h-5 w-3 text-red-500 animate-pulse" />
            <span className="text-red-500 text-sm font-medium animate-pulse">
              Offline
            </span>
          </>
        )}
      </div>
    </div>
  );
}
