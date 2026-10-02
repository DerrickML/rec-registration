import { beforeEach, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
const mocks = vi.hoisted(() => ({ binary: vi.fn(), json: vi.fn(), configuration: null }))
vi.mock("@/lib/hr-portal-api", () => ({ fetchHrPortalBinary: mocks.binary, fetchHrPortalJson: mocks.json }))
vi.mock("@/components/mobile-apps/mobile-app-provider", () => ({ useMobileApps: () => mocks.configuration, useAppConfiguration: () => ({ configuration: mocks.configuration, loading: false, error: "", retry: vi.fn() }) }))
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("conferenceId=c") }))
vi.mock("@/components/layout/navbar", () => ({ default: () => null }))
vi.mock("@/components/layout/footer", () => ({ default: () => null }))
import { GET, HEAD } from "../app/api/mobile-apps/[[...path]]/route"
import { availableAppPlatforms, apkReleaseDetails, safeAppStoreRedirect, appPageUrl } from "../lib/mobile-apps"
import MobileAppCta, { AppDownloadButtons, FooterApps } from "../components/mobile-apps/mobile-app-cta"
import MobileAppPage from "../components/mobile-apps/mobile-app-page"
import { createRegistrationMailer } from "../lib/registration-mailer"

const configuration = { enabled: true, conferenceId: "c", content: { appName: "REC & EXPO", ctaTitle: "Take REC with you", ctaDescription: "Official REC app", placements: ["home", "footer"] }, platforms: [{ platform: "android", available: true, source: "apk" }, { platform: "ios", available: true, source: "app_store" }] }
const call = (path = [], query = "conferenceId=c", method = "GET", headers = {}) => (method === "HEAD" ? HEAD : GET)(new Request(`http://localhost/api/mobile-apps?${query}`, { method, headers }), { params: Promise.resolve({ path }) })
beforeEach(() => { vi.clearAllMocks(); mocks.configuration = configuration })

it("fetches only public configuration with whitelisted parameters and no cache", async () => {
  mocks.json.mockResolvedValue(configuration)
  const response = await call([], "conferenceId=c&userId=forged")
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store")
  expect(mocks.json.mock.calls[0][0]).toBe("/api/v1/rec/apps?conferenceId=c")
  expect((await call([], "conferenceId=../../../secret")).status).toBe(400)
})
it("handles store redirects without fetching third-party store HTML", async () => {
  mocks.binary.mockResolvedValue(new Response(null, { status: 307, headers: { Location: "https://play.google.com/store/apps/details?id=ug.nrep.rec" } }))
  const response = await call(["android"])
  expect(response.status).toBe(307); expect(response.headers.get("location")).toContain("play.google.com")
  expect(mocks.binary.mock.calls[0][1].redirect).toBe("manual")
  mocks.binary.mockResolvedValue(new Response(null, { status: 307, headers: { Location: "https://evil.test/payload.apk" } }))
  expect((await call(["android"])).status).toBe(502)
})
it("streams APK downloads and byte ranges, without passing private headers or forged parameters", async () => {
  mocks.binary.mockResolvedValue(new Response("APK!", { status: 206, headers: { "Content-Type": "application/vnd.android.package-archive", "Content-Range": "bytes 0-3/100", "Content-Disposition": 'attachment; filename="REC-12.apk"', "X-REC-APK-SHA256": "a".repeat(64), "X-Appwrite-Key": "private" } }))
  const response = await call(["android"], "conferenceId=c&fileId=forged", "GET", { Range: "bytes=0-3" })
  expect(response.status).toBe(206); expect(await response.text()).toBe("APK!"); expect(response.headers.has("x-appwrite-key")).toBe(false)
  expect(response.headers.get("content-disposition")).toContain("REC-12.apk")
  expect(mocks.binary.mock.calls[0][0]).toBe("/api/v1/rec/apps/android?conferenceId=c")
  expect(mocks.binary.mock.calls[0][1].headers).toEqual({ Range: "bytes=0-3" })
})
it("blocks unexpected HTML, invalid ranges, private diagnostics, and withdrawn downloads", async () => {
  mocks.binary.mockResolvedValue(new Response("<html>login</html>", { headers: { "Content-Type": "text/html" } }))
  expect((await call(["android"])).status).toBe(502)
  expect((await call(["android"], "", "GET", { Range: "bytes=0-1,8-9" })).status).toBe(416)
  mocks.binary.mockResolvedValue(new Response("private diagnostic", { status: 404 }))
  const response = await call(["android"]); expect(response.status).toBe(404); expect(await response.text()).not.toContain("private")
})
it("preserves release ID filenames without requiring a version code or checksum", async () => {
  mocks.binary.mockResolvedValue(new Response("APK!", { headers: { "Content-Type": "application/vnd.android.package-archive", "Content-Disposition": 'attachment; filename="REC-release-123.apk"' } }))
  const response = await call(["android"])
  expect(response.status).toBe(200); expect(response.headers.get("content-disposition")).toContain("REC-release-123.apk")
  expect(response.headers.has("x-rec-apk-sha256")).toBe(false); expect(await response.text()).toBe("APK!")
})
it("omits unavailable APK metadata and preserves legacy release details", () => {
  const release = { size: 30_000_000, publishedAt: "2026-10-01T22:00:00Z", versionName: "1.2.0" }
  expect(apkReleaseDetails(release)).toEqual([["Version", "1.2.0"], ["File size", "30.0 MB"], ["Published", "2 Oct 2026 (EAT)"]])
  const details = apkReleaseDetails({ ...release, versionCode: 12, minSdk: 26, sha256: "a".repeat(64) })
  expect(details).toContainEqual(["Version", "1.2.0 (code 12)"]); expect(details).toContainEqual(["Minimum Android API", "26"])
  expect(details).toContainEqual(["SHA-256 checksum", "a".repeat(64)])
  expect(apkReleaseDetails({ size: null, publishedAt: "invalid", sha256: "unverified" })).toEqual([])
})
it("renders staff-published APKs without blank checksum rows or null version codes", () => {
  mocks.configuration = { ...configuration, conference: { title: "REC26" }, platforms: [{ platform: "android", available: true, source: "apk", size: 30_000_000, publishedAt: "2026-10-01T10:00:00Z", versionName: "1.2.0" }] }
  const html = renderToStaticMarkup(createElement(MobileAppPage))
  expect(html).toContain("Download APK"); expect(html).toContain("1.2.0"); expect(html).toContain("30.0 MB")
  expect(html).not.toMatch(/SHA-256 checksum|Minimum Android API|undefined|code null/)
})
it("uses HEAD without buffering a large APK", async () => {
  mocks.binary.mockResolvedValue(new Response(null, { headers: { "Content-Type": "application/vnd.android.package-archive", "Content-Length": "300000000" } }))
  const response = await call(["android"], "conferenceId=c", "HEAD")
  expect(mocks.binary.mock.calls[0][1].method).toBe("HEAD"); expect(await response.text()).toBe(""); expect(response.headers.get("content-length")).toBe("300000000")
})
it("does not expose disabled or expired beta downloads and validates store domains", () => {
  expect(availableAppPlatforms({ ...configuration, enabled: false })).toEqual([])
  expect(availableAppPlatforms({ ...configuration, platforms: [{ platform: "ios", available: true, source: "testflight", expiresAt: "2020-01-01" }] })).toEqual([])
  expect(safeAppStoreRedirect("https://testflight.apple.com/join/abcd1234", "ios")).toBe(true)
  expect(safeAppStoreRedirect("https://user:pass@play.google.com/store/apps/details?id=ug.nrep.rec", "android")).toBe(false)
  expect(safeAppStoreRedirect("https://apps.apple.com.evil.test/app/id123", "ios")).toBe(false)
  expect(appPageUrl("c", "footer")).toBe("/app?conferenceId=c&source=footer")
})
it("promotes only configured placements and generates same-origin platform links", () => {
  expect(renderToStaticMarkup(createElement(MobileAppCta, { placement: "about" }))).toBe("")
  expect(renderToStaticMarkup(createElement(MobileAppCta, { placement: "home" }))).toContain("/app?conferenceId=c&amp;source=home")
  const html = renderToStaticMarkup(createElement(AppDownloadButtons, { configuration }))
  expect(html).toContain("Download APK"); expect(html).toContain("App Store"); expect(html).toContain("/api/mobile-apps/android?conferenceId=c")
  expect(renderToStaticMarkup(createElement(FooterApps))).toContain("App details &amp; downloads")
  expect(renderToStaticMarkup(createElement(MobileAppCta, { placement: "home", configuration: null }))).toBe("")
  expect(renderToStaticMarkup(createElement(FooterApps, { configuration: null }))).toBe("")
  mocks.configuration = { ...configuration, enabled: false }; expect(renderToStaticMarkup(createElement(FooterApps))).toBe("")
})
it("inserts configured app promotion into registration emails without altering calendar data", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}")); vi.stubGlobal("fetch", fetch)
  const blocks = vi.fn().mockResolvedValue({ html: '<p><a href="https://rec.nrep.ug/app?conferenceId=c">REC app</a></p>', text: "REC app" })
  const mailer = createRegistrationMailer({ emailApiUrl: "https://email.test/send", getAppEmailBlock: blocks })
  await mailer.sendConfirmation({ email: "test@example.test", firstName: "Test", eventStart: "start", eventEnd: "end" }, 2026, { $id: "c" })
  expect(blocks).toHaveBeenCalledWith({ $id: "c" }, "registration")
  const payload = JSON.parse(fetch.mock.calls[0][1].body)
  expect(payload.text).toContain("REC app</a>"); expect(payload.eventStart).toBe("start"); expect(payload.eventEnd).toBe("end")
  vi.unstubAllGlobals()
})

it("optional OTP promotion preserves codes, expiry and literal template content", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}")); vi.stubGlobal("fetch", fetch)
  try {
    const blocks = vi.fn().mockResolvedValue({ html: "<p>$& REC app download</p>", text: "REC app download" })
    const mailer = createRegistrationMailer({ emailApiUrl: "https://email.test/send", getAppEmailBlock: blocks })
    await mailer.sendOtp("test@example.test", "123456", 10, { $id: "c" })
    expect(blocks).toHaveBeenCalledWith({ $id: "c" }, "otp")
    const payload = JSON.parse(fetch.mock.calls[0][1].body)
    expect(payload.otp).toBe("123456"); expect(payload.text).toContain("10 minutes")
    expect(payload.text).toContain("<p>$& REC app download</p>")
  } finally { vi.unstubAllGlobals() }
})
