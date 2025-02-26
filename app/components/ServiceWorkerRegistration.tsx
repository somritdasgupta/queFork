"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { toastVariants } from "@/components/ui/toast-variants";
import { motion } from "framer-motion";

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

      toast.custom(
        (toastId) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-blue-500/10 
                     bg-slate-900/95 backdrop-blur-sm shadow-lg w-full max-w-[90vw] min-w-[280px]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs sm:text-sm font-medium truncate">
                Available offline
              </p>
              <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 truncate">
                Install queFork for better experience
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toast.dismiss(toastId)}
                className="px-2 py-1 text-[10px] sm:text-xs text-slate-400 hover:text-slate-300"
              >
                Skip
              </button>
              <button
                onClick={async () => {
                  if (deferredPrompt.current) {
                    toast.dismiss(toastId);
                    deferredPrompt.current.prompt();
                    const { outcome } = await deferredPrompt.current.userChoice;
                    if (outcome === "accepted") {
                      toast.custom(
                        () => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-3 sm:p-4 rounded-lg 
                                 bg-slate-900/95 border border-green-500/10
                                 w-full max-w-[90vw] min-w-[280px]"
                          >
                            <span className="text-green-400 text-xs sm:text-sm">
                              ✓
                            </span>
                            <p className="text-xs sm:text-sm text-slate-200">
                              queFork installed successfully
                            </p>
                          </motion.div>
                        ),
                        { duration: 2000 }
                      );
                    }
                    deferredPrompt.current = null;
                  }
                }}
                className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs bg-blue-500/10 text-blue-400 
                       rounded border border-blue-500/20 hover:bg-blue-500/20
                       transition-colors whitespace-nowrap"
              >
                Install
              </button>
            </div>
          </motion.div>
        ),
        {
          duration: 8000,
          className: "!p-0 !bg-transparent !border-0 !shadow-none max-w-[90vw]",
        }
      );
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
      window.removeEventListener("appinstalled", () => {});
    };
  }, []);

  return null;
}
