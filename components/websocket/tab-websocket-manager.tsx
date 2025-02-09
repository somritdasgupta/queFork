import React from "react";
import { WebSocketProvider } from "./websocket-context";

interface TabWebSocketManagerProps {
  tabId: string;
  children: React.ReactNode;
}

const TabWebSocketManager = ({ tabId, children }: TabWebSocketManagerProps) => {
  return (
    <div key={tabId} data-tab-id={tabId}>
      <WebSocketProvider>{children}</WebSocketProvider>
    </div>
  );
};

export default TabWebSocketManager;
