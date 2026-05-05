import { describe, expect, it } from "vitest"
import {
  deriveConferenceFields,
  normalizeEmail,
  sanitizeRichHtml,
  validateRegistrationInput,
} from "../lib/registration-utils"

const conference = {
  startDate: "2025-10-20T09:00:00Z",
  endDate: "2025-10-22T18:00:00Z",
  days: JSON.stringify([{ label: "Day 1" }, { label: "Day 2" }]),
}

describe("registration utilities", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com")
    expect(() => normalizeEmail("not-an-email")).toThrow("valid email")
  })

  it("derives event dates and year from the active conference", () => {
    expect(deriveConferenceFields(conference)).toEqual({
      eventStart: "2025-10-20T09:00:00Z",
      eventEnd: "2025-10-22T18:00:00Z",
      conferenceYears: [2025],
    })
  })

  it("rejects invalid conference days and required missing coupons", () => {
    expect(() =>
      validateRegistrationInput(
        {
          email: "a@example.com",
          registrationType: "Attendee",
          organization: "Org",
          city: "Kampala",
          stateRegion: "Central",
          country: "UG",
          daysAttending: ["Nope"],
          couponCode: "ABC",
        },
        conference
      )
    ).toThrow("Invalid day")

    expect(() =>
      validateRegistrationInput(
        {
          email: "a@example.com",
          registrationType: "Attendee",
          organization: "Org",
          city: "Kampala",
          stateRegion: "Central",
          country: "UG",
          daysAttending: ["Day 1"],
        },
        conference
      )
    ).toThrow("coupon")
  })

  it("allows a missing coupon when the conference does not require one", () => {
    expect(
      validateRegistrationInput(
        {
          email: "a@example.com",
          registrationType: "Attendee",
          organization: "Org",
          city: "Kampala",
          stateRegion: "Central",
          country: "UG",
          daysAttending: ["Day 1"],
        },
        conference,
        { requireCoupon: false }
      )
    ).toMatchObject({
      couponCode: "",
      email: "a@example.com",
    })
  })

  it("sanitizes stored program HTML", () => {
    const html = sanitizeRichHtml('<p onclick="x()">Hi <strong>there</strong><script>alert(1)</script></p>')
    expect(html).toContain("<strong>there</strong>")
    expect(html).not.toContain("script")
    expect(html).not.toContain("onclick")
  })
})
