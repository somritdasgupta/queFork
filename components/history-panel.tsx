"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Settings2, Trash2, X, Download, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { HistoryItem } from "@/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  isMobile?: boolean;
  onToggleHistorySaving: (enabled: boolean) => void;
  isHistorySavingEnabled: boolean;
  shouldSaveErrors?: boolean;
}

export function HistoryPanel({
  history,
  onSelectItem,
  onClearHistory,
  onDeleteItem,
  isMobile = false,
  onToggleHistorySaving,
  isHistorySavingEnabled,
  shouldSaveErrors = false,
}: HistoryPanelProps) {
  const [search, setSearch] = useState("");
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(true);
  const [autoDeleteDays, setAutoDeleteDays] = useState(30);

  useEffect(() => {
    const savedSettings = localStorage.getItem("historySettings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setIsHistoryEnabled(settings.isEnabled);
      setAutoDeleteDays(settings.autoDeleteDays);
    }
  }, []);

  useEffect(() => {
    const handleWebSocketHistoryUpdate = (event: CustomEvent) => {
      console.log("WebSocket history updated:", event.detail.history);
    };

    window.addEventListener(
      "websocketHistoryUpdated",
      handleWebSocketHistoryUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "websocketHistoryUpdated",
        handleWebSocketHistoryUpdate as EventListener
      );
    };
  }, []);

  const saveSettings = (settings: {
    isEnabled: boolean;
    autoDeleteDays: number;
  }) => {
    localStorage.setItem("historySettings", JSON.stringify(settings));
    setIsHistoryEnabled(settings.isEnabled);
    setAutoDeleteDays(settings.autoDeleteDays);
    onToggleHistorySaving(settings.isEnabled);
  };

  const handleDeleteItem = (id: string) => {
    if (!isHistoryEnabled) return;
    onDeleteItem(id);
    toast.success("History item removed");
  };

  const handleClearHistory = () => {
    if (!isHistoryEnabled) return;
    onClearHistory();
    toast.success("History cleared");
  };

  const handleSelectItem = (item: HistoryItem) => {
    if (!isHistoryEnabled) return;

    if (item.type === "websocket") {
      const selectedProtocol = item.wsStats?.protocols?.[0] || "websocket";
      window.dispatchEvent(
        new CustomEvent("openWebSocket", {
          detail: {
            url: item.url,
            protocols: item.wsStats?.protocols || [],
            selectedProtocol,
          },
        })
      );

      window.dispatchEvent(new Event("openWebSocketPanel"));
    } else {
      onSelectItem(item);
    }
  };

  const exportHistory = () => {
    if (!isHistoryEnabled) {
      toast.error("Cannot export history. History is disabled.");
      return;
    }
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-history-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("History exported successfully");
  };

  const filteredHistory = history.filter(
    (item) =>
      item.url.toLowerCase().includes(search.toLowerCase()) ||
      (item.method?.toLowerCase() || "ws").includes(search.toLowerCase())
  );

  const getConnectionType = (item: HistoryItem) => {
    if (item.type === "websocket") {
      const isSocketIO = item.wsStats?.protocols?.some((p) => p === "socketio");
      return isSocketIO ? "IO" : "WS";
    }
    return item.method;
  };

  function getMethodColor(method: string | undefined): string {
    if (!method) return "border-gray-200 bg-gray-50 text-gray-700";
    switch (method.toUpperCase()) {
      case "GET":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "POST":
        return "border-green-200 bg-green-50 text-green-700";
      case "PUT":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";
      case "DELETE":
        return "border-red-200 bg-red-50 text-red-700";
      case "PATCH":
        return "border-orange-200 bg-orange-50 text-orange-700";
      case "WS":
        return "border-purple-200 bg-purple-50 text-purple-700";
      case "WSS":
        return "border-rose-200 bg-rose-50 text-rose-700";
      case "IO":
        return "border-indigo-200 bg-indigo-50 text-indigo-700";
      default:
        return "border-slate-200 bg-slate-50 text-slate-700";
    }
  }

  function getStatusColor(status: number): string {
    if (status >= 200 && status < 300) {
      return "border-green-200 bg-green-50 text-green-700";
    } else if (status >= 300 && status < 400) {
      return "border-blue-200 bg-blue-50 text-blue-700";
    } else if (status >= 400 && status < 500) {
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    } else if (status >= 500) {
      return "border-red-200 bg-red-50 text-red-700";
    } else {
      return "border-gray-200 bg-gray-50 text-gray-700";
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 space-y-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-30 h-6 text-sm p-2 font-medium rounded-lg bg-gray-100 border-2">
              {history.length} Logs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearHistory}
              disabled={!isHistoryEnabled}
              className="h-8 w-8 text-gray-500 hover:text-gray-900 border-slate-200 border-2 shadow-inner"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-900 border-slate-200 border-2 shadow-inner"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>History Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Enable History
                    </label>
                    <Switch
                      checked={isHistoryEnabled}
                      onCheckedChange={(checked) => {
                        saveSettings({ isEnabled: checked, autoDeleteDays });
                        toast.success(
                          `History ${checked ? "enabled" : "disabled"}`
                        );
                      }}
                    />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportHistory}>
                  <Download className="mr-2 h-4 w-4" />
                  Export History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search history"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-8 bg-gray-100 shadow-inner"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {!isHistoryEnabled ? (
            <div className="text-center py-8 text-sm text-gray-500">
              History is currently disabled
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-12 py-12 px-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 b p-6 mb-8 shadow-lg shadow-inner">
                <Clock className="h-8 w-8 text-gray-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Request History
              </h3>
              <div className="max-w-sm text-center space-y-2">
                <p className="text-sm text-gray-500">
                  Your API request history log will show here once make some
                  requests.
                </p>
              </div>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="relative group rounded-lg border-2 border-gray-200 hover:border-gray-200 bg-gray-50 hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => handleSelectItem(item)}
                  className="w-full text-left p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs border-2 rounded-full",
                        getMethodColor(getConnectionType(item))
                      )}
                    >
                      {getConnectionType(item)}
                    </span>
                    {item.type === "websocket" && item.wsStats && (
                      <>
                        <span className="text-xs text-gray-500">
                          ↑{item.wsStats.messagesSent} ↓
                          {item.wsStats.messagesReceived}
                        </span>
                      </>
                    )}
                    {item.type !== "websocket" && (
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs border-2 rounded-full",
                          item.response?.status
                            ? getStatusColor(item.response.status)
                            : "border-red-200 bg-red-50 text-red-700"
                        )}
                      >
                        {item.response?.status || "error"}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.timestamp).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 break-all font-mono">
                    {item.url}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.response?.time && (
                      <div className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                        <span className="font-medium mr-1">Time:</span>
                        {item.response.time}
                      </div>
                    )}
                    {item.response?.size && (
                      <div className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                        <span className="font-medium mr-1">Size:</span>
                        {item.response.size}
                      </div>
                    )}
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteItem(item.id)}
                  disabled={!isHistoryEnabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
