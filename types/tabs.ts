import { KeyValuePair, RequestBody, WebSocketMessage } from ".";
import { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string | ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  dropdown?: ReactNode;
  hidden?: boolean;
}

export interface Tab {
  id: string;
  title: string;
  type: "rest" | "websocket" | "grpc" | "graphql";
  active: boolean;
  unsaved?: boolean;
  lastAccessed?: number;
  state: {
    method: string;
    url: string;
    headers: KeyValuePair[];
    params: KeyValuePair[];
    body: RequestBody;
    auth: {
      type: "none" | "bearer" | "basic" | "apiKey";
      token?: string;
      username?: string;
      password?: string;
      key?: string;
    };
    response?: any;
    isLoading?: boolean;
    isWebSocketMode?: boolean;
    wsState?: {
      isConnected: boolean;
      connectionStatus: "disconnected" | "connecting" | "connected" | "error";
      messages: WebSocketMessage[];
    };
    preRequestScript?: string;
    testScript?: string;
    testResults?: any[];
    scriptLogs?: string[];
  };
}
