// @vitest-environment jsdom
import React from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ScannerDashboard, ScannerActivity } from "../components/scanner/ScannerViews"
import ScannerPortal from "../components/scanner/ScannerPortal"
import { scannerPhase, scannerDate } from "../lib/scanner-client"

let rows, calls, submit, eventsError
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
const expired = vi.fn(), navigate = vi.fn()
beforeEach(() => {
  vi.stubGlobal("React", React)
  vi.stubGlobal("localStorage", { getItem: () => null, removeItem() {}, setItem() {} })
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.spyOn(document, "hidden", "get").mockReturnValue(false)
  calls = []; eventsError = false
  const now = Date.now()
  rows = Array.from({ length: 15 }, (_, i) => ({ $id: `open-${i}`, name: `Entrance ${i}`, venue: "Main gate", type: "conference_entry", day: 1, date: "2026-10-19", isCurrentlyOpen: true, startTime: new Date(now - 3600000).toISOString(), endTime: new Date(now + 3600000).toISOString() }))
  rows.push({ $id: "future", name: "Tomorrow lunch", venue: "Dining area", type: "lunch", day: 2, isCurrentlyOpen: false, availabilityCode: "event_not_started", startTime: new Date(now + 86400000).toISOString() })
  rows.push({ $id: "ended", name: "Yesterday lunch", venue: "Dining area", type: "lunch", day: 1, isCurrentlyOpen: false, availabilityCode: "event_ended", endTime: new Date(now - 86400000).toISOString() })
  submit = async () => response({ status: "accepted", registration: { name: "Test attendee" } })
  vi.stubGlobal("fetch", vi.fn(async (url, options) => {
    calls.push({ url: String(url), body: options?.body })
    const parsed = new URL(url, "http://localhost:3002"), q = parsed.searchParams
    if (parsed.pathname === "/api/scanner/auth/me") return response({ operator: { name: "Test operator" }, conference: { title: "REC test" } })
    if (parsed.pathname === "/api/scanner/auth/dev-login") return response({ enabled: false })
    if (parsed.pathname === "/api/scanner/events") {
      if (eventsError) return response({ error: "Access expired" }, 403)
      if (!q.has("page")) return response({ documents: rows, serverTime: new Date().toISOString() })
      const status = q.get("status") === "auto" ? "open" : q.get("status")
      const filtered = rows.filter(row => (status === "all" || scannerPhase(row) === status) && (!q.get("search") || row.name.toLowerCase().includes(q.get("search").toLowerCase())) && (!q.get("type") || row.type === q.get("type")))
      const page = Number(q.get("page")), limit = Number(q.get("limit"))
      return response({ documents: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit, totalPages: Math.max(1, Math.ceil(filtered.length / limit)), status,
        counts: { all: 17, open: 15, upcoming: 1, ended: 1 }, facets: { days: ["1", "2"], venues: ["Main gate", "Dining area"], types: ["conference_entry", "lunch"] }, serverTime: new Date().toISOString() })
    }
    if (parsed.pathname === "/api/scanner/overview") return response({ acceptedToday: 7, date: "2026-10-19", lastScanAt: new Date().toISOString() })
    if (parsed.pathname === "/api/scanner/activity") return response({ documents: [{ $id: "scan", attendeeName: q.get("page") === "2" ? "Second page attendee" : "Test attendee", organization: "NREP", eventName: "Entrance", status: "accepted", scannedAt: new Date().toISOString() }], total: 21, page: Number(q.get("page")), totalPages: 2 })
    if (parsed.pathname === "/api/scanner/scans") return submit()
    throw new Error(`Unexpected fetch: ${url}`)
  }))
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); vi.useRealTimers() })

describe("operator event dashboard", () => {
  it("defaults to open events with summary, pagination and no visible capture controls", async () => {
    render(<ScannerPortal view="dashboard" onNavigate={navigate} />)
    await screen.findByRole("heading", { name: "Entrance 0" })
    expect(screen.getByRole("tab", { name: "Open now 15" }).getAttribute("aria-selected")).toBe("true")
    expect(screen.getAllByRole("button", { name: "Scan", exact: true })).toHaveLength(12)
    expect(screen.queryByRole("button", { name: "Start Camera" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Next page" }))
    await screen.findByRole("heading", { name: "Entrance 14" })
    expect(screen.queryByRole("heading", { name: "Entrance 0" })).toBeNull()
  })
  it("separates future and ended events and navigates to event detail without scanning", async () => {
    render(<ScannerDashboard onNavigate={navigate} onExpired={expired} />)
    await screen.findByText("Entrance 0")
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming 1" }))
    await screen.findByText("Tomorrow lunch")
    expect(screen.queryByText("Entrance 0")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "View event" }))
    expect(navigate).toHaveBeenCalledWith("/scanner/events/future")
    fireEvent.keyDown(screen.getByRole("tab", { name: "Upcoming 1" }), { key: "ArrowRight" })
    await screen.findByText("Yesterday lunch")
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Ended 1" }))
  })
  it("searches server-side, resets pages and exposes type, day, date and venue filters", async () => {
    render(<ScannerDashboard onNavigate={navigate} onExpired={expired} />)
    await screen.findByText("Entrance 0")
    fireEvent.click(screen.getByRole("button", { name: "Next page" }))
    await screen.findByText("Entrance 14")
    fireEvent.change(screen.getByRole("searchbox", { name: "Search assigned events" }), { target: { value: "Entrance 4" } })
    await waitFor(() => expect(calls.some(call => call.url.includes("search=Entrance+4") && call.url.includes("page=1"))).toBe(true))
    await screen.findByText("Entrance 4")
    fireEvent.click(screen.getByRole("button", { name: "Filters" }))
    for (const name of ["Conference day", "Venue", "Event type"]) expect(screen.getByRole("combobox", { name })).toBeTruthy()
    expect(screen.getByLabelText("Date")).toBeTruthy()
  })
  it("clears access on expiry rather than retaining an authorized-looking dashboard", async () => {
    eventsError = true
    render(<ScannerDashboard onNavigate={navigate} onExpired={expired} />)
    await screen.findByText("Access expired")
    expect(expired).toHaveBeenCalled()
  })
})

describe("personal scanner activity", () => {
  it("loads paginated own history and applies recorded-result and Kampala date filters", async () => {
    render(<ScannerActivity onExpired={expired} />)
    await screen.findByText("Test attendee")
    fireEvent.click(screen.getByRole("button", { name: "Next page" }))
    await screen.findByText("Second page attendee")
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-10-19" } })
    await waitFor(() => expect(calls.some(call => call.url.includes("from=2026-10-19") && call.url.includes("page=1"))).toBe(true))
    fireEvent.change(screen.getByRole("combobox", { name: "Recorded result" }), { target: { value: "rejected" } })
    await waitFor(() => expect(calls.some(call => call.url.includes("status=rejected"))).toBe(true))
    expect(screen.getByText(/Duplicate responses and some invalid attempts are not stored/)).toBeTruthy()
  })
  it("retains an uncertain request across a browser-style route transition and retries its original identity", async () => {
    submit = async () => response({ error: "Unavailable" }, 503)
    const page = render(<ScannerPortal view="scan" routeEventId="open-0" onNavigate={navigate} />)
    await screen.findByRole("heading", { name: "REC test" })
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Camera" }).disabled).toBe(false))
    fireEvent.click(screen.getByRole("button", { name: "Manual Entry", exact: true }))
    fireEvent.change(screen.getByRole("textbox", { name: "Badge Number / QR Payload" }), { target: { value: "REC26ABC123" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit", exact: true }))
    await screen.findByText("Scan not confirmed")
    const original = calls.find(call => call.url === "/api/scanner/scans").body
    page.rerender(<ScannerPortal view="dashboard" routeEventId="" onNavigate={navigate} />)
    expect(screen.getByRole("button", { name: "Scan Another Badge" }).disabled).toBe(true)
    submit = async () => response({ status: "accepted" })
    fireEvent.click(screen.getByRole("button", { name: "Retry this scan" }))
    await screen.findByText("Scan Accepted")
    expect(calls.filter(call => call.url === "/api/scanner/scans").at(-1).body).toBe(original)
  })
})

it("classifies time boundaries and formats date-only values in Kampala", () => {
  const now = Date.parse("2026-10-19T08:00:00+03:00")
  const event = { isActive: true, startTime: "2026-10-19T08:00:00+03:00", endTime: "2026-10-19T09:00:00+03:00", isCurrentlyOpen: false }
  expect(scannerPhase(event, now - 1)).toBe("upcoming")
  expect(scannerPhase(event, now)).toBe("open")
  expect(scannerPhase(event, now + 3600000)).toBe("open")
  expect(scannerPhase(event, now + 3600001)).toBe("ended")
  expect(scannerPhase({ ...event, isActive: false }, now)).toBe("unavailable")
  expect(scannerDate("2026-10-19")).toContain("19 Oct 2026")
})
