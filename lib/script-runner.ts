import { TestResult } from "@/types";
interface ScriptConsole {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
}

export class ScriptRunner {
  private context: any;
  private console: ScriptConsole;
  private logs: string[] = [];

  constructor(context: any, onLog?: (type: string, ...args: any[]) => void) {
    this.context = context;
    this.console = {
      log: (...args: any[]) => {
        this.logs.push(`[LOG] ${args.join(' ')}`);
        onLog?.('log', ...args);
      },
      error: (...args: any[]) => {
        this.logs.push(`[ERROR] ${args.join(' ')}`);
        onLog?.('error', ...args);
      },
      warn: (...args: any[]) => {
        this.logs.push(`[WARN] ${args.join(' ')}`);
        onLog?.('warn', ...args);
      }
    };
  }

  async runScript(script: string): Promise<{ success: boolean; error?: string }> {
    try {
      const fn = new Function('context', 'console', `
        with (context) {
          ${script}
        }
      `);

      await fn(this.context, this.console);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
            duration: performance.now() - start
          });
        } catch (error) {
          results.push({
            name,
            passed: false,
            error: error instanceof Error ? error.message : 'Test failed',
            duration: performance.now() - start
          });
        }
      },
      expect: (value: any) => ({
        to: {
          equal: (expected: any) => {
            if (value !== expected) throw new Error(`Expected ${expected} but got ${value}`);
          },
          contain: (expected: any) => {
            if (!value.includes(expected)) throw new Error(`Expected ${value} to contain ${expected}`);
          },
        }
      }),
      response: this.context.response,
      environment: this.context.environment,
    };

    try {
      const fn = new Function('pm', 'console', script);
      await fn(pm, this.console);
      return results;
    } catch (error) {
      console.error('Test execution error:', error);
      return [{
        name: 'Test Suite',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0
      }];
    }
  }

  getLogs(): string[] {
    return this.logs;
  }
}
