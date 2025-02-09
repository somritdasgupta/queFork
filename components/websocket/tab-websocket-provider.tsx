import React from "react";
import { WebSocketProvider } from "./websocket-context";

interface TabWebSocketProviderProps {
  tabId: string;
  children: React.ReactNode;
}

export function TabWebSocketProvider({
  tabId,
  children,
}: TabWebSocketProviderProps) {
  // Remove the key prop from the div to avoid hydration issues
  return (
    <div data-tab-id={tabId}>
      <WebSocketProvider>{children}</WebSocketProvider>
    </div>
  );
}
