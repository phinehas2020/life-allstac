import { NextResponse } from "next/server"

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
}

export function jsonResponse<T>(
  body: T,
  init: ResponseInit = {},
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  })
}

export function corsPreflight() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}
