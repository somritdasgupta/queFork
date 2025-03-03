"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { showInstallPrompt } from "@/components/ui/toast";

export function ServiceWorkerProvider() {
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    const PROMPT_INTERVAL = 14 * 24 * 60 * 60 * 1000; // 14 days
    const STORAGE_KEY = "lastInstallPrompt";

    const shouldShowPrompt = () => {
      // Check if PWA app is already installed
      if (window.matchMedia("(display-mode: standalone)").matches) {
        return false;
      }

      const lastPrompt = localStorage.getItem(STORAGE_KEY);
      if (!lastPrompt) return true;

      const timeSinceLastPrompt = Date.now() - parseInt(lastPrompt);
      return timeSinceLastPrompt > PROMPT_INTERVAL;
    };

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;

      if (shouldShowPrompt()) {
        // Update the timestamp before showing prompt
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        showInstallPrompt(deferredPrompt.current);

        // Debug logging
        console.debug("[PWA] Showing install prompt");
      } else {
        console.debug("[PWA] Skipping install prompt - too soon");
      }
    };

    // Listen for install prompt
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    // Service Worker registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          registration.addEventListener("activate", () => {
            toast.success("App ready for offline use", {
              description: "Content cached for offline access",
              duration: 3000,
            });
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
          toast.error("Offline mode unavailable", {
            description: "Could not enable offline functionality",
          });
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  return null;
}
