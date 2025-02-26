import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MethodSelectorProps {
  method: string;
  onMethodChange: (method: string) => void;
  isMobile?: boolean;
  className?: string;
  isWebSocketMode?: boolean; 
}

const METHOD_OPTIONS = [
  { value: "GET", color: "emerald" },
  { value: "POST", color: "blue" },
  { value: "PUT", color: "yellow" },
  { value: "DELETE", color: "red" },
  { value: "PATCH", color: "zinc" },
  { value: "WSS", color: "purple" },
] as const;

export function MethodSelector({
  method,
  onMethodChange,
  isMobile,
  className,
  isWebSocketMode = false, // Add default value
}: MethodSelectorProps) {
  const getMethodColor = (method: string) => {
    const colors = {
      GET: "emerald",
      POST: "blue",
      PUT: "yellow",
      DELETE: "red",
      PATCH: "zinc",
      WSS: "purple",
    };
    return colors[method as keyof typeof colors] || "slate";
  };

  // Only show WSS in options if in WebSocket mode, otherwise show HTTP methods
  const currentOptions = isWebSocketMode 
    ? METHOD_OPTIONS.filter(m => m.value === "WSS")
    : METHOD_OPTIONS.filter(m => m.value !== "WSS");

  // Force WSS method when in WebSocket mode
  const currentMethod = isWebSocketMode ? "WSS" : method;

  return (
    <div className={cn("flex items-center", isMobile ? "max-w-[100px]" : "")}>
      <Select 
        value={currentMethod} 
        onValueChange={onMethodChange}
        disabled={isWebSocketMode} // Disable selection in WebSocket mode
      >
        <SelectTrigger
          className={cn(
            "w-auto min-w-[60px] max-w-[100px] rounded-lg font-mono font-black bg-transparent border-2 border-slate-800 text-slate-400 hover:text-slate-300 h-8 gap-2",
            `text-xs text-${getMethodColor(currentMethod)}-400`,
            isWebSocketMode && "opacity-75" // Add slight opacity when in WebSocket mode
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border border-slate-800 bg-slate-800 font-mono max-w-[50px] font-black text-xs">
          {currentOptions.map(({ value, color }) => (
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
  );
}
