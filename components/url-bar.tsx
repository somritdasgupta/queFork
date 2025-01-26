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
import {
  Send,
  Loader2,
  Unplug,
  PlugZap2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "./websocket/websocket-context";

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

// Define URL type
type UrlType = 'http' | 'websocket';
type UrlProtocol = 'ws' | 'io';  // Update to be more specific

// Add URL type detection
const detectUrlType = (url: string): UrlType => {
  if (!url) return 'http';
  if (url.startsWith('ws://') || url.startsWith('wss://') || 
      url.includes('socket.io') || url.includes('websocket')) {
    return 'websocket';
  }
  return 'http';
};

const detectWebSocketProtocol = (url: string): UrlProtocol => {
  // Make Socket.IO detection more robust
  const isSocketIO = 
    url.includes('socket.io') || 
    url.includes('engine.io') ||
    /\?EIO=[3-4]/.test(url) ||
    /transport=websocket/.test(url) ||
    /\/socket\.io\/?/.test(url);

  return isSocketIO ? 'io' : 'ws';
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

    const httpPattern = /^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    const wsPattern = /^wss?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

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

    handleUrlChange(newValue);
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
  const handleUrlChange = (newUrl: string) => {
    propsOnUrlChange(newUrl);
    const urlProtocol = detectUrlType(newUrl);
    
    // If URL is cleared and we're in WebSocket mode, disconnect and switch back
    if (!newUrl && isWebSocketMode) {
      if (isConnected) {
        wsDisconnect();
      }
      onWebSocketToggle(); // Switch back to HTTP mode
      return;
    }

    // Handle WebSocket URL changes
    if (urlProtocol === 'websocket') {
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
        const formattedUrl = url.startsWith("ws://") || url.startsWith("wss://")
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
          onClick={urlType === 'websocket' ? handleWebSocketAction : onSendRequest}
          disabled={!isValidUrl(url) || (urlType === 'websocket' ? connectionStatus === 'connecting' : isLoading)}
          className={cn(
            "w-10 h-10 transition-all relative border-1 border-slate-700",
            urlType === 'websocket' 
            ? isConnected
              ? "border-1 border-slate-700 bg-blue-500 hover:bg-red-600 text-white after:absolute after:inset-0 after:animate-pulse"
              : "border-1 border-slate-700 bg-slate-900 hover:bg-slate-700 text-slate-400"
            : "border-1 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400",
            (!isValidUrl(url) || isLoading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {connectionStatus === 'connecting' ? (
            <div className="animate-spin">
              <Loader2 className="h-5 w-5" />
            </div>
          ) : urlType === 'websocket' ? (
            isConnected ? (
              <div className="relative">
                <Unplug className="h-5 w-5 animate-pulse" />
              </div>
            ) : (
              <PlugZap2 className="h-5 w-5" />
            )
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
        </TooltipTrigger>
        <TooltipContent>
        {urlType === 'websocket' 
          ? isConnected 
            ? 'Disconnect WebSocket'
            : 'Connect WebSocket'
          : 'Send Request'
        }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    </div>
  );

  // Update URL input to show protocol badge
  const renderUrlInput = () => (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={url}
        onChange={(e) => handleUrlChange(e.target.value)}
        placeholder={urlType === 'websocket' ? 'Enter WebSocket URL' : 'Enter API endpoint'}
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
        {variables.length > 0 && (
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
    </div>
  );

  const handleHistoryItemLoad = useCallback((historyItem: HistoryItem) => {
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
  }, [isConnected, wsDisconnect, handleUrlChange, onWebSocketToggle]);

  // Update useEffect to handle history events
  useEffect(() => {
    const handleHistorySelect = (event: CustomEvent) => {
      const { item, url: historyUrl } = event.detail;
      
      if (isConnected) {
        toast.error("Please disconnect current WebSocket before loading a new URL");
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

    window.addEventListener("loadHistoryItem", handleHistorySelect as EventListener);
    return () => {
      window.removeEventListener("loadHistoryItem", handleHistorySelect as EventListener);
    };
  }, [handleUrlChange, onWebSocketToggle, isConnected, isWebSocketMode]);

  // Add protocol badge render function
  const renderProtocolBadge = (protocol: string) => (
    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-3 h-[35px]">
      <Badge 
        variant="outline"
        className={cn(
          "font-mono text-xs border-none",
          protocol === 'io' 
            ? "bg-blue-500/10 text-blue-400" 
            : "bg-purple-500/10 text-purple-400"
        )}
      >
        {protocol.toUpperCase()}
      </Badge>
    </div>
  );

  return (
    <div className="flex-1 flex items-center gap-2">
      {urlType === 'websocket' ? (
        renderProtocolBadge(wsProtocol)
      ) : (
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-0">
          <Select 
            value={method} 
            onValueChange={onMethodChange}
          >
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
      {renderActionButtons()}
    </div>
  );
}

const getWebSocketClasses = (connected: boolean) =>
  cn(
    "w-10 h-10 rounded-lg transition-all relative overflow-hidden bg-slate-900 hover:bg-slate-800",
    connected &&
      "after:absolute after:inset-0 after:bg-green-500/20 after:animate-ping"
  );