import { TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { type RequestResponse } from "@/types";
import { useRef } from "react";

interface HeadersContentProps {
  response: RequestResponse | null;
}

export const HeadersContent = ({ response }: HeadersContentProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const renderVirtualizedHeaders = () => {
    if (!response?.headers) return null;
    const entries = Object.entries(response.headers);

    return (
      <div ref={parentRef} className="h-full overflow-auto">
        <div className="divide-y divide-slate-700/50">
          {entries.map(([key, value], index) => (
            <div
              key={`header-${key}-${index}`}
              className={cn(
                "grid grid-cols-2 gap-4 px-4 py-2",
                index % 2 === 0 ? "bg-slate-900" : "bg-slate-800/50",
                "hover:bg-slate-700/50 transition-colors"
              )}
            >
              <div className="font-mono text-xs text-blue-300 truncate">
                {key}
              </div>
              <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all">
                {typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <TabsContent value="headers" className="absolute inset-0 m-0">
      <ScrollArea className="h-full">
        <div className="bg-slate-900/50">
          {response?.headers && Object.keys(response.headers).length > 0 ? (
            renderVirtualizedHeaders()
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Database className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">No headers available</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  );
};
