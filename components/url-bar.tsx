import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
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
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTabManager } from "./tab-manager";
import { Tab } from "@/types/tabs";

const pulseVariants = {
  idle: {
    opacity: [0.5, 1, 0.5],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: "easeInOut",
    },
  },
};

const methodBadgeVariants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    },
  },
  exit: { opacity: 0, y: 10 },
};

const loadingOverlayVariants = {
  hidden: { opacity: 0, x: "-100%" },
  visible: {
    opacity: 1,
    x: "100%",
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

const inputFocusAnimation = {
  scale: 1.002,
  transition: { duration: 0.2, ease: "easeInOut" },
};

const neonTrailVariants = {
  animate: {
    pathLength: [0, 1],
    pathOffset: [0, 1],
    transition: {
      duration: 8,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

const PLACEHOLDER_TEXTS = [
  "Enter request URL or type '{{' for variables",
  "Type '{{' to access environment variables",
  "Use 'wss://' or 'ws://' for WebSocket mode",
  "Welcome to queFork - Your API Testing Companion",
  "Press '/' to focus the URL bar",
  "Supports REST, WebSocket and Socket.IO",
] as const;

const placeholderVariants = {
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
  enter: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.2 },
  },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

interface UrlBarProps {
  method: string;
  url: string;
  isLoading: boolean;
  wsState?: {
    isConnected: boolean;
    connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  };
  isWebSocketMode: boolean;
  variables: Array<{
    key: string;
    value: string;
    type?: "text" | "secret";
  }>;
  recentUrls?: string[];
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSendRequest: () => void;
  onWebSocketToggle: () => void;
  onCancel?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  className?: string;
  isMobile?: boolean;
  hasExtension?: boolean;
}

type UrlProtocol = "wss" | "sio";

const detectWebSocketProtocol = (url: string): UrlProtocol => {
  return /socket\.io|engine\.io|\?EIO=[3-4]|transport=websocket|\/socket\.io\/?/.test(
    url
  )
    ? "sio"
    : "wss";
};

const AnimatedPlaceholder = ({ text }: { text: string }) => (
  <motion.div
    className="absolute inset-0 flex items-center px-4 pointer-events-none text-xs sm:text-sm"
    initial="enter"
    animate="center"
    exit="exit"
    variants={placeholderVariants}
  >
    <span className="font-mono text-slate-600/80 truncate">{text}</span>
  </motion.div>
);

// 1. Optimize debounce function with proper typing and caching
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func(...args);
    }, wait);
  };
};

// 2. Memoize the URL regex patterns
const URL_PATTERNS = {
  websocket: /^wss?:\/\/|socket\.io|websocket/,
  socketIO:
    /socket\.io|engine\.io|\?EIO=[3-4]|transport=websocket|\/socket\.io\/?/,
} as const;

export function UrlBar({
  method,
  url,
  isLoading,
  isWebSocketMode,
  variables,
  isMobile,
  onMethodChange,
  onUrlChange: propsOnUrlChange,
  onSendRequest,
  onWebSocketToggle,
}: UrlBarProps) {
  // Add this ref to track cursor position
  const lastCursorPositionRef = useRef<number>(0);
  const isUserTypingRef = useRef(false);

  // Replace state object with individual states to prevent unnecessary re-renders
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<typeof variables>([]);

  // Use refs for values that don't need re-renders
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number>(0);
  const searchPrefixRef = useRef("");
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced URL validation
  const debouncedValidateUrl = useMemo(
    () =>
      debounce((value: string) => {
        const isValid = isValidUrl(value);
        // Only update if necessary
        if (inputRef.current) {
          inputRef.current.setAttribute("aria-invalid", (!isValid).toString());
        }
      }, 200),
    []
  );

  // Optimize suggestion processing
  const processSuggestions = useCallback(
    (value: string, cursorPos: number) => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        const beforeCursor = value.slice(0, cursorPos);
        const match = beforeCursor.match(/\{\{([^}]*)$/);

        if (match) {
          const searchTerm = match[1].toLowerCase();
          searchPrefixRef.current = searchTerm;

          // Use requestAnimationFrame for smoother UI updates
          requestAnimationFrame(() => {
            const filtered = variables
              .filter((v) => v.key.toLowerCase().includes(searchTerm))
              .slice(0, 100);

            setShowSuggestions(true);
            setSuggestions(filtered);
          });
        } else {
          setShowSuggestions(false);
          setSuggestions([]);
        }
      }, 100);
    },
    [variables]
  );

  // Optimize input handling
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const newValue = input.value;
      const newPosition = input.selectionStart || 0;

      // Store cursor position before React updates
      lastCursorPositionRef.current = newPosition;
      isUserTypingRef.current = true;

      // Update URL
      propsOnUrlChange(newValue);

      // Schedule cursor position restoration
      requestAnimationFrame(() => {
        if (isUserTypingRef.current && input) {
          input.setSelectionRange(
            lastCursorPositionRef.current,
            lastCursorPositionRef.current
          );
          isUserTypingRef.current = false;
        }
      });

      // Handle suggestions after cursor is restored
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        requestAnimationFrame(() => {
          debouncedValidateUrl(newValue);
          processSuggestions(newValue, newPosition);
          isTypingRef.current = false;
        });
      }
    },
    [propsOnUrlChange, debouncedValidateUrl, processSuggestions]
  );

  // Optimize variable insertion
  const handleVariableSelect = useCallback(
    (varKey: string) => {
      if (!inputRef.current) return;

      const cursorPos = lastCursorPositionRef.current;
      const currentValue = inputRef.current.value;
      const beforeCursor = currentValue.slice(0, cursorPos);
      const afterCursor = currentValue.slice(cursorPos);
      const varStart = beforeCursor.lastIndexOf("{{");

      const newUrl =
        varStart === -1
          ? beforeCursor + `{{${varKey}}}` + afterCursor
          : beforeCursor.slice(0, varStart) + `{{${varKey}}}` + afterCursor;

      const newPosition =
        (varStart === -1 ? beforeCursor.length : varStart) + varKey.length + 4;

      // Store the new cursor position
      lastCursorPositionRef.current = newPosition;
      isUserTypingRef.current = true;

      // Update URL
      propsOnUrlChange(newUrl);

      // Focus and set cursor position
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newPosition, newPosition);
          isUserTypingRef.current = false;
        }
      });
    },
    [propsOnUrlChange]
  );

  // Add tab context and get current tab state
  const { activeTab, updateTab, tabs } = useTabManager();
  const currentTab = tabs.find((t) => t.id === activeTab);
  const tabState = currentTab?.state;

  // Add handleStateUpdate function
  const handleStateUpdate = useCallback(
    (updates: Partial<Tab["state"]>) => {
      if (!currentTab) return;

      // Update tab state with new values while preserving existing state
      updateTab(activeTab, {
        state: { ...currentTab.state, ...updates },
        unsaved: true,
      });
    },
    [currentTab, activeTab, updateTab]
  );

  // Optimize state management with useRef for values that don't need renders
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Add refs for cursor and value tracking

  // Batch state updates
  const [state, setState] = useState({
    searchPrefix: "",
    cursorPosition: 0,
    isIdle: true,
    isTyping: false,
  });

  // Create virtualized list for suggestions
  const virtualizer = useVirtualizer({
    count: suggestions.length,
    getScrollElement: () => suggestionsRef.current,
    estimateSize: () => 36, // height of each suggestion item
    overscan: 5,
  });

  // Add controlled selection management
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);

  // Update useEffect for cursor position management
  useEffect(() => {
    if (inputRef.current && selection) {
      inputRef.current.setSelectionRange(selection.start, selection.end);
      setSelection(null); // Clear selection after applying
    }
  }, [selection]);

  // Memoize suggestion rendering
  const renderSuggestion = useCallback(
    (index: number) => {
      const variable = suggestions[index];
      return (
        <button
          key={variable.key}
          onClick={() => handleVariableSelect(variable.key)}
          className="w-full flex items-center px-3 py-2 hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
            <span className="font-mono text-xs text-blue-300">
              {variable.key}
            </span>
            <span className="text-xs text-slate-500">=</span>
            <span className="text-xs text-slate-400 truncate">
              {variable.type === "secret" ? "•••••••" : variable.value}
            </span>
          </div>
        </button>
      );
    },
    [suggestions]
  );

  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const cursorUpdatePending = useRef(false);
  const [[]] = useState([0, 0]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const {
    connect: wsConnect,
    disconnect: wsDisconnect,
    isConnected,
    connectionStatus,
    onUrlChange: wsUrlChange,
  } = useWebSocket();

  // 4. Memoize handlers that don't need frequent updates

  // 6. Memoize filtered variables computation

  // 7. Optimize URL validation with memoization
  const isValidUrl = useCallback(
    (urlString: string): boolean => {
      if (!urlString || urlString.match(/^(https?:\/\/|wss?:\/\/)$/))
        return false;

      const hasVariables = urlString.includes("{{");
      if (hasVariables) {
        const unresolvedVars = (urlString.match(/\{\{([^}]+)\}\}/g) || []).some(
          (match) => !variables.find((v) => v.key === match.slice(2, -2))
        );
        if (unresolvedVars) return false;
      }

      // Use precompiled regex patterns
      return /^(https?:\/\/|wss?:\/\/)?(localhost|[\w-]+\.[\w.-]+)(:\d+)?([/?].*)?$/.test(
        urlString
      );
    },
    [variables]
  );

  // 8. Memoize the URL type detection
  const urlType = useMemo(
    () => (URL_PATTERNS.websocket.test(url) ? "websocket" : "http"),
    [url]
  );

  // Add separate effect for WebSocket mode handling
  useEffect(() => {
    const isWebSocketUrl = URL_PATTERNS.websocket.test(url);
    const shouldBeWebSocketMode = isWebSocketUrl;

    // Only toggle if the mode needs to change
    if (shouldBeWebSocketMode !== isWebSocketMode) {
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        handleStateUpdate({
          isWebSocketMode: shouldBeWebSocketMode,
          method: shouldBeWebSocketMode ? "WSS" : "GET",
        });
        onWebSocketToggle();
      }, 0);
    }
  }, [url, isWebSocketMode, handleStateUpdate, onWebSocketToggle]);

  const wsProtocol = useMemo(() => detectWebSocketProtocol(url), [url]);

  const handleUrlChange = useCallback(
    (newUrl: string) => {
      if (!tabState) return;

      // Only update URL and basic state
      handleStateUpdate({
        url: newUrl,
        response: null,
      });

      // Handle WebSocket URL update
      if (isWebSocketMode) {
        wsUrlChange(newUrl);
      }

      // Notify parent
      propsOnUrlChange(newUrl);
    },
    [
      tabState,
      isWebSocketMode,
      wsUrlChange,
      propsOnUrlChange,
      handleStateUpdate,
    ]
  );

  useEffect(() => {
    if (!url && state.isIdle) {
      const interval = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
      }, 3000); // Change every 3 seconds
      return () => clearInterval(interval);
    }
  }, [url, state.isIdle]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

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

  useEffect(() => {
    const handleScriptUpdate = (e: CustomEvent) => {
      const { type, data } = e.detail;
      if ((window as any).__ACTIVE_REQUEST__) {
        if (type === "preRequestScript" || type === "testScript") {
          (window as any).__ACTIVE_REQUEST__[type] = data.script;
          (window as any).__ACTIVE_REQUEST__.scriptLogs = [
            ...((window as any).__ACTIVE_REQUEST__.scriptLogs || []),
            ...data.logs,
          ];
          if (type === "testScript") {
            (window as any).__ACTIVE_REQUEST__.testResults = data.results;
          }
        }
      }
    };

    const handleResponse = (e: CustomEvent) => {
      if ((window as any).__ACTIVE_REQUEST__) {
        (window as any).__ACTIVE_REQUEST__.response = e.detail;
      }
    };

    window.addEventListener(
      "scriptUpdate",
      handleScriptUpdate as EventListener
    );
    window.addEventListener("apiResponse", handleResponse as EventListener);

    return () => {
      window.removeEventListener(
        "scriptUpdate",
        handleScriptUpdate as EventListener
      );
      window.removeEventListener(
        "apiResponse",
        handleResponse as EventListener
      );
    };
  }, []);

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

  // Add this effect to restore cursor position after render
  useEffect(() => {
    if (
      cursorUpdatePending.current &&
      inputRef.current &&
      cursorPosition !== null
    ) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      cursorUpdatePending.current = false;
    }
  }, [url, cursorPosition]);

  const handleWebSocketAction = useCallback(() => {
    if (!url || !tabState) return;

    if (isConnected) {
      // When disconnecting, first disconnect WebSocket
      wsDisconnect();
      // Then update the tab state
      updateTab(activeTab, {
        state: { ...tabState, isWebSocketMode: false },
      });
      onWebSocketToggle();
    } else {
      try {
        // Format the URL first
        const formattedUrl =
          url.startsWith("ws://") || url.startsWith("wss://")
            ? url
            : url.startsWith("http://")
              ? url.replace("http://", "ws://")
              : url.startsWith("https://")
                ? url.replace("https://", "wss://")
                : `ws://${url}`;

        // Update URL in WebSocket context
        wsUrlChange(formattedUrl);

        // Connect to WebSocket
        wsConnect();

        // Update tab state
        if (!isWebSocketMode) {
          updateTab(activeTab, {
            state: { ...tabState, isWebSocketMode: true },
          });
          onWebSocketToggle();
        }
      } catch (error) {
        console.error("WebSocket setup error:", error);
        toast.error("Failed to setup WebSocket connection");
      }
    }
  }, [
    url,
    isConnected,
    wsConnect,
    wsDisconnect,
    wsUrlChange,
    onWebSocketToggle,
    activeTab,
    isWebSocketMode,
    tabState,
  ]);

  const renderActionButtons = () => (
    <div className="flex items-center gap-2 rounded-lg">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={
                urlType === "websocket"
                  ? handleWebSocketAction
                  : handleSendRequest
              }
              disabled={
                !isValidUrl(url) ||
                (urlType === "websocket"
                  ? connectionStatus === "connecting"
                  : isLoading)
              }
              className={cn(
                "w-full h-8 transition-all relative border-2 border-slate-800 rounded-lg",
                urlType === "websocket"
                  ? isConnected
                    ? "text-white after:absolute after:inset-0"
                    : "bg-slate-900 hover:bg-slate-700 text-slate-400"
                  : isLoading
                    ? "bg-slate-900 text-slate-400 cursor-not-allowed overflow-hidden"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400",
                (!isValidUrl(url) || isLoading) &&
                  "opacity-50 cursor-not-allowed",
                "backdrop-blur-sm"
              )}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <motion.div
                    className="absolute inset-0 bg-blue-500/10"
                    variants={loadingOverlayVariants}
                    initial="hidden"
                    animate="visible"
                  />
                </div>
              ) : urlType === "websocket" ? (
                isConnected ? (
                  <motion.div
                    variants={pulseVariants}
                    animate="idle"
                    className="relative"
                  >
                    <Unplug className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <PlugZap2 className="h-5 w-5" />
                )
              ) : (
                <Send
                  className="h-5 w-5 transition-transform duration-200"
                  strokeWidth={1}
                  style={{
                    stroke: "white",
                    fill: "yellow",
                    fillOpacity: 0.25,
                  }}
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

  const inputProps = {
    ref: inputRef,
    value: url,
    disabled: isConnected,
    onChange: handleInputChange,
    onSelect: (e: React.SyntheticEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      setCursorPosition(target.selectionStart || 0);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!isConnected) {
        if (e.key === "Escape") {
          setShowSuggestions(false);
        }
        handleEnterKey(e);
      }
    },
    onFocus: () => setState((prev) => ({ ...prev, isIdle: false })),
    className: cn(
      "pr-20 font-mono bg-slate-900/90 backdrop-blur-sm",
      "border border-slate-800 text-slate-500 rounded-lg",
      "text-xs sm:text-sm tracking-tight leading-relaxed",
      "transition-all duration-200",
      isConnected && "opacity-50 cursor-not-allowed bg-slate-800",
      !isValidUrl(url) && url && "border-red-500/50",
      "transform-gpu will-change-[border-color]",
      // Add subtle glow when focused
      "focus:border-blue-500/20 focus:ring-1 focus:ring-blue-500/20"
    ),
  };

  const renderUrlInput = () => (
    <div className="w-full relative flex-1">
      <motion.div className="relative" whileFocus={inputFocusAnimation}>
        <div className="absolute inset-0 -m-[1px] pointer-events-none">
          <svg className="w-full h-full">
            <motion.rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="none"
              strokeWidth="2"
              stroke="url(#neonGradient)"
              rx="8"
              variants={neonTrailVariants}
              initial="initial"
              animate="animate"
            />
            <defs>
              <linearGradient id="neonGradient" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#3b82f6" /> {/* Blue-500 */}
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <Input
          {...inputProps}
          className={cn(
            "pr-20 h-8 font-mono bg-slate-900/90 backdrop-blur-sm",
            "border-2 border-slate-800 text-slate-500 rounded-lg",
            "text-xs sm:text-sm tracking-tight leading-relaxed",
            "transition-all duration-200",
            isConnected && "opacity-50 cursor-not-allowed bg-slate-800",
            !isValidUrl(url) && url && "border-red-500/50",
            "transform-gpu will-change-[border-color]",
            "focus:border-blue-500/20 focus:ring-1 focus:ring-blue-500/20"
          )}
        />

        {/* Rest of existing input wrapper content */}
        <AnimatePresence mode="wait">
          {!url && (
            <motion.div
              key={placeholderIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <AnimatedPlaceholder text={PLACEHOLDER_TEXTS[placeholderIndex]} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 z-50 w-full mt-1 max-h-[300px] overflow-auto
            rounded-lg border border-slate-800 bg-slate-900 shadow-md"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {renderSuggestion(virtualItem.index)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProtocolBadge = (protocol: string) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center justify-center bg-slate-900 border border-slate-800 rounded-lg px-2 h-8"
    >
      <motion.div
      variants={methodBadgeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex items-center"
      >
      <Badge
        variant="outline"
        className={cn(
        "font-mono text-xs border-none flex items-center",
        protocol === "io"
          ? "bg-blue-500/10 text-blue-400"
          : "bg-purple-500/10 text-purple-400"
        )}
      >
        {protocol.toUpperCase()}
      </Badge>
      </motion.div>
    </motion.div>
  );

  const handleSendRequest = () => {
    // Store the active request data with scripts on the window object
    (window as any).__ACTIVE_REQUEST__ = {
      method,
      url,
      headers: [],
      params: [],
      body: {},
      auth: {},
      preRequestScript: "", // Will be populated when script runs
      testScript: "", // Will be populated when script runs
      testResults: [], // Will be populated after tests run
      scriptLogs: [], // Will be populated during script execution
      response: null, // This will be updated after the response
    };

    onSendRequest();
  };

  // Update scripts and results after execution
  useEffect(() => {
    const handleScriptUpdate = (e: CustomEvent) => {
      const { type, data } = e.detail;
      if ((window as any).__ACTIVE_REQUEST__) {
        switch (type) {
          case "preRequestScript":
            (window as any).__ACTIVE_REQUEST__.preRequestScript = data.script;
            (window as any).__ACTIVE_REQUEST__.scriptLogs = [
              ...((window as any).__ACTIVE_REQUEST__.scriptLogs || []),
              ...data.logs,
            ];
            break;
          case "testScript":
            (window as any).__ACTIVE_REQUEST__.testScript = data.script;
            (window as any).__ACTIVE_REQUEST__.testResults = data.results;
            (window as any).__ACTIVE_REQUEST__.scriptLogs = [
              ...((window as any).__ACTIVE_REQUEST__.scriptLogs || []),
              ...data.logs,
            ];
            break;
        }
      }
    };

    window.addEventListener(
      "scriptUpdate",
      handleScriptUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "scriptUpdate",
        handleScriptUpdate as EventListener
      );
    };
  }, []);

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
      window.removeEventListener(
        "apiResponse",
        handleResponse as EventListener
      );
    };
  }, []);

  return (
    <div className="flex-1 flex items-center gap-2">
      {urlType === "websocket" ? (
        renderProtocolBadge(wsProtocol)
      ) : (
        <div
          className={cn(
            "flex items-center bg-slate-900 border border-slate-800 rounded-lg px-0",
            // Change from md: to lg: to include tablets
            isMobile ? "max-w-[60px]" : ""
          )}
        >
          <Select value={method} onValueChange={onMethodChange}>
            <SelectTrigger
              className={cn(
                "w-auto min-w-[70px] max-w-[100px] font-mono font-black bg-transparent border border-slate-800 text-slate-400 hover:text-slate-300 h-8 gap-2",
                `text-xs text-${getMethodColor(method)}-400 py-1`
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border border-slate-800 bg-slate-800 font-mono max-w-[50px] font-black text-xs">
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
                  className={cn(
                    "text-xs font-mono font-black",
                    `text-${color}-500`
                  )}
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
