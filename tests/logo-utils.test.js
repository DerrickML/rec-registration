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

  it("loads the configured NREP logo through the same-origin endpoint", async () => {
    const { LOGO_CONFIG, loadLogos } = await import("../lib/logo-utils")

    expect(LOGO_CONFIG.nrep.path).toBe("/api/program/logo")
    expect(await loadLogos()).toEqual({ memd: logoData, nrep: logoData })
    expect(fetch.mock.calls.map(([path]) => path)).toEqual(["/MEMD.png", "/api/program/logo"])
  })

  it("uses the bundled NREP image if the configured image is unavailable", async () => {
    const errorBlob = vi.fn()
    fetch.mockResolvedValueOnce({ ok: true, blob: vi.fn().mockResolvedValue(new Blob()) })
      .mockResolvedValueOnce({ ok: false, blob: errorBlob })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { loadLogos } = await import("../lib/logo-utils")

    expect(await loadLogos()).toEqual({ memd: logoData, nrep: logoData })
    expect(fetch).toHaveBeenLastCalledWith("/nrep-logo.png")
    expect(errorBlob).not.toHaveBeenCalled()
  })

  it("falls back after a network error", async () => {
    fetch.mockImplementation(async path => {
      if (path === "/api/program/logo") throw new TypeError("Failed to fetch")
      return { ok: true, blob: async () => new Blob() }
    })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { loadLogos } = await import("../lib/logo-utils")

    expect(await loadLogos()).toEqual({ memd: logoData, nrep: logoData })
    expect(fetch).toHaveBeenLastCalledWith("/nrep-logo.png")
  })

  it("handles FileReader errors so a broken logo cannot stop PDF generation", async () => {
    vi.stubGlobal("FileReader", class {
      readAsDataURL() { this.onerror(new Error("Failed to read image")) }
    })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { loadLogos } = await import("../lib/logo-utils")

    expect(await loadLogos()).toEqual({ memd: null, nrep: null })
  })
})
