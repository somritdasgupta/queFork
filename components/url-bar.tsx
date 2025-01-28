import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { HistoryItem } from "@/types";
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
import { Send, Loader2, Unplug, PlugZap2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "./websocket/websocket-context";

interface UrlBarProps {
  method: string;
  url: string;
  isLoading: boolean;
  wsConnected: boolean;
  isWebSocketMode: boolean;
  variables: {
    key: string;
    value: string;
    type?: "text" | "secret"; 
  }[];
  isMobile: boolean;
  recentUrls?: string[];
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSendRequest: () => void;
  onWebSocketToggle: () => void;
  onCancel?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

interface SuggestionType {
  type: "variable" | "history" | "template";
  value: string;
  label: string;
  description?: string;
}

// Define URL type
type UrlType = "http" | "websocket";
type UrlProtocol = "ws" | "io"; // Update to be more specific

// Add URL type detection
const detectUrlType = (url: string): UrlType => {
  if (!url) return "http";
  if (
    url.startsWith("ws://") ||
    url.startsWith("wss://") ||
    url.includes("socket.io") ||
    url.includes("websocket")
  ) {
    return "websocket";
  }
  return "http";
};

const detectWebSocketProtocol = (url: string): UrlProtocol => {
  // Make Socket.IO detection more robust
  const isSocketIO =
    url.includes("socket.io") ||
    url.includes("engine.io") ||
    /\?EIO=[3-4]/.test(url) ||
    /transport=websocket/.test(url) ||
    /\/socket\.io\/?/.test(url);

  return isSocketIO ? "io" : "ws";
};

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
  onUrlChange: propsOnUrlChange,
  onSendRequest,
  onWebSocketToggle,
}: UrlBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Add state for environment variable suggestions
  const [showEnvSuggestions, setShowEnvSuggestions] = useState(false);
  const [searchPrefix, setSearchPrefix] = useState("");

  // Helper to resolve variables in URL
  const resolveVariables = (urlString: string): string => {
    return urlString.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const variable = variables.find((v) => v.key === key);
      return variable ? variable.value : "{{" + key + "}}";
    });
  };

  const urlType = detectUrlType(url);
  const wsProtocol = detectWebSocketProtocol(url);

  // Modify URL validation to include WebSocket URLs
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

    // Check if there are any variables in the URL
    const hasVariables = urlString.includes("{{");
    if (hasVariables) {
      // Check for unclosed variables
      const hasUnclosedVariables =
        (urlString.match(/\{\{/g) || []).length !==
        (urlString.match(/\}\}/g) || []).length;
      if (hasUnclosedVariables) return false;

      // Check if all variables are defined
      const variableMatches = urlString.match(/\{\{([^}]+)\}\}/g) || [];
      const allVariablesDefined = variableMatches.every(match => {
        const varName = match.slice(2, -2);
        return variables.some(v => v.key === varName);
      });

      if (!allVariablesDefined) return false;
    }

    // Use the resolved URL for final validation
    const resolvedUrl = resolveVariables(urlString);
    const httpPattern =
      /^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    const wsPattern =
      /^wss?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

    return httpPattern.test(resolvedUrl) || wsPattern.test(resolvedUrl);
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

    propsOnUrlChange(newValue);
    setCursorPosition(cursorPos);

    // Check for variable typing
    const beforeCursor = newValue.slice(0, cursorPos);
    const match = beforeCursor.match(/\{\{([^}]*)$/);

    if (match) {
      const searchTerm = match[1].toLowerCase();
      setSearchPrefix(searchTerm);
      setShowEnvSuggestions(true);
    } else {
      setShowEnvSuggestions(false);
    }
  };

  const insertVariable = (varKey: string) => {
    if (!inputRef.current) return;

    const beforeCursor = url.slice(0, cursorPosition);
    const afterCursor = url.slice(cursorPosition);
    const varStart = beforeCursor.lastIndexOf("{{");

    const newUrl =
      beforeCursor.slice(0, varStart) + `{{${varKey}}}` + afterCursor;

    handleUrlChange(newUrl);
    setShowSuggestions(false);

    const newPosition = varStart + varKey.length + 4;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newPosition, newPosition);
        inputRef.current.focus();
      }
    }, 0);
  };

  // Add WebSocket context
  const {
    connect: wsConnect,
    disconnect: wsDisconnect,
    isConnected,
    connectionStatus,
    onUrlChange: wsUrlChange,
    url: wsUrl, // Add this
  } = useWebSocket();

  // Combine URL change handlers with proper type checking
  // Update URL handling to auto-switch modes consistently
  const handleUrlChange = (newUrl: string) => {
    const urlProtocol = detectUrlType(newUrl);
    propsOnUrlChange(newUrl);

    // If URL is cleared or changed to HTTP while in WebSocket mode, switch back
    if ((!newUrl || urlProtocol === "http") && isWebSocketMode) {
      if (wsConnected) {
        wsDisconnect();
      }
      onWebSocketToggle();
    }
    // Only switch to WebSocket mode if there's a valid WebSocket URL
    else if (newUrl && urlProtocol === "websocket" && !isWebSocketMode) {
      onWebSocketToggle();
    }

    // Update WebSocket URL if in WS mode
    if (isWebSocketMode) {
      wsUrlChange(newUrl);
    }
  };

  // Handle WebSocket connection
  const handleWebSocketAction = () => {
    if (!url) return;

    if (isConnected) {
      wsDisconnect();
    } else {
      try {
        const formattedUrl =
          url.startsWith("ws://") || url.startsWith("wss://")
            ? url
            : url.startsWith("http://")
              ? url.replace("http://", "ws://")
              : url.startsWith("https://")
                ? url.replace("https://", "wss://")
                : `ws://${url}`;

        handleUrlChange(formattedUrl);
        // Connect with detected protocol, but don't toggle tab visibility
        const protocol = detectWebSocketProtocol(formattedUrl);
        wsConnect([protocol]);
        // Note: Removed onWebSocketToggle() from here
      } catch (error) {
        console.error("WebSocket setup error:", error);
        toast.error("Failed to setup WebSocket connection");
      }
    }
  };

  const renderActionButtons = () => (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={
                urlType === "websocket" ? handleWebSocketAction : onSendRequest
              }
              disabled={
                !isValidUrl(url) ||
                (urlType === "websocket"
                  ? connectionStatus === "connecting"
                  : isLoading)
              }
              className={cn(
                "w-full h-10 p-4 transition-all relative border border-slate-700",
                urlType === "websocket"
                  ? isConnected
                    ? "bg-blue-500 hover:bg-red-600 text-white after:absolute after:inset-0 after:animate-pulse"
                    : "bg-slate-900 hover:bg-slate-700 text-slate-400"
                  : isLoading 
                    ? "bg-slate-900 text-slate-400 cursor-not-allowed overflow-hidden" 
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400",
                (!isValidUrl(url) || isLoading) &&
                  "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <div className="absolute inset-0 bg-emerald-500/10 animate-overlay" />
                </div>
              ) : urlType === "websocket" ? (
                isConnected ? (
                  <div className="relative">
                    <Unplug className="h-5 w-5 animate-pulse" />
                  </div>
                ) : (
                  <PlugZap2 className="h-5 w-5" />
                )
              ) : (
                <Send className={cn(
                  "h-5 w-5",
                  "transition-transform duration-200",
                  "group-hover:translate-x-1"
                )} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {urlType === "websocket"
              ? isConnected
                ? "Disconnect WebSocket"
                : "Connect WebSocket"
              : isLoading
                ? "Sending request..."
                : "Send Request"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  // Update URL input to show protocol badge
  const renderUrlInput = () => (
    <div className="w-full relative flex-1">
      <Input
        ref={inputRef}
        value={url}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Escape") setShowEnvSuggestions(false);
        }}
        placeholder={
          urlType === "websocket" ? "Enter WebSocket URL" : "Enter API endpoint"
        }
        disabled={isConnected}
        className={cn(
          "pr-20 font-mono text-sm bg-slate-900 border border-slate-700 text-slate-400 rounded-lg transition-all",
          `focus:border-${getMethodColor(method)}-500/50`,
          !isValidUrl(url) && url && "border-red-500/50",
          isMobile ? "text-xs" : "text-sm",
          isConnected && "opacity-75 cursor-not-allowed"
        )}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {variables && variables.length > 0 && (
          <Badge
            variant="secondary"
            className={`text-xs bg-${getMethodColor(
              method
            )}-500/10 text-${getMethodColor(method)}-400`}
          >
            {variables.length} vars
          </Badge>
        )}
      </div>

      {/* Environment Variables Dropdown */}
      {showEnvSuggestions && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 shadow-md max-h-[300px] overflow-y-auto">
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-2">
            <Input
              value={searchPrefix}
              onChange={(e) => setSearchPrefix(e.target.value)}
              placeholder="Search variables..."
              className="h-8 text-sm bg-slate-800 border-slate-600"
            />
          </div>
          <div className="p-1">
            {!variables || variables.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                No environment variables available
              </div>
            ) : filteredVariables.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                No matching variables found
              </div>
            ) : (
              filteredVariables.map((variable) => (
                <button
                  key={variable.key}
                  onClick={() => handleVariableSelect(variable.key)}
                  className="w-full flex items-start justify-between px-3 py-2 hover:bg-slate-800 rounded-md group"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-300">
                        {highlightMatch(variable.key, searchPrefix)}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[10px] bg-slate-800 text-slate-400 border-slate-600"
                      >
                        {variable.type || "text"}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500 text-left truncate max-w-[300px]">
                      ={" "}
                      {variable.type === "secret" ? "••••••••" : variable.value}
                    </span>
                  </div>
                  <kbd className="hidden group-hover:inline-flex h-5 select-none items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400">
                    enter
                  </kbd>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const handleHistoryItemLoad = useCallback(
    (historyItem: HistoryItem) => {
      if (historyItem.type === "websocket") {
        handleUrlChange(historyItem.url);

        // If there was an active connection, disconnect first
        if (isConnected) {
          wsDisconnect();
        }

        onWebSocketToggle();

        toast.info(
          `Last session: ${historyItem.wsStats?.messagesSent || 0} sent, ${
            historyItem.wsStats?.messagesReceived || 0
          } received`
        );
      }
    },
    [isConnected, wsDisconnect, handleUrlChange, onWebSocketToggle]
  );

  // Update useEffect to handle history events
  useEffect(() => {
    const handleHistorySelect = (event: CustomEvent) => {
      const { item, url: historyUrl } = event.detail;

      if (isConnected) {
        toast.error(
          "Please disconnect current WebSocket before loading a new URL"
        );
        return;
      }

      if (historyUrl) {
        handleUrlChange(historyUrl);
        if (item?.type === "websocket" && !isWebSocketMode) {
          // Only toggle to WebSocket tab if we're not already in it
          onWebSocketToggle();
        }
      }
    };

    window.addEventListener(
      "loadHistoryItem",
      handleHistorySelect as EventListener
    );
    return () => {
      window.removeEventListener(
        "loadHistoryItem",
        handleHistorySelect as EventListener
      );
    };
  }, [handleUrlChange, onWebSocketToggle, isConnected, isWebSocketMode]);

  // Add protocol badge render function
  const renderProtocolBadge = (protocol: string) => (
    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 h-10">
      <Badge
        variant="outline"
        className={cn(
          "font-mono text-xs border-none",
          protocol === "io"
            ? "bg-blue-500/10 text-blue-400"
            : "bg-purple-500/10 text-purple-400"
        )}
      >
        {protocol.toUpperCase()}
      </Badge>
    </div>
  );

  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    if (!showEnvSuggestions) return [];
    
    // Ensure variables is an array and has items
    const validVariables = Array.isArray(variables) ? variables : [];
    
    return validVariables
      .filter((v) => {
        const searchTerm = searchPrefix.toLowerCase().trim();
        return v.key.toLowerCase().includes(searchTerm);
      })
      .sort((a, b) => {
        // Sort exact matches first
        const aStartsWith = a.key
          .toLowerCase()
          .startsWith(searchPrefix.toLowerCase());
        const bStartsWith = b.key
          .toLowerCase()
          .startsWith(searchPrefix.toLowerCase());
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.key.localeCompare(b.key);
      });
  }, [variables, searchPrefix, showEnvSuggestions]);

  const handleVariableSelect = (varKey: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const cursorPos = input.selectionStart || 0;
    const beforeCursor = url.slice(0, cursorPos);
    const afterCursor = url.slice(cursorPos);
    const varStart = beforeCursor.lastIndexOf("{{");

    if (varStart === -1) {
      // If no variable start found, just insert at cursor
      const newUrl = beforeCursor + `{{${varKey}}}` + afterCursor;
      handleUrlChange(newUrl);
    } else {
      // Replace partial variable with selected one
      const newUrl =
        beforeCursor.slice(0, varStart) + `{{${varKey}}}` + afterCursor;
      handleUrlChange(newUrl);
    }

    setShowEnvSuggestions(false);

    // Position cursor after inserted variable
    setTimeout(() => {
      const newPosition = varStart + varKey.length + 4;
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    }, 0);
  };

  // Add this new helper function after other helper functions
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-blue-500/20 text-blue-400">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="flex-1 flex items-center gap-2">
      {urlType === "websocket" ? (
        renderProtocolBadge(wsProtocol)
      ) : (
        <div
          className={cn(
            "flex items-center bg-slate-900 border border-slate-700 rounded-lg px-0",
            isMobile ? "max-w-[60px]" : ""
          )}
        >
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
      )}
      {renderUrlInput()}
      {renderActionButtons()}{" "}
    </div>
  );
}
const getWebSocketClasses = (connected: boolean) =>
  cn(
    "w-10 h-10 rounded-lg transition-all relative overflow-hidden bg-slate-900 hover:bg-slate-800",
    connected &&
      "after:absolute after:inset-0 after:bg-green-500/20 after:animate-ping"
  );
