import { getNrepLogoUrl } from "@/lib/branding"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

export async function GET(request) {
  try {
    // Only server configuration chooses the source; request parameters are ignored.
    const url = new URL(getNrepLogoUrl())
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Invalid logo configuration")
    }
    const upstream = await fetch(url.href, {
      headers: { Accept: "image/png,image/jpeg,image/webp" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
    })
    const contentType = (upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()
    if (!upstream.ok || !IMAGE_TYPES.has(contentType) || !upstream.body) {
      await upstream.body?.cancel()
      throw new Error("Logo image is unavailable")
    }
    if (Number(upstream.headers.get("content-length")) > MAX_LOGO_BYTES) {
      await upstream.body.cancel()
      throw new Error("Logo image is too large")
    }
    const reader = upstream.body.getReader()
    const chunks = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_LOGO_BYTES) {
          await reader.cancel()
          throw new Error("Logo image is too large")
        }
        chunks.push(Buffer.from(value))
      }
    } finally {
      reader.releaseLock()
    }
    if (!size) throw new Error("Logo image is empty")
    return new Response(Buffer.concat(chunks, size), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return Response.json({ error: "Unable to load the configured NREP logo" }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    })
  }
}
