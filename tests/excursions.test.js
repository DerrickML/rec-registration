import { describe, it, expect } from "vitest"
import { excursionEdition, excursionPath, excursionSource, isExcursionPromoted, partnerDestination } from "../lib/excursions"
const excursion = {
  slug: "rec26", status: "published", publishedAt: "2026-09-08T00:00:00Z",
  promotionStart: "2026-09-08T00:00:00Z", promotionEnd: "2026-10-25T21:00:00Z", endsAt: "2026-10-25T21:00:00Z",
  conference: { year: 2026 }, content: { partnerUrl: "https://www.localmotionsafaris.com/events/rec26-expo-2026" },
}
describe("excursion public presentation", () => {
  it("labels the promoted edition, including on historical media pages", () => {
    expect(excursionEdition(excursion)).toBe("REC26 & EXPO")
    expect(excursionPath(excursion, "media")).toBe("/explore-uganda/rec26?from=media")
  })
  it("expires promotion without requiring a page refresh", () => {
    expect(isExcursionPromoted(excursion, Date.parse(excursion.promotionStart))).toBe(true)
    expect(isExcursionPromoted(excursion, Date.parse(excursion.promotionEnd))).toBe(false)
    expect(isExcursionPromoted({ ...excursion, status: "archived" })).toBe(false)
    expect(isExcursionPromoted({ ...excursion, publishedAt: null })).toBe(false)
  })
  it("uses only trusted partner links and bounded source attribution", () => {
    expect(excursionSource("https://attacker.test")).toBe("direct")
    const destination = new URL(partnerDestination(excursion, "program"))
    expect(destination.hostname).toBe("www.localmotionsafaris.com")
    expect(destination.searchParams.get("utm_content")).toBe("program")
    expect(partnerDestination({ ...excursion, content: { partnerUrl: "javascript:alert(1)" } })).toBeNull()
    expect(partnerDestination({ ...excursion, content: { partnerUrl: "https://user:pass@example.com" } })).toBeNull()
  })
})
