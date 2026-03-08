import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import type {
  RequestConfig,
  ResponseData,
  HttpMethod,
  ProtocolType,
  HistoryItem,
  TestResult,
  Environment,
  Collection,
  Workspace,
  Flow,
} from "@/types/api";
import {
  createEmptyRequest,
  createEmptyWorkspace,
  createEmptyFlow,
  createEmptyCollection,
  getMethodColor,
  getMethodBgColor,
  getStatusColor,
} from "@/types/api";
import { executeRequest, runTests } from "@/lib/api-client";
import { lsGet, lsSet } from "@/lib/secure-storage";
import { updateFaviconStatus } from "@/lib/dynamic-favicon";
import { RequestTabs } from "@/components/RequestTabs";
import { EnvAutocompleteInput } from "@/components/EnvAutocomplete";
import { ResponsePanel } from "@/components/ResponsePanel";
import { RealtimePanel } from "@/components/RealtimePanel";
import type { RealtimePanelHandle } from "@/components/RealtimePanel";
import { SSEPanel } from "@/components/SSEPanel";
import type { SSEPanelHandle } from "@/components/SSEPanel";
import { GraphQLPanel } from "@/components/GraphQLPanel";
import { ExportDialog } from "@/components/ExportDialog";
import { ImportDialog } from "@/components/ImportDialog";
import {
  CommandPalette,
  type CommandAction,
} from "@/components/CommandPalette";
import { EnvironmentPanel } from "@/components/EnvironmentPanel";
import { CollectionPanel } from "@/components/CollectionPanel";
import { DocumentationPanel } from "@/components/DocumentationPanel";
import { ShortcutsPanel } from "@/components/ShortcutsPanel";
import { FlowPanel } from "@/components/FlowPanel";
import { ThemeToggle, useTheme } from "@/components/ThemeToggle";
import { WorldClock } from "@/components/WorldClock";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Send,
  Plus,
  Clock,
  ChevronDown,
  Upload,
  Download,
  X,
  Search,
  FolderOpen,
  Layers,
  PanelLeftClose,
  PanelLeft,
  BookOpen,
  Shield,
  ShieldOff,
  Globe,
  Keyboard,
  Github,
  Linkedin,
  Plug,
  Unplug,
  Wifi,
  WifiOff,
  Activity,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Radio,
  Zap,
  GitBranch,
  Pin,
  PinOff,
  MoreHorizontal,
  Pencil,
  Save,
} from "lucide-react";
import type { KeyValuePair } from "../types/api";
import { toast } from "sonner";

// ── localStorage helpers ──────────────────────────────────────────────
const LS_KEYS = {
  workspaces: "qf_workspaces",
  activeWorkspace: "qf_active_workspace",
  tabs: "qf_tabs",
  activeTab: "qf_active_tab",
  history: "qf_history",
  historyEnabled: "qf_history_enabled",
  sidebarCollapsed: "qf_sidebar_collapsed",
  sidebarTab: "qf_sidebar_tab",
  splitDirection: "qf_split_direction",
  useProxy: "qf_use_proxy",
  flows: "qf_flows",
} as const;

// ── Constants ─────────────────────────────────────────────────────────
const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
];
const PROTOCOLS: {
  value: ProtocolType;
  label: string;
  badge: string;
  icon: typeof Globe;
}[] = [
  { value: "rest", label: "REST", badge: "REST", icon: Globe },
  { value: "graphql", label: "GraphQL", badge: "GQL", icon: Zap },
  { value: "websocket", label: "Realtime", badge: "RT", icon: Radio },
  { value: "sse", label: "SSE", badge: "SSE", icon: Activity },
  { value: "soap", label: "SOAP", badge: "SOAP", icon: Globe },
];
const REALTIME_PROTOCOLS: ProtocolType[] = ["websocket", "sse", "socketio"];
const WS_IO_PROTOCOLS: ProtocolType[] = ["websocket", "socketio"];

function getProtocolBadge(protocol: ProtocolType): string {
  return PROTOCOLS.find((p) => p.value === protocol)?.badge || "REST";
}
function getProtocolColor(protocol: ProtocolType): string {
  switch (protocol) {
    case "websocket":
      return "text-method-put";
    case "sse":
      return "text-method-patch";
    case "socketio":
      return "text-method-put";
    case "graphql":
      return "text-method-post";
    case "soap":
      return "text-muted-foreground";
    default:
      return "text-status-success";
  }
}

type SidebarTab = "collections" | "environments" | "history" | "flows";
type AgentStatus = "not-installed" | "inactive" | "active" | "error";

function useAgentStatus(): AgentStatus {
  const [status, setStatus] = useState<AgentStatus>("not-installed");
  useEffect(() => {
    const detect = () => {
      // Check for meta tag injected by content script
      const marker = document.querySelector('meta[name="quefork-agent"]');
      if (marker && marker.getAttribute("content") === "active") {
        setStatus("active");
      }
    };

    // Check immediately (content script may have already run)
    detect();

    // Also listen for the custom event (if page loads before content script)
    const handler = () => setStatus("active");
    window.addEventListener("quefork-agent-ready", handler);

    // Re-check periodically (e.g. if extension is enabled/disabled)
    const i = setInterval(detect, 10000);
    return () => {
      clearInterval(i);
      window.removeEventListener("quefork-agent-ready", handler);
    };
  }, []);
  return status;
}

// ── Main Component ────────────────────────────────────────────────────
export default function Index() {
  const isMobile = useIsMobile();
  const { dark, toggle: toggleTheme } = useTheme();
  const agentStatus = useAgentStatus();

  // Persisted state
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() =>
    lsGet(LS_KEYS.workspaces, [createEmptyWorkspace()]),
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() =>
    lsGet(LS_KEYS.activeWorkspace, workspaces[0]?.id || ""),
  );
  const [tabs, setTabs] = useState<RequestConfig[]>(() =>
    lsGet(LS_KEYS.tabs, [createEmptyRequest()]),
  );
  const [activeTabId, setActiveTabId] = useState(() =>
    lsGet(LS_KEYS.activeTab, tabs[0]?.id || ""),
  );
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    lsGet(LS_KEYS.history, []),
  );
  const [historyEnabled, setHistoryEnabled] = useState(() =>
    lsGet(LS_KEYS.historyEnabled, true),
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    lsGet(LS_KEYS.sidebarCollapsed, false),
  );
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(() =>
    lsGet(LS_KEYS.sidebarTab, "collections"),
  );
  const [splitDirection, setSplitDirection] = useState<
    "vertical" | "horizontal"
  >(() => lsGet(LS_KEYS.splitDirection, "vertical"));
  const [useProxy, setUseProxy] = useState(() => lsGet(LS_KEYS.useProxy, true));
  const [flows, setFlows] = useState<Flow[]>(() => lsGet(LS_KEYS.flows, []));

  // Non-persisted UI state
  const [responses, setResponses] = useState<Record<string, ResponseData>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>(
    {},
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCommand, setShowCommand] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState<
    Record<string, boolean>
  >({});
  const [agentToastShown, setAgentToastShown] = useState(false);
  const [pinnedTabs, setPinnedTabs] = useState<Set<string>>(
    () => new Set(lsGet<string[]>("qf_pinned_tabs", [])),
  );
  const [showTabSearch, setShowTabSearch] = useState(false);
  const [tabSearchQuery, setTabSearchQuery] = useState("");
  const [showTabMenu, setShowTabMenu] = useState<string | false>(false);
  const [showSaveToCollection, setShowSaveToCollection] = useState(false);
  const [responseMode, setResponseMode] = useState<
    "normal" | "collapsed" | "expanded"
  >("normal");

  // Refs
  const realtimeRef = useRef<RealtimePanelHandle>(null);
  const sseRef = useRef<SSEPanelHandle>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const prevSplitRef = useRef<"vertical" | "horizontal">(splitDirection);

  // Force vertical (top/bottom) split when sidebar is expanded
  const effectiveSplit =
    !isMobile && !sidebarCollapsed ? "vertical" : splitDirection;

  // When sidebar expands, save current direction; when collapses, restore it
  useEffect(() => {
    if (!sidebarCollapsed) {
      prevSplitRef.current = splitDirection;
    }
  }, [sidebarCollapsed, splitDirection]);

  // ── Persist to localStorage on change ───────────────────────────────
  useEffect(() => {
    lsSet(LS_KEYS.workspaces, workspaces);
  }, [workspaces]);
  useEffect(() => {
    lsSet(LS_KEYS.activeWorkspace, activeWorkspaceId);
  }, [activeWorkspaceId]);
  useEffect(() => {
    lsSet(LS_KEYS.tabs, tabs);
  }, [tabs]);
  useEffect(() => {
    lsSet(LS_KEYS.activeTab, activeTabId);
  }, [activeTabId]);
  useEffect(() => {
    lsSet(LS_KEYS.history, history);
  }, [history]);
  useEffect(() => {
    lsSet(LS_KEYS.historyEnabled, historyEnabled);
  }, [historyEnabled]);
  useEffect(() => {
    lsSet(LS_KEYS.sidebarCollapsed, sidebarCollapsed);
  }, [sidebarCollapsed]);
  useEffect(() => {
    lsSet(LS_KEYS.sidebarTab, sidebarTab);
  }, [sidebarTab]);
  useEffect(() => {
    lsSet(LS_KEYS.splitDirection, splitDirection);
  }, [splitDirection]);
  useEffect(() => {
    lsSet(LS_KEYS.useProxy, useProxy);
  }, [useProxy]);
  useEffect(() => {
    lsSet(LS_KEYS.flows, flows);
  }, [flows]);
  useEffect(() => {
    lsSet("qf_pinned_tabs", [...pinnedTabs]);
  }, [pinnedTabs]);

  // ── Derived ─────────────────────────────────────────────────────────
  const workspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const setWorkspace = (updater: (prev: Workspace) => Workspace) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === activeWorkspaceId ? updater(w) : w)),
    );
  };
  const activeRequest = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeEnv = workspace.environments.find((e) => e.isActive) || null;
  const isRealtime = REALTIME_PROTOCOLS.includes(activeRequest.protocol);

  // Agent toast
  useEffect(() => {
    if (agentStatus === "not-installed" && !agentToastShown) {
      setAgentToastShown(true);
      toast("queFork Agent not detected", {
        description: "Install the agent for local testing without CORS issues.",
        action: {
          label: "Learn more",
          onClick: () =>
            window.open("https://github.com/somritdasgupta/queFork", "_blank"),
        },
        duration: 8000,
      });
    }
  }, [agentStatus, agentToastShown]);

  // ── Actions ─────────────────────────────────────────────────────────
  const updateRequest = useCallback((updated: RequestConfig) => {
    setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (updated.collectionId) {
      setWorkspaces((prev) =>
        prev.map((ws) => ({
          ...ws,
          collections: ws.collections.map((c) =>
            c.id === updated.collectionId
              ? {
                  ...c,
                  requests: c.requests.map((r) =>
                    r.id === updated.id ? updated : r,
                  ),
                }
              : c,
          ),
        })),
      );
    }
  }, []);

  const addTab = () => {
    const req = createEmptyRequest();
    setTabs((prev) => [...prev, req]);
    setActiveTabId(req.id);
  };
  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    if (pinnedTabs.has(id)) return;
    const idx = tabs.findIndex((t) => t.id === id);
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id)
      setActiveTabId(tabs[Math.max(0, idx - 1)]?.id || tabs[0].id);
  };
  const togglePinTab = (id: string) => {
    setPinnedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const closeAllTabs = () => {
    const pinned = tabs.filter((t) => pinnedTabs.has(t.id));
    if (pinned.length === 0) {
      const req = createEmptyRequest();
      setTabs([req]);
      setActiveTabId(req.id);
    } else {
      setTabs(pinned);
      if (!pinned.find((t) => t.id === activeTabId))
        setActiveTabId(pinned[0].id);
    }
    toast.success("Closed unpinned tabs");
  };
  const closeOtherTabs = (keepId: string) => {
    const kept = tabs.filter((t) => t.id === keepId || pinnedTabs.has(t.id));
    setTabs(kept);
    setActiveTabId(keepId);
  };

  const nextTab = () => {
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    setActiveTabId(tabs[(idx + 1) % tabs.length].id);
  };
  const prevTab = () => {
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    setActiveTabId(tabs[(idx - 1 + tabs.length) % tabs.length].id);
  };

  const saveToCollection = (collectionId: string) => {
    const req = { ...activeRequest, collectionId };
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        collections: ws.collections.map((c) => {
          if (c.id !== collectionId) return c;
          // Update if exists, else add
          const exists = c.requests.find((r) => r.id === req.id);
          if (exists)
            return {
              ...c,
              requests: c.requests.map((r) => (r.id === req.id ? req : r)),
            };
          return { ...c, requests: [...c.requests, req] };
        }),
      })),
    );
    updateRequest(req);
    setShowSaveToCollection(false);
    toast.success("Saved to collection");
  };

  const sendRequest = async () => {
    if (!activeRequest.url) {
      toast.error("Enter a URL");
      return;
    }
    setLoading((prev) => ({ ...prev, [activeRequest.id]: true }));
    try {
      const response = await executeRequest(activeRequest, activeEnv, useProxy);
      if (response.status) updateFaviconStatus(response.status);
      setResponses((prev) => ({ ...prev, [activeRequest.id]: response }));
      if (activeRequest.tests) {
        const results = runTests(activeRequest.tests, response, activeEnv);
        setTestResults((prev) => ({ ...prev, [activeRequest.id]: results }));
      }
      if (historyEnabled) {
        setHistory((prev) =>
          [
            {
              id: crypto.randomUUID(),
              request: { ...activeRequest },
              response,
              timestamp: Date.now(),
            },
            ...prev,
          ].slice(0, 50),
        );
      }
    } catch (e: Error | unknown) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading((prev) => ({ ...prev, [activeRequest.id]: false }));
    }
  };

  /** Called by FlowPanel to execute a request visually in the main UI */
  const executeFlowRequest = useCallback(
    async (req: RequestConfig): Promise<ResponseData> => {
      // Create or reuse tab for this request
      const tabId = req.id;
      const existingTab = tabs.find((t) => t.id === tabId);
      if (existingTab) {
        setTabs((prev) => prev.map((t) => (t.id === tabId ? req : t)));
      } else {
        setTabs((prev) => [...prev, req]);
      }
      setActiveTabId(tabId);

      // Show loading state
      setLoading((prev) => ({ ...prev, [tabId]: true }));
      try {
        const response = await executeRequest(req, activeEnv, useProxy);
        if (response.status) updateFaviconStatus(response.status);
        setResponses((prev) => ({ ...prev, [tabId]: response }));
        if (req.tests) {
          const results = runTests(req.tests, response, activeEnv);
          setTestResults((prev) => ({ ...prev, [tabId]: results }));
        }
        if (historyEnabled) {
          setHistory((prev) =>
            [
              {
                id: crypto.randomUUID(),
                request: { ...req },
                response,
                timestamp: Date.now(),
              },
              ...prev,
            ].slice(0, 50),
          );
        }
        return response;
      } finally {
        setLoading((prev) => ({ ...prev, [tabId]: false }));
      }
    },
    [tabs, activeEnv, useProxy, historyEnabled],
  );

  /** Update tab content in main UI without executing (for flow script syncing) */
  const updateFlowTab = useCallback(
    (req: RequestConfig) => {
      const tabId = req.id;
      const existingTab = tabs.find((t) => t.id === tabId);
      if (existingTab) {
        setTabs((prev) => prev.map((t) => (t.id === tabId ? req : t)));
      } else {
        setTabs((prev) => [...prev, req]);
      }
      setActiveTabId(tabId);
    },
    [tabs],
  );

  // ── Collection CRUD callbacks for flows ─────────────────────────────
  const flowCreateCollection = useCallback(
    (name: string): string => {
      const c = createEmptyCollection(name);
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === activeWorkspaceId
            ? { ...w, collections: [...w.collections, c] }
            : w,
        ),
      );
      toast.success(`Collection "${name}" created`);
      return c.id;
    },
    [activeWorkspaceId],
  );

  const flowAddRequestToCollection = useCallback(
    (collectionId: string, req: RequestConfig) => {
      setWorkspaces((prev) =>
        prev.map((ws) => ({
          ...ws,
          collections: ws.collections.map((c) => {
            if (c.id !== collectionId) return c;
            const exists = c.requests.find((r) => r.id === req.id);
            if (exists)
              return {
                ...c,
                requests: c.requests.map((r) => (r.id === req.id ? req : r)),
              };
            return {
              ...c,
              requests: [...c.requests, { ...req, collectionId }],
            };
          }),
        })),
      );
    },
    [],
  );

  const flowUpdateRequestInCollection = useCallback(
    (collectionId: string, req: RequestConfig) => {
      setWorkspaces((prev) =>
        prev.map((ws) => ({
          ...ws,
          collections: ws.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  requests: c.requests.map((r) => (r.id === req.id ? req : r)),
                }
              : c,
          ),
        })),
      );
    },
    [],
  );

  const flowDeleteRequestFromCollection = useCallback(
    (collectionId: string, requestId: string) => {
      setWorkspaces((prev) =>
        prev.map((ws) => ({
          ...ws,
          collections: ws.collections.map((c) =>
            c.id === collectionId
              ? { ...c, requests: c.requests.filter((r) => r.id !== requestId) }
              : c,
          ),
        })),
      );
    },
    [],
  );

  const flowDeleteCollection = useCallback((collectionId: string) => {
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        collections: ws.collections.filter((c) => c.id !== collectionId),
      })),
    );
  }, []);

  const flowRenameCollection = useCallback(
    (collectionId: string, name: string) => {
      setWorkspaces((prev) =>
        prev.map((ws) => ({
          ...ws,
          collections: ws.collections.map((c) =>
            c.id === collectionId ? { ...c, name } : c,
          ),
        })),
      );
    },
    [],
  );

  // ── Environment CRUD callbacks for flows ────────────────────────────
  const flowCreateEnvironment = useCallback(
    (name: string): string => {
      const env = {
        id: crypto.randomUUID(),
        name,
        variables: [] as KeyValuePair[],
        isActive: false,
      };
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === activeWorkspaceId
            ? { ...w, environments: [...w.environments, env] }
            : w,
        ),
      );
      toast.success(`Environment "${name}" created`);
      return env.id;
    },
    [activeWorkspaceId],
  );

  const flowSwitchEnvironment = useCallback(
    (nameOrId: string) => {
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === activeWorkspaceId
            ? {
                ...ws,
                environments: ws.environments.map((e) => ({
                  ...e,
                  isActive: e.id === nameOrId || e.name === nameOrId,
                })),
              }
            : ws,
        ),
      );
    },
    [activeWorkspaceId],
  );

  const flowSetEnvVariable = useCallback(
    (envId: string | null, key: string, value: string) => {
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === activeWorkspaceId
            ? {
                ...ws,
                environments: ws.environments.map((e) => {
                  const isTarget = envId ? e.id === envId : e.isActive;
                  if (!isTarget) return e;
                  const existing = e.variables.find(
                    (v: KeyValuePair) => v.key === key,
                  );
                  if (existing)
                    return {
                      ...e,
                      variables: e.variables.map((v: KeyValuePair) =>
                        v.key === key ? { ...v, value, enabled: true } : v,
                      ),
                    };
                  return {
                    ...e,
                    variables: [
                      ...e.variables,
                      { id: crypto.randomUUID(), key, value, enabled: true },
                    ],
                  };
                }),
              }
            : ws,
        ),
      );
    },
    [activeWorkspaceId],
  );

  const flowRemoveEnvVariable = useCallback(
    (envId: string | null, key: string) => {
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === activeWorkspaceId
            ? {
                ...ws,
                environments: ws.environments.map((e) => {
                  const isTarget = envId ? e.id === envId : e.isActive;
                  if (!isTarget) return e;
                  return {
                    ...e,
                    variables: e.variables.filter(
                      (v: KeyValuePair) => v.key !== key,
                    ),
                  };
                }),
              }
            : ws,
        ),
      );
    },
    [activeWorkspaceId],
  );

  const flowDeleteEnvironment = useCallback(
    (nameOrId: string) => {
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === activeWorkspaceId
            ? {
                ...ws,
                environments: ws.environments.filter(
                  (e) => e.id !== nameOrId && e.name !== nameOrId,
                ),
              }
            : ws,
        ),
      );
    },
    [activeWorkspaceId],
  );

  const flowRenameEnvironment = useCallback(
    (nameOrId: string, newName: string) => {
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === activeWorkspaceId
            ? {
                ...ws,
                environments: ws.environments.map((e) =>
                  e.id === nameOrId || e.name === nameOrId
                    ? { ...e, name: newName }
                    : e,
                ),
              }
            : ws,
        ),
      );
    },
    [activeWorkspaceId],
  );

  const toggleRealtimeConnection = () => {
    const ref = WS_IO_PROTOCOLS.includes(activeRequest.protocol)
      ? realtimeRef
      : sseRef;
    const handle = ref.current;
    if (!handle) return;
    if (handle.connected) {
      handle.disconnect();
      setRealtimeConnected((prev) => ({ ...prev, [activeRequest.id]: false }));
    } else {
      handle.connect();
      setRealtimeConnected((prev) => ({ ...prev, [activeRequest.id]: true }));
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const ref = WS_IO_PROTOCOLS.includes(activeRequest.protocol)
        ? realtimeRef
        : sseRef;
      if (ref.current && isRealtime) {
        setRealtimeConnected((prev) =>
          prev[activeRequest.id] !== ref.current!.connected
            ? { ...prev, [activeRequest.id]: ref.current!.connected }
            : prev,
        );
      }
    }, 500);
    return () => clearInterval(interval);
  }, [activeRequest.id, activeRequest.protocol, isRealtime]);

  const isCurrentConnected = realtimeConnected[activeRequest.id] || false;

  const loadFromHistory = (item: HistoryItem) => {
    const req = { ...item.request, id: crypto.randomUUID() };
    setTabs((prev) => [...prev, req]);
    setActiveTabId(req.id);
    if (item.response)
      setResponses((prev) => ({ ...prev, [req.id]: item.response! }));
  };

  const handleImport = (req: RequestConfig) => {
    setTabs((prev) => [...prev, req]);
    setActiveTabId(req.id);
  };

  const openRequest = (req: RequestConfig) => {
    const existing = tabs.find((t) => t.id === req.id);
    if (existing) setActiveTabId(req.id);
    else {
      setTabs((prev) => [...prev, req]);
      setActiveTabId(req.id);
    }
    if (isMobile) setShowMobileSidebar(false);
  };

  const handleResponseAction = (action: string) => {
    switch (action) {
      case "send":
        sendRequest();
        break;
      case "new":
        addTab();
        break;
      case "import":
        setShowImport(true);
        break;
      case "environments":
        setSidebarTab("environments");
        setSidebarCollapsed(false);
        break;
      case "collections":
        setSidebarTab("collections");
        setSidebarCollapsed(false);
        break;
      case "command":
        setShowCommand(true);
        break;
    }
  };

  const addWorkspace = () => {
    const ws = createEmptyWorkspace(`Workspace ${workspaces.length + 1}`);
    setWorkspaces((prev) => [...prev, ws]);
    setActiveWorkspaceId(ws.id);
    setShowWorkspaceMenu(false);
    toast.success("New workspace created");
  };

  const deleteWorkspace = (id: string) => {
    if (workspaces.length <= 1) {
      toast.error("Cannot delete the only workspace");
      return;
    }
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (activeWorkspaceId === id)
      setActiveWorkspaceId(workspaces.find((w) => w.id !== id)!.id);
    setShowWorkspaceMenu(false);
    toast.success("Workspace deleted");
  };

  const commandActions: CommandAction[] = [
    {
      id: "new-request",
      label: "New Request",
      icon: <Plus className="h-4 w-4" />,
      shortcut: "⌘N",
      category: "Request",
      action: addTab,
    },
    {
      id: "send",
      label: "Send Request",
      icon: <Send className="h-4 w-4" />,
      shortcut: "⌘↵",
      category: "Request",
      action: sendRequest,
    },
    {
      id: "save",
      label: "Save to Collection",
      icon: <Save className="h-4 w-4" />,
      shortcut: "⌘S",
      category: "Request",
      action: () => setShowSaveToCollection(true),
    },
    {
      id: "import",
      label: "Import cURL",
      icon: <Upload className="h-4 w-4" />,
      shortcut: "⌘I",
      category: "Request",
      action: () => setShowImport(true),
    },
    {
      id: "export",
      label: "Export Request",
      icon: <Download className="h-4 w-4" />,
      shortcut: "⌘E",
      category: "Request",
      action: () => setShowExport(true),
    },
    {
      id: "toggle-sidebar",
      label: "Toggle Sidebar",
      icon: <PanelLeft className="h-4 w-4" />,
      shortcut: "⌘B",
      category: "View",
      action: () =>
        isMobile
          ? setShowMobileSidebar((p) => !p)
          : setSidebarCollapsed((p) => !p),
    },
    {
      id: "toggle-theme",
      label: dark ? "Light Mode" : "Dark Mode",
      shortcut: "⌘D",
      category: "View",
      action: toggleTheme,
    },
    {
      id: "toggle-split",
      label: "Toggle Split",
      shortcut: "⌘\\",
      category: "View",
      action: () =>
        setSplitDirection((d) =>
          d === "vertical" ? "horizontal" : "vertical",
        ),
    },
    {
      id: "docs",
      label: "Documentation",
      icon: <BookOpen className="h-4 w-4" />,
      category: "View",
      action: () => setShowDocs(true),
    },
    {
      id: "shortcuts",
      label: "Keyboard Shortcuts",
      icon: <Keyboard className="h-4 w-4" />,
      category: "View",
      action: () => setShowShortcuts(true),
    },
    {
      id: "collections",
      label: "Collections",
      icon: <FolderOpen className="h-4 w-4" />,
      category: "View",
      action: () => {
        setSidebarTab("collections");
        setSidebarCollapsed(false);
      },
    },
    {
      id: "environments",
      label: "Environments",
      icon: <Layers className="h-4 w-4" />,
      category: "View",
      action: () => {
        setSidebarTab("environments");
        setSidebarCollapsed(false);
      },
    },
    {
      id: "history",
      label: "History",
      icon: <Clock className="h-4 w-4" />,
      category: "View",
      action: () => {
        setSidebarTab("history");
        setSidebarCollapsed(false);
      },
    },
    {
      id: "focus-url",
      label: "Focus URL Bar",
      shortcut: "⌘L",
      category: "Navigation",
      action: () => urlInputRef.current?.focus(),
    },
    {
      id: "next-tab",
      label: "Next Tab",
      shortcut: "⌘⇧]",
      category: "Navigation",
      action: nextTab,
    },
    {
      id: "prev-tab",
      label: "Previous Tab",
      shortcut: "⌘⇧[",
      category: "Navigation",
      action: prevTab,
    },
    ...workspace.collections.flatMap((c) =>
      c.requests.map((r) => ({
        id: `open-${r.id}`,
        label: r.url || r.name,
        description: `${r.method} · ${c.name}`,
        icon: (
          <span className={`text-[10px] font-bold ${getMethodColor(r.method)}`}>
            {r.method}
          </span>
        ),
        category: "Collection",
        action: () => openRequest(r),
      })),
    ),
  ];

  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      action: () => setShowCommand(true),
      description: "Command palette",
    },
    { key: "n", ctrl: true, action: addTab, description: "New request" },
    {
      key: "Enter",
      ctrl: true,
      action: sendRequest,
      description: "Send request",
    },
    {
      key: "i",
      ctrl: true,
      action: () => setShowImport(true),
      description: "Import",
    },
    {
      key: "e",
      ctrl: true,
      action: () => setShowExport(true),
      description: "Export",
    },
    {
      key: "b",
      ctrl: true,
      action: () =>
        isMobile
          ? setShowMobileSidebar((p) => !p)
          : setSidebarCollapsed((p) => !p),
      description: "Toggle sidebar",
    },
    { key: "d", ctrl: true, action: toggleTheme, description: "Toggle theme" },
    {
      key: "w",
      ctrl: true,
      action: () => closeTab(activeTabId),
      description: "Close tab",
    },
    {
      key: "s",
      ctrl: true,
      action: () => setShowSaveToCollection(true),
      description: "Save to collection",
    },
    {
      key: "l",
      ctrl: true,
      action: () => urlInputRef.current?.focus(),
      description: "Focus URL bar",
    },
    {
      key: "p",
      ctrl: true,
      action: () => {
        setUseProxy(!useProxy);
        toast.success(useProxy ? "Proxy disabled" : "Proxy enabled");
      },
      description: "Toggle proxy",
    },
    {
      key: "\\",
      ctrl: true,
      action: () =>
        setSplitDirection((d) =>
          d === "vertical" ? "horizontal" : "vertical",
        ),
      description: "Toggle split",
    },
    {
      key: "]",
      ctrl: true,
      shift: true,
      action: nextTab,
      description: "Next tab",
    },
    {
      key: "[",
      ctrl: true,
      shift: true,
      action: prevTab,
      description: "Previous tab",
    },
    {
      key: "f",
      ctrl: true,
      shift: true,
      action: () => setShowTabSearch(true),
      description: "Search tabs",
    },
    // Number keys for request panels
    {
      key: "1",
      ctrl: true,
      action: () =>
        document.dispatchEvent(
          new CustomEvent("qf:set-request-tab", { detail: "params" }),
        ),
      description: "Params tab",
    },
    {
      key: "2",
      ctrl: true,
      action: () =>
        document.dispatchEvent(
          new CustomEvent("qf:set-request-tab", { detail: "headers" }),
        ),
      description: "Headers tab",
    },
    {
      key: "3",
      ctrl: true,
      action: () =>
        document.dispatchEvent(
          new CustomEvent("qf:set-request-tab", { detail: "body" }),
        ),
      description: "Body tab",
    },
    {
      key: "4",
      ctrl: true,
      action: () =>
        document.dispatchEvent(
          new CustomEvent("qf:set-request-tab", { detail: "auth" }),
        ),
      description: "Auth tab",
    },
    {
      key: "5",
      ctrl: true,
      action: () =>
        document.dispatchEvent(
          new CustomEvent("qf:set-request-tab", { detail: "pre-script" }),
        ),
      description: "Pre-script tab",
    },
    {
      key: "6",
      ctrl: true,
      action: () =>
        document.dispatchEvent(
          new CustomEvent("qf:set-request-tab", { detail: "post-script" }),
        ),
      description: "Post-script tab",
    },
    {
      key: "7",
      ctrl: true,
      action: () =>
        document.dispatchEvent(
          new CustomEvent("qf:set-request-tab", { detail: "tests" }),
        ),
      description: "Tests tab",
    },
    {
      key: "8",
      ctrl: true,
      action: () => {
        setSidebarTab("flows");
        setSidebarCollapsed(false);
      },
      description: "Flows panel",
    },
    {
      key: "m",
      ctrl: true,
      action: () =>
        setResponseMode((m) => (m === "collapsed" ? "normal" : "collapsed")),
      description: "Collapse/restore response",
    },
    {
      key: "f",
      ctrl: true,
      action: () =>
        setResponseMode((m) => (m === "expanded" ? "normal" : "expanded")),
      description: "Expand/restore response",
    },
    // Protocol shortcuts
    {
      key: "1",
      ctrl: true,
      shift: true,
      action: () => updateRequest({ ...activeRequest, protocol: "rest" }),
      description: "REST protocol",
    },
    {
      key: "2",
      ctrl: true,
      shift: true,
      action: () =>
        updateRequest({
          ...activeRequest,
          protocol: "graphql",
          body: { ...activeRequest.body, type: "graphql" },
        }),
      description: "GraphQL protocol",
    },
    {
      key: "3",
      ctrl: true,
      shift: true,
      action: () => updateRequest({ ...activeRequest, protocol: "websocket" }),
      description: "WebSocket protocol",
    },
  ]);

  // ── Sidebar nav items ───────────────────────────────────────────────
  const sidebarNavItems: {
    key: SidebarTab;
    icon: typeof FolderOpen;
    label: string;
  }[] = [
    { key: "collections", icon: FolderOpen, label: "Collections" },
    { key: "environments", icon: Layers, label: "Environments" },
    { key: "history", icon: Clock, label: "History" },
    { key: "flows", icon: GitBranch, label: "Flows" },
  ];

  const getTabBadge = (tab: RequestConfig) => {
    if (
      REALTIME_PROTOCOLS.includes(tab.protocol) ||
      tab.protocol === "graphql" ||
      tab.protocol === "soap"
    ) {
      return (
        <span
          className={`font-extrabold text-[9px] ${getProtocolColor(tab.protocol)}`}
        >
          {getProtocolBadge(tab.protocol)}
        </span>
      );
    }
    return (
      <span
        className={`font-extrabold text-[9px] ${getMethodColor(tab.method)}`}
      >
        {tab.method}
      </span>
    );
  };

  const getUrlPlaceholder = () => {
    switch (activeRequest.protocol) {
      case "websocket":
        return "wss://echo.websocket.org";
      case "sse":
        return "https://api.example.com/events";
      case "socketio":
        return "wss://echo.websocket.org";
      case "graphql":
        return "https://api.example.com/graphql";
      default:
        return "https://api.example.com/endpoint";
    }
  };

  const agentStatusConfig: Record<
    AgentStatus,
    { color: string; label: string; icon: typeof Wifi }
  > = {
    active: { color: "text-status-success", label: "Agent", icon: Wifi },
    inactive: { color: "text-method-put", label: "Idle", icon: WifiOff },
    "not-installed": {
      color: "text-muted-foreground/50",
      label: "No agent",
      icon: WifiOff,
    },
    error: { color: "text-destructive", label: "Error", icon: WifiOff },
  };
  const agentCfg = agentStatusConfig[agentStatus];

  const expandedSidebarWidth = "w-80";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-3 h-[37px] border-b border-border bg-surface-elevated shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              isMobile
                ? setShowMobileSidebar((p) => !p)
                : setSidebarCollapsed((p) => !p)
            }
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </button>
          <h1 className="text-[13px] font-black tracking-tight">
            <span className="text-foreground">que</span>
            <span className="text-primary">Fork</span>
          </h1>

          {/* Workspace selector */}
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Select workspace"
            >
              <Globe className="h-3 w-3" />
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
            {showWorkspaceMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowWorkspaceMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border shadow-2xl min-w-[200px] animate-fade-in">
                  <div className="px-3 py-1 border-b border-border">
                    <p className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/30">
                      Workspaces
                    </p>
                  </div>
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors border-b border-border ${ws.id === activeWorkspaceId ? "bg-accent" : "hover:bg-accent/50"}`}
                    >
                      {editingWorkspaceName && ws.id === activeWorkspaceId ? (
                        <input
                          autoFocus
                          value={ws.name}
                          onChange={(e) =>
                            setWorkspaces((prev) =>
                              prev.map((w) =>
                                w.id === ws.id
                                  ? { ...w, name: e.target.value }
                                  : w,
                              ),
                            )
                          }
                          onBlur={() => setEditingWorkspaceName(false)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && setEditingWorkspaceName(false)
                          }
                          className="flex-1 text-[10px] font-bold bg-transparent border-b border-primary focus:outline-none"
                          aria-label="Workspace name"
                          placeholder="Workspace name"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setActiveWorkspaceId(ws.id);
                            setShowWorkspaceMenu(false);
                          }}
                          onDoubleClick={() => {
                            setActiveWorkspaceId(ws.id);
                            setEditingWorkspaceName(true);
                          }}
                          className="flex-1 text-[10px] font-bold text-foreground"
                        >
                          {ws.name}
                        </span>
                      )}
                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-[8px] font-bold text-muted-foreground/30">
                          {ws.collections.length}c · {ws.environments.length}e
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveWorkspaceId(ws.id);
                            setEditingWorkspaceName(true);
                          }}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                          title="Rename"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                        {workspaces.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWorkspace(ws.id);
                            }}
                            className="p-0.5 text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addWorkspace}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-left hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <Plus className="h-3 w-3" /> New Workspace
                  </button>
                </div>
              </>
            )}
          </div>

          {activeEnv && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-status-success/10 text-status-success">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
              {activeEnv.name}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center justify-center flex-1 min-w-0">
          <WorldClock />
        </div>
        <div className="flex items-center gap-0">
          <button
            onClick={() => setShowSaveToCollection(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Save to Collection (⌘S)"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowCommand(true)}
            className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Search (⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="hidden sm:inline text-[9px] font-bold text-muted-foreground bg-surface-sunken border border-border px-1 py-0.5">
              ⌘K
            </kbd>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Import"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Export"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowDocs((d) => !d)}
            className={`p-1.5 transition-colors ${showDocs ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            title="Docs"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-border bg-surface-elevated shrink-0 h-[37px]">
        <div className="flex-1 flex items-center overflow-x-auto h-full">
          {[
            ...tabs.filter((t) => pinnedTabs.has(t.id)),
            ...tabs.filter((t) => !pinnedTabs.has(t.id)),
          ].map((tab) => {
            const isPinned = pinnedTabs.has(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setShowDocs(false);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowTabMenu(showTabMenu === tab.id ? false : tab.id);
                }}
                className={`group relative flex items-center gap-1.5 px-3 h-full text-[10px] border-b-2 min-w-0 shrink-0 transition-colors ${activeTabId === tab.id && !showDocs ? "border-primary text-foreground bg-background" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {isPinned && <Pin className="h-2 w-2 text-primary shrink-0" />}
                {getTabBadge(tab)}
                <span className="truncate max-w-[80px] font-bold">
                  {tab.url || "Untitled"}
                </span>
                {!isPinned && tabs.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-destructive transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                )}
                {showTabMenu === tab.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTabMenu(false);
                      }}
                    />
                    <div
                      className="absolute top-full left-0 mt-0 z-50 bg-card border border-border shadow-lg py-1 min-w-[140px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          togglePinTab(tab.id);
                          setShowTabMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-left hover:bg-accent transition-colors"
                      >
                        {isPinned ? (
                          <PinOff className="h-3 w-3" />
                        ) : (
                          <Pin className="h-3 w-3" />
                        )}
                        {isPinned ? "Unpin" : "Pin Tab"}
                      </button>
                      <button
                        onClick={() => {
                          setShowSaveToCollection(true);
                          setShowTabMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-left hover:bg-accent transition-colors"
                      >
                        <Save className="h-3 w-3" /> Save to Collection
                      </button>
                      <button
                        onClick={() => {
                          closeOtherTabs(tab.id);
                          setShowTabMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-left hover:bg-accent transition-colors"
                      >
                        <X className="h-3 w-3" /> Close Others
                      </button>
                      <button
                        onClick={() => {
                          closeAllTabs();
                          setShowTabMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-left hover:bg-accent text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" /> Close All
                      </button>
                    </div>
                  </>
                )}
              </button>
            );
          })}
          <button
            onClick={addTab}
            className="px-2 h-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="New request (⌘N)"
            aria-label="New request"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center border-l border-border shrink-0">
          {tabs.length > 1 && (
            <button
              onClick={closeAllTabs}
              className="px-1.5 h-full text-muted-foreground hover:text-destructive transition-colors"
              title="Close all tabs"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-3 w-3"
              >
                <path
                  d="M4 4l8 8M12 4l-8 8M1 1h14M1 15h14"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          {tabs.length > 3 && (
            <button
              onClick={() => setShowTabSearch(!showTabSearch)}
              className="px-1.5 h-full text-muted-foreground hover:text-foreground transition-colors"
              title="Search tabs"
            >
              <Search className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {showTabSearch && (
        <div className="flex items-center border-b border-border bg-surface-sunken px-3 h-[30px] shrink-0">
          <Search className="h-3 w-3 text-muted-foreground mr-2 shrink-0" />
          <input
            autoFocus
            value={tabSearchQuery}
            onChange={(e) => setTabSearchQuery(e.target.value)}
            placeholder="Search tabs..."
            className="flex-1 text-[10px] font-mono bg-transparent focus:outline-none placeholder:text-muted-foreground/30"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowTabSearch(false);
                setTabSearchQuery("");
              }
              if (e.key === "Enter" && tabSearchQuery) {
                const match = tabs.find((t) =>
                  (t.url || t.name)
                    .toLowerCase()
                    .includes(tabSearchQuery.toLowerCase()),
                );
                if (match) {
                  setActiveTabId(match.id);
                  setShowTabSearch(false);
                  setTabSearchQuery("");
                }
              }
            }}
          />
          <button
            onClick={() => {
              setShowTabSearch(false);
              setTabSearchQuery("");
            }}
            className="p-0.5 text-muted-foreground hover:text-foreground"
            title="Close search"
            aria-label="Close search"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* ── Sidebar (desktop) ─────────────────────────────────── */}
        {!isMobile && (
          <div
            className={`${sidebarCollapsed ? "w-10" : expandedSidebarWidth} border-r border-border bg-surface-elevated shrink-0 flex flex-col overflow-hidden transition-all duration-200`}
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col h-full">
                {/* All protocols stacked vertically - h-[37px] to match URL bar */}
                {PROTOCOLS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() =>
                      updateRequest({
                        ...activeRequest,
                        protocol: p.value,
                        body: {
                          ...activeRequest.body,
                          type:
                            p.value === "graphql"
                              ? "graphql"
                              : p.value === "soap"
                                ? "xml"
                                : activeRequest.body.type,
                        },
                      })
                    }
                    className={`group relative w-10 h-[37px] flex items-center justify-center transition-colors shrink-0 ${activeRequest.protocol === p.value ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-foreground hover:bg-accent/50"}`}
                  >
                    <p.icon className="h-3.5 w-3.5" />
                    <span className="absolute left-full ml-1 px-2 py-1 text-[9px] font-bold bg-card border border-border shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                      {p.label}
                    </span>
                  </button>
                ))}
                <div className="border-t border-border" />
                {/* Navigation icons stacked vertically */}
                {sidebarNavItems.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setSidebarTab(t.key);
                      setSidebarCollapsed(false);
                    }}
                    className={`group relative w-10 h-[37px] flex items-center justify-center transition-colors shrink-0 ${sidebarTab === t.key ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-foreground hover:bg-accent/50"}`}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    <span className="absolute left-full ml-1 px-2 py-1 text-[9px] font-bold bg-card border border-border shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Protocol chips - consistent h-[37px], same design as nav tabs */}
                <div className="flex border-b border-border shrink-0 h-[37px]">
                  {PROTOCOLS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() =>
                        updateRequest({
                          ...activeRequest,
                          protocol: p.value,
                          body: {
                            ...activeRequest.body,
                            type:
                              p.value === "graphql"
                                ? "graphql"
                                : p.value === "soap"
                                  ? "xml"
                                  : activeRequest.body.type,
                          },
                        })
                      }
                      className={`flex items-center justify-center gap-1 px-2 text-[9px] font-bold border-b-2 transition-all ${
                        activeRequest.protocol === p.value
                          ? "border-primary text-primary flex-1"
                          : "border-transparent text-muted-foreground/40 hover:text-foreground"
                      }`}
                      title={p.label}
                    >
                      <p.icon className="h-3 w-3" />
                      {activeRequest.protocol === p.value && (
                        <span>{p.badge}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Nav tabs - consistent h-[37px] */}
                <div className="flex border-b border-border h-[37px] shrink-0">
                  {sidebarNavItems.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setSidebarTab(t.key)}
                      className={`flex items-center justify-center gap-1 px-2 text-[9px] font-bold border-b-2 transition-all ${
                        sidebarTab === t.key
                          ? "border-primary text-foreground flex-1"
                          : "border-transparent text-muted-foreground/40 hover:text-foreground"
                      }`}
                      title={t.label}
                    >
                      <t.icon className="h-3 w-3 shrink-0" />
                      {sidebarTab === t.key && (
                        <span className="truncate">{t.label}</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-hidden">
                  {sidebarTab === "collections" && (
                    <CollectionPanel
                      collections={workspace.collections}
                      onChange={(c) =>
                        setWorkspace((prev) => ({ ...prev, collections: c }))
                      }
                      onOpenRequest={openRequest}
                    />
                  )}
                  {sidebarTab === "environments" && (
                    <EnvironmentPanel
                      environments={workspace.environments}
                      onChange={(e) =>
                        setWorkspace((prev) => ({ ...prev, environments: e }))
                      }
                    />
                  )}
                  {sidebarTab === "history" && (
                    <HistoryList
                      history={history}
                      onSelect={loadFromHistory}
                      onClear={() => setHistory([])}
                      historyEnabled={historyEnabled}
                      onToggleHistory={() => setHistoryEnabled((p) => !p)}
                    />
                  )}
                  {sidebarTab === "flows" && (
                    <FlowPanel
                      flows={flows}
                      onChange={setFlows}
                      collections={workspace.collections}
                      tabs={tabs}
                      activeEnv={activeEnv}
                      useProxy={useProxy}
                      onExecuteFlowRequest={executeFlowRequest}
                      onUpdateFlowTab={updateFlowTab}
                      onCreateCollection={flowCreateCollection}
                      onAddRequestToCollection={flowAddRequestToCollection}
                      onUpdateRequestInCollection={
                        flowUpdateRequestInCollection
                      }
                      onDeleteRequestFromCollection={
                        flowDeleteRequestFromCollection
                      }
                      onDeleteCollection={flowDeleteCollection}
                      onRenameCollection={flowRenameCollection}
                      onCreateEnvironment={flowCreateEnvironment}
                      onSwitchEnvironment={flowSwitchEnvironment}
                      onSetEnvVariable={flowSetEnvVariable}
                      onRemoveEnvVariable={flowRemoveEnvVariable}
                      onDeleteEnvironment={flowDeleteEnvironment}
                      onRenameEnvironment={flowRenameEnvironment}
                      onSaveCollection={(name, reqs) => {
                        const c = createEmptyCollection(name);
                        c.requests = reqs;
                        setWorkspace((prev) => ({
                          ...prev,
                          collections: [...prev.collections, c],
                        }));
                        toast.success(`Collection "${name}" saved`);
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Main content ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {showDocs ? (
            <DocumentationPanel />
          ) : (
            <>
              {/* URL bar */}
              <div className="flex items-center gap-0 bg-surface-elevated border-b border-border shrink-0 h-[37px]">
                {!isRealtime &&
                  activeRequest.protocol !== "graphql" &&
                  activeRequest.protocol !== "soap" && (
                    <div className="relative border-r border-border h-full">
                      <button
                        onClick={() => setShowMethodPicker(!showMethodPicker)}
                        className={`flex items-center gap-0.5 px-3 h-full text-[10px] font-bold transition-colors ${getMethodBgColor(activeRequest.method)}`}
                      >
                        {activeRequest.method}
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>
                      {showMethodPicker && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowMethodPicker(false)}
                          />
                          <div className="absolute top-full left-0 mt-0 z-50 bg-card border border-border shadow-lg py-1 min-w-[80px]">
                            {METHODS.map((m) => (
                              <button
                                key={m}
                                onClick={() => {
                                  updateRequest({
                                    ...activeRequest,
                                    method: m,
                                  });
                                  setShowMethodPicker(false);
                                }}
                                className={`w-full px-3 py-1.5 text-[10px] font-bold text-left hover:bg-accent transition-colors ${getMethodColor(m)}`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                {(activeRequest.protocol === "graphql" ||
                  activeRequest.protocol === "soap") && (
                  <div className="px-3 h-full flex items-center border-r border-border">
                    <span
                      className={`text-[10px] font-extrabold ${getProtocolColor(activeRequest.protocol)}`}
                    >
                      {getProtocolBadge(activeRequest.protocol)}
                    </span>
                  </div>
                )}
                {isRealtime && (
                  <div className="px-3 h-full flex items-center border-r border-border">
                    <span
                      className={`text-[10px] font-extrabold ${getProtocolColor(activeRequest.protocol)}`}
                    >
                      {getProtocolBadge(activeRequest.protocol)}
                    </span>
                  </div>
                )}

                <EnvAutocompleteInput
                  value={activeRequest.url}
                  onChange={(url) => updateRequest({ ...activeRequest, url })}
                  variables={(activeEnv?.variables || [])
                    .filter((v) => v.enabled)
                    .map((v) => ({ key: v.key, value: v.value }))}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isRealtime && sendRequest()
                  }
                  placeholder={getUrlPlaceholder()}
                  className="flex-1 h-full px-3 text-[10px] font-mono bg-transparent focus:outline-none placeholder:text-muted-foreground/20 min-w-0"
                />

                {!isRealtime && sidebarCollapsed && (
                  <button
                    onClick={() =>
                      setSplitDirection((d) =>
                        d === "vertical" ? "horizontal" : "vertical",
                      )
                    }
                    className="px-2 h-full transition-colors border-l border-border text-muted-foreground hover:text-foreground"
                    title={
                      effectiveSplit === "vertical"
                        ? "Horizontal split"
                        : "Vertical split"
                    }
                  >
                    {effectiveSplit === "vertical" ? (
                      <SplitSquareVertical className="h-3 w-3" />
                    ) : (
                      <SplitSquareHorizontal className="h-3 w-3" />
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    setUseProxy(!useProxy);
                    toast.success(
                      useProxy ? "Proxy disabled" : "Proxy enabled",
                    );
                  }}
                  className={`px-2 h-full transition-colors border-l border-border ${useProxy ? "text-status-success" : "text-muted-foreground hover:text-foreground"}`}
                  title={useProxy ? "CORS Proxy: ON" : "CORS Proxy: OFF"}
                >
                  {useProxy ? (
                    <Shield className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldOff className="h-3.5 w-3.5" />
                  )}
                </button>

                {isRealtime ? (
                  <button
                    onClick={toggleRealtimeConnection}
                    className={`flex items-center gap-1 px-4 h-full text-[10px] font-bold transition-colors shrink-0 ${isCurrentConnected ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                  >
                    {isCurrentConnected ? (
                      <>
                        <Unplug className="h-3 w-3" />
                        {!isMobile && "Disconnect"}
                      </>
                    ) : (
                      <>
                        <Plug className="h-3 w-3" />
                        {!isMobile && "Connect"}
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={sendRequest}
                    disabled={loading[activeRequest.id]}
                    className="flex items-center gap-1 px-4 h-full bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                  >
                    <Send className="h-3 w-3" />
                    {!isMobile && "Send"}
                  </button>
                )}
              </div>

              {/* Content area */}
              {WS_IO_PROTOCOLS.includes(activeRequest.protocol) && (
                <RealtimePanel ref={realtimeRef} url={activeRequest.url} />
              )}
              {activeRequest.protocol === "sse" && (
                <SSEPanel ref={sseRef} url={activeRequest.url} />
              )}
              {activeRequest.protocol === "graphql" && (
                <div
                  className={`flex-1 flex overflow-hidden ${effectiveSplit === "horizontal" ? "flex-row" : "flex-col"}`}
                >
                  <div
                    className={`${effectiveSplit === "horizontal" ? "w-1/2 border-r" : "flex-1 border-b"} border-border overflow-auto bg-surface-sunken`}
                  >
                    <GraphQLPanel
                      request={activeRequest}
                      onChange={updateRequest}
                    />
                  </div>
                  <div
                    className={`${effectiveSplit === "horizontal" ? "w-1/2" : "flex-1"} flex flex-col overflow-hidden min-h-0`}
                  >
                    <ResponsePanel
                      response={responses[activeRequest.id] || null}
                      loading={loading[activeRequest.id] || false}
                      testResults={testResults[activeRequest.id] || []}
                      onAction={handleResponseAction}
                    />
                  </div>
                </div>
              )}
              {(activeRequest.protocol === "rest" ||
                activeRequest.protocol === "soap") && (
                <div
                  className={`flex-1 flex overflow-hidden ${effectiveSplit === "horizontal" ? "flex-row" : "flex-col"}`}
                >
                  {responseMode !== "expanded" && (
                    <div
                      className={`${responseMode === "collapsed" ? "flex-1" : effectiveSplit === "horizontal" ? "w-1/2 border-r" : "flex-1 border-b"} border-border overflow-hidden`}
                    >
                      <RequestTabs
                        request={activeRequest}
                        onChange={updateRequest}
                      />
                    </div>
                  )}
                  <div
                    className={`${responseMode === "expanded" ? "flex-1" : responseMode === "collapsed" ? "shrink-0" : effectiveSplit === "horizontal" ? "w-1/2" : "flex-1"} flex flex-col overflow-hidden min-h-0`}
                  >
                    <ResponsePanel
                      response={responses[activeRequest.id] || null}
                      loading={loading[activeRequest.id] || false}
                      testResults={testResults[activeRequest.id] || []}
                      onAction={handleResponseAction}
                      responseMode={responseMode}
                      onResponseModeChange={setResponseMode}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-3 h-[24px] border-t border-border bg-surface-elevated shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Keyboard className="h-2.5 w-2.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
          {activeEnv && (
            <span className="text-[9px] font-bold text-muted-foreground">
              Env: <span className="text-status-success">{activeEnv.name}</span>
            </span>
          )}
          {useProxy && (
            <span className="text-[9px] font-bold text-status-success">
              Proxy ON
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (agentStatus === "not-installed")
                window.open(
                  "https://github.com/somritdasgupta/queFork",
                  "_blank",
                );
            }}
            className={`flex items-center gap-1 text-[9px] font-bold transition-colors ${agentCfg.color}`}
            title={
              agentStatus === "active" ? "Agent running" : "Click to install"
            }
          >
            {agentStatus === "active" && (
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
            )}
            <agentCfg.icon className="h-2.5 w-2.5" />
            <span className="hidden sm:inline">{agentCfg.label}</span>
          </button>
          <span className="text-[9px] text-muted-foreground/20">|</span>
          <span className="text-[9px] text-muted-foreground/40 font-bold">
            by{" "}
            <a
              href="https://github.com/somritdasgupta"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              somritdasgupta
            </a>
          </span>
          <a
            href="https://github.com/somritdasgupta/queFork"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/40 hover:text-foreground transition-colors"
            title="View on GitHub"
            aria-label="View on GitHub"
          >
            <Github className="h-2.5 w-2.5" />
          </a>
          <a
            href="https://linkedin.com/in/somritdasgupta"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/40 hover:text-foreground transition-colors"
            title="Connect on LinkedIn"
            aria-label="Connect on LinkedIn"
          >
            <Linkedin className="h-2.5 w-2.5" />
          </a>
        </div>
      </footer>

      {/* ── Save to Collection Dialog ─────────────────────────────── */}
      {showSaveToCollection && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={() => setShowSaveToCollection(false)}
        >
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />
          <div
            className="relative w-full max-w-[300px] mx-4 bg-card border border-border shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-10 border-b border-border">
              <h3 className="text-[12px] font-black text-foreground">
                Save to Collection
              </h3>
              <button
                onClick={() => setShowSaveToCollection(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {workspace.collections.length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-6 text-center font-bold">
                  No collections. Create one first.
                </p>
              ) : (
                workspace.collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => saveToCollection(c.id)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-accent transition-colors border-b border-border"
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-foreground">
                        {c.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {c.requests.length} requests
                      </p>
                    </div>
                    {c.requests.find((r) => r.id === activeRequest.id) && (
                      <span className="text-[8px] font-bold text-status-success">
                        UPDATE
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile sidebar ─────────────────────────────────────────── */}
      {isMobile && showMobileSidebar && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end animate-fade-in"
          onClick={() => setShowMobileSidebar(false)}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
          <div
            className="relative bg-card border-t border-border max-h-[75vh] animate-slide-up flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center py-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-0 px-1 border-b border-border shrink-0 h-[37px] w-full">
                  {PROTOCOLS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() =>
                        updateRequest({
                          ...activeRequest,
                          protocol: p.value,
                          body: {
                            ...activeRequest.body,
                            type:
                              p.value === "graphql"
                                ? "graphql"
                                : p.value === "soap"
                                  ? "xml"
                                  : activeRequest.body.type,
                          },
                        })
                      }
                      className={`flex items-center justify-center gap-1 flex-1 h-full text-[9px] font-bold transition-colors ${activeRequest.protocol === p.value ? "bg-primary/10 text-primary" : "text-muted-foreground/40 hover:text-foreground"}`}
                      title={p.label}
                    >
                      <p.icon className="h-3 w-3" />
                      {activeRequest.protocol === p.value && (
                        <span>{p.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex border-b border-border h-[37px] shrink-0 w-full">
                  {sidebarNavItems.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setSidebarTab(t.key)}
                      className={`flex items-center justify-center gap-1 flex-1 text-[9px] font-bold border-b-2 transition-all ${sidebarTab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground/40 hover:text-foreground"}`}
                    >
                      <t.icon className="h-3 w-3 shrink-0" />
                      {sidebarTab === t.key && <span>{t.label}</span>}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-hidden">
                  {sidebarTab === "collections" && (
                    <CollectionPanel
                      collections={workspace.collections}
                      onChange={(c) =>
                        setWorkspace((prev) => ({ ...prev, collections: c }))
                      }
                      onOpenRequest={openRequest}
                    />
                  )}
                  {sidebarTab === "environments" && (
                    <EnvironmentPanel
                      environments={workspace.environments}
                      onChange={(e) =>
                        setWorkspace((prev) => ({ ...prev, environments: e }))
                      }
                    />
                  )}
                  {sidebarTab === "history" && (
                    <HistoryList
                      history={history}
                      onSelect={loadFromHistory}
                      onClear={() => setHistory([])}
                      historyEnabled={historyEnabled}
                      onToggleHistory={() => setHistoryEnabled((p) => !p)}
                    />
                  )}
                  {sidebarTab === "flows" && (
                    <FlowPanel
                      flows={flows}
                      onChange={setFlows}
                      collections={workspace.collections}
                      tabs={tabs}
                      activeEnv={activeEnv}
                      useProxy={useProxy}
                      onExecuteFlowRequest={executeFlowRequest}
                      onUpdateFlowTab={updateFlowTab}
                      onCreateCollection={flowCreateCollection}
                      onAddRequestToCollection={flowAddRequestToCollection}
                      onUpdateRequestInCollection={
                        flowUpdateRequestInCollection
                      }
                      onDeleteRequestFromCollection={
                        flowDeleteRequestFromCollection
                      }
                      onDeleteCollection={flowDeleteCollection}
                      onRenameCollection={flowRenameCollection}
                      onCreateEnvironment={flowCreateEnvironment}
                      onSwitchEnvironment={flowSwitchEnvironment}
                      onSetEnvVariable={flowSetEnvVariable}
                      onRemoveEnvVariable={flowRemoveEnvVariable}
                      onDeleteEnvironment={flowDeleteEnvironment}
                      onRenameEnvironment={flowRenameEnvironment}
                      onSaveCollection={(name, reqs) => {
                        const c = createEmptyCollection(name);
                        c.requests = reqs;
                        setWorkspace((prev) => ({
                          ...prev,
                          collections: [...prev.collections, c],
                        }));
                        toast.success(`Collection "${name}" saved`);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ExportDialog
        request={activeRequest}
        isOpen={showExport}
        onClose={() => setShowExport(false)}
      />
      <ImportDialog
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />
      <CommandPalette
        isOpen={showCommand}
        onClose={() => setShowCommand(false)}
        actions={commandActions}
      />
      <ShortcutsPanel
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

// ── History List (grouped by date) ──────────────────────────────────────
function getDateLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (itemDate.getTime() === today.getTime()) return "Today";
  if (itemDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function HistoryList({
  history,
  onSelect,
  onClear,
  historyEnabled,
  onToggleHistory,
}: {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  historyEnabled: boolean;
  onToggleHistory: () => void;
}) {
  const grouped = React.useMemo(() => {
    const groups: { label: string; items: HistoryItem[] }[] = [];
    let currentLabel = "";
    for (const item of history) {
      const label = getDateLabel(item.timestamp);
      if (label !== currentLabel) {
        groups.push({ label, items: [item] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }, [history]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
            History
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleHistory}
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
              historyEnabled
                ? "bg-status-success/15 text-status-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {historyEnabled ? "ON" : "OFF"}
          </button>
          {history.length > 0 && (
            <button
              onClick={onClear}
              className="px-2 py-0.5 rounded-full text-[9px] font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!historyEnabled && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-md bg-destructive/5 border border-destructive/10">
            <p className="text-[9px] font-bold text-destructive/60">
              Recording paused
            </p>
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.label}>
            <div className="px-4 py-1.5 bg-surface-sunken/50 border-b border-border sticky top-0 z-10">
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/40">
                {group.label}
              </span>
            </div>
            <div className="px-2 py-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-accent/70 transition-all text-left group mb-0.5"
                >
                  <span
                    className={`text-[9px] font-extrabold shrink-0 min-w-[42px] ${getMethodColor(item.request.method)}`}
                  >
                    {item.request.method}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono font-semibold truncate text-foreground/90 group-hover:text-foreground transition-colors">
                      {item.request.url}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.response && (
                        <span
                          className={`text-[9px] font-bold ${item.response.error ? "text-destructive" : getStatusColor(item.response.status)}`}
                        >
                          {item.response.error ? "Error" : item.response.status}
                        </span>
                      )}
                      <span className="text-[8px] text-muted-foreground/30 font-medium">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {history.length === 0 && historyEnabled && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Clock className="h-6 w-6 text-muted-foreground/15" />
            <p className="text-[10px] text-muted-foreground/30 font-bold">
              No history yet
            </p>
            <p className="text-[9px] text-muted-foreground/20">
              Send a request to start recording
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
