import React, { useState, useMemo, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; // Change to a more stable theme
import { languageConfigs, type CodeGenLanguage } from "@/utils/code-generators";
import { CodeGenerationTab } from './code-generation-tab';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Check,
  Copy,
  Save,
  AlertCircle,
  FileJson,
  FileText,
  Send,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collection, SavedRequest } from "@/types";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MessagesTab } from "./websocket/messages-tab";

const highlightCode = (code: string, language: string): string => {
  try {
    return hljs.highlight(code, { language }).value;
  } catch {
    return code;
  }
};

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

interface RequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time: string;
  size: string;
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

export function ResponsePanel({ response, isWebSocketMode, ...props }: ResponsePanelProps) {
  // Only hide the response panel (not other panels)
  if (!response && !isWebSocketMode) {
    return null;
  }

  // If in WebSocket mode, show WebSocket interface
  if (isWebSocketMode) {
    return (
      <div className="bg-slate-950 h-full flex flex-col">
        <div className="flex-1 relative bg-slate-900/90">
          <MessagesTab />
        </div>
      </div>
    );
  }

  const [copyStatus, setCopyStatus] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState("pretty");
  const [isOnline, setIsOnline] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<CodeGenLanguage>("curl");

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // Reset active tab when switching modes
    setActiveTab(isWebSocketMode ? "messages" : "pretty");
  }, [isWebSocketMode]);

  const contentType = useMemo(() => {
    if (!response?.headers) return "text";
    return getContentType(response.headers);
  }, [response?.headers]);

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
      let content = '';
      
      if (activeTab === 'code') {
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
      url: props.url,
      method: props.method,
      headers: response.headers || {},
      body: response.body ? JSON.stringify(response.body, null, 2) : undefined
    };

    try {
      return languageConfigs[selectedLanguage].generator(options);
    } catch (error) {
      console.error('Code generation error:', error);
      return '// Error generating code';
    }
  };

  const renderStatusBar = () => (
    !isWebSocketMode ? (
    <div className="sticky top-0 w-full px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
      <>
        <div className="flex items-center space-x-3">
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-medium border flex items-center",
          (response?.status || 0) >= 200 && (response?.status || 0) < 300
          ? "bg-green-500/10 text-green-400 border-green-500/20"
          : "bg-red-500/10 text-red-400 border-red-500/20"
        )}>
          <span>{response?.status || "---"}</span>
        </div>
        <Badge className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-cyan-400 border-cyan-500/30">
          {props.method}
        </Badge>
        </div>

        <div className="flex items-center space-x-4">
        {response?.time && (
          <div className="flex items-center text-slate-400">
          <Clock className="h-4 w-4 mr-1.5 opacity-70" />
          <span className="text-xs font-medium">{response.time}</span>
          </div>
        )}
        {response?.size && (
          <div className="flex items-center text-slate-400">
          <Database className="h-4 w-4 mr-1.5 opacity-70" />
          <span className="text-xs font-medium">{response.size}</span>
          </div>
        )}
        {!isOnline && (
          <div className="flex items-center text-amber-400">
          <AlertCircle className="h-4 w-4 mr-1.5" />
          <span className="text-xs font-medium">Offline</span>
          </div>
        )}
        </div>
      </>
      </div>
    ) : null
  );

  // Only hide the response content, not the entire panel
  const shouldShowContent = response || isWebSocketMode;

  return (
    <div className="bg-slate-900 h-full flex flex-col">
      {shouldShowContent ? (
        <>
          {renderStatusBar()}
          <Tabs
            defaultValue="pretty"
            className="flex-1 flex flex-col"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="w-full justify-start rounded-none bg-slate-800 border-b-2 border-slate-700 p-0">
              {!isWebSocketMode ? (
                <>
                  <TabsTrigger
                    value="pretty"
                    className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium text-xs md:text-sm data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800"
                  >
                    Pretty
                  </TabsTrigger>
                  <TabsTrigger
                    value="raw"
                    className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium text-xs md:text-sm data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800"
                  >
                    Raw
                  </TabsTrigger>
                  <TabsTrigger
                    value="headers"
                    className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium text-xs md:text-sm data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800"
                  >
                    Headers
                  </TabsTrigger>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <TabsTrigger
                      value="code"
                      className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium text-xs md:text-sm data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800"
                      >
                      <span>Code</span>
                      <div className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50">
                        {languageConfigs[selectedLanguage].icon({ 
                        className: "h-3 w-3 text-blue-300" 
                        })}
                      </div>
                      </TabsTrigger>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start"
                      sideOffset={0}
                      className="w-[100vw] md:w-[75vw] lg:w-[75vw] xl:w-[75w] bg-slate-800/95 border border-slate-600/50 rounded-none backdrop-blur-lg"
                    >
                      <div className="p-2 sticky top-0 z-10 bg-slate-800/95 backdrop-blur-lg">
                      <Input
                      type="search"
                      placeholder="Search languages..."
                      className="h-8 w-full bg-slate-900/90 border-2 border-slate-600 text-xs text-slate-400 placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500"
                      onChange={(e) => {
                      const searchTerm = e.target.value.toLowerCase();
                      const tabStrip = document.querySelector('.language-tabs');
                      if (tabStrip) {
                        const items = tabStrip.querySelectorAll('.language-tab');
                        items.forEach(item => {
                        const text = item.textContent?.toLowerCase() || '';
                        const match = text.includes(searchTerm);
                        (item as HTMLElement).style.display = match ? '' : 'none';
                        });
                      }
                      }}
                      />
                      </div>
                      
                      <div 
                      className="language-tabs overflow-x-auto whitespace-nowrap p-1"
                      style={{
                      scrollBehavior: 'smooth',
                      msOverflowStyle: 'none',
                      scrollbarWidth: 'none',
                      overflowY: 'hidden'
                      }}
                      >
                      <div className="flex gap-1">
                      {Object.entries(languageConfigs).map(([key, config]) => (
                      <div
                        key={key}
                        onClick={() => setSelectedLanguage(key as CodeGenLanguage)}
                        className={cn(
                        "language-tab flex-shrink-0 flex items-center gap-2 px-2 cursor-pointer transition-all",
                        selectedLanguage === key 
                        ? "text-blue-400" 
                        : "text-slate-400"
                        )}
                      >
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50">
                        {config.icon({ className: "h-3 w-3 text-blue-300" })}
                        </div>
                        <span className="text-sm font-medium text-slate-200">{config.name}</span>
                        {selectedLanguage === key && (
                        <Check className="h-3.5 w-3.5 text-blue-400 animate-in fade-in-0 zoom-in-50" />
                        )}
                      </div>
                      ))}
                      </div>
                      </div>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </>
              ) : (
                <TabsTrigger value="messages" className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium text-xs md:text-sm data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </TabsTrigger>
              )}
              <div className="ml-auto flex items-center pr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('saveRequest', {
                      detail: {
                        method: props.method,
                        url: props.url,
                        headers: response?.headers || [],
                        params: [], // Add if you have URL params
                        body: { type: 'none', content: '' }, // Add request body if available
                        auth: { type: 'none' }, // Add auth if available
                        response: {
                          status: response?.status,
                          body: response?.body
                        }
                      }
                    }));
                  }}
                  className="p-2 hover:text-slate-400 hover:bg-transparent"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="p-2 hover:text-slate-400 hover:bg-transparent"
                >
                  {copyStatus[activeTab] ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsList>

            <div className="flex-1 relative bg-slate-800/90 text-blue-300">
              {!isWebSocketMode ? (
                <>
                  <TabsContent value="pretty" className="absolute inset-0 m-0">
                    <ScrollArea className="h-full bg-slate-900/50 backdrop-blur-sm">
                      <div className="p-4">
                        <div className="max-w-full overflow-hidden">
                          <pre
                            className="font-mono text-xs whitespace-pre-wrap break-all"
                            style={{
                              maxWidth: '100%',
                              overflowWrap: 'break-word',
                              wordBreak: 'break-word'
                            }}
                          >
                            {contentType === "json" ? (
                              <pre
                                className="font-mono text-xs"
                                style={{
                                  tabSize: 2,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: highlightCode(
                                    typeof getContentForTab() === 'string' && getContentForTab().trim().startsWith('{')
                                      ? JSON.stringify(JSON.parse(getContentForTab()), null, 2)
                                      : getContentForTab(),
                                    "json"
                                  ),
                                }}
                              />
                            ) : contentType === "html" ? (
                              <pre
                                className="font-mono text-xs"
                                style={{
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: highlightCode(
                                    getContentForTab().replace(/></g, ">\n<"),
                                    "html"
                                  ),
                                }}
                              />
                            ) : (
                              <pre
                                className="font-mono text-xs"
                                style={{
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: highlightCode(
                                    getContentForTab(),
                                    getLanguage(contentType)
                                  ),
                                }}
                              />
                            )}
                          </pre>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="raw" className="absolute inset-0 m-0">
                    <ScrollArea className="h-full bg-slate-900/50 backdrop-blur-sm">
                      <div className="p-2">
                        <div
                          className="font-mono text-xs break-all p-2 overflow-x-auto"
                          dangerouslySetInnerHTML={{
                            __html: highlightCode(
                              getContentForTab(),
                              getLanguage(contentType)
                            ),
                          }}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="headers" className="absolute inset-0 m-0">
                    <ScrollArea className="h-full bg-slate-900/50 backdrop-blur-sm">
                      <div className="p-4">
                        {response?.headers &&
                        Object.keys(response.headers).length > 0 ? (
                          <div className="w-full table border-separate border-spacing-0">
                            {Object.entries(response.headers).map(([key, value]) => (
                              <div key={key} className="table-row group hover:bg-slate-800/50">
                                <div className="table-cell py-2 pr-4 text-xs font-semibold text-blue-100 whitespace-nowrap align-top border-b border-slate-700">
                                  {key}
                                  <div className="hidden group-hover:block absolute h-4 w-px bg-slate-700/50 -right-0.5 top-1/2 -translate-y-1/2" />
                                </div>
                                <div className="table-cell py-2 pl-4 text-xs font-mono break-all text-blue-300 align-top border-b border-slate-700">
                                  {value}
                                </div>
                              </div>
                            ))}
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
                    <ScrollArea className="h-full bg-slate-900/50 backdrop-blur-sm">
                      <CodeGenerationTab
                        getGeneratedCode={getGeneratedCode}
                        selectedLanguage={selectedLanguage}
                        setSelectedLanguage={setSelectedLanguage}
                      />
                    </ScrollArea>
                  </TabsContent>
                </>
              ) : (
                <TabsContent value="messages" className="absolute inset-0 m-0">
                  <MessagesTab />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-500 text-sm">Make a request to see the response</div>
        </div>
      )}
    </div>
  );
}
