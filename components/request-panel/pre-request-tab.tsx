import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/shared/code-editor";
import {
  Eraser,
  CheckCircle,
  Info,
  SquarePlay,
  Play,
  ListChecks,
  Copy,
  PenSquare,
  PlusCircle,
  Trash2,
  Terminal,
  MoreVertical,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createScriptRunner } from "@/lib/script-runner";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { ExamplesTab } from "./examples-tab";
import { SCRIPT_EXAMPLES } from "@/lib/script-examples";

interface PreRequestTabProps {
  script: string;
  logs: string[];
  onChange: (script: string) => void;
  request: any;
  onRequestChange: (request: any) => void;
  environment?: Record<string, any>;
}

export function PreRequestTab({
  script,
  logs,
  onChange,
  request,
  onRequestChange,
  environment = {},
}: PreRequestTabProps) {
  const [isValidScript, setIsValidScript] = useState(true);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [localLogs, setLocalLogs] = useState<string[]>(logs || []);
  const [isRunning, setIsRunning] = useState(false);
  const [, setActiveTab] = useState<string>("editor");
  const [scriptSequences, setScriptSequences] = useState<
    { name: string; code: string }[]
  >([{ name: "Main Script", code: script }]);
  const [activeSequence, setActiveSequence] = useState(0);

  // Sync with external logs
  useEffect(() => {
    if (logs && logs.length > 0) {
      setLocalLogs(logs);
    }
  }, [logs]);

  const handleScriptChange = useCallback(
    (value: string | undefined) => {
      try {
        new Function(value || "");
        setIsValidScript(true);
        setScriptError(null);
      } catch (e) {
        setIsValidScript(false);
        setScriptError((e as Error).message);
      }

      // Update both the parent and the sequence
      onChange(value || "");

      const newSequences = [...scriptSequences];
      newSequences[activeSequence].code = value || "";
      setScriptSequences(newSequences);
    },
    [onChange, activeSequence, scriptSequences]
  );

  const addLogMessage = useCallback((message: string) => {
    setLocalLogs((prev) => {
      const newLogs = [...prev, message];
      // Update the global logs object
      if ((window as any).__ACTIVE_REQUEST__) {
        (window as any).__ACTIVE_REQUEST__.scriptLogs = newLogs;
      }
      return newLogs;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLocalLogs([]);
    if ((window as any).__ACTIVE_REQUEST__) {
      (window as any).__ACTIVE_REQUEST__.scriptLogs = [];
    }
  }, []);

  const handleRunScript = useCallback(() => {
    setIsRunning(true);
    clearLogs();

    addLogMessage(
      `[${new Date().toLocaleTimeString()}] Starting script execution...`
    );

    const runner = createScriptRunner(
      (message) => {
        addLogMessage(message);
      },
      (error) => {
        addLogMessage(`[ERROR] ${error.message}`);
        setIsValidScript(false);
        setScriptError(error.message);
        toast.error(`Script error: ${error.message}`);
      }
    );

    const requestCopy = JSON.parse(JSON.stringify(request));

    // Log the request before execution
    addLogMessage(
      `[REQUEST] Before script: ${JSON.stringify(
        {
          headers: requestCopy.headers?.length || 0,
          params: requestCopy.params?.length || 0,
          auth: requestCopy.auth?.type,
          body: requestCopy.body?.type,
        },
        null,
        2
      )}`
    );

    const result = runner.runScript(scriptSequences[activeSequence].code, {
      request: requestCopy,
      env: environment,
      console: console,
    });

    if (!result.error && result.modifiedRequest) {
      // Log changes
      addLogMessage(
        `[REQUEST] After script: ${JSON.stringify(
          {
            headers: result.modifiedRequest.headers?.length || 0,
            params: result.modifiedRequest.params?.length || 0,
            auth: result.modifiedRequest.auth?.type,
            body: result.modifiedRequest.body?.type,
          },
          null,
          2
        )}`
      );

      // Update the request with the modified copy
      onRequestChange(result.modifiedRequest);

      toast.success(
        `Script "${scriptSequences[activeSequence].name}" executed successfully`
      );

      setIsValidScript(true);
      setScriptError(null);

      // Switch to logs tab to show output
      setActiveTab("logs");
    }

    setIsRunning(false);
  }, [
    scriptSequences,
    activeSequence,
    request,
    environment,
    onRequestChange,
    addLogMessage,
    clearLogs,
  ]);

  const handleRunAll = useCallback(() => {
    setIsRunning(true);
    clearLogs();

    addLogMessage(
      `[${new Date().toLocaleTimeString()}] Starting sequential execution...`
    );

    let currentRequestCopy = JSON.parse(JSON.stringify(request));

    // Executes scripts sequentially
    const runSequence = async (index = 0) => {
      if (index >= scriptSequences.length) {
        onRequestChange(currentRequestCopy);
        setIsRunning(false);
        toast.success("All scripts executed successfully");
        setActiveTab("logs");
        return;
      }

      addLogMessage(`[SEQUENCE] Running "${scriptSequences[index].name}"...`);

      const runner = createScriptRunner(
        (message) => {
          addLogMessage(message);
        },
        (error) => {
          addLogMessage(
            `[ERROR] ${error.message} in "${scriptSequences[index].name}"`
          );
          setIsValidScript(false);
          setScriptError(error.message);
          toast.error(
            `Error in "${scriptSequences[index].name}": ${error.message}`
          );
          setIsRunning(false);
        }
      );

      const result = runner.runScript(scriptSequences[index].code, {
        request: currentRequestCopy,
        env: environment,
        console: console,
      });

      if (result.error) {
        setIsRunning(false);
        setActiveTab("logs");
        return;
      }

      // Update request for next script
      if (result.modifiedRequest) {
        currentRequestCopy = result.modifiedRequest;
        addLogMessage(`[SEQUENCE] "${scriptSequences[index].name}" completed`);
      }

      // Run next script with a small delay
      setTimeout(() => runSequence(index + 1), 100);
    };

    runSequence(0);
  }, [
    scriptSequences,
    request,
    environment,
    onRequestChange,
    addLogMessage,
    clearLogs,
  ]);

  const addNewSequence = useCallback(() => {
    setScriptSequences((prev) => [
      ...prev,
      {
        name: `Script ${prev.length + 1}`,
        code: `// Script ${prev.length + 1}\nconsole.log("Running script ${prev.length + 1}");\n`,
      },
    ]);
    setActiveSequence(scriptSequences.length);
  }, [scriptSequences]);

  const removeSequence = useCallback(
    (index: number) => {
      if (scriptSequences.length <= 1) {
        toast.error("Cannot remove the last script");
        return;
      }

      setScriptSequences((prev) => prev.filter((_, i) => i !== index));
      if (activeSequence >= index) {
        setActiveSequence(Math.max(0, activeSequence - 1));
      }
    },
    [scriptSequences, activeSequence]
  );

  const copyScript = useCallback(() => {
    if (scriptSequences[activeSequence]?.code) {
      navigator.clipboard.writeText(scriptSequences[activeSequence].code);
      toast.success("Script copied to clipboard");
    }
  }, [scriptSequences, activeSequence]);

  const toolbarActions: Array<{
    label: string;
    icon: any;
    onClick: () => void;
    disabled?: boolean;
    variant?: string;
    dropdownContent?: React.ReactNode;
  }> = [
    {
      label: "Copy",
      icon: Copy,
      onClick: copyScript,
    },
    {
      label: "Run All",
      icon: Play,
      onClick: handleRunAll,
      disabled: isRunning || scriptSequences.length === 1,
      variant: "success",
    },
    {
      label: "Run",
      icon: SquarePlay,
      onClick: handleRunScript,
      disabled: isRunning,
      variant: "success",
    },
    {
      label: "Clear",
      icon: Eraser,
      onClick: () => {
        const newSequences = [...scriptSequences];
        newSequences[activeSequence].code = "";
        setScriptSequences(newSequences);
        onChange("");
      },
    },
  ];

  const renderToolbar = (isMobile = false) => (
    <div className="flex items-center gap-1">
      {!isMobile ? (
        <>
          {toolbarActions.map((action, i) => (
            <React.Fragment key={action.label}>
              {i === 2 && <div className="h-4 w-px bg-slate-700" />}
              <Button
                variant={action.variant === "success" ? "default" : "outline"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  "h-6 px-2 text-xs",
                  action.variant === "success"
                    ? "bg-emerald-900/20 hover:bg-emerald-900/40 border-emerald-700/50 text-emerald-400"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700"
                )}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            </React.Fragment>
          ))}
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 px-0 bg-slate-800 hover:bg-slate-700 border-slate-700"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[140px] bg-slate-900 border-slate-800"
          >
            {toolbarActions.map((action, i) => (
              <React.Fragment key={action.label}>
                {i === 2 && <DropdownMenuSeparator className="bg-slate-700" />}
                <DropdownMenuItem
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    "flex items-center px-2 py-1.5 cursor-pointer",
                    "text-xs font-medium",
                    action.variant === "success"
                      ? "text-emerald-400 hover:bg-emerald-900/20 data-[disabled]:opacity-50"
                      : "text-slate-300 hover:bg-slate-800 data-[disabled]:opacity-50",
                    "focus:bg-slate-800 focus:text-slate-200",
                    action.variant === "success" &&
                      "focus:bg-emerald-900/20 focus:text-emerald-400"
                  )}
                >
                  <action.icon className="h-3.5 w-3.5" />
                  {action.label}
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  const handleApplyExample = useCallback(
    (code: string) => {
      const newSequences = [...scriptSequences];
      newSequences[activeSequence].code = code;
      setScriptSequences(newSequences);
      onChange(code);
    },
    [scriptSequences, activeSequence, onChange]
  );

  return (
    <div className="h-full flex flex-col bg-slate-900/50 border-none">
      <div className="flex-none">
        <div className="bg-slate-900/50">
          {/* Script Selector and Actions Bar */}
          <div className="p-1.5 bg-slate-900/90 border-b-2 border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0 flex-shrink">
                <select
                  value={activeSequence}
                  onChange={(e) => setActiveSequence(Number(e.target.value))}
                  className="w-[100px] sm:w-[200px] text-xs h-6 bg-slate-800 border border-slate-700 rounded-md px-1"
                >
                  {scriptSequences.map((seq, i) => (
                    <option key={i} value={i} className="truncate">
                      {i + 1}. {seq.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addNewSequence}
                  className="h-6 w-6 sm:w-auto px-0 sm:px-2 text-xs bg-slate-800 hover:bg-slate-700 border-slate-700"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add Script</span>
                </Button>
              </div>
              <div className="hidden sm:flex">{renderToolbar(false)}</div>
              <div className="flex sm:hidden">{renderToolbar(true)}</div>
            </div>
          </div>
          <div className="h-[30vh]">
            <CodeEditor
              value={scriptSequences[activeSequence]?.code || ""}
              onChange={handleScriptChange}
              language="javascript"
              height="100%"
            />
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex-1 overflow-hidden w-full max-w-full">
        <Tabs defaultValue="console" className="h-full flex flex-col">
          <div className="flex-none border-y-2 border-slate-700/50 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <TabsList className="bg-transparent h-7 sm:h-8 p-0 rounded-none flex flex-wrap items-center gap-0">
                {[
                  {
                    value: "console",
                    icon: Terminal,
                    label: "Console",
                    badge: localLogs.length,
                  },
                  {
                    value: "sequences",
                    icon: Route,
                    label: "Sequences",
                    badge:
                      scriptSequences.length > 0 ? scriptSequences.length : 0,
                  },
                  {
                    value: "examples",
                    icon: ListChecks,
                    label: "Examples",
                    badge: SCRIPT_EXAMPLES.length,
                  },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "h-7 sm:h-8 rounded-none border-b-2 sm:border-b-4 border-transparent",
                      "font-medium text-[0.65rem] sm:text-xs text-slate-400 px-2 sm:px-3",
                      "data-[state=active]:border-blue-400",
                      "data-[state=active]:text-blue-400",
                      "data-[state=active]:bg-transparent",
                      "hover:text-slate-300",
                      "hover:bg-slate-800/70",
                      "transition-colors",
                      "whitespace-nowrap",
                      "flex-shrink-0"
                    )}
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <tab.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>{tab.label}</span>
                      {tab.badge > 0 && (
                        <Badge
                          className="flex p-0.5 sm:p-1 bg-slate-800 text-slate-400 hover:bg-slate-800 
                            text-[0.65rem] sm:text-xs"
                          variant="secondary"
                        >
                          {tab.badge}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 p-1 rounded-md text-xs mr-2",
                  "border transition-colors w-fit shrink-0",
                  isValidScript
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/50"
                    : "bg-red-950/60 text-red-400 border-red-800/50"
                )}
              >
                {isValidScript ? (
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span className="font-medium truncate hidden sm:inline">
                  {isValidScript ? "Valid JavaScript" : scriptError}
                </span>
              </div>
            </div>
          </div>

          {/* Tab content wrapper */}
          <div className="flex-1 overflow-hidden w-full max-w-full">
            <TabsContent
              value="console"
              className="h-full data-[state=active]:block hidden overflow-auto"
            >
              <div className="p-2">
                <div className="rounded-md bg-slate-900">
                  <pre className="p-3 text-xs whitespace-pre-wrap break-all">
                    {localLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="max-w-md">
                          {/* Icon Container */}
                          <div className="rounded-xl bg-slate-800/50 p-4 mb-6 ring-1 ring-slate-700/50 inline-block">
                            <Terminal className="h-7 w-7 text-slate-400" />
                          </div>

                          {/* Text Content */}
                          <h3 className="text-base font-semibold text-slate-200 mb-3">
                            Console Output Empty
                          </h3>
                          {/* Action Hint */}
                          <div className="flex items-center justify-center gap-2">
                            <div className="px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                              <div className="flex items-center gap-2">
                                <SquarePlay className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs font-medium text-slate-300">
                                  Press Run to execute script
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {localLogs.map((log, i) => (
                          <div
                            key={i}
                            className={cn(
                              "font-mono",
                              log.includes("[ERROR]")
                                ? "text-red-400"
                                : log.includes("[WARN]")
                                  ? "text-amber-400"
                                  : log.includes("[SEQUENCE]")
                                    ? "text-blue-400"
                                    : log.includes("[REQUEST]")
                                      ? "text-emerald-400"
                                      : "text-slate-300"
                            )}
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="sequences"
              className="h-full data-[state=active]:block hidden overflow-auto"
            >
              <div className="p-2 space-y-2">
                {scriptSequences.map((seq, index) => (
                  <div
                    key={index}
                    className={cn(
                      "border rounded-md overflow-hidden transition-colors",
                      activeSequence === index
                        ? "border-blue-500/50 bg-slate-900/80"
                        : "border-slate-700/50 bg-slate-900/40 hover:bg-slate-900/60"
                    )}
                  >
                    <div
                      className={cn(
                        "px-3 py-2 flex items-center justify-between",
                        activeSequence === index
                          ? "bg-blue-500/10 border-b border-blue-500/30"
                          : "bg-slate-800/30 border-b border-slate-700/30"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                            activeSequence === index
                              ? "bg-blue-500/80 text-white"
                              : "bg-slate-700/80 text-slate-300"
                          )}
                        >
                          {index + 1}
                        </div>
                        <input
                          value={seq.name}
                          onChange={(e) => {
                            const newSequences = [...scriptSequences];
                            newSequences[index].name = e.target.value;
                            setScriptSequences(newSequences);
                          }}
                          className="bg-transparent border-none p-0 text-sm font-medium focus:ring-0 focus:outline-none w-full truncate"
                          placeholder="Script name"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveSequence(index)}
                          className={cn(
                            "h-6 px-2 text-xs",
                            activeSequence === index
                              ? "bg-blue-500/20 text-blue-400"
                              : "hover:bg-slate-800/80"
                          )}
                        >
                          <PenSquare className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSequence(index)}
                          disabled={scriptSequences.length <= 1}
                          className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="p-2">
                      <pre
                        className={cn(
                          "text-xs p-2 rounded max-h-24 overflow-auto",
                          activeSequence === index
                            ? "bg-slate-800/80 text-slate-300"
                            : "bg-slate-800/40 text-slate-400"
                        )}
                      >
                        <code>
                          {seq.code.length > 200
                            ? seq.code.substring(0, 200) + "..."
                            : seq.code || "// Empty script"}
                        </code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent
              value="examples"
              className="h-full data-[state=active]:block hidden overflow-auto"
            >
              <ExamplesTab onApply={handleApplyExample} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
