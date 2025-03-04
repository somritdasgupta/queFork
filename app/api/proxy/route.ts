import { NextResponse } from "next/server";

// Configure runtime
export const runtime = "edge";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

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

export async function POST(req: Request) {
  const startTime = performance.now();

  try {
    const { method, url, headers, body } = await req.json();

    // URL validation
    try {
      new URL(url);
    } catch {
      return createErrorResponse("Invalid URL format", 400, startTime);
    }

    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
        "Accept-Encoding": "gzip, br",
        "X-Forwarded-For": req.headers.get("x-forwarded-for") || "unknown",
      },
      body: ["GET", "HEAD"].includes(method) ? undefined : JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type");
    let responseData = "";

    try {
      responseData = await response.text();
    } catch (error) {
      return createErrorResponse("Error reading response", 500, startTime);
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseData,
      time: `${(performance.now() - startTime).toFixed(2)}ms`,
      size: formatBytes(new TextEncoder().encode(responseData).length),
    });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 500, startTime);
    }
    return createErrorResponse("Proxy error", 500, startTime);
  }
}
