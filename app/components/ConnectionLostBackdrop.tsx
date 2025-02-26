"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedLogo } from "@/components/animated-logo";

export function ConnectionLostBackdrop() {
  const [isVisible, setIsVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [networkInfo, setNetworkInfo] = useState<string>("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleOffline = () => setIsVisible(true);
    const handleOnline = async () => {
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

    // Get network information if available
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      setNetworkInfo(
        `${connection.effectiveType || ""} ${connection.type || ""}`
      );
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [retryCount]);

  // Animated progress bar
  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setProgress((p) => (p + 1) % 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative overflow-hidden max-w-[90vw] md:max-w-md w-full"
        >
          <div
            className="relative p-6 md:p-8 rounded-xl 
                        bg-slate-800 backdrop-blur-xl
                        border border-white/[0.08] shadow-2xl
                        before:absolute before:inset-0
                        before:pointer-events-none"
          >
            <div className="relative space-y-6">
              {/* Logo section */}
              <div className="flex justify-center">
                <AnimatedLogo
                  size="lg"
                  animate={true}
                  showSubtitle={true}
                  primaryColor="text-white"
                  secondaryColor="text-blue-400"
                  className="transform-gpu scale-75 md:scale-100"
                />
              </div>

              {/* Status section */}
              <div className="space-y-4 text-center">
                {/* Progress bar */}
                <div className="relative h-1 bg-white/[0.03] rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400/50 to-purple-400/50"
                    animate={{ x: [`-${100}%`, "0%"] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>

                {/* Status text */}
                <p className="text-white/60 text-sm">
                  Attempting to restore connection...
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
