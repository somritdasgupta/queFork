import { useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  neonTrailVariants,
  inputFocusAnimation,
  placeholderVariants,
} from "./animations";
import { UrlVariable } from "@/types/url-bar";

interface UrlInputProps {
  url: string;
  isConnected: boolean;
  isValidUrl: boolean;
  variables: UrlVariable[];
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelect: (e: React.SyntheticEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  placeholderText?: string;
  getMethodColor: (method: string) => string;
}

export const UrlInput = memo(function UrlInput({
  url,
  isConnected,
  isValidUrl,
  variables,
  inputRef,
  onChange,
  onSelect,
  onKeyDown,
  onFocus,
  placeholderText,
  getMethodColor,
}: UrlInputProps) {
  const inputClassName = cn(
    "pr-20 h-8 font-mono bg-slate-900/90 backdrop-blur-sm",
    "border-2 border-slate-800 text-slate-500 rounded-lg",
    "text-xs sm:text-sm tracking-tight leading-relaxed",
    "transition-all duration-200",
    isConnected && "opacity-50 cursor-not-allowed bg-slate-800",
    !isValidUrl && url && "border-red-500/50",
    "transform-gpu will-change-[border-color]",
    "focus:border-blue-500/20 focus:ring-1 focus:ring-blue-500/20"
  );

  return (
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
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <Input
          ref={inputRef}
          value={url}
          disabled={isConnected}
          onChange={onChange}
          onSelect={onSelect}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          className={inputClassName}
        />

        {!url && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={placeholderText}
              className="absolute inset-0 px-4 flex items-center pointer-events-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <span className="font-mono text-slate-500/50 text-xs truncate">
                {placeholderText}
              </span>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
});
