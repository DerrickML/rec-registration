import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), cookies: vi.fn() }))
vi.mock("@/lib/hr-portal-api", () => ({ fetchHrPortalJson: mocks.fetch }))
vi.mock("next/headers", () => ({ cookies: mocks.cookies }))
import { proxyScannerRequest, scannerDevEnabled } from "../lib/scanner-proxy"

const request = (origin = "http://localhost:3002", path = "scans") => new Request(`http://localhost:3002/api/scanner/${path}`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Authorization: "Bearer forged" }, body: JSON.stringify({ eventId: "event", qrPayload: "badge" }) })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.cookies.mockResolvedValue(new Map([["rec-scanner-session", { value: "http-only-secret" }]]))
  mocks.fetch.mockResolvedValue({ status: "accepted" })
})
afterEach(() => vi.unstubAllEnvs())

describe("scanner browser proxy", () => {
  it("rejects cross-origin mutations before contacting HR", async () => {
    const response = await proxyScannerRequest("/scans", request("https://other.example"), { method: "POST" })
    expect(response.status).toBe(403)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it("forwards the HttpOnly session, not a client-supplied authorization header", async () => {
    await proxyScannerRequest("/scans", request(), { method: "POST" })
    expect(mocks.fetch).toHaveBeenCalledWith("/scans", expect.objectContaining({ bearerToken: "http-only-secret" }))
  })
  it("sets a secure cookie on login and never returns the session token to JavaScript", async () => {
    vi.stubEnv("NODE_ENV", "production")
    mocks.fetch.mockResolvedValue({ token: "secret-token", expiresAt: "2030-01-01T00:00:00Z", operator: { name: "Scanner" } })
    const response = await proxyScannerRequest("/auth/verify-otp", request(), { method: "POST", login: true })
    expect((await response.json()).token).toBeUndefined()
    const cookie = response.headers.get("set-cookie")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Secure")
    expect(cookie).toContain("SameSite=strict")
    expect(cookie).toContain("Path=/api/scanner")
  })
  it("clears invalid sessions and preserves the server error", async () => {
    mocks.fetch.mockRejectedValue(Object.assign(new Error("expired"), { status: 401, payload: { error: "Scanner access expired" } }))
    const response = await proxyScannerRequest("/auth/me", request())
    expect(response.status).toBe(401)
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
    expect((await response.json()).error).toBe("Scanner access expired")
  })
  it("disables development login in production even when configured", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("REC_SCANNER_DEV_LOGIN_ENABLED", "true")
    vi.stubEnv("REC_SCANNER_DEV_LOGIN_SECRET", "a".repeat(40))
    vi.stubEnv("HR_PORTAL_BASE_URL", "http://localhost:3000")
    expect(scannerDevEnabled(request())).toBe(false)
    const response = await proxyScannerRequest("/auth/dev-login", request(), { method: "POST", development: true })
    expect(response.status).toBe(404)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it("requires both local services and the development flag", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("REC_SCANNER_DEV_LOGIN_ENABLED", "true")
    vi.stubEnv("REC_SCANNER_DEV_LOGIN_SECRET", "a".repeat(40))
    vi.stubEnv("HR_PORTAL_BASE_URL", "http://localhost:3000")
    expect(scannerDevEnabled(request())).toBe(true)
    vi.stubEnv("HR_PORTAL_BASE_URL", "https://hr.nrep.ug")
    expect(scannerDevEnabled(request())).toBe(false)
  })
})
