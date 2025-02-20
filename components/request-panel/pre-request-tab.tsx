import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/shared/code-editor";
import {
  SquareFunctionIcon,
  Eraser,
  CheckCircle,
  Info,
  SquareActivityIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

interface PreRequestTabProps {
  script: string;
  logs: string[];
  onChange: (script: string) => void;
}

export function PreRequestTab({ script, logs, onChange }: PreRequestTabProps) {
  const [isValidScript, setIsValidScript] = useState(true);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const handleScriptChange = useCallback(
    (value: string | undefined) => {
      try {
        // Basic JS syntax validation
        new Function(value || "");
        setIsValidScript(true);
        setScriptError(null);
      } catch (e) {
        setIsValidScript(false);
        setScriptError((e as Error).message);
      }
      onChange(value || "");
    },
    [onChange]
  );

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="flex-1 min-h-0 bg-slate-800">
        <CodeEditor
          value={script}
          onChange={handleScriptChange}
          language="javascript"
          height="30vh"
        />
      </div>

      <div
        className={cn(
          "border-t border-slate-800/60",
          isValidScript ? "bg-slate-900 border-y-4" : "bg-red-900/40 border-y-4"
        )}
      >
        <div className="flex items-center justify-between h-9">
          <div className="flex items-center gap-2 px-2">
            <div className="flex items-center gap-2 min-w-0 flex-shrink">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px]",
                  isValidScript
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-red-950 text-red-400 border border-red-800"
                )}
              >
                {isValidScript ? (
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <Info className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="font-medium truncate max-w-[150px] sm:max-w-[300px]">
                  {isValidScript ? "Valid JavaScript" : scriptError}
                </span>
              </div>
              {script && (
                <div
                  className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md 
                  bg-blue-950 border border-blue-800"
                >
                  <span className="text-[11px] text-blue-400 whitespace-nowrap">
                    {new Blob([script]).size} bytes
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="h-9 px-3 rounded-none text-slate-400 hover:text-slate-300 text-xs hover:bg-slate-900"
              title="Clear Script"
            >
              <Eraser className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="border-t border-slate-700 bg-slate-900">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <SquareActivityIcon className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-medium text-slate-400">
                Console Output
              </h3>
            </div>
            <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded-md max-h-32 overflow-auto">
              {logs.join("\n")}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
