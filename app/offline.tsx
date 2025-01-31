'use client';

import React from "react";
import Image from "next/image";

interface OfflineProps {
  connectionType?: string;
}

export default function Offline({ connectionType }: OfflineProps) {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 offline-page">
      <div className="max-w-md w-full p-8 rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-xl">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="queFork Logo"
            width={120}
            height={120}
            className="opacity-75"
          />
        </div>
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm">Connection Lost</span>
          </div>
          <p className="text-slate-400 text-sm">
            {connectionType ? 
              `Network type: ${connectionType}` : 
              'Unable to connect to the network'
          }
          </p>
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          <p className="text-slate-300">
            Attempting to restore connection...
          </p>
          <button
            onClick={handleRetry}
            className="w-full px-4 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-700 
                     transition-colors backdrop-blur-sm border border-blue-500/20 
                     flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Force Reconnect
          </button>
        </div>
      </div>
    </div>
  );
}
