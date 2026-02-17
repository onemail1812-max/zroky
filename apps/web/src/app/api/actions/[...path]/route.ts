import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function handler(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const path = pathname.replace("/api", "");
  const backendUrl = `${BACKEND_BASE_URL}${path}`;

  const res = await fetch(backendUrl, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(req.headers.get("authorization")
        ? { Authorization: req.headers.get("authorization") as string }
        : {}),
    },
    body: req.method === "GET" ? undefined : await req.text(),
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/json",
    },
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
