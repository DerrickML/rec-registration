import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { hasTrustedRequestOrigin } from "../lib/request-origin"

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production")
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "")
})
afterEach(() => vi.unstubAllEnvs())
const request = (origin, url = "http://0.0.0.0:3000/api/example", headers = {}) => new Request(url, {
  method: "POST", headers: { ...(origin === undefined ? {} : { origin }), ...headers },
})

describe("REC production request origins", () => {
  it("accepts the public HTTPS origin regardless of internal proxy address", () => {
    for (const url of ["http://0.0.0.0:3000/api/example", "http://127.0.0.1:3002/api/example", "http://rec.nrep.ug/api/example", "https://rec.nrep.ug/api/example"]) {
      expect(hasTrustedRequestOrigin(request("https://rec.nrep.ug", url))).toBe(true)
    }
  })
  it("rejects foreign, sibling, malformed, downgraded and opaque origins", () => {
    for (const origin of ["https://evil.example", "https://hr.nrep.ug", "https://rec.nrep.ug.evil.example", "http://rec.nrep.ug", "https://rec.nrep.ug:8443", "https://user@rec.nrep.ug", "https://rec.nrep.ug/path", "https://rec.nrep.ug https://evil.example", "null", ""]) {
      expect(hasTrustedRequestOrigin(request(origin)), origin).toBe(false)
    }
  })
  it("does not trust caller-supplied Host or forwarded host/protocol values", () => {
    expect(hasTrustedRequestOrigin(request("https://evil.example", "https://evil.example/api/example", {
      host: "evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https", "sec-fetch-site": "same-origin",
    }))).toBe(false)
    expect(hasTrustedRequestOrigin(request("http://0.0.0.0:3000"))).toBe(false)
  })
  it("uses the configured external site URL and fails closed for invalid configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.example/")
    expect(hasTrustedRequestOrigin(request("https://preview.example"))).toBe(true)
    expect(hasTrustedRequestOrigin(request("https://rec.nrep.ug"))).toBe(false)
    for (const value of ["invalid", "javascript:alert(1)", "https://user:pass@rec.nrep.ug"]) {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", value)
      expect(hasTrustedRequestOrigin(request("https://rec.nrep.ug"))).toBe(false)
    }
  })
  it("requires explicit permission for missing origins and always rejects cross-site metadata", () => {
    expect(hasTrustedRequestOrigin(request())).toBe(false)
    expect(hasTrustedRequestOrigin(request(), { allowMissingOrigin: true })).toBe(true)
    expect(hasTrustedRequestOrigin(request("null"), { allowMissingOrigin: true })).toBe(false)
    for (const origin of [undefined, "https://rec.nrep.ug"]) {
      expect(hasTrustedRequestOrigin(request(origin, undefined, { "sec-fetch-site": "cross-site" }), { allowMissingOrigin: true })).toBe(false)
    }
  })
  it("preserves exact same-origin localhost requests in development only", () => {
    const local = request("http://localhost:3002", "http://localhost:3002/api/example")
    expect(hasTrustedRequestOrigin(local)).toBe(false)
    vi.stubEnv("NODE_ENV", "development")
    expect(hasTrustedRequestOrigin(local)).toBe(true)
    expect(hasTrustedRequestOrigin(request("http://localhost:3003", local.url))).toBe(false)
  })
})
