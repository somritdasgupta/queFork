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
        }
      } catch (error) {
        console.log("Connection not fully restored yet");
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
          <WifiIcon className="h-4 w-3 text-green-500 animate-pulse" />
        ) : (
          <>
            <WifiOff className="h-4 w-3 text-red-500 animate-pulse" />
            <span className="text-red-500 text-sm font-medium animate-pulse">
              queFork offline
            </span>
          </>
        )}
      </div>
    </div>
  );
}
