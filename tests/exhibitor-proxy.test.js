import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), cookies: vi.fn() }))
vi.mock("@/lib/hr-portal-api", () => ({ fetchHrPortalJson: mocks.fetch }))
vi.mock("next/headers", () => ({ cookies: mocks.cookies }))
import { POST, GET } from "../app/api/exhibitors/[...path]/route"
const request = (path, origin = "http://localhost:3007") => new Request(`http://localhost:3007/api/exhibitors/${path}`, { method: "POST", headers: { origin, "Content-Type": "application/json", authorization: "Bearer forged" }, body: "{}" })
const context = path => ({ params: Promise.resolve({ path: path.split("/") }) })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.cookies.mockResolvedValue(new Map([["rec-exhibitor-session", { value: "private-cookie-token" }]]))
  mocks.fetch.mockResolvedValue({ success: true })
})
describe("exhibitor browser proxy", () => {
  it("rejects foreign origins before forwarding", async () => {
    expect((await POST(request("applications", "https://other.example"), context("applications"))).status).toBe(403)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it("uses the HttpOnly cookie rather than a forged bearer header", async () => {
    await POST(request("applications"), context("applications"))
    expect(mocks.fetch).toHaveBeenCalledWith("/api/v1/rec/exhibitors/applications", expect.objectContaining({ bearerToken: "private-cookie-token" }))
  })
  it("hides OTP session tokens and restricts the cookie path", async () => {
    mocks.fetch.mockResolvedValue({ token: "secret", expiresAt: "2030-01-01T00:00:00Z" })
    const response = await POST(request("auth/verify-otp"), context("auth/verify-otp"))
    expect((await response.json()).token).toBeUndefined()
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict")
    expect(response.headers.get("set-cookie")).toContain("Path=/api/exhibitors")
  })
  it("clears an expired session and returns field errors unchanged", async () => {
    mocks.fetch.mockRejectedValue(Object.assign(new Error("Expired"), { status: 401, payload: { error: "Expired" } }))
    const response = await GET(new Request("http://localhost:3007/api/exhibitors/auth/me"), context("auth/me"))
    expect(response.status).toBe(401)
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
    mocks.fetch.mockRejectedValue(Object.assign(new Error("Invalid"), { status: 400, payload: { error: "Invalid", fields: { companyName: "Required" } } }))
    const invalid = await POST(request("applications"), context("applications"))
    expect((await invalid.json()).fields.companyName).toBe("Required")
  })
})
