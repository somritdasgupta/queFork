export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
export type ProtocolType = 'rest' | 'graphql' | 'websocket' | 'sse' | 'socketio' | 'soap';
export type AuthType = 'none' | 'bearer' | 'basic' | 'oauth2' | 'api-key';
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'xml' | 'graphql';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface AuthConfig {
  type: AuthType;
  bearer?: { token: string };
  basic?: { username: string; password: string };
  oauth2?: {
    grantType: 'authorization_code' | 'client_credentials' | 'password';
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    accessToken?: string;
  };
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
}

export interface RequestConfig {
  id: string;
  name: string;
  protocol: ProtocolType;
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: {
    type: BodyType;
    raw: string;
    formData: KeyValuePair[];
    graphql: { query: string; variables: string };
  };
  auth: AuthConfig;
  preScript: string;
  postScript: string;
  tests: string;
  collectionId?: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  time: number;
  error?: string;
}

export interface WebSocketMessage {
  id: string;
  type: 'sent' | 'received';
  data: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  request: RequestConfig;
  response?: ResponseData;
  timestamp: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

// Environment
export interface Environment {
  id: string;
  name: string;
  variables: KeyValuePair[];
  isActive: boolean;
}

// Collection
export interface Collection {
  id: string;
  name: string;
  description: string;
  requests: RequestConfig[];
  parentId?: string;
}

// Workspace
export interface Workspace {
  id: string;
  name: string;
  description: string;
  collections: Collection[];
  environments: Environment[];
}

// ── Flow / Sequence types ─────────────────────────────────────────────
export type FlowNodeType = 'request' | 'condition' | 'delay' | 'log' | 'set_variable' | 'extract' | 'loop' | 'assert' | 'group' | 'try_catch' | 'transform' | 'response_match' | 'http_request' | 'foreach' | 'save_collection' | 'switch_case' | 'break_if' | 'counter' | 'wait_until' | 'schema_validate' | 'manage_collection' | 'manage_environment';

export interface MatchRule {
  id: string;
  type: 'status' | 'keyword' | 'key_value' | 'regex' | 'header';
  path?: string;
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'not_exists' | 'gt' | 'lt';
  value?: string;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  requestId?: string;
  condition?: string;
  delayMs?: number;
  logMessage?: string;
  preScript?: string;
  postScript?: string;
  testScript?: string;
  variableName?: string;
  variableValue?: string;
  extractExpression?: string;
  extractTarget?: string;
  loopCount?: number;
  loopNodeIds?: string[];
  assertExpression?: string;
  assertMessage?: string;
  continueOnError?: boolean;
  /** Retry config for request nodes */
  retryCount?: number;
  retryDelayMs?: number;
  /** For group nodes */
  groupNodeIds?: string[];
  /** For try_catch */
  catchAction?: 'skip' | 'log' | 'set_variable';
  catchVariable?: string;
  /** For transform: JS expression to transform data */
  transformExpression?: string;
  transformTarget?: string;
  /** Enabled/disabled toggle */
  disabled?: boolean;
  /** Notes/comments */
  notes?: string;
  /** Response match rules */
  matchRules?: MatchRule[];
  matchMode?: 'all' | 'any';
  /** Inline HTTP request */
  httpMethod?: HttpMethod;
  httpUrl?: string;
  httpHeaders?: string;
  httpBody?: string;
  httpBodyType?: BodyType;
  httpAuthType?: AuthType;
  httpAuthValue?: string;
  /** Foreach iteration */
  foreachExpression?: string;
  foreachVariable?: string;
  /** Save to collection */
  saveCollectionName?: string;
  saveCondition?: string;
  /** Switch/case */
  switchExpression?: string;
  switchCases?: { id: string; value: string; label: string }[];
  switchDefault?: string;
  /** Break if */
  breakCondition?: string;
  breakMessage?: string;
  /** Counter */
  counterName?: string;
  counterAction?: 'increment' | 'decrement' | 'reset';
  counterStep?: number;
  counterInitial?: number;
  /** Wait until */
  waitCondition?: string;
  waitTimeoutMs?: number;
  waitIntervalMs?: number;
  /** Schema validate */
  schemaKeys?: string;
  schemaTarget?: string;
  /** Manage collection */
  collectionAction?: 'create' | 'add_request' | 'update_request' | 'delete_request' | 'delete_collection' | 'rename';
  collectionName?: string;
  collectionRequestData?: string;
  /** Manage environment */
  envAction?: 'create' | 'switch' | 'set_var' | 'remove_var' | 'delete' | 'rename';
  envName?: string;
  envVarKey?: string;
  envVarValue?: string;
  /** Position in canvas */
  x: number;
  y: number;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  branch?: 'pass' | 'fail';
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Flow-level variables */
  variables?: Record<string, string>;
}

export interface FlowRunResult {
  nodeId: string;
  label: string;
  type: FlowNodeType;
  status: 'success' | 'failed' | 'skipped' | 'running';
  response?: ResponseData;
  testResults?: TestResult[];
  duration: number;
  error?: string;
  retryAttempts?: number;
  output?: any;
}

export interface FlowRunHistory {
  id: string;
  flowId: string;
  flowName: string;
  timestamp: number;
  results: FlowRunResult[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
}

// ── Factory functions ─────────────────────────────────────────────────
export function createEmptyRequest(): RequestConfig {
  return {
    id: crypto.randomUUID(),
    name: 'New Request',
    protocol: 'rest',
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    body: { type: 'none', raw: '', formData: [], graphql: { query: '', variables: '{}' } },
    auth: { type: 'none' },
    preScript: '',
    postScript: '',
    tests: '',
  };
}

export function createEmptyEnvironment(name = 'New Environment'): Environment {
  return { id: crypto.randomUUID(), name, variables: [], isActive: false };
}

export function createEmptyCollection(name = 'New Collection'): Collection {
  return { id: crypto.randomUUID(), name, description: '', requests: [] };
}

export function createEmptyWorkspace(name = 'My Workspace'): Workspace {
  return {
    id: crypto.randomUUID(),
    name,
    description: '',
    collections: [],
    environments: [{ id: crypto.randomUUID(), name: 'Default', variables: [], isActive: true }],
  };
}

export function createEmptyFlow(name = 'New Flow'): Flow {
  return { id: crypto.randomUUID(), name, description: '', nodes: [], edges: [], variables: {} };
}

export function getMethodColor(method: HttpMethod): string {
  const colors: Record<HttpMethod, string> = {
    GET: 'text-method-get',
    POST: 'text-method-post',
    PUT: 'text-method-put',
    PATCH: 'text-method-patch',
    DELETE: 'text-method-delete',
    OPTIONS: 'text-method-options',
    HEAD: 'text-method-head',
  };
  return colors[method];
}

export function getMethodBgColor(method: HttpMethod): string {
  const colors: Record<HttpMethod, string> = {
    GET: 'bg-method-get/10 text-method-get',
    POST: 'bg-method-post/10 text-method-post',
    PUT: 'bg-method-put/10 text-method-put',
    PATCH: 'bg-method-patch/10 text-method-patch',
    DELETE: 'bg-method-delete/10 text-method-delete',
    OPTIONS: 'bg-method-options/10 text-method-options',
    HEAD: 'bg-method-head/10 text-method-head',
  };
  return colors[method];
}

export function getStatusColor(status: number): string {
  if (status < 300) return 'text-status-success';
  if (status < 400) return 'text-status-redirect';
  if (status < 500) return 'text-status-client-error';
  return 'text-status-server-error';
}
