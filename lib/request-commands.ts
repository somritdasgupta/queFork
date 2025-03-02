export type Target = "header" | "query" | "auth" | "body" | "env";
export type CommandAction = "set" | "remove" | "clear" | "update";

class RequestCommand {
  private request: any;
  private commandQueue: Array<() => void> = [];

  constructor(request: any) {
    // Initialize empty arrays if they don't exist
    this.request = {
      ...request,
      headers: Array.isArray(request.headers) ? request.headers : [],
      params: Array.isArray(request.params) ? request.params : [],
    };
  }

  // Queue-based execution system
  private enqueue(command: () => void) {
    this.commandQueue.push(command);
    return this;
  }

  execute() {
    this.commandQueue.forEach((command) => command());
    this.commandQueue = []; // Clear the queue
    return this;
  }

  // Enhanced Headers Management
  header(key: string, value?: string, index?: number) {
    return this.enqueue(() => {
      if (!this.request.headers) {
        this.request.headers = [];
      }

      if (typeof index === "number") {
        // Remove specific header at index
        if (value === undefined) {
          this.request.headers.splice(index, 1);
          return;
        }
        // Update specific header at index
        if (index >= 0 && index < this.request.headers.length) {
          this.request.headers[index] = { key, value, enabled: true };
          return;
        }
      }

      if (value === undefined) {
        // Remove header by key (all instances)
        this.request.headers = this.request.headers.filter(
          (h: any) => h.key.toLowerCase() !== key.toLowerCase()
        );
      } else {
        // Add or update first matching header
        const existing = this.request.headers.find(
          (h: any) => h.key.toLowerCase() === key.toLowerCase()
        );
        if (existing) {
          existing.value = value;
          existing.enabled = true;
        } else {
          this.request.headers.push({ key, value, enabled: true });
        }
      }
    });
  }

  // Find header indices by key
  findHeaderIndices(key: string): number[] {
    const indices = this.request.headers.reduce(
      (indices: number[], h: any, i: number) => {
        if (h.key.toLowerCase() === key.toLowerCase()) {
          indices.push(i);
        }
        return indices;
      },
      []
    );
    return indices;
  }

  // Enhanced Query Parameters Management
  query(key: string, value?: string, index?: number) {
    return this.enqueue(() => {
      if (!this.request.params) {
        this.request.params = [];
      }

      if (typeof index === "number") {
        // Remove specific param at index
        if (value === undefined) {
          this.request.params.splice(index, 1);
          return;
        }
        // Update specific param at index
        if (index >= 0 && index < this.request.params.length) {
          this.request.params[index] = { key, value, enabled: true };
          return;
        }
      }

      if (value === undefined) {
        // Remove param by key (all instances)
        this.request.params = this.request.params.filter(
          (p: any) => p.key !== key
        );
      } else {
        // Add or update first matching param
        const existing = this.request.params.find((p: any) => p.key === key);
        if (existing) {
          existing.value = value;
          existing.enabled = true;
        } else {
          this.request.params.push({ key, value, enabled: true });
        }
      }
    });
  }

  // Find query parameter indices by key
  findQueryIndices(key: string): number[] {
    const indices = this.request.params.reduce(
      (indices: number[], p: any, i: number) => {
        if (p.key === key) {
          indices.push(i);
        }
        return indices;
      },
      []
    );
    return indices;
  }

  // Enhanced Auth Management
  auth(type: "none" | "bearer" | "basic" | "apiKey", config?: any) {
    return this.enqueue(() => {
      this.request.auth = {
        type,
        ...(config || {}),
      };
    });
  }

  // Enhanced Body Management
  body(type: string, content: any) {
    return this.enqueue(() => {
      this.request.body = {
        type,
        content,
      };
    });
  }

  // Enhanced Clear Management
  clear(target: Target) {
    return this.enqueue(() => {
      switch (target) {
        case "header":
          this.request.headers = [];
          break;
        case "query":
          this.request.params = [];
          break;
        case "auth":
          this.request.auth = { type: "none" };
          break;
        case "body":
          this.request.body = { type: "none", content: "" };
          break;
        case "env":
          this.request.environment = {};
          break;
      }
    });
  }

  // Get the request after executing all commands
  getRequest() {
    return this.request;
  }
}

// Simple command builder factory without proxy (fixes stack overflow)
export function qf(request: any) {
  return new RequestCommand(request);
}
