'use client';

import React from "react";

interface OfflineProps {
  connectionType?: string;
}

export default function Offline({ connectionType }: OfflineProps) {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-200 mb-4">
          Connection Lost
        </h1>
        <p className="text-slate-400 mb-2">
          {connectionType ? 
            `Network type: ${connectionType}` : 
            'Unable to connect to the network'
        }</p>
        <p className="text-slate-400 mb-6">
          Please check your internet connection
        </p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Reconnect
        </button>
      </div>
    </div>
  );
}
