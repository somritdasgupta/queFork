import React, { useState, useCallback, useEffect, useRef } from "react";
import type {
  Flow,
  FlowNode,
  FlowRunResult,
  FlowRunHistory,
  FlowNodeType,
  RequestConfig,
  ResponseData,
  Environment,
  Collection,
  MatchRule,
  HttpMethod,
  BodyType,
} from "@/types/api";
import { createEmptyFlow } from "@/types/api";
import { executeRequest, runTests } from "@/lib/api-client";
import {
  safeEvalExpression,
  safeNewFunction,
  createSafeConsole,
} from "@/lib/safe-eval";
import {
  Plus,
  Play,
  Trash2,
  GitBranch,
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  XCircle,
  Loader2,
  ArrowDown,
  Timer,
  AlertTriangle,
  Code,
  FlaskConical,
  FileCode,
  Variable,
  Search,
  Repeat,
  ShieldCheck,
  ArrowRight,
  SkipForward,
  Copy,
  Download,
  Upload,
  Power,
  PowerOff,
  StickyNote,
  RotateCcw,
  Layers,
  Wrench,
  ShieldAlert,
  Braces,
  Filter,
  List,
  FolderPlus,
  BookOpen,
  Sparkles,
  Zap,
  ChevronRight,
  Hash,
  RefreshCw,
  CheckCircle2,
  Info,
  Workflow,
  Gauge,
  StopCircle,
  BarChart3,
  Hourglass,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  flows: Flow[];
  onChange: (flows: Flow[]) => void;
  collections: Collection[];
  tabs: RequestConfig[];
  activeEnv: Environment | null;
  useProxy: boolean;
  onSaveCollection?: (name: string, requests: RequestConfig[]) => void;
  /** Callback to execute a request visually in the main UI — populates tab, sends, shows response */
  onExecuteFlowRequest?: (req: RequestConfig) => Promise<ResponseData>;
  /** Update tab content in main UI WITHOUT executing (for script syncing) */
  onUpdateFlowTab?: (req: RequestConfig) => void;
  /** Collection CRUD callbacks */
  onCreateCollection?: (name: string) => string;
  onAddRequestToCollection?: (collectionId: string, req: RequestConfig) => void;
  onUpdateRequestInCollection?: (
    collectionId: string,
    req: RequestConfig,
  ) => void;
  onDeleteRequestFromCollection?: (
    collectionId: string,
    requestId: string,
  ) => void;
  onDeleteCollection?: (collectionId: string) => void;
  onRenameCollection?: (collectionId: string, name: string) => void;
  /** Environment CRUD callbacks */
  onCreateEnvironment?: (name: string) => string;
  onSwitchEnvironment?: (envId: string) => void;
  onSetEnvVariable?: (envId: string | null, key: string, value: string) => void;
  onRemoveEnvVariable?: (envId: string | null, key: string) => void;
  onDeleteEnvironment?: (envId: string) => void;
  onRenameEnvironment?: (envId: string, name: string) => void;
  /** Delay in ms between flow steps for visual effect (default 400) */
  stepDelayMs?: number;
}

const NODE_TYPES: {
  value: FlowNodeType;
  label: string;
  desc: string;
  icon: typeof Send;
  color: string;
  category: string;
}[] = [
  {
    value: "request",
    label: "Request",
    desc: "Execute any request tab",
    icon: Send,
    color: "text-primary",
    category: "Execute",
  },
  {
    value: "condition",
    label: "Condition",
    desc: "Branch on expression",
    icon: GitBranch,
    color: "text-method-put",
    category: "Logic",
  },
  {
    value: "switch_case",
    label: "Switch",
    desc: "Multi-way branch on value",
    icon: List,
    color: "text-method-put",
    category: "Logic",
  },
  {
    value: "response_match",
    label: "Response Match",
    desc: "Pattern match response",
    icon: Filter,
    color: "text-method-post",
    category: "Logic",
  },
  {
    value: "assert",
    label: "Assert",
    desc: "Validate a condition",
    icon: ShieldCheck,
    color: "text-status-success",
    category: "Logic",
  },
  {
    value: "schema_validate",
    label: "Schema Check",
    desc: "Validate response shape",
    icon: FileCheck,
    color: "text-status-success",
    category: "Logic",
  },
  {
    value: "delay",
    label: "Delay",
    desc: "Wait before next step",
    icon: Clock,
    color: "text-method-patch",
    category: "Control",
  },
  {
    value: "break_if",
    label: "Break If",
    desc: "Stop flow on condition",
    icon: StopCircle,
    color: "text-destructive",
    category: "Control",
  },
  {
    value: "wait_until",
    label: "Wait Until",
    desc: "Poll until condition met",
    icon: Hourglass,
    color: "text-method-patch",
    category: "Control",
  },
  {
    value: "log",
    label: "Log",
    desc: "Log a message",
    icon: MessageSquare,
    color: "text-muted-foreground",
    category: "Control",
  },
  {
    value: "set_variable",
    label: "Set Variable",
    desc: "Set a runtime variable",
    icon: Variable,
    color: "text-status-success",
    category: "Data",
  },
  {
    value: "counter",
    label: "Counter",
    desc: "Increment/decrement counter",
    icon: Gauge,
    color: "text-method-post",
    category: "Data",
  },
  {
    value: "extract",
    label: "Extract",
    desc: "Extract from response",
    icon: Search,
    color: "text-method-post",
    category: "Data",
  },
  {
    value: "transform",
    label: "Transform",
    desc: "Transform data with JS",
    icon: Braces,
    color: "text-method-put",
    category: "Data",
  },
  {
    value: "foreach",
    label: "For Each",
    desc: "Iterate over array data",
    icon: List,
    color: "text-method-patch",
    category: "Loop",
  },
  {
    value: "loop",
    label: "Loop",
    desc: "Repeat N times",
    icon: Repeat,
    color: "text-method-patch",
    category: "Loop",
  },
  {
    value: "save_collection",
    label: "Save Collection",
    desc: "Save results to collection",
    icon: FolderPlus,
    color: "text-status-success",
    category: "Output",
  },
  {
    value: "manage_collection",
    label: "Manage Collection",
    desc: "Create/edit/delete collections",
    icon: FolderPlus,
    color: "text-method-post",
    category: "Output",
  },
  {
    value: "manage_environment",
    label: "Manage Environment",
    desc: "Create/switch/edit environments",
    icon: Layers,
    color: "text-method-put",
    category: "Output",
  },
  {
    value: "group",
    label: "Group",
    desc: "Group steps together",
    icon: Layers,
    color: "text-primary",
    category: "Structure",
  },
  {
    value: "try_catch",
    label: "Try/Catch",
    desc: "Handle errors gracefully",
    icon: ShieldAlert,
    color: "text-destructive",
    category: "Structure",
  },
];

const NODE_CATEGORIES = [
  "Execute",
  "Logic",
  "Data",
  "Loop",
  "Control",
  "Output",
  "Structure",
];

// ── Transform helper functions available as h.* in expressions ────────
const TRANSFORM_HELPERS = {
  pick: (obj: any, ...keys: string[]) =>
    Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]])),
  omit: (obj: any, ...keys: string[]) =>
    Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k))),
  pluck: (arr: any[], key: string) => arr.map((item) => item?.[key]),
  groupBy: (arr: any[], key: string) =>
    arr.reduce((acc: any, item: any) => {
      const k = item?.[key];
      (acc[k] = acc[k] || []).push(item);
      return acc;
    }, {}),
  flatten: (arr: any[]) => arr.flat(Infinity),
  unique: (arr: any[]) => [...new Set(arr)],
  sortBy: (arr: any[], key: string, desc = false) =>
    [...arr].sort((a, b) =>
      desc ? (b[key] > a[key] ? 1 : -1) : a[key] > b[key] ? 1 : -1,
    ),
  chunk: (arr: any[], size: number) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size),
    ),
  merge: (...objs: any[]) => Object.assign({}, ...objs),
  deepMerge: (a: any, b: any): any => {
    const out = { ...a };
    for (const k of Object.keys(b)) {
      out[k] =
        typeof a[k] === "object" &&
        typeof b[k] === "object" &&
        !Array.isArray(a[k])
          ? TRANSFORM_HELPERS.deepMerge(a[k], b[k])
          : b[k];
    }
    return out;
  },
  base64: (str: string) => btoa(str),
  base64Decode: (str: string) => atob(str),
  timestamp: () => Date.now(),
  isoDate: () => new Date().toISOString(),
  formatDate: (ts: number, locale = "en-US") =>
    new Date(ts).toLocaleString(locale),
  keys: (obj: any) => Object.keys(obj),
  values: (obj: any) => Object.values(obj),
  entries: (obj: any) => Object.entries(obj),
  fromEntries: (entries: any[]) => Object.fromEntries(entries),
  size: (val: any) =>
    Array.isArray(val)
      ? val.length
      : typeof val === "object" && val
        ? Object.keys(val).length
        : String(val).length,
  type: (val: any) =>
    Array.isArray(val) ? "array" : val === null ? "null" : typeof val,
  toNum: (val: any) => Number(val),
  toStr: (val: any) => JSON.stringify(val),
  toBool: (val: any) => Boolean(val),
  toArray: (val: any) => (Array.isArray(val) ? val : [val]),
  join: (arr: any[], sep = ",") => arr.join(sep),
  split: (str: string, sep = ",") => str.split(sep),
  upper: (str: string) => String(str).toUpperCase(),
  lower: (str: string) => String(str).toLowerCase(),
  trim: (str: string) => String(str).trim(),
  replace: (str: string, find: string, rep: string) =>
    str.replace(new RegExp(find, "g"), rep),
  pad: (str: string, len: number, ch = " ") => String(str).padStart(len, ch),
  jsonPath: (obj: any, path: string) =>
    path.split(".").reduce((o: any, k: string) => {
      if (o == null) return undefined;
      const arrMatch = k.match(/^(\w+)\[(\d+)\]$/);
      if (arrMatch) return o[arrMatch[1]]?.[Number(arrMatch[2])];
      return o[k];
    }, obj),
  template: (str: string, data: any) =>
    str.replace(
      /\{\{(\w+(?:\.\w+)*)\}\}/g,
      (_, path) => TRANSFORM_HELPERS.jsonPath(data, path) ?? "",
    ),
  sum: (arr: number[]) => arr.reduce((a, b) => a + Number(b), 0),
  avg: (arr: number[]) =>
    arr.length ? TRANSFORM_HELPERS.sum(arr) / arr.length : 0,
  min: (arr: number[]) => Math.min(...arr.map(Number)),
  max: (arr: number[]) => Math.max(...arr.map(Number)),
  count: (arr: any[], pred?: (item: any) => boolean) =>
    pred ? arr.filter(pred).length : arr.length,
  find: (arr: any[], pred: (item: any) => boolean) => arr.find(pred),
  where: (arr: any[], key: string, val: any) =>
    arr.filter((item) => item?.[key] === val),
  mapKeys: (obj: any, fn: (key: string) => string) =>
    Object.fromEntries(Object.entries(obj).map(([k, v]) => [fn(k), v])),
  mapValues: (obj: any, fn: (val: any, key: string) => any) =>
    Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v, k)])),
  compact: (arr: any[]) => arr.filter(Boolean),
  zip: (a: any[], b: any[]) => a.map((v, i) => [v, b[i]]),
  unzip: (arr: any[][]) => [arr.map((a) => a[0]), arr.map((a) => a[1])],
  range: (start: number, end: number) =>
    Array.from({ length: end - start }, (_, i) => start + i),
  diff: (a: any[], b: any[]) => a.filter((x) => !b.includes(x)),
  intersect: (a: any[], b: any[]) => a.filter((x) => b.includes(x)),
};

const TRANSFORM_PRESETS = [
  {
    label: "pick keys",
    expr: "h.pick(body, 'id', 'name', 'email')",
    desc: "Keep only specified keys",
  },
  {
    label: "pluck field",
    expr: "h.pluck(body.data, 'id')",
    desc: "Extract one field from array",
  },
  {
    label: "filter",
    expr: "body.data.filter(x => x.active)",
    desc: "Filter array by condition",
  },
  {
    label: "map",
    expr: "body.data.map(x => ({ id: x.id, label: x.name }))",
    desc: "Transform each item",
  },
  {
    label: "group by",
    expr: "h.groupBy(body.data, 'type')",
    desc: "Group array by key",
  },
  {
    label: "sort by",
    expr: "h.sortBy(body.data, 'created_at', true)",
    desc: "Sort array by key",
  },
  {
    label: "flatten",
    expr: "h.flatten(body.data.map(x => x.tags))",
    desc: "Flatten nested arrays",
  },
  {
    label: "unique",
    expr: "h.unique(body.data.map(x => x.type))",
    desc: "Remove duplicates",
  },
  {
    label: "merge",
    expr: "h.merge(vars.config, { token: vars.authToken })",
    desc: "Merge objects",
  },
  {
    label: "json path",
    expr: "h.jsonPath(body, 'data.users[0].email')",
    desc: "Deep property access",
  },
  {
    label: "template",
    expr: "h.template('Bearer {{token}}', vars)",
    desc: "String interpolation",
  },
  {
    label: "aggregate",
    expr: '({ total: h.count(body.data), sum: h.sum(h.pluck(body.data, "amount")), avg: h.avg(h.pluck(body.data, "amount")) })',
    desc: "Compute stats",
  },
  {
    label: "base64",
    expr: "h.base64(JSON.stringify({ user: vars.userId }))",
    desc: "Base64 encode",
  },
  {
    label: "where",
    expr: "h.where(body.data, 'status', 'active')",
    desc: "Filter by key=value",
  },
];

// ── Flow Templates ────────────────────────────────────────────────────
interface FlowTemplate {
  id: string;
  name: string;
  desc: string;
  icon: typeof Send;
  color: string;
  tags: string[];
  create: () => Flow;
}

function makeNode(
  type: FlowNodeType,
  label: string,
  props: Partial<FlowNode> = {},
  y = 0,
): FlowNode {
  return { id: crypto.randomUUID(), type, label, x: 0, y, ...props };
}

function chainEdges(
  nodes: FlowNode[],
): { id: string; from: string; to: string }[] {
  return nodes.slice(0, -1).map((n, i) => ({
    id: crypto.randomUUID(),
    from: n.id,
    to: nodes[i + 1].id,
  }));
}

const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: "auth-api-validate",
    name: "Auth \u2192 API \u2192 Validate",
    desc: "Authenticate, call a protected endpoint, and validate the response",
    icon: ShieldCheck,
    color: "text-status-success",
    tags: ["auth", "validation"],
    create: () => {
      const nodes = [
        makeNode("request", "Login / Auth Request", {}, 0),
        makeNode(
          "condition",
          "Check Auth Success",
          { condition: "response.status === 200", continueOnError: true },
          80,
        ),
        makeNode(
          "extract",
          "Extract Token",
          {
            extractExpression:
              "h.jsonPath(body, 'token') || h.jsonPath(body, 'access_token') || h.jsonPath(body, 'data.token')",
            extractTarget: "authToken",
          },
          160,
        ),
        makeNode(
          "set_variable",
          "Set Auth Header",
          {
            variableName: "authHeader",
            variableValue: "h.template('Bearer {{authToken}}', vars)",
          },
          240,
        ),
        makeNode(
          "log",
          "Log Token Received",
          { logMessage: "Auth token: {{authToken}}" },
          320,
        ),
        makeNode("request", "Call Protected API", {}, 400),
        makeNode(
          "assert",
          "Validate Response",
          {
            assertExpression: "response.status >= 200 && response.status < 300",
            assertMessage: "Expected 2xx response from protected API",
          },
          480,
        ),
        makeNode(
          "response_match",
          "Match Response Data",
          {
            matchRules: [
              {
                id: crypto.randomUUID(),
                type: "status",
                operator: "equals",
                value: "200",
              },
            ],
            matchMode: "all",
          },
          560,
        ),
      ];
      return {
        id: crypto.randomUUID(),
        name: "Auth \u2192 API \u2192 Validate",
        description:
          "Authenticate with credentials, extract the token, call a protected endpoint, and validate the response structure.",
        nodes,
        edges: chainEdges(nodes),
        variables: {
          baseUrl: "https://api.example.com",
          username: "",
          password: "",
        },
      };
    },
  },
  {
    id: "crud-test-suite",
    name: "CRUD Test Suite",
    desc: "Create, read, update, delete with assertions at every step",
    icon: RefreshCw,
    color: "text-primary",
    tags: ["crud", "testing"],
    create: () => {
      const nodes = [
        makeNode(
          "try_catch",
          "Error Handler",
          { catchAction: "set_variable", catchVariable: "lastError" },
          0,
        ),
        makeNode("request", "POST Create", {}, 80),
        makeNode(
          "assert",
          "Assert Created",
          {
            assertExpression:
              "response.status === 201 || response.status === 200",
            assertMessage: "Create should return 200/201",
            continueOnError: true,
          },
          160,
        ),
        makeNode(
          "extract",
          "Extract ID",
          {
            extractExpression: "body.id || body.data?.id || body._id",
            extractTarget: "resourceId",
          },
          240,
        ),
        makeNode(
          "log",
          "Created ID",
          { logMessage: "Created resource: {{resourceId}}" },
          320,
        ),
        makeNode("request", "GET Read", {}, 400),
        makeNode(
          "assert",
          "Assert Found",
          {
            assertExpression: "response.status === 200",
            assertMessage: "Read should return 200",
          },
          480,
        ),
        makeNode("request", "PUT Update", {}, 560),
        makeNode(
          "assert",
          "Assert Updated",
          {
            assertExpression: "response.status === 200",
            assertMessage: "Update should return 200",
          },
          640,
        ),
        makeNode("request", "DELETE Remove", {}, 720),
        makeNode(
          "assert",
          "Assert Deleted",
          {
            assertExpression:
              "response.status === 200 || response.status === 204",
            assertMessage: "Delete should return 200/204",
          },
          800,
        ),
        makeNode(
          "save_collection",
          "Save Results",
          { saveCollectionName: "CRUD Test Results", saveCondition: "true" },
          880,
        ),
      ];
      return {
        id: crypto.randomUUID(),
        name: "CRUD Test Suite",
        description:
          "Full create-read-update-delete cycle with assertions and error handling at every step.",
        nodes,
        edges: chainEdges(nodes),
        variables: {
          baseUrl: "https://api.example.com",
          resourcePath: "/items",
        },
      };
    },
  },
  {
    id: "response-chain",
    name: "Response Chain",
    desc: "Pass data from one response into the next request dynamically",
    icon: ArrowRight,
    color: "text-method-put",
    tags: ["chain", "data"],
    create: () => {
      const nodes = [
        makeNode("request", "First Request", {}, 0),
        makeNode(
          "extract",
          "Extract Data",
          { extractExpression: "body", extractTarget: "firstResponse" },
          80,
        ),
        makeNode(
          "transform",
          "Transform Data",
          {
            transformExpression:
              "h.pick(vars.firstResponse, 'id', 'name', 'type')",
            transformTarget: "payload",
          },
          160,
        ),
        makeNode(
          "set_variable",
          "Build Next URL",
          {
            variableName: "nextUrl",
            variableValue:
              "h.template('{{baseUrl}}/items/{{id}}', vars.firstResponse)",
          },
          240,
        ),
        makeNode("request", "Second Request", {}, 320),
        makeNode(
          "condition",
          "Check Success",
          { condition: "response.status === 200" },
          400,
        ),
        makeNode(
          "log",
          "Log Chain Result",
          {
            logMessage:
              "Chain complete: {{nextUrl}} returned {{response.status}}",
          },
          480,
        ),
      ];
      return {
        id: crypto.randomUUID(),
        name: "Response Chain",
        description:
          "Extract data from one API response, transform it, and pass it to the next request.",
        nodes,
        edges: chainEdges(nodes),
        variables: { baseUrl: "https://api.example.com" },
      };
    },
  },
  {
    id: "data-validation",
    name: "Data Validation Pipeline",
    desc: "Fetch data, validate schema, check business rules, aggregate",
    icon: Filter,
    color: "text-method-post",
    tags: ["validation", "pipeline"],
    create: () => {
      const nodes = [
        makeNode("request", "Fetch Data", {}, 0),
        makeNode(
          "response_match",
          "Validate Status",
          {
            matchRules: [
              {
                id: crypto.randomUUID(),
                type: "status",
                operator: "equals",
                value: "200",
              },
              {
                id: crypto.randomUUID(),
                type: "keyword",
                operator: "contains",
                value: '"data"',
              },
            ],
            matchMode: "all",
          },
          80,
        ),
        makeNode(
          "extract",
          "Parse Items",
          {
            extractExpression: "body.data || body.results || body",
            extractTarget: "items",
          },
          160,
        ),
        makeNode(
          "foreach",
          "Iterate Items",
          { foreachExpression: "vars.items", foreachVariable: "records" },
          240,
        ),
        makeNode(
          "transform",
          "Compute Stats",
          {
            transformExpression:
              '({ count: h.size(vars.records), types: h.unique(h.pluck(vars.records, "type")), total: h.sum(h.pluck(vars.records, "amount").filter(Boolean)) })',
            transformTarget: "stats",
          },
          320,
        ),
        makeNode(
          "assert",
          "Minimum Records",
          {
            assertExpression: "vars.stats.count > 0",
            assertMessage: "Expected at least one record",
          },
          400,
        ),
        makeNode(
          "log",
          "Report",
          {
            logMessage:
              "Validated {{stats.count}} records across {{stats.types.length}} types",
          },
          480,
        ),
      ];
      return {
        id: crypto.randomUUID(),
        name: "Data Validation Pipeline",
        description:
          "Fetch, validate schema, iterate, compute statistics, and assert business rules.",
        nodes,
        edges: chainEdges(nodes),
        variables: {},
      };
    },
  },
  {
    id: "retry-resilience",
    name: "Retry & Resilience",
    desc: "Request with retry logic, error handling, and fallback",
    icon: RotateCcw,
    color: "text-method-patch",
    tags: ["retry", "resilience"],
    create: () => {
      const nodes = [
        makeNode(
          "try_catch",
          "Error Boundary",
          { catchAction: "set_variable", catchVariable: "error" },
          0,
        ),
        makeNode(
          "request",
          "Primary API",
          { retryCount: 3, retryDelayMs: 2000, continueOnError: true },
          80,
        ),
        makeNode(
          "condition",
          "Primary OK?",
          { condition: "response.status === 200", continueOnError: true },
          160,
        ),
        makeNode(
          "log",
          "Primary Success",
          { logMessage: "Primary API succeeded" },
          240,
        ),
        makeNode("request", "Fallback API", { continueOnError: true }, 320),
        makeNode(
          "condition",
          "Any Success?",
          { condition: "response.status === 200" },
          400,
        ),
        makeNode(
          "log",
          "Final Status",
          { logMessage: "Flow completed. Error: {{error}}" },
          480,
        ),
      ];
      return {
        id: crypto.randomUUID(),
        name: "Retry & Resilience",
        description:
          "Primary request with retry, automatic fallback on failure, and comprehensive error logging.",
        nodes,
        edges: chainEdges(nodes),
        variables: {},
      };
    },
  },
  {
    id: "try-example",
    name: "Try Example (JSONPlaceholder)",
    desc: "Full CRUD demo — GET, POST, PUT, DELETE with scripts, tests, chaining, transforms, loops, and error handling",
    icon: Zap,
    color: "text-primary",
    tags: ["demo", "example", "all-features"],
    create: () => {
      const nodes = [
        // Phase 1: Setup
        makeNode(
          "log",
          "1. Start Flow",
          { logMessage: "🚀 Starting advanced queFork Flow demo..." },
          0,
        ),
        makeNode(
          "set_variable",
          "2. Set Base URL",
          {
            variableName: "apiUrl",
            variableValue: "https://jsonplaceholder.typicode.com",
          },
          80,
        ),
        makeNode(
          "set_variable",
          "3. Set Auth Token",
          {
            variableName: "authToken",
            variableValue:
              "h.base64(JSON.stringify({ user: 'demo', role: 'admin', iat: h.timestamp() }))",
          },
          160,
        ),

        // Phase 2: GET all posts + validate
        makeNode(
          "request",
          "4. GET /posts",
          {
            httpUrl: "{{apiUrl}}/posts",
            httpMethod: "GET" as HttpMethod,
            httpHeaders: JSON.stringify({
              Authorization: "Bearer {{authToken}}",
              "X-Request-ID": "{{requestId}}",
            }),
            preScript:
              "// Pre-script: generate request ID and store in flow vars\nqf.variables.set('requestId', 'req-' + Math.random().toString(36).slice(2, 10));\nqf.log('Pre-script: set requestId =', qf.variables.get('requestId'));",
            postScript:
              "// Post-script: log response metrics\nconst size = qf.response.body.length;\nconst count = qf.response.json()?.length || 0;\nqf.variables.set('postCount', count);\nqf.log('Post-script: received', count, 'posts,', size, 'bytes');",
            testScript:
              "// Tests for GET /posts\ntest('Status is 200', () => { expect(qf.response.status).toBe(200); });\ntest('Returns array', () => { expect(Array.isArray(qf.response.json())).toBe(true); });\ntest('Has 100 posts', () => { expect(qf.response.json().length).toBe(100); });\ntest('Body is JSON', () => { expect(qf.response.body).toContain('{'); });",
          },
          240,
        ),
        makeNode(
          "condition",
          "5. Check Success",
          { condition: "response.status === 200", continueOnError: true },
          320,
        ),
        makeNode(
          "extract",
          "6. Extract All Posts",
          { extractExpression: "body", extractTarget: "allPosts" },
          400,
        ),

        // Phase 3: Transform + analyze data
        makeNode(
          "transform",
          "7. Group by User",
          {
            transformExpression: "h.groupBy(vars.allPosts, 'userId')",
            transformTarget: "postsByUser",
          },
          480,
        ),
        makeNode(
          "transform",
          "8. Compute Stats",
          {
            transformExpression:
              "({ totalPosts: h.size(vars.allPosts), uniqueUsers: h.size(h.keys(vars.postsByUser)), avgPostsPerUser: Math.round(h.size(vars.allPosts) / h.size(h.keys(vars.postsByUser))), longestTitle: h.sortBy(vars.allPosts, 'title').pop()?.title, shortestTitle: h.sortBy(vars.allPosts, 'title')[0]?.title })",
            transformTarget: "stats",
          },
          560,
        ),
        makeNode(
          "assert",
          "9. Validate Stats",
          {
            assertExpression:
              "vars.stats.totalPosts === 100 && vars.stats.uniqueUsers === 10",
            assertMessage: "Expected 100 posts from 10 users",
          },
          640,
        ),
        makeNode(
          "log",
          "10. Log Stats",
          { logMessage: "Stats: {{stats}}" },
          720,
        ),

        // Phase 4: POST — Create new resource
        makeNode(
          "request",
          "11. POST /posts",
          {
            httpUrl: "{{apiUrl}}/posts",
            httpMethod: "POST" as HttpMethod,
            httpBodyType: "json" as BodyType,
            httpBody: JSON.stringify({
              title: "Created by queFork Flow",
              body: "This post was created during an automated flow run.",
              userId: 1,
            }),
            httpHeaders: JSON.stringify({
              "Content-Type": "application/json",
              Authorization: "Bearer {{authToken}}",
            }),
            preScript:
              "// Pre-script: log what we're about to create\nqf.log('Creating new post for userId: 1');",
            postScript:
              "// Post-script: store created resource details in flow vars\nconst created = qf.response.json();\nif (created) {\n  qf.variables.set('createdTitle', created.title);\n  qf.variables.set('createdUserId', created.userId);\n}\nqf.log('Post-script: created resource:', created?.id);",
            testScript:
              "test('Created status 201', () => { expect(qf.response.status).toBe(201); });\ntest('Has ID', () => { expect(qf.response.json().id).toBeTruthy(); });\ntest('Title matches', () => { expect(qf.response.json().title).toBe('Created by queFork Flow'); });",
          },
          800,
        ),
        makeNode(
          "extract",
          "12. Extract Created ID",
          { extractExpression: "body.id", extractTarget: "createdId" },
          880,
        ),
        makeNode(
          "assert",
          "13. Verify Created",
          {
            assertExpression:
              "vars.createdId !== undefined && vars.createdId !== null",
            assertMessage: "POST should return a new resource ID",
          },
          960,
        ),
        makeNode(
          "log",
          "14. Created Resource",
          { logMessage: "Created post with ID: {{createdId}}" },
          1040,
        ),

        // Phase 5: PUT — Update the resource
        makeNode(
          "request",
          "15. PUT /posts/1",
          {
            httpUrl: "{{apiUrl}}/posts/1",
            httpMethod: "PUT" as HttpMethod,
            httpBodyType: "json" as BodyType,
            httpBody: JSON.stringify({
              id: 1,
              title: "Updated by queFork Flow",
              body: "This post was updated during the flow run.",
              userId: 1,
            }),
            httpHeaders: JSON.stringify({ "Content-Type": "application/json" }),
            postScript:
              "// Post-script: verify update was applied\nconst updated = qf.response.json();\nqf.variables.set('updateVerified', updated?.title === 'Updated by queFork Flow');\nqf.log('Post-script: update verified =', qf.variables.get('updateVerified'));",
            testScript:
              "test('Update status 200', () => { expect(qf.response.status).toBe(200); });\ntest('Title updated', () => { expect(qf.response.json().title).toBe('Updated by queFork Flow'); });",
          },
          1120,
        ),
        makeNode(
          "response_match",
          "16. Validate Update Shape",
          {
            matchRules: [
              {
                id: crypto.randomUUID(),
                type: "status",
                operator: "equals",
                value: "200",
              },
              {
                id: crypto.randomUUID(),
                type: "keyword",
                operator: "contains",
                value: '"Updated by queFork Flow"',
              },
              {
                id: crypto.randomUUID(),
                type: "key_value",
                path: "userId",
                operator: "equals",
                value: "1",
              },
            ],
            matchMode: "all",
          },
          1200,
        ),

        // Phase 6: Iterate + transform subset
        makeNode(
          "foreach",
          "17. Iterate User 1 Posts",
          {
            foreachExpression:
              "h.where(vars.allPosts, 'userId', 1).slice(0, 5)",
            foreachVariable: "user1Posts",
          },
          1280,
        ),
        makeNode(
          "transform",
          "18. Build Report",
          {
            transformExpression:
              "vars.user1Posts.map(p => ({ id: p.id, titleLen: h.size(p.title), preview: p.title.slice(0, 30) + '...', wordCount: h.split(p.body, ' ').length }))",
            transformTarget: "postReport",
          },
          1360,
        ),
        makeNode(
          "assert",
          "19. Report Complete",
          {
            assertExpression:
              "Array.isArray(vars.postReport) && vars.postReport.length > 0 && vars.postReport[0].wordCount > 0",
            assertMessage: "Post report should have entries with word counts",
          },
          1440,
        ),

        // Phase 7: DELETE + error handling
        makeNode(
          "try_catch",
          "20. Error Boundary",
          { catchAction: "set_variable", catchVariable: "deleteError" },
          1520,
        ),
        makeNode(
          "request",
          "21. DELETE /posts/1",
          {
            httpUrl: "{{apiUrl}}/posts/1",
            httpMethod: "DELETE" as HttpMethod,
            postScript:
              "// Post-script: record deletion status\nqf.variables.set('deleteStatus', qf.response.status);\nqf.log('Post-script: DELETE returned status', qf.response.status);",
            testScript:
              "test('Delete status 200', () => { expect(qf.response.status).toBe(200); });",
          },
          1600,
        ),
        makeNode(
          "condition",
          "22. Delete OK?",
          { condition: "response.status === 200", continueOnError: true },
          1680,
        ),

        // Phase 8: GET comments (chaining from post)
        makeNode(
          "request",
          "23. GET /posts/1/comments",
          {
            httpUrl: "{{apiUrl}}/posts/1/comments",
            httpMethod: "GET" as HttpMethod,
            preScript:
              "// Pre-script: log chained request context\nqf.log('Pre-script: fetching comments for post 1, delete status was:', qf.variables.get('deleteStatus'));",
            postScript:
              "// Post-script: compute comment stats\nconst comments = qf.response.json() || [];\nqf.variables.set('commentCount', comments.length);\nqf.variables.set('avgCommentLength', comments.length ? Math.round(comments.reduce((s, c) => s + c.body.length, 0) / comments.length) : 0);\nqf.log('Post-script:', comments.length, 'comments, avg length:', qf.variables.get('avgCommentLength'));",
            testScript:
              "test('Comments status 200', () => { expect(qf.response.status).toBe(200); });\ntest('Returns array', () => { expect(Array.isArray(qf.response.json())).toBe(true); });\ntest('Comments have email', () => { expect(qf.response.json().every(c => c.email)).toBe(true); });\ntest('Has at least 1 comment', () => { expect(qf.response.json().length).toBeGreaterThan(0); });",
          },
          1760,
        ),
        makeNode(
          "extract",
          "24. Extract Emails",
          {
            extractExpression: "h.unique(h.pluck(body, 'email'))",
            extractTarget: "commentEmails",
          },
          1840,
        ),
        makeNode(
          "transform",
          "25. Email Domains",
          {
            transformExpression:
              "h.unique(vars.commentEmails.map(e => e.split('@')[1])).sort()",
            transformTarget: "emailDomains",
          },
          1920,
        ),

        // Phase 9: Final summary
        makeNode("delay", "26. Wait 300ms", { delayMs: 300 }, 2000),
        makeNode(
          "set_variable",
          "27. Build Summary",
          {
            variableName: "finalReport",
            variableValue:
              "h.toStr({ totalPosts: vars.stats.totalPosts, uniqueUsers: vars.stats.uniqueUsers, createdId: vars.createdId, user1PostCount: h.size(vars.user1Posts), commentEmails: h.size(vars.commentEmails), emailDomains: vars.emailDomains, timestamp: h.isoDate() })",
          },
          2080,
        ),
        makeNode(
          "log",
          "28. Final Report",
          { logMessage: "Final Report: {{finalReport}}" },
          2160,
        ),
        makeNode(
          "assert",
          "29. All Data Collected",
          {
            assertExpression:
              "vars.stats && vars.createdId && vars.postReport && vars.commentEmails && vars.emailDomains",
            assertMessage: "All flow variables should be populated",
          },
          2240,
        ),
        makeNode(
          "log",
          "30. Flow Complete",
          {
            logMessage:
              "✅ Advanced demo flow finished — GET, POST, PUT, DELETE, scripts, tests, transforms, loops, error handling all verified!",
          },
          2320,
        ),
      ];
      return {
        id: crypto.randomUUID(),
        name: "Try Example",
        description:
          "Advanced demo: Full CRUD lifecycle (GET, POST, PUT, DELETE) with pre/post scripts, inline tests, data extraction, groupBy/transform/iterate, response pattern matching, try/catch error handling, and chained API calls — all using JSONPlaceholder.",
        nodes,
        edges: chainEdges(nodes),
        variables: { apiUrl: "https://jsonplaceholder.typicode.com" },
      };
    },
  },
];

export function FlowPanel({
  flows,
  onChange,
  collections,
  tabs,
  activeEnv,
  useProxy,
  onSaveCollection,
  onExecuteFlowRequest,
  onUpdateFlowTab,
  onCreateCollection,
  onAddRequestToCollection,
  onUpdateRequestInCollection,
  onDeleteRequestFromCollection,
  onDeleteCollection,
  onRenameCollection,
  onCreateEnvironment,
  onSwitchEnvironment,
  onSetEnvVariable,
  onRemoveEnvVariable,
  onDeleteEnvironment,
  onRenameEnvironment,
  stepDelayMs = 5000,
}: Props) {
  // Ensure at least one flow always exists
  useEffect(() => {
    if (flows.length === 0) {
      const f = createEmptyFlow("Flow 1");
      onChange([f]);
    }
  }, [flows.length, onChange]);

  const [activeFlowId, setActiveFlowId] = useState<string | null>(
    flows[0]?.id || null,
  );
  const [showAddNode, setShowAddNode] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showFlowVars, setShowFlowVars] = useState(false);
  const [showFlowSettings, setShowFlowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [flowHistory, setFlowHistory] = useState<FlowRunHistory[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("qf_flow_history") || "[]");
    } catch {
      return [];
    }
  });

  // ── Per-flow execution state (persists across tab switches) ─────────
  type FlowExecState = {
    running: boolean;
    results: FlowRunResult[];
    executionLog: string[];
    activeRunNodeId: string | null;
    showScriptsForNode: string | null;
    activeScriptTab: "pre" | "post" | "test" | null;
    delayInfo: { label: string; remaining: number; total: number } | null;
  };
  const defaultExecState = useCallback(
    (): FlowExecState => ({
      running: false,
      results: [],
      executionLog: [],
      activeRunNodeId: null,
      showScriptsForNode: null,
      activeScriptTab: null,
      delayInfo: null,
    }),
    [],
  );
  const execStateRef = useRef<Record<string, FlowExecState>>({});
  const getExecState = useCallback(
    (id: string | null): FlowExecState => {
      if (!id) return defaultExecState();
      if (!execStateRef.current[id])
        execStateRef.current[id] = defaultExecState();
      return execStateRef.current[id];
    },
    [defaultExecState],
  );
  // Force re-render when execution state changes
  const [execTick, setExecTick] = useState(0);
  const tickExec = useCallback(() => setExecTick((t) => t + 1), []);

  const setExec = useCallback(
    (
      flowId: string | null,
      updater:
        | Partial<FlowExecState>
        | ((prev: FlowExecState) => Partial<FlowExecState>),
    ) => {
      if (!flowId) return;
      const prev = getExecState(flowId);
      const patch = typeof updater === "function" ? updater(prev) : updater;
      execStateRef.current[flowId] = { ...prev, ...patch };
      tickExec();
    },
    [getExecState, tickExec],
  );

  // Convenience accessors for active flow
  const execState = getExecState(activeFlowId);
  const running = execState.running;
  const results = execState.results;
  const executionLog = execState.executionLog;
  const activeRunNodeId = execState.activeRunNodeId;
  const showScriptsForNode = execState.showScriptsForNode;
  const activeScriptTab = execState.activeScriptTab;
  const delayInfo = execState.delayInfo;

  // Track which flow is currently being executed (separate from activeFlowId which is the viewed tab)
  const runningFlowIdRef = useRef<string | null>(null);

  // Setter wrappers that target the executing flow (not the viewed flow)
  const setRunning = useCallback(
    (v: boolean) => {
      const fid = runningFlowIdRef.current || activeFlowId;
      setExec(fid, { running: v });
    },
    [activeFlowId, setExec],
  );
  const setResults = useCallback(
    (v: FlowRunResult[]) => {
      const fid = runningFlowIdRef.current || activeFlowId;
      setExec(fid, { results: v });
    },
    [activeFlowId, setExec],
  );
  const setExecutionLog = useCallback(
    (v: string[]) => {
      const fid = runningFlowIdRef.current || activeFlowId;
      setExec(fid, { executionLog: v });
    },
    [activeFlowId, setExec],
  );
  const setActiveRunNodeId = useCallback(
    (v: string | null) => {
      const fid = runningFlowIdRef.current || activeFlowId;
      setExec(fid, { activeRunNodeId: v });
    },
    [activeFlowId, setExec],
  );
  const setShowScriptsForNode = useCallback(
    (v: string | null) => {
      const fid = runningFlowIdRef.current || activeFlowId;
      setExec(fid, { showScriptsForNode: v });
    },
    [activeFlowId, setExec],
  );
  const setActiveScriptTab = useCallback(
    (v: "pre" | "post" | "test" | null) => {
      const fid = runningFlowIdRef.current || activeFlowId;
      setExec(fid, { activeScriptTab: v });
    },
    [activeFlowId, setExec],
  );
  const setDelayInfo = useCallback(
    (v: { label: string; remaining: number; total: number } | null) => {
      const fid = runningFlowIdRef.current || activeFlowId;
      setExec(fid, { delayInfo: v });
    },
    [activeFlowId, setExec],
  );

  const activeFlow =
    flows.find((f) => f.id === activeFlowId) || flows[0] || null;

  // Keep activeFlowId in sync
  useEffect(() => {
    if (!activeFlow && flows.length > 0) setActiveFlowId(flows[0].id);
    if (activeFlow && activeFlowId !== activeFlow.id)
      setActiveFlowId(activeFlow.id);
  }, [flows, activeFlow, activeFlowId]);

  const updateFlow = useCallback(
    (updater: (f: Flow) => Flow) => {
      const id = activeFlowId || flows[0]?.id;
      if (!id) return;
      onChange(flows.map((f) => (f.id === id ? updater(f) : f)));
    },
    [flows, activeFlowId, onChange],
  );

  const addFlow = () => {
    const f = createEmptyFlow(`Flow ${flows.length + 1}`);
    onChange([...flows, f]);
    setActiveFlowId(f.id);
  };

  const deleteFlow = (id: string) => {
    if (flows.length <= 1) {
      // Replace with empty flow instead of deleting
      const f = createEmptyFlow("Flow 1");
      onChange([f]);
      setActiveFlowId(f.id);
      return;
    }
    const next = flows.filter((f) => f.id !== id);
    onChange(next);
    if (activeFlowId === id) setActiveFlowId(next[0]?.id || null);
  };

  const duplicateFlow = () => {
    if (!activeFlow) return;
    const dup: Flow = {
      ...activeFlow,
      id: crypto.randomUUID(),
      name: `${activeFlow.name} (copy)`,
      nodes: activeFlow.nodes.map((n) => ({ ...n, id: crypto.randomUUID() })),
    };
    const idMap = new Map(
      activeFlow.nodes.map((n, i) => [n.id, dup.nodes[i].id]),
    );
    dup.edges = activeFlow.edges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      from: idMap.get(e.from) || e.from,
      to: idMap.get(e.to) || e.to,
    }));
    onChange([...flows, dup]);
    setActiveFlowId(dup.id);
    toast.success("Flow duplicated");
  };

  const exportFlow = () => {
    if (!activeFlow) return;
    const blob = new Blob([JSON.stringify(activeFlow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeFlow.name.replace(/\s+/g, "-")}.flow.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Flow exported");
  };

  const importFlow = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const f: Flow = {
          ...data,
          id: crypto.randomUUID(),
          name: data.name || "Imported Flow",
        };
        onChange([...flows, f]);
        setActiveFlowId(f.id);
        toast.success("Flow imported");
      } catch {
        toast.error("Invalid flow file");
      }
    };
    input.click();
  };

  const loadTemplate = (template: FlowTemplate) => {
    const f = template.create();
    onChange([...flows, f]);
    setActiveFlowId(f.id);
    setShowTemplates(false);
    setExpandedNodes(new Set(f.nodes.map((n) => n.id)));
    toast.success(`Template "${template.name}" loaded`);
  };

  const addNode = (type: FlowNodeType) => {
    if (!activeFlow) return;
    const defaults: Partial<FlowNode> =
      {
        delay: { delayMs: 1000 },
        condition: { condition: "response.status === 200" },
        log: { logMessage: "Step completed" },
        set_variable: { variableName: "myVar", variableValue: "" },
        extract: {
          extractExpression: "body.data.token",
          extractTarget: "authToken",
        },
        loop: { loopCount: 3 },
        assert: {
          assertExpression: "response.status === 200",
          assertMessage: "Expected status 200",
        },
        transform: {
          transformExpression: "h.pick(body, 'id', 'name')",
          transformTarget: "parsed",
        },
        group: {},
        try_catch: { catchAction: "log" },
        response_match: {
          matchRules: [
            {
              id: crypto.randomUUID(),
              type: "status",
              operator: "equals",
              value: "200",
            },
          ],
          matchMode: "all",
        },
        http_request: {},
        foreach: {
          foreachExpression: "body.data || body",
          foreachVariable: "items",
        },
        save_collection: {
          saveCollectionName: "Flow Results",
          saveCondition: "true",
        },
        switch_case: {
          switchExpression: "response.status",
          switchCases: [
            { id: crypto.randomUUID(), value: "200", label: "OK" },
            { id: crypto.randomUUID(), value: "404", label: "Not Found" },
          ],
          switchDefault: "continue",
        },
        break_if: {
          breakCondition: "response.status >= 400",
          breakMessage: "Stopping: error response",
        },
        counter: {
          counterName: "requestCount",
          counterAction: "increment",
          counterStep: 1,
          counterInitial: 0,
        },
        wait_until: {
          waitCondition: 'vars.status === "ready"',
          waitTimeoutMs: 30000,
          waitIntervalMs: 2000,
        },
        schema_validate: {
          schemaKeys: "id:number, name:string, email:string",
          schemaTarget: "body",
        },
        manage_collection: {
          collectionAction: "create",
          collectionName: "New Collection",
        },
        manage_environment: { envAction: "create", envName: "New Environment" },
      }[type] || {};

    const labels: Record<FlowNodeType, string> = {
      request: "Request",
      condition: "If condition",
      delay: "Wait",
      log: "Log",
      set_variable: "Set Variable",
      extract: "Extract Value",
      loop: "Loop",
      assert: "Assert",
      transform: "Transform",
      group: "Group",
      try_catch: "Try/Catch",
      response_match: "Match Response",
      http_request: "Request",
      foreach: "For Each",
      save_collection: "Save Collection",
      switch_case: "Switch",
      break_if: "Break If",
      counter: "Counter",
      wait_until: "Wait Until",
      schema_validate: "Schema Check",
      manage_collection: "Manage Collection",
      manage_environment: "Manage Environment",
    };

    const node: FlowNode = {
      id: crypto.randomUUID(),
      type,
      label: labels[type],
      x: 0,
      y: activeFlow.nodes.length * 80,
      ...defaults,
    };
    const edges = [...activeFlow.edges];
    if (activeFlow.nodes.length > 0) {
      const lastNode = activeFlow.nodes[activeFlow.nodes.length - 1];
      edges.push({ id: crypto.randomUUID(), from: lastNode.id, to: node.id });
    }
    updateFlow((f) => ({ ...f, nodes: [...f.nodes, node], edges }));
    setShowAddNode(false);
    setExpandedNodes((prev) => new Set(prev).add(node.id));
  };

  const removeNode = (nodeId: string) => {
    updateFlow((f) => ({
      ...f,
      nodes: f.nodes.filter((n) => n.id !== nodeId),
      edges: f.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    }));
  };

  const moveNode = (nodeId: string, direction: "up" | "down") => {
    updateFlow((f) => {
      const idx = f.nodes.findIndex((n) => n.id === nodeId);
      if (
        (direction === "up" && idx === 0) ||
        (direction === "down" && idx === f.nodes.length - 1)
      )
        return f;
      const nodes = [...f.nodes];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [nodes[idx], nodes[swapIdx]] = [nodes[swapIdx], nodes[idx]];
      const edges = nodes.slice(0, -1).map((n, i) => ({
        id: crypto.randomUUID(),
        from: n.id,
        to: nodes[i + 1].id,
      }));
      return { ...f, nodes, edges };
    });
  };

  const duplicateNode = (nodeId: string) => {
    updateFlow((f) => {
      const idx = f.nodes.findIndex((n) => n.id === nodeId);
      const node = f.nodes[idx];
      const dup = {
        ...node,
        id: crypto.randomUUID(),
        label: `${node.label} (copy)`,
      };
      const nodes = [...f.nodes];
      nodes.splice(idx + 1, 0, dup);
      const edges = nodes.slice(0, -1).map((n, i) => ({
        id: crypto.randomUUID(),
        from: n.id,
        to: nodes[i + 1].id,
      }));
      return { ...f, nodes, edges };
    });
  };

  const updateNode = (nodeId: string, updates: Partial<FlowNode>) => {
    updateFlow((f) => ({
      ...f,
      nodes: f.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
    }));
  };

  const toggleNodeExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collectionRequests = collections.flatMap((c) => c.requests);
  const allRequests = [
    ...collectionRequests,
    ...tabs.filter((t) => !collectionRequests.find((cr) => cr.id === t.id)),
  ];

  // ── Flow execution engine ───────────────────────────────────────────
  const runFlow = async () => {
    if (!activeFlow || activeFlow.nodes.length === 0) {
      toast.error("Add nodes first");
      return;
    }
    // Capture the flow ID for this execution run
    const execFlowId = activeFlow.id;
    runningFlowIdRef.current = execFlowId;
    setRunning(true);
    setResults([]);
    setExecutionLog([]);
    setActiveRunNodeId(null);
    const runResults: FlowRunResult[] = [];
    const log: string[] = [];
    let lastResponse: ResponseData | null = null;
    let skipRest = false;
    const vars: Record<string, any> = {};

    if (activeEnv)
      activeEnv.variables
        .filter((v) => v.enabled)
        .forEach((v) => {
          vars[v.key] = v.value;
        });
    if (activeFlow.variables)
      Object.entries(activeFlow.variables).forEach(([k, v]) => {
        vars[k] = v;
      });

    const replaceVars = (str: string): string =>
      str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

    const addLog = (msg: string) => {
      log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setExecutionLog([...log]);
    };

    let tryCatchActive = false;
    let tryCatchNode: FlowNode | null = null;

    // UI switching delay with visible countdown
    const uiDelay = async (ms: number = 3000, label: string = "Next") => {
      const total = ms;
      const interval = 100;
      let remaining = ms;
      setDelayInfo({ label, remaining, total });
      while (remaining > 0) {
        await new Promise((r) => setTimeout(r, interval));
        remaining -= interval;
        setDelayInfo({ label, remaining: Math.max(0, remaining), total });
      }
      setDelayInfo(null);
    };
    // Short pause for state render
    const renderPause = () => new Promise((r) => setTimeout(r, 400));
    // Helper to run pre/post scripts with flow vars context
    const runFlowScript = (
      script: string,
      response: any,
      request: RequestConfig,
      flowVars: Record<string, any>,
    ) => {
      const qfApi = {
        variables: {
          get: (key: string) => flowVars[key],
          set: function (key: string, value: any) {
            flowVars[key] = value;
            return this;
          },
          remove: function (key: string) {
            delete flowVars[key];
            return this;
          },
          list: () => ({ ...flowVars }),
        },
        response: response
          ? {
              status: response.status,
              statusText: response.statusText,
              body: response.body,
              headers: response.headers,
              time: response.time,
              json: () => {
                try {
                  return JSON.parse(response.body);
                } catch {
                  return null;
                }
              },
            }
          : {},
        request: { method: request.method, url: request.url },
        log: (...args: any[]) => {
          console.log("[qf]", ...args);
          addLog(`[script] ${args.join(" ")}`);
        },
      };
      const safeConsole = createSafeConsole((...args: any[]) => {
        console.log("[qf-sandbox]", ...args);
        addLog(`[script] ${args.join(" ")}`);
      });
      const fn = safeNewFunction(["qf", "console"], script);
      fn(qfApi, safeConsole);
    };

    for (let i = 0; i < activeFlow.nodes.length; i++) {
      const node = activeFlow.nodes[i];

      if (node.disabled) {
        runResults.push({
          nodeId: node.id,
          label: node.label,
          type: node.type,
          status: "skipped",
          duration: 0,
        });
        addLog(`Skip: ${node.label} (disabled)`);
        setResults([...runResults]);
        continue;
      }

      if (skipRest && !tryCatchActive) {
        runResults.push({
          nodeId: node.id,
          label: node.label,
          type: node.type,
          status: "skipped",
          duration: 0,
        });
        setResults([...runResults]);
        continue;
      }

      runResults.push({
        nodeId: node.id,
        label: node.label,
        type: node.type,
        status: "running",
        duration: 0,
      });
      setResults([...runResults]);
      // Auto-expand current node (keep previous nodes expanded too)
      setActiveRunNodeId(node.id);
      setExpandedNodes((prev) => new Set([...prev, node.id]));
      setActiveScriptTab(null);
      // Show scripts panel for request nodes that have scripts
      const hasNodeScripts =
        (node.type === "request" || node.type === "http_request") &&
        (node.preScript || node.postScript || node.testScript);
      if (hasNodeScripts) {
        setShowScriptsForNode(node.id);
      }
      // Brief pause to let UI render the "running" state
      await renderPause();
      // Scroll the node into view
      const nodeEl = document.querySelector(`[data-node-id="${node.id}"]`);
      if (nodeEl)
        nodeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      await renderPause();

      const start = performance.now();

      try {
        if (node.type === "try_catch") {
          tryCatchActive = true;
          tryCatchNode = node;
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: "Try/Catch active",
            type: "try_catch",
            status: "success",
            duration: 0,
          };
          addLog(`Try/Catch block started`);
        } else if (node.type === "request" || node.type === "http_request") {
          let req = allRequests.find((r) => r.id === node.requestId);
          // Fallback: build inline request from node fields (for templates/examples)
          if (!req && node.httpUrl) {
            const resolvedUrl = replaceVars(node.httpUrl);
            // Parse inline headers from JSON object format
            let inlineHeaders: {
              id: string;
              key: string;
              value: string;
              enabled: boolean;
            }[] = [];
            if (node.httpHeaders) {
              try {
                const parsed = JSON.parse(replaceVars(node.httpHeaders));
                inlineHeaders = Object.entries(parsed).map(([key, value]) => ({
                  id: crypto.randomUUID(),
                  key,
                  value: String(value),
                  enabled: true,
                }));
              } catch {
                /* ignore parse errors */
              }
            }
            req = {
              id: node.id,
              name: node.label,
              protocol: "rest" as const,
              method: (node.httpMethod || "GET") as HttpMethod,
              url: resolvedUrl,
              params: [],
              headers: inlineHeaders,
              body: {
                type: (node.httpBodyType || "none") as BodyType,
                raw: node.httpBody || "",
                formData: [],
                graphql: { query: "", variables: "{}" },
              },
              auth: { type: "none" as const },
              preScript: "",
              postScript: "",
              tests: "",
            };
          }
          if (!req)
            throw new Error(
              "No request selected — pick a tab or set an inline URL",
            );

          if (["websocket", "sse", "socketio"].includes(req.protocol)) {
            addLog(
              `${req.protocol.toUpperCase()} ${req.url} — realtime protocols run as standard HTTP in flows`,
            );
          }

          const mergedReq = {
            ...req,
            url: replaceVars(req.url),
            headers: req.headers.map((h) => ({
              ...h,
              key: replaceVars(h.key),
              value: replaceVars(h.value),
            })),
            body: { ...req.body, raw: replaceVars(req.body.raw) },
          };
          if (node.preScript)
            mergedReq.preScript =
              (mergedReq.preScript || "") + "\n" + node.preScript;
          if (node.postScript)
            mergedReq.postScript =
              (mergedReq.postScript || "") + "\n" + node.postScript;

          // Helper to scroll a script section into view
          const scrollToScript = (tab: string) => {
            requestAnimationFrame(() => {
              const el = document.querySelector(
                `[data-script-section="${node.id}-${tab}"]`,
              );
              if (el)
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          };

          // Helper to switch the main request panel tab
          const switchRequestTab = (
            tab: "pre-script" | "post-script" | "tests" | "params",
          ) => {
            document.dispatchEvent(
              new CustomEvent("qf:set-request-tab", { detail: tab }),
            );
          };

          // Merge tests into request so main tab can see them
          const combinedTests = [req.tests, node.testScript]
            .filter(Boolean)
            .join("\n\n");
          const fullReq = {
            ...mergedReq,
            tests: combinedTests || mergedReq.tests,
          };

          // ★ KEY FIX: Update the main tab with full request data FIRST
          // so that when we switch to pre-script/post-script/tests tabs,
          // the content is already there
          if (onUpdateFlowTab) {
            onUpdateFlowTab(fullReq);
            await renderPause(); // Let React re-render with new tab content
          }

          let response: ResponseData | null = null;
          let lastError: Error | null = null;
          const maxRetries = node.retryCount || 0;
          const retryDelay = node.retryDelayMs || 1000;

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              if (attempt > 0) {
                addLog(
                  `Retry ${attempt}/${maxRetries} for ${mergedReq.method} ${mergedReq.url}`,
                );
                await new Promise((r) => setTimeout(r, retryDelay));
              }

              // ── Pre-script: visually switch to pre-script tab ──
              if (mergedReq.preScript) {
                setActiveScriptTab("pre");
                scrollToScript("pre");
                switchRequestTab("pre-script");
                addLog(`▶ Running pre-script...`);
                await uiDelay(2000, "Pre-script");
                try {
                  runFlowScript(mergedReq.preScript, {}, mergedReq, vars);
                } catch (e: any) {
                  addLog(`Pre-script error: ${e.message}`);
                }
                addLog(`✓ Pre-script complete`);
                await uiDelay(1500, "Pre-script done");
              }

              // ── Execute request ──
              setActiveScriptTab(null);
              switchRequestTab("params");
              addLog(`📡 Sending ${mergedReq.method} ${mergedReq.url}...`);
              await renderPause();

              if (onExecuteFlowRequest) {
                response = await onExecuteFlowRequest(fullReq);
              } else {
                response = await executeRequest(
                  mergedReq,
                  activeEnv,
                  useProxy,
                  vars,
                );
              }

              addLog(
                `📥 Response: ${response?.status} ${response?.statusText} (${response?.time}ms)`,
              );
              await uiDelay(1500, "Response received");

              // ── Post-script: visually switch to post-script tab ──
              if (mergedReq.postScript && response) {
                setActiveScriptTab("post");
                scrollToScript("post");
                // Also switch the main request panel to post-script tab
                switchRequestTab("post-script");
                addLog(`▶ Running post-script...`);
                await uiDelay(2000, "Post-script");
                try {
                  runFlowScript(
                    mergedReq.postScript,
                    response,
                    mergedReq,
                    vars,
                  );
                } catch (e: any) {
                  addLog(`Post-script error: ${e.message}`);
                }
                addLog(`✓ Post-script complete`);
                await uiDelay(1500, "Post-script done");
              }

              lastError = null;
              break;
            } catch (e: any) {
              lastError = e;
              if (attempt === maxRetries) break;
            }
          }

          if (lastError && !response) throw lastError;

          const elapsed = performance.now() - start;
          let testResults;
          if (combinedTests && response) {
            setActiveScriptTab("test");
            requestAnimationFrame(() => {
              const el = document.querySelector(
                `[data-script-section="${node.id}-test"]`,
              );
              if (el)
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            });
            // Switch main request panel to tests tab
            switchRequestTab("tests");
            addLog(`▶ Running tests...`);
            await uiDelay(2000, "Running tests");
            testResults = runTests(
              combinedTests,
              response,
              activeEnv,
              mergedReq,
              vars,
            );
            const passedTests = testResults.filter((t) => t.passed).length;
            const failedTests = testResults.filter((t) => !t.passed).length;
            addLog(`✓ Tests: ${passedTests} passed, ${failedTests} failed`);
            await uiDelay(3000, "Test results");
          }
          setActiveScriptTab(null);
          lastResponse = response;
          const hasFailed = testResults?.some((t) => !t.passed);
          addLog(
            `${hasFailed ? "FAIL" : "OK"} ${mergedReq.method} ${mergedReq.url} -> ${response?.status}`,
          );
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: `${mergedReq.method} ${mergedReq.url}`,
            type: "request",
            status: hasFailed ? "failed" : "success",
            response: response!,
            testResults,
            duration: Math.round(elapsed),
            retryAttempts: maxRetries > 0 ? maxRetries : undefined,
          };
          if (hasFailed && !node.continueOnError) skipRest = true;
        } else if (node.type === "condition") {
          const response = lastResponse || { status: 0, body: "", headers: {} };
          const passed = safeEvalExpression(
            replaceVars(node.condition || "true"),
            { response, vars, h: TRANSFORM_HELPERS },
          );
          addLog(`${passed ? "PASS" : "FAIL"} Condition: ${node.condition}`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: `${passed ? "Pass" : "Fail"}: ${node.condition}`,
            type: "condition",
            status: passed ? "success" : "failed",
            duration: Math.round(performance.now() - start),
          };
          if (!passed && !node.continueOnError) skipRest = true;
        } else if (node.type === "delay") {
          const ms = node.delayMs || 1000;
          addLog(`⏳ Waiting ${ms}ms...`);
          await uiDelay(ms, `Delay: ${ms}ms`);
          addLog(`✓ Waited ${ms}ms`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: `${ms}ms`,
            type: "delay",
            status: "success",
            duration: ms,
          };
        } else if (node.type === "log") {
          const msg = replaceVars(node.logMessage || "");
          console.log("[flow]", msg);
          addLog(`Log: ${msg}`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: msg,
            type: "log",
            status: "success",
            duration: 0,
          };
        } else if (node.type === "set_variable") {
          const name = node.variableName || "var";
          let val: any = replaceVars(node.variableValue || "");
          try {
            const response = lastResponse || {
              status: 0,
              body: "",
              headers: {},
            };
            val = safeEvalExpression(val, {
              response,
              vars,
              h: TRANSFORM_HELPERS,
            });
          } catch {
            /* keep string */
          }
          vars[name] = val;
          addLog(`Set ${name} = ${JSON.stringify(val).slice(0, 60)}`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: `${name} = ${JSON.stringify(val).slice(0, 50)}`,
            type: "set_variable",
            status: "success",
            duration: Math.round(performance.now() - start),
            output: val,
          };
        } else if (node.type === "extract") {
          const response = lastResponse || { status: 0, body: "", headers: {} };
          let parsed = response.body;
          try {
            parsed = JSON.parse(response.body);
          } catch {
            parsed = response.body;
          }
          const val = safeEvalExpression(node.extractExpression || "null", {
            response,
            body: parsed,
            vars,
            h: TRANSFORM_HELPERS,
          });
          const target = node.extractTarget || "extracted";
          vars[target] = val;
          addLog(`Extract ${target} = ${JSON.stringify(val).slice(0, 60)}`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: `${target} = ${JSON.stringify(val).slice(0, 50)}`,
            type: "extract",
            status: "success",
            duration: Math.round(performance.now() - start),
            output: val,
          };
        } else if (node.type === "loop") {
          const count = node.loopCount || 1;
          addLog(`Loop x${count} started`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: `Loop x${count}`,
            type: "loop",
            status: "success",
            duration: 0,
          };
        } else if (node.type === "assert") {
          const response = lastResponse || { status: 0, body: "", headers: {} };
          const passed = safeEvalExpression(
            replaceVars(node.assertExpression || "true"),
            { response, vars, h: TRANSFORM_HELPERS },
          );
          const elapsed = performance.now() - start;
          if (!passed) {
            addLog(
              `FAIL Assert: ${node.assertMessage || node.assertExpression}`,
            );
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label:
                node.assertMessage || `Assert failed: ${node.assertExpression}`,
              type: "assert",
              status: "failed",
              duration: Math.round(elapsed),
              error: node.assertMessage,
            };
            if (!node.continueOnError) skipRest = true;
          } else {
            addLog(`PASS Assert: ${node.assertExpression}`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `Pass: ${node.assertExpression}`,
              type: "assert",
              status: "success",
              duration: Math.round(elapsed),
            };
          }
        } else if (node.type === "transform") {
          const response = lastResponse || { status: 0, body: "", headers: {} };
          let parsed: any = response.body;
          try {
            parsed = JSON.parse(response.body);
          } catch {
            parsed = response.body;
          }
          const val = safeEvalExpression(node.transformExpression || "null", {
            response,
            body: parsed,
            vars,
            h: TRANSFORM_HELPERS,
          });
          const target = node.transformTarget || "transformed";
          vars[target] = val;
          addLog(
            `Transform -> ${target} (${TRANSFORM_HELPERS.type(val)}${Array.isArray(val) ? ` [${val.length}]` : ""})`,
          );
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: `${target} = ${TRANSFORM_HELPERS.type(val)}`,
            type: "transform",
            status: "success",
            duration: Math.round(performance.now() - start),
            output: val,
          };
        } else if (node.type === "response_match") {
          const response = lastResponse || {
            status: 0,
            statusText: "",
            body: "",
            headers: {},
            size: 0,
            time: 0,
          };
          let parsed: any = response.body;
          try {
            parsed = JSON.parse(response.body);
          } catch {
            parsed = response.body;
          }
          const rules = node.matchRules || [];
          const mode = node.matchMode || "all";

          const evalOp = (
            actual: any,
            op: string,
            expected: string | undefined,
          ): boolean => {
            const exp = expected || "";
            switch (op) {
              case "equals":
                return String(actual) === exp;
              case "contains":
                return String(actual).includes(exp);
              case "matches":
                try {
                  return new RegExp(exp).test(String(actual));
                } catch {
                  return false;
                }
              case "exists":
                return actual !== undefined && actual !== null;
              case "not_exists":
                return actual === undefined || actual === null;
              case "gt":
                return Number(actual) > Number(exp);
              case "lt":
                return Number(actual) < Number(exp);
              default:
                return false;
            }
          };

          const getNestedVal = (obj: any, path: string): any =>
            path.split(".").reduce((o, k) => o?.[k], obj);

          const ruleResults = rules.map((rule) => {
            switch (rule.type) {
              case "status":
                return evalOp(response.status, rule.operator, rule.value);
              case "keyword":
                return (
                  typeof response.body === "string" &&
                  response.body.includes(rule.value || "")
                );
              case "key_value":
                return evalOp(
                  getNestedVal(parsed, rule.path || ""),
                  rule.operator,
                  rule.value,
                );
              case "regex":
                try {
                  return new RegExp(rule.value || "").test(response.body);
                } catch {
                  return false;
                }
              case "header":
                return evalOp(
                  response.headers[(rule.path || "").toLowerCase()],
                  rule.operator,
                  rule.value,
                );
              default:
                return false;
            }
          });

          const passed =
            rules.length === 0 ||
            (mode === "all"
              ? ruleResults.every(Boolean)
              : ruleResults.some(Boolean));
          const matchSummary = `${ruleResults.filter(Boolean).length}/${rules.length} rules matched`;
          addLog(`${passed ? "PASS" : "FAIL"} Response Match: ${matchSummary}`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: `${passed ? "Pass" : "Fail"}: ${matchSummary}`,
            type: "response_match",
            status: passed ? "success" : "failed",
            duration: Math.round(performance.now() - start),
          };
          if (!passed && !node.continueOnError) skipRest = true;
        } else if (node.type === "foreach") {
          const response = lastResponse || {
            status: 0,
            statusText: "",
            body: "",
            headers: {},
            size: 0,
            time: 0,
          };
          let parsed = response.body;
          try {
            parsed = JSON.parse(response.body);
          } catch {
            parsed = response.body;
          }
          const arr = safeEvalExpression(node.foreachExpression || "[]", {
            response,
            body: parsed,
            vars,
            h: TRANSFORM_HELPERS,
          });
          const varName = node.foreachVariable || "items";
          if (Array.isArray(arr)) {
            vars[varName] = arr;
            vars[`${varName}_length`] = arr.length;
            vars[`${varName}_current`] = arr[0];
            addLog(`ForEach ${varName}: ${arr.length} items extracted`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `${varName}: ${arr.length} items`,
              type: "foreach",
              status: "success",
              duration: Math.round(performance.now() - start),
              output: arr.length,
            };
          } else {
            throw new Error("foreach expression did not return an array");
          }
        } else if (node.type === "save_collection") {
          const name = replaceVars(node.saveCollectionName || "Flow Results");
          const response = lastResponse || {
            status: 0,
            statusText: "",
            body: "",
            headers: {},
            size: 0,
            time: 0,
          };
          const shouldSave = node.saveCondition
            ? safeEvalExpression(replaceVars(node.saveCondition), {
                response,
                vars,
                h: TRANSFORM_HELPERS,
              })
            : true;
          if (shouldSave && onSaveCollection) {
            const collectedRequests = runResults
              .filter((r) => r.type === "request" && r.response)
              .map((r) => {
                const req = allRequests.find(
                  (rq) => rq.url && r.label.includes(rq.url),
                );
                return (
                  req || {
                    id: crypto.randomUUID(),
                    name: r.label,
                    protocol: "rest" as const,
                    method: "GET" as const,
                    url: r.label,
                    params: [],
                    headers: [],
                    body: {
                      type: "none" as const,
                      raw: "",
                      formData: [],
                      graphql: { query: "", variables: "{}" },
                    },
                    auth: { type: "none" as const },
                    preScript: "",
                    postScript: "",
                    tests: "",
                  }
                );
              });
            onSaveCollection(name, collectedRequests);
            addLog(`Saved ${collectedRequests.length} requests to "${name}"`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `Saved -> ${name}`,
              type: "save_collection",
              status: "success",
              duration: Math.round(performance.now() - start),
            };
          } else if (!shouldSave) {
            addLog(`Save skipped (condition false)`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: "Save skipped",
              type: "save_collection",
              status: "skipped",
              duration: Math.round(performance.now() - start),
            };
          } else {
            addLog(`Save handler not available`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: "No save handler",
              type: "save_collection",
              status: "failed",
              duration: 0,
              error: "Save handler not configured",
            };
          }
        } else if (node.type === "group") {
          addLog(`Group: ${node.label}`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: node.label,
            type: "group",
            status: "success",
            duration: 0,
          };
        } else if (node.type === "switch_case") {
          const response = lastResponse || { status: 0, body: "", headers: {} };
          let parsed: any = response.body;
          try {
            parsed = JSON.parse(response.body);
          } catch {
            parsed = response.body;
          }
          const switchVal = String(
            safeEvalExpression(replaceVars(node.switchExpression || '""'), {
              response,
              body: parsed,
              vars,
              h: TRANSFORM_HELPERS,
            }),
          );
          const cases = node.switchCases || [];
          const matched = cases.find((c) => c.value === switchVal);
          if (matched) {
            addLog(`Switch matched case "${matched.label}" (${switchVal})`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `Match: ${matched.label}`,
              type: "switch_case",
              status: "success",
              duration: Math.round(performance.now() - start),
              output: switchVal,
            };
          } else {
            addLog(`Switch: no case matched for "${switchVal}", using default`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `Default (${switchVal})`,
              type: "switch_case",
              status: "success",
              duration: Math.round(performance.now() - start),
              output: switchVal,
            };
          }
          vars["__switchResult"] = switchVal;
          vars["__switchMatched"] = matched?.label || "default";
        } else if (node.type === "break_if") {
          const response = lastResponse || { status: 0, body: "", headers: {} };
          let parsed: any = response.body;
          try {
            parsed = JSON.parse(response.body);
          } catch {
            parsed = response.body;
          }
          const shouldBreak = safeEvalExpression(
            replaceVars(node.breakCondition || "false"),
            { response, body: parsed, vars, h: TRANSFORM_HELPERS },
          );
          if (shouldBreak) {
            addLog(`🛑 Break: ${node.breakMessage || node.breakCondition}`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `Break: ${node.breakMessage || "condition met"}`,
              type: "break_if",
              status: "failed",
              duration: Math.round(performance.now() - start),
            };
            skipRest = true;
          } else {
            addLog(`Continue: break condition false`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: "Continue (no break)",
              type: "break_if",
              status: "success",
              duration: Math.round(performance.now() - start),
            };
          }
        } else if (node.type === "counter") {
          const name = node.counterName || "counter";
          const action = node.counterAction || "increment";
          const step = node.counterStep || 1;
          if (vars[name] === undefined) vars[name] = node.counterInitial || 0;
          if (action === "increment") vars[name] = Number(vars[name]) + step;
          else if (action === "decrement")
            vars[name] = Number(vars[name]) - step;
          else if (action === "reset") vars[name] = node.counterInitial || 0;
          addLog(`Counter ${name} ${action} -> ${vars[name]}`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: `${name} = ${vars[name]}`,
            type: "counter",
            status: "success",
            duration: Math.round(performance.now() - start),
            output: vars[name],
          };
        } else if (node.type === "wait_until") {
          const timeout = node.waitTimeoutMs || 30000;
          const interval = node.waitIntervalMs || 2000;
          const condition = replaceVars(node.waitCondition || "true");
          let elapsed = 0;
          let condMet = false;
          addLog(`⏳ Wait until: ${condition} (timeout ${timeout}ms)`);
          while (elapsed < timeout) {
            const response = lastResponse || {
              status: 0,
              body: "",
              headers: {},
            };
            let parsed: any = response.body;
            try {
              parsed = JSON.parse(response.body);
            } catch {
              parsed = response.body;
            }
            condMet = !!safeEvalExpression(condition, {
              response,
              body: parsed,
              vars,
              h: TRANSFORM_HELPERS,
            });
            if (condMet) break;
            await uiDelay(
              Math.min(interval, timeout - elapsed),
              `Polling... ${Math.round((timeout - elapsed) / 1000)}s left`,
            );
            elapsed += interval;
          }
          if (condMet) {
            addLog(`✓ Wait condition met after ${elapsed}ms`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `Condition met (${elapsed}ms)`,
              type: "wait_until",
              status: "success",
              duration: elapsed,
            };
          } else {
            addLog(`✗ Wait timed out after ${timeout}ms`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `Timeout (${timeout}ms)`,
              type: "wait_until",
              status: "failed",
              duration: timeout,
              error: "Timeout",
            };
            if (!node.continueOnError) skipRest = true;
          }
        } else if (node.type === "schema_validate") {
          const response = lastResponse || { status: 0, body: "", headers: {} };
          let parsed: any = response.body;
          try {
            parsed = JSON.parse(response.body);
          } catch {
            parsed = response.body;
          }
          const target =
            node.schemaTarget === "body"
              ? parsed
              : safeEvalExpression(replaceVars(node.schemaTarget || "body"), {
                  response,
                  body: parsed,
                  vars,
                  h: TRANSFORM_HELPERS,
                });
          const schemaStr = node.schemaKeys || "";
          const rules = schemaStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const errors: string[] = [];
          for (const rule of rules) {
            const [key, expectedType] = rule.split(":").map((s) => s.trim());
            if (!key) continue;
            const val = target?.[key];
            if (val === undefined || val === null) {
              errors.push(`Missing "${key}"`);
            } else if (expectedType) {
              const actualType = Array.isArray(val) ? "array" : typeof val;
              if (actualType !== expectedType)
                errors.push(
                  `"${key}" is ${actualType}, expected ${expectedType}`,
                );
            }
          }
          if (errors.length === 0) {
            addLog(`✓ Schema valid: ${rules.length} fields checked`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `Schema valid (${rules.length} fields)`,
              type: "schema_validate",
              status: "success",
              duration: Math.round(performance.now() - start),
            };
          } else {
            addLog(`✗ Schema errors: ${errors.join(", ")}`);
            runResults[runResults.length - 1] = {
              nodeId: node.id,
              label: `Schema: ${errors.length} errors`,
              type: "schema_validate",
              status: "failed",
              duration: Math.round(performance.now() - start),
              error: errors.join("; "),
            };
            if (!node.continueOnError) skipRest = true;
          }
        } else if (node.type === "manage_collection") {
          const action = node.collectionAction || "create";
          const name = replaceVars(node.collectionName || "New Collection");
          const elapsed = performance.now() - start;

          if (action === "create") {
            if (onCreateCollection) {
              const id = onCreateCollection(name);
              vars["__lastCollectionId"] = id;
              addLog(`📁 Created collection "${name}" (${id})`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Created: ${name}`,
                type: "manage_collection",
                status: "success",
                duration: Math.round(elapsed),
                output: id,
              };
            } else {
              throw new Error("Collection management not available");
            }
          } else if (action === "add_request") {
            const collId = replaceVars(
              node.collectionName || vars["__lastCollectionId"] || "",
            );
            const targetCol = collections.find(
              (c) => c.id === collId || c.name === collId,
            );
            if (!targetCol) throw new Error(`Collection "${collId}" not found`);
            if (onAddRequestToCollection && lastResponse) {
              const reqData = node.collectionRequestData
                ? JSON.parse(replaceVars(node.collectionRequestData))
                : null;
              const newReq: RequestConfig = reqData || {
                id: crypto.randomUUID(),
                name: `Flow Request ${new Date().toLocaleTimeString()}`,
                protocol: "rest" as const,
                method: "GET" as HttpMethod,
                url: "",
                params: [],
                headers: [],
                body: {
                  type: "none" as BodyType,
                  raw: "",
                  formData: [],
                  graphql: { query: "", variables: "{}" },
                },
                auth: { type: "none" as const },
                preScript: "",
                postScript: "",
                tests: "",
                collectionId: targetCol.id,
              };
              onAddRequestToCollection(targetCol.id, newReq);
              addLog(`📁 Added request to "${targetCol.name}"`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Added to: ${targetCol.name}`,
                type: "manage_collection",
                status: "success",
                duration: Math.round(elapsed),
              };
            } else {
              throw new Error("Add request handler not available");
            }
          } else if (action === "delete_request") {
            const collId = replaceVars(node.collectionName || "");
            const targetCol = collections.find(
              (c) => c.id === collId || c.name === collId,
            );
            if (!targetCol) throw new Error(`Collection "${collId}" not found`);
            const reqId = replaceVars(node.collectionRequestData || "");
            if (onDeleteRequestFromCollection) {
              onDeleteRequestFromCollection(targetCol.id, reqId);
              addLog(`📁 Deleted request from "${targetCol.name}"`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Deleted from: ${targetCol.name}`,
                type: "manage_collection",
                status: "success",
                duration: Math.round(elapsed),
              };
            }
          } else if (action === "delete_collection") {
            const targetCol = collections.find(
              (c) => c.id === name || c.name === name,
            );
            if (targetCol && onDeleteCollection) {
              onDeleteCollection(targetCol.id);
              addLog(`📁 Deleted collection "${targetCol.name}"`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Deleted: ${targetCol.name}`,
                type: "manage_collection",
                status: "success",
                duration: Math.round(elapsed),
              };
            } else {
              throw new Error(`Collection "${name}" not found`);
            }
          } else if (action === "rename") {
            const oldName = replaceVars(node.collectionRequestData || "");
            const targetCol = collections.find(
              (c) => c.id === oldName || c.name === oldName,
            );
            if (targetCol && onRenameCollection) {
              onRenameCollection(targetCol.id, name);
              addLog(`📁 Renamed collection to "${name}"`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Renamed: ${name}`,
                type: "manage_collection",
                status: "success",
                duration: Math.round(elapsed),
              };
            } else {
              throw new Error(`Collection "${oldName}" not found`);
            }
          } else if (action === "update_request") {
            const collId = replaceVars(node.collectionName || "");
            const targetCol = collections.find(
              (c) => c.id === collId || c.name === collId,
            );
            if (!targetCol) throw new Error(`Collection "${collId}" not found`);
            const reqData = JSON.parse(
              replaceVars(node.collectionRequestData || "{}"),
            );
            if (onUpdateRequestInCollection) {
              onUpdateRequestInCollection(targetCol.id, reqData);
              addLog(`📁 Updated request in "${targetCol.name}"`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Updated in: ${targetCol.name}`,
                type: "manage_collection",
                status: "success",
                duration: Math.round(elapsed),
              };
            }
          }
        } else if (node.type === "manage_environment") {
          const action = node.envAction || "create";
          const name = replaceVars(node.envName || "New Environment");
          const elapsed = performance.now() - start;

          if (action === "create") {
            if (onCreateEnvironment) {
              const id = onCreateEnvironment(name);
              vars["__lastEnvId"] = id;
              addLog(`🌍 Created environment "${name}" (${id})`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Created: ${name}`,
                type: "manage_environment",
                status: "success",
                duration: Math.round(elapsed),
                output: id,
              };
            } else {
              throw new Error("Environment management not available");
            }
          } else if (action === "switch") {
            const targetEnv = activeEnv ? [activeEnv] : [];
            // Search all environments - we get them indirectly through the active env
            // The callback handles the actual switching
            if (onSwitchEnvironment) {
              onSwitchEnvironment(name); // Can be ID or name
              addLog(`🌍 Switched to environment "${name}"`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Switched: ${name}`,
                type: "manage_environment",
                status: "success",
                duration: Math.round(elapsed),
              };
            } else {
              throw new Error("Switch environment handler not available");
            }
          } else if (action === "set_var") {
            const key = replaceVars(node.envVarKey || "");
            let value = replaceVars(node.envVarValue || "");
            // Try to evaluate as expression
            try {
              const response = lastResponse || {
                status: 0,
                body: "",
                headers: {},
              };
              let parsed: any = response.body;
              try {
                parsed = JSON.parse(response.body);
              } catch {
                parsed = response.body;
              }
              value = String(
                safeEvalExpression(value, {
                  response,
                  body: parsed,
                  vars,
                  h: TRANSFORM_HELPERS,
                }),
              );
            } catch {
              /* keep string */
            }
            if (onSetEnvVariable) {
              onSetEnvVariable(null, key, value); // null = active env
              vars[key] = value; // Also update flow vars
              addLog(`🌍 Set env var ${key} = ${value.slice(0, 40)}`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Set: ${key}`,
                type: "manage_environment",
                status: "success",
                duration: Math.round(elapsed),
                output: value,
              };
            } else {
              throw new Error("Set env variable handler not available");
            }
          } else if (action === "remove_var") {
            const key = replaceVars(node.envVarKey || "");
            if (onRemoveEnvVariable) {
              onRemoveEnvVariable(null, key);
              delete vars[key];
              addLog(`🌍 Removed env var "${key}"`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Removed: ${key}`,
                type: "manage_environment",
                status: "success",
                duration: Math.round(elapsed),
              };
            }
          } else if (action === "delete") {
            if (onDeleteEnvironment) {
              onDeleteEnvironment(name);
              addLog(`🌍 Deleted environment "${name}"`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Deleted: ${name}`,
                type: "manage_environment",
                status: "success",
                duration: Math.round(elapsed),
              };
            }
          } else if (action === "rename") {
            const newName = replaceVars(node.envVarValue || name);
            if (onRenameEnvironment) {
              onRenameEnvironment(name, newName);
              addLog(`🌍 Renamed environment to "${newName}"`);
              runResults[runResults.length - 1] = {
                nodeId: node.id,
                label: `Renamed: ${newName}`,
                type: "manage_environment",
                status: "success",
                duration: Math.round(elapsed),
              };
            }
          }
        }
      } catch (e: any) {
        const elapsed = performance.now() - start;
        if (tryCatchActive && tryCatchNode) {
          addLog(`Caught error: ${e.message}`);
          if (
            tryCatchNode.catchAction === "set_variable" &&
            tryCatchNode.catchVariable
          ) {
            vars[tryCatchNode.catchVariable] = e.message;
          }
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: node.label,
            type: node.type,
            status: "failed",
            duration: Math.round(elapsed),
            error: `Caught: ${e.message}`,
          };
          tryCatchActive = false;
          tryCatchNode = null;
        } else {
          addLog(`Error: ${e.message}`);
          runResults[runResults.length - 1] = {
            nodeId: node.id,
            label: node.label,
            type: node.type,
            status: "failed",
            duration: Math.round(elapsed),
            error: e.message,
          };
          if (!node.continueOnError) skipRest = true;
        }
      }

      setResults([...runResults]);
      // Small delay between non-request steps for visual feedback (no blanket 5s)
      if (i < activeFlow.nodes.length - 1) {
        const isRequestNode =
          node.type === "request" || node.type === "http_request";
        // Request nodes already have built-in delays for script switching
        // Non-request nodes get a brief pause so user can see the result
        if (!isRequestNode) {
          addLog(`⏳ Next step...`);
          await uiDelay(2000, "Next step");
        } else {
          await uiDelay(1000, "Next step");
        }
      }
    }

    setActiveRunNodeId(null);
    setShowScriptsForNode(null);
    setActiveScriptTab(null);
    setDelayInfo(null);
    setRunning(false);
    runningFlowIdRef.current = null;
    const failed = runResults.filter((r) => r.status === "failed").length;
    const passed = runResults.filter((r) => r.status === "success").length;
    const skipped = runResults.filter((r) => r.status === "skipped").length;
    const totalDuration = runResults.reduce((s, r) => s + r.duration, 0);
    addLog(
      `\n-- Complete: ${passed} passed, ${failed} failed, ${skipped} skipped (${totalDuration}ms) --`,
    );

    // Save to history
    const historyEntry: FlowRunHistory = {
      id: crypto.randomUUID(),
      flowId: activeFlow.id,
      flowName: activeFlow.name,
      timestamp: Date.now(),
      results: runResults,
      duration: totalDuration,
      passed,
      failed,
      skipped,
    };
    const newHistory = [historyEntry, ...flowHistory].slice(0, 50);
    setFlowHistory(newHistory);
    try {
      localStorage.setItem("qf_flow_history", JSON.stringify(newHistory));
    } catch {
      /* Ignore storage quota errors. */
    }

    if (failed === 0)
      toast.success(
        `Flow complete: ${passed} steps passed (${totalDuration}ms)`,
      );
    else toast.error(`Flow: ${failed} failed, ${passed} passed`);
  };

  const getResultForNode = (nodeId: string) =>
    results.find((r) => r.nodeId === nodeId);

  const enabledCount = activeFlow?.nodes.filter((n) => !n.disabled).length || 0;
  const totalNodes = activeFlow?.nodes.length || 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Flow selector toolbar */}
      <div className="flex items-center gap-0 border-b border-border bg-surface-sunken shrink-0 h-[37px]">
        <div className="flex items-center gap-0 flex-1 overflow-x-auto min-w-0">
          {flows.map((f) => {
            const isFlowRunning = getExecState(f.id).running;
            return (
              <button
                key={f.id}
                onClick={() => {
                  setActiveFlowId(f.id);
                }}
                className={`group flex items-center gap-1 px-2 h-full text-[10px] font-bold border-r border-border transition-colors shrink-0 ${activeFlowId === f.id ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"}`}
              >
                {isFlowRunning ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
                ) : (
                  <Workflow className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate max-w-[60px]">{f.name}</span>
                {!isFlowRunning && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFlow(f.id);
                    }}
                    className="hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center shrink-0 h-full">
          <button
            onClick={addFlow}
            className="px-2 h-full text-muted-foreground hover:text-foreground transition-colors border-l border-border"
            title="New Flow"
          >
            <Plus className="h-3 w-3" />
          </button>
          {activeFlow && (
            <>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className={`px-2 h-full transition-colors border-l border-border ${showTemplates ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                title="Templates"
              >
                <Sparkles className="h-3 w-3" />
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-2 h-full transition-colors border-l border-border ${showHistory ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                title="History"
              >
                <Clock className="h-3 w-3" />
              </button>
              <button
                onClick={duplicateFlow}
                className="px-2 h-full text-muted-foreground hover:text-foreground transition-colors border-l border-border"
                title="Duplicate"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                onClick={exportFlow}
                className="px-2 h-full text-muted-foreground hover:text-foreground transition-colors border-l border-border"
                title="Export"
              >
                <Download className="h-3 w-3" />
              </button>
              <button
                onClick={importFlow}
                className="px-2 h-full text-muted-foreground hover:text-foreground transition-colors border-l border-border"
                title="Import"
              >
                <Upload className="h-3 w-3" />
              </button>
              <button
                onClick={runFlow}
                disabled={running || enabledCount === 0}
                className="flex items-center gap-1 px-3 h-full text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {running ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {running ? "Running" : "Run"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Templates panel */}
      {showTemplates && (
        <div className="border-b border-border bg-surface-sunken overflow-hidden shrink-0">
          <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Flow Templates
              </span>
            </div>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-muted-foreground hover:text-foreground"
              title="Close templates"
              aria-label="Close templates"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-0">
            {FLOW_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t)}
                className="flex items-start gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
              >
                <t.icon className={`h-3.5 w-3.5 ${t.color} shrink-0 mt-0.5`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-foreground">
                    {t.name}
                  </p>
                  <p className="text-[8px] text-muted-foreground/60 leading-tight">
                    {t.desc}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[7px] font-bold text-muted-foreground/40 bg-accent/50 px-1 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Plus className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Execution History panel */}
      {showHistory && (
        <div className="border-b border-border bg-surface-sunken overflow-auto max-h-[300px] shrink-0">
          <div className="px-2 py-1.5 border-b border-border flex items-center justify-between sticky top-0 bg-surface-sunken z-10">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Run History
              </span>
              <span className="text-[8px] text-muted-foreground/40">
                {flowHistory.length} runs
              </span>
            </div>
            <div className="flex items-center gap-1">
              {flowHistory.length > 0 && (
                <button
                  onClick={() => {
                    setFlowHistory([]);
                    localStorage.removeItem("qf_flow_history");
                  }}
                  className="text-[8px] font-bold text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setShowHistory(false)}
                className="text-muted-foreground hover:text-foreground"
                title="Close history"
                aria-label="Close history"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
            </div>
          </div>
          {flowHistory.length === 0 ? (
            <div className="px-3 py-4 text-center text-[9px] text-muted-foreground/40">
              No runs yet. Execute a flow to see history.
            </div>
          ) : (
            <div>
              {flowHistory.map((h, i) => (
                <div
                  key={h.id}
                  className="flex items-center gap-2 px-2 py-1.5 border-b border-border text-[9px] hover:bg-accent/30"
                >
                  <span className="text-[8px] text-muted-foreground/30 w-4 text-right shrink-0">
                    {flowHistory.length - i}
                  </span>
                  <span className="font-bold text-foreground truncate flex-1">
                    {h.flowName}
                  </span>
                  <span className="flex items-center gap-0.5 text-status-success">
                    <CircleCheck className="h-2.5 w-2.5" />
                    {h.passed}
                  </span>
                  {h.failed > 0 && (
                    <span className="flex items-center gap-0.5 text-destructive">
                      <XCircle className="h-2.5 w-2.5" />
                      {h.failed}
                    </span>
                  )}
                  {h.skipped > 0 && (
                    <span className="flex items-center gap-0.5 text-muted-foreground">
                      <SkipForward className="h-2.5 w-2.5" />
                      {h.skipped}
                    </span>
                  )}
                  <span className="text-muted-foreground/40 shrink-0">
                    {h.duration}ms
                  </span>
                  <span className="text-[8px] text-muted-foreground/30 shrink-0">
                    {new Date(h.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flow content */}
      <div className="flex-1 overflow-auto min-h-0">
        {activeFlow && (
          <>
            {/* Flow info + settings bar */}
            <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-surface-sunken">
              <input
                value={activeFlow.name}
                onChange={(e) =>
                  updateFlow((f) => ({ ...f, name: e.target.value }))
                }
                aria-label="Flow name"
                title="Flow name"
                placeholder="Flow name"
                className="text-[10px] font-bold bg-transparent focus:outline-none text-foreground flex-1 min-w-0"
              />
              <span className="text-[8px] text-muted-foreground/40 font-bold shrink-0">
                {enabledCount}/{totalNodes} steps
              </span>
              <button
                onClick={() => setShowFlowVars(!showFlowVars)}
                className={`p-1 transition-colors ${showFlowVars ? "text-primary" : "text-muted-foreground/40 hover:text-foreground"}`}
                title="Flow Variables"
              >
                <Variable className="h-3 w-3" />
              </button>
              <button
                onClick={() => setShowFlowSettings(!showFlowSettings)}
                className={`p-1 transition-colors ${showFlowSettings ? "text-primary" : "text-muted-foreground/40 hover:text-foreground"}`}
                title="Settings"
              >
                <Wrench className="h-3 w-3" />
              </button>
            </div>

            {/* Flow-level variables */}
            {showFlowVars && (
              <div className="border-b border-border bg-surface-sunken px-2 py-1.5 space-y-1">
                <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                  Flow Variables
                </p>
                <p className="text-[8px] text-muted-foreground/30">
                  Pre-populated before execution. Override env vars.
                </p>
                {Object.entries(activeFlow.variables || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1">
                    <input
                      value={k}
                      onChange={(e) => {
                        const newVars = { ...activeFlow.variables };
                        delete newVars[k];
                        newVars[e.target.value] = v;
                        updateFlow((f) => ({ ...f, variables: newVars }));
                      }}
                      className="w-1/3 h-6 px-1.5 text-[9px] font-mono bg-background border border-border focus:outline-none focus:border-primary text-foreground"
                      placeholder="key"
                    />
                    <span className="text-[9px] text-muted-foreground">=</span>
                    <input
                      value={v}
                      onChange={(e) =>
                        updateFlow((f) => ({
                          ...f,
                          variables: { ...f.variables, [k]: e.target.value },
                        }))
                      }
                      className="flex-1 h-6 px-1.5 text-[9px] font-mono bg-background border border-border focus:outline-none focus:border-primary text-foreground"
                      placeholder="value"
                    />
                    <button
                      onClick={() => {
                        const newVars = { ...activeFlow.variables };
                        delete newVars[k];
                        updateFlow((f) => ({ ...f, variables: newVars }));
                      }}
                      title="Remove variable"
                      aria-label="Remove variable"
                      className="p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    updateFlow((f) => ({
                      ...f,
                      variables: {
                        ...f.variables,
                        [`var${Object.keys(f.variables || {}).length + 1}`]: "",
                      },
                    }))
                  }
                  className="text-[9px] font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  + Add Variable
                </button>
              </div>
            )}

            {/* Flow description */}
            {showFlowSettings && (
              <div className="border-b border-border bg-surface-sunken px-2 py-1.5 space-y-1">
                <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                  Description
                </p>
                <textarea
                  value={activeFlow.description || ""}
                  onChange={(e) =>
                    updateFlow((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Describe what this flow does..."
                  className="w-full h-12 px-1.5 py-1 text-[9px] font-mono bg-background border border-border focus:outline-none focus:border-primary text-foreground resize-none placeholder:text-muted-foreground/20"
                />
              </div>
            )}

            {/* Nodes */}
            <div className="p-2 space-y-0">
              {activeFlow.nodes.map((node, idx) => {
                const result = getResultForNode(node.id);
                const isExpanded = expandedNodes.has(node.id);
                const isActiveRun = activeRunNodeId === node.id;
                const forceShowScripts = showScriptsForNode === node.id;
                return (
                  <React.Fragment key={node.id}>
                    <div data-node-id={node.id}>
                      <FlowNodeCard
                        node={node}
                        result={result}
                        allRequests={allRequests}
                        tabs={tabs}
                        collections={collections}
                        isExpanded={isExpanded}
                        isActiveRun={isActiveRun}
                        forceShowScripts={forceShowScripts}
                        activeScriptTab={isActiveRun ? activeScriptTab : null}
                        delayInfo={isActiveRun ? delayInfo : null}
                        onToggleExpand={() => toggleNodeExpand(node.id)}
                        onUpdate={(updates) => updateNode(node.id, updates)}
                        onRemove={() => removeNode(node.id)}
                        onMoveUp={() => moveNode(node.id, "up")}
                        onMoveDown={() => moveNode(node.id, "down")}
                        onDuplicate={() => duplicateNode(node.id)}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < activeFlow.nodes.length - 1}
                      />
                    </div>
                    {idx < activeFlow.nodes.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowDown className="h-3 w-3 text-muted-foreground/20" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Add step */}
            <div className="px-2 pb-3">
              {activeFlow.nodes.length > 0 && (
                <div className="flex justify-center py-0.5 mb-1">
                  <ArrowDown className="h-3 w-3 text-muted-foreground/20" />
                </div>
              )}
              {showAddNode ? (
                <div className="border border-border bg-surface-sunken overflow-hidden">
                  <div className="px-2 py-1 border-b border-border flex items-center justify-between">
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                      Add Step
                    </p>
                    <button
                      onClick={() => setShowAddNode(false)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Close add step"
                      aria-label="Close add step"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                  </div>
                  {NODE_CATEGORIES.map((cat) => {
                    const items = NODE_TYPES.filter((n) => n.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat}>
                        <div className="px-2 py-0.5 bg-background/50">
                          <span className="text-[7px] font-extrabold text-muted-foreground/30 uppercase tracking-widest">
                            {cat}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-0">
                          {items.map((nt) => (
                            <button
                              key={nt.value}
                              onClick={() => addNode(nt.value)}
                              className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold hover:bg-accent transition-colors border-b border-r border-border text-left"
                            >
                              <nt.icon
                                className={`h-3 w-3 ${nt.color} shrink-0`}
                              />
                              <div className="min-w-0">
                                <p className="text-foreground">{nt.label}</p>
                                <p className="text-[8px] text-muted-foreground/50 font-normal">
                                  {nt.desc}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <button
                  onClick={() => setShowAddNode(true)}
                  className="w-full flex items-center justify-center gap-1 py-2 border border-dashed border-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Step
                </button>
              )}
            </div>

            {/* Execution log */}
            {executionLog.length > 0 && (
              <div className="border-t border-border">
                <div className="px-2 py-1 bg-surface-sunken border-b border-border flex items-center justify-between">
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                    Execution Log
                  </p>
                  <button
                    onClick={() => setExecutionLog([])}
                    className="text-[8px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-[120px] overflow-y-auto bg-background">
                  {executionLog.map((line, i) => (
                    <p
                      key={i}
                      className="px-2 py-0.5 text-[9px] font-mono text-foreground/70 border-b border-border"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Results summary */}
            {results.length > 0 && (
              <div className="border-t border-border">
                <div className="px-2 py-1.5 bg-surface-sunken border-b border-border flex items-center justify-between">
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                    Results
                  </p>
                  <div className="flex items-center gap-2 text-[9px] font-bold">
                    <span className="flex items-center gap-0.5 text-status-success">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {results.filter((r) => r.status === "success").length}
                    </span>
                    {results.filter((r) => r.status === "failed").length >
                      0 && (
                      <span className="flex items-center gap-0.5 text-destructive">
                        <XCircle className="h-2.5 w-2.5" />
                        {results.filter((r) => r.status === "failed").length}
                      </span>
                    )}
                    {results.filter((r) => r.status === "skipped").length >
                      0 && (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <SkipForward className="h-2.5 w-2.5" />
                        {results.filter((r) => r.status === "skipped").length}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {results.reduce((s, r) => s + r.duration, 0)}ms
                    </span>
                  </div>
                </div>
                <div>
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2 py-1 border-b border-border text-[10px] min-w-0"
                    >
                      {r.status === "success" && (
                        <CircleCheck className="h-3 w-3 text-status-success shrink-0" />
                      )}
                      {r.status === "failed" && (
                        <XCircle className="h-3 w-3 text-destructive shrink-0" />
                      )}
                      {r.status === "skipped" && (
                        <SkipForward className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                      )}
                      {r.status === "running" && (
                        <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
                      )}
                      <span className="font-bold text-foreground truncate flex-1 min-w-0">
                        {r.label}
                      </span>
                      {r.retryAttempts && (
                        <RotateCcw className="h-2.5 w-2.5 text-method-put shrink-0" />
                      )}
                      {r.duration > 0 && (
                        <span className="text-[9px] text-muted-foreground shrink-0">
                          {r.duration}ms
                        </span>
                      )}
                      {r.response && (
                        <span
                          className={`text-[9px] font-bold shrink-0 ${r.response.status < 400 ? "text-status-success" : "text-destructive"}`}
                        >
                          {r.response.status}
                        </span>
                      )}
                      {r.error && (
                        <span
                          className="text-[9px] text-destructive truncate max-w-[100px] shrink-0"
                          title={r.error}
                        >
                          {r.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Flow Node Card ────────────────────────────────────────────────────
function FlowNodeCard({
  node,
  result,
  allRequests,
  tabs,
  collections,
  isExpanded,
  isActiveRun,
  forceShowScripts,
  activeScriptTab,
  delayInfo,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  canMoveUp,
  canMoveDown,
}: {
  node: FlowNode;
  result?: FlowRunResult;
  allRequests: RequestConfig[];
  tabs: RequestConfig[];
  collections: Collection[];
  isExpanded: boolean;
  isActiveRun?: boolean;
  forceShowScripts?: boolean;
  activeScriptTab?: "pre" | "post" | "test" | null;
  delayInfo?: { label: string; remaining: number; total: number } | null;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<FlowNode>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [showScripts, setShowScripts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const scriptsVisible = showScripts || forceShowScripts;

  const statusColor = isActiveRun
    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
    : result?.status === "success"
      ? "border-status-success/40 bg-status-success/5"
      : result?.status === "failed"
        ? "border-destructive/40 bg-destructive/5"
        : result?.status === "running"
          ? "border-primary/40 bg-primary/5"
          : result?.status === "skipped"
            ? "border-muted-foreground/20 bg-muted/30 opacity-50"
            : "border-border";

  const nodeType =
    NODE_TYPES.find((nt) => nt.value === node.type) || NODE_TYPES[0];
  const hasScripts = !!(node.preScript || node.postScript || node.testScript);

  const getProtocolIcon = (protocol: string) => {
    switch (protocol) {
      case "graphql":
        return "GQL";
      case "websocket":
        return "WS";
      case "sse":
        return "SSE";
      case "socketio":
        return "SIO";
      case "soap":
        return "SOAP";
      default:
        return "REST";
    }
  };

  return (
    <div
      className={`border ${statusColor} transition-colors overflow-hidden ${node.disabled ? "opacity-40" : ""}`}
    >
      {/* Delay countdown chip */}
      {delayInfo && isActiveRun && (
        <div className="px-2 py-1.5 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
          <Timer className="h-3 w-3 text-primary animate-pulse shrink-0" />
          <span className="text-[9px] font-bold text-primary">
            {delayInfo.label}
          </span>
          <div className="flex-1 h-1.5 bg-primary/10 rounded-full overflow-hidden">
            <progress
              className="h-full w-full align-top [&::-webkit-progress-bar]:bg-primary/10 [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
              value={Math.max(
                0,
                100 - (delayInfo.remaining / delayInfo.total) * 100,
              )}
              max={100}
            />
          </div>
          <span className="text-[9px] font-mono text-primary/70 shrink-0">
            {(delayInfo.remaining / 1000).toFixed(1)}s
          </span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-sunken border-b border-border min-w-0">
        <button
          onClick={onToggleExpand}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title={isExpanded ? "Collapse node" : "Expand node"}
          aria-label={isExpanded ? "Collapse node" : "Expand node"}
        >
          {isExpanded ? (
            <ChevronUp className="h-2.5 w-2.5" />
          ) : (
            <ChevronDown className="h-2.5 w-2.5" />
          )}
        </button>
        <nodeType.icon className={`h-3 w-3 ${nodeType.color} shrink-0`} />
        <input
          value={node.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          aria-label="Step label"
          title="Step label"
          placeholder="Step label"
          className="flex-1 text-[10px] font-bold bg-transparent focus:outline-none text-foreground min-w-0 truncate"
        />
        {result?.status === "running" && (
          <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
        )}
        {result?.status === "success" && (
          <CircleCheck className="h-3 w-3 text-status-success shrink-0" />
        )}
        {result?.status === "failed" && (
          <XCircle className="h-3 w-3 text-destructive shrink-0" />
        )}
        {result?.status === "skipped" && (
          <SkipForward className="h-3 w-3 text-muted-foreground/30 shrink-0" />
        )}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => onUpdate({ disabled: !node.disabled })}
            className={`p-0.5 transition-colors ${node.disabled ? "text-destructive" : "text-muted-foreground/30 hover:text-foreground"}`}
            title={node.disabled ? "Enable" : "Disable"}
          >
            {node.disabled ? (
              <PowerOff className="h-2.5 w-2.5" />
            ) : (
              <Power className="h-2.5 w-2.5" />
            )}
          </button>
          {canMoveUp && (
            <button
              onClick={onMoveUp}
              className="p-0.5 text-muted-foreground hover:text-foreground"
              title="Move step up"
              aria-label="Move step up"
            >
              <ChevronUp className="h-2.5 w-2.5" />
            </button>
          )}
          {canMoveDown && (
            <button
              onClick={onMoveDown}
              className="p-0.5 text-muted-foreground hover:text-foreground"
              title="Move step down"
              aria-label="Move step down"
            >
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          )}
          <button
            onClick={onDuplicate}
            className="p-0.5 text-muted-foreground hover:text-foreground"
            title="Duplicate"
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
          {node.type === "request" && (
            <button
              onClick={() => setShowScripts(!showScripts)}
              className={`p-0.5 transition-colors ${hasScripts ? "text-primary" : "text-muted-foreground/40 hover:text-foreground"}`}
              title="Scripts"
            >
              <Code className="h-2.5 w-2.5" />
            </button>
          )}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-0.5 transition-colors ${node.notes ? "text-method-put" : "text-muted-foreground/40 hover:text-foreground"}`}
            title="Notes"
          >
            <StickyNote className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-0.5 text-muted-foreground hover:text-destructive"
            title="Remove step"
            aria-label="Remove step"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Notes */}
      {showNotes && (
        <div className="px-2 py-1 border-b border-border bg-method-put/5">
          <textarea
            value={node.notes || ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Add notes..."
            className="w-full h-8 text-[9px] font-mono bg-transparent focus:outline-none resize-none text-foreground placeholder:text-muted-foreground/20"
          />
        </div>
      )}

      {/* Expanded body */}
      {isExpanded && (
        <div className="px-2 py-1.5 space-y-1.5">
          {(node.type === "request" || node.type === "http_request") && (
            <>
              <div className="relative">
                <select
                  value={node.requestId || ""}
                  onChange={(e) =>
                    onUpdate({
                      requestId: e.target.value,
                      httpUrl: e.target.value ? "" : node.httpUrl,
                    })
                  }
                  title="Select request source"
                  aria-label="Select request source"
                  className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground appearance-none pr-6 cursor-pointer"
                >
                  <option value="">— Use inline URL below —</option>
                  {tabs.length > 0 && (
                    <optgroup label="Open Tabs">
                      {tabs.map((t) => (
                        <option key={t.id} value={t.id}>
                          [{getProtocolIcon(t.protocol)}] {t.method}{" "}
                          {t.url || t.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {collections
                    .filter((c) => c.requests.length > 0)
                    .map((c) => (
                      <optgroup key={c.id} label={c.name}>
                        {c.requests.map((r) => (
                          <option key={r.id} value={r.id}>
                            [{getProtocolIcon(r.protocol)}] {r.method}{" "}
                            {r.url || r.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground pointer-events-none" />
              </div>
              {/* Inline URL for self-contained flows (templates, examples) */}
              {!node.requestId && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <select
                      value={node.httpMethod || "GET"}
                      onChange={(e) =>
                        onUpdate({ httpMethod: e.target.value as HttpMethod })
                      }
                      title="HTTP method"
                      aria-label="HTTP method"
                      className="h-7 px-1.5 text-[9px] font-bold bg-surface-sunken border border-border text-foreground focus:outline-none focus:border-primary w-[70px]"
                    >
                      {[
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS",
                        "HEAD",
                      ].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      value={node.httpUrl || ""}
                      onChange={(e) => onUpdate({ httpUrl: e.target.value })}
                      placeholder="https://api.example.com/endpoint  or  {{baseUrl}}/path"
                      className="flex-1 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                    />
                  </div>
                  <p className="text-[8px] text-muted-foreground/40">
                    Inline URL — supports{" "}
                    <code className="text-primary/70">{"{{vars}}"}</code>. Or
                    select a tab/collection above.
                  </p>
                </div>
              )}
              {node.requestId &&
                (() => {
                  const sel = allRequests.find((r) => r.id === node.requestId);
                  if (!sel) return null;
                  const proto = sel.protocol;
                  const protoLabel = getProtocolIcon(proto);
                  const isRealtime = ["websocket", "sse", "socketio"].includes(
                    proto,
                  );
                  return (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[8px] font-extrabold px-1.5 py-0.5 ${isRealtime ? "bg-method-put/10 text-method-put" : proto === "graphql" ? "bg-method-post/10 text-method-post" : "bg-primary/10 text-primary"}`}
                      >
                        {protoLabel}
                      </span>
                      {isRealtime && (
                        <span className="text-[8px] text-muted-foreground/50">
                          Executes as HTTP in flow context
                        </span>
                      )}
                    </div>
                  );
                })()}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!node.continueOnError}
                    onChange={(e) =>
                      onUpdate({ continueOnError: e.target.checked })
                    }
                    className="w-3 h-3 accent-primary"
                  />
                  Continue on error
                </label>
                <div className="flex items-center gap-1">
                  <RotateCcw className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">
                    Retry:
                  </span>
                  <input
                    type="number"
                    value={node.retryCount || 0}
                    onChange={(e) =>
                      onUpdate({ retryCount: parseInt(e.target.value) || 0 })
                    }
                    title="Retry count"
                    aria-label="Retry count"
                    className="w-10 h-5 px-1 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none text-foreground text-center"
                    min="0"
                    max="10"
                  />
                  {(node.retryCount || 0) > 0 && (
                    <>
                      <span className="text-[9px] text-muted-foreground">
                        delay:
                      </span>
                      <input
                        type="number"
                        value={node.retryDelayMs || 1000}
                        onChange={(e) =>
                          onUpdate({
                            retryDelayMs: parseInt(e.target.value) || 1000,
                          })
                        }
                        title="Retry delay in milliseconds"
                        aria-label="Retry delay in milliseconds"
                        className="w-14 h-5 px-1 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none text-foreground text-center"
                        min="0"
                      />
                      <span className="text-[8px] text-muted-foreground">
                        ms
                      </span>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {node.type === "condition" && (
            <>
              <input
                value={node.condition || ""}
                onChange={(e) => onUpdate({ condition: e.target.value })}
                placeholder="response.status === 200"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <p className="text-[8px] text-muted-foreground/40">
                JS expression. Access:{" "}
                <code className="text-primary/70">response</code>,{" "}
                <code className="text-primary/70">vars</code>,{" "}
                <code className="text-primary/70">h.*</code>
              </p>
              <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!node.continueOnError}
                  onChange={(e) =>
                    onUpdate({ continueOnError: e.target.checked })
                  }
                  className="w-3 h-3 accent-primary"
                />
                Continue on false
              </label>
            </>
          )}

          {node.type === "delay" && (
            <div className="flex items-center gap-2">
              <Timer className="h-3 w-3 text-muted-foreground shrink-0" />
              <input
                type="number"
                value={node.delayMs || 1000}
                onChange={(e) =>
                  onUpdate({ delayMs: parseInt(e.target.value) || 0 })
                }
                title="Delay in milliseconds"
                aria-label="Delay in milliseconds"
                className="w-20 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground"
              />
              <span className="text-[9px] text-muted-foreground font-bold">
                ms
              </span>
            </div>
          )}

          {node.type === "log" && (
            <>
              <input
                value={node.logMessage || ""}
                onChange={(e) => onUpdate({ logMessage: e.target.value })}
                placeholder="Log message... Use {{var}} for variables"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <p className="text-[8px] text-muted-foreground/40">
                Outputs to console + execution log. Supports{" "}
                <code className="text-primary/70">{"{{var}}"}</code>
              </p>
            </>
          )}

          {node.type === "set_variable" && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <input
                  value={node.variableName || ""}
                  onChange={(e) => onUpdate({ variableName: e.target.value })}
                  placeholder="variableName"
                  className="w-1/3 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                />
                <span className="text-[10px] text-muted-foreground font-bold">
                  =
                </span>
                <input
                  value={node.variableValue || ""}
                  onChange={(e) => onUpdate({ variableValue: e.target.value })}
                  placeholder="value or expression"
                  className="flex-1 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
              <p className="text-[8px] text-muted-foreground/40">
                Static string or JS:{" "}
                <code className="text-primary/70">response.body.id</code>,{" "}
                <code className="text-primary/70">vars.token</code>
              </p>
            </div>
          )}

          {node.type === "extract" && (
            <div className="space-y-1">
              <input
                value={node.extractExpression || ""}
                onChange={(e) =>
                  onUpdate({ extractExpression: e.target.value })
                }
                placeholder="body.data.token"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  value={node.extractTarget || ""}
                  onChange={(e) => onUpdate({ extractTarget: e.target.value })}
                  placeholder="variableName"
                  className="flex-1 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
              <p className="text-[8px] text-muted-foreground/40">
                Access: <code className="text-primary/70">response</code>,{" "}
                <code className="text-primary/70">body</code> (parsed),{" "}
                <code className="text-primary/70">vars</code>,{" "}
                <code className="text-primary/70">h.*</code>
              </p>
            </div>
          )}

          {node.type === "loop" && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  type="number"
                  value={node.loopCount || 1}
                  onChange={(e) =>
                    onUpdate({ loopCount: parseInt(e.target.value) || 1 })
                  }
                  title="Loop iterations"
                  aria-label="Loop iterations"
                  className="w-20 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground"
                  min="1"
                />
                <span className="text-[9px] text-muted-foreground font-bold">
                  iterations
                </span>
              </div>
              <p className="text-[8px] text-muted-foreground/40">
                <code className="text-primary/70">vars.loopIndex</code>{" "}
                available during execution.
              </p>
            </div>
          )}

          {node.type === "assert" && (
            <div className="space-y-1">
              <input
                value={node.assertExpression || ""}
                onChange={(e) => onUpdate({ assertExpression: e.target.value })}
                placeholder="response.status === 200"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <input
                value={node.assertMessage || ""}
                onChange={(e) => onUpdate({ assertMessage: e.target.value })}
                placeholder="Error message on failure"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!node.continueOnError}
                  onChange={(e) =>
                    onUpdate({ continueOnError: e.target.checked })
                  }
                  className="w-3 h-3 accent-primary"
                />
                Continue flow on assertion failure
              </label>
            </div>
          )}

          {node.type === "transform" && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1">
                <p className="text-[8px] font-bold text-muted-foreground/40 uppercase w-full">
                  Quick insert
                </p>
                {TRANSFORM_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => onUpdate({ transformExpression: p.expr })}
                    className="px-1.5 py-0.5 text-[8px] font-mono bg-accent/50 hover:bg-accent text-foreground transition-colors"
                    title={p.desc}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                value={node.transformExpression || ""}
                onChange={(e) =>
                  onUpdate({ transformExpression: e.target.value })
                }
                placeholder="h.pick(body, 'id', 'name')  |  h.pluck(body.items, 'email')  |  body.data.filter(x => x.active)"
                className="w-full h-20 px-2 py-1 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground resize-y placeholder:text-muted-foreground/30"
              />
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  value={node.transformTarget || ""}
                  onChange={(e) =>
                    onUpdate({ transformTarget: e.target.value })
                  }
                  placeholder="variableName"
                  className="flex-1 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
              <details className="text-[8px] text-muted-foreground/40">
                <summary className="cursor-pointer hover:text-foreground font-bold">
                  Available helpers (h.*)
                </summary>
                <div className="mt-1 space-y-0.5 font-mono text-[8px]">
                  <p>
                    <code className="text-primary/70">
                      h.pick(obj, ...keys)
                    </code>{" "}
                    |{" "}
                    <code className="text-primary/70">
                      h.omit(obj, ...keys)
                    </code>{" "}
                    — Keep/remove keys
                  </p>
                  <p>
                    <code className="text-primary/70">h.pluck(arr, key)</code> |{" "}
                    <code className="text-primary/70">
                      h.where(arr, key, val)
                    </code>{" "}
                    — Array field ops
                  </p>
                  <p>
                    <code className="text-primary/70">h.groupBy(arr, key)</code>{" "}
                    |{" "}
                    <code className="text-primary/70">
                      h.sortBy(arr, key, desc?)
                    </code>{" "}
                    — Organize
                  </p>
                  <p>
                    <code className="text-primary/70">h.unique(arr)</code> |{" "}
                    <code className="text-primary/70">h.flatten(arr)</code> |{" "}
                    <code className="text-primary/70">h.compact(arr)</code> |{" "}
                    <code className="text-primary/70">h.chunk(arr, n)</code>
                  </p>
                  <p>
                    <code className="text-primary/70">h.merge(...objs)</code> |{" "}
                    <code className="text-primary/70">h.deepMerge(a, b)</code>
                  </p>
                  <p>
                    <code className="text-primary/70">
                      h.sum/avg/min/max/count(arr)
                    </code>{" "}
                    — Aggregation
                  </p>
                  <p>
                    <code className="text-primary/70">
                      h.keys/values/entries(obj)
                    </code>{" "}
                    | <code className="text-primary/70">h.size(val)</code> |{" "}
                    <code className="text-primary/70">h.type(val)</code>
                  </p>
                  <p>
                    <code className="text-primary/70">
                      h.upper/lower/trim/split/join/replace(str)
                    </code>{" "}
                    — Strings
                  </p>
                  <p>
                    <code className="text-primary/70">h.base64(str)</code> |{" "}
                    <code className="text-primary/70">h.base64Decode(str)</code>{" "}
                    |{" "}
                    <code className="text-primary/70">
                      h.toNum/toStr/toBool
                    </code>
                  </p>
                  <p>
                    <code className="text-primary/70">
                      h.jsonPath(obj, 'a.b[0].c')
                    </code>{" "}
                    |{" "}
                    <code className="text-primary/70">
                      h.template(str, data)
                    </code>
                  </p>
                  <p>
                    <code className="text-primary/70">h.timestamp()</code> |{" "}
                    <code className="text-primary/70">h.isoDate()</code> |{" "}
                    <code className="text-primary/70">h.range(start, end)</code>
                  </p>
                  <p>
                    <code className="text-primary/70">h.diff(a, b)</code> |{" "}
                    <code className="text-primary/70">h.intersect(a, b)</code> |{" "}
                    <code className="text-primary/70">h.zip(a, b)</code>
                  </p>
                  <p>
                    Also access:{" "}
                    <code className="text-primary/70">response</code>,{" "}
                    <code className="text-primary/70">body</code> (parsed JSON),{" "}
                    <code className="text-primary/70">vars</code>
                  </p>
                </div>
              </details>
            </div>
          )}

          {node.type === "try_catch" && (
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground">
                Catches errors from subsequent steps until next Try/Catch or
                end.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground">
                  On catch:
                </span>
                <select
                  value={node.catchAction || "log"}
                  onChange={(e) =>
                    onUpdate({ catchAction: e.target.value as any })
                  }
                  title="Try/catch action"
                  aria-label="Try/catch action"
                  className="h-6 px-1.5 text-[9px] bg-surface-sunken border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="log">Log error</option>
                  <option value="skip">Skip to next</option>
                  <option value="set_variable">Set variable</option>
                </select>
                {node.catchAction === "set_variable" && (
                  <input
                    value={node.catchVariable || ""}
                    onChange={(e) =>
                      onUpdate({ catchVariable: e.target.value })
                    }
                    placeholder="errorVar"
                    className="w-24 h-6 px-1.5 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                  />
                )}
              </div>
            </div>
          )}

          {node.type === "response_match" && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground">Mode:</span>
                <select
                  value={node.matchMode || "all"}
                  onChange={(e) =>
                    onUpdate({ matchMode: e.target.value as any })
                  }
                  title="Response match mode"
                  aria-label="Response match mode"
                  className="h-6 px-1.5 text-[9px] bg-surface-sunken border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="all">ALL rules must match</option>
                  <option value="any">ANY rule can match</option>
                </select>
              </div>
              {(node.matchRules || []).map((rule, ri) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-1 flex-wrap border border-border p-1 bg-surface-sunken"
                >
                  <select
                    value={rule.type}
                    onChange={(e) => {
                      const rules = [...(node.matchRules || [])];
                      rules[ri] = { ...rule, type: e.target.value as any };
                      onUpdate({ matchRules: rules });
                    }}
                    title="Match rule type"
                    aria-label="Match rule type"
                    className="h-5 px-1 text-[9px] bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="status">Status</option>
                    <option value="keyword">Keyword</option>
                    <option value="key_value">Key:Value</option>
                    <option value="regex">Regex</option>
                    <option value="header">Header</option>
                  </select>
                  {(rule.type === "key_value" || rule.type === "header") && (
                    <input
                      value={rule.path || ""}
                      onChange={(e) => {
                        const rules = [...(node.matchRules || [])];
                        rules[ri] = { ...rule, path: e.target.value };
                        onUpdate({ matchRules: rules });
                      }}
                      placeholder={
                        rule.type === "header" ? "header-name" : "json.path"
                      }
                      className="w-20 h-5 px-1 text-[9px] font-mono bg-background border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                    />
                  )}
                  <select
                    value={rule.operator}
                    onChange={(e) => {
                      const rules = [...(node.matchRules || [])];
                      rules[ri] = { ...rule, operator: e.target.value as any };
                      onUpdate({ matchRules: rules });
                    }}
                    title="Match rule operator"
                    aria-label="Match rule operator"
                    className="h-5 px-1 text-[9px] bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="equals">equals</option>
                    <option value="contains">contains</option>
                    <option value="matches">matches</option>
                    <option value="exists">exists</option>
                    <option value="not_exists">not exists</option>
                    <option value="gt">&gt;</option>
                    <option value="lt">&lt;</option>
                  </select>
                  {rule.operator !== "exists" &&
                    rule.operator !== "not_exists" && (
                      <input
                        value={rule.value || ""}
                        onChange={(e) => {
                          const rules = [...(node.matchRules || [])];
                          rules[ri] = { ...rule, value: e.target.value };
                          onUpdate({ matchRules: rules });
                        }}
                        placeholder="value"
                        className="flex-1 min-w-[60px] h-5 px-1 text-[9px] font-mono bg-background border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                      />
                    )}
                  <button
                    onClick={() => {
                      const rules = (node.matchRules || []).filter(
                        (_, i) => i !== ri,
                      );
                      onUpdate({ matchRules: rules });
                    }}
                    className="p-0.5 text-muted-foreground hover:text-destructive"
                    title="Remove match rule"
                    aria-label="Remove match rule"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  onUpdate({
                    matchRules: [
                      ...(node.matchRules || []),
                      {
                        id: crypto.randomUUID(),
                        type: "status",
                        operator: "equals",
                        value: "200",
                      },
                    ],
                  })
                }
                className="text-[9px] font-bold text-primary hover:text-primary/80"
              >
                + Add Rule
              </button>
              <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!node.continueOnError}
                  onChange={(e) =>
                    onUpdate({ continueOnError: e.target.checked })
                  }
                  className="w-3 h-3 accent-primary"
                />
                Continue on match failure
              </label>
            </div>
          )}

          {node.type === "foreach" && (
            <div className="space-y-1">
              <textarea
                value={node.foreachExpression || ""}
                onChange={(e) =>
                  onUpdate({ foreachExpression: e.target.value })
                }
                placeholder="JSON.parse(response.body).data  or  body.items"
                className="w-full h-10 px-2 py-1 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground resize-none placeholder:text-muted-foreground/30"
              />
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  value={node.foreachVariable || ""}
                  onChange={(e) =>
                    onUpdate({ foreachVariable: e.target.value })
                  }
                  placeholder="variableName"
                  className="flex-1 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
              <p className="text-[8px] text-muted-foreground/40">
                Extracts array. Access:{" "}
                <code className="text-primary/70">{"{{varName}}"}</code>,{" "}
                <code className="text-primary/70">{"{{varName_length}}"}</code>,{" "}
                <code className="text-primary/70">{"{{varName_current}}"}</code>
                . Combine with <strong>Loop</strong> node to iterate.
              </p>
            </div>
          )}

          {node.type === "save_collection" && (
            <div className="space-y-1">
              <input
                value={node.saveCollectionName || ""}
                onChange={(e) =>
                  onUpdate({ saveCollectionName: e.target.value })
                }
                placeholder="Collection name (supports {{vars}})"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <input
                value={node.saveCondition || ""}
                onChange={(e) => onUpdate({ saveCondition: e.target.value })}
                placeholder="Condition (e.g. response.status === 200) — leave empty to always save"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <p className="text-[8px] text-muted-foreground/40">
                Saves all executed requests from this flow run into a new
                collection
              </p>
            </div>
          )}

          {node.type === "group" && (
            <p className="text-[9px] text-muted-foreground">
              Visual grouping for organizing steps. Does not affect execution.
            </p>
          )}

          {node.type === "switch_case" && (
            <div className="space-y-1.5">
              <input
                value={node.switchExpression || ""}
                onChange={(e) => onUpdate({ switchExpression: e.target.value })}
                placeholder="response.status  or  vars.userType"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <p className="text-[8px] text-muted-foreground/40">
                Evaluates expression, matches against cases below
              </p>
              {(node.switchCases || []).map((c, ci) => (
                <div key={c.id} className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground font-bold shrink-0">
                    case
                  </span>
                  <input
                    value={c.value}
                    onChange={(e) => {
                      const cases = [...(node.switchCases || [])];
                      cases[ci] = { ...c, value: e.target.value };
                      onUpdate({ switchCases: cases });
                    }}
                    placeholder="value"
                    className="w-20 h-6 px-1.5 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none text-foreground placeholder:text-muted-foreground/30"
                  />
                  <span className="text-[9px] text-muted-foreground">→</span>
                  <input
                    value={c.label}
                    onChange={(e) => {
                      const cases = [...(node.switchCases || [])];
                      cases[ci] = { ...c, label: e.target.value };
                      onUpdate({ switchCases: cases });
                    }}
                    placeholder="label"
                    className="flex-1 h-6 px-1.5 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none text-foreground placeholder:text-muted-foreground/30"
                  />
                  <button
                    onClick={() =>
                      onUpdate({
                        switchCases: (node.switchCases || []).filter(
                          (_, i) => i !== ci,
                        ),
                      })
                    }
                    className="p-0.5 text-muted-foreground hover:text-destructive"
                    title="Remove switch case"
                    aria-label="Remove switch case"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  onUpdate({
                    switchCases: [
                      ...(node.switchCases || []),
                      { id: crypto.randomUUID(), value: "", label: "" },
                    ],
                  })
                }
                className="text-[9px] font-bold text-primary hover:text-primary/80"
              >
                + Add Case
              </button>
              <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!node.continueOnError}
                  onChange={(e) =>
                    onUpdate({ continueOnError: e.target.checked })
                  }
                  className="w-3 h-3 accent-primary"
                />
                Continue on no match
              </label>
            </div>
          )}

          {node.type === "break_if" && (
            <div className="space-y-1">
              <input
                value={node.breakCondition || ""}
                onChange={(e) => onUpdate({ breakCondition: e.target.value })}
                placeholder="response.status >= 400  or  vars.errorCount > 3"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <input
                value={node.breakMessage || ""}
                onChange={(e) => onUpdate({ breakMessage: e.target.value })}
                placeholder="Reason message (optional)"
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <p className="text-[8px] text-muted-foreground/40">
                Stops the flow if condition is true. Access:{" "}
                <code className="text-primary/70">response</code>,{" "}
                <code className="text-primary/70">vars</code>,{" "}
                <code className="text-primary/70">h.*</code>
              </p>
            </div>
          )}

          {node.type === "counter" && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <input
                  value={node.counterName || ""}
                  onChange={(e) => onUpdate({ counterName: e.target.value })}
                  placeholder="counterName"
                  className="flex-1 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                />
                <select
                  value={node.counterAction || "increment"}
                  onChange={(e) =>
                    onUpdate({ counterAction: e.target.value as any })
                  }
                  title="Counter action"
                  aria-label="Counter action"
                  className="h-7 px-1.5 text-[9px] bg-surface-sunken border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="increment">Increment</option>
                  <option value="decrement">Decrement</option>
                  <option value="reset">Reset</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground">Step:</span>
                <input
                  type="number"
                  value={node.counterStep || 1}
                  onChange={(e) =>
                    onUpdate({ counterStep: parseInt(e.target.value) || 1 })
                  }
                  title="Counter step"
                  aria-label="Counter step"
                  className="w-16 h-6 px-1.5 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none text-foreground text-center"
                />
                <span className="text-[9px] text-muted-foreground">
                  Initial:
                </span>
                <input
                  type="number"
                  value={node.counterInitial || 0}
                  onChange={(e) =>
                    onUpdate({ counterInitial: parseInt(e.target.value) || 0 })
                  }
                  title="Counter initial value"
                  aria-label="Counter initial value"
                  className="w-16 h-6 px-1.5 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none text-foreground text-center"
                />
              </div>
              <p className="text-[8px] text-muted-foreground/40">
                Auto-initializes on first use. Access via{" "}
                <code className="text-primary/70">{"{{counterName}}"}</code>
              </p>
            </div>
          )}

          {node.type === "wait_until" && (
            <div className="space-y-1">
              <input
                value={node.waitCondition || ""}
                onChange={(e) => onUpdate({ waitCondition: e.target.value })}
                placeholder='vars.status === "ready"  or  vars.retryCount > 3'
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              <div className="flex items-center gap-2">
                <Hourglass className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[9px] text-muted-foreground">
                  Timeout:
                </span>
                <input
                  type="number"
                  value={node.waitTimeoutMs || 30000}
                  onChange={(e) =>
                    onUpdate({
                      waitTimeoutMs: parseInt(e.target.value) || 30000,
                    })
                  }
                  title="Wait timeout in milliseconds"
                  aria-label="Wait timeout in milliseconds"
                  className="w-20 h-6 px-1.5 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none text-foreground text-center"
                />
                <span className="text-[8px] text-muted-foreground">ms</span>
                <span className="text-[9px] text-muted-foreground">Poll:</span>
                <input
                  type="number"
                  value={node.waitIntervalMs || 2000}
                  onChange={(e) =>
                    onUpdate({
                      waitIntervalMs: parseInt(e.target.value) || 2000,
                    })
                  }
                  title="Wait poll interval in milliseconds"
                  aria-label="Wait poll interval in milliseconds"
                  className="w-16 h-6 px-1.5 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none text-foreground text-center"
                />
                <span className="text-[8px] text-muted-foreground">ms</span>
              </div>
              <p className="text-[8px] text-muted-foreground/40">
                Polls condition every interval. Fails on timeout. Access:{" "}
                <code className="text-primary/70">response</code>,{" "}
                <code className="text-primary/70">vars</code>
              </p>
            </div>
          )}

          {node.type === "schema_validate" && (
            <div className="space-y-1">
              <textarea
                value={node.schemaKeys || ""}
                onChange={(e) => onUpdate({ schemaKeys: e.target.value })}
                placeholder="id:number, name:string, email:string, tags:array"
                className="w-full h-12 px-2 py-1 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground resize-none placeholder:text-muted-foreground/30"
              />
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[9px] text-muted-foreground">
                  Target:
                </span>
                <input
                  value={node.schemaTarget || "body"}
                  onChange={(e) => onUpdate({ schemaTarget: e.target.value })}
                  placeholder="body"
                  className="flex-1 h-6 px-1.5 text-[9px] font-mono bg-surface-sunken border border-border focus:outline-none text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
              <p className="text-[8px] text-muted-foreground/40">
                Format:{" "}
                <code className="text-primary/70">key:type, key:type</code>.
                Types: string, number, boolean, array, object
              </p>
              <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!node.continueOnError}
                  onChange={(e) =>
                    onUpdate({ continueOnError: e.target.checked })
                  }
                  className="w-3 h-3 accent-primary"
                />
                Continue on validation failure
              </label>
            </div>
          )}

          {node.type === "manage_collection" && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground font-bold shrink-0">
                  Action:
                </span>
                <select
                  value={node.collectionAction || "create"}
                  onChange={(e) =>
                    onUpdate({ collectionAction: e.target.value as any })
                  }
                  title="Collection action"
                  aria-label="Collection action"
                  className="flex-1 h-7 px-1.5 text-[9px] bg-surface-sunken border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="create">Create Collection</option>
                  <option value="add_request">Add Request to Collection</option>
                  <option value="update_request">
                    Update Request in Collection
                  </option>
                  <option value="delete_request">
                    Delete Request from Collection
                  </option>
                  <option value="delete_collection">Delete Collection</option>
                  <option value="rename">Rename Collection</option>
                </select>
              </div>
              <input
                value={node.collectionName || ""}
                onChange={(e) => onUpdate({ collectionName: e.target.value })}
                placeholder={
                  node.collectionAction === "create"
                    ? "New collection name"
                    : "Collection name or ID"
                }
                className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
              />
              {(node.collectionAction === "add_request" ||
                node.collectionAction === "update_request" ||
                node.collectionAction === "delete_request" ||
                node.collectionAction === "rename") && (
                <input
                  value={node.collectionRequestData || ""}
                  onChange={(e) =>
                    onUpdate({ collectionRequestData: e.target.value })
                  }
                  placeholder={
                    node.collectionAction === "rename"
                      ? "Old collection name/ID"
                      : node.collectionAction === "delete_request"
                        ? "Request ID to delete"
                        : "Request JSON data (or leave empty for last request)"
                  }
                  className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                />
              )}
              {collections.length > 0 && (
                <details className="text-[8px] text-muted-foreground/40">
                  <summary className="cursor-pointer hover:text-foreground font-bold">
                    Existing collections
                  </summary>
                  <div className="mt-1 space-y-0.5 font-mono">
                    {collections.map((c) => (
                      <p key={c.id}>
                        <code className="text-primary/70">{c.name}</code> (
                        {c.requests.length} reqs, ID: {c.id.slice(0, 8)})
                      </p>
                    ))}
                  </div>
                </details>
              )}
              <p className="text-[8px] text-muted-foreground/40">
                Supports <code className="text-primary/70">{"{{vars}}"}</code>{" "}
                in all fields. Created collection ID stored in{" "}
                <code className="text-primary/70">__lastCollectionId</code>
              </p>
            </div>
          )}

          {node.type === "manage_environment" && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground font-bold shrink-0">
                  Action:
                </span>
                <select
                  value={node.envAction || "create"}
                  onChange={(e) =>
                    onUpdate({ envAction: e.target.value as any })
                  }
                  title="Environment action"
                  aria-label="Environment action"
                  className="flex-1 h-7 px-1.5 text-[9px] bg-surface-sunken border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="create">Create Environment</option>
                  <option value="switch">Switch Environment</option>
                  <option value="set_var">Set Variable</option>
                  <option value="remove_var">Remove Variable</option>
                  <option value="delete">Delete Environment</option>
                  <option value="rename">Rename Environment</option>
                </select>
              </div>
              {node.envAction !== "set_var" &&
                node.envAction !== "remove_var" && (
                  <input
                    value={node.envName || ""}
                    onChange={(e) => onUpdate({ envName: e.target.value })}
                    placeholder={
                      node.envAction === "create"
                        ? "New environment name"
                        : "Environment name or ID"
                    }
                    className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                  />
                )}
              {(node.envAction === "set_var" ||
                node.envAction === "remove_var") && (
                <div className="flex items-center gap-1">
                  <input
                    value={node.envVarKey || ""}
                    onChange={(e) => onUpdate({ envVarKey: e.target.value })}
                    placeholder="Variable key"
                    className="w-1/3 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                  />
                  {node.envAction === "set_var" && (
                    <>
                      <span className="text-[10px] text-muted-foreground font-bold">
                        =
                      </span>
                      <input
                        value={node.envVarValue || ""}
                        onChange={(e) =>
                          onUpdate({ envVarValue: e.target.value })
                        }
                        placeholder="Value or expression"
                        className="flex-1 h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                      />
                    </>
                  )}
                </div>
              )}
              {node.envAction === "rename" && (
                <input
                  value={node.envVarValue || ""}
                  onChange={(e) => onUpdate({ envVarValue: e.target.value })}
                  placeholder="New name"
                  className="w-full h-7 px-2 text-[10px] font-mono bg-surface-sunken border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30"
                />
              )}
              <p className="text-[8px] text-muted-foreground/40">
                {node.envAction === "set_var"
                  ? "Sets variable on the active environment. Value can be a JS expression."
                  : node.envAction === "switch"
                    ? "Switches the active environment. Use name or ID."
                    : "Manages environments. Created env ID stored in __lastEnvId"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Collapsed summary */}
      {!isExpanded && (
        <div className="px-2 py-1 text-[9px] text-muted-foreground truncate">
          {(node.type === "request" || node.type === "http_request") &&
            (() => {
              const sel = allRequests.find((r) => r.id === node.requestId);
              if (sel)
                return `${sel.protocol.toUpperCase()} ${sel.method} ${sel.url}`;
              if (node.httpUrl)
                return `${node.httpMethod || "GET"} ${node.httpUrl}`;
              return "No request selected";
            })()}
          {node.type === "condition" && (node.condition || "No condition")}
          {node.type === "delay" && `${node.delayMs || 1000}ms`}
          {node.type === "log" && (node.logMessage || "No message")}
          {node.type === "set_variable" &&
            `${node.variableName} = ${node.variableValue || "..."}`}
          {node.type === "extract" &&
            `${node.extractExpression || "..."} -> ${node.extractTarget || "..."}`}
          {node.type === "loop" && `${node.loopCount || 1}x iterations`}
          {node.type === "assert" && (node.assertExpression || "No assertion")}
          {node.type === "transform" &&
            `${node.transformExpression?.slice(0, 30) || "..."} -> ${node.transformTarget || "..."}`}
          {node.type === "try_catch" && `Catch: ${node.catchAction || "log"}`}
          {node.type === "response_match" &&
            `${(node.matchRules || []).length} rules (${node.matchMode || "all"})`}
          {node.type === "foreach" &&
            `${node.foreachExpression?.slice(0, 25) || "..."} -> ${node.foreachVariable || "..."}`}
          {node.type === "save_collection" &&
            `-> ${node.saveCollectionName || "..."}`}
          {node.type === "group" && "Group"}
          {node.type === "switch_case" &&
            `switch(${node.switchExpression?.slice(0, 20) || "..."}) ${(node.switchCases || []).length} cases`}
          {node.type === "break_if" &&
            `break if ${node.breakCondition?.slice(0, 30) || "..."}`}
          {node.type === "counter" &&
            `${node.counterName || "counter"} ${node.counterAction || "increment"} ±${node.counterStep || 1}`}
          {node.type === "wait_until" &&
            `until ${node.waitCondition?.slice(0, 25) || "..."} (${(node.waitTimeoutMs || 30000) / 1000}s)`}
          {node.type === "schema_validate" &&
            `validate ${node.schemaKeys?.split(",").length || 0} fields`}
          {node.type === "manage_collection" &&
            `${node.collectionAction || "create"}: ${node.collectionName || "..."}`}
          {node.type === "manage_environment" &&
            `${node.envAction || "create"}: ${node.envAction === "set_var" ? `${node.envVarKey || "..."} = ${node.envVarValue?.slice(0, 15) || "..."}` : node.envName || "..."}`}
        </div>
      )}

      {/* Scripts for request nodes */}
      {(node.type === "request" || node.type === "http_request") &&
        scriptsVisible &&
        isExpanded && (
          <div className="border-t border-border">
            <div className="flex border-b border-border bg-surface-sunken">
              <span className="px-2 py-1 text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/30">
                Node Scripts
              </span>
            </div>
            {[
              {
                key: "preScript" as const,
                tabId: "pre" as const,
                label: "Pre-script",
                icon: FileCode,
                placeholder: "// Runs before request",
              },
              {
                key: "postScript" as const,
                tabId: "post" as const,
                label: "Post-script",
                icon: Code,
                placeholder: "// Runs after response",
              },
              {
                key: "testScript" as const,
                tabId: "test" as const,
                label: "Tests",
                icon: FlaskConical,
                placeholder:
                  "test('Status 200', () => {\n  expect(qf.response.status).toBe(200);\n});",
              },
            ].map((s) => {
              const isActive = activeScriptTab === s.tabId;
              return (
                <div
                  key={s.key}
                  data-script-section={`${node.id}-${s.tabId}`}
                  className={`border-b border-border last:border-b-0 transition-all duration-300 ${isActive ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
                >
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 ${isActive ? "bg-primary/10" : "bg-surface-sunken"}`}
                  >
                    <s.icon
                      className={`h-2.5 w-2.5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`text-[9px] font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {s.label}
                    </span>
                    {isActive && (
                      <Loader2 className="h-2.5 w-2.5 text-primary animate-spin ml-auto" />
                    )}
                    {!isActive &&
                      activeScriptTab &&
                      ((activeScriptTab === "post" && s.tabId === "pre") ||
                        (activeScriptTab === "test" &&
                          (s.tabId === "pre" || s.tabId === "post"))) && (
                        <CircleCheck className="h-2.5 w-2.5 text-status-success ml-auto" />
                      )}
                  </div>
                  <textarea
                    value={(node as any)[s.key] || ""}
                    onChange={(e) => onUpdate({ [s.key]: e.target.value })}
                    placeholder={s.placeholder}
                    className={`w-full h-14 px-2 py-1.5 text-[10px] font-mono border-0 focus:outline-none resize-none placeholder:text-muted-foreground/20 transition-colors ${isActive ? "bg-primary/5 text-foreground" : "bg-background text-foreground"}`}
                  />
                </div>
              );
            })}
          </div>
        )}

      {/* Result output preview */}
      {result?.output !== undefined && (
        <div className="px-2 py-1 bg-status-success/5 border-t border-status-success/20">
          <p className="text-[8px] font-bold text-muted-foreground/40 uppercase">
            Output
          </p>
          <pre className="text-[9px] font-mono text-foreground truncate">
            {JSON.stringify(result.output).slice(0, 100)}
          </pre>
        </div>
      )}

      {result?.error && (
        <div className="px-2 py-1 bg-destructive/5 border-t border-destructive/20">
          <p className="text-[9px] text-destructive font-mono truncate">
            {result.error}
          </p>
        </div>
      )}
      {result?.testResults && result.testResults.length > 0 && (
        <div className="border-t border-border">
          {result.testResults.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[9px]"
            >
              {t.passed ? (
                <CircleCheck className="h-2.5 w-2.5 text-status-success shrink-0" />
              ) : (
                <XCircle className="h-2.5 w-2.5 text-destructive shrink-0" />
              )}
              <span className="font-bold text-foreground truncate">
                {t.name}
              </span>
              {!t.passed && (
                <span className="text-destructive truncate">{t.message}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
