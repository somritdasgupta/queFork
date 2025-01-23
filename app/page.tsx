"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, GlobeIcon } from "lucide-react";
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
} from "@/types";
import DesktopSidePanel from "@/components/desktop-side-panel";
import {
  EnvironmentManager,
  EnvironmentManagerRef,
} from "@/components/environment-manager";
import { v4 as uuidv4 } from "uuid";
import Footer from "@/components/footer";
import { WebSocketPanel } from "@/components/websocket/websocket-panel";
import { useWebSocket } from "@/components/websocket/websocket-context";
import saveAs from "file-saver";

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
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [currentEnvironment, setCurrentEnvironment] =
    useState<Environment | null>(null);
  const [isHistorySavingEnabled, setIsHistorySavingEnabled] = useState(true);
  const [mergedEnvVariables, setMergedEnvVariables] = useState<
    { key: string; value: string }[]
  >([]);
  const environmentManagerRef = useRef<EnvironmentManagerRef>(null);
  const [isWebSocketOpen, setIsWebSocketOpen] = useState(false);
  const [wsUrl, setWsUrl] = useState("");
  const [webSocketUrl, setWebSocketUrl] = useState("");
  const [webSocketProtocols, setWebSocketProtocols] = useState<string[]>([]);
  const { isConnected: wsConnected } = useWebSocket();

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
    if (environmentManagerRef.current) {
      setMergedEnvVariables(
        environmentManagerRef.current.getMergedEnvironmentVariables()
      );
    }
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

  const executeRequest = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const queryString = params
        .filter((p) => p.key && p.value && p.enabled)
        .map(
          (p) =>
            `${encodeURIComponent(p.key)}=${encodeURIComponent(
              replaceEnvironmentVariables(p.value)
            )}`
        )
        .join("&");

      const requestHeaders: Record<string, string> = {};
      headers
        .filter((h) => h.key && h.value && h.enabled)
        .forEach((h) => {
          requestHeaders[h.key] = replaceEnvironmentVariables(h.value);
        });

      if (auth.type === "bearer" && auth.token) {
        requestHeaders["Authorization"] = `Bearer ${replaceEnvironmentVariables(
          auth.token
        )}`;
      } else if (auth.type === "basic" && auth.username && auth.password) {
        requestHeaders["Authorization"] = `Basic ${btoa(
          `${replaceEnvironmentVariables(
            auth.username
          )}:${replaceEnvironmentVariables(auth.password)}`
        )}`;
      } else if (auth.type === "apiKey" && auth.key) {
        requestHeaders["X-API-Key"] = replaceEnvironmentVariables(auth.key);
      }

      const fullUrl = `${replaceEnvironmentVariables(url)}${
        queryString ? `?${queryString}` : ""
      }`;
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          url: fullUrl,
          headers: requestHeaders,
          body:
            body.type !== "none"
              ? replaceEnvironmentVariables(body.content as string)
              : undefined,
        }),
      });

      const responseData = await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;

      const responseSize = new Blob([JSON.stringify(responseData.body)]).size;
      const formattedSize =
        responseSize > 1024
          ? `${(responseSize / 1024).toFixed(1)} KB`
          : `${responseSize} B`;

      const finalResponse = {
        ...responseData,
        time: `${duration}ms`,
        size: formattedSize,
        timestamp: new Date().toISOString(),
      };

      setResponse(finalResponse);

      // Add history saving logic here
      if (isHistorySavingEnabled) {
        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          method,
          url,
          request: {
            headers,
            params,
            body,
            auth,
          },
          response: finalResponse,
          type: "rest",
        };

        setHistory((prev) => {
          const newHistory = [historyItem, ...prev];
          localStorage.setItem("apiHistory", JSON.stringify(newHistory));
          return newHistory;
        });
      }

      toast.success(`${method} request successful`);
    } catch (error) {
      console.error("Request failed:", error);
      toast.error("Request failed. Please check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!url) {
      toast.error("Please enter a URL");
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
    setMethod(item.method);
    setUrl(item.url);
    setHeaders(item.request.headers);
    setParams(item.request.params);
    setBody(item.request.body);
    if (item.request.auth) {
      const auth = item.request.auth;
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
    if (item.response) {
      setResponse(item.response);
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

  const getWebSocketButtonClasses = () => {
    const baseClasses =
      "w-10 h-10 rounded-lg transition-all relative overflow-hidden";
    if (wsConnected) {
      return `${baseClasses} bg-slate-900 after:absolute after:inset-0 after:bg-green-500/20 after:animate-ping`;
    }
    return `${baseClasses} bg-slate-900 hover:bg-slate-800`;
  };

  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto] bg-slate-900/50 text-slate-400">
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-800">
        <div className="flex flex-col md:flex-row md:h-16">
          {/* Mobile Layout */}
          <div className="flex flex-col md:hidden w-full px-2 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <MobileNav
                collections={collections}
                history={history}
                onSelectRequest={handleLoadRequest}
                onSelectHistoryItem={handleLoadHistoryItem}
                onClearHistory={handleClearHistory}
                onCreateCollection={handleCreateCollection}
                onSaveRequest={handleSaveRequest}
                onDeleteCollection={handleDeleteCollection}
                onDeleteRequest={handleDeleteRequest}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                className="rounded-md border border-slate-700 hover:bg-slate-700/50"
                isHistorySavingEnabled={isHistorySavingEnabled}
                onToggleHistorySaving={toggleHistorySaving}
                onExportCollections={handleExportCollections}
                onExportHistory={handleExportHistory}
                onExportCollection={handleExportCollection}
              />
              <div className="flex-1 flex gap-2 items-center">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-24 text-xs font-medium bg-slate-900 border border-slate-700 rounded-lg text-slate-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border border-slate-700 bg-slate-800">
                    <SelectItem
                      value="GET"
                      className="text-xs font-medium text-green-500"
                    >
                      GET
                    </SelectItem>
                    <SelectItem
                      value="POST"
                      className="text-xs font-medium text-blue-500"
                    >
                      POST
                    </SelectItem>
                    <SelectItem
                      value="PUT"
                      className="text-xs font-medium text-yellow-500"
                    >
                      PUT
                    </SelectItem>
                    <SelectItem
                      value="DELETE"
                      className="text-xs font-medium text-red-500"
                    >
                      DELETE
                    </SelectItem>
                    <SelectItem
                      value="PATCH"
                      className="text-xs font-medium text-purple-500"
                    >
                      PATCH
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Input
                    className={`w-full text-xs font-medium bg-slate-900 border border-slate-700 text-slate-400 rounded-lg transition-all shadow-none ${
                      url &&
                      !url.match(
                        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
                      )
                        ? "border-red-500/50"
                        : "focus:border-slate-600"
                    }`}
                    placeholder="Enter API endpoint"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  {url && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          url.match(
                            /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
                          )
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                    </div>
                  )}
                </div>
                <Button
                  className="bg-slate-900 hover:bg-slate-700 text-slate-400 px-4 py-2 h-9 rounded-md border border-slate-700"
                  onClick={handleSendRequest}
                  disabled={
                    isLoading ||
                    !url.match(
                      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
                    )
                  }
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className={`${getWebSocketButtonClasses()} h-9 border border-slate-700`}
                onClick={() => setIsWebSocketOpen(true)}
                title={
                  wsConnected
                    ? "WebSocket Connected"
                    : "Open WebSocket Connection"
                }
              >
                <div className="relative z-10">
                  <GlobeIcon
                    className={`w-3 h-3 transition-colors ${
                      wsConnected
                        ? "text-green-400 animate-pulse"
                        : "text-slate-400"
                    }`}
                  />
                </div>
              </Button>
              <div className="flex-1">
                <EnvironmentManager
                  ref={environmentManagerRef}
                  environments={environments}
                  currentEnvironment={currentEnvironment}
                  onEnvironmentChange={handleEnvironmentChange}
                  onEnvironmentsUpdate={handleEnvironmentsUpdate}
                  className="rounded-md border border-slate-700 bg-slate-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center gap-4 p-4 max-w-screen-2xl mx-auto w-full">
            <div className="flex items-center gap-4 flex-1">
              <MobileNav
                collections={collections}
                history={history}
                onSelectRequest={handleLoadRequest}
                onSelectHistoryItem={handleLoadHistoryItem}
                onClearHistory={handleClearHistory}
                onCreateCollection={handleCreateCollection}
                onSaveRequest={handleSaveRequest}
                onDeleteCollection={handleDeleteCollection}
                onDeleteRequest={handleDeleteRequest}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                className="rounded-md border border-slate-700 hover:bg-slate-700/50"
                isHistorySavingEnabled={isHistorySavingEnabled}
                onToggleHistorySaving={toggleHistorySaving}
                onExportCollections={handleExportCollections}
                onExportHistory={handleExportHistory}
                onExportCollection={handleExportCollection}
              />

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2">
                <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xs font-bold">
                  {method.charAt(0)}
                </div>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-[100px] font-bold bg-transparent border-0 text-slate-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border border-slate-700 bg-slate-800">
                    <SelectItem
                      value="GET"
                      className="font-medium text-green-500"
                    >
                      GET
                    </SelectItem>
                    <SelectItem
                      value="POST"
                      className="font-medium text-blue-500"
                    >
                      POST
                    </SelectItem>
                    <SelectItem
                      value="PUT"
                      className="font-medium text-yellow-500"
                    >
                      PUT
                    </SelectItem>
                    <SelectItem
                      value="DELETE"
                      className="font-medium text-red-500"
                    >
                      DELETE
                    </SelectItem>
                    <SelectItem
                      value="PATCH"
                      className="font-medium text-purple-500"
                    >
                      PATCH
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input
                    className={`w-full text-xs font-medium bg-slate-900 border border-slate-700 text-slate-400 rounded-lg transition-all shadow-none ${
                      url &&
                      !url.match(
                        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
                      )
                        ? "border-red-500/50"
                        : "focus:border-slate-600"
                    }`}
                    placeholder="Enter API endpoint"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  {url && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          url.match(
                            /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
                          )
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                    </div>
                  )}
                </div>
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-6 py-2 rounded-lg"
                  onClick={handleSendRequest}
                  disabled={
                    isLoading ||
                    !url.match(
                      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
                    )
                  }
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  className={getWebSocketButtonClasses()}
                  onClick={() => setIsWebSocketOpen(true)}
                  title={
                    wsConnected
                      ? "WebSocket Connected"
                      : "Open WebSocket Connection"
                  }
                >
                  <div className="relative z-10">
                    <GlobeIcon
                      className={`w-4 h-4 transition-colors ${
                        wsConnected
                          ? "text-green-400 animate-pulse"
                          : "text-slate-400"
                      }`}
                    />
                    {wsConnected}
                  </div>
                </Button>
              </div>

              <EnvironmentManager
                ref={environmentManagerRef}
                environments={environments}
                currentEnvironment={currentEnvironment}
                onEnvironmentChange={handleEnvironmentChange}
                onEnvironmentsUpdate={handleEnvironmentsUpdate}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="pt-28 md:pt-16 h-[calc(100vh-3rem)] overflow-hidden bg-slate-800">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Sidebar */}
          <ResizablePanel
            defaultSize={25}
            minSize={20}
            maxSize={30}
            className="hidden md:block"
            response={null}
          >
            <DesktopSidePanel
              collections={collections}
              history={history}
              onSelectRequest={handleLoadRequest}
              onSelectHistoryItem={handleLoadHistoryItem}
              onClearHistory={handleClearHistory}
              onCreateCollection={handleCreateCollection}
              onSaveRequest={handleSaveRequest}
              onDeleteCollection={handleDeleteCollection}
              onDeleteRequest={handleDeleteRequest}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              isHistorySavingEnabled={isHistorySavingEnabled}
              onToggleHistorySaving={toggleHistorySaving}
              onExportCollections={handleExportCollections}
              onExportHistory={handleExportHistory}
              onExportCollection={handleExportCollection}
            />
          </ResizablePanel>

          {/* Main Panel */}
          <ResizablePanel
            defaultSize={75}
            className="bg-gray-50"
            response={null}
          >
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel
                defaultSize={50}
                className="overflow-hidden"
                response={null}
              >
                <div className="h-full overflow-y-auto">
                  <RequestPanel
                    headers={headers}
                    params={params}
                    body={body}
                    auth={auth}
                    onHeadersChange={setHeaders}
                    onParamsChange={setParams}
                    onBodyChange={setBody}
                    onAuthChange={setAuth}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={50}
                minSize={12}
                maxSize={!response?.status ? 30 : 90}
                className="overflow-hidden"
                response={response}
              >
                <div className="h-full bg-gray-50 overflow-y-auto">
                  <ResponsePanel
                    response={response}
                    isLoading={isLoading}
                    collections={collections}
                    onSaveToCollection={handleSaveRequest}
                    method={method}
                    url={url}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <footer className="border-t border-slate-700 bg-slate-900/50 shadow-md">
        <Footer />
      </footer>
      <WebSocketPanel
        url={wsUrl}
        onUrlChange={setWsUrl}
        isOpen={isWebSocketOpen}
        onClose={() => setIsWebSocketOpen(false)}
      />
    </div>
  );
}
