import { NextResponse } from "next/server"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"
import { excursionSource } from "@/lib/excursions"
export async function POST(request, { params }) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) return new NextResponse(null, { status: 403 })
  try {
    const reader = request.body?.getReader()
    if (!reader) return new NextResponse(null, { status: 400 })
    let size = 0
    let text = ""
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 512) { await reader.cancel(); return new NextResponse(null, { status: 413 }) }
      text += decoder.decode(value, { stream: true })
    }
    let body
    try { body = JSON.parse(text + decoder.decode()) } catch { return new NextResponse(null, { status: 400 }) }
    if (!["view", "outbound"].includes(body?.kind)) return new NextResponse(null, { status: 400 })
    await fetchHrPortalJson(`/api/v1/rec/excursions/${encodeURIComponent((await params).slug)}/events`, {
      method: "POST", body: { kind: body.kind, source: excursionSource(body.source) }, signal: AbortSignal.timeout(5000),
      clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown",
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) { return NextResponse.json({ error: "Engagement event could not be recorded." }, { status: error.status === 429 ? 429 : 503 }) }
}
