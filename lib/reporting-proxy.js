import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"
import { hasTrustedRequestOrigin } from "@/lib/request-origin"

const cookieName = "rec-rapporteur-session"
// Browsers cap persistent cookies at 400 days. Renew on authenticated use so
// reporting stays signed in without a fixed deadline from the original login.
const sessionCookieMaxAge = 400 * 24 * 60 * 60
const routes = {
  "auth/request-otp": ["GET", "POST"], "auth/verify-otp": ["POST"], "auth/logout": ["POST"],
  sessions: ["GET"], report: ["GET", "PUT"], "report/start": ["POST"], "report/submit": ["POST"],
  "report/history": ["GET"], "report/restore": ["POST"], comments: ["GET", "POST"],
}

export async function proxyReportingRequest(parts, request) {
  const method = request.method || "GET"
  if (method !== "GET" && !hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin reporting request rejected." }, { status: 403, headers: { "Cache-Control": "no-store" } })
  }
  const path = (parts || []).join("/")
  if (!Object.hasOwn(routes, path)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } })
  }
  if (!routes[path].includes(method)) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: routes[path].join(", "), "Cache-Control": "no-store" } })
  }
  const url = new URL(request.url)
  const query = url.searchParams.toString()
  const hrPath = `/api/v1/rec/rapporteur/${path}${query ? `?${query}` : ""}`
  const jar = await cookies()
  const sessionToken = jar.get(cookieName)?.value
  const isAuthenticatedRoute = !path.startsWith("auth/")
  try {
    const body = method === "GET" ? undefined : await readReportingBody(request)
    const payload = await fetchHrPortalJson(hrPath, {
      method,
      body,
      bearerToken: sessionToken,
      clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: request.headers.get("user-agent") || "",
      signal: AbortSignal.timeout(60000),
    })
    const { token, ...safe } = payload || {}
    const response = NextResponse.json(safe || { success: true }, { headers: { "Cache-Control": "no-store" } })
    const persistentToken = path === "auth/verify-otp" ? token : isAuthenticatedRoute ? sessionToken : undefined
    if (persistentToken) {
      response.cookies.set(cookieName, persistentToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/reporting",
        maxAge: sessionCookieMaxAge,
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
    if (error.status === 401 && isAuthenticatedRoute) {
      response.cookies.set(cookieName, "", { path: "/api/reporting", maxAge: 0, httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" })
    }
    return response
  }
}

async function readReportingBody(request) {
  const maximum = 3 * 1024 * 1024
  if (Number(request.headers.get("content-length")) > maximum) throw Object.assign(new Error("This reporting request is too large."), { status: 413 })
  const reader = request.body?.getReader(), chunks=[]
  let size=0
  if(reader)try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw Object.assign(new Error("This reporting request is too large."),{status:413})}chunks.push(value)}}finally{reader.releaseLock()}
  try{const value=JSON.parse(Buffer.concat(chunks).toString("utf8"));if(!value||typeof value!=="object"||Array.isArray(value))throw Error();return value}catch{throw Object.assign(new Error("Provide a valid JSON object."),{status:400})}
}
