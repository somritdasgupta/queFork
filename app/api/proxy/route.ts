import { NextResponse } from "next/server";

// Add cache configurations
const cache = new Map();
const CACHE_DURATION = 1000 * 60 * 5;
const MAX_CACHE_SIZE = 100;

export async function POST(req: Request) {
  const startTime = performance.now();

  try {
    const { method, url, headers, body } = await req.json();

    // Validate URL
    try {
      new URL(url);
    } catch {
      return createErrorResponse("Invalid URL format", 400, startTime);
    }

    const fetchResponse = await fetch(url, {
      method,
      headers: {
        ...headers,
        'X-Forwarded-For': req.headers.get('x-forwarded-for') || 'unknown',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: ["GET", "HEAD"].includes(method) ? undefined : JSON.stringify(body),
    });

    const contentType = fetchResponse.headers.get("content-type");
    const responseData = contentType?.includes("application/json") 
      ? await fetchResponse.json()
      : await fetchResponse.text();

    // Calculate response size
    const blob = new Blob([typeof responseData === 'string' ? responseData : JSON.stringify(responseData)]);
    const size = blob.size;

    // Calculate time
    const endTime = performance.now();
    const duration = endTime - startTime;

    return NextResponse.json({
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
      headers: Object.fromEntries(fetchResponse.headers.entries()),
      body: responseData,
      contentType,
      time: `${Math.round(duration)}ms`,
      size: formatBytes(size)
    });

  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : "Proxy error",
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