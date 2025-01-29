export interface KeyValuePair {
  type: string;
  key: string;
  id?: string;
  value: string;
  description?: string;
  enabled?: boolean;
  showSecrets: boolean;
}

// Add new interface for environment save event
export interface EnvironmentSaveEvent extends CustomEvent {
  detail: {
    key: string;
    value: string;
    type?: "text" | "secret";
    isMobile?: boolean;
  };
}

export interface EnvironmentSaveActionEvent extends CustomEvent {
  detail: {
    key: string;
    value: string;
    type: "text" | "secret";
    isMobile?: boolean;
    switchPanel: boolean;
    showForm: boolean;
  };
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
  variables: EnvironmentVariable[];
  global?: boolean;
  description?: string;
  created: string;
  lastModified: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  type: "text" | "secret";
  enabled: boolean;
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
  runConfig?: {
    delay: number; // Delay between requests in ms
    stopOnError: boolean;
    environment?: string; // Environment ID to use for the run
    timeout?: number; // Request timeout in ms
    retryCount?: number; // Number of retries for failed requests
  };
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
  runConfig?: {
    iterations: number;
    delay: number;
    parallel: boolean;
    environment: string | null;
    timeout?: number;
    stopOnError?: boolean;
    retryCount?: number;
    validateResponse?: boolean;
  };
  preRequestScript?: string;
  testScript?: string;
  testResults?: TestResult[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface ScriptContext {
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
  };
  environment: Record<string, string>;
  variables: Record<string, any>;
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

export interface CollectionRunResult {
  id: string;
  collectionId: string;
  timestamp: string;
  duration: number;
  results: RequestRunResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    averageResponseTime?: number;
  };
  environment?: string;
  config?: {
    delay: number;
    stopOnError: boolean;
    timeout?: number;
  };
}

export interface RequestRunResult {
  id: string;
  requestId: string;
  name: string;
  method: string;
  url: string;
  status: 'success' | 'failed' | 'skipped';
  statusCode?: number;
  duration: number;
  response?: any;
  error?: string;
  timestamp: string;
  retryCount?: number;
}

export interface SidePanelProps {
  collections: Collection[];
  history: HistoryItem[];
  onSelectRequest: (request: SavedRequest) => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onCreateCollection: (collection: Partial<Collection>) => void;
  onSaveRequest: (collectionId: string, request: Partial<SavedRequest>) => void;
  onDeleteCollection: (collectionId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  isHistorySavingEnabled: boolean;
  onToggleHistorySaving: (enabled: boolean) => void;
  onExportCollections: () => void;
  onExportHistory: () => void;
  onExportCollection: (collectionId: string) => void;
  environments: Environment[];
  currentEnvironment: Environment | null;
  onEnvironmentChange: (environmentId: string) => void;
  onEnvironmentsUpdate: (environments: Environment[]) => void;
  onUpdateCollections: (collections: Collection[]) => void;
  isMobile?: boolean;
  className?: string; // Add this line
  onImportCollections: (source: ImportSource, data: string) => Promise<void>;
}

export type ImportSource = 
  | "url"
  | "file"
  | "clipboard"
  | "hoppscotch"
  | "postman"
  | "insomnia"
  | "openapi";
