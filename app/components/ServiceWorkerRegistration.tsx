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
      const lastPrompt = localStorage.getItem(STORAGE_KEY);
      if (!lastPrompt) return true;
      return Date.now() - parseInt(lastPrompt) > PROMPT_INTERVAL;
    };

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (!shouldShowPrompt()) return;
      deferredPrompt.current = e;
      showInstallPrompt(deferredPrompt.current);
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
