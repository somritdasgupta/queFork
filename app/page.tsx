"use client";

import { useState, useEffect, useRef } from "react";
import { PANEL_SIZING } from "@/lib/constants";
import { toast } from "sonner";
import { RequestPanel } from "@/components/request-panel";
import { ResponsePanel } from "@/components/response-panel";
import { MobileNav } from "@/components/mobile-nav";
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
} from "@/types";
import { EnvironmentPanelRef } from "@/components/environment-panel";
import { v4 as uuidv4 } from "uuid";
import Footer from "@/components/footer";
import { useWebSocket } from "@/components/websocket/websocket-context";
import saveAs from "file-saver";
import { UrlBar } from "@/components/url-bar";
import SidePanel from "@/components/side-panel";
import { EnvironmentSelector } from "@/components/environment-selector";
import { importFromUrl, parseImportData } from "@/lib/import-utils";
import { useAPIInterceptor } from "@/components/APIInterceptor";

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
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Run pre-request script if exists
      if (preRequestScript) {
        // ...existing pre-request script
      }

      // Prepare the request object
      const queryString = params
        .filter((p) => p.key && p.value && p.enabled)
        .map(
          (p) =>
            `${encodeURIComponent(p.key)}=${encodeURIComponent(replaceEnvironmentVariables(p.value))}`
        )
        .join("&");

      const requestHeaders: Record<string, string> = {};
      headers
        .filter((h) => h.key && h.value && h.enabled)
        .forEach((h) => {
          requestHeaders[h.key] = replaceEnvironmentVariables(h.value);
        });

      // Add auth headers
      if (auth.type === "bearer" && auth.token) {
        requestHeaders["Authorization"] =
          `Bearer ${replaceEnvironmentVariables(auth.token)}`;
      } else if (auth.type === "basic" && auth.username && auth.password) {
        requestHeaders["Authorization"] = `Basic ${btoa(
          `${replaceEnvironmentVariables(auth.username)}:${replaceEnvironmentVariables(auth.password)}`
        )}`;
      } else if (auth.type === "apiKey" && auth.key) {
        requestHeaders["X-API-Key"] = replaceEnvironmentVariables(auth.key);
      }

      const fullUrl = `${replaceEnvironmentVariables(url)}${queryString ? `?${queryString}` : ""}`;

      const requestObj = {
        method,
        url: fullUrl,
        headers: requestHeaders,
        body: body.type !== "none" ? body.content : undefined,
      };

      // Use interceptor or direct proxy based on hasExtension
      let responseData;
      if (hasExtension && interceptorEnabled) {
        responseData = await interceptRequest(requestObj);
        // Add intercepted flag
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

      // Process response
      const endTime = Date.now();
      const duration = endTime - startTime;

      const finalResponse = {
        ...responseData,
        time: `${duration}ms`,
        timestamp: new Date().toISOString(),
      };

      setResponse(finalResponse);

      // Add to history if enabled
      if (isHistorySavingEnabled) {
        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          method,
          url: fullUrl,
          request: {
            headers,
            params,
            body,
            auth,
            preRequestScript: preRequestScript || "",
            testScript: testScript || "",
            testResults: testResults || [],
            scriptLogs: scriptLogs || [],
          },
          response: finalResponse,
          type: "rest",
        };

        setHistory((prev) => {
          const newHistory = [historyItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
          safeSetItem("apiHistory", JSON.stringify(newHistory));
          return newHistory;
        });
      }

      // Run test script if exists
      if (testScript && responseData) {
        // ...existing test script will add later :)
      }

      toast.success(`${method} request successful`);
    } catch (error) {
      console.error("Request failed:", error);
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async () => {
    // Remove URL validation from here since it's handled in UrlBar
    // Just checking for existence and unresolved variables
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    // Check for unresolved variables
    const unresolvedVars = (url.match(/\{\{([^}]+)\}\}/g) || []).filter(
      (match) => {
        const key = match.slice(2, -2);
        return !mergedEnvVariables.find((v) => v.key === key);
      }
    );

    if (unresolvedVars.length > 0) {
      toast.error(
        `Missing environment variables: ${unresolvedVars.join(", ")}`
      );
      return;
    }

    await executeRequest();
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

  const handleLoadHistoryItem = (item: HistoryItem) => {
    if (item.type === "websocket") {
      // Switch to WebSocket mode
      setIsWebSocketMode(true);
      if (item.url) {
        // Dispatch event to set WebSocket URL and protocol
        window.dispatchEvent(
          new CustomEvent("setWebSocketProtocol", {
            detail: {
              url: item.url,
              protocol: item.wsStats?.protocols?.[0] || "websocket",
            },
          })
        );
      }
    } else {
      // Switch to REST mode
      setIsWebSocketMode(false);
      setMethod(item.method);
      setUrl(item.url);
      setHeaders(item.request.headers);
      setParams(item.request.params);
      setBody(item.request.body);
      if (item.request.auth) {
        const auth = item.request.auth;
        switch (auth.type) {
          case "bearer":
            if ("token" in auth) setAuth({ type: "bearer", token: auth.token });
            break;
          case "basic":
            if ("username" in auth && "password" in auth) {
              setAuth({
                type: "basic",
                username: auth.username,
                password: auth.password,
              });
            }
            break;
          case "apiKey":
            if ("key" in auth) setAuth({ type: "apiKey", key: auth.key });
            break;
          case "none":
            setAuth({ type: "none" });
            break;
        }
      }
      if (item.response) {
        setResponse(item.response);
      }
    }

    // Add these lines to restore scripts
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
  };

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

  const handleWebSocketToggle = () => {
    setIsWebSocketMode((prev) => !prev);
    if (isWebSocketMode) {
      // Switching from WebSocket to REST
      if (wsConnected) {
        disconnect();
      }
      setResponse(null);
      setMethod("GET");
      setHeaders([
        { key: "", value: "", enabled: true, showSecrets: false, type: "" },
      ]);
      setParams([
        { key: "", value: "", enabled: true, showSecrets: false, type: "" },
      ]);
      setBody({ type: "none", content: "" });
      setAuth({ type: "none" });
    } else {
      // Switching from REST to WebSocket
      setResponse(null);
      // Format URL if needed
      if (url && !url.startsWith("ws://") && !url.startsWith("wss://")) {
        const newUrl = url.startsWith("http://")
          ? url.replace("http://", "ws://")
          : url.startsWith("https://")
            ? url.replace("https://", "wss://")
            : `ws://${url}`;
        setUrl(newUrl);
      }
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);

    // Auto-detect WebSocket URLs and handle mode switching
    const isWebSocketUrl =
      newUrl.startsWith("ws://") ||
      newUrl.startsWith("wss://") ||
      newUrl.includes("socket.io") ||
      newUrl.includes("websocket");

    // Switch back to HTTP mode if URL is cleared or not a WebSocket URL
    if ((!newUrl || !isWebSocketUrl) && isWebSocketMode) {
      setIsWebSocketMode(false);
      if (wsConnected) {
        disconnect();
      }
    }
    // Switch to WebSocket mode for WebSocket URLs
    else if (isWebSocketUrl && !isWebSocketMode) {
      setIsWebSocketMode(true);
    }

    // Update recent URLs only for non-empty URLs
    if (newUrl && !recentUrls.includes(newUrl)) {
      const updated = [newUrl, ...recentUrls].slice(0, 10);
      setRecentUrls(updated);
      localStorage.setItem("recent-urls", JSON.stringify(updated));
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

      // Update state and storage
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

  // Define panel props
  const sidebarProps = {
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
  };

  const requestPanelProps = {
    headers,
    params,
    body,
    auth,
    onHeadersChange: setHeaders,
    onParamsChange: setParams,
    onBodyChange: setBody,
    onAuthChange: setAuth,
    isWebSocketMode,
    environments,
    currentEnvironment,
    onEnvironmentChange: handleEnvironmentChange,
    onEnvironmentsUpdate: handleEnvironmentsUpdate,
    onAddToEnvironment: handleAddToEnvironment,
  };

  const responsePanelProps = {
    response,
    isLoading,
    collections,
    onSaveToCollection: handleSaveRequest,
    method,
    url,
    isWebSocketMode,
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
    onUpdateCollections: handleUpdateCollections, // Add this line
    onImportCollections: handleImportCollections,
    isMobile: true,
  };

  useEffect(() => {
    const computeMergedVariables = () => {
      let merged: { key: string; value: string; type?: "text" | "secret" }[] =
        [];

      // Add global environment variables first
      const globalEnv = environments.find((env) => env.global);
      if (globalEnv) {
        merged.push(...globalEnv.variables.filter((v) => v.enabled));
      }

      // Add current environment variables, overwriting any duplicates
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

      // Filter out any empty keys
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

  return (
    <main className="flex flex-col h-screen bg-slate-900">
      {/* Header Section */}
      <header className="flex flex-col border-b border-slate-800">
        {/* Mobile/Desktop Layout Container */}
        <div className="w-full flex flex-col md:flex-row items-stretch gap-2 p-4">
          <div className="flex gap-2 md:w-[280px] shrink-0">
            {hasExtension && (
              <button
                onClick={toggleInterceptor}
                className={`hidden md:flex h-10 w-10 items-center justify-center rounded-lg transition-colors border ${
                  interceptorEnabled
                    ? "bg-slate-900 hover:border-blue-900 border-slate-800 border-2 text-slate-300"
                    : "bg-slate-900 hover:border-blue-900 border-slate-800 border-2 text-slate-500"
                }`}
                title={`Interceptor ${interceptorEnabled ? "enabled" : "disabled"}`}
              >
                <img
                  src="/icons/icon192.png"
                  alt="queFork"
                  className={`w-6 h-6 transition-all ${
                    interceptorEnabled
                      ? "opacity-100 animate-pulse duration-1200 easeIn"
                      : "opacity-100 grayscale"
                  }`}
                />
              </button>
            )}
            <div className="flex-1">
              <EnvironmentSelector
                environments={environments}
                currentEnvironment={currentEnvironment}
                onEnvironmentChange={handleEnvironmentChange}
                hasExtension={hasExtension}
                interceptorEnabled={interceptorEnabled}
                className="h-10 w-full bg-slate-900 hover:bg-slate-800 border-2 border-slate-800 
                  text-slate-300 rounded-lg transition-colors"
              />
            </div>

            <div className="md:hidden">
              <MobileNav {...mobileNavProps} />
            </div>
          </div>
          <div className="w-full flex flex-1 gap-2">
            <UrlBar
              method={method}
              url={url}
              isLoading={isLoading}
              wsConnected={wsConnected}
              isWebSocketMode={isWebSocketMode}
              onMethodChange={setMethod}
              onUrlChange={handleUrlChange}
              onSendRequest={handleSendRequest}
              onWebSocketToggle={handleWebSocketToggle}
              variables={mergedEnvVariables}
              recentUrls={recentUrls}
              isMobile={false}
              className="flex-1"
              hasExtension={hasExtension}
            />
          </div>
        </div>
      </header>

      {/* Rest of the layout */}
      <div className="h-[calc(100vh-3rem)] overflow-hidden bg-slate-950">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Sidebar */}
          <ResizablePanel
            defaultSize={PANEL_SIZING.SIDEBAR}
            className="hidden md:block border-r-2 border-slate-700"
            response={null}
          >
            <SidePanel {...sidebarProps} />
          </ResizablePanel>

          {/* Main Content */}
          <ResizablePanel
            defaultSize={PANEL_SIZING.MAIN}
            className="bg-slate-950"
            response={null}
          >
            <ResizablePanelGroup direction="vertical">
              {/* Request Panel */}
              <ResizablePanel
                defaultSize={
                  response || isWebSocketMode ? PANEL_SIZING.DEFAULT : 100
                }
                className="overflow-hidden"
                response={null}
              >
                <RequestPanel {...requestPanelProps} />
              </ResizablePanel>

              {/* Response Panel */}
              {(response || isWebSocketMode) && (
                <>
                  <ResizableHandle withHandle className="select-none" />
                  <ResizablePanel
                    defaultSize={PANEL_SIZING.DEFAULT}
                    className="overflow-hidden"
                    response={response}
                  >
                    <ResponsePanel {...responsePanelProps} />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <footer className="border-t-2 border-slate-700 bg-slate-800">
        <Footer />
      </footer>
    </main>
  );
}
