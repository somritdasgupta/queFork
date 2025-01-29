import { useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KeyValueEditor } from "./key-value-editor";
import { AuthSection } from "./auth-section";
import { Button } from "@/components/ui/button";
import { KeyValuePair, RequestBody, Environment, TestResult } from "@/types";
import {
  SearchCode,
  List,
  FileJson,
  FormInput,
  Link,
  FileText,
  KeyRound,
  MessageSquare,
  PlugZap2,
  FileCode,
  TestTube2,
} from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConnectionTab } from "./websocket/connection-tab";
import { useWebSocket } from "./websocket/websocket-context";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NavigableElement, useKeyboardNavigation } from './keyboard-navigation';
import { Editor } from '@monaco-editor/react';

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

  const [preRequestScript, setPreRequestScript] = useState('');
  const [testScript, setTestScript] = useState('');
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const tabs: TabItem[] = [
    {
      id: "messages",
      label: "Messages",
      icon: <MessageSquare className="h-4 w-4" />,
      hidden: !isWebSocketMode,
    },
    {
      id: "params",
      label: "Query",
      icon: <SearchCode className="h-4 w-4 text-emerald-500" />,
      disabled: isWebSocketMode,
    },
    {
      id: "headers",
      label: "Headers",
      icon: <List className="h-4 w-4 text-blue-500" />,
      disabled: isWebSocketMode,
    },
    {
      id: "auth",
      label: "Auth",
      icon: <KeyRound className="h-4 w-4 text-red-500" />,
      disabled: isWebSocketMode,
    },
    ...bodyTabs.map((type) => ({
      id: `body-${type}`,
      label:
        type === "form-data"
          ? "Form"
          : type === "x-www-form-urlencoded"
            ? "URL"
            : type.charAt(0).toUpperCase() + type.slice(1),
      icon: getBodyIcon(type),
      disabled: isWebSocketMode,
    })),
    {
      id: "pre-request",
      label: "Pre-request Script",
      icon: <FileCode className="h-4 w-4 text-yellow-500" />,
      disabled: isWebSocketMode,
    },
    {
      id: "tests",
      label: "Tests",
      icon: <TestTube2 className="h-4 w-4 text-green-500" />,
      disabled: isWebSocketMode,
    },
  ];

  const navigableElements = useRef<NavigableElement[]>([]);

  const { setFocus } = useKeyboardNavigation(
    navigableElements.current,
    (direction, currentId) => {
      const currentTab = tabs.findIndex(tab => tab.id === currentId);
      let nextId: string | undefined;

      switch (direction) {
        case 'right':
          nextId = tabs[(currentTab + 1) % tabs.length]?.id;
          break;
        case 'left':
          nextId = tabs[currentTab === 0 ? tabs.length - 1 : currentTab - 1]?.id;
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
        detail: response
      })
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-800">
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
                  className="overflow-x-auto scrollbar-none "
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <TabsList className="flex w-max min-w-full justify-start rounded-none bg-slate-900 p-0">
                    {tabs.map(
                      (tab) =>
                        !tab.hidden && (
                          <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            ref={el => {
                              if (el) {
                                navigableElements.current.push({
                                  id: tab.id,
                                  ref: el,
                                  type: 'tab'
                                });
                              }
                            }}
                            className="flex-1 h-10 rounded-none border-b-4 border-transparent px-4 py-2 font-medium text-xs text-slate-400 whitespace-nowrap 
                              data-[state=active]:border-blue-400 
                              data-[state=active]:text-blue-400 
                              data-[state=active]:bg-slate-800
                              hover:text-slate-300
                              hover:bg-slate-800
                              disabled:opacity-50
                              disabled:cursor-not-allowed
                              transition-colors"
                            disabled={tab.disabled}
                          >
                            <div className="flex items-center gap-2">
                              {tab.icon}
                              {tab.label}
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

                  {/* Body Tabs */}
                  {bodyTabs.map((type) => (
                    <TabsContent
                      key={type}
                      value={`body-${type}`}
                      className="m-0 min-h-0"
                    >
                      <div className="bg-slate-900">
                        <div
                          className={cn(
                            type === "json" || type === "raw" ? "" : "p-0"
                          )}
                        >
                          <RequestBodyContent
                            type={type as RequestBody["type"]}
                            body={props.body}
                            onChange={props.onBodyChange}
                            environments={environments}
                            currentEnvironment={currentEnvironment}
                            onEnvironmentChange={onEnvironmentChange}
                            onEnvironmentsUpdate={onEnvironmentsUpdate}
                            onAddToEnvironment={onAddToEnvironment}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  ))}

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
                      <div className="h-10 border-b border-slate-700 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Pre-request Script</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreRequestScript('')}
                          className="h-7 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="flex-1">
                        <Editor
                          height="300px"
                          defaultLanguage="javascript"
                          value={preRequestScript}
                          onChange={(value) => setPreRequestScript(value || '')}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: true},
                            fontSize: 12,
                            lineNumbers: 'on',
                            folding: true,
                            tabSize: 2,
                          }}
                        />
                      </div>
                      {scriptLogs.length > 0 && (
                        <div className="border-t border-slate-700">
                          <div className="p-2">
                            <h3 className="text-xs font-medium text-slate-400">Console Output</h3>
                            <pre className="mt-2 text-xs text-slate-300 max-h-32 overflow-auto">
                              {scriptLogs.join('\n')}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tests" className="m-0 min-h-0">
                    <div className="h-full flex flex-col bg-slate-900">
                      <div className="h-10 border-b border-slate-700 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Test Script</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTestScript('')}
                          className="h-7 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="flex-1">
                        <Editor
                          height="300px"
                          defaultLanguage="javascript"
                          value={testScript}
                          onChange={(value) => setTestScript(value || '')}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: true},
                            fontSize: 12,
                            lineNumbers: 'on',
                            folding: true,
                            tabSize: 2,
                          }}
                        />
                      </div>
                      {testResults.length > 0 && (
                        <div className="border-t border-slate-700">
                          <div className="p-2">
                            <h3 className="text-xs font-medium text-slate-400">Test Results</h3>
                            <div className="mt-2 space-y-2">
                              {testResults.map((result, index) => (
                                <div
                                  key={index}
                                  className={cn(
                                    'p-2 rounded-md text-xs',
                                    result.passed
                                      ? 'bg-green-500/10 text-green-400'
                                      : 'bg-red-500/10 text-red-400'
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{result.name}</span>
                                    <span>{result.duration.toFixed(2)}ms</span>
                                  </div>
                                  {result.error && (
                                    <p className="mt-1 text-xs opacity-80">{result.error}</p>
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
                      <PlugZap2 className="h-8 w-8 text-blue-400" />
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
}: {
  type: RequestBody["type"];
  body: RequestBody;
  onChange: (body: RequestBody) => void;
  environments?: Environment[];
  currentEnvironment?: Environment | null;
  onEnvironmentChange?: (environmentId: string) => void;
  onEnvironmentsUpdate?: (environments: Environment[]) => void;
  onAddToEnvironment?: (key: string, value: string) => void;
}) {
  const [params, setParams] = useState<KeyValuePair[]>([
    { key: "", value: "", type: "text", showSecrets: false },
  ]);
  const [isValidJson, setIsValidJson] = useState(true);
  const [jsonError, setJsonError] = useState<string | null>(null);

  function onParamsChange(pairs: KeyValuePair[]): void {
    setParams(pairs);
    onChange({ ...body, content: pairs });
  }

  const validateAndFormatJson = (content: string) => {
    try {
      if (!content.trim()) {
        setIsValidJson(true);
        setJsonError(null);
        return content;
      }

      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      setIsValidJson(true);
      setJsonError(null);
      return formatted;
    } catch (e) {
      setIsValidJson(false);
      setJsonError((e as Error).message);
      return content;
    }
  };

  const handleBodyChange = (value: string) => {
    if (type === "json") {
      const formattedValue = validateAndFormatJson(value);
      onChange({ ...body, content: formattedValue });
    } else {
      onChange({ ...body, content: value });
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || '';
    if (type === "json") {
      try {
        // Attempt to parse JSON to validate it
        JSON.parse(newValue);
        setIsValidJson(true);
        setJsonError(null);
      } catch (e) {
        setIsValidJson(false);
        setJsonError((e as Error).message);
      }
    }
    onChange({ ...body, content: newValue });
  };

  if (type === "json" || type === "raw") {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="p-2 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {type === "json" ? "JSON Body" : "Raw Body"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...body, content: "" })}
            className="h-7 px-2 text-xs"
          >
            Clear
          </Button>
        </div>
        <div className="flex-1">
          <Editor
            height="300px"
            defaultLanguage={type === "json" ? "json" : "text"}
            value={typeof body.content === "string" 
              ? body.content 
              : JSON.stringify(body.content, null, 2)}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: true},
              fontSize: 12,
              lineNumbers: 'on',
              folding: true,
              foldingStrategy: 'indentation',
              formatOnPaste: true,
              formatOnType: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              wrappingIndent: 'deepIndent',
            }}
          />
        </div>
        {type === "json" && (
          <div className="border-t border-slate-700">
            <div className="p-2">
              {!isValidJson && jsonError ? (
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 bg-red-950/20 rounded-md">
                  <span className="font-medium">Invalid JSON:</span>
                  <span className="font-mono">{jsonError}</span>
                </div>
              ) : (
                body.content && (
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-400">
                    <span>Valid JSON</span>
                    <span className="font-mono">
                      {JSON.stringify(body.content).length.toLocaleString()} bytes
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <KeyValueEditor
      pairs={
        params.length === 0
          ? [{ key: "", value: "", type: "text", showSecrets: false }]
          : params
      }
      onChange={onParamsChange}
      addButtonText={type === "form-data" ? "Add Form Field" : "Add Parameter"}
      showDescription={type === "form-data"}
      environments={environments}
      currentEnvironment={currentEnvironment}
      onEnvironmentChange={onEnvironmentChange}
      onEnvironmentsUpdate={onEnvironmentsUpdate}
      onAddToEnvironment={onAddToEnvironment}
    />
  );
}
