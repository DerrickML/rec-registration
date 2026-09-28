import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), cookies: vi.fn() }))
vi.mock("@/lib/hr-portal-api", () => ({ fetchHrPortalJson: mocks.fetch }))
vi.mock("next/headers", () => ({ cookies: mocks.cookies }))
import { POST, GET } from "../app/api/visa/[action]/route"
const context = (action) => ({ params: Promise.resolve({ action }) })
const request = (action, origin = "http://localhost:3007", body = {}) =>
  new Request(`http://localhost:3007/api/visa/${action}`, {
    method: "POST",
    headers: {
      origin,
      "Content-Type": "application/json",
      authorization: "Bearer forged",
    },
    body: JSON.stringify(body),
  })
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "")
  mocks.cookies.mockResolvedValue(
    new Map([["rec-visa-session", { value: "private-session" }]]),
  )
  mocks.fetch.mockResolvedValue({ success: true })
})
afterEach(() => vi.unstubAllEnvs())
describe("visa correction proxy", () => {
  it("allows the deployed origin behind an internal reverse proxy", async () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(
      (
        await POST(
          request("request-otp", "https://rec.nrep.ug"),
          context("request-otp"),
        )
      ).status,
    ).toBe(200)
  })
  it("rejects foreign/missing origins and unsupported routes", async () => {
    expect(
      (
        await POST(
          request("complete", "https://evil.example"),
          context("complete"),
        )
      ).status,
    ).toBe(403)
    const noOrigin = request("complete")
    noOrigin.headers.delete("origin")
    expect((await POST(noOrigin, context("complete"))).status).toBe(403)
    expect(
      (await POST(request("reminders"), context("reminders"))).status,
    ).toBe(404)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it("only forwards the HttpOnly session rather than caller-supplied credentials", async () => {
    await POST(request("complete"), context("complete"))
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/v1/rec/visa/complete",
      expect.objectContaining({ bearerToken: "private-session" }),
    )
  })
  it("hides verification tokens, sets a scoped cookie and clears it on completion", async () => {
    mocks.fetch.mockResolvedValue({
      token: "secret-token",
      expiresAt: "2030-01-01T00:00:00Z",
    })
    const result = await POST(request("verify-otp"), context("verify-otp"))
    expect((await result.json()).token).toBeUndefined()
    expect(result.headers.get("set-cookie")).toContain("HttpOnly")
    expect(result.headers.get("set-cookie")).toContain("SameSite=strict")
    expect(result.headers.get("set-cookie")).toContain("Path=/api/visa")
    expect(
      (await POST(request("complete"), context("complete"))).headers.get(
        "set-cookie",
      ),
    ).toContain("Max-Age=0")
  })
  it("bounds request sizes and only allows GET for details", async () => {
    expect(
      (
        await POST(
          request("complete", undefined, { value: "x".repeat(17000) }),
          context("complete"),
        )
      ).status,
    ).toBe(413)
    expect(
      (
        await GET(
          new Request("http://localhost:3007/api/visa/complete"),
          context("complete"),
        )
      ).status,
    ).toBe(404)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
})
