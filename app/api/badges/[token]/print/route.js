import { fetchHrPortalBinary } from "@/lib/hr-portal-api"

export const runtime = "nodejs"
export const maxDuration = 120

export async function GET(request, { params }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, noarchive" }
  try {
    const { token } = await params
    const query = new URL(request.url).searchParams
    const format = query.get("format") || "png", bleed = query.get("bleed") || "false"
    if (!/^[A-Za-z0-9_-]{16,512}$/.test(token) || !["png", "pdf"].includes(format) || !["true", "false"].includes(bleed)) {
      return Response.json({ error: "Invalid badge print options." }, { status: 400, headers })
    }
    const options = new URLSearchParams({ format, bleed, download: query.get("download") === "1" ? "1" : "0" })
    const response = await fetchHrPortalBinary(`/api/v1/rec/badges/${encodeURIComponent(token)}/print?${options}`, { signal: request.signal })
    if (!response.ok) {
      await response.body?.cancel()
      return Response.json({ error: response.status === 404 ? "This badge is no longer available." : "Unable to prepare this badge. Please retry or contact the conference team." }, { status: response.status, headers })
    }
    if (response.headers.get("content-type")?.split(";")[0] !== (format === "pdf" ? "application/pdf" : "image/png")) {
      await response.body?.cancel()
      throw new Error("Unexpected badge response")
    }
    return new Response(response.body, { headers: { ...headers, "Content-Type": response.headers.get("content-type"), "Content-Disposition": response.headers.get("content-disposition") || "inline" } })
  } catch {
    return Response.json({ error: "Badge downloads are temporarily unavailable. Please retry." }, { status: 502, headers })
  }
}
