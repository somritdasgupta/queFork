import React, { useState, useRef, useMemo, useEffect } from "react";
import { Tabs } from "@/components/ui/tabs";
import { languageConfigs, type CodeGenLanguage } from "@/utils/code-generators";
import {
  Collection,
  SavedRequest,
  type RequestResponse as ApiRequestResponse,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MessagesTab } from "./response-panel/tabs/messages-tab";
import { CodeLanguageSelector } from "./response-panel/code-language-selector";
import { useTheme } from "next-themes";
import { useWebSocket } from "@/components/websocket/websocket-context";
import { PanelState } from "@/types/panel";
import { PanelCollapseButton } from "./response-panel/panel-collapse-button";

// Import new components
import { RequestStatus } from "./response-panel/request-status";
import { HeadersContent } from "./response-panel/tabs/headers-content";
import { CodeContent } from "./response-panel/tabs/code-content";
import { TabHeader } from "./response-panel/tabs/tab-header";
import {
  formatContent,
  getContentType,
  getFormattedContent,
} from "./response-panel/content-formatter";
import { motion } from "framer-motion";
import {
  FileJson,
  List,
  Badge,
  PlugZap2,
  Unplug,
  Maximize2,
  ChevronUp,
} from "lucide-react";
import { RequestSaveForm } from "./collections-panel/request-save-form";
import { ResponseMeta } from "./response-panel/response-meta";
import { LoadingDots } from "./shared/loading-dots";
import { ResponseContent } from "./response-panel/tabs/response-content";
import { PanelResizeButton } from "./response-panel/panel-resize-button";
import { WebSocketStatus } from "./response-panel/websocket-status";

// Update interface to match API type
interface RequestResponse extends ApiRequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time?: string;
  size?: string;
  intercepted?: boolean;
  error?: string;
}

// Add panel state utilities
const isCollapsed = (state?: PanelState): boolean => state === "collapsed";
const isFullscreen = (state?: PanelState): boolean => state === "fullscreen";
const isExpanded = (state?: PanelState): boolean => state === "expanded";

interface TabItem {
  id: string;
  label: string | React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  dropdown?: React.ReactNode;
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
  panelState?: PanelState;
  showContentOnly?: boolean;
  isOverlay?: boolean;
  preserveStatusBar?: boolean;
  onCreateCollection: (collection: {
    name: string;
    description: string;
    apiVersion: string;
  }) => Promise<void>;
}

export function ResponsePanel({ ...props }: ResponsePanelProps) {
  const {
    response,
    isLoading,
    method,
    url,
    isWebSocketMode,
    onPanelStateChange,
    panelState,
    showContentOnly,
    collections,
    onSaveToCollection,
    onCreateCollection,
  } = props;

  // Add missing state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [activeTab, setActiveTab] = useState("response");
  const [isPrettyPrint, setIsPrettyPrint] = useState(true);
  const [selectedLanguage, setSelectedLanguage] =
    useState<CodeGenLanguage>("curl");
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: boolean }>({});
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [pendingSaveRequest, setPendingSaveRequest] =
    useState<Partial<SavedRequest> | null>(null);

  // Keep refs
  const editorRef = useRef<any>(null);
  const editorInstanceRef = useRef<any>(null);

  // Essential memos
  const contentType = useMemo(
    () => (response?.headers ? getContentType(response.headers) : "text"),
    [response?.headers]
  );

  const tabs = useMemo(
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
            strokeWidth={2}
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

  // Essential handlers
  const handleSaveRequest = () => {
    if (!response) {
      toast.error("No response to save");
      return;
    }

    const requestDetails: Partial<SavedRequest> = {
      name: url.split("/").pop() || "New Request", // Add default name
      method,
      url,
      headers: Object.entries(response.headers || {}).map(([key, value]) => ({
        key,
        value,
        type: "",
        enabled: true,
        showSecrets: false,
      })),
      params: [],
      body: { type: "none", content: "" },
      auth: { type: "none" },
      response: {
        status: response.status,
        body: response.body,
        headers: response.headers,
        time: response.time,
        size: response.size,
      },
      preRequestScript:
        (window as any).__ACTIVE_REQUEST__?.preRequestScript || "",
      testScript: (window as any).__ACTIVE_REQUEST__?.testScript || "",
      testResults: (window as any).__ACTIVE_REQUEST__?.testResults || [],
      scriptLogs: (window as any).__ACTIVE_REQUEST__?.scriptLogs || [],
    };

    setPendingSaveRequest(requestDetails);
    setShowSaveForm(true);
  };

  const handleCreateCollection = async (collection: {
    name: string;
    description: string;
    apiVersion: string;
  }) => {
    try {
      // Wait for the collection to be created and get its ID
      const newCollectionId = await onCreateCollection(collection);
      setShowCreateForm(false);

      // If we have a pending save request and collection was created successfully
      if (pendingSaveRequest && requestName && newCollectionId) {
        onSaveToCollection(newCollectionId, {
          ...pendingSaveRequest,
          name: requestName,
        });
        setPendingSaveRequest(null);
        setRequestName("");
        setShowSaveForm(false);
      }

      toast.success("Collection created");
    } catch (error) {
      console.error("Failed to create collection:", error);
      toast.error("Failed to create collection");
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

  // Add utility functions
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

  // Add formatted content memo with pretty print consideration
  const formattedContent = useMemo(() => {
    if (!response?.body) return "";

    try {
      // For non-JSON content, return as is
      if (contentType !== "json") {
        return typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body);
      }

      // For JSON content
      const jsonString =
        typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body);

      // Parse and re-stringify to ensure valid JSON
      const parsed = JSON.parse(jsonString);

      // Format based on pretty print state
      return isPrettyPrint
        ? JSON.stringify(parsed, null, 2) // Pretty print with 2 spaces
        : JSON.stringify(parsed); // Compact without formatting
    } catch (e) {
      // Fallback for invalid JSON
      return typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body);
    }
  }, [response?.body, contentType, isPrettyPrint]);

  // Effects
  useEffect(() => {
    setActiveTab(isWebSocketMode ? "messages" : "response");
  }, [isWebSocketMode]);

  // WebSocket mode render
  if (isWebSocketMode) {
    return (
      <div
        className={cn(
          "bg-slate-900 flex flex-col relative",
          "h-full min-h-0 flex-1"
        )}
      >
        {isCollapsed(panelState) ? (
          <div className="sticky top-0 w-full px-4 py-2 border-y border-slate-800 bg-slate-800/25 backdrop-blur-sm flex items-center justify-between">
            <WebSocketStatus url={url} />
            <PanelCollapseButton
              panelState={panelState}
              onPanelStateChange={onPanelStateChange}
              isCollapsed={isCollapsed(panelState)}
            />
          </div>
        ) : (
          <PanelCollapseButton
            panelState={panelState}
            onPanelStateChange={onPanelStateChange}
            isCollapsed={isCollapsed(panelState)}
            floating
          />
        )}

        <div
          className={cn(
            "flex-1 min-h-0",
            !showContentOnly && "bg-slate-900/90",
            panelState === "collapsed" && "hidden"
          )}
        >
          {!showContentOnly && <MessagesTab />}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col bg-slate-900")}>
      {response || isWebSocketMode ? (
        <>
          <div className="sticky top-0 w-full px-4 py-2 border-y border-slate-800 bg-slate-800/25 backdrop-blur-sm flex items-center justify-between">
            <RequestStatus
              method={method}
              status={response?.status}
              isIntercepted={response?.intercepted}
            />
            <div className="flex items-center gap-2">
              <ResponseMeta time={response?.time} size={response?.size} />
              <PanelCollapseButton
                panelState={panelState}
                onPanelStateChange={onPanelStateChange}
                isCollapsed={isCollapsed(panelState)}
              />
            </div>
          </div>

          {panelState !== "collapsed" && (
            <div className="flex-1 min-h-0 flex flex-col relative">
              <Tabs
                defaultValue="response"
                className="flex-1 flex flex-col min-h-0"
              >
                <TabHeader
                  tabs={tabs as TabItem[]} // Add type assertion here
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  contentType={contentType}
                  isPrettyPrint={isPrettyPrint}
                  setIsPrettyPrint={setIsPrettyPrint}
                  copyStatus={copyStatus}
                  onSave={handleSaveRequest}
                  onCopy={copyToClipboard}
                />

                <div className="flex-1 relative bg-slate-900/50 min-h-0">
                  {showSaveForm && pendingSaveRequest && (
                    <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm">
                      <RequestSaveForm
                        collections={collections}
                        onClose={() => {
                          setShowSaveForm(false);
                          setPendingSaveRequest(null);
                        }}
                        onSaveToCollection={onSaveToCollection}
                        onCreateCollection={handleCreateCollection}
                        pendingRequest={pendingSaveRequest}
                        className="border-none"
                      />
                    </div>
                  )}

                  <ResponseContent
                    isLoading={isLoading}
                    formattedContent={formattedContent}
                    contentType={contentType}
                    editorRef={editorRef}
                    editorInstanceRef={editorInstanceRef}
                    isPrettyPrint={isPrettyPrint} // Pass the prop
                  />

                  <HeadersContent response={response} />

                  <CodeContent
                    response={response}
                    method={method}
                    url={url}
                    selectedLanguage={selectedLanguage}
                  />

                  {isWebSocketMode && (
                    <div className="h-full">
                      <MessagesTab />
                    </div>
                  )}
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
