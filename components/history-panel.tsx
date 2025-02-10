import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Clock,
  History,
  X,
  DownloadIcon,
  Check,
  Search,
  GroupIcon,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { HistoryItem } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "./websocket/websocket-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import { getEmptyTabState } from "@/lib/tab-utils";

const truncateUrl = (url: string, containerWidth: number) => {
  // Store original URL for click handling
  const displayUrl = url
    .replace(/^(https?:\/\/)?(www\.)?/, "")
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

const getBaseUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    // If URL parsing fails, return the original URL up to any query params
    return url.split("?")[0];
  }
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

  const groupedHistory = useMemo(() => {
    if (groupBy === "none") return filteredHistory;

    return filteredHistory.reduce<Record<string, HistoryItem[]>>(
      (groups, item: HistoryItem) => {
        let groupKey = "";

        if (groupBy === "domain") {
          try {
            const url = new URL(item.url);
            groupKey = url.hostname;
          } catch {
            groupKey = "Other";
          }
        } else if (groupBy === "date") {
          const date = new Date(item.timestamp);
          groupKey = date.toLocaleDateString();
        }

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
      },
      {}
    );
  }, [filteredHistory, groupBy]);

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

    // 1. First, clear everything by dispatching reset event
    window.dispatchEvent(
      new CustomEvent("resetRequest", {
        detail: { clearAll: true },
      })
    );

    // 2. Short delay to ensure state is cleared
    setTimeout(() => {
      const baseUrl = getBaseUrl(item.url);

      // 3. Set empty state first
      (window as any).__ACTIVE_REQUEST__ = getEmptyTabState();

      // 4. Then update with new data
      (window as any).__ACTIVE_REQUEST__ = {
        method: item.method,
        url: baseUrl,
        headers: Array.isArray(item.request.headers)
          ? [...item.request.headers]
          : [],
        params: Array.isArray(item.request.params)
          ? [...item.request.params]
          : [],
        body: item.request.body
          ? { ...item.request.body }
          : { type: "none", content: "" },
        auth: item.request.auth ? { ...item.request.auth } : { type: "none" },
        response: item.response ? { ...item.response } : null,
        preRequestScript: item.request.preRequestScript || "",
        testScript: item.request.testScript || "",
        testResults: Array.isArray(item.request.testResults)
          ? [...item.request.testResults]
          : [],
        scriptLogs: Array.isArray(item.request.scriptLogs)
          ? [...item.request.scriptLogs]
          : [],
      };

      // 5. Finally dispatch load event with fresh data copies
      window.dispatchEvent(
        new CustomEvent("loadHistoryItem", {
          detail: {
            clearBeforeLoad: true,
            item: {
              ...item,
              url: baseUrl,
              request: {
                ...item.request,
                headers: Array.isArray(item.request.headers)
                  ? [...item.request.headers]
                  : [],
                params: Array.isArray(item.request.params)
                  ? [...item.request.params]
                  : [],
              },
            },
          },
        })
      );

      // 6. Update through props after state is reset
      onSelectItem({
        ...item,
        url: baseUrl,
      });
    }, 50); // Small delay to ensure reset completes
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
    <div className="h-full flex flex-col bg-slate-900/50">
      {/* Search input section - updated to match tab panel */}
      <div className="p-2 space-y-2 border-b border-slate-800">
        {/* Search input row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full bg-slate-900 text-sm rounded-md pl-8 pr-4 py-1.5
                border border-slate-800 focus:border-slate-700
                text-slate-300 placeholder:text-slate-500
                focus:outline-none focus:ring-1 focus:ring-slate-700"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onToggleHistorySaving(!isHistorySavingEnabled)}
              className={cn(
                "p-2 hover:bg-slate-800 rounded-md text-slate-400 border border-slate-800",
                isHistorySavingEnabled && "text-emerald-400"
              )}
              title={
                isHistorySavingEnabled
                  ? "History saving enabled"
                  : "History saving disabled"
              }
            >
              <History className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                setGroupBy((prev) =>
                  prev === "none"
                    ? "domain"
                    : prev === "domain"
                      ? "date"
                      : "none"
                )
              }
              className="p-2 hover:bg-slate-800 rounded-md text-slate-400 border border-slate-800"
              title={`Group by ${groupBy === "none" ? "domain" : groupBy === "domain" ? "date" : "none"}`}
            >
              <GroupIcon className="h-4 w-4 text-blue-400" />
            </button>
            <button
              onClick={onExportHistory}
              className="p-2 hover:bg-slate-800 rounded-md text-slate-400 border border-slate-800"
              title="Export history"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleClearHistory}
              className="p-2 hover:bg-slate-800 rounded-md text-slate-400 border border-slate-800"
              title="Clear history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation - updated styling */}
      {deleteConfirm && (
        <div className="flex items-center justify-between p-2 bg-slate-800/50 border-b border-slate-700">
          <span className="text-xs text-slate-400">Clear all history?</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={onClearHistory}
              className="p-1.5 hover:bg-slate-700/50 rounded text-emerald-400"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ScrollArea direction="vertical" className="h-full">
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
        ) : groupBy === "none" ? (
          renderVirtualizedHistory()
        ) : (
          // Render grouped history
          <div className="divide-y divide-slate-700/50">
            {Object.entries(groupedHistory).map(([group, items]) => (
              <div key={group} className="bg-slate-900/75">
                <div className="px-4 py-2 text-xs font-medium text-slate-400 bg-slate-800/50">
                  {group}
                  <span className="ml-2 text-slate-500">({items.length})</span>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {items.map((item: HistoryItem) => renderHistoryItem(item))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
