
"use client";

import React from 'react';
import { WebSocketProvider } from './websocket-context';
import WebSocketHandler from './WebSocketHandler';

export function WebSocketWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WebSocketProvider>
      <WebSocketHandler />
      {children}
    </WebSocketProvider>
  );
}