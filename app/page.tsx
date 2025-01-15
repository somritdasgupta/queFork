"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
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
  Folder as FolderType,
  Environment,
} from "@/types";
import DesktopSidePanel from "@/components/desktop-side-panel";
import { EnvironmentManager } from "@/components/environment-manager";
import { v4 as uuidv4 } from "uuid";
import Footer from "@/components/footer";

export default function Page() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { key: "", value: "", enabled: true },
  ]);
  const [params, setParams] = useState<KeyValuePair[]>([
    { key: "", value: "", enabled: true },
  ]);
  const [body, setBody] = useState<RequestBody>({ type: "none", content: "" });
  const [auth, setAuth] = useState<{ type: "none" } | { type: "bearer"; token: string } | { type: "basic"; username: string; password: string } | { type: "apiKey"; key: string }>({ type: "none" });
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [currentEnvironment, setCurrentEnvironment] =
    useState<Environment | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem("apiHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const savedCollections = localStorage.getItem("apiCollections");
    if (savedCollections) {
      setCollections(JSON.parse(savedCollections));
    }

    const savedEnvironments = localStorage.getItem("apiEnvironments");
    if (savedEnvironments) {
      const parsedEnvironments = JSON.parse(savedEnvironments);
      setEnvironments(parsedEnvironments);
      setCurrentEnvironment(parsedEnvironments[0] || null);
    }
  }, []);

  const handleSendRequest = async () => {
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
      };

      setHistory((prev) => {
        const newHistory = [historyItem, ...prev];
        localStorage.setItem("apiHistory", JSON.stringify(newHistory));
        return newHistory;
      });

      toast.success(`${method} request successful`);
    } catch (error) {
      console.error("Request failed:", error);
      toast.error("Request failed. Please check the console for details.");
    } finally {
      setIsLoading(false);
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
          if (auth.username && auth.password) setAuth({ type: "basic", username: auth.username, password: auth.password });
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
          if (auth.username && auth.password) setAuth({ type: "basic", username: auth.username, password: auth.password });
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
      folders: [],
      requests: [],
      lastModified: new Date().toISOString(),
    };
    saveCollections([...collections, newCollection]);
  };

  const handleCreateFolder = (
    collectionId: string,
    folder: Partial<FolderType>
  ) => {
    const newCollections = collections.map((collection) => {
      if (collection.id === collectionId) {
        return {
          ...collection,
          folders: [
            ...collection.folders,
            { 
              id: uuidv4(), 
              name: folder.name || "New Folder",
              description: folder.description || "",
              folders: [], 
              requests: [] 
            },
          ],
        };
      }
      return collection;
    });
    saveCollections(newCollections);
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

  const handleDeleteFolder = (collectionId: string, folderId: string) => {
    const newCollections = collections.map((collection) => {
      if (collection.id === collectionId) {
        return {
          ...collection,
          folders: collection.folders.filter(
            (folder) => folder.id !== folderId
          ),
        };
      }
      return collection;
    });
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
  };

  const handleEnvironmentsUpdate = (updatedEnvironments: Environment[]) => {
    setEnvironments(updatedEnvironments);
    localStorage.setItem(
      "apiEnvironments",
      JSON.stringify(updatedEnvironments)
    );
  };

  const replaceEnvironmentVariables = (value: string): string => {
    if (!currentEnvironment) return value;
    return value.replace(/\{\{(.+?)\}\}/g, (_, key) => {
      const variable = currentEnvironment.variables.find((v) => v.key === key);
      return variable ? variable.value : `{{${key}}}`;
    });
  };

  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto] bg-gray-50 rounded-md">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 rounded-b-lg bg-gray-50 backdrop-blur supports-[backdrop-filter]:bg-gray/50 border-b-2 border-gray-300 shadow-md transition-all duration-200">
        <div className="flex flex-col md:flex-row md:h-16">
          {/* Mobile Layout */}
          <div className="flex flex-col md:hidden w-full px-2 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <MobileNav
                collections={collections}
                history={history}
                onSelectRequest={handleLoadRequest}
                onSelectHistoryItem={handleLoadHistoryItem}
                onClearHistory={handleClearHistory}
                onCreateCollection={handleCreateCollection}
                onCreateFolder={handleCreateFolder}
                onSaveRequest={handleSaveRequest}
                onDeleteCollection={handleDeleteCollection}
                onDeleteFolder={handleDeleteFolder}
                onDeleteRequest={handleDeleteRequest}
                onDeleteHistoryItem={handleDeleteHistoryItem}
              />
              <div className="flex-1 flex gap-2 items-center">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-24 font-semibold bg-blue-100 border-2 border-blue-300  rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="GET"
                      className="font-medium text-green-600"
                    >
                      GET
                    </SelectItem>
                    <SelectItem
                      value="POST"
                      className="font-medium text-blue-600"
                    >
                      POST
                    </SelectItem>
                    <SelectItem
                      value="PUT"
                      className="font-medium text-yellow-600"
                    >
                      PUT
                    </SelectItem>
                    <SelectItem
                      value="DELETE"
                      className="font-medium text-red-600"
                    >
                      DELETE
                    </SelectItem>
                    <SelectItem
                      value="PATCH"
                      className="font-medium text-purple-600"
                    >
                      PATCH
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1 border-2 border-gray-200 bg-blue-50 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter API endpoint"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                  onClick={handleSendRequest}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <EnvironmentManager
              environments={environments}
              currentEnvironment={currentEnvironment}
              onEnvironmentChange={handleEnvironmentChange}
              onEnvironmentsUpdate={handleEnvironmentsUpdate}
            />
          </div>

          {/* Enhanced Desktop Layout */}
          <div className="hidden bg-gray-50 md:flex items-center gap-4 p-4 flex-1 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-4 flex-1">
              <MobileNav
                collections={collections}
                history={history}
                onSelectRequest={handleLoadRequest}
                onSelectHistoryItem={handleLoadHistoryItem}
                onClearHistory={handleClearHistory}
                onCreateCollection={handleCreateCollection}
                onCreateFolder={handleCreateFolder}
                onSaveRequest={handleSaveRequest}
                onDeleteCollection={handleDeleteCollection}
                onDeleteFolder={handleDeleteFolder}
                onDeleteRequest={handleDeleteRequest}
                onDeleteHistoryItem={handleDeleteHistoryItem}
              />

              <div className="flex items-center gap-2 bg-blue-100 border-2 border-blue-300 rounded-md px-2">
                <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center text-white text-xs font-bold">
                  {method.charAt(0)}
                </div>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-[100px] font-bold bg-transparent border-0 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="GET"
                      className="font-semibold text-green-600"
                    >
                      GET
                    </SelectItem>
                    <SelectItem
                      value="POST"
                      className="font-medium text-blue-600"
                    >
                      POST
                    </SelectItem>
                    <SelectItem
                      value="PUT"
                      className="font-medium text-yellow-600"
                    >
                      PUT
                    </SelectItem>
                    <SelectItem
                      value="DELETE"
                      className="font-medium text-red-600"
                    >
                      DELETE
                    </SelectItem>
                    <SelectItem
                      value="PATCH"
                      className="font-medium text-purple-600"
                    >
                      PATCH
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <Input
                  className="flex-1 border-2 border-gray-200 bg-blue-50 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Enter your API endpoint"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg "
                  onClick={handleSendRequest}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>

              <EnvironmentManager
                environments={environments}
                currentEnvironment={currentEnvironment}
                onEnvironmentChange={handleEnvironmentChange}
                onEnvironmentsUpdate={handleEnvironmentsUpdate}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 md:pt-20 h-[calc(100vh-4rem)] overflow-hidden rounded-lg">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Responsive Sidebar */}
          <ResizablePanel
            defaultSize={25}
            minSize={20}
            maxSize={30}
            className="hidden md:block"
          >
            <DesktopSidePanel
              collections={collections}
              history={history}
              onSelectRequest={handleLoadRequest}
              onSelectHistoryItem={handleLoadHistoryItem}
              onClearHistory={handleClearHistory}
              onCreateCollection={handleCreateCollection}
              onCreateFolder={handleCreateFolder}
              onSaveRequest={handleSaveRequest}
              onDeleteCollection={handleDeleteCollection}
              onDeleteFolder={handleDeleteFolder}
              onDeleteRequest={handleDeleteRequest}
              onDeleteHistoryItem={handleDeleteHistoryItem}
            />
          </ResizablePanel>

          {/* Enhanced Main Panel */}
          <ResizablePanel defaultSize={75} className="bg-gray-50 rounde-md">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={50} className="overflow-hidden">
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

              <ResizableHandle
                withHandle
                className="bg-gray-200 hover:bg-gray-300 transition-colors"
              />

              <ResizablePanel
                defaultSize={50}
                minSize={30}
                maxSize={70}
                className="overflow-hidden"
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

      {/* Enhanced Footer */}
      <footer className="border-t border-transparent bg-transparent">
        <Footer />
      </footer>
    </div>
  );
}
