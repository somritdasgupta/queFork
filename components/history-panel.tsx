import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Trash2, MoreVertical, Clock, History, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import { HistoryItem } from "@/types";
import { formatDistanceToNow } from "date-fns";

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
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
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

  const filteredHistory = history.filter((item) =>
    item.url.toLowerCase().includes(search.toLowerCase())
  );

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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No History</h3>
            <p className="text-sm text-gray-500 text-center">
              Your request history will appear here
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer group"
                onClick={() => onSelectItem(item)}
              >
                <Badge
                  variant="outline"
                  className={`method-${item.method.toLowerCase()} shrink-0 text-xs font-mono`}
                >
                  {item.method}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <div className="text-sm font-mono text-gray-700 truncate pr-6">
                      {truncateUrl(item.url)}
                    </div>
                    <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white via-white to-transparent" />
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(item.timestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDeleteItem(item.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
