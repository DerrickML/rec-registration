import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock("@/lib/hr-portal-api", () => ({ fetchHrPortalJson: mocks.fetch }))
import { POST } from "../app/api/excursions/[slug]/events/route"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NODE_ENV", "production")
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "")
  mocks.fetch.mockResolvedValue({ success: true })
})
afterEach(() => vi.unstubAllEnvs())
const invoke = (origin) => POST(new Request("http://0.0.0.0:3000/api/excursions/rec26/events", {
  method: "POST", headers: { origin, "Content-Type": "application/json" },
  body: JSON.stringify({ kind: "outbound", source: "home" }),
}), { params: Promise.resolve({ slug: "rec26" }) })

describe("excursion tracking behind a production proxy", () => {
  it("accepts the REC browser origin and forwards a validated event", async () => {
    expect((await invoke("https://rec.nrep.ug")).status).toBe(204)
    expect(mocks.fetch).toHaveBeenCalledWith("/api/v1/rec/excursions/rec26/events", expect.objectContaining({ body: { kind: "outbound", source: "home" } }))
  })
  it("rejects other origins before recording events", async () => {
    expect((await invoke("https://evil.example")).status).toBe(403)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
})
