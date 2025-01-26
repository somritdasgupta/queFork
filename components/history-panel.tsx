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
import { useState } from "react";
import { HistoryItem } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "./websocket/websocket-context";
import { cn } from "@/lib/utils"; // Import cn utility
import { toast } from "sonner";

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
  isHistorySavingEnabled: boolean;
  onToggleHistorySaving: (enabled: boolean) => void;
  onExportHistory: () => void;
}

const truncateUrl = (url: string, maxLength: number = 30) => {
  const urlWithoutProtocol = url.replace(/^(https?:\/\/|wss?:\/\/)/, "");
  if (urlWithoutProtocol.length <= maxLength) return url;
  return url.slice(0, maxLength) + "...";
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
            "flex items-center gap-2 p-2 border rounded-lg transition-all",
            !isConnected
              ? "hover:bg-slate-50 hover:border-slate-300 cursor-pointer border-slate-200"
              : "cursor-not-allowed bg-slate-100 border-slate-200/50 text-slate-500",
            isActive && !isConnected && "border-purple-200 bg-purple-50/50"
          )}
          onClick={() => !isConnected && handleHistoryClick(item)}
        >
          <Badge
            variant={isActive ? "default" : "outline"}
            className={cn(
              "flex-shrink-0",
              isSocketIO ? "text-blue-500" : "text-purple-500",
              isActive && isSocketIO
                ? "bg-blue-100"
                : isActive
                ? "bg-purple-100"
                : ""
            )}
          >
            {isSocketIO ? "IO" : "WS"}
          </Badge>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-mono truncate">
              {truncateUrl(item.url)}
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
            className="h-8 w-8 p-0 flex-shrink-0 text-red-500 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(item.id);
              toast.success("History item deleted");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    } else {
      return (
        <div
          key={item.id}
          className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-50 cursor-pointer group"
          onClick={() => handleHistoryClick(item)}
        >
          <Badge
            variant="outline"
            className={cn(
              "flex-shrink-0 font-mono text-xs",
              item.method === "GET" && "text-emerald-500 border-emerald-200",
              item.method === "POST" && "text-blue-500 border-blue-200",
              item.method === "PUT" && "text-yellow-500 border-yellow-200",
              item.method === "DELETE" && "text-red-500 border-red-200",
              item.method === "PATCH" && "text-purple-500 border-purple-200"
            )}
          >
            {item.method}
          </Badge>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-mono truncate">
              {truncateUrl(item.url)}
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
            className="h-8 w-8 p-0 flex-shrink-0 text-red-500 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(item.id);
              toast.success("History item deleted");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleHistorySaving(!isHistorySavingEnabled)}
            className="text-xs h-8 w-full rounded-lg"
          >
            <History className="h-4 w-4 mr-2" />
            {isHistorySavingEnabled ? "Saving On" : "Saving Off"}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportHistory}
              className="rounded-lg"
            >
              <ArrowDownToLine className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onClearHistory}
              className="rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search history"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 rounded-lg"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-12 py-12 px-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-8">
              <Clock className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No History
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Your request history will appear here
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2 min-w-0">
            {" "}
            {/* Add min-w-0 */}
            {filteredHistory.map((item) => renderHistoryItem(item))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
