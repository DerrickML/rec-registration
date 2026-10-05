import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"
import { hasTrustedRequestOrigin } from "@/lib/request-origin"

const cookieName = "rec-rapporteur-session"

export async function proxyReportingRequest(parts, request) {
  const method = request.method || "GET"
  if (method !== "GET" && !hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin reporting request rejected." }, { status: 403, headers: { "Cache-Control": "no-store" } })
  }
  const path = (parts || []).map((part) => decodeURIComponent(part)).join("/")
  if (!path.startsWith("auth/") && path !== "sessions" && path !== "report" && path !== "report/submit" && path !== "comments") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const url = new URL(request.url)
  const query = url.searchParams.toString()
  const hrPath = `/api/v1/rec/rapporteur/${path}${query ? `?${query}` : ""}`
  const jar = await cookies()
  try {
    const body = method === "GET" ? undefined : await request.json().catch(() => ({}))
    const payload = await fetchHrPortalJson(hrPath, {
      method,
      body,
      bearerToken: jar.get(cookieName)?.value,
      clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: request.headers.get("user-agent") || "",
    })
    const { token, ...safe } = payload || {}
    const response = NextResponse.json(safe || { success: true }, { headers: { "Cache-Control": "no-store" } })
    if (path === "auth/verify-otp" && token) {
      response.cookies.set(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/reporting",
        expires: new Date(payload.expiresAt),
      })
    }
    if (path === "auth/logout") {
      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/reporting",
        maxAge: 0,
      })
    }
    return response
  } catch (error) {
    const response = NextResponse.json(error.payload || { error: error.message || "Reporting request failed" }, {
      status: error.status || 502,
      headers: { "Cache-Control": "no-store" },
    })
    if (error.status === 401) {
      response.cookies.set(cookieName, "", { path: "/api/reporting", maxAge: 0, httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" })
    }
    return response
  }
}
