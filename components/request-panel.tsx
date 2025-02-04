import { useState, useRef, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KeyValueEditor } from "./key-value-editor";
import { AuthSection } from "./auth-section";
import { Button } from "@/components/ui/button";
import {
  KeyValuePair,
  RequestBody,
  Environment,
  TestResult,
  ContentType,
} from "@/types";
import {
  FileJson,
  FormInput,
  Link,
  FileText,
  KeyRound,
  MessageSquare,
  PlugZap2,
  FileCode,
  TestTube2,
  CheckCircle,
  XCircle,
  X,
  Eraser,
  SquareFunctionIcon,
  SquareAsteriskIcon,
  SquareCodeIcon,
  SquareChartGanttIcon,
  SquarePlay,
  SquareActivityIcon,
  ChevronDown,
  WrapTextIcon,
  Info,
} from "lucide-react";
import { ConnectionTab } from "./websocket/connection-tab";
import { useWebSocket } from "./websocket/websocket-context";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NavigableElement, useKeyboardNavigation } from "./keyboard-navigation";
import { Editor } from "@monaco-editor/react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectLabel, SelectItem, SelectGroup } from "@radix-ui/react-select";
import React from "react";
import { Label } from "recharts";

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const switchVariants = {
  initial: { scale: 0.8, opacity: 0, y: 20 },
  animate: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

interface RequestPanelProps {
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
  onHeadersChange: (headers: KeyValuePair[]) => void;
  onParamsChange: (params: KeyValuePair[]) => void;
  onBodyChange: (body: RequestBody) => void;
  onAuthChange: (auth: any) => void;
  isWebSocketMode: boolean;
  environments?: Environment[];
  currentEnvironment?: Environment | null;
  onEnvironmentChange?: (environmentId: string) => void;
  onEnvironmentsUpdate?: (environments: Environment[]) => void;
  onAddToEnvironment?: (key: string, value: string) => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  hidden?: boolean;
}

interface ContentTypeOption {
  value: ContentType; // Update to use ContentType type
  label: string;
  category: "None" | "Text" | "Structured" | "Binary" | "Others";
  icon?: React.ReactNode;
  editor: "none" | "text" | "json" | "form" | "binary";
}

const contentTypeOptions: Record<string, ContentTypeOption[]> = {
  None: [{ value: "none", label: "None", category: "None", editor: "none" }],
  Text: [
    { value: "json", label: "JSON", category: "Text", editor: "json" },
    {
      value: "application/json",
      label: "JSON (application/json)",
      category: "Text",
      editor: "json",
    },
    {
      value: "application/ld+json",
      label: "JSON-LD",
      category: "Text",
      editor: "json",
    },
    {
      value: "application/hal+json",
      label: "HAL+JSON",
      category: "Text",
      editor: "json",
    },
    {
      value: "application/vnd.api+json",
      label: "JSON:API",
      category: "Text",
      editor: "json",
    },
    {
      value: "application/xml",
      label: "XML",
      category: "Text",
      editor: "text",
    },
    { value: "text/xml", label: "Text XML", category: "Text", editor: "text" },
  ],
  Structured: [
    {
      value: "application/x-www-form-urlencoded",
      label: "URL Encoded",
      category: "Structured",
      editor: "form",
    },
    {
      value: "multipart/form-data",
      label: "Form Data",
      category: "Structured",
      editor: "form",
    },
  ],
  Binary: [
    {
      value: "application/octet-stream",
      label: "Binary",
      category: "Binary",
      editor: "binary",
    },
  ],
  Others: [
    { value: "text/html", label: "HTML", category: "Others", editor: "text" },
    {
      value: "text/plain",
      label: "Plain Text",
      category: "Others",
      editor: "text",
    },
  ],
};

export function RequestPanel({
  isWebSocketMode,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  onAddToEnvironment,
  ...props
}: RequestPanelProps) {
  const { isConnected, stats } = useWebSocket();

  const showWebSocketContent =
    isWebSocketMode &&
    (isConnected || stats.messagesSent > 0 || stats.messagesReceived > 0);

  const bodyTabs = ["json", "form-data", "x-www-form-urlencoded", "raw"];

  const getBodyIcon = (type: string) => {
    switch (type) {
      case "json":
        return <FileJson className="h-4 w-4" />;
      case "form-data":
        return <FormInput className="h-4 w-4" />;
      case "x-www-form-urlencoded":
        return <Link className="h-4 w-4" />;
      case "raw":
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const [preRequestScript, setPreRequestScript] = useState("");
  const [testScript, setTestScript] = useState("");
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  useEffect(() => {
    const updateScriptsFromActiveRequest = () => {
      const activeRequest = (window as any).__ACTIVE_REQUEST__;
      if (activeRequest) {
        setPreRequestScript(activeRequest.preRequestScript || "");
        setTestScript(activeRequest.testScript || "");
        setScriptLogs(activeRequest.scriptLogs || []);
        setTestResults(activeRequest.testResults || []);
      }
    };

    // Update immediately
    updateScriptsFromActiveRequest();

    // Listen for changes to active request
    window.addEventListener(
      "activeRequestUpdated",
      updateScriptsFromActiveRequest
    );

    return () => {
      window.removeEventListener(
        "activeRequestUpdated",
        updateScriptsFromActiveRequest
      );
    };
  }, []);

  // Add handler for history item loading
  useEffect(() => {
    const handleHistoryLoad = (event: CustomEvent) => {
      const { item } = event.detail;
      if (item.request) {
        setPreRequestScript(item.request.preRequestScript || "");
        setTestScript(item.request.testScript || "");
        setScriptLogs(item.request.scriptLogs || []);
        setTestResults(item.request.testResults || []);
      }
    };

    window.addEventListener(
      "loadHistoryItem",
      handleHistoryLoad as EventListener
    );
    return () => {
      window.removeEventListener(
        "loadHistoryItem",
        handleHistoryLoad as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const handleLoadHistory = (event: CustomEvent) => {
      const { item } = event.detail;
      if (item && item.request) {
        // Update script states directly
        setPreRequestScript(item.request.preRequestScript || "");
        setTestScript(item.request.testScript || "");
        setScriptLogs(item.request.scriptLogs || []);
        setTestResults(item.request.testResults || []);
      }
    };

    window.addEventListener(
      "loadHistoryItem",
      handleLoadHistory as EventListener
    );
    return () => {
      window.removeEventListener(
        "loadHistoryItem",
        handleLoadHistory as EventListener
      );
    };
  }, []);

  // Update scripts in __ACTIVE_REQUEST__ when they change
  useEffect(() => {
    if ((window as any).__ACTIVE_REQUEST__) {
      (window as any).__ACTIVE_REQUEST__.preRequestScript = preRequestScript;
      (window as any).__ACTIVE_REQUEST__.testScript = testScript;
      (window as any).__ACTIVE_REQUEST__.testResults = testResults;
      (window as any).__ACTIVE_REQUEST__.scriptLogs = scriptLogs;
    }
  }, [preRequestScript, testScript, testResults, scriptLogs]);

  // Add script change handlers
  const handlePreRequestScriptChange = (value: string | undefined) => {
    const newValue = value || "";
    setPreRequestScript(newValue);
    // Update the active request
    if ((window as any).__ACTIVE_REQUEST__) {
      (window as any).__ACTIVE_REQUEST__.preRequestScript = newValue;
    }
  };

  const handleTestScriptChange = (value: string | undefined) => {
    const newValue = value || "";
    setTestScript(newValue);
    // Update the active request
    if ((window as any).__ACTIVE_REQUEST__) {
      (window as any).__ACTIVE_REQUEST__.testScript = newValue;
    }
  };

  const tabs: TabItem[] = [
    {
      id: "messages",
      label: "Messages",
      icon: (
        <MessageSquare
          className="h-4 w-4"
          strokeWidth={1}
          style={{
            stroke: "currentColor",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      hidden: !isWebSocketMode,
    },
    {
      id: "params",
      label: "Query",
      icon: (
        <SquareChartGanttIcon
          className="h-4 w-4"
          strokeWidth={1}
          style={{
            stroke: "white",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      disabled: isWebSocketMode,
    },
    {
      id: "headers",
      label: "Headers",
      icon: (
        <SquareCodeIcon
          className="h-4 w-4"
          strokeWidth={1}
          style={{
            stroke: "white",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      disabled: isWebSocketMode,
    },
    {
      id: "auth",
      label: "Auth",
      icon: (
        <SquareAsteriskIcon
          className="h-4 w-4"
          strokeWidth={1}
          style={{
            stroke: "white",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      disabled: isWebSocketMode,
    },
    {
      id: "body",
      label: "Body",
      icon: (
        <SquareActivityIcon
          className="h-4 w-4"
          strokeWidth={1}
          style={{
            stroke: "white",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      disabled: isWebSocketMode,
    },
    {
      id: "pre-request",
      label: "Pre-request",
      icon: (
        <SquareFunctionIcon
          className="h-4 w-4"
          strokeWidth={1}
          style={{
            stroke: "white",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      disabled: isWebSocketMode,
    },
    {
      id: "tests",
      label: "Tests",
      icon: (
        <SquarePlay
          className="h-4 w-4"
          strokeWidth={1}
          style={{
            stroke: "white",
            fill: "yellow",
            fillOpacity: 0.2,
          }}
        />
      ),
      disabled: isWebSocketMode,
    },
  ];

  const navigableElements = useRef<NavigableElement[]>([]);

  const { setFocus } = useKeyboardNavigation(
    navigableElements.current,
    (direction, currentId) => {
      const currentTab = tabs.findIndex((tab) => tab.id === currentId);
      let nextId: string | undefined;

      switch (direction) {
        case "right":
          nextId = tabs[(currentTab + 1) % tabs.length]?.id;
          break;
        case "left":
          nextId =
            tabs[currentTab === 0 ? tabs.length - 1 : currentTab - 1]?.id;
          break;
      }

      if (nextId) {
        setFocus(nextId);
      }
    },
    (id) => {
      // Handle tab selection
      const tabTrigger = document.querySelector(`[data-state][value="${id}"]`);
      if (tabTrigger instanceof HTMLElement) {
        tabTrigger.click();
      }
    }
  );

  const handleResponse = (response: any) => {
    // Your existing response handling code...

    // Dispatch response event
    window.dispatchEvent(
      new CustomEvent("apiResponse", {
        detail: response,
      })
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <AnimatePresence mode="wait">
        {!isWebSocketMode ? (
          <motion.div
            key="http-mode"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1"
          >
            <Tabs defaultValue="params" className="flex-1 flex flex-col">
              <div className="bg-slate-900 border-b border-slate-700">
                <div
                  className="overflow-x-auto scrollbar-none"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <TabsList className="flex w-max min-w-full justify-center rounded-none bg-slate-950 p-0">
                    {tabs.map(
                      (tab) =>
                        !tab.hidden && (
                          <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            ref={(el) => {
                              if (el) {
                                navigableElements.current.push({
                                  id: tab.id,
                                  ref: el,
                                  type: "tab",
                                });
                              }
                            }}
                            className={cn(
                              "w-full flex h-10 rounded-none border-b-4 border-transparent",
                              "px-6 sm:px-2 py-1 font-medium text-[11px] sm:text-xs text-slate-400",
                              "whitespace-nowrap min-w-[80px] sm:min-w-[100px]",
                              "data-[state=active]:border-blue-400",
                              "data-[state=active]:text-blue-400",
                              "data-[state=active]:bg-slate-800",
                              "hover:text-slate-300 hover:bg-slate-800",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                              "transition-colors"
                            )}
                            disabled={tab.disabled}
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              {tab.icon}
                              <span className="truncate">{tab.label}</span>
                            </div>
                          </TabsTrigger>
                        )
                    )}
                  </TabsList>
                </div>
              </div>

              <ScrollArea className="flex-1 bg-slate-800">
                <div className="p-0">
                  {/* Query Parameters Tab */}
                  <TabsContent value="params" className="m-0 min-h-0">
                    <div className="bg-slate-900 flex-1">
                      <KeyValueEditor
                        pairs={props.params}
                        onChange={props.onParamsChange}
                        addButtonText="Add Query Parameter"
                        environments={environments}
                        currentEnvironment={currentEnvironment}
                        onEnvironmentChange={onEnvironmentChange}
                        onEnvironmentsUpdate={onEnvironmentsUpdate}
                        onAddToEnvironment={onAddToEnvironment}
                      />
                    </div>
                  </TabsContent>

                  {/* Headers Tab */}
                  <TabsContent value="headers" className="m-0 min-h-0">
                    <div className="bg-slate-900">
                      <KeyValueEditor
                        pairs={props.headers}
                        onChange={props.onHeadersChange}
                        addButtonText="Add Header"
                        presetKeys={commonHeaders}
                        environments={environments}
                        currentEnvironment={currentEnvironment}
                        onEnvironmentChange={onEnvironmentChange}
                        onEnvironmentsUpdate={onEnvironmentsUpdate}
                        onAddToEnvironment={onAddToEnvironment}
                      />
                    </div>
                  </TabsContent>

                  {/* Body Tab */}
                  <TabsContent value="body" className="m-0 min-h-0">
                    <div className="bg-slate-900">
                      <div className={cn("p-0")}>
                        <RequestBodyContent
                          type={props.body.type}
                          body={props.body}
                          onChange={props.onBodyChange}
                          environments={environments}
                          currentEnvironment={currentEnvironment}
                          onEnvironmentChange={onEnvironmentChange}
                          onEnvironmentsUpdate={onEnvironmentsUpdate}
                          onAddToEnvironment={onAddToEnvironment}
                          headers={props.headers} // Pass headers to RequestBodyContent
                          onHeadersChange={props.onHeadersChange} // Pass onHeadersChange to RequestBodyContent
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Auth Tab */}
                  <TabsContent value="auth" className="m-0 min-h-0">
                    <div className="bg-slate-800">
                      <div>
                        <AuthSection
                          auth={props.auth}
                          onChange={props.onAuthChange}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="pre-request" className="m-0 min-h-0">
                    <div className="h-full flex flex-col bg-slate-900">
                      <div className="h-10 border-b border-slate-700 flex items-center justify-between px-3">
                        <div className="flex items-center gap-2">
                          <SquareFunctionIcon className="h-4 w-4 text-yellow-500" />
                          <span className="text-xs font-medium text-slate-400">
                            Pre-request Script
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreRequestScriptChange("")}
                          className="h-7 px-2 text-xs hover:bg-slate-800"
                        >
                          <Eraser className="h-3.5 w-3.5 mr-1.5" />
                          Clear
                        </Button>
                      </div>
                      <div className="flex-1 bg-slate-800">
                        <Editor
                          height="300px"
                          defaultLanguage="javascript"
                          value={preRequestScript}
                          onChange={handlePreRequestScriptChange}
                          theme="vs-dark"
                          options={{
                            readOnly: false,
                            minimap: { enabled: false },
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
                        />
                      </div>
                      {scriptLogs.length > 0 && (
                        <div className="border-t border-slate-700 bg-slate-900">
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <SquareActivityIcon className="h-4 w-4 text-blue-400" />
                              <h3 className="text-xs font-medium text-slate-400">
                                Console Output
                              </h3>
                            </div>
                            <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded-md max-h-32 overflow-auto">
                              {scriptLogs.join("\n")}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tests" className="m-0 min-h-0">
                    <div className="h-full flex flex-col bg-slate-900">
                      <div className="h-10 border-b border-slate-700 flex items-center justify-between px-3">
                        <div className="flex items-center gap-2">
                          <SquarePlay className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-medium text-slate-400">
                            Test Script
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestScriptChange("")}
                          className="h-7 px-2 text-xs hover:bg-slate-800"
                        >
                          <Eraser className="h-3.5 w-3.5 mr-1.5" />
                          Clear
                        </Button>
                      </div>
                      <div className="flex-1 bg-slate-800">
                        <Editor
                          height="300px"
                          defaultLanguage="javascript"
                          value={testScript}
                          onChange={handleTestScriptChange}
                          theme="vs-dark"
                          options={{
                            readOnly: false,
                            minimap: { enabled: false },
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
                        />
                      </div>
                      {testResults.length > 0 && (
                        <div className="border-t border-slate-700 bg-slate-900">
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <TestTube2 className="h-4 w-4 text-emerald-400" />
                              <h3 className="text-xs font-medium text-slate-400">
                                Test Results
                              </h3>
                            </div>
                            <div className="space-y-2">
                              {testResults.map((result, index) => (
                                <div
                                  key={index}
                                  className={cn(
                                    "p-3 rounded-md text-xs bg-slate-800",
                                    result.passed
                                      ? "text-emerald-400"
                                      : "text-red-400"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {result.passed ? (
                                        <CheckCircle className="h-4 w-4" />
                                      ) : (
                                        <XCircle className="h-4 w-4" />
                                      )}
                                      <span>{result.name}</span>
                                    </div>
                                    <span className="text-slate-500">
                                      {result.duration.toFixed(2)}ms
                                    </span>
                                  </div>
                                  {result.error && (
                                    <p className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                                      {result.error}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            key="websocket-mode"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 px-2 py-3"
          >
            <AnimatePresence mode="wait">
              {showWebSocketContent ? (
                <motion.div
                  key="connected"
                  variants={switchVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-full overflow-auto" // Add overflow handling
                >
                  <ConnectionTab />
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  variants={switchVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-full flex flex-col items-center justify-center text-center border-slate-700 bg-slate-800"
                >
                  <div className="space-y-6">
                    <div className="mx-auto flex justify-center items-center w-16 h-16 bg-gradient-to-b from-slate-100/80 via-white/60 to-slate-50/80 rounded-2xl shadow-inner border-2 border-slate-200/30 backdrop-blur-sm">
                      <PlugZap2 className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-slate-400">
                        WebSocket Mode
                      </h3>
                      <p className="text-sm text-slate-500 max-w-sm">
                        Enter a WebSocket URL to establish a connection and
                        start sending and receiving messages in real-time.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-slate-400">
                        Connection details will appear here
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const commonHeaders = [
  "Accept",
  "Content-Type",
  "Authorization",
  "User-Agent",
  "Accept-Language",
  "Cache-Control",
];

function RequestBodyContent({
  type,
  body,
  onChange,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  onAddToEnvironment,
  headers,
  onHeadersChange,
}: {
  type: ContentType;
  body: RequestBody;
  onChange: (body: RequestBody) => void;
  environments?: Environment[];
  currentEnvironment?: Environment | null;
  onEnvironmentChange?: (environmentId: string) => void;
  onEnvironmentsUpdate?: (environments: Environment[]) => void;
  onAddToEnvironment?: (key: string, value: string) => void;
  headers: KeyValuePair[];
  onHeadersChange: (headers: KeyValuePair[]) => void;
}) {
  const [selectedContentType, setSelectedContentType] =
    useState<ContentType>(type);
  const [isValidJson, setIsValidJson] = useState(true);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  const contentTypeOption = Object.values(contentTypeOptions)
    .flat()
    .find((opt) => opt.value === selectedContentType);

  const handleContentTypeChange = (newType: ContentType) => {
    setSelectedContentType(newType);
    onChange({ type: newType as ContentType, content: "" }); // Cast to ensure type safety
  };

  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";

    if (contentTypeOption?.editor === "json") {
      try {
        JSON.parse(newValue);
        setIsValidJson(true);
        setJsonError(null);
      } catch (e) {
        setIsValidJson(false);
        setJsonError((e as Error).message);
      }
    }

    onChange({ type: selectedContentType, content: newValue });
  };

  const handleFormatJson = () => {
    if (editorRef.current && contentTypeOption?.editor === "json") {
      try {
        const value = editorRef.current.getValue();
        const formatted = JSON.stringify(JSON.parse(value), null, 2);
        editorRef.current.setValue(formatted);
        setIsValidJson(true);
        setJsonError(null);
      } catch (e) {
        toast.error("Invalid JSON - cannot format");
      }
    }
  };

  const handleOverrideContentType = () => {
    // Find the headers tab element and switch to it
    const headersTab = document.querySelector(
      '[data-state][value="headers"]'
    ) as HTMLElement;
    if (headersTab) {
      headersTab.click();
    }

    // Add/update Content-Type header
    const updatedHeaders = [...headers];
    const contentTypeHeaderIndex = updatedHeaders.findIndex(
      (h) => h.key.toLowerCase() === "content-type"
    );

    const newHeader = {
      key: "Content-Type",
      value: selectedContentType,
      enabled: true,
      type: "text",
      showSecrets: false,
    };

    if (contentTypeHeaderIndex !== -1) {
      updatedHeaders[contentTypeHeaderIndex] = newHeader;
    } else {
      updatedHeaders.push(newHeader);
    }

    onHeadersChange(updatedHeaders);
    toast.success("Content-Type header updated");
  };

  // Add onEditorMount handler
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Responsive Content Type Header */}
      <div className="sticky top-0 bg-slate-900 backdrop-blur-sm z-10">
        <div className="p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex p-2 items-center gap-2 cursor-pointer hover:text-white transition-colors duration-200">
                    <div className="flex items-center gap-2">
                      {getIconForContentType(selectedContentType)}
                      <span className="font-medium sm:text-sm text-xs">
                        {contentTypeOption?.label || "Select type"}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-screen sm:w-[75vw] bg-slate-800/60 backdrop-blur-xl shadow-lg rounded-none border-2 border-slate-700 overflow-hidden"
                >
                  <ScrollArea
                    direction="horizontal"
                    className="w-full [&::-webkit-scrollbar]:hidden [&_[data-radix-scroll-area-scrollbar]]:hidden no-scrollbar"
                    style={{ scrollbarWidth: "none" }}
                  >
                    <div className="flex items-center gap-4 p-2">
                      <div className="inline-flex items-center gap-2 w-max">
                        {Object.values(contentTypeOptions)
                          .flat()
                          .map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() =>
                                handleContentTypeChange(option.value)
                              }
                              className={cn(
                                "flex-none shrink-0 transition-all duration-200",
                                "hover:bg-slate-800/50 focus:bg-slate-800/50",
                                "data-[highlighted]:bg-slate-800/50",
                                selectedContentType === option.value
                                  ? "bg-slate-800/50 rounded-full"
                                  : "transparent"
                              )}
                            >
                              <div className="flex items-center gap-2 py-1 px-2 bg-slate-800 rounded-full">
                                {getIconForContentType(option.value)}
                                <span
                                  className={cn(
                                    "transition-colors duration-200 whitespace-nowrap sm:text-sm text-xs",
                                    selectedContentType === option.value
                                      ? "text-blue-400 font-medium"
                                      : "text-slate-300"
                                  )}
                                >
                                  {option.label}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                      </div>
                    </div>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleOverrideContentType}
              className="h-8 sm:h-9 px-3 bg-slate-800/50 border border-slate-700 text-xs"
            >
              <SquareCodeIcon
                className="h-4 w-4"
                strokeWidth={1}
                style={{
                  stroke: "currentColor",
                  fill: "yellow",
                  fillOpacity: 0.2,
                }}
              />
              <span className="ml-2 hidden lg:inline">Set Header</span>
            </Button>

            {contentTypeOption?.editor === "json" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFormatJson}
                className="h-8 sm:h-9 px-3 bg-slate-800/50 border border-slate-700 text-xs"
              >
                <WrapTextIcon
                  className="h-4 w-4"
                  strokeWidth={1}
                  style={{
                    stroke: "currentColor",
                    fill: "yellow",
                    fillOpacity: 0.2,
                  }}
                />
                <span className="ml-2 hidden lg:inline">Wrap Lines</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({ type: selectedContentType, content: "" })
              }
              className="h-8 sm:h-9 px-3 bg-slate-800/50 border border-slate-700 text-xs"
            >
              <Eraser
                className="h-4 w-4"
                strokeWidth={1}
                style={{
                  stroke: "currentColor",
                  fill: "yellow",
                  fillOpacity: 0.2,
                }}
              />
              <span className="ml-2 hidden lg:inline">Clear</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-slate-900">
        <AnimatePresence mode="wait">
            {contentTypeOption?.editor === "none" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center space-y-6"
              >
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center justify-center p-8 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-lg border border-slate-800/40"
                >
                  <FileText className="h-10 w-10 text-slate-500" />
                </motion.div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">No body content required</p>
                  <p className="text-xs text-slate-500">Select a content type to configure request body</p>
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 px-4 py-3 mx-auto max-w-md bg-slate-900/40 rounded-lg border border-slate-800/60 shadow-sm"
                >
                  <Info className="h-4 w-4 text-blue-400/80" />
                  <span className="text-xs text-slate-400/90">Configure body settings using the content type selector above</span>
                </motion.div>
              </motion.div>
            )}

          {contentTypeOption?.editor === "form" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <KeyValueEditor
                pairs={Array.isArray(body.content) ? body.content : []}
                onChange={(pairs) => onChange({ ...body, content: pairs })}
                addButtonText={
                  selectedContentType === "multipart/form-data"
                    ? "Add Form Field"
                    : "Add Parameter"
                }
                showDescription={selectedContentType === "multipart/form-data"}
                environments={environments}
                currentEnvironment={currentEnvironment}
                onEnvironmentChange={onEnvironmentChange}
                onEnvironmentsUpdate={onEnvironmentsUpdate}
                onAddToEnvironment={onAddToEnvironment}
                expandedItemId={expandedItemId}
                onExpandedChange={setExpandedItemId}
                className="border-none rounded-none"
                isMobile={true}
              />
            </motion.div>
          )}

          {contentTypeOption?.editor === "binary" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center h-full p-4"
            >
              <div className="w-full max-w-2xl">
                <div className="group relative">
                  {/* Drop zone */}
                  <div
                    className="flex flex-col items-center justify-center p-8 sm:p-12 
                    border-2 border-dashed border-slate-700 rounded-lg
                    bg-slate-800/50 hover:bg-slate-800/80 hover:border-slate-600 
                    transition-all duration-300"
                  >
                    {/* Upload icon with animation */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="mb-4 p-4 rounded-full bg-slate-700/50 
                        group-hover:bg-slate-700 transition-colors"
                    >
                      <FileText
                        className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 
                        group-hover:text-blue-400 transition-colors"
                      />
                    </motion.div>

                    {/* Upload text */}
                    <div className="text-center space-y-2">
                      <p className="text-sm sm:text-base font-medium text-slate-300">
                        Drop your file here, or
                        <label className="mx-2 text-blue-400 hover:text-blue-300 cursor-pointer">
                          browse
                          <Input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onChange({
                                  type: selectedContentType,
                                  content: file,
                                });
                                toast.success(`Selected: ${file.name}`);
                              }
                            }}
                          />
                        </label>
                      </p>
                      <p className="text-xs text-slate-500">
                        Supported file types: All
                      </p>
                    </div>
                  </div>

                  {/* Selected file info */}
                  {body.content instanceof File && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-lg bg-slate-800 border border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded bg-blue-500/10">
                            <FileText className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-300 truncate">
                              {(body.content as File).name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(body.content as File).type ||
                                "application/octet-stream"}{" "}
                              • {Math.round((body.content as File).size / 1024)}{" "}
                              KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onChange({ type: selectedContentType, content: "" })
                          }
                          className="h-8 w-8 p-0 hover:bg-slate-700"
                        >
                          <X className="h-4 w-4 text-slate-400 hover:text-red-400" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Text/Code Editors with consistent styling */}
          {(contentTypeOption?.editor === "json" ||
            contentTypeOption?.editor === "text") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Editor
                height="300px"
                defaultLanguage={getEditorLanguage(contentTypeOption.value)}
                value={getEditorContent(body.content, contentTypeOption.value)}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  readOnly: false,
                  minimap: { enabled: false },
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Footer */}
      {contentTypeOption?.editor === "json" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-3 py-1.5 border-t border-slate-700 bg-slate-800/50"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {!isValidJson && jsonError ? (
                <>
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-red-400 font-medium">Invalid JSON</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-slate-400">Valid JSON</span>
                </>
              )}
            </div>
            {body.content && (
              <span className="font-mono text-slate-500">
                {JSON.stringify(body.content).length.toLocaleString()} bytes
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Helper functions
function getIconForContentType(type: string) {
  switch (true) {
    case type.includes("json"):
      return <FileJson className="h-4 w-4 text-blue-400" />;
    case type.includes("xml"):
      return <FileCode className="h-4 w-4 text-orange-400" />;
    case type.includes("html"):
      return <FileCode className="h-4 w-4 text-purple-400" />;
    case type.includes("form"):
      return <FormInput className="h-4 w-4 text-green-400" />;
    default:
      return <FileText className="h-4 w-4 text-slate-400" />;
  }
}

function getEditorLanguage(type: string): string {
  if (type.includes("json")) return "json";
  if (type.includes("xml")) return "xml";
  if (type.includes("html")) return "html";
  return "plaintext";
}

function getEditorContent(content: any, type: string): string {
  if (type.includes("json")) {
    return typeof content === "string"
      ? content
      : JSON.stringify(content, null, 2);
  }
  return typeof content === "string" ? content : String(content);
}

// Add type guard to validate ContentType
function isContentType(value: string): value is ContentType {
  const validContentTypes: ContentType[] = [
    "none",
    "json",
    "form-data",
    "x-www-form-urlencoded",
    "raw",
    "application/json",
    "application/ld+json",
    "application/hal+json",
    "application/vnd.api+json",
    "application/xml",
    "text/xml",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "application/octet-stream",
    "text/html",
    "text/plain",
  ];
  return validContentTypes.includes(value as ContentType);
}
