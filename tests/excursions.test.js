import { describe, it, expect } from "vitest"
import { excursionDestination, excursionEdition, excursionPath, excursionSource, isExcursionPromoted, partnerDestination, usesExternalDestination } from "../lib/excursions"
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
  it("keeps legacy pages as the default and restores them when external mode is disabled", () => {
    expect(excursionDestination(excursion, "nav")).toBe("/explore-uganda/rec26?from=nav")
    expect(usesExternalDestination(excursion)).toBe(false)
    expect(excursionDestination({ ...excursion, content: { ...excursion.content, destinationMode: "page", destinationUrl: "https://example.org/trips" } }, "home_hero")).toBe("/explore-uganda/rec26?from=home_hero")
  })
  it.each(["home_hero", "home", "about", "program", "media", "venue", "nav", "footer", "direct"])("sends %s directly to the configured destination with attribution", source => {
    const external = { ...excursion, content: { ...excursion.content, destinationMode: "external", destinationUrl: "https://example.org/trips?edition=26#details" } }
    const href = new URL(excursionDestination(external, source))
    expect(href.origin).toBe("https://example.org")
    expect(href.searchParams.get("edition")).toBe("26")
    expect(href.hash).toBe("#details")
    expect(href.searchParams.get("utm_content")).toBe(source)
    expect(new URL(partnerDestination(external)).hostname).toBe("www.localmotionsafaris.com")
  })
  it("fails closed for unsafe/missing external links without exposing the inactive page", () => {
    for (const destinationUrl of ["", "javascript:alert(1)", "http://example.org", "https://user:pass@example.com", "https://rec.nrep.ug/explore-uganda/rec26", "https://rec.nrep.ug/%65xplore-uganda/rec26", "https://example.com/%ZZ"]) {
      expect(excursionDestination({ ...excursion, content: { destinationMode: "external", destinationUrl } })).toBeNull()
    }
  })
  it("does not let external mode bypass promotion dates or draft status", () => {
    const external = { ...excursion, content: { ...excursion.content, destinationMode: "external", destinationUrl: excursion.content.partnerUrl } }
    expect(isExcursionPromoted(external, Date.parse(external.promotionEnd))).toBe(false)
    expect(isExcursionPromoted({ ...external, status: "draft" }, Date.parse(external.promotionStart))).toBe(false)
  })
})
