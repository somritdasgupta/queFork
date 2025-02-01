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

    const response = await fetch(url, {
      method,
      headers: headers,
      body: ["GET", "HEAD"].includes(method) ? undefined : JSON.stringify(body),
      next: { revalidate: 0 } // Disable caching
    });

    const contentType = response.headers.get("content-type");
    let responseData;

    try {
      if (contentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData,
        contentType: contentType || 'text/plain',
        time: `${(performance.now() - startTime).toFixed(2)}ms`,
        size: formatBytes(new Blob([responseData.toString()]).size)
      });

    } catch (parseError) {
      return NextResponse.json({
        error: `Failed to parse response: ${(parseError as Error).message}`,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
        contentType: contentType || 'text/plain',
        time: `${(performance.now() - startTime).toFixed(2)}ms`
      });
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
