export interface KeyValuePair {
  type: string;
  key: string;
  id?: string;
  value: string;
  description?: string;
  enabled?: boolean;
  showSecrets: boolean;
  source?: {
    tab: "auth" | "body";
    type?: string;
  };
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

export type ContentType =
  | "application/json"
  | "multipart/form-data"
  | "text/plain"
  | "application/octet-stream"
  | "application/xml"
  | "text/csv"
  | "text/yaml"
  | "none";

export interface RequestBody {
  type: ContentType;
  content: string | KeyValuePair[] | File | BinaryFileData;
}

export interface BinaryFileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: string; // Base64 encoded content
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
  preRequestScript: string; // Change to required string
  testScript: string; // Change to required string
  testResults: TestResult[];
  scriptLogs: string[];
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
  time?: string;
  size?: string;
  method: string; // Add this
  intercepted?: boolean; // Add this
  error?: string;
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
    preRequestScript?: string;
    testScript?: string;
    testResults?: TestResult[];
    scriptLogs?: string[];
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
  status?: "connected" | "closed" | "connecting";
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
  status: "success" | "failed" | "skipped";
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
  hasExtension?: boolean;
  interceptorEnabled?: boolean;
}

export type ImportSource =
  | "url"
  | "file"
  | "clipboard"
  | "hoppscotch"
  | "postman"
  | "insomnia"
  | "openapi";

export interface RequestPanelProps {
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    key?: string;
    headerName?: string; // Add this line for API Key auth
  };
  isWebSocketMode: boolean;
  environments: Environment[];
  currentEnvironment: Environment | null;
  onEnvironmentChange: (environmentId: string) => void;
  onEnvironmentsUpdate: (environments: Environment[]) => void;
  onAddToEnvironment: (key: string, value: string) => void;
  onHeadersChange: (headers: KeyValuePair[]) => void;
  onParamsChange: (params: KeyValuePair[]) => void;
  onBodyChange: (body: RequestBody) => void;
  onAuthChange: (auth: any) => void;
}

export interface ResponsePanelProps {
  response: RequestResponse | null;
  isLoading: boolean;
  collections: Collection[];
  onSaveToCollection: (
    collectionId: string,
    request: Partial<SavedRequest>
  ) => void;
  method: string;
  url: string;
  isWebSocketMode: boolean;
  panelState?: "expanded" | "collapsed" | "fullscreen";
  onPanelStateChange?: () => void;
  showContentOnly?: boolean;
  isOverlay?: boolean;
  preserveStatusBar?: boolean;
}

export type PanelState = "expanded" | "collapsed" | "fullscreen";

export interface Tab {
  lastAccessed: number;
  id: string;
  title: string;
  type: "rest" | "websocket" | "grpc" | "graphql";
  active: boolean;
  unsaved?: boolean;
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

export interface TabContextType {
  tabs: Tab[];
  activeTab: string;
  addTab: (tab?: Partial<Tab>) => void;
  removeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  duplicateTab: (id: string) => void;
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>; // Add this line
}

export interface UrlBarProps {
  method: string;
  url: string;
  isLoading: boolean;
  wsConnected: boolean;
  isWebSocketMode: boolean;
  variables: Array<{
    key: string;
    value: string;
    type?: string;
  }>;
  recentUrls: string[];
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSendRequest: () => void;
  onWebSocketToggle: () => void;
  hasExtension?: boolean;
  interceptorEnabled?: boolean;
  isMobile: boolean;
}
