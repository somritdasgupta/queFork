import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Clock, History, X, DownloadIcon, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { HistoryItem } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "./websocket/websocket-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";

const truncateUrl = (url: string, containerWidth: number) => {
  // Store original URL for click handling
  const displayUrl = url
    .replace(/^(https?:\/\/)?(www\.)?/, "") // Remove protocol and www
    .replace(/\/$/, ""); // Remove trailing slash

  const minChars = 26;
  const maxChars = 48;

  // Calculate maximum displayable characters based on container width
  const baseWidth = containerWidth - 120;
  const charsPerPixel = 0.125;
  const calculatedLength = Math.floor(baseWidth * charsPerPixel);

  // If URL is shorter than minimum, show full URL
  if (displayUrl.length <= minChars) {
    return displayUrl;
  }

  // If URL is between min and max chars, use container width to determine truncation
  if (displayUrl.length <= maxChars) {
    // Only truncate if calculated length is valid and less than actual length
    if (calculatedLength > minChars && calculatedLength < displayUrl.length) {
      return displayUrl.slice(0, calculatedLength) + "...";
    }
    return displayUrl;
  }

  // If longer than maxChars, always truncate to maxChars
  return displayUrl.slice(0, maxChars) + "...";
};

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
  isHistorySavingEnabled: boolean;
  onToggleHistorySaving: (enabled: boolean) => void;
  onExportHistory: () => void;
}

// Add grouping utilities

export function HistoryPanel({
  history,
  onSelectItem,
  onDeleteItem,
  onClearHistory,
  isHistorySavingEnabled,
  onToggleHistorySaving,
  onExportHistory,
}: HistoryPanelProps) {
  const [search, setSearch] = useState("");
  const [containerWidth, setContainerWidth] = useState(0);
  const urlContainerRef = useRef<HTMLDivElement>(null);
  const [groupBy, setGroupBy] = useState<"none" | "domain" | "date">("none");
  const [] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<boolean>(false);

  const { isConnected } = useWebSocket();

  const filteredHistory = history.filter((item) =>
    item.url.toLowerCase().includes(search.toLowerCase())
  );

  const handleHistoryClick = (item: HistoryItem) => {
    if (isConnected) {
      toast.error(
        "Please disconnect current WebSocket before loading a new URL"
      );
      return;
    }

    window.dispatchEvent(
      new CustomEvent("loadHistoryItem", {
        detail: {
          item,
          url: item.url,
          messages: item.wsStats?.messages || [],
          stats: {
            messagesSent: item.wsStats?.messagesSent || 0,
            messagesReceived: item.wsStats?.messagesReceived || 0,
            avgLatency: item.wsStats?.avgLatency || 0,
          },
        },
      })
    );
    onSelectItem(item);
  };

  const handleHistoryItemClick = (item: HistoryItem) => {
    if (isConnected) {
      toast.error(
        "Please disconnect current WebSocket before loading a new URL"
      );
      return;
    }

    // Update __ACTIVE_REQUEST__ with scripts
    (window as any).__ACTIVE_REQUEST__ = {
      method: item.method,
      url: item.url,
      headers: item.request.headers,
      params: item.request.params,
      body: item.request.body,
      auth: item.request.auth,
      response: item.response,
      // Add scripts
      preRequestScript: item.request.preRequestScript,
      testScript: item.request.testScript,
      testResults: item.request.testResults,
      scriptLogs: item.request.scriptLogs,
    };

    window.dispatchEvent(
      new CustomEvent("loadHistoryItem", {
        detail: {
          item,
          url: item.url,
          scripts: {
            preRequestScript: item.request.preRequestScript || "",
            testScript: item.request.testScript || "",
            testResults: item.request.testResults || [],
            scriptLogs: item.request.scriptLogs || [],
          },
        },
      })
    );

    onSelectItem(item);
  };

  const renderHistoryItem = (item: HistoryItem) => {
    if (item.type === "websocket") {
      const isSocketIO =
        item.url.includes("socket.io") ||
        item.wsStats?.protocols?.includes("io") ||
        item.url.includes("engine.io");

      return (
        <div
          key={item.id}
          className="group flex flex-wrap items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors cursor-pointer border-y border-slate-700/50"
          onClick={() => !isConnected && handleHistoryClick(item)}
        >
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-xs font-mono border",
              isSocketIO
                ? "text-blue-400 border-blue-500/20"
                : "text-purple-400 border-purple-500/20"
            )}
          >
            {isSocketIO ? "SIO" : "WSS"}
          </Badge>
          <div
            ref={urlContainerRef}
            className="flex-1 min-w-0 w-full sm:w-auto"
          >
            <div className="text-xs font-medium text-slate-400 tracking-tighter truncate">
              {truncateUrl(item.url, containerWidth)}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>
                {formatDistanceToNow(new Date(item.timestamp), {
                  addSuffix: true,
                })}
              </span>
              {item.wsStats && (
                <div className="flex items-center gap-2">
                  <span>•</span>
                  <span className="text-emerald-500">
                    {item.wsStats.messagesSent}↑
                  </span>
                  <span>•</span>
                  <span className="text-blue-500">
                    {item.wsStats.messagesReceived}↓
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-300 hover:bg-transparent opacity-30 group-hover:opacity-100 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(item.id);
              toast.success("History item deleted");
            }}
          >
            <X className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      );
    } else {
      return (
        <div
          key={item.id}
          className="group flex flex-wrap items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors cursor-pointer border-y border-slate-700/50"
          onClick={() => handleHistoryItemClick(item)}
        >
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-xs font-mono border",
              item.method === "GET" && "text-emerald-400 border-emerald-500/20",
              item.method === "POST" && "text-blue-400 border-blue-500/20",
              item.method === "PUT" && "text-yellow-400 border-yellow-500/20",
              item.method === "DELETE" && "text-red-400 border-red-500/20",
              item.method === "PATCH" && "text-purple-400 border-purple-500/20"
            )}
          >
            {item.method}
          </Badge>
          <div
            ref={urlContainerRef}
            className="flex-1 min-w-0 w-full sm:w-auto"
          >
            <div className="text-xs font-medium text-slate-400 tracking-tight truncate">
              {truncateUrl(item.url, containerWidth)}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
              <span>
                {formatDistanceToNow(new Date(item.timestamp), {
                  addSuffix: true,
                })}
              </span>
              {item.response && (
                <>
                  <span>•</span>
                  <span
                    className={cn(
                      "font-medium",
                      item.response.status >= 200 && item.response.status < 300
                        ? "text-emerald-500"
                        : "text-red-500"
                    )}
                  >
                    {item.response.status}
                  </span>
                  {item.response.time && (
                    <>
                      <span>•</span>
                      <span>{item.response.time}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-300 hover:bg-transparent opacity-30 group-hover:opacity-100 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(item.id);
              toast.success("History item deleted");
            }}
          >
            <X className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      );
    }
  };

  const handleClearHistory = () => {
    if (deleteConfirm) {
      try {
        // Clear history from storage
        localStorage.removeItem("request_history");

        // Clear any related data
        localStorage.removeItem("history_metadata");
        localStorage.removeItem("history_timestamps");

        // Call onDelete to update parent state
        onClearHistory();

        // Reset UI state
        setDeleteConfirm(false);
        setSearch("");

        toast.success("History cleared successfully");
      } catch (error) {
        console.error("Error clearing history:", error);
        toast.error("Failed to clear history");
      }
    } else {
      setDeleteConfirm(true);
    }
  };

  // Add useEffect to auto-hide delete confirmation after timeout
  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => {
        setDeleteConfirm(false);
      }, 3000); // Hide after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  useEffect(() => {
    if (!urlContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(urlContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredHistory.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  // Optimized render for history items
  const renderVirtualizedHistory = () => (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{
        height: `100%`,
        width: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const item = filteredHistory[virtualRow.index];
          return (
            <div
              key={item.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderHistoryItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Search input */}
      <Input
        placeholder="Search history"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 rounded-none border-x-0 text-xs bg-slate-900 border-slate-700"
      />
      <div className="sticky top-0 z-10 bg-slate-900/75 border-b border-slate-700">
        <div className="flex items-center p-2 gap-2">
          <div className="flex items-center gap-1 w-full">
            {/* Group by button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setGroupBy((g) =>
                  g === "none" ? "domain" : g === "domain" ? "date" : "none"
                )
              }
              className="w-full h-8 px-2 sm:px-3 text-xs border border-slate-700"
            >
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="hidden lg:inline">
                {groupBy === "none" ? "None" : `${groupBy}`}
              </span>
            </Button>

            {/* Save toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleHistorySaving(!isHistorySavingEnabled)}
              className={cn(
                "w-full h-8 px-2 sm:px-3 text-xs border border-slate-700",
                isHistorySavingEnabled ? "text-emerald-400" : "text-slate-400"
              )}
            >
              <History className="h-4 w-4" />
              <span className="hidden lg:inline">
                {isHistorySavingEnabled ? "Saving" : "Off"}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onExportHistory}
              className="w-full h-8 px-2 sm:px-3 text-xs border border-slate-700"
            >
              <DownloadIcon className="h-4 w-4 text-emerald-400" />
            </Button>

            {/* Clear button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirm(true)}
              className="w-full h-8 px-2 sm:px-3 text-xs border border-slate-700"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        </div>

        {deleteConfirm && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-t border-slate-700/50">
            <span className="text-xs text-slate-400">Clear all history?</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4 text-slate-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="h-6 w-6 p-0"
              >
                <Check className="h-4 w-4 text-emerald-400" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScrollArea direction="vertical" className="h-full bg-slate-900/75">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(75vh)] space-y-4 p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3 rounded-lg bg-gradient-to-b from-slate-800 to-slate-900/50 ring-1 ring-slate-700/50">
                <Clock className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-300">No History</h3>
              <p className="text-xs text-slate-500 max-w-[15rem] leading-relaxed">
                Your request history and activities will appear here
              </p>
            </div>

            <div className="flex flex-col gap-2 w-48">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleHistorySaving(!isHistorySavingEnabled)}
                className={cn(
                  "w-full h-8 hover:bg-slate-800 border border-slate-800 text-xs gap-2",
                  isHistorySavingEnabled ? "text-emerald-400" : "text-slate-400"
                )}
              >
                <History className="h-3.5 w-3.5" />
                {isHistorySavingEnabled
                  ? "History Saving On"
                  : "History Saving Off"}
              </Button>
            </div>
          </div>
        ) : (
          renderVirtualizedHistory()
        )}
      </ScrollArea>
    </div>
  );
}
