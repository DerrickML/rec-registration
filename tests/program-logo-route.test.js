import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "../app/api/program/logo/route"

const logoUrl = "https://appwrite.example.org/v1/storage/logo/view?project=rec"
const image = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const request = () => new Request("https://rec.nrep.ug/api/program/logo?url=https://untrusted.example/image")

describe("program logo endpoint", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_NREP_LOGO_URL", ` ${logoUrl} `)
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(image, {
      headers: { "Content-Type": "image/png" },
    })))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("returns the configured image without accepting a browser-supplied source or forwarding credentials", async () => {
    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(image)
    expect(response.headers.get("content-type")).toBe("image/png")
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(fetch).toHaveBeenCalledWith(logoUrl, expect.objectContaining({
      redirect: "error",
      cache: "no-store",
      headers: { Accept: "image/png,image/jpeg,image/webp" },
    }))
  })

  it.each([undefined, "", "   ", "http://example.org/logo.png", "https://user:secret@example.org/logo.png"])("rejects invalid configuration %s", async value => {
    vi.stubEnv("NEXT_PUBLIC_NREP_LOGO_URL", value)

    expect((await GET(request())).status).toBe(502)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each(["text/html", "application/json", "image/svg+xml"])("rejects non-raster responses with type %s", async contentType => {
    fetch.mockResolvedValue(new Response("not an image", { headers: { "Content-Type": contentType } }))
    const response = await GET(request())

    expect(response.status).toBe(502)
    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  it("rejects oversized responses without relying on Content-Length", async () => {
    fetch.mockResolvedValue(new Response(new Uint8Array(2 * 1024 * 1024 + 1), {
      headers: { "Content-Type": "image/png" },
    }))

    expect((await GET(request())).status).toBe(502)
  })

  it("returns a generic error when the source is unavailable or times out", async () => {
    fetch.mockRejectedValue(new Error("Upstream secret configuration details"))
    const response = await GET(request())

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "Unable to load the configured NREP logo" })
  })
})
