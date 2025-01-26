import { NextResponse } from "next/server";

// Add cache configurations
const cache = new Map();
const CACHE_DURATION = 1000 * 60 * 5;
const MAX_CACHE_SIZE = 100;

export async function POST(req: Request) {
  const startTime = performance.now();

  try {
    const { method, url, headers, body } = await req.json();

    // Validate URL early to fail fast
    try {
      new URL(url);
    } catch {
      return createErrorResponse("Invalid URL format", 400, startTime);
    }

    const cacheKey = method === 'GET' ? `${method}-${url}-${JSON.stringify(headers)}` : null;

    // Check cache for GET requests
    if (cacheKey && cache.has(cacheKey)) {
      const { data, timestamp } = cache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return createSuccessResponse(data, startTime);
      }
      cache.delete(cacheKey); 
    }

    // Optimize headers
    const optimizedHeaders = new Headers();
    for (const [key, value] of Object.entries(headers)) {
      if (value) optimizedHeaders.set(key, value as string);
    }

    // Add performance headers
    optimizedHeaders.set('Accept-Encoding', 'gzip, deflate, br');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); 

    try {
      const response = await fetch(url, {
        method,
        headers: optimizedHeaders,
        body: ["GET", "HEAD"].includes(method) ? undefined : JSON.stringify(body),
        signal: controller.signal,
        cache: method === 'GET' ? 'force-cache' : 'no-store',
      });

      clearTimeout(timeout);

      const responseData = await response.text();
      const contentSize = new Blob([responseData]).size;

      // Parse and prepare response
      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: parseResponseBody(responseData),
        time: `${(performance.now() - startTime).toFixed(2)}ms`,
        size: formatBytes(contentSize),
      };

      // Caching successful GET responses
      if (cacheKey && response.ok) {
        maintainCacheSize();
        cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeout);
      return createErrorResponse(
        fetchError instanceof Error ? fetchError.message : "Network request failed",
        0,
        startTime
      );
    }
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
      startTime
    );
  }
}

// Helper functions
function parseResponseBody(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function createErrorResponse(message: string, status: number, startTime: number) {
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

function createSuccessResponse(data: any, startTime: number) {
  return NextResponse.json({
    ...data,
    time: `${(performance.now() - startTime).toFixed(2)}ms`,
    cached: true,
  });
}

function maintainCacheSize() {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

// Helper function to format bytes into human-readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
