import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
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
  ChevronUp,
  Maximize2,
  Minimize2,
  PlugZap2,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collection, SavedRequest } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MessagesTab } from "./websocket/messages-tab";
import { Editor } from "@monaco-editor/react";
import { CodeLanguageSelector } from "./code-language-selector";
import { useTheme } from "next-themes";
import type { editor } from "monaco-editor";
import { motion } from "framer-motion";
import { CodeEditor } from "@/components/request-panel/shared/code-editor";
import { useWebSocket } from "@/components/websocket/websocket-context"; // Change import path
import { PanelState } from "@/types/panel"; // Add this import

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
  onPanelStateChange?: () => void;
  panelState?: PanelState; // Update type
  showContentOnly?: boolean;
  isOverlay?: boolean;
  preserveStatusBar?: boolean;
}

// Add new LoadingDots component
const LoadingDots = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex space-x-2">
      {[1, 2, 3].map((i) => (
        <div
          key={`loading-dot-${i}`} // More unique key to avoid conflicts
          className={cn(
            "w-3 h-3 bg-slate-600 rounded-full",
            "animate-bounce",
            i === 1 && "animation-delay-0",
            i === 2 && "animation-delay-150",
            i === 3 && "animation-delay-300"
          )}
          style={{
            animationDuration: "1s",
            animationDelay: `${(i - 1) * 0.15}s`,
          }}
        />
      ))}
    </div>
  </div>
);

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

const useResponseFormatter = (content: any, contentType: string) => {
  return useMemo(() => {
    if (!content) return "";
    try {
      if (contentType === "json") {
        const jsonString =
          typeof content === "string" ? content : JSON.stringify(content);
        return JSON.stringify(JSON.parse(jsonString), null, 2);
      }
      return typeof content === "string" ? content : JSON.stringify(content);
    } catch (e) {
      return typeof content === "string" ? content : JSON.stringify(content);
    }
  }, [content, contentType]);
};

const useDebounced = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

const editorDefaultOptions = (
  isPrettyPrint: boolean
): editor.IStandaloneEditorConstructionOptions => ({
  readOnly: true,
  minimap: { enabled: false },
  fontSize: 12,
  lineNumbers: "on" as const,
  folding: isPrettyPrint,
  foldingStrategy: "indentation",
  formatOnPaste: false,
  formatOnType: false,
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
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 0,
});

// Update comparison logic to use type guards
const isCollapsed = (state?: PanelState): boolean => state === "collapsed";
const isFullscreen = (state?: PanelState): boolean => state === "fullscreen";
const isExpanded = (state?: PanelState): boolean => state === "expanded";

export function ResponsePanel({
  response,
  isLoading,
  method,
  url,
  isWebSocketMode,
  onPanelStateChange,
  panelState,
  showContentOnly,
  isOverlay,
  preserveStatusBar,
}: ResponsePanelProps & {
  onPanelStateChange?: () => void;
  panelState?: "expanded" | "collapsed" | "fullscreen";
  showContentOnly?: boolean;
  isOverlay?: boolean;
  preserveStatusBar?: boolean;
}) {
  // Move the helper function to the top
  const getFormattedContent = (content: any, contentType: string): string => {
    if (!content) return "";

    try {
      if (contentType === "json") {
        const jsonString =
          typeof content === "string" ? content : JSON.stringify(content);
        return isPrettyPrint
          ? JSON.stringify(JSON.parse(jsonString), null, 2)
          : jsonString.replace(/\s+/g, "");
      }

      return typeof content === "string" ? content : JSON.stringify(content);
    } catch (e) {
      return typeof content === "string" ? content : JSON.stringify(content);
    }
  };

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
  useTheme();

  // 2. All useRef hooks
  const editorRef = useRef<any>(null);
  const editorInstanceRef = useRef<any>(null);
  const parentRef = useRef<any>(null);
  // 3. All useMemo hooks
  const contentType = useMemo(
    () => (response?.headers ? getContentType(response.headers) : "text"),
    [response?.headers]
  );

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

  const formattedContent = useResponseFormatter(response?.body, contentType);
  const debouncedContent = useDebounced(formattedContent, 150);

  const editorOptions = useMemo(
    () => editorDefaultOptions(isPrettyPrint),
    [isPrettyPrint]
  );

  const renderVirtualizedHeaders = useCallback(() => {
    if (!response?.headers) return null;
    const entries = Object.entries(response.headers);

    return (
      <div ref={parentRef} className="h-full overflow-auto">
        <div className="divide-y divide-slate-700/50">
          {entries.map(([key, value], index) => (
            <div
              key={`header-${key}-${index}`} // More unique key
              className={cn(
                "grid grid-cols-2 gap-4 px-4 py-2",
                index % 2 === 0 ? "bg-slate-900" : "bg-slate-800/50",
                "hover:bg-slate-700/50 transition-colors"
              )}
            >
              <div className="font-mono text-xs text-blue-300 truncate">
                {key}
              </div>
              <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all">
                {typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [response?.headers]);

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

  useEffect(() => {
    if (editorInstanceRef.current && debouncedContent) {
      requestAnimationFrame(() => {
        editorInstanceRef.current.setValue(debouncedContent);
      });
    }
  }, [debouncedContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+S or Command+S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        // Trigger save request action
        window.dispatchEvent(
          new CustomEvent("saveAndShowRequest", {
            detail: {
              request: {
                method,
                url,
                headers: response?.headers || [],
                params: [],
                body: { type: "none", content: "" },
                auth: { type: "none" },
                response: {
                  status: response?.status,
                  body: response?.body,
                  headers: response?.headers,
                  time: response?.time,
                  size: response?.size,
                },
                preRequestScript:
                  (window as any).__ACTIVE_REQUEST__?.preRequestScript || "",
                testScript:
                  (window as any).__ACTIVE_REQUEST__?.testScript || "",
                testResults:
                  (window as any).__ACTIVE_REQUEST__?.testResults || [],
                scriptLogs:
                  (window as any).__ACTIVE_REQUEST__?.scriptLogs || [],
              },
              isMobile: window.innerWidth < 768,
            },
          })
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [method, url, response]);

  if (!response && !isWebSocketMode) {
    return null;
  }

  const renderStatusBar = () =>
    !isWebSocketMode ? (
      <div className="sticky top-0 w-full px-4 py-2 border-y border-slate-800 bg-slate-800/25 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border-blue-500/30 px-2 py-1 rounded-lg">
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
              "flex items-center gap-1 px-2 py-1 rounded-lg border",
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

        <div className="flex items-center gap-2">
          {response?.time && (
            <div className="flex items-center">
              <div className="flex items-center px-2 py-1 rounded-lg border border-slate-700/50 bg-slate-800/50">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                <span className="text-xs font-medium text-slate-300">
                  {response.time}
                </span>
              </div>
            </div>
          )}
          {response?.size && (
            <div className="flex items-center px-2 py-1 rounded-lg border border-slate-700/50 bg-slate-800/50">
              <Database className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">
                {response.size}
              </span>
            </div>
          )}
          {!isOnline && (
            <div className="flex items-center px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
            </div>
          )}
          {onPanelStateChange && (
            <motion.button
              onClick={onPanelStateChange}
              className={cn(
                "flex items-center gap-2 px-2 py-1",
                "bg-slate-700/50 hover:bg-slate-700",
                "border border-slate-600/50",
                "rounded-lg",
                "transition-all duration-200",
                "group"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                animate={{
                  rotate: panelState === "collapsed" ? 0 : 180,
                  scale: panelState === "fullscreen" ? 1 : 1,
                }}
                className="text-slate-400 group-hover:text-slate-200"
              >
                {panelState === "expanded" ? (
                  <Maximize2 className="h-3.5 w-3.5" />
                ) : panelState === "fullscreen" ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </motion.div>
            </motion.button>
          )}
        </div>
      </div>
    ) : null;

  if (isWebSocketMode) {
    const { isConnected, url } = useWebSocket();
    const getStatusMessage = () => {
      if (!url) return "Not connected";
      const formattedUrl = url.replace(/^wss?:\/\//, "");
      return isConnected
        ? `Connected to ${formattedUrl}`
        : `Disconnected from ${formattedUrl}`;
    };

    return (
      <div
        className={cn(
          "bg-slate-900 flex flex-col relative",
          "transition-[height] duration-300 ease-in-out",
          // Add these classes to ensure full height on mobile
          "h-full min-h-0 flex-1"
        )}
      >
        {/* Add status bar for WebSocket mode */}
        {isCollapsed(panelState) && (
          <div className="sticky top-0 w-full px-4 py-2 border-y border-slate-800 bg-slate-800/25 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "px-2 py-1 rounded-lg",
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                )}
              >
                {isConnected ? (
                  <PlugZap2 className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Unplug className="h-3.5 w-3.5 mr-1.5" />
                )}
                <span className="text-xs font-medium">
                  {getStatusMessage()}
                </span>
              </Badge>
            </div>

            {/* Keep the expand/collapse button */}
            {onPanelStateChange && (
              <motion.button
                onClick={onPanelStateChange}
                className={cn(
                  "flex items-center gap-2 px-2 py-1",
                  "bg-slate-700/50 hover:bg-slate-700",
                  "border border-slate-600/50",
                  "rounded-lg",
                  "transition-all duration-200",
                  "group"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  animate={{
                    rotate: panelState === "collapsed" ? 0 : 180,
                    scale: panelState === "fullscreen" ? 1 : 1,
                  }}
                  className="text-slate-400 group-hover:text-slate-200"
                >
                  {panelState === "expanded" ? (
                    <Maximize2 className="h-3.5 w-3.5" />
                  ) : panelState === "fullscreen" ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </motion.div>
              </motion.button>
            )}
          </div>
        )}

        <div
          className={cn(
            "flex-1 min-h-0", // Add min-h-0 to allow flex-1 to work properly
            !showContentOnly && "bg-slate-900/90",
            panelState === "collapsed" && "hidden"
          )}
        >
          {!showContentOnly && <MessagesTab />}
        </div>

        {/* Floating button when not collapsed */}
        {onPanelStateChange && !isCollapsed(panelState) && (
          <motion.button
            onClick={onPanelStateChange}
            className={cn(
              "absolute top-2 right-2 z-50",
              "flex items-center gap-2 px-2 py-1",
              "bg-slate-800/90 hover:bg-slate-700",
              "border border-slate-600/50",
              "rounded-lg",
              "transition-all duration-200",
              "group",
              "backdrop-blur-sm"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{
                rotate: panelState === "collapsed" ? 0 : 180,
                scale: panelState === "fullscreen" ? 1 : 1,
              }}
              className="text-slate-400 group-hover:text-slate-200"
            >
              {panelState === "expanded" ? (
                <Maximize2 className="h-3.5 w-3.5" />
              ) : panelState === "fullscreen" ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </motion.div>
          </motion.button>
        )}
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

    const isMobileView = window.innerWidth < 768;

    // Dispatch event with all needed data
    window.dispatchEvent(
      new CustomEvent("saveAndShowRequest", {
        detail: {
          request: {
            method,
            url,
            headers: response?.headers || [],
            params: [],
            body: { type: "none", content: "" },
            auth: { type: "none" },
            response: {
              status: response?.status,
              body: response?.body,
              headers: response?.headers,
              time: response?.time,
              size: response?.size,
            },
            preRequestScript,
            testScript,
            testResults,
            scriptLogs,
          },
          showForm: true,
          isMobile: isMobileView,
          openSheet: isMobileView,
          switchToCollections: true,
        },
      })
    );
  };

  const shouldShowContent = response || isWebSocketMode;

  const renderResponseContent = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-slate-900">
        {isLoading ? (
          <LoadingDots />
        ) : (
          <CodeEditor
            value={getFormattedContent(response?.body, contentType)}
            language={contentType === "json" ? "json" : "text"}
            readOnly={true}
            onMount={(editor) => {
              editorRef.current = editor;
              editorInstanceRef.current = editor;
            }}
          />
        )}
      </div>
    </div>
  );

  const panelSizeClass = useMemo(() => {
    switch (panelState) {
      case "collapsed":
        return "h-10"; // Just show status bar
      case "fullscreen":
        return "h-full";
      default:
        return "h-full"; // Let parent control height
    }
  }, [panelState]);

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-slate-900",
        // Simplify height classes - let parent control the height
        panelState === "collapsed" ? "h-10" : "h-full"
      )}
    >
      {shouldShowContent ? (
        <>
          {renderStatusBar()}
          {panelState !== "collapsed" && (
            <div className="flex-1 min-h-0 flex flex-col">
              {" "}
              {/* Add this wrapper */}
              <Tabs
                defaultValue="response"
                className="flex-1 flex flex-col min-h-0"
              >
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

                <div className="flex-1 relative bg-slate-900/50 min-h-0">
                  {" "}
                  {/* Add min-h-0 here */}
                  <TabsContent
                    value="response"
                    className="absolute inset-0 m-0"
                  >
                    {isLoading ? (
                      <LoadingDots />
                    ) : (
                      <div className="h-full">
                        <CodeEditor
                          value={getFormattedContent(
                            response?.body,
                            contentType
                          )}
                          language={contentType === "json" ? "json" : "text"}
                          readOnly={true}
                          onMount={(editor) => {
                            editorRef.current = editor;
                            editorInstanceRef.current = editor;
                          }}
                        />
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="headers" className="absolute inset-0 m-0">
                    <ScrollArea className="h-full">
                      <div className="bg-slate-900/50">
                        {response?.headers &&
                        Object.keys(response.headers).length > 0 ? (
                          renderVirtualizedHeaders()
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
                      <CodeEditor
                        value={getGeneratedCode()}
                        language={languageConfigs[selectedLanguage].highlight}
                        readOnly={true}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="messages"
                    className="absolute inset-0 m-0"
                  >
                    <div className="h-full">
                      {" "}
                      {/* Add wrapper with h-full */}
                      <MessagesTab />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          {isLoading ? (
            <LoadingDots />
          ) : (
            <div className="text-slate-500 text-sm">
              Make a request to see the response
            </div>
          )}
        </div>
      )}
    </div>
  );
}
