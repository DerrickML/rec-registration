import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"
import { digitalBadgeDisplay, digitalBadgeImageUrl } from "../lib/badge-display.mjs"
vi.stubGlobal("React", React)
vi.mock("next/image", () => ({ default: props => React.createElement("img", Object.fromEntries(Object.entries(props).filter(([key]) => !["unoptimized", "loading", "onError"].includes(key)))) }))
vi.mock("next/link", () => ({ default: props => React.createElement("a", props) }))
vi.mock("@/components/mobile-apps/mobile-app-provider", () => ({ useAppConfiguration: () => ({ configuration: null }) }))
vi.mock("@/components/mobile-apps/mobile-app-cta", () => ({ default: () => null }))
import DigitalBadge, { DigitalTag } from "../components/scanner/digital-badge"

const badge = { conference: { $id: "c", year: 2026, days: [{ label: "Day 1", date: "2026-10-19" }] }, registration: { name: "Test Participant", organization: "Test Company", registrationTypes: ["Exhibitor"], daysAttending: ["Day 1"] }, badge: { badgeNumberLabel: "REC-2026-123456" }, qrDataUrl: "data:image/png;base64,test" }
const token = "a".repeat(43)
it("digital display defaults match print defaults without accepting truthy strings", () => {
  expect(digitalBadgeDisplay()).toEqual({ showCategory: false, showAttendanceDates: false, showRecId: true, showHashtag: true })
  expect(digitalBadgeDisplay({ digitalDisplay: { showCategory: "true", showHashtag: "false" } })).toEqual(digitalBadgeDisplay())
})
it("digital images use the server profile and a revision for every flag combination", () => {
  const keys = Object.keys(digitalBadgeDisplay())
  const urls = new Set()
  for (let mask = 0; mask < 16; mask++) {
    const flags = Object.fromEntries(keys.map((key, index) => [key, Boolean(mask & (1 << index))]))
    const url = digitalBadgeImageUrl(token, { digitalDisplay: flags })
    expect(url).toContain("profile=digital"); expect(url).toMatch(/v=[01]{4}$/)
    urls.add(url)
  }
  expect(urls.size).toBe(16)
})
it("full badges honor all digital visibility settings in the details as well as the artwork", () => {
  for (const enabled of [true, false]) {
    const digitalDisplay = Object.fromEntries(Object.keys(digitalBadgeDisplay()).map(key => [key, enabled]))
    const html = renderToStaticMarkup(<DigitalBadge token={token} initialBadge={{ ...badge, digitalDisplay }} />)
    expect(html).toContain("Test Participant"); expect(html).toContain("Test Company")
    expect(html).toContain("profile=digital")
    for (const text of ["Exhibitor", "Registered days", "REC-2026-123456", "#REC26&amp;EXPO"]) expect(html.includes(text)).toBe(enabled)
  }
})
it("compact tags use the same configurable artwork and retain a responsive width", () => {
  const html = renderToStaticMarkup(<DigitalTag token={token} initialBadge={badge} />)
  expect(html).toContain("profile=digital"); expect(html).toContain("v=0011")
  expect(html).toContain("min(100%, 340px")
})
it("unavailable badges do not expose an old QR image", () => {
  for (const Component of [DigitalBadge, DigitalTag]) {
    const html = renderToStaticMarkup(<Component token={token} initialBadge={null} />)
    expect(html).toContain("Badge unavailable"); expect(html).not.toContain("/print?")
  }
})
