import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"
import { hasTrustedRequestOrigin } from "@/lib/request-origin"
export const runtime = "nodejs"
const cookie = "rec-visa-session"
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/visa",
}
const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
}
async function handler(request, context) {
  const { action } = await context.params
  if (
    !["request-otp", "verify-otp", "details", "complete"].includes(action) ||
    (request.method === "GET") !== (action === "details")
  )
    return NextResponse.json({ error: "Not found." }, { status: 404, headers })
  if (request.method !== "GET" && !hasTrustedRequestOrigin(request))
    return NextResponse.json(
      { error: "Cross-origin request rejected." },
      { status: 403, headers },
    )
  try {
    let body
    if (request.method !== "GET") {
      const reader = request.body?.getReader(),
        chunks = []
      let size = 0
      if (reader)
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > 16000) {
            await reader.cancel()
            return NextResponse.json(
              { error: "Request too large." },
              { status: 413, headers },
            )
          }
          chunks.push(value)
        }
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")
    }
    const jar = await cookies()
    const { token, ...result } = await fetchHrPortalJson(
      `/api/v1/rec/visa/${action}`,
      {
        method: request.method,
        body,
        bearerToken: jar.get(cookie)?.value,
        signal: AbortSignal.timeout(30000),
      },
    )
    const response = NextResponse.json(result, { headers })
    if (action === "verify-otp" && token)
      response.cookies.set(cookie, token, {
        ...cookieOptions,
        expires: new Date(result.expiresAt),
      })
    if (action === "complete")
      response.cookies.set(cookie, "", { ...cookieOptions, maxAge: 0 })
    return response
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof SyntaxError
            ? "Invalid request."
            : error.message ||
              "Unable to reach the conference team. Try again later.",
      },
      {
        status: error instanceof SyntaxError ? 400 : error.status || 502,
        headers,
      },
    )
  }
}
export const GET = handler
export const POST = handler
