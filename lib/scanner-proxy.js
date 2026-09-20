import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"

const cookieName = "rec-scanner-session"
export function scannerDevEnabled(request) {
  return process.env.NODE_ENV === "development" && process.env.REC_SCANNER_DEV_LOGIN_ENABLED === "true"
    && String(process.env.REC_SCANNER_DEV_LOGIN_SECRET || "").length >= 32
    && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
    && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.HR_PORTAL_BASE_URL || "https://hr.nrep.ug").hostname)
}
export async function proxyScannerRequest(path, request, { method = "GET", login = false, logout = false, development = false } = {}) {
  if (method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Cross-origin scanner request rejected." }, { status: 403 })
  if (development && !scannerDevEnabled(request)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const jar = await cookies()
  try {
    const body = method === "GET" ? undefined : await request.json().catch(() => ({}))
    const payload = await fetchHrPortalJson(path, { method, body,
      bearerToken: jar.get(cookieName)?.value,
      clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: request.headers.get("user-agent") || "",
      ...(development ? { devSecret: process.env.REC_SCANNER_DEV_LOGIN_SECRET } : {}),
    })
    const { token, ...safe } = payload
    const response = NextResponse.json(safe, { headers: { "Cache-Control": "no-store" } })
    if (login && token) response.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/scanner", expires: new Date(payload.expiresAt) })
    if (logout) response.cookies.set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/scanner", maxAge: 0 })
    return response
  } catch (error) {
    const response = NextResponse.json(error.payload || { error: error.message || "Scanner request failed" }, { status: error.status || 502, headers: { "Cache-Control": "no-store" } })
    if (error.status === 401) response.cookies.set(cookieName, "", { path: "/api/scanner", maxAge: 0, httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" })
    return response
  }
}
