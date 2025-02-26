import { motion } from "framer-motion";
import { UrlVariable } from "@/types/url-bar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCallback } from "react";

interface SuggestionsDropdownProps {
  suggestions: UrlVariable[];
  onSelect: (key: string) => void;
  searchTerm?: string;
}

export function SuggestionsDropdown({
  suggestions,
  onSelect,
  searchTerm = "",
}: SuggestionsDropdownProps) {
  const handleSelect = useCallback(
    (key: string) => {
      onSelect(key);
    },
    [onSelect]
  );

  if (suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 z-50 w-full mt-1 
        rounded-lg border border-slate-800 bg-slate-900/95 backdrop-blur-sm shadow-lg 
        overflow-hidden"
    >
      <ScrollArea className="max-h-[280px] overflow-auto">
        <div className="p-1 grid grid-cols-1 gap-1">
          {suggestions.map((variable) => (
            <Button
              key={variable.key}
              variant="ghost"
              size="sm"
              onClick={() => handleSelect(variable.key)}
              className="w-full flex items-center gap-2 h-8 px-2 py-1 hover:bg-slate-800/50 
                justify-start font-normal rounded-md group"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                  <span className="font-mono text-xs text-blue-300/90 truncate">
                    {variable.key}
                  </span>
                </div>
                <span className="text-xs text-slate-500 group-hover:text-slate-400">
                  {variable.type === "secret" ? "•••••••" : variable.value}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
