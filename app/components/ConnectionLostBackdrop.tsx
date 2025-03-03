"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedLogo } from "@/components/shared/animated-logo";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionLostBackdrop() {
  const [isVisible, setIsVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      if (!offlineMode) setIsVisible(true);
    };

    const handleOnline = async () => {
      if (offlineMode) return;
      try {
        const response = await fetch("/api/health", { method: "HEAD" });
        if (response.ok) {
          setIsVisible(false);
          setRetryCount(0);
        } else {
          throw new Error("Health check failed");
        }
      } catch {
        setRetryCount((prev) => prev + 1);
        setTimeout(handleOnline, Math.min(5000 * retryCount, 30000));
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [retryCount, offlineMode]);

  const handleOfflineModeToggle = (checked: boolean) => {
    setOfflineMode(checked);
    if (checked) {
      setIsVisible(false);
      toast.success("Offline mode enabled");
    } else if (!navigator.onLine) {
      setIsVisible(true);
      toast.info("Attempting to reconnect...");
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="w-full max-w-sm mx-4"
        >
          <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 shadow-xl">
            <div className="space-y-6">
              <div className="flex justify-center -mt-2 mb-2">
                <AnimatedLogo
                  size="lg"
                  animate={true}
                  showSubtitle={true}
                  primaryColor="text-slate-200"
                  secondaryColor="text-blue-500"
                  className="transform-gpu scale-75"
                />
              </div>

              {/* Status Message */}
              <div className="text-center space-y-1">
                <h3 className="text-lg font-medium text-slate-200">
                  {offlineMode ? "Offline Mode" : "Connection Lost"}
                </h3>
                <p className="text-sm text-slate-400">
                  {offlineMode
                    ? "You can continue working offline"
                    : "Check your internet connection"}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-slate-800">
                <span className="text-sm text-slate-300">Offline Mode</span>
                <Switch
                  checked={offlineMode}
                  onCheckedChange={handleOfflineModeToggle}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
              {/* Retry Status */}
              {!offlineMode && retryCount > 0 && (
                <p className="text-xs text-center text-slate-500">
                  Retrying... (Attempt {retryCount})
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
