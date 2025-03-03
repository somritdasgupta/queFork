import { Button } from "@/components/ui/button";
import { FileCode, ScrollText } from "lucide-react";
import { SCRIPT_EXAMPLES } from "@/lib/script-examples";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExamplesTabProps {
  onApply: (code: string, title: string) => void;
}

export function ExamplesTab({ onApply }: ExamplesTabProps) {
  return (
    <div className="p-2 space-y-2">
      {SCRIPT_EXAMPLES.map((example, index) => (
        <div
          key={index}
          className="border border-slate-700/50 bg-slate-900/40 hover:bg-slate-900/60 rounded-md overflow-hidden"
        >
          <div className="px-3 py-2 flex items-center justify-between bg-slate-800/30 border-b border-slate-700/30">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileCode className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-200 truncate">
                {example.title}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onApply(example.code, example.title);
                toast.success(`Example "${example.title}" applied`);
              }}
              className="h-6 px-2 text-xs hover:bg-slate-800/80 flex-shrink-0"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Apply
            </Button>
          </div>
          <div className="p-2">
            <pre className="text-xs bg-slate-800/40 p-2 rounded text-slate-400 whitespace-pre-wrap break-all">
              <code>{example.code}</code>
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}
