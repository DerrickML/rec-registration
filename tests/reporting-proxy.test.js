import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), cookies: vi.fn() }))
vi.mock("@/lib/hr-portal-api", () => ({ fetchHrPortalJson: mocks.fetch }))
vi.mock("next/headers", () => ({ cookies: mocks.cookies }))
import { proxyReportingRequest } from "../lib/reporting-proxy"

function request(path, method = "GET", origin = "http://localhost:3002") {
  return new Request(`http://localhost:3002/api/reporting/${path}`, {
    method, headers: { Origin: origin, "Content-Type": "application/json", Authorization: "Bearer forged" },
    ...(method === "GET" ? {} : { body: JSON.stringify({ sessionKey: "session:test" }) }),
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://rec.nrep.ug")
  mocks.cookies.mockResolvedValue(new Map([["rec-rapporteur-session", { value: "owned-session" }]]))
  mocks.fetch.mockResolvedValue({ success: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe("rapporteur reporting integration", () => {
  it("rejects cross-origin changes and unknown routes before contacting HR", async () => {
    expect((await proxyReportingRequest(["report"], request("report", "PUT", "https://other.test"))).status).toBe(403)
    expect((await proxyReportingRequest(["auth", "unexpected"], request("auth/unexpected"))).status).toBe(404)
    expect((await proxyReportingRequest(["auth", "..", "..", "private"], request("private"))).status).toBe(404)
    expect((await proxyReportingRequest(["report", "submit"], request("report/submit"))).status).toBe(405)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it("derives authorization from the scoped HttpOnly session, never the browser header", async () => {
    const response = await proxyReportingRequest(["report"], request("report", "PUT"))
    expect(response.status).toBe(200)
    expect(mocks.fetch).toHaveBeenCalledWith("/api/v1/rec/rapporteur/report", expect.objectContaining({ bearerToken: "owned-session", method: "PUT" }))
    expect(response.headers.get("cache-control")).toBe("no-store")
  })
  it.each([null, undefined, "2026-10-20T00:00:00Z"])("persists verified sessions independently of upstream expiry (%s) and keeps tokens private", async (expiresAt) => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-19T12:00:00Z"))
    vi.stubEnv("NODE_ENV", "production")
    mocks.fetch.mockResolvedValue({ token: "private-token", expiresAt, name: "Example" })
    const response = await proxyReportingRequest(["auth", "verify-otp"], request("auth/verify-otp", "POST", "https://rec.nrep.ug"))
    expect((await response.json()).token).toBeUndefined()
    const cookie = response.cookies.get("rec-rapporteur-session")
    expect(cookie.value).toBe("private-token")
    expect(cookie.maxAge).toBe(400 * 24 * 60 * 60)
    expect(cookie.expires.getTime()).toBe(Date.now() + 400 * 24 * 60 * 60 * 1000)
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("set-cookie")).toContain("Secure")
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict")
    expect(response.headers.get("set-cookie")).toContain("Path=/api/reporting")
  })
  it.each([
    ["sessions", "GET"], ["report", "GET"], ["report", "PUT"],
    ["report/submit", "POST"], ["comments", "GET"], ["comments", "POST"],
  ])("renews the existing cookie after successful %s %s requests beyond the old 12-hour cutoff", async (path, method) => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-19T12:00:00Z"))
    const first = await proxyReportingRequest(path.split("/"), request(path, method))
    const firstExpiry = first.cookies.get("rec-rapporteur-session").expires.getTime()
    vi.setSystemTime(new Date("2026-10-21T12:00:00Z"))
    const later = await proxyReportingRequest(path.split("/"), request(path, method))
    expect(later.status).toBe(200)
    const cookie = later.cookies.get("rec-rapporteur-session")
    expect(cookie.value).toBe("owned-session")
    expect(cookie.expires.getTime() - firstExpiry).toBe(2 * 24 * 60 * 60 * 1000)
  })
  it("never creates a reporting cookie from an untrusted browser bearer header", async () => {
    mocks.cookies.mockResolvedValue(new Map())
    const response = await proxyReportingRequest(["sessions"], request("sessions"))
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(mocks.fetch).toHaveBeenCalledWith("/api/v1/rec/rapporteur/sessions", expect.objectContaining({ bearerToken: undefined }))
  })
  it.each([403, 502])("does not renew the session on an upstream %s error", async (status) => {
    mocks.fetch.mockRejectedValueOnce(Object.assign(new Error("Unavailable"), { status }))
    const response = await proxyReportingRequest(["sessions"], request("sessions"))
    expect(response.status).toBe(status)
    expect(response.headers.get("set-cookie")).toBeNull()
  })
  it.each(["request-otp", "verify-otp"])("keeps an existing session when a separate %s attempt fails", async (action) => {
    mocks.fetch.mockRejectedValueOnce(Object.assign(new Error("Invalid OTP"), { status: 401 }))
    const response = await proxyReportingRequest(["auth", action], request(`auth/${action}`, "POST"))
    expect(response.status).toBe(401)
    expect(response.headers.get("set-cookie")).toBeNull()
  })
  it("does not renew a session when requesting another login code", async () => {
    const response = await proxyReportingRequest(["auth", "request-otp"], request("auth/request-otp", "POST"))
    expect(response.headers.get("set-cookie")).toBeNull()
  })
  it("clears rejected and logged-out sessions and preserves server errors", async () => {
    mocks.fetch.mockRejectedValueOnce(Object.assign(new Error("Revoked"), { status: 401, payload: { error: "Session revoked" } }))
    const revoked = await proxyReportingRequest(["sessions"], request("sessions"))
    expect(revoked.status).toBe(401)
    expect((await revoked.json()).error).toBe("Session revoked")
    expect(revoked.headers.get("set-cookie")).toContain("Max-Age=0")
    const loggedOut = await proxyReportingRequest(["auth", "logout"], request("auth/logout", "POST"))
    expect(loggedOut.headers.get("set-cookie")).toContain("Max-Age=0")
  })
})
