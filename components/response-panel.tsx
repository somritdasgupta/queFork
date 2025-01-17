"use client";

import React, { useState, useMemo, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/tokyo-night-dark.css";

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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collection, SavedRequest } from "@/types";
import { toast } from "sonner";

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

const isJsonString = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

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
      const content = getContentForTab();
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
            <span className="inline-flex px-4 rounded-md text-sm bg-gray-100 border-2 border-gray-200 text-blue-600 duration-9000 animate-pulse">
              waiting for request
            </span>
          </div>
          <div className="space-y-6">
            <div className="group hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-500">
                <div className="px-2 rounded-md font-bold bg-gray-200 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  1
                </div>
                <span className="group-hover:text-blue-500 transition-colors text-center">
                  Select the type of HTTP method
                </span>
              </div>
            </div>

            <div className="group hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-center justify-center gap-3 text-sm text-blue-500">
                <div className="px-2 rounded-md font-bold bg-gray-200 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  2
                </div>
                <span className="group-hover:text-blue-500 transition-colors text-center">
                  Enter request URL endpoint
                </span>
              </div>
            </div>

            <div className="group hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-center justify-center gap-3 text-sm text-blue-500">
                <div className="px-2 rounded-md font-bold bg-gray-200 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  3
                </div>
                <span className="group-hover:text-blue-500 transition-colors text-center">
                  Click send for request
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (response.error) {
    return (
      <div className="border border-slate-700 rounded-md bg-slate-900 h-full flex flex-col">
        <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <Badge variant="destructive">Error</Badge>
            <span className="text-sm text-slate-400 ml-2">{response.time}</span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={copyToClipboard}
            className="gap-2 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            {copyStatus[activeTab] ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 bg-slate-900 p-4">
          <pre className="text-red-400 font-mono text-sm whitespace-pre-wrap">
            Error: {response.error}
          </pre>
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
              <DialogContent className="sm:top-[50%] top-[unset] bottom-0 sm:bottom-[unset] sm:translate-y-[-50%] translate-y-0 rounded-b-none sm:rounded-lg">
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
                  onChange={(e) => setRequestName(e.target.value.slice(0, 12))}
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
            <ScrollArea className="h-full overflow-auto">
              <div className="p-2">
                <pre
                  className="font-mono text-sm p-2 whitespace-pre-wrap break-all sm:break-words sm:max-w-sm sm:max-w-none"
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
        </div>
      </Tabs>
    </div>
  );
}
