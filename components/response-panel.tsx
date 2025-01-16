"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
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
      folderId: selectedFolder || undefined,
    };

    onSaveToCollection(selectedCollection, request);
    setIsSaveDialogOpen(false);
    setSelectedCollection("");
    setSelectedFolder(null);
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
      <div className="min-h-[200px] flex items-center justify-center p-6 mt-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="relative">
            <div className="w-24 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-500 font-semibold">
              {"Ready"}
            </div>
          </div>
          <div className="space-y-2">
            <ul className="text-sm text-gray-500 space-y-1 mt-8">
              <li>• Enter a URL in the request bar above</li>
              <li>• Select type of HTTP method</li>
              <li>• Click the Send button to make the request</li>
            </ul>
          </div>
          <div className="pt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-blue-50 animate-pulse">
              Waiting for request
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (response.error) {
    return (
      <div className="border rounded-md bg-white h-full flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <Badge variant="destructive">Error</Badge>
            <span className="text-sm text-gray-500 ml-2">{response.time}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="gap-2"
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
            {response.error}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="border bg-white h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {response.status >= 200 && response.status < 300 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <Badge
              variant={
                response.status >= 200 && response.status < 300
                  ? "secondary"
                  : "destructive"
              }
            >
              {response.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{response.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>{response.size}</span>
            </div>
            <Badge variant="outline" className="ml-0 bg-gray-100 text-gray-600">
              {contentType.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Save className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save to Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Collection</Label>
                  <Select
                    value={selectedCollection}
                    onValueChange={(value) => {
                      setSelectedCollection(value);
                      setSelectedFolder(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Collections</SelectLabel>
                        {collections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                {selectedCollection && (
                  <div className="space-y-2">
                    <Label>Folder (Optional)</Label>
                    <Select
                      value={selectedFolder || ""}
                      onValueChange={setSelectedFolder}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Folders</SelectLabel>
                          <SelectItem value="root">Root</SelectItem>
                          {collections
                            .find((c) => c.id === selectedCollection)
                            ?.folders.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                {folder.name}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Request Name</Label>
                  <Input
                    placeholder="Enter request name"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsSaveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveToCollection}>Save Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="gap-2"
          >
            {copyStatus[activeTab] ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="pretty"
        className="flex-1 flex flex-col"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="pretty"
            className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium data-[state=active]:border-primary"
          >
            Pretty
          </TabsTrigger>
          <TabsTrigger
            value="raw"
            className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium data-[state=active]:border-primary"
          >
            Raw
          </TabsTrigger>
          <TabsTrigger
            value="headers"
            className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium data-[state=active]:border-primary"
          >
            Headers
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 relative bg-slate-900 text-blue-300">
          <TabsContent value="pretty" className="absolute inset-0 m-0">
            <ScrollArea className="h-full overflow-auto">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                  <FileJson className="h-4 w-4" />
                  <span>Formatted Response</span>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-slate-800 p-4 rounded-md overflow-x-auto">
                  {getContentForTab()}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="raw" className="absolute inset-0 m-0">
            <ScrollArea className="h-full overflow-auto">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                  <FileText className="h-4 w-4" />
                  <span>Raw Response</span>
                </div>
                <div className="font-mono text-sm break-all bg-slate-800 p-4 rounded-md overflow-x-auto">
                  {getContentForTab()}
                </div>
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
