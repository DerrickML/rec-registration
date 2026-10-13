import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const logoData = "data:image/png;base64,cGRmLWxvZ28="

describe("program PDF logos", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["pdf-logo"], { type: "image/png" })),
    }))
    vi.stubGlobal("FileReader", class {
      readAsDataURL() {
        this.result = logoData
        this.onloadend()
      }
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("loads the NREP logo from the trimmed public environment URL", async () => {
    const url = "https://example.org/brand/nrep.png?project=rec"
    vi.stubEnv("NEXT_PUBLIC_NREP_LOGO_URL", ` ${url} `)
    const { LOGO_CONFIG, loadLogos } = await import("../lib/logo-utils")

    expect(LOGO_CONFIG.nrep.path).toBe(url)
    expect(await loadLogos()).toEqual({ memd: logoData, nrep: logoData })
    expect(fetch.mock.calls.map(([path]) => path)).toEqual(["/MEMD.png", url])
  })

  it.each([undefined, "", "   "])("uses the bundled NREP logo when the variable is %s", async value => {
    vi.stubEnv("NEXT_PUBLIC_NREP_LOGO_URL", value)
    const { LOGO_CONFIG, loadLogos } = await import("../lib/logo-utils")

    expect(LOGO_CONFIG.nrep.path).toBe("/NREP.png")
    await loadLogos()
    expect(fetch).toHaveBeenLastCalledWith("/NREP.png")
  })

  it("does not embed an HTTP error response as an image or discard the MEMD logo", async () => {
    vi.stubEnv("NEXT_PUBLIC_NREP_LOGO_URL", "https://example.org/unavailable.png")
    const errorBlob = vi.fn()
    fetch.mockResolvedValueOnce({ ok: true, blob: vi.fn().mockResolvedValue(new Blob()) })
      .mockResolvedValueOnce({ ok: false, blob: errorBlob })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { loadLogos } = await import("../lib/logo-utils")

    expect(await loadLogos()).toEqual({ memd: logoData, nrep: null })
    expect(errorBlob).not.toHaveBeenCalled()
  })
})
