import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"
import { hasTrustedRequestOrigin } from "@/lib/request-origin"
export const runtime = "nodejs"
const cookie = "rec-exhibitor-session"
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/exhibitors"
}
async function handler(request, context) {
  if (
    request.method !== "GET" &&
    !hasTrustedRequestOrigin(request)
  )
    return NextResponse.json(
      { error: "Cross-origin request rejected." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    )
  const { path } = await context.params
  if (path.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment)))
    return NextResponse.json({ error: "Invalid route." }, { status: 400 })
  const jar = await cookies(),
    route = path.join("/")
  try {
    const result = await fetchHrPortalJson(
      `/api/v1/rec/exhibitors/${route}${new URL(request.url).search}`,
      {
        method: request.method,
        bearerToken: jar.get(cookie)?.value,
        ...(request.method === "GET" ? {} : { body: await request.json() }),
        clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        signal: AbortSignal.timeout(90000)
      }
    )
    const { token, ...safe } = result
    const response = NextResponse.json(safe, {
      headers: { "Cache-Control": "no-store" }
    })
    if (route === "auth/verify-otp" && token)
      response.cookies.set(cookie, token, {
        ...cookieOptions,
        expires: new Date(result.expiresAt)
      })
    if (route === "auth/logout")
      response.cookies.set(cookie, "", { ...cookieOptions, maxAge: 0 })
    return response
  } catch (error) {
    const response = NextResponse.json(
      error.payload || {
        error: error.message || "Exhibition service unavailable."
      },
      { status: error.status || 502, headers: { "Cache-Control": "no-store" } }
    )
    if (error.status === 401)
      response.cookies.set(cookie, "", { ...cookieOptions, maxAge: 0 })
    return response
  }
}
export const GET = handler
export const POST = handler
export const PATCH = handler
