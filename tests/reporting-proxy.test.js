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
afterEach(() => vi.unstubAllEnvs())

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
  it("keeps production sessions secure and removes the token from the JSON response", async () => {
    vi.stubEnv("NODE_ENV", "production")
    mocks.fetch.mockResolvedValue({ token: "private-token", expiresAt: "2030-01-01T00:00:00Z", name: "Example" })
    const response = await proxyReportingRequest(["auth", "verify-otp"], request("auth/verify-otp", "POST", "https://rec.nrep.ug"))
    expect((await response.json()).token).toBeUndefined()
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("set-cookie")).toContain("Secure")
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict")
    expect(response.headers.get("set-cookie")).toContain("Path=/api/reporting")
  })
  it("clears expired and logged-out sessions and preserves server errors", async () => {
    mocks.fetch.mockRejectedValueOnce(Object.assign(new Error("Expired"), { status: 401, payload: { error: "Session expired" } }))
    const expired = await proxyReportingRequest(["sessions"], request("sessions"))
    expect(expired.status).toBe(401)
    expect((await expired.json()).error).toBe("Session expired")
    expect(expired.headers.get("set-cookie")).toContain("Max-Age=0")
    const loggedOut = await proxyReportingRequest(["auth", "logout"], request("auth/logout", "POST"))
    expect(loggedOut.headers.get("set-cookie")).toContain("Max-Age=0")
  })
})
