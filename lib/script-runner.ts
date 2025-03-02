import { TestResult } from "@/types";
import { qf } from "./request-commands";

interface ScriptConsole {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
}

interface ScriptContext {
  request: any;
  env: Record<string, any>;
  console: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };
}

export class ScriptRunner {
  private context: any;
  private console: ScriptConsole;
  private logs: string[] = [];

  constructor(context: any, onLog?: (type: string, ...args: any[]) => void) {
    this.context = context;
    this.console = {
      log: (...args: any[]) => {
        this.logs.push(`[LOG] ${args.join(" ")}`);
        onLog?.("log", ...args);
      },
      error: (...args: any[]) => {
        this.logs.push(`[ERROR] ${args.join(" ")}`);
        onLog?.("error", ...args);
      },
      warn: (...args: any[]) => {
        this.logs.push(`[WARN] ${args.join(" ")}`);
        onLog?.("warn", ...args);
      },
    };
  }

  async runScript(
    script: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const fn = new Function(
        "context",
        "console",
        `
        with (context) {
          ${script}
        }
      `
      );

      await fn(this.context, this.console);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async runTests(script: string): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const pm = {
      test: async (name: string, fn: () => void | Promise<void>) => {
        const start = performance.now();
        try {
          await fn();
          results.push({
            name,
            passed: true,
            duration: performance.now() - start,
          });
        } catch (error) {
          results.push({
            name,
            passed: false,
            error: error instanceof Error ? error.message : "Test failed",
            duration: performance.now() - start,
          });
        }
      },
      expect: (value: any) => ({
        to: {
          equal: (expected: any) => {
            if (value !== expected)
              throw new Error(`Expected ${expected} but got ${value}`);
          },
          contain: (expected: any) => {
            if (!value.includes(expected))
              throw new Error(`Expected ${value} to contain ${expected}`);
          },
        },
      }),
      response: this.context.response,
      environment: this.context.environment,
    };

    try {
      const fn = new Function("pm", "console", script);
      await fn(pm, this.console);
      return results;
    } catch (error) {
      console.error("Test execution error:", error);
      return [
        {
          name: "Test Suite",
          passed: false,
          error: error instanceof Error ? error.message : "Unknown error",
          duration: 0,
        },
      ];
    }
  }

  getLogs(): string[] {
    return this.logs;
  }
}

export function createScriptRunner(
  onLog: (message: string) => void,
  onError: (error: Error) => void
) {
  return {
    runScript(script: string, context: ScriptContext) {
      const logs: string[] = [];
      const startTime = performance.now();

      // Add timestamp to logs
      const timestamp = () => {
        return `[${new Date().toLocaleTimeString()}]`;
      };

      // Create proper console wrapper that formats objects
      const consoleWrapper = {
        log: (...args: any[]) => {
          const message = args
            .map((arg) =>
              typeof arg === "object"
                ? JSON.stringify(arg, null, 2)
                : String(arg)
            )
            .join(" ");
          const logMessage = `${timestamp()} ${message}`;
          logs.push(logMessage);
          onLog(logMessage);
        },
        error: (...args: any[]) => {
          const message = args.map((arg) => String(arg)).join(" ");
          const logMessage = `${timestamp()} [ERROR] ${message}`;
          logs.push(logMessage);
          onLog(logMessage);
        },
        warn: (...args: any[]) => {
          const message = args.map((arg) => String(arg)).join(" ");
          const logMessage = `${timestamp()} [WARN] ${message}`;
          logs.push(logMessage);
          onLog(logMessage);
        },
        info: (...args: any[]) => {
          const message = args.map((arg) => String(arg)).join(" ");
          const logMessage = `${timestamp()} [INFO] ${message}`;
          logs.push(logMessage);
          onLog(logMessage);
        },
      };

      try {
        // Create a single shared command instance
        const requestCommand = qf(context.request);

        // Add execution start log
        consoleWrapper.info("Script execution started");

        // Create a new function with the sandbox as the scope
        const fn = new Function(
          "request",
          "env",
          "qf",
          "console",
          `"use strict";
          try {
            ${script}
            return true;
          } catch (err) {
            console.error("Script execution error:", err.message);
            throw err;
          }`
        );

        // Use a wrapper that always returns the same command instance
        const qfWrapper = () => requestCommand;

        // Execute the script with the wrapper
        fn(context.request, context.env, qfWrapper, consoleWrapper);

        // Execute all queued commands after the script completes
        requestCommand.execute();

        // Get the final request state
        const finalRequest = requestCommand.getRequest();

        // Calculate execution time
        const executionTime = (performance.now() - startTime).toFixed(2);

        // Log success message with execution time
        consoleWrapper.info(
          `Script executed successfully in ${executionTime}ms`
        );

        // Log changes for debugging
        consoleWrapper.info(`Request state after script execution:
          Headers: ${finalRequest.headers?.length || 0}
          Params: ${finalRequest.params?.length || 0}
          Auth Type: ${finalRequest.auth?.type || "none"}
          Body Type: ${finalRequest.body?.type || "none"}
        `);

        return {
          logs,
          error: null,
          modifiedRequest: finalRequest,
          executionTime,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError(error);

        const executionTime = (performance.now() - startTime).toFixed(2);
        return { logs, error, modifiedRequest: null, executionTime };
      }
    },
  };
}
