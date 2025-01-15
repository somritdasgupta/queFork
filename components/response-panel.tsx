"use client";

import React, { useState } from "react";
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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface RequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time: string;
  size: string;
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

  const getContentForTab = () => {
    if (!response) return "";

    switch (activeTab) {
      case "pretty":
        return typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body, null, 2);
      case "raw":
        return typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body);
      case "headers":
        return Object.entries(response.headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
      default:
        return "";
    }
  };

  const copyToClipboard = async () => {
    try {
      const content = getContentForTab();
      await navigator.clipboard.writeText(content);
      setCopyStatus((prev) => ({ ...prev, [activeTab]: true }));
      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [activeTab]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSaveToCollection = () => {
    if (!selectedCollection || !requestName) {
      toast.error("Please fill in all fields");
      return;
    }

    const request: Partial<SavedRequest> = {
      name: requestName,
      method,
      url,
      headers: [],
      params: [],
      body: { type: "raw", content: "" },
    };

    onSaveToCollection(selectedCollection, request);
    setIsSaveDialogOpen(false);
    setSelectedCollection("");
    setRequestName("");
    toast.success("Request saved to collection");
  };

  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Sending request...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <p className="font-medium">Send a request to see the response</p>
        </div>
      </div>
    );
  }

  const StatusIcon =
    response.status >= 200 && response.status < 300 ? CheckCircle : XCircle;
  const statusColor =
    response.status >= 200 && response.status < 300
      ? "text-green-500"
      : "text-red-500";

  return (
    <div className="rounded-md bg-white h-full flex flex-col">
      <div className="p-3 border-b-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusColor}`} />
            <Badge
              variant={
                response.status >= 200 && response.status < 300
                  ? "default"
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
                    onValueChange={setSelectedCollection}
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
              <>
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
              </>
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
                <pre className="whitespace-pre-wrap font-mono text-sm max-w-[100vw]">
                  {typeof response.body === "string"
                    ? response.body
                    : JSON.stringify(response.body, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="raw" className="absolute inset-0 m-0">
            <ScrollArea className="h-full overflow-auto">
              <div className="p-4">
                <div className="font-mono text-sm break-all max-w-[100vw]">
                  {typeof response.body === "string"
                    ? response.body
                    : JSON.stringify(response.body).replace(/\s+/g, "")}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

            <TabsContent value="headers" className="absolute inset-0 m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
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
              </div>
            </ScrollArea>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
