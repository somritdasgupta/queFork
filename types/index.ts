export interface KeyValuePair {
  type: string;
  key: string;
  id?: string;
  value: string;
  description?: string;
  enabled?: boolean;
  showSecrets: boolean;
}

export interface RequestBody {
  type: "json" | "form-data" | "x-www-form-urlencoded" | "raw" | "none";
  content: string | KeyValuePair[];
}

export interface CollectionVersion {
  version: string;
  timestamp: string;
  changes?: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: {
    key: string;
    value: string;
    type: "text" | "secret";
    enabled: boolean;
  }[];
  global?: boolean;
  description?: string;
  created: string;
  lastModified: string;
}

export interface WebSocketPanelProps {
  url: string;
  onUrlChange: (url: string) => void;
  type: "sent" | "received" | "system";
  isOpen: boolean;
  onClose: () => void;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  apiVersion?: string;
  requests: SavedRequest[];
  lastModified: string;
}

export interface SavedRequest {
  statusCode: any;
  timestamp: number;
  id: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth?: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    key?: string;
  };
  response?: {
    status: number;
    body?: any;
  };
}

export interface RequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  size: string;
  time: string;
  timestamp: string;
  error?: boolean;
}

export interface HistoryItem {
  id: string;
  type: "rest" | "websocket";
  method: string;
  url: string;
  timestamp: string;
  response?: {
    status: number;
    time?: string;
    size?: string;
  };
  request: {
    headers: KeyValuePair[];

    params: KeyValuePair[];

    body: RequestBody;

    auth: { type: string } & Record<string, any>;
  };
  wsStats?: WebSocketStats;
}

export interface WebSocketStats {
  messagesSent: number;
  messagesReceived: number;
  avgLatency: number | null;
  connectionDuration: number;
  protocols: string[];
  messages?: WebSocketMessage[];
  lastConnected?: string;
  totalBytes?: number;
  status?: 'connected' | 'closed' | 'connecting';
}

export interface WebSocketHistoryItem extends HistoryItem {
  type: "websocket";
  protocols?: string[];
  connectionDuration?: number;
  messagesCount?: {
    sent: number;
    received: number;
  };
  avgLatency?: number;
  lastConnected?: string;
}

export interface WebSocketMessage {
  type: "sent" | "received";
  content: string;
  timestamp: string;
}

export interface WebSocketState {
  isConnected: boolean;
  messages: WebSocketMessage[];
}
