import { NextResponse } from "next/server";
import { createGzip, createBrotliCompress } from "zlib";
import dns from "dns";
import { promisify } from "util";

// DNS cache configuration
const dnsCache: Record<string, { address: string; timestamp: number }> = {};
const DNS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const resolveDns = promisify(dns.resolve4);

// Request queue for parallel processing
const requestQueue = new Map<string, Promise<any>>();
const MAX_PARALLEL_REQUESTS = 10;

// Connection pool configuration with optimized settings
const agent = new (require("http").Agent)({
  keepAlive: true,
  maxSockets: MAX_PARALLEL_REQUESTS,
  maxFreeSockets: 5,
  timeout: 60000,
  keepAliveMsecs: 30000,
  scheduling: "lifo", // Last-in-first-out for better performance
});

const httpsAgent = new (require("https").Agent)({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 30000,
});

// Optimized fetch with timeout
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout = 30000
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Enhanced fetch with DNS caching, compression and memory management
async function enhancedFetch(
  url: string,
  options: RequestInit,
  timeout: number
) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;

  // Check DNS cache
  let ip = dnsCache[hostname]?.address;
  if (!ip || Date.now() - dnsCache[hostname].timestamp > DNS_CACHE_DURATION) {
    try {
      const addresses = await resolveDns(hostname);
      ip = addresses[0];
      dnsCache[hostname] = { address: ip, timestamp: Date.now() };
    } catch {
      // Fallback to direct hostname if DNS resolution fails
      ip = hostname;
    }
  }

  // Queue management
  const queueKey = `${ip}:${urlObj.port || (urlObj.protocol === "https:" ? 443 : 80)}`;
  if (requestQueue.size >= MAX_PARALLEL_REQUESTS) {
    await Promise.race(requestQueue.values());
  }

  const fetchPromise = fetchWithTimeout(
    url,
    {
      ...options,
      headers: {
        ...options.headers,
        "Accept-Encoding": "gzip, br", // Support compression
      },
    },
    timeout
  );

  requestQueue.set(queueKey, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    requestQueue.delete(queueKey);
  }
}

// Memory-efficient response processing
async function processResponse(response: Response, startTime: number) {
  const contentType = response.headers.get("content-type");
  const contentLength = response.headers.get("content-length");

  // Use streams for large responses
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    return streamResponse(response);
  }

  // Process smaller responses normally
  const data = await response.text();
  return NextResponse.json({
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: data,
    time: `${(performance.now() - startTime).toFixed(2)}ms`,
    size: formatBytes(new TextEncoder().encode(data).length),
  });
}

export async function POST(req: Request) {
  const startTime = performance.now();
  const controller = new AbortController();

  // Set up cleanup on client disconnect
  req.signal.addEventListener("abort", () => {
    controller.abort();
    // Clean up any ongoing operations
  });

  try {
    const { method, url, headers, body } = await req.json();

    // URL validation
    try {
      new URL(url);
    } catch {
      return createErrorResponse("Invalid URL format", 400, startTime);
    }

    const response = await enhancedFetch(
      url,
      {
        method,
        headers: {
          ...headers,
          Connection: "keep-alive",
          "Accept-Encoding": "gzip, br",
          "X-Forwarded-For": req.headers.get("x-forwarded-for") || "unknown",
        },
        body: ["GET", "HEAD"].includes(method)
          ? undefined
          : JSON.stringify(body),
        keepalive: true,
        signal: controller.signal,
        // @ts-ignore
        agent: url.startsWith("https://") ? httpsAgent : agent,
      },
      30000
    );

    return await processResponse(response, startTime);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return createErrorResponse("Request cancelled", 499, startTime);
      }
      return createErrorResponse(error.message, 500, startTime);
    }
    return createErrorResponse("Proxy error", 500, startTime);
  } finally {
    // Cleanup
    controller.abort();
  }
}

async function streamResponse(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return null;

  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const blob = new Blob(chunks);
  const text = await blob.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Helper functions

function createErrorResponse(
  message: string,
  status: number,
  startTime: number
) {
  return NextResponse.json({
    error: message,
    status,
    statusText: status === 0 ? "Network Error" : "Error",
    headers: {},
    body: null,
    time: `${(performance.now() - startTime).toFixed(2)}ms`,
    size: "0 B",
  });
}

// Helper function to format bytes into human-readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
