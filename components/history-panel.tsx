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
  ChevronDown,
  ChevronRight,
  Globe,
  CalendarDays,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { HistoryItem } from "@/types";
import { formatDistanceToNow, format } from "date-fns";
import { useWebSocket } from "./websocket/websocket-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NavigableElement, useKeyboardNavigation } from './keyboard-navigation';

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

// Add new types
interface HistoryGroup {
  domain: string;
  items: HistoryItem[];
  stats: {
    total: number;
    success: number;
    failed: number;
    lastAccessed: Date;
  };
}

// Add grouping utilities
const getDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url.split("/")[0];
  }
};

const getDateGroup = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return "Last Week";
  if (days < 30) return "Last Month";
  return "Older";
};

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const navigableElements = useRef<NavigableElement[]>([]);

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

  // Group history items
  const groupedHistory = useMemo(() => {
    if (groupBy === "none") return { ungrouped: filteredHistory };

    return filteredHistory.reduce(
      (groups: Record<string, HistoryItem[]>, item) => {
        const key =
          groupBy === "domain"
            ? getDomain(item.url)
            : getDateGroup(new Date(item.timestamp));
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
        return groups;
      },
      {}
    );
  }, [filteredHistory, groupBy]);

  // Calculate group stats with proper type checking
  const groupStats = useMemo(() => {
    return Object.entries(groupedHistory).reduce(
      (stats, [key, items]) => {
        const responseItems = items.filter((i) => i.response?.status);
        const successfulRequests = responseItems.filter(
          (i) => i.response!.status < 400
        );
        const failedRequests = responseItems.filter(
          (i) => i.response!.status >= 400
        );

        // Calculate average response time only for items with valid time values
        const itemsWithTime = items.filter((i) => {
          const timeStr = i.response?.time;
          return (
            timeStr !== undefined &&
            timeStr !== null &&
            !isNaN(parseInt(timeStr))
          );
        });

        const totalTime = itemsWithTime.reduce((sum, i) => {
          const timeStr = i.response?.time || "0";
          return sum + parseInt(timeStr);
        }, 0);

        stats[key] = {
          total: items.length,
          success: successfulRequests.length,
          failed: failedRequests.length,
          lastAccessed: new Date(
            Math.max(...items.map((i) => new Date(i.timestamp).getTime()))
          ),
        };
        return stats;
      },
      {} as Record<string, HistoryGroup["stats"]>
    );
  }, [groupedHistory]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

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

  const handleDeleteHistoryItem = (id: string) => {
    // Clean up navigable elements
    navigableElements.current = navigableElements.current.filter(
      el => el.id !== id
    );
    onDeleteItem(id);
    toast.success("History item deleted");

    // Focus next available item
    const nextElement = navigableElements.current[0];
    if (nextElement) {
      setFocus(nextElement.id);
    }
  };

  const { setFocus } = useKeyboardNavigation(
    navigableElements.current,
    (direction, currentId) => {
      const currentElement = navigableElements.current.find(el => el.id === currentId);
      if (!currentElement) return;

      let nextId: string | undefined;

      switch (direction) {
        case 'down':
          nextId = navigableElements.current.find(
            el => el.type === 'history' && 
            navigableElements.current.indexOf(el) > navigableElements.current.indexOf(currentElement)
          )?.id;
          break;
        case 'up':
          const reversedElements = [...navigableElements.current].reverse();
          nextId = reversedElements.find(
            el => el.type === 'history' && 
            navigableElements.current.indexOf(el) < navigableElements.current.indexOf(currentElement)
          )?.id;
          break;
      }

      if (nextId) {
        setFocus(nextId);
        // Scroll element into view
        const element = navigableElements.current.find(el => el.id === nextId);
        element?.ref.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    (id) => {
      // Handle history item selection
      const historyItem = history.find(item => item.id === id);
      if (historyItem) {
        onSelectItem(historyItem);
      }
    },
    (id) => {
      handleDeleteHistoryItem(id);
    }
  );

  // Add keyboard event listener for initial focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const firstElement = navigableElements.current[0];
        if (firstElement && !document.activeElement?.closest('.history-panel')) {
          e.preventDefault();
          setFocus(firstElement.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setFocus]);

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
          ref={el => {
            if (el) {
              navigableElements.current.push({
                id: item.id,
                ref: el,
                type: 'history'
              });
            }
          }}
          tabIndex={0}
          className="group flex items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors cursor-pointer border-y border-slate-700/50 outline-none focus:bg-slate-800"
          onClick={() => !isConnected && handleHistoryClick(item)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSelectItem(item);
            }
          }}
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
            {isSocketIO ? "IO" : "WS"}
          </Badge>
          <div ref={urlContainerRef} className="flex-1 min-w-0">
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
            className="h-8 w-8 text-slate-400 hover:text-slate-300 hover:bg-transparent opacity-30 group-hover:opacity-100 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteHistoryItem(item.id);
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
          ref={el => {
            if (el) {
              navigableElements.current.push({
                id: item.id,
                ref: el,
                type: 'history'
              });
            }
          }}
          tabIndex={0}
          className="group flex items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors cursor-pointer border-y border-slate-700/50 outline-none focus:bg-slate-800"
          onClick={() => handleHistoryClick(item)} // Uses full URL from item
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSelectItem(item);
            }
          }}
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
          <div ref={urlContainerRef} className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-400 tracking-tighter truncate">
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
            className="h-8 w-8 text-slate-400 hover:text-slate-300 hover:bg-transparent opacity-30 group-hover:opacity-100 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteHistoryItem(item.id);
            }}
          >
            <X className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800">
      <ScrollArea className="flex-1">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-700 mb-4">
              <Clock className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              No History Yet
            </h3>
            <p className="text-sm text-slate-400 max-w-sm">
              Make your first request to see it appear in history.
            </p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedHistory).map(([groupKey, items]) => (
              <div key={groupKey} className="border-b border-slate-700">
                {groupBy !== "none" && (
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="flex items-center justify-between w-full px-3 py-2 hover:bg-slate-800 [&[data-state=open]]:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroups.has(groupKey) ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="text-sm font-medium text-slate-300">
                        {groupKey}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({items.length})
                      </span>
                    </div>
                    {groupStats[groupKey] && (
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="text-emerald-400">
                          {groupStats[groupKey].success} ✓
                        </span>
                        {groupStats[groupKey].failed > 0 && (
                          <span className="text-red-400">
                            {groupStats[groupKey].failed} ✗
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )}
                {(groupBy === "none" || expandedGroups.has(groupKey)) && (
                  <div className="bg-slate-900/50 divide-y divide-slate-700/50">
                    {items.map((item) => (
                      <div key={item.id} className="group">
                        {renderHistoryItem(item)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
