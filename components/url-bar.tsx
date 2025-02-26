import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUrlHandler } from "@/hooks/use-url-handler";
import { UrlBarProps } from "@/types/url-bar";
import { SuggestionsDropdown } from "./url-bar/suggestions-dropdown";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { debounce as _debounce } from "lodash";
import { useWebSocketMode } from "@/hooks/use-websocket-mode";
import { Lock } from "lucide-react";

const PLACEHOLDER_TEXTS = [
  "Enter request URL or type '{{' for variables",
  "Type '{{' to access environment variables",
  "Use 'wss://' or 'ws://' for WebSocket mode",
] as const;

export function UrlBar({
  url,
  isLoading,
  variables,
  onUrlChange,
  disabled,
  className,
  isWebSocketMode,
  onWebSocketToggle,
  onStateUpdate,
  wsState,
}: Pick<
  UrlBarProps,
  | "url"
  | "isLoading"
  | "variables"
  | "onUrlChange"
  | "isWebSocketMode"
  | "wsState"
> & {
  disabled?: boolean;
  className?: string;
  onWebSocketToggle: () => void;
  onStateUpdate?: (updates: any) => void;
}) {
  const { isValidUrl } = useUrlHandler(variables);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(variables);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef<number>(0);
  const searchTermRef = useRef("");

  const { formatWebSocketUrl } = useWebSocketMode(
    url,
    isWebSocketMode,
    onWebSocketToggle,
    onStateUpdate
  );

  // handleUrlChange to directly pass the value without WebSocket formatting when deleting
  const handleUrlChange = useCallback(
    (newValue: string, isDeleting = false) => {
      // When deleting, we don't format the URL
      const valueToUpdate = isDeleting
        ? newValue
        : isWebSocketMode
          ? formatWebSocketUrl(newValue)
          : newValue;
      onUrlChange(valueToUpdate);
    },
    [isWebSocketMode, formatWebSocketUrl, onUrlChange]
  );

  // Handle suggestions
  const processSuggestions = useCallback(
    (value: string, cursorPos: number) => {
      const beforeCursor = value.slice(0, cursorPos);
      const match = beforeCursor.match(/\{\{([^}]*)$/);

      if (match) {
        const searchTerm = match[1].toLowerCase();
        searchTermRef.current = searchTerm;
        const filtered = variables.filter((v) =>
          v.key.toLowerCase().includes(searchTerm)
        );
        setShowSuggestions(true);
        setSuggestions(filtered);
      } else {
        setShowSuggestions(false);
      }
    },
    [variables]
  );

  // Handle variable selection
  const handleVariableSelect = useCallback(
    (varKey: string) => {
      if (!inputRef.current) return;

      const cursorPos = cursorPosRef.current;
      const currentValue = inputRef.current.value;
      const beforeCursor = currentValue.slice(0, cursorPos);
      const afterCursor = currentValue.slice(cursorPos);
      const varStart = beforeCursor.lastIndexOf("{{");

      const newUrl =
        varStart === -1
          ? beforeCursor + `{{${varKey}}}` + afterCursor
          : beforeCursor.slice(0, varStart) + `{{${varKey}}}` + afterCursor;

      onUrlChange(newUrl);
      setShowSuggestions(false);
    },
    [onUrlChange]
  );

  // Click outside handler
  useClickOutside(containerRef, () => setShowSuggestions(false));

  // Compute if URL input should be disabled
  const isUrlInputDisabled =
    disabled ||
    (isWebSocketMode &&
      (wsState?.isConnected || wsState?.connectionStatus === "connecting"));

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={url}
          disabled={isUrlInputDisabled}
          onChange={(e) => {
            const isDeleting =
              e.nativeEvent instanceof InputEvent &&
              (e.nativeEvent.inputType === "deleteContentBackward" ||
                e.nativeEvent.inputType === "deleteContentForward");

            handleUrlChange(e.target.value, isDeleting);
            cursorPosRef.current = e.target.selectionStart || 0;
            processSuggestions(e.target.value, cursorPosRef.current);
          }}
          onSelect={(e) => {
            cursorPosRef.current =
              (e.target as HTMLInputElement).selectionStart || 0;
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          className={cn(
            "font-mono text-sm h-8",
            "bg-slate-900/90 backdrop-blur-sm",
            "border-2 border-slate-800 rounded-lg",
            "transition-colors duration-200",
            !isValidUrl(url) && url && "border-red-500/50",
            isUrlInputDisabled && "opacity-50 cursor-not-allowed bg-slate-800"
          )}
          placeholder={PLACEHOLDER_TEXTS[0]}
        />
        {isUrlInputDisabled && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Lock className="h-4 w-4" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && (
          <SuggestionsDropdown
            suggestions={suggestions}
            onSelect={handleVariableSelect}
            searchTerm={searchTermRef.current}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
