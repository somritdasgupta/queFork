import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/shared/code-editor";
import {
  SquarePlay,
  Eraser,
  TestTube2,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestsTabProps {
  script: string;
  results: TestResult[];
  onChange: (script: string) => void;
}

export function TestsTab({ script, results, onChange }: TestsTabProps) {
  const [isValidTest, setIsValidTest] = useState(true);
  const [testError, setTestError] = useState<string | null>(null);

  const handleTestChange = useCallback(
    (value: string | undefined) => {
      try {
        // Basic JS syntax validation
        new Function(value || "");
        setIsValidTest(true);
        setTestError(null);
      } catch (e) {
        setIsValidTest(false);
        setTestError((e as Error).message);
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
          onChange={handleTestChange}
          language="javascript"
          height="30vh"
        />
      </div>

      {/* Footer with validation */}
      <div
        className={cn(
          "border-t border-slate-800/60",
          isValidTest ? "bg-slate-900 border-y-4" : "bg-red-900/40 border-y-4"
        )}
      >
        <div className="flex items-center justify-between h-9">
          <div className="flex items-center gap-2 px-2">
            <div className="flex items-center gap-2 min-w-0 flex-shrink">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px]",
                  isValidTest
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-red-950 text-red-400 border border-red-800"
                )}
              >
                {isValidTest ? (
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <Info className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="font-medium truncate max-w-[150px] sm:max-w-[300px]">
                  {isValidTest ? "Valid JavaScript" : testError}
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
              title="Clear Test"
            >
              <Eraser className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Results section */}
      {results.length > 0 && (
        <div className="border-t border-slate-700 bg-slate-900">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <TestTube2 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-medium text-slate-400">
                Test Results
              </h3>
            </div>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-md text-xs bg-slate-800",
                    result.passed ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.passed ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span>{result.name}</span>
                    </div>
                    <span className="text-slate-500">
                      {result.duration.toFixed(2)}ms
                    </span>
                  </div>
                  {result.error && (
                    <p className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                      {result.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
