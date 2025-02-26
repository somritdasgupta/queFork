"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { PANEL_SIZING } from "@/lib/constants";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import {
  ResizablePanel,
  ResizableHandle,
  ResizablePanelGroup,
} from "@/components/resizable-panel";
import {
  KeyValuePair,
  RequestBody,
  HistoryItem,
  Collection,
  SavedRequest,
  Environment,
  SidePanelProps,
  ImportSource,
  RequestPanelProps,
  ResponsePanelProps,
  Tab, // Add this
} from "@/types";
import { EnvironmentPanelRef } from "@/components/environment-panel";
import { v4 as uuidv4 } from "uuid";
import Footer from "@/components/footer";
import { useWebSocket } from "@/components/websocket/websocket-context";
import saveAs from "file-saver";
import { UrlBar } from "@/components/url-bar";
import { EnvironmentSelector } from "@/components/environment-selector";
import { importFromUrl, parseImportData } from "@/lib/import-utils";
import { useAPIInterceptor } from "@/components/APIInterceptor";
import { TabProvider, TabBar, useTabManager } from "@/components/tab-manager";
import { TabWebSocketProvider } from "@/components/websocket/tab-websocket-provider";
import TabWebSocketManager from "@/components/websocket/tab-websocket-manager";
import { getEmptyTabState } from "@/lib/tab-utils";
import { cn } from "@/lib/utils";
import { DesktopHeader } from "@/components/desktop-header";
import { MobileHeader } from "@/components/mobile-header";

// Properly type the dynamic imports
const RequestPanel = dynamic<RequestPanelProps>(
  () => import("@/components/request-panel").then((mod) => mod.RequestPanel),
  {
    loading: () => <div className="w-full h-full bg-slate-900/50" />,
  }
);

const ResponsePanel = dynamic<ResponsePanelProps>(
  () => import("@/components/response-panel").then((mod) => mod.ResponsePanel),
  {
    loading: () => <div className="w-full h-full bg-slate-900/50" />,
  }
);

const SidePanel = dynamic<SidePanelProps>(
  () => import("@/components/side-panel").then((mod) => mod.default),
  {
    loading: () => <div className="w-full h-full bg-slate-900/50" />,
  }
);

const MAX_HISTORY_ITEMS = 500;
const cleanupStorage = () => {
  try {
    // Remove oldest history items
    const history = JSON.parse(localStorage.getItem("apiHistory") || "[]");
    const newHistory = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem("apiHistory", JSON.stringify(newHistory));

    // If still exceeding quota, clear less important data
    const keys = Object.keys(localStorage);
    for (let key of keys) {
      if (key !== "apiHistory") {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error("Storage cleanup failed:", error);
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      cleanupStorage();
      try {
        localStorage.setItem(key, value);
      } catch (retryError) {
        toast.error("Storage limit reached. Unable to save history.");
        console.error("Storage retry failed:", retryError);
      }
    } else {
      console.error("Storage error:", error);
    }
  }
};

export default function Page() {
  return (
    <TabProvider>
      <main className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col bg-slate-900">
          <TabContent />
        </div>
      </main>
    </TabProvider>
  );
}

function TabContent() {
  const { tabs, activeTab } = useTabManager();

  return (
    <>
      {tabs.map((tab) => (
        <TabWebSocketManager key={tab.id} tabId={tab.id}>
          <div className={tab.id === activeTab ? "block" : "hidden"}>
            <MainContentWrapper tab={tab} />
          </div>
        </TabWebSocketManager>
      ))}
    </>
  );
}

function MainContentWrapper({ tab }: { tab: Tab }): JSX.Element {
  const { tabs, activeTab, updateTab } = useTabManager();
  const currentTab = tabs.find((t) => t.id === activeTab);

  const defaultTabState = {
    method: "GET",
    url: "",
    headers: [
      { key: "", value: "", enabled: true, showSecrets: false, type: "" },
    ],
    params: [
      { key: "", value: "", enabled: true, showSecrets: false, type: "" },
    ],
    body: { type: "none" as const, content: "" },
    auth: { type: "none" as const },
    isWebSocketMode: false,
    response: null,
    isLoading: false,
    wsState: {
      isConnected: false,
      connectionStatus: "disconnected" as const,
      messages: [],
    },
  };

  // Use currentTab.state with fallback to defaultTabState
  const tabState = currentTab?.state ?? defaultTabState;

  const {
    hasExtension,
    interceptorEnabled,
    toggleInterceptor,
    interceptRequest,
  } = useAPIInterceptor({
    onRequestIntercept: async (request) => {
      try {
        const response = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        return response.json();
      } catch (error) {
        console.error("Proxy request failed:", error);
        throw error;
      }
    },
  });

  // Update handlers to work with current tab's state
  const handleStateUpdate = useCallback(
    (updates: Partial<Tab["state"]>) => {
      if (!currentTab) return;

      // Batch multiple state updates
      React.startTransition(() => {
        updateTab(currentTab.id, {
          state: { ...currentTab.state, ...updates },
          unsaved: true,
        });
      });
    },
    [currentTab, updateTab]
  );

  // Rest of your state declarations...
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    {
      key: "",
      value: "",
      enabled: true,
      showSecrets: false,
      type: "",
    },
  ]);
  const [params, setParams] = useState<KeyValuePair[]>([
    {
      key: "",
      value: "",
      enabled: true,
      showSecrets: false,
      type: "",
    },
  ]);
  const [body, setBody] = useState<RequestBody>({ type: "none", content: "" });
  const [auth, setAuth] = useState<
    | { type: "none" }
    | { type: "bearer"; token: string }
    | { type: "basic"; username: string; password: string }
    | { type: "apiKey"; key: string }
  >({ type: "none" });
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([
    {
      id: "global",
      name: "Global",
      variables: [],
      global: true,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
  ]);
  const [currentEnvironment, setCurrentEnvironment] =
    useState<Environment | null>(null);
  const [isHistorySavingEnabled, setIsHistorySavingEnabled] = useState(true);
  const [mergedEnvVariables, setMergedEnvVariables] = useState<
    { key: string; value: string }[]
  >([]);
  const environmentPanelRef = useRef<EnvironmentPanelRef>(null);
  const [isWebSocketOpen, setIsWebSocketOpen] = useState(false);
  const [wsUrl, setWsUrl] = useState("");
  const [webSocketUrl, setWebSocketUrl] = useState("");
  const [webSocketProtocols, setWebSocketProtocols] = useState<string[]>([]);
  const { isConnected: wsConnected, disconnect } = useWebSocket();
  const [isWebSocketMode, setIsWebSocketMode] = useState(false);
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<
    "collections" | "history" | "environments"
  >("collections");
  const [preRequestScript, setPreRequestScript] = useState<string | null>(null);
  const [testScript, setTestScript] = useState<string | null>(null);
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    const loadSavedEnvironments = () => {
      try {
        const savedEnvironments = localStorage.getItem("que-environments");
        let envs: Environment[] = [];

        if (savedEnvironments) {
          const parsed = JSON.parse(savedEnvironments);
          envs = parsed.map((env: Environment) => ({
            ...env,
            variables: Array.isArray(env.variables)
              ? env.variables.filter((v) => v.key.trim() !== "")
              : [],
            lastModified: env.lastModified || new Date().toISOString(),
          }));
        }

        // Create default environment if no environments exist
        if (!envs || envs.length === 0) {
          const defaultEnv: Environment = {
            id: "default",
            name: "Default",
            variables: [],
            global: true,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          };
          envs = [defaultEnv];
        }

        // Save cleaned environments back to localStorage
        localStorage.setItem("que-environments", JSON.stringify(envs));

        // Update state
        setEnvironments(envs);

        // Set current environment if not set
        const savedCurrentEnvId = localStorage.getItem(
          "que-current-environment"
        );
        const currentEnv = savedCurrentEnvId
          ? envs.find((env) => env.id === savedCurrentEnvId)
          : envs[0];
        setCurrentEnvironment(currentEnv || envs[0]);
      } catch (error) {
        console.error("Error loading environments:", error);
        createDefaultEnvironment();
      }
    };

    // Load collections
    const savedCollections = localStorage.getItem("apiCollections");
    if (savedCollections) {
      setCollections(JSON.parse(savedCollections));
    }

    // Load history
    const savedHistory = localStorage.getItem("apiHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    loadSavedEnvironments();
  }, []); // Run only on mount

  const createDefaultEnvironment = () => {
    const defaultEnv: Environment = {
      id: "default",
      name: "Default",
      variables: [],
      global: true,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    setEnvironments([defaultEnv]);
    setCurrentEnvironment(defaultEnv);
    localStorage.setItem("que-environments", JSON.stringify([defaultEnv]));
  };

  useEffect(() => {
    const updateMergedVariables = () => {
      if (environmentPanelRef.current) {
        const merged = environmentPanelRef.current
          .getMergedEnvironmentVariables()
          .filter((v) => v.key.trim() && v.value.trim()); // Only count valid pairs
        setMergedEnvVariables(merged);
      }
    };

    // Initial update
    updateMergedVariables();

    // Add event listener for environment updates
    window.addEventListener("environmentUpdated", updateMergedVariables);

    return () => {
      window.removeEventListener("environmentUpdated", updateMergedVariables);
    };
  }, [environments, currentEnvironment]);

  useEffect(() => {
    const handleWebSocketOpen = (event: CustomEvent) => {
      setWebSocketUrl(event.detail.url);
      setWebSocketProtocols(event.detail.protocols || []);
      setIsWebSocketOpen(true);
    };

    window.addEventListener(
      "openWebSocket",
      handleWebSocketOpen as EventListener
    );
    return () => {
      window.removeEventListener(
        "openWebSocket",
        handleWebSocketOpen as EventListener
      );
    };
  }, []);

  useEffect(() => {
    // Load recent URLs from localStorage
    const saved = localStorage.getItem("recent-urls");
    if (saved) {
      setRecentUrls(JSON.parse(saved));
    }
  }, []);

  const executeRequest = async () => {
    if (!currentTab) return;

    try {
      // Use tabState instead of local state
      const queryString = tabState.params
        .filter((p) => p.key && p.value && p.enabled)
        .map(
          (p) =>
            `${encodeURIComponent(p.key)}=${encodeURIComponent(replaceEnvironmentVariables(p.value))}`
        )
        .join("&");

      const requestHeaders: Record<string, string> = {};
      tabState.headers
        .filter((h) => h.key && h.value && h.enabled)
        .forEach((h) => {
          requestHeaders[h.key] = replaceEnvironmentVariables(h.value);
        });

      // Add auth headers with null checks and type guards
      if (
        tabState.auth.type === "bearer" &&
        "token" in tabState.auth &&
        tabState.auth.token
      ) {
        requestHeaders["Authorization"] =
          `Bearer ${replaceEnvironmentVariables(tabState.auth.token)}`;
      } else if (
        tabState.auth.type === "basic" &&
        "username" in tabState.auth &&
        "password" in tabState.auth &&
        tabState.auth.username &&
        tabState.auth.password
      ) {
        requestHeaders["Authorization"] = `Basic ${btoa(
          `${replaceEnvironmentVariables(tabState.auth.username)}:${replaceEnvironmentVariables(tabState.auth.password)}`
        )}`;
      } else if (
        tabState.auth.type === "apiKey" &&
        "key" in tabState.auth &&
        tabState.auth.key
      ) {
        requestHeaders["X-API-Key"] = replaceEnvironmentVariables(
          tabState.auth.key
        );
      }

      const fullUrl = `${replaceEnvironmentVariables(tabState.url)}${queryString ? `?${queryString}` : ""}`;

      const requestObj = {
        method: tabState.method,
        url: fullUrl,
        headers: requestHeaders,
        body: tabState.body.type !== "none" ? tabState.body.content : undefined,
      };

      // Use interceptor or direct proxy based on hasExtension
      let responseData;
      if (hasExtension && interceptorEnabled) {
        responseData = await interceptRequest(requestObj);
        responseData = {
          ...responseData,
          intercepted: true,
        };
      } else {
        const response = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestObj),
        });
        responseData = await response.json();
        responseData.intercepted = false;
      }

      return responseData;
    } catch (error) {
      throw error;
    }
  };

  const handleSendRequest = async () => {
    if (!currentTab) return;

    handleStateUpdate({ isLoading: true });

    try {
      // Validation checks...
      if (!tabState.url) {
        toast.error("Please enter a URL");
        return;
      }

      // Check for unresolved variables
      const unresolvedVars = (
        tabState.url.match(/\{\{([^}]+)\}\}/g) || []
      ).filter((match) => {
        const key = match.slice(2, -2);
        return !mergedEnvVariables.find((v) => v.key === key);
      });

      if (unresolvedVars.length > 0) {
        toast.error(
          `Missing environment variables: ${unresolvedVars.join(", ")}`
        );
        return;
      }

      const startTime = Date.now();
      const response = await executeRequest();
      const endTime = Date.now();

      if (response) {
        const finalResponse = {
          ...response,
          time: `${endTime - startTime}ms`,
          timestamp: new Date().toISOString(),
        };

        // Update tab state with response
        handleStateUpdate({
          response: finalResponse,
          isLoading: false,
        });

        // Handle history and other side effects...
        if (isHistorySavingEnabled) {
          const historyItem: HistoryItem = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            type: tabState.isWebSocketMode ? "websocket" : "rest",
            method: tabState.method,
            url: tabState.url,
            request: {
              headers: tabState.headers,
              params: tabState.params,
              body: tabState.body,
              auth: tabState.auth,
              preRequestScript: preRequestScript || "",
              testScript: testScript || "",
              testResults: testResults || [],
              scriptLogs: scriptLogs || [],
            },
            response: finalResponse,
          };

          setHistory((prev) => {
            const newHistory = [historyItem, ...prev].slice(
              0,
              MAX_HISTORY_ITEMS
            );
            safeSetItem("apiHistory", JSON.stringify(newHistory));
            return newHistory;
          });
        }

        toast.success(`${tabState.method} request successful`);
      }
    } catch (error) {
      handleStateUpdate({ isLoading: false });
      console.error("Request failed:", error);
      toast.error(error instanceof Error ? error.message : "Request failed");
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("apiHistory");
    toast.success("History cleared");
  };

  const handleLoadRequest = (request: SavedRequest) => {
    setMethod(request.method);
    setUrl(request.url);
    setHeaders(request.headers);
    setParams(request.params);
    if (request.body) {
      setBody(request.body);
    }
    if (request.auth) {
      const auth = request.auth;
      switch (auth.type) {
        case "bearer":
          if (auth.token) setAuth({ type: "bearer", token: auth.token });
          break;
        case "basic":
          if (auth.username && auth.password)
            setAuth({
              type: "basic",
              username: auth.username,
              password: auth.password,
            });
          break;
        case "apiKey":
          if (auth.key) setAuth({ type: "apiKey", key: auth.key });
          break;
        case "none":
          setAuth({ type: "none" });
          break;
      }
    }
  };

  const handleLoadHistoryItem = useCallback(
    (item: HistoryItem) => {
      // Update tab state in a single batch
      handleStateUpdate({
        method: item.method,
        url: item.url,
        headers: item.request.headers,
        params: item.request.params,
        body: item.request.body,
        auth: ((): Tab["state"]["auth"] => {
          const auth = item.request.auth;
          switch (auth?.type) {
            case "bearer":
              return { type: "bearer", token: auth.token || "" };
            case "basic":
              return {
                type: "basic",
                username: auth.username || "",
                password: auth.password || "",
              };
            case "apiKey":
              return { type: "apiKey", key: auth.key || "" };
            default:
              return { type: "none" };
          }
        })(),
        response: item.response,
        isWebSocketMode: item.type === "websocket",
      });

      // Update scripts
      if (item.request) {
        setPreRequestScript(item.request.preRequestScript || "");
        setTestScript(item.request.testScript || "");
        setTestResults(item.request.testResults || []);
        setScriptLogs(item.request.scriptLogs || []);

        // Update active request
        (window as any).__ACTIVE_REQUEST__ = {
          ...item.request,
          preRequestScript: item.request.preRequestScript,
          testScript: item.request.testScript,
          testResults: item.request.testResults,
          scriptLogs: item.request.scriptLogs,
        };
      }

      // Handle WebSocket specific setup if needed
      if (item.type === "websocket" && item.url) {
        window.dispatchEvent(
          new CustomEvent("setWebSocketProtocol", {
            detail: {
              url: item.url,
              protocol: item.wsStats?.protocols?.[0] || "websocket",
            },
          })
        );
      }
    },
    [handleStateUpdate]
  );

  const saveCollections = (newCollections: Collection[]) => {
    setCollections(newCollections);
    localStorage.setItem("apiCollections", JSON.stringify(newCollections));
  };

  const handleCreateCollection = (collection: Partial<Collection>) => {
    const newCollection: Collection = {
      id: uuidv4(),
      name: collection.name || "New Collection",
      description: collection.description || "",
      apiVersion: collection.apiVersion || "",
      requests: [],
      lastModified: new Date().toISOString(),
    };
    saveCollections([...collections, newCollection]);
  };

  const handleSaveRequest = (
    collectionId: string,
    request: Partial<SavedRequest>
  ) => {
    const newRequest: SavedRequest = {
      id: uuidv4(),
      name: request.name || "New Request",
      method,
      url,
      headers,
      params,
      body,
      auth,
      statusCode: undefined,
      timestamp: 0,
      preRequestScript: "",
      testScript: "",
      testResults: [],
      scriptLogs: [],
    };
    const newCollections = collections.map((collection) => {
      if (collection.id === collectionId) {
        return {
          ...collection,
          requests: [...collection.requests, newRequest],
        };
      }
      return collection;
    });
    saveCollections(newCollections);
  };

  const handleDeleteCollection = (collectionId: string) => {
    const newCollections = collections.filter(
      (collection) => collection.id !== collectionId
    );
    saveCollections(newCollections);
  };

  const handleDeleteRequest = (collectionId: string, requestId: string) => {
    const newCollections = collections.map((collection) => {
      if (collection.id === collectionId) {
        return {
          ...collection,
          requests: collection.requests.filter(
            (request) => request.id !== requestId
          ),
        };
      }
      return collection;
    });
    saveCollections(newCollections);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem("apiHistory", JSON.stringify(newHistory));
  };

  const handleEnvironmentChange = (environmentId: string) => {
    const selectedEnvironment =
      environments.find((env) => env.id === environmentId) || null;
    setCurrentEnvironment(selectedEnvironment);
    localStorage.setItem("que-current-environment", environmentId);
  };

  const handleEnvironmentsUpdate = (updatedEnvironments: Environment[]) => {
    setEnvironments(updatedEnvironments);
    localStorage.setItem(
      "que-environments",
      JSON.stringify(updatedEnvironments)
    );

    // Update current environment if it was deleted
    if (
      currentEnvironment &&
      !updatedEnvironments.find((env) => env.id === currentEnvironment.id)
    ) {
      const firstEnv = updatedEnvironments[0] || null;
      setCurrentEnvironment(firstEnv);
    }

    // Dispatch event to trigger variable update
    window.dispatchEvent(new Event("environmentUpdated"));
  };

  const replaceEnvironmentVariables = (value: string): string => {
    return value.replace(/\{\{(.+?)\}\}/g, (_, key) => {
      const variable = mergedEnvVariables.find((v) => v.key === key);
      return variable ? variable.value : `{{${key}}}`;
    });
  };

  const toggleHistorySaving = (enabled: boolean) => {
    setIsHistorySavingEnabled(enabled);
  };

  const handleExportCollections = () => {
    const data = JSON.stringify(collections, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    saveAs(blob, "collections.json");
  };

  const handleExportHistory = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    saveAs(blob, "request-history.json");
  };

  const handleExportCollection = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (collection) {
      const data = JSON.stringify(collection, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      saveAs(
        blob,
        `${collection.name.toLowerCase().replace(/\s+/g, "-")}.json`
      );
    }
  };

  const handleAddToEnvironment = (key: string, value: string) => {
    if (!currentEnvironment) {
      toast.error("Please select an environment first");
      return;
    }

    const updatedEnvironments = environments.map((env) => {
      if (env.id === currentEnvironment.id) {
        return {
          ...env,
          variables: [
            ...env.variables,
            {
              key,
              value,
              type: "text" as const,
              enabled: true,
            },
          ],
          lastModified: new Date().toISOString(),
        };
      }
      return env;
    });

    handleEnvironmentsUpdate(updatedEnvironments);
    toast.success(`Added ${key} to ${currentEnvironment.name}`);
  };

  const handleUpdateCollections = (updatedCollections: Collection[]) => {
    // Update state
    setCollections(updatedCollections);
    // Persist to localStorage
    localStorage.setItem("apiCollections", JSON.stringify(updatedCollections));
    toast.success("Collections updated");
  };

  const handleImportCollections = async (
    source: ImportSource,
    data: string
  ) => {
    try {
      let importedCollections: Collection[];

      if (source === "url") {
        importedCollections = await importFromUrl(data);
      } else {
        importedCollections = parseImportData(source, data);
      }

      // Merge with existing collections
      const newCollections = [...collections, ...importedCollections];

      setCollections(newCollections);
      localStorage.setItem("apiCollections", JSON.stringify(newCollections));

      toast.success(
        `Successfully imported ${importedCollections.length} collection(s)`
      );
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import collections");
    }
  };

  const sidebarProps: SidePanelProps = {
    collections,
    history,
    onSelectRequest: handleLoadRequest,
    onSelectHistoryItem: handleLoadHistoryItem,
    onClearHistory: handleClearHistory,
    onCreateCollection: handleCreateCollection,
    onSaveRequest: handleSaveRequest,
    onDeleteCollection: handleDeleteCollection,
    onDeleteRequest: handleDeleteRequest,
    onDeleteHistoryItem: handleDeleteHistoryItem,
    isHistorySavingEnabled,
    onToggleHistorySaving: toggleHistorySaving,
    onExportCollections: handleExportCollections,
    onExportHistory: handleExportHistory,
    onExportCollection: handleExportCollection,
    environments,
    currentEnvironment,
    onEnvironmentChange: handleEnvironmentChange,
    onEnvironmentsUpdate: handleEnvironmentsUpdate,
    onUpdateCollections: handleUpdateCollections,
    onImportCollections: handleImportCollections,
    hasExtension,
    interceptorEnabled,
  };

  const onHeadersChange = (headers: KeyValuePair[]) => {
    handleStateUpdate({ headers });
  };

  const onParamsChange = (params: KeyValuePair[]) => {
    handleStateUpdate({ params });
  };

  const onBodyChange = (body: RequestBody) => {
    handleStateUpdate({ body });
  };

  const onAuthChange = (auth: Tab["state"]["auth"]) => {
    handleStateUpdate({ auth });
  };

  const onMethodChange = (method: string) => {
    handleStateUpdate({ method });
  };

  const onUrlChange = (url: string) => {
    handleStateUpdate({ url });
  };

  const requestPanelProps = {
    headers: tabState.headers || [],
    params: tabState.params || [],
    body: tabState.body || { type: "none", content: "" },
    auth: tabState.auth || { type: "none" },
    onHeadersChange,
    onParamsChange,
    onBodyChange,
    onAuthChange,
    isWebSocketMode: tabState.isWebSocketMode ?? false,
    environments,
    currentEnvironment,
    onEnvironmentChange: handleEnvironmentChange,
    onEnvironmentsUpdate: handleEnvironmentsUpdate,
    onAddToEnvironment: handleAddToEnvironment,
  };

  const [panelState, setPanelState] = useState<
    "expanded" | "collapsed" | "fullscreen"
  >("expanded");

  const handlePanelStateChange = () => {
    setPanelState((current) => {
      switch (current) {
        case "expanded":
          return "fullscreen"; // Goes to fullscreen first
        case "fullscreen":
          return "collapsed"; // Then collapses
        case "collapsed":
          return "expanded"; // Finally back to expanded
        default:
          return "expanded";
      }
    });
  };

  const responsePanelProps = {
    response: tabState.response || null,
    isLoading: tabState.isLoading ?? false,
    collections,
    onSaveToCollection: handleSaveRequest,
    method: tabState.method || "GET",
    url: tabState.url || "",
    isWebSocketMode: tabState.isWebSocketMode ?? false,
    panelState,
    onPanelStateChange: handlePanelStateChange,
  };

  // Define mobile nav props
  const mobileNavProps: SidePanelProps = {
    collections,
    history,
    onSelectRequest: handleLoadRequest,
    onSelectHistoryItem: handleLoadHistoryItem,
    onClearHistory: handleClearHistory,
    onCreateCollection: handleCreateCollection,
    onSaveRequest: handleSaveRequest,
    onDeleteCollection: handleDeleteCollection,
    onDeleteRequest: handleDeleteRequest,
    onDeleteHistoryItem: handleDeleteHistoryItem,
    isHistorySavingEnabled,
    onToggleHistorySaving: setIsHistorySavingEnabled,
    onExportCollections: handleExportCollections,
    onExportHistory: handleExportHistory,
    onExportCollection: handleExportCollection,
    environments,
    currentEnvironment,
    onEnvironmentChange: handleEnvironmentChange,
    onEnvironmentsUpdate: handleEnvironmentsUpdate,
    onUpdateCollections: handleUpdateCollections,
    onImportCollections: handleImportCollections,
    isMobile: true,
    hasExtension,
    interceptorEnabled,
  };

  useEffect(() => {
    const computeMergedVariables = () => {
      let merged: { key: string; value: string; type?: "text" | "secret" }[] =
        [];
      const globalEnv = environments.find((env) => env.global);
      if (globalEnv) {
        merged.push(...globalEnv.variables.filter((v) => v.enabled));
      }
      if (currentEnvironment && !currentEnvironment.global) {
        currentEnvironment.variables
          .filter((v) => v.enabled)
          .forEach((v) => {
            const index = merged.findIndex((mv) => mv.key === v.key);
            if (index !== -1) {
              merged[index] = v;
            } else {
              merged.push(v);
            }
          });
      }

      // Filtering out any empty keys
      merged = merged.filter((v) => v.key.trim() !== "");

      setMergedEnvVariables(merged);
    };

    computeMergedVariables();

    // Also compute when environment is updated
    window.addEventListener("environmentUpdated", computeMergedVariables);
    return () => {
      window.removeEventListener("environmentUpdated", computeMergedVariables);
    };
  }, [environments, currentEnvironment]);

  const mergedEnvironmentVariables = useMemo(() => {
    const variableMap = new Map();

    // Process global environment first
    const globalEnv = environments.find((env) => env.global);
    if (globalEnv) {
      globalEnv.variables
        .filter((v) => v.enabled && v.key.trim())
        .forEach((v) => variableMap.set(v.key, v));
    }

    // Override with current environment variables
    if (currentEnvironment && !currentEnvironment.global) {
      currentEnvironment.variables
        .filter((v) => v.enabled && v.key.trim())
        .forEach((v) => variableMap.set(v.key, v));
    }

    return Array.from(variableMap.values());
  }, [environments, currentEnvironment]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (recentUrls.length > 0) {
        localStorage.setItem("recent-urls", JSON.stringify(recentUrls));
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [recentUrls]);

  const webSocket = useWebSocket();

  const urlBarProps = {
    method: tabState.method || "GET",
    url: tabState.url || "",
    isLoading: tabState.isLoading ?? false,
    wsState: {
      isConnected: webSocket.isConnected,
      connectionStatus: webSocket.connectionStatus,
      messages: webSocket.messages,
    },
    isWebSocketMode: tabState.isWebSocketMode ?? false,
    variables: mergedEnvironmentVariables.map((v) => ({
      key: v.key,
      value: v.value,
      type: v.type,
    })),
    recentUrls,
    onMethodChange,
    onUrlChange,
    onSendRequest: handleSendRequest,
    onWebSocketToggle: () => {
      const newIsWebSocketMode = !tabState.isWebSocketMode;
      handleStateUpdate({
        isWebSocketMode: newIsWebSocketMode,
        // Reset WebSocket state when toggling mode
        wsState: newIsWebSocketMode
          ? {
              isConnected: false,
              connectionStatus: "disconnected",
              messages: [],
            }
          : undefined,
      });
    },
    onConnect: () => {
      if (tabState.isWebSocketMode && tabState.url) {
        // First update the WebSocket URL
        webSocket.onUrlChange(tabState.url);
        // Then initiate the connection
        setTimeout(() => webSocket.connect(), 0);
      }
    },
    onDisconnect: () => {
      if (tabState.isWebSocketMode && webSocket.isConnected) {
        webSocket.disconnect();
      }
    },
    hasExtension,
    interceptorEnabled,
    isMobile: false,
  };

  useEffect(() => {
    const handleResetRequest = (e: CustomEvent) => {
      const defaultState = getEmptyTabState();

      handleStateUpdate({
        ...defaultState,
        headers: [...defaultState.headers],
        params: [...defaultState.params],
        testResults: [],
        scriptLogs: [],
      });
      (window as any).__ACTIVE_REQUEST__ = null;
    };

    const handleLoadHistoryItem = (e: CustomEvent) => {
      const { detail } = e;

      if (detail.clearBeforeLoad) {
        // Resetting state first
        handleStateUpdate(getEmptyTabState());
      }

      // Small delay to ensure reset is complete
      setTimeout(() => {
        handleStateUpdate({
          method: detail.item.method || "GET",
          url: detail.item.url || "",
          headers: Array.isArray(detail.item.request.headers)
            ? [...detail.item.request.headers]
            : [
                {
                  key: "",
                  value: "",
                  enabled: true,
                  showSecrets: false,
                  type: "",
                },
              ],
          params: Array.isArray(detail.item.request.params)
            ? [...detail.item.request.params]
            : [
                {
                  key: "",
                  value: "",
                  enabled: true,
                  showSecrets: false,
                  type: "",
                },
              ],
          body: detail.item.request.body
            ? { ...detail.item.request.body }
            : { type: "none", content: "" },
          auth: detail.item.request.auth
            ? { ...detail.item.request.auth }
            : { type: "none" },
          response: detail.item.response ? { ...detail.item.response } : null,
          preRequestScript: detail.item.request.preRequestScript || "",
          testScript: detail.item.request.testScript || "",
          testResults: Array.isArray(detail.item.request.testResults)
            ? [...detail.item.request.testResults]
            : [],
          scriptLogs: Array.isArray(detail.item.request.scriptLogs)
            ? [...detail.item.request.scriptLogs]
            : [],
        });
      }, 0);
    };

    window.addEventListener(
      "resetRequest",
      handleResetRequest as EventListener
    );
    window.addEventListener(
      "loadHistoryItem",
      handleLoadHistoryItem as EventListener
    );

    return () => {
      window.removeEventListener(
        "resetRequest",
        handleResetRequest as EventListener
      );
      window.removeEventListener(
        "loadHistoryItem",
        handleLoadHistoryItem as EventListener
      );
    };
  }, [handleStateUpdate]);

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden">
      <header className="flex flex-col border-b border-slate-800 bg-slate-950/25 shrink-0">
        <div className="hidden 3xl:block">
          <DesktopHeader
            hasExtension={hasExtension}
            interceptorEnabled={interceptorEnabled}
            toggleInterceptor={toggleInterceptor}
            environments={environments}
            currentEnvironment={currentEnvironment}
            onEnvironmentChange={handleEnvironmentChange}
            urlBarProps={urlBarProps}
          />
        </div>
        <div className="block 3xl:hidden">
          <MobileHeader
            hasExtension={hasExtension}
            interceptorEnabled={interceptorEnabled}
            toggleInterceptor={toggleInterceptor}
            environments={environments}
            currentEnvironment={currentEnvironment}
            onEnvironmentChange={handleEnvironmentChange}
            urlBarProps={urlBarProps}
            mobileNavProps={mobileNavProps}
          />
        </div>
      </header>

      {/* Main content - Update height calc to account for header and footer */}
      <div className="h-[calc(100dvh-theme(spacing.14)-theme(spacing.8))] min-h-0 bg-slate-900">
        {currentTab ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel
              defaultSize={PANEL_SIZING.SIDEBAR}
              className="hidden 3xl:block border-r-2 border-slate-700"
              response={null}
            >
              <Suspense
                fallback={<div className="w-full h-full bg-slate-900" />}
              >
                <SidePanel {...sidebarProps} />
              </Suspense>
            </ResizablePanel>
            <ResizablePanel
              defaultSize={PANEL_SIZING.MAIN}
              className="bg-slate-900"
              response={null}
            >
              <div className="h-full flex flex-col">
                {/* Request Panel */}
                <div
                  className={cn(
                    "min-h-0",
                    panelState === "collapsed"
                      ? "flex-grow"
                      : panelState === "fullscreen"
                        ? "h-0"
                        : "flex-1"
                  )}
                >
                  <Suspense
                    fallback={<div className="w-full h-full bg-slate-900/50" />}
                  >
                    <RequestPanel {...requestPanelProps} />
                  </Suspense>
                </div>
                {/* Response Panel */}
                {(tabState.response || tabState.isWebSocketMode) && (
                  <div
                    className={cn(
                      "border-t border-slate-800 min-h-0",
                      panelState === "collapsed"
                        ? "h-10"
                        : panelState === "fullscreen"
                          ? "flex-grow"
                          : "flex-1"
                    )}
                  >
                    <Suspense
                      fallback={
                        <div className="w-full h-full bg-slate-900/50" />
                      }
                    >
                      <ResponsePanel
                        {...responsePanelProps}
                        panelState={panelState}
                        onPanelStateChange={handlePanelStateChange}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            No active tab
          </div>
        )}
      </div>

      <div className="h-8 shrink-0 border-t border-slate-800">
        <Footer />
      </div>
    </div>
  );
}
