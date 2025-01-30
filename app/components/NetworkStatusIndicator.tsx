"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function NetworkStatusIndicator({ className }: { className?: string }) {
  const [status, setStatus] = useState<"online" | "offline" | "reconnecting">(
    "online"
  );

  useEffect(() => {
    let reconnectingTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      clearTimeout(reconnectingTimeout);
      setStatus("online");
    };

    const handleOffline = () => {
      setStatus("offline");
      // Show reconnecting status after 2 seconds of being offline
      reconnectingTimeout = setTimeout(() => {
        setStatus("reconnecting");
      }, 2000);
    };

    setStatus(navigator.onLine ? "online" : "offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(reconnectingTimeout);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {status !== "online" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800 border border-slate-700/50 text-xs"
          >
            {status === "offline" && (
              <>
                <WifiOff className="w-3 h-3 text-red-400" />
              </>
            )}
            {status === "reconnecting" && (
              <>
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2 px-2 rounded-lg bg-slate-800/50 border border-slate-700/30 text-xs"
          >
            <Wifi className="h-4 text-green-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
