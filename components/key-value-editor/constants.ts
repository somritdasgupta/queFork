import { SortablePair, KeyValuePair } from "./types";

// Add generateStableId helper
const generateStableId = (index: number, existingId?: string): string => {
  if (existingId) return existingId;
  return `pair-${index}-${Math.random().toString(36).substr(2, 9)}`;
};

export const STYLES = {
  button: {
    base: "h-7 w-7 p-0",
    hover: "hover:bg-slate-800/50 transition-colors",
    clear: "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10",
    delete: "text-red-400 hover:text-red-300 hover:bg-red-400/10",
    icon: "h-6 w-6 p-0",
    common: "h-8 transition-all rounded-none bg-slate-900/50",
  },
  input: {
    base: [
      "text-xs",
      "flex-1",
      "bg-transparent",
      "border-0",
      "focus:ring-0",
      "text-slate-300",
      "placeholder:text-slate-500",
      "h-8",
      "rounded-none",
      "text-[12px]",
      "leading-4",
      "py-1",
      "pl-9", // Add default left padding
      "select-none",
      "touch-none",
    ].join(" "),
    text: "text-slate-300 placeholder:text-slate-500",
    hover: "transition-colors group-hover:bg-slate-800/50",
    toolbar: "h-6 bg-transparent border-0 text-slate-300 text-xs",
  },
  layout: {
    container: "flex flex-col h-full",
    row: "flex w-full h-8 transition-colors group border border-slate-800/40", // Add fixed height
    rowHover: "hover:bg-slate-800/50 hover:border-slate-700/40",
  },
};

export const createEmptyPair = (id: string): KeyValuePair => ({
  id,
  key: "",
  value: "",
  description: "",
  enabled: true,
  type: "text" as const,
  showSecrets: false,
});

export const utils = {
  isLastItem: (index: number, total: number) => index === total - 1,
  isFirstItem: (index: number) => index === 0,
  shouldShowClear: (
    index: number,
    total: number,
    preventFirstDelete: boolean
  ) => total === 1 || (index === 0 && preventFirstDelete),
  ensureMinimumPairs: (pairs: KeyValuePair[]): KeyValuePair[] => {
    const initialPair = createEmptyPair(generateStableId(0));
    return pairs?.length ? pairs : [initialPair];
  },
  generateStableId,
};
