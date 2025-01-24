import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Loader2,
  GlobeIcon,
  Variable,
  History,
  Wand,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface UrlBarProps {
  method: string;
  url: string;
  isLoading: boolean;
  wsConnected: boolean;
  isWebSocketMode: boolean;
  variables: { key: string; value: string }[];
  isMobile: boolean;
  recentUrls?: string[];
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSendRequest: () => void;
  onWebSocketToggle: () => void;
}

interface SuggestionType {
  type: "variable" | "history" | "template";
  value: string;
  label: string;
  description?: string;
}

export function UrlBar({
  method,
  url,
  isLoading,
  wsConnected,
  isWebSocketMode,
  variables,
  isMobile,
  recentUrls = [],
  onMethodChange,
  onUrlChange,
  onSendRequest,
  onWebSocketToggle,
}: UrlBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to resolve variables in URL
  const resolveVariables = (urlString: string): string => {
    return urlString.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const variable = variables.find((v) => v.key === key);
      return variable ? variable.value : "{{" + key + "}}";
    });
  };

  const isValidUrl = (urlString: string): boolean => {
    if (!urlString) return false;

    // Basic protocol check
    if (
      urlString === "http://" ||
      urlString === "https://" ||
      urlString === "ws://" ||
      urlString === "wss://"
    ) {
      return false;
    }

    // Check for unclosed variables
    const hasUnclosedVariables =
      (urlString.match(/\{\{/g) || []).length !==
      (urlString.match(/\}\}/g) || []).length;
    if (hasUnclosedVariables) return false;

    // Resolving variables before validation
    const resolvedUrl = resolveVariables(urlString);

    // Check if any unresolved variables remain
    if (resolvedUrl.includes("{{")) {
      return false;
    }

    const urlPattern = isWebSocketMode
      ? /^wss?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
      : /^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

    return urlPattern.test(resolvedUrl);
  };

  const resolvedUrl = useMemo(() => {
    return url.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const variable = variables.find((v) => v.key === key);
      return variable ? variable.value : `{{${key}}}`;
    });
  }, [url, variables]);

  const getMethodColor = (method: string) => {
    const colors = {
      GET: "emerald",
      POST: "blue",
      PUT: "yellow",
      DELETE: "red",
      PATCH: "purple",
    };
    return colors[method as keyof typeof colors] || "slate";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    onUrlChange(newValue);
    setCursorPosition(cursorPos);

    // Check for variable typing
    const beforeCursor = newValue.slice(0, cursorPos);
    const match = beforeCursor.match(/\{\{([^}]*)$/);

    if (match) {
      const searchTerm = match[1].toLowerCase();
      const matchingVars = variables.filter((v) =>
        v.key.toLowerCase().includes(searchTerm)
      );

      if (matchingVars.length > 0) {
        setShowSuggestions(true);
      }
    } else {
      setShowSuggestions(false);
    }
  };
  const insertVariable = (varKey: string) => {
    if (!inputRef.current) return;

    const beforeCursor = url.slice(0, cursorPosition);
    const afterCursor = url.slice(cursorPosition);
    const varStart = beforeCursor.lastIndexOf("{{");

    const newUrl =
      beforeCursor.slice(0, varStart) + `{{${varKey}}}` + afterCursor;

    onUrlChange(newUrl);
    setShowSuggestions(false);

    const newPosition = varStart + varKey.length + 4;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newPosition, newPosition);
        inputRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="flex-1 flex items-center gap-2">
      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-0">
        <Select value={method} onValueChange={onMethodChange}>
          <SelectTrigger
            className={cn(
              "w-auto min-w-[70px] max-w-[100px] font-bold bg-transparent border-0 text-slate-400 hover:text-slate-300 gap-2",
              `text-xs text-${getMethodColor(method)}-500 py-1`
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border border-slate-700 bg-slate-800">
            {[
              { value: "GET", color: "emerald" },
              { value: "POST", color: "blue" },
              { value: "PUT", color: "yellow" },
              { value: "DELETE", color: "red" },
              { value: "PATCH", color: "purple" },
            ].map(({ value, color }) => (
              <SelectItem
                key={value}
                value={value}
                className={cn("text-xs font-medium", `text-${color}-500`)}
              >
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={url}
          onChange={handleInputChange}
          placeholder="Enter API endpoint"
          className={cn(
            "pr-20 font-mono text-sm bg-slate-900 border border-slate-700 text-slate-400 rounded-lg transition-all",
            `focus:border-${getMethodColor(method)}-500/50`,
            !isValidUrl(url) && url && "border-red-500/50",
            isMobile ? "text-xs" : "text-sm"
          )}
        />

        {/* Variable count badge */}
        {variables.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Badge
              variant="secondary"
              className={`text-xs bg-${getMethodColor(
                method
              )}-500/10 text-${getMethodColor(method)}-400`}
            >
              {variables.length} vars
            </Badge>
          </div>
        )}

        {showSuggestions && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg bg-slate-800 border border-slate-700 shadow-lg backdrop-blur-sm">
            <div className="sticky top-0 bg-slate-800 p-2 border-b border-slate-700">
              <Input
                placeholder="Filter variables..."
                className="h-8 bg-slate-900 border-slate-700 text-xs text-slate-400"
                onChange={(e) => {}}
              />
            </div>
            <div className="p-1">
              {variables.map((v) => (
                <div
                  key={v.key}
                  className="px-3 py-2 hover:bg-slate-700 cursor-pointer rounded-md group transition-colors"
                  onClick={() => insertVariable(v.key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full bg-${getMethodColor(
                          method
                        )}-500`}
                      />
                      <span className="font-mono text-sm text-slate-300">
                        {v.key}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 group-hover:text-slate-400">
                      = {v.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onSendRequest}
          disabled={!isValidUrl(url) || isLoading}
          className={cn(
            "bg-slate-900 hover:bg-slate-800 text-slate-400",
            (!isValidUrl(url) || isLoading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>

        {!isMobile && (
          <Button
            className={getWebSocketClasses(wsConnected)}
            onClick={onWebSocketToggle}
            title={
              wsConnected ? "WebSocket Connected" : "Open WebSocket Connection"
            }
          >
            <GlobeIcon
              className={cn(
                "h-4 w-4 transition-colors",
                wsConnected ? "text-green-400 animate-pulse" : "text-slate-400"
              )}
            />
          </Button>
        )}
      </div>
    </div>
  );
}

const getWebSocketClasses = (connected: boolean) =>
  cn(
    "w-10 h-10 rounded-lg transition-all relative overflow-hidden bg-slate-900 hover:bg-slate-800",
    connected &&
      "after:absolute after:inset-0 after:bg-green-500/20 after:animate-ping"
  );
