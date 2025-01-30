import { NextResponse } from "next/server";

async function handleHealthCheck() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      Connection: "keep-alive",
    },
  });
}

export const GET = handleHealthCheck;
export const HEAD = handleHealthCheck;
