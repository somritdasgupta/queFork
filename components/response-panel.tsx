"use client"

import React, { useState, useMemo, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/tokyo-night-dark.css";
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
}: ResponsePanelProps) {
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState("pretty");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [requestName, setRequestName] = useState("");
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
      
      // Handle code tab differently
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

  const handleSaveToCollection = () => {
    if (!selectedCollection || !requestName) {
      toast.error("Please fill in all required fields");
      return;
    }

    const request: Partial<SavedRequest> = {
      name: requestName,
      method,
      url,
      headers: [],
      params: [],
      body: { type: "none", content: "" },
    };

    onSaveToCollection(selectedCollection, request);
    setIsSaveDialogOpen(false);
    setSelectedCollection("");
    setRequestName("");
    toast.success("Request saved to collection");
  };

  const getGeneratedCode = () => {
    if (!response) return "";
    
    const options = {
      url,
      method,
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

  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center p-6 mt-8">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Sending request...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="min-h-[200px] flex items-center justify-center p-4 mt-2">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="pt-4">
            <span className="inline-flex items-center gap-2 px-4 py-0 rounded-lg text-sm bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-500 border border-blue-500/20">
              <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              waiting for request
            </span>
          </div>
          <div className="space-y-6">
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-400 leading-relaxed">
              Send your first API request by configuring the method and URL above
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (response.error) {
    return (
      <div className="bg-slate-950 h-auto w-full flex flex-col">
        <div className="sticky top-0 w-full px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="animate-pulse bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-medium border border-red-500/20 flex items-center">
              <XCircle className="h-3 w-3 mr-1.5" />
              Error
            </div>
            <Badge className="inline-flex items-center px-2.5 rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-cyan-400 text-xs font-medium tracking-wide border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)] backdrop-blur-sm transform transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] hover:border-cyan-400/40 hover:text-cyan-200">
              {method.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center text-slate-400">
              <Clock className="h-4 w-4 mr-1.5 opacity-70" />
              <span className="text-xs font-medium">{response.time}</span>
            </div>
            {!isOnline && (
              <div className="flex items-center text-amber-400">
                <AlertCircle className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">Offline</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col lg:flex-row gap-4 p-4 bg-gradient-to-b from-slate-900 to-slate-950">
          {/* Left side - Error details */}
          <div className="flex-1 lg:w-1/2 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Request URL
              </label>
              <div className="p-2 bg-slate-800/30 rounded-md border border-slate-700/50">
                <code className="text-sm text-blue-400 font-mono break-all">
                  {url}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                Error Details
              </label>
              <div className="p-2 bg-slate-800/30 rounded-md border border-red-700/30">
                <pre className="text-sm text-red-400 font-mono whitespace-pre-wrap break-words">
                  {response.error}
                </pre>
              </div>
            </div>
          </div>

          {/* Right side - Troubleshooting */}
          <div className="lg:w-1/2 p-4 font-mono text-sm bg-slate-800/20 rounded-lg border border-slate-700/50">
            <ul className="space-y-0 text-sm text-slate-400">
              <li className="flex items-center gap-4 p-2 hover:bg-slate-800/30 rounded-md transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>
                  Check your network connection{" "}
                  {!isOnline && "(Currently Offline)"}
                </span>
              </li>
              <li className="flex items-center gap-4 p-2 hover:bg-slate-800/30 rounded-md transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <span>Verify the API endpoint URL is correct</span>
              </li>
              <li className="flex items-center gap-4 p-2 hover:bg-slate-800/30 rounded-md transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Ensure proper authentication if required</span>
              </li>
              <li className="flex items-center gap-4 p-2 hover:bg-slate-800/30 rounded-md transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>Check request headers and parameters</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 h-full flex flex-col">
      <div className="px-4 py-2 border-b-2 border-slate-700 backdrop-blur-lg bg-slate-800/50 flex flex-row gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium text-xs
            ${
              response.status >= 200 && response.status < 300
                ? "bg-gradient-to-r from-green-600/40 to-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 border-2 border-green-700"
                : "bg-gradient-to-r from-red-600/40 to-rose-500/20 text-red-400 ring-1 ring-red-500/30 border-2 border-red-700"
            }`}
          >
            {response.status >= 200 && response.status < 300 ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            <span>{response.status}</span>
          </div>

          {/* Content Type Chip */}
          <div className="inline-flex justify-items-end px-2 py-1 rounded-full border-2 border-slate-600 bg-slate-600/40 text-xs font-medium text-slate-300 ring-1 ring-emerald-500/30  transition-colors hover:bg-slate-700">
            {contentType === "json" ? (
              <FileJson className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
            ) : (
              <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            )}
            {contentType.toLowerCase()}
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center divide-x divide-slate-600">
          <div className="flex items-center px-3 text-xs font-medium text-slate-300">
            <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            <span className="tabular-nums">{response.time}</span>
          </div>
          <div className="flex items-center px-3 text-xs font-medium text-slate-300">
            <Database className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            <span className="tabular-nums">{response.size}</span>
          </div>
          {!isOnline && (
            <div className="flex items-center px-3 text-xs font-medium text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              Offline
            </div>
          )}
        </div>
      </div>

      <Tabs
        defaultValue="pretty"
        className="flex-1 flex flex-col"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="w-full justify-start rounded-none bg-slate-800 border-b-2 border-slate-700 p-0">
          <TabsTrigger
            value="pretty"
            className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800"
          >
            Pretty
          </TabsTrigger>
          <TabsTrigger
            value="raw"
            className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800"
          >
            Raw
          </TabsTrigger>
          <TabsTrigger
            value="headers"
            className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800"
          >
            Headers
          </TabsTrigger>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TabsTrigger
                value="code"
                className="rounded-none border-b-4 border-transparent px-4 py-2 font-medium data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-slate-800 group flex items-center gap-2"
              >
                <span>Code</span>
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-700/50 group-hover:bg-slate-700">
                  {languageConfigs[selectedLanguage].icon({ 
                    className: "h-3.5 w-3.5 text-blue-400" 
                  })}
                </div>
              </TabsTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="bg-slate-800 border-slate-600 max-h-[400px] overflow-y-auto rounded-lg shadow-lg backdrop-blur-sm"
            >
              {Object.entries(languageConfigs).map(([key, config]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSelectedLanguage(key as CodeGenLanguage)}
                  className={cn(
                    "flex items-center gap-3 py-2.5 px-3 cursor-pointer transition-colors hover:bg-slate-700",
                    selectedLanguage === key && "bg-blue-500/10 text-blue-400"
                  )}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-700/50">
                    {config.icon({ className: "h-4 w-4 text-blue-300" })}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-slate-400">{config.name}</span>
                  </div>
                  {selectedLanguage === key && (
                    <Check className="h-4 w-4 ml-auto text-blue-400" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center pr-2">
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:text-slate-400 hover:bg-transparent"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-t-lg sm:rounded-lg">
                <DialogHeader>
                  <DialogTitle>Save Request to Collection</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="collection">Collection</Label>
                    <Select
                      value={selectedCollection}
                      onValueChange={setSelectedCollection}
                    >
                      <SelectTrigger id="collection">
                        <SelectValue placeholder="Select collection" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {collections.map((collection) => (
                            <SelectItem
                              key={collection.id}
                              value={collection.id}
                            >
                              {collection.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Request Name</Label>
                    <Input
                      id="name"
                      value={requestName}
                      onChange={(e) =>
                        setRequestName(e.target.value.slice(0, 12))
                      }
                      placeholder="Enter request name"
                      maxLength={12}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsSaveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveToCollection}
                    disabled={!selectedCollection || !requestName}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

        <div className="flex-1 relative bg-slate-900/90 text-blue-300">
          <TabsContent value="pretty" className="absolute inset-0 m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                <div className="max-w-full overflow-hidden">
                  <pre
                    className="font-mono text-sm whitespace-pre-wrap break-all"
                    style={{
                      maxWidth: '100%',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word'
                    }}
                  >
                    {contentType === "json" ? (
                      <pre
                        className="font-mono text-sm"
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
                        className="font-mono text-sm"
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
                        className="font-mono text-sm"
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
            <ScrollArea className="h-full overflow-auto">
              <div className="p-2">
                <div
                  className="font-mono text-sm break-all p-2 overflow-x-auto"
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
            <ScrollArea className="h-full">
              <div className="p-4">
                {response.headers &&
                Object.keys(response.headers).length > 0 ? (
                  <div className="w-full table border-separate border-spacing-0">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="table-row hover:bg-slate-800">
                        <div className="table-cell py-2 pr-4 text-sm font-semibold text-blue-100 whitespace-nowrap align-top border-b border-slate-700">
                          {key}
                        </div>
                        <div className="table-cell py-2 pl-4 text-sm font-mono break-all text-blue-300 align-top border-b border-slate-700">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                    <Database className="h-8 w-8 mb-2 opacity-50" />
                    <p>No headers available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="code" className="absolute inset-0 m-0">
            <ScrollArea className="h-full">
              <CodeGenerationTab
                getGeneratedCode={getGeneratedCode}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
              />
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
