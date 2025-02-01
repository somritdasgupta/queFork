"use client";

import React from "react";
import { WifiOff } from "lucide-react";
import { AnimatedLogo } from "@/components/animated-logo";

export function ConnectionLostBackdrop() {
  return (
    <div className="connection-lost-backdrop p-4">
      <div className="max-w-[90vw] md:max-w-md w-full p-4 md:p-8 rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-xl">
        <div className="flex justify-center mb-4 md:mb-6 scale-75 md:scale-100">
          <AnimatedLogo
            size="lg"
            animate={true}
            showSubtitle={true}
            primaryColor="text-slate-200"
            secondaryColor="text-blue-500"
            subtitlePosition="bottom"
            className="transform-gpu"
          />
        </div>
        <div className="space-y-3 md:space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-2 md:px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
            <WifiOff className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
            <span className="text-red-400 text-xs md:text-sm">
              Connection Lost
            </span>
          </div>
          <p className="text-slate-300 animate-pulse text-xs md:text-sm">
            queFork will reconnect automatically...
          </p>
        </div>
      </div>
    </div>
  );
}
