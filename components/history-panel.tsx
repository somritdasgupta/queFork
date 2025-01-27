import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Trash2,
  Clock,
  History,
  ArrowDownToLine,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { HistoryItem } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "./websocket/websocket-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

  const { url: currentUrl, isConnected } = useWebSocket();

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

  const renderHistoryItem = (item: HistoryItem) => {
    if (item.type === "websocket") {
      const isActive = item.url === currentUrl;
      const isSocketIO =
        item.url.includes("socket.io") ||
        item.wsStats?.protocols?.includes("io") ||
        item.url.includes("engine.io");

      return (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg transition-all",
            "border bg-white/60",
            !isConnected
              ? "hover:bg-slate-50 hover:border-slate-300 border-2 border-slate-100 cursor-pointer"
              : "cursor-not-allowed bg-slate-100 border-2 border-slate-100 text-slate-500",
            isActive && !isConnected && "border-purple-200 bg-purple-50/50"
          )}
          onClick={() => !isConnected && handleHistoryClick(item)}
        >
          <Badge
            variant={isActive ? "default" : "outline"}
            className={cn(
              "flex-shrink-0",
              isSocketIO ? "text-blue-500" : "text-purple-500",
              isActive && (isSocketIO ? "bg-blue-100" : "bg-purple-100")
            )}
          >
            {isSocketIO ? "IO" : "WS"}
          </Badge>
          <div ref={urlContainerRef} className="flex-1 min-w-0">
            <div className="text-xs font-medium tracking-tighter truncate">
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
                  <span className="text-emerald-500">
                    {item.wsStats.messagesSent}↑
                  </span>
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
            className="h-8 w-8 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
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
          className="group relative flex flex-col w-full max-w-full overflow-hidden rounded-lg border-2 border-slate-100 bg-white/60 p-3 transition-all hover:border-slate-300 cursor-pointer"
          onClick={() => handleHistoryClick(item)} // Uses full URL from item
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Badge
              variant="outline"
              className={cn(
                "h-6 shrink-0",
                item.method === "GET" && "text-emerald-500 border-emerald-200",
                item.method === "POST" && "text-blue-500 border-blue-200",
                item.method === "PUT" && "text-yellow-500 border-yellow-200",
                item.method === "DELETE" && "text-red-500 border-red-200",
                item.method === "PATCH" && "text-purple-500 border-purple-200"
              )}
            >
              {item.method}
            </Badge>
            <div ref={urlContainerRef} className="flex-1 min-w-0">
              <div className="text-xs font-medium tracking-tighter truncate">
                {truncateUrl(item.url, containerWidth)}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
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
                        item.response.status >= 200 &&
                          item.response.status < 300
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
          </div>
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItem(item.id);
                toast.success("History item deleted");
              }}
            >
              <X className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800">
      <div className="flex flex-col gap-2 p-2 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleHistorySaving(!isHistorySavingEnabled)}
            className="flex items-center gap-2 h-8 w-auto px-3 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
          >
            <History className="h-4 w-4 text-blue-400" />
            <span className="text-xs">
              {isHistorySavingEnabled ? "Saving" : "Save Off"}
            </span>
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportHistory}
              className="flex items-center gap-2 h-8 w-auto px-3 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            >
              <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
              <span className="text-xs">Export</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearHistory}
              className="flex items-center gap-2 h-8 w-auto px-3 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
              <span className="text-xs">Clear</span>
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search history"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 rounded-lg w-full bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-500"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 w-full">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-12 py-12 px-4">
            <div className="bg-slate-900 rounded-xl border-2 p-6 mb-8 shadow-inner border-slate-700">
              <Clock className="h-8 w-8 text-slate-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              No Histories Yet
            </h3>
            <div className="max-w-sm text-center space-y-2">
              <p className="text-sm text-slate-400">
                Send your first API reqeust to view their response and they will
                show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3 w-full max-w-full">
            {filteredHistory.map((item) => (
              <div key={item.id} className="relative group">
                <div
                  onClick={() => handleHistoryClick(item)}
                  className={cn(
                    "group relative flex flex-col w-full overflow-hidden",
                    "rounded-none border border-slate-700 bg-slate-900",
                    "p-2 transition-all",
                    "hover:bg-slate-800",
                    !isConnected
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  )}
                >
                  {item.type === "websocket" ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.url === currentUrl ? "default" : "outline"}
                        className={cn(
                          "flex-shrink-0",
                          item.url.includes("socket.io") ||
                          item.wsStats?.protocols?.includes("io") ||
                          item.url.includes("engine.io")
                            ? "text-blue-500"
                            : "text-purple-500",
                          item.url === currentUrl &&
                            (item.url.includes("socket.io") ||
                            item.wsStats?.protocols?.includes("io") ||
                            item.url.includes("engine.io")
                              ? "bg-blue-100"
                              : "bg-purple-100")
                        )}
                      >
                        {item.url.includes("socket.io") ||
                        item.wsStats?.protocols?.includes("io") ||
                        item.url.includes("engine.io")
                          ? "IO"
                          : "WS"}
                      </Badge>
                      <div ref={urlContainerRef} className="flex-1 min-w-0">
                        <div className="text-xs font-medium tracking-tighter truncate text-slate-300">
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
                              <span className="text-emerald-500">
                                {item.wsStats.messagesSent}↑
                              </span>
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
                        className="h-8 w-8 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                          toast.success("History item deleted");
                        }}
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-6 shrink-0",
                          item.method === "GET" &&
                            "text-emerald-500 border-emerald-200",
                          item.method === "POST" &&
                            "text-blue-500 border-blue-200",
                          item.method === "PUT" &&
                            "text-yellow-500 border-yellow-200",
                          item.method === "DELETE" &&
                            "text-red-500 border-red-200",
                          item.method === "PATCH" &&
                            "text-purple-500 border-purple-200"
                        )}
                      >
                        {item.method}
                      </Badge>
                      <div ref={urlContainerRef} className="flex-1 min-w-0">
                        <div className="text-xs font-medium tracking-tighter truncate text-slate-300">
                          {truncateUrl(item.url, containerWidth)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
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
                                  item.response.status >= 200 &&
                                  item.response.status < 300
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
                        className="h-8 w-8 rounded-none bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                          toast.success("History item deleted");
                        }}
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
