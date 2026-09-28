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
  const validInput = { email: "a@example.com", registrationType: "Attendee", organization: "Org", sector: ["Private"], city: "Kampala", stateRegion: "Central", country: "UG" }
  it("defaults new attendance to all days but preserves omitted edit selections", () => {
    expect(validateRegistrationInput(validInput, conference, { requireCoupon: false }).daysAttending).toEqual(["Day 1", "Day 2"])
    expect(validateRegistrationInput(validInput, conference, { requireCoupon: false, existingDays: ["Day 2"] }).daysAttending).toEqual(["Day 2"])
    expect(() => validateRegistrationInput({ ...validInput, daysAttending: [] }, conference, { requireCoupon: false, existingDays: ["Day 2"] })).toThrow("at least one day")
    expect(() => validateRegistrationInput(validInput, { ...conference, days: [] }, { requireCoupon: false })).toThrow("not been configured")
  })
  it("requires a passport for public visa requests and enforces the database length limit", () => {
    expect(() => validateRegistrationInput({ ...validInput, visaLetterRequired: true }, conference, { requireCoupon: false })).toThrow("Passport number is required")
    expect(() => validateRegistrationInput({ ...validInput, visaLetterRequired: true, passportNumber: "X".repeat(16) }, conference, { requireCoupon: false })).toThrow("15 characters")
    expect(() => validateRegistrationInput({ ...validInput, visaLetterRequired: true, passportNumber: "0012345" }, conference, { requireCoupon: false })).not.toThrow()
  })
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
          sector: ["Private"],
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
          sector: ["Private"],
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
          sector: ["Private"],
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
