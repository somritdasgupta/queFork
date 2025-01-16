import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { method, url, headers, body } = await req.json();

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({
        error: "Invalid URL format",
        status: 400,
        statusText: "Bad Request",
        headers: {},
        body: null,
        time: `${Date.now() - startTime}ms`,
        size: "0 B",
      });
    }

    // Make the request
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: ["GET", "HEAD"].includes(method)
          ? undefined
          : JSON.stringify(body),
      });

      const responseData = await response.text();
      let responseBody;
      let contentSize = new Blob([responseData]).size;

      // Try to parse as JSON, fallback to text
      try {
        responseBody = JSON.parse(responseData);
      } catch {
        responseBody = responseData;
      }

      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        time: `${Date.now() - startTime}ms`,
        size: formatBytes(contentSize),
      });
    } catch (fetchError) {
      // Handle network errors (DNS resolution failed, connection refused, etc.)
      const errorMessage =
        fetchError instanceof Error
          ? fetchError.message
          : "Network request failed";

      return NextResponse.json({
        error: errorMessage,
        status: 0,
        statusText: "Network Error",
        headers: {},
        body: null,
        time: `${Date.now() - startTime}ms`,
        size: "0 B",
      });
    }
  } catch (error) {
    // Handle parsing errors or other unexpected errors
    console.error("Proxy error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error",
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      body: null,
      time: `${Date.now() - startTime}ms`,
      size: "0 B",
    });
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
