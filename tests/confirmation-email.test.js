import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildConfirmationEmail, buildOtpEmail } from "../lib/confirmation-email"
import { createRegistrationMailer } from "../lib/registration-mailer"

const registrant = {
  firstName: "Sample", lastName: "Attendee", email: "attendee@example.test",
  organization: "Sample Organisation", registrationType: "Attendee",
  conferenceYears: [2026], daysAttending: ["Day 1"], sector: ["Private"],
  eventStart: "2026-10-19T05:00:00Z", eventEnd: "2026-10-19T15:00:00Z",
}
const links = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]).filter((href) => !href.startsWith("mailto:"))

beforeEach(() => {
  for (const key of ["NEXT_PUBLIC_SITE_URL", "SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"]) vi.stubEnv(key, "")
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe("registration confirmation links", () => {
  it("includes the public registration button, fallback URL, and verification guidance", () => {
    const html = buildConfirmationEmail(registrant, 2026)
    expect(links(html)).toEqual(["https://rec.nrep.ug/register", "https://rec.nrep.ug/register"])
    expect(html).toContain("View or edit registration")
    expect(html).toContain("one-time verification code")
    expect(html).toContain("Updates are available while public registration is open")
    for (const link of links(html)) expect(new URL(link).search).toBe("")
  })

  it("uses the configured site origin without leaking unrelated query parameters", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://conference.example.test/old/?email=private#old")
    expect(links(buildConfirmationEmail(registrant, 2026))).toEqual([
      "https://conference.example.test/register", "https://conference.example.test/register",
    ])
  })

  it("uses the existing site URL fallback configuration", () => {
    vi.stubEnv("SITE_URL", "https://conference.example.test/")
    expect(links(buildConfirmationEmail(registrant))[0]).toBe("https://conference.example.test/register")
  })

  it.each(["javascript:alert(1)", "https://user:password@example.test", "https://"])("uses a safe default for an invalid site URL: %s", (value) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value)
    expect(links(buildConfirmationEmail(registrant))).toEqual(["https://rec.nrep.ug/register", "https://rec.nrep.ug/register"])
  })

  it("keeps attendee details escaped and does not put them in the edit URL", () => {
    const html = buildConfirmationEmail({ ...registrant, firstName: '<img src=x onerror="alert(1)">', organization: "Partner & Co" }, 2026)
    expect(html).not.toContain("<img src=x")
    expect(html).toContain("Partner &amp; Co")
    for (const link of links(html)) expect(link).not.toContain(registrant.email)
  })

  it("sends the link in confirmation emails without altering the delivery or calendar payload", async () => {
    const send = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    vi.stubGlobal("fetch", send)
    const mailer = createRegistrationMailer({ emailApiUrl: "https://email.example.test/confirmation" })
    await mailer.sendConfirmation(registrant, 2026, { title: "REC test conference", venue: "Test conference centre", contactEmail: "help@example.test" })
    expect(send).toHaveBeenCalledTimes(1)
    const [url, options] = send.mock.calls[0]
    expect(url).toBe("https://email.example.test/confirmation")
    const payload = JSON.parse(options.body)
    expect(payload).toMatchObject({ email: registrant.email, year: 2026, eventStart: registrant.eventStart, eventEnd: registrant.eventEnd, template: "registration-confirmation" })
    expect(payload.text).toContain('href="https://rec.nrep.ug/register"')
    expect(payload.subject).toBe("REC 2026 & EXPO: Registration confirmed")
    expect(payload.text).toContain("REC test conference")
    expect(payload.text).toContain("Test conference centre")
    expect(payload.text).toContain("help@example.test")
  })

  it("does not add confirmation actions to verification-code emails", () => {
    const html = buildOtpEmail({ otp: "123456", minutes: 10 })
    expect(html).toContain("123456")
    expect(html).not.toContain("View or edit registration")
  })

  it("uses the current NREP and ministry logos and self-registration copy", () => {
    const html = buildConfirmationEmail(registrant, 2026)
    expect(html).toContain("nrep_logo_v2/view?project=")
    expect(html).toContain("68f0fd3a0021ecab38b5/view?project=")
    expect(html).toContain("Jointly organised by")
    expect(html).toContain("Online registration")
    expect(html).toContain("Thank you for registering")
    expect(html).not.toContain("impersonateuserid")
    expect(html).not.toContain("mode=admin")
  })
})
