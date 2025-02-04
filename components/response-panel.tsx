import React, { useState, useMemo, useEffect, useRef } from "react";
import "highlight.js/styles/github-dark.css";
import { languageConfigs, type CodeGenLanguage } from "@/utils/code-generators";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Check,
  Copy,
  Save,
  AlertCircle,
  FileJson,
  List,
  WrapTextIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collection, SavedRequest } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MessagesTab } from "./websocket/messages-tab";
import { Checkbox } from "@/components/ui/checkbox";
import { Editor } from "@monaco-editor/react";
import { CodeLanguageSelector } from "./code-language-selector";
import { useTheme } from "next-themes";

const getLanguage = (contentType: string): string => {
  switch (contentType) {
    case "json":
      return "json";
    case "html":
      return "html";
    case "xml":
      return "xml";
    default:
      return "text";
  }
};

interface TabItem {
  id: string;
  label: string | React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  dropdown?: React.ReactNode; // Dropdown property
}

interface RequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time?: string;
  size?: string;
  intercepted?: boolean;
  error?: string;
}

interface ResponsePanelProps {
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
}

const formatContent = (content: any, contentType: string): string => {
  if (contentType === "json") {
    try {
      return typeof content === "string"
        ? JSON.stringify(JSON.parse(content), null, 2)
        : JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }
  return String(content);
};

const getContentType = (headers: Record<string, string>): string => {
  const contentType = headers?.["content-type"]?.toLowerCase() || "";
  if (contentType.includes("application/json")) return "json";
  if (contentType.includes("text/html")) return "html";
  if (contentType.includes("text/xml")) return "xml";
  return "text";
};

export function ResponsePanel({
  response,
  isLoading,
  collections,
  onSaveToCollection,
  method,
  url,
  isWebSocketMode,
}: ResponsePanelProps) {
  // 1. All useState hooks
  const [activeTab, setActiveTab] = useState("response");
  const [isPrettyPrint, setIsPrettyPrint] = useState(true);
  const [selectedLanguage, setSelectedLanguage] =
    useState<CodeGenLanguage>("curl");
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: boolean }>({});
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [preRequestScript, setPreRequestScript] = useState<string>("");
  const [testScript, setTestScript] = useState<string>("");
  const [isOnline, setIsOnline] = useState(true);
  const { theme } = useTheme();

  // 2. All useRef hooks
  const editorRef = useRef<any>(null);

  // 3. All useMemo hooks
  const contentType = useMemo(() => {
    if (!response?.headers) return "text";
    return getContentType(response.headers);
  }, [response?.headers]);

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: "response",
        label: contentType ? `${contentType.toUpperCase()}` : "Response",
        icon: (
          <FileJson
            className="h-4 w-4"
            strokeWidth="1"
            style={{
              stroke: "currentColor",
              fill: "yellow",
              fillOpacity: 0.2,
            }}
          />
        ),
      },
      {
        id: "headers",
        label: "Headers",
        icon: (
          <List
            className="h-4 w-4"
            strokeWidth={1}
            style={{
              stroke: "currentColor",
              fill: "yellow",
              fillOpacity: 0.2,
            }}
          />
        ),
      },
      {
        id: "code",
        label: (
          <CodeLanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        ),
      },
    ],
    [contentType, selectedLanguage]
  );

  // 4. All useEffect hooks
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    setActiveTab(isWebSocketMode ? "messages" : "response");
  }, [isWebSocketMode]);

  useEffect(() => {
    if ((window as any).__ACTIVE_REQUEST__) {
      const activeRequest = (window as any).__ACTIVE_REQUEST__;
      setPreRequestScript(activeRequest.preRequestScript || "");
      setTestScript(activeRequest.testScript || "");
      setTestResults(activeRequest.testResults || []);
      setScriptLogs(activeRequest.scriptLogs || []);
    }
  }, [response]);

  useEffect(() => {
    if (activeTab === "response" && response?.body) {
      const editorContent = getFormattedContent(response.body, contentType);
      if (editorRef.current) {
        editorRef.current.setValue(editorContent);
      }
    }
  }, [isPrettyPrint, contentType, activeTab, response]);

  // Early returns
  if (!response && !isWebSocketMode) {
    return null;
  }

  if (isWebSocketMode) {
    return (
      <div className="bg-slate-950 h-full flex flex-col">
        <div className="flex-1 relative bg-slate-900/90">
          <MessagesTab />
        </div>
      </div>
    );
  }

  const getContentForTab = () => {
    if (!response) return "";
    if (response.error) return response.error;

    switch (activeTab) {
      case "pretty":
        return formatContent(response.body, contentType);
      case "raw":
        return typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body);
      case "headers":
        return response.headers
          ? Object.entries(response.headers)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n")
          : "No headers available";
      default:
        return "";
    }
  };

  const copyToClipboard = async () => {
    try {
      let content = "";

      if (activeTab === "code") {
        content = getGeneratedCode();
      } else {
        content = getContentForTab();
      }

      await navigator.clipboard.writeText(content);
      setCopyStatus((prev) => ({ ...prev, [activeTab]: true }));
      toast.success("Copied to clipboard");
      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [activeTab]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy content");
    }
  };

  const getGeneratedCode = () => {
    if (!response) return "";

    const options = {
      url: url,
      method: method,
      headers: response.headers || {},
      body: response.body ? JSON.stringify(response.body, null, 2) : undefined,
    };

    try {
      return languageConfigs[selectedLanguage].generator(options);
    } catch (error) {
      console.error("Code generation error:", error);
      return "// Error generating code";
    }
  };

  const handleSaveRequest = () => {
    if (!response) return;

    // Create event detail with scripts
    const requestToSave = {
      method: method,
      url: url,
      headers: response?.headers || [],
      params: [], // Add URL params if available
      body: { type: "none", content: "" }, // Add actual request body if available
      auth: { type: "none" }, // Add actual auth if available
      response: {
        status: response?.status,
        body: response?.body,
        headers: response?.headers,
        time: response?.time,
        size: response?.size,
      },
      // Use state values for scripts and results
      preRequestScript: preRequestScript,
      testScript: testScript,
      testResults: testResults,
      scriptLogs: scriptLogs,
      runConfig: {
        iterations: 1,
        delay: 0,
        parallel: false,
        environment: null,
        timeout: 30000,
        stopOnError: true,
        retryCount: 0,
        validateResponse: false,
      },
    };

    // Dispatch event with all the data
    window.dispatchEvent(
      new CustomEvent("saveAndShowRequest", {
        detail: {
          request: requestToSave,
          showForm: true,
          isMobile: window.innerWidth < 768,
        },
      })
    );
  };

  const renderStatusBar = () =>
    !isWebSocketMode ? (
      <div className="sticky top-0 w-full px-4 py-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border-blue-500/30 px-3 py-1 rounded-lg">
            {response?.intercepted && (
              <div
                className="mr-1.5 w-2 h-2 rounded-full bg-green-400"
                title="local"
              />
            )}
            {method}
          </Badge>

          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-lg border",
              (response?.status || 0) >= 200 && (response?.status || 0) < 300
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            )}
          >
            {(response?.status || 0) >= 200 && (response?.status || 0) < 300 ? (
              <CheckCircle className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            <span className="text-xs font-medium">
              {response?.status || "---"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {response?.time && (
            <div className="flex items-center gap-2">
              <div className="flex items-center px-3 py-1 rounded-lg border border-slate-700/50 bg-slate-800/50">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                <span className="text-xs font-medium text-slate-300">
                  {response.time}
                </span>
              </div>
            </div>
          )}
          {response?.size && (
            <div className="flex items-center px-3 py-1 rounded-lg border border-slate-700/50 bg-slate-800/50">
              <Database className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">
                {response.size}
              </span>
            </div>
          )}
          {!isOnline && (
            <div className="flex items-center px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">
                Offline
              </span>
            </div>
          )}
        </div>
      </div>
    ) : null;

  // Only hide the response content, not the entire panel
  const shouldShowContent = response || isWebSocketMode;

  // Merge raw and pretty content handling into one function
  const getFormattedContent = (content: any, contentType: string): string => {
    if (!content) return "";

    try {
      // For JSON content
      if (contentType === "json") {
        const jsonString =
          typeof content === "string" ? content : JSON.stringify(content);
        return isPrettyPrint
          ? JSON.stringify(JSON.parse(jsonString), null, 2)
          : jsonString.replace(/\s+/g, "");
      }

      // For other content types
      return typeof content === "string" ? content : JSON.stringify(content);
    } catch (e) {
      // If parsing fails, return as-is
      return typeof content === "string" ? content : JSON.stringify(content);
    }
  };

  const renderResponseContent = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-slate-900">
        <div className="h-full [&_.monaco-editor]:!bg-slate-900 [&_.monaco-editor_.monaco-scrollable-element_.monaco-editor-background]:!bg-slate-900">
          <Editor
            height="100%"
            defaultLanguage={contentType === "json" ? "json" : "text"}
            value={getFormattedContent(response?.body, contentType)}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              folding: isPrettyPrint,
              foldingStrategy: "indentation",
              formatOnPaste: false, // Disable automatic formatting
              formatOnType: false, // Disable automatic formatting
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              autoIndent: "advanced",
              wrappingIndent: isPrettyPrint ? "deepIndent" : "none",
              renderWhitespace: isPrettyPrint ? "all" : "none",
              guides: {
                indentation: true,
                bracketPairs: true,
                highlightActiveIndentation: true,
                bracketPairsHorizontal: true,
              },
            }}
            beforeMount={(monaco) => {
              monaco.editor.defineTheme("customTheme", {
                base: "vs-dark",
                inherit: true,
                rules: [],
                colors: {
                  "editor.background": "#0f172a",
                },
              });
              monaco.editor.setTheme("customTheme");
            }}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900 h-full flex flex-col">
      {shouldShowContent ? (
        <>
          {renderStatusBar()}
          <Tabs defaultValue="response" className="flex-1 flex flex-col">
            <div className="bg-slate-900 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <TabsList className="h-10 w-auto justify-start rounded-none bg-slate-900 p-0">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="h-10 rounded-none border-b-4 border-transparent font-medium text-xs text-slate-400 transition-colors px-3 sm:px-4 py-2 data-[state=active]:bg-transparent data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 hover:text-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[80px] sm:max-w-none">
                          {tab.label}
                        </span>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Right-side controls with better mobile layout */}
                <div className="flex items-center gap-2 px-2 h-10">
                  {contentType === "json" && activeTab === "response" && (
                    <div className=" sm:flex items-center gap-2 pr-2 border-r border-slate-700">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsPrettyPrint(!isPrettyPrint)}
                        className="h-7 w-7 p-0 hover:bg-transparent active:bg-transparent"
                      >
                        <WrapTextIcon
                          className={cn(
                            "h-4 w-4",
                            isPrettyPrint && "text-yellow-200"
                          )}
                          strokeWidth={1}
                          style={{
                            stroke: "currentColor",
                            fill: "yellow",
                            fillOpacity: 0.2,
                          }}
                        />
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveRequest}
                    className="h-7 w-7 p-0 hover:bg-transparent active:bg-transparent"
                  >
                    <Save
                      className="h-4 w-4"
                      strokeWidth={1}
                      style={{
                        stroke: "currentColor",
                        fill: "yellow",
                        fillOpacity: 0.2,
                      }}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-7 w-7 p-0 hover:bg-transparent active:bg-transparent"
                  >
                    {copyStatus[activeTab] ? (
                      <Check
                        className="h-4 w-4"
                        strokeWidth={1}
                        style={{
                          stroke: "currentColor",
                          fill: "yellow",
                          fillOpacity: 0.2,
                        }}
                      />
                    ) : (
                      <Copy
                        className="h-4 w-4"
                        strokeWidth={1}
                        style={{
                          stroke: "currentColor",
                          fill: "yellow",
                          fillOpacity: 0.2,
                        }}
                      />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 relative bg-slate-900/50">
              <TabsContent value="response" className="absolute inset-0 m-0">
                {renderResponseContent()}
              </TabsContent>

              <TabsContent value="headers" className="absolute inset-0 m-0">
                <ScrollArea direction="vertical" className="h-full">
                  <div className="p-4">
                    {response?.headers &&
                    Object.keys(response.headers).length > 0 ? (
                      <div className="w-full table border-separate border-spacing-0">
                        {Object.entries(response.headers).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="table-row group hover:bg-slate-800/50"
                            >
                              <div className="table-cell py-2 pr-4 text-xs font-semibold text-blue-100 whitespace-nowrap align-top border-b border-slate-700">
                                {key}
                                <div className="hidden group-hover:block absolute h-4 w-px bg-slate-700/50 -right-0.5 top-1/2 -translate-y-1/2" />
                              </div>
                              <div className="table-cell py-2 pl-4 text-xs font-mono break-all text-blue-300 align-top border-b border-slate-700">
                                {value}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                        <Database className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-xs">No headers available</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="code" className="absolute inset-0 m-0">
                <div className="h-full">
                  <div className="h-full [&_.monaco-editor]:!bg-slate-900 [&_.monaco-editor_.monaco-scrollable-element_.monaco-editor-background]:!bg-slate-900">
                    <Editor
                      height="100%"
                      language={languageConfigs[selectedLanguage].highlight}
                      value={getGeneratedCode()}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: true },
                        fontSize: 12,
                        lineNumbers: "on",
                        folding: true,
                        wordWrap: "on",
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        tabSize: 4,
                        formatOnPaste: true,
                        formatOnType: true,
                        autoIndent: "advanced",
                        renderWhitespace: "all",
                        detectIndentation: true,
                        wrappingIndent: "indent",
                        guides: {
                          indentation: true,
                          bracketPairs: true,
                          highlightActiveIndentation: true,
                          bracketPairsHorizontal: true,
                        },
                      }}
                      beforeMount={(monaco) => {
                        monaco.editor.defineTheme("customTheme", {
                          base: "vs-dark",
                          inherit: true,
                          rules: [],
                          colors: {
                            "editor.background": "#0f172a",
                          },
                        });
                        monaco.editor.setTheme("customTheme");
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="messages" className="absolute inset-0 m-0">
                <MessagesTab />
              </TabsContent>
            </div>
          </Tabs>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-500 text-sm">
            Make a request to see the response
          </div>
        </div>
      )}
    </div>
  );
}
