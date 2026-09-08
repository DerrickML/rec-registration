import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { getDayDate } from "../lib/program-utils"
import {
  REC_PHOTOS,
  conferenceDate,
  conferenceDateRange,
  conferenceDays,
  conferenceExtras,
} from "../lib/conference-display"

describe("conference presentation", () => {
  it("shows unambiguous program day labels in Kampala time", () => {
    expect(getDayDate("2026-10-18T22:30:00Z", 2)).toBe("20 Oct 2026")
    expect(getDayDate("invalid", 1)).toBe("")
  })
  it("formats conference dates in Kampala, including UTC day boundaries", () => {
    expect(conferenceDate("2026-10-18T22:30:00Z")).toBe("19 October 2026")
    expect(conferenceDate("2026-10-19")).toBe("19 October 2026")
  })
  it("provides useful missing and invalid date labels", () => {
    expect(conferenceDate(null)).toBe("Date to be confirmed")
    expect(conferenceDate("invalid")).toBe("Date to be confirmed")
    expect(conferenceDateRange(null, null)).toBe("Dates to be confirmed")
  })
  it("handles one-day and cross-year conferences without dropping the year", () => {
    expect(conferenceDateRange("2026-10-19", "2026-10-19")).toBe(
      "19 October 2026"
    )
    expect(conferenceDateRange("2026-12-31", "2027-01-01")).toBe(
      "31 December 2026 - 1 January 2027"
    )
  })
  it("preserves configured day information and supports legacy labels", () => {
    const days = [
      { date: "2026-10-19", label: "Opening day", theme: "Energy access" },
    ]
    expect(conferenceDays(JSON.stringify(days))).toEqual(days)
    expect(conferenceDays(days)).toEqual(days)
    expect(conferenceDays("Monday, Tuesday")).toEqual([
      { label: "Monday" },
      { label: "Tuesday" },
    ])
    expect(conferenceDays(null)).toEqual([])
    expect(conferenceDays('{"label":"Not an array"}')).toEqual([])
  })
  it("does not crash on malformed optional configuration", () => {
    expect(conferenceExtras("invalid")).toEqual({})
    expect(conferenceExtras("null")).toEqual({})
    expect(conferenceExtras("[]")).toEqual({})
    expect(
      conferenceExtras('{"features":[{"title":"Expo"}]}').features[0].title
    ).toBe("Expo")
  })
  it.each(Object.entries(REC_PHOTOS))(
    "ships a local optimized photograph with archive-specific alt text: %s",
    (_name, photo) => {
      expect(photo.src).toMatch(/^\/images\/rec\/[\w-]+\.webp$/)
      expect(photo.alt).toContain("REC25")
      const bytes = readFileSync(
        fileURLToPath(new URL(`../public${photo.src}`, import.meta.url))
      )
      expect(bytes.toString("ascii", 8, 12)).toBe("WEBP")
      expect(bytes.length).toBeLessThan(400_000)
    }
  )
})
