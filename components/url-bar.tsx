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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Send, Loader2, Unplug, PlugZap2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "./websocket/websocket-context";
import { motion, AnimatePresence } from "framer-motion";

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

type UrlType = "http" | "websocket";
type UrlProtocol = "ws" | "io";

const detectUrlType = (url: string): UrlType => {
  if (!url) return "http";
  return /^wss?:\/\/|socket\.io|websocket/.test(url) ? "websocket" : "http";
};

const detectWebSocketProtocol = (url: string): UrlProtocol => {
  return /socket\.io|engine\.io|\?EIO=[3-4]|transport=websocket|\/socket\.io\/?/.test(
    url
  )
    ? "io"
    : "ws";
};

const placeholderTexts = [
  "Welcome to queFork",
  "Enter an API endpoint...",
  "Try a WebSocket URL...",
  "Type '{{' to use envar",
  "Press '/' to focus",
];
const idleAnimationVariants = {
  idle: {
    boxShadow: [
      "0 0 0 0 rgba(59, 130, 246, 0)",
      "0 0 0 2px rgba(59, 130, 246, 0.08)",
      "0 0 0 0 rgba(59, 130, 246, 0)",
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  active: {
    boxShadow: "0 0 0 0 rgba(59, 130, 246, 0)",
  },
};

type PlaceholderTextProps = {
  text: string;
  direction: number;
};
const typewriterVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (custom: { delay: number; duration: number }) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: custom.delay,
      duration: custom.duration,
      ease: "easeOut",
    },
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

const AnimatedPlaceholder = ({ text, direction }: PlaceholderTextProps) => {
  const characters = text.split("");

  return (
    <motion.div
      key={text}
      className="absolute inset-0 flex items-center px-4 pointer-events-none text-xs sm:text-sm"
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="flex items-center h-full">
        {characters.map((char, index) => (
          <motion.span
            key={index}
            variants={typewriterVariants}
            custom={{
              delay: index * 0.05,
              duration: 0.1,
            }}
            className={cn(
              "font-mono tracking-tight text-slate-400/80",
              "font-medium antialiased"
            )}
            style={{
              fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
              textShadow: "0 0 10px rgba(56, 189, 248, 0.1)",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
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

  const [showEnvSuggestions, setShowEnvSuggestions] = useState(false);
  const [searchPrefix, setSearchPrefix] = useState("");

  const [isIdle, setIsIdle] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const [[page, direction], setPage] = useState([0, 0]);
  const typingTimeout = useRef<NodeJS.Timeout>();

  const debouncedHandleInput = useMemo(
    () =>
      debounce((value: string, cursorPos: number) => {
        propsOnUrlChange(value);
        setCursorPosition(cursorPos);
        setIsTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
          setIsTyping(false);
          setIsIdle(!value);
        }, 1000);
      }, 50),
    [propsOnUrlChange]
  );

  useEffect(() => {
    if (!url && isIdle) {
      const interval = setInterval(() => {
        setPage(([prevPage, prevDirection]) => {
          const nextPage = (prevPage + 1) % placeholderTexts.length;
          return [nextPage, 1];
        });
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [url, isIdle]);

  const resolveVariables = (urlString: string): string => {
    return urlString.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const variable = variables.find((v) => v.key === key);
      return variable ? variable.value : "{{" + key + "}}";
    });
  };

  const urlType = useMemo(() => detectUrlType(url), [url]);
  const wsProtocol = useMemo(() => detectWebSocketProtocol(url), [url]);

  const isValidUrl = (urlString: string): boolean => {
    if (!urlString) return false;

    if (
      urlString === "http://" ||
      urlString === "https://" ||
      urlString === "ws://" ||
      urlString === "wss://"
    ) {
      return false;
    }

    const hasVariables = urlString.includes("{{");
    if (hasVariables) {
      const hasUnclosedVariables =
        (urlString.match(/\{\{/g) || []).length !==
        (urlString.match(/\}\}/g) || []).length;
      if (hasUnclosedVariables) return false;

      const variableMatches = urlString.match(/\{\{([^}]+)\}\}/g) || [];
      const allVariablesDefined = variableMatches.every((match) => {
        const varName = match.slice(2, -2);
        return variables.some((v) => v.key === varName);
      });

      if (!allVariablesDefined) return false;
    }

    const resolvedUrl = resolveVariables(urlString);
    const httpPattern =
      /^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    const wsPattern =
      /^wss?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

    return httpPattern.test(resolvedUrl) || wsPattern.test(resolvedUrl);
  };

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

    debouncedHandleInput(newValue, cursorPos);

    const beforeCursor = newValue.slice(0, cursorPos);
    const match = beforeCursor.match(/\{\{([^}]*)$/);

    if (match) {
      const searchTerm = match[1].toLowerCase();
      setSearchPrefix(searchTerm);
      setShowEnvSuggestions(true);
    } else {
      setShowEnvSuggestions(false);
    }

    setIsIdle(false);
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

  const {
    connect: wsConnect,
    disconnect: wsDisconnect,
    isConnected,
    connectionStatus,
    onUrlChange: wsUrlChange,
    url: wsUrl,
  } = useWebSocket();

  const handleUrlChange = (newUrl: string) => {
    const urlProtocol = detectUrlType(newUrl);
    propsOnUrlChange(newUrl);

    if ((!newUrl || urlProtocol === "http") && isWebSocketMode) {
      if (wsConnected) {
        wsDisconnect();
      }
      onWebSocketToggle();
    } else if (newUrl && urlProtocol === "websocket" && !isWebSocketMode) {
      onWebSocketToggle();
    }

    if (isWebSocketMode) {
      wsUrlChange(newUrl);
    }
  };

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
        const protocol = detectWebSocketProtocol(formattedUrl);
        wsConnect([protocol]);
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
                urlType === "websocket" ? handleWebSocketAction : handleSendRequest
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
                <Send
                  className={cn(
                    "h-5 w-5",
                    "transition-transform duration-200",
                    "group-hover:translate-x-1"
                  )}
                />
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

  const handleEnterKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (urlType === "websocket") {
        handleWebSocketAction();
      } else {
        if (isValidUrl(url)) {
          handleSendRequest();
        }
      }
    }
  };

  const renderUrlInput = () => (
    <div className="w-full relative flex-1">
      <motion.div
        variants={idleAnimationVariants}
        animate={isIdle && !url ? "idle" : "active"}
        className="absolute inset-0 rounded-lg pointer-events-none"
      />

      <div className="relative">
        <Input
          ref={inputRef}
          value={url}
          disabled={isConnected}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (!isConnected) {
              if (e.key === "Escape") setShowEnvSuggestions(false);
              setIsIdle(false);
              handleEnterKey(e);
            }
          }}
          onFocus={() => setIsIdle(false)}
          onBlur={() => {
            if (!url) {
              setTimeout(() => setIsIdle(true), 100);
            }
          }}
          className={cn(
            "pr-20 font-mono bg-slate-900",
            "border border-slate-700 text-slate-500 rounded-lg",
            "transition-all duration-300 ease-out",
            "placeholder:text-slate-500 placeholder:font-mono",
            "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30",
            `focus:border-${getMethodColor(method)}-500/50`,
            !isValidUrl(url) && url && "border-red-500/50",
            "text-xs sm:text-sm",
            "tracking-tight leading-relaxed",
            isConnected && "opacity-50 cursor-not-allowed bg-slate-800",
            isIdle && !url && "border-blue-500/20",
            isTyping &&
              "border-blue-500/30 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
          )}
          style={{
            fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
          }}
        />

        {!url && isIdle && (
          <AnimatePresence mode="wait" initial={false}>
            <AnimatedPlaceholder
              key={page}
              text={placeholderTexts[page]}
              direction={direction}
            />
          </AnimatePresence>
        )}
      </div>

      {isIdle && !url && (
        <motion.div
          animate={{
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 -z-10 bg-blue-500/5 rounded-lg blur-lg"
        />
      )}

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {variables && variables.length > 0 && (
          <Badge
            variant="secondary"
            className={`text-xs bg-${getMethodColor(
              method
            )} text-${getMethodColor(method)}-400`}
          >
            {variables.length} vars
          </Badge>
        )}
      </div>

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

  const filteredVariables = useMemo(() => {
    if (!showEnvSuggestions) return [];

    const validVariables = Array.isArray(variables) ? variables : [];

    return validVariables
      .filter((v) => {
        const searchTerm = searchPrefix.toLowerCase().trim();
        return v.key.toLowerCase().includes(searchTerm);
      })
      .sort((a, b) => {
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
      const newUrl = beforeCursor + `{{${varKey}}}` + afterCursor;
      handleUrlChange(newUrl);
    } else {
      const newUrl =
        beforeCursor.slice(0, varStart) + `{{${varKey}}}` + afterCursor;
      handleUrlChange(newUrl);
    }

    setShowEnvSuggestions(false);

    setTimeout(() => {
      const newPosition = varStart + varKey.length + 4;
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    }, 0);
  };

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

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleSendRequest = () => {
    // Store the active request data on the window object
    (window as any).__ACTIVE_REQUEST__ = {
      method,
      url,
      headers: [], // Add your actual headers here
      params: [], // Add your actual params here
      body: {}, // Add your actual body here
      auth: {}, // Add your actual auth here
      response: null // This will be updated after the response
    };
    
    onSendRequest();
  };

  // Update the response after receiving it
  useEffect(() => {
    const handleResponse = (e: CustomEvent) => {
      const responseData = e.detail;
      if ((window as any).__ACTIVE_REQUEST__) {
        (window as any).__ACTIVE_REQUEST__.response = responseData;
      }
    };

    window.addEventListener("apiResponse", handleResponse as EventListener);
    return () => {
      window.removeEventListener("apiResponse", handleResponse as EventListener);
    };
  }, []);

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

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const getWebSocketClasses = (connected: boolean) =>
  cn(
    "w-10 h-10 rounded-lg transition-all relative overflow-hidden bg-slate-900 hover:bg-slate-800",
    connected &&
      "after:absolute after:inset-0 after:bg-green-500/20 after:animate-ping"
  );
