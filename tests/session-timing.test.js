import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import SessionCard from "../components/program/session-card"
import {
  buildScheduleRows, formatSessionTimeRange, getSessionTimeBounds, getSessionsForBlock,
  SESSION_TIME_TO_BE_CONFIRMED, sortSessionsByTime,
} from "../lib/schedule-utils"
import { formatTimeWithTimezone, getSessionsByDay, groupSessionsByTimeSlot } from "../lib/program-utils"

const session = (id, startTime, toTime, extra = {}) => ({
  $id: id, title: id, day: 1, venueHall: "Hall A", startTime, toTime, ...extra,
})
const morning = { $id: "morning", day: 1, type: "SESSION", allowSessions: true, venueScope: "ALL", startMinutes: 510, endMinutes: 630 }

describe("session time presentation and ordering", () => {
  it("shows the actual short-session range in Kampala rather than its containing period", () => {
    const short = session("Short session", "2026-10-20T05:30:00Z", "2026-10-20T06:00:00Z")
    expect(formatSessionTimeRange(short)).toBe("8:30 AM - 9:00 AM EAT")
    expect(formatSessionTimeRange(short, { includeTimezone: false })).toBe("8:30 AM - 9:00 AM")
    expect(getSessionTimeBounds(short)).toEqual({ start: Date.parse(short.startTime), end: Date.parse(short.toTime) })
  })

  it("normalizes equivalent timestamps with different UTC offsets", () => {
    const utc = session("UTC", "2026-10-20T05:30:00Z", "2026-10-20T06:00:00Z")
    const local = session("Local", "2026-10-20T08:30:00+03:00", "2026-10-20T09:00:00+03:00")
    expect(formatSessionTimeRange(local)).toBe(formatSessionTimeRange(utc))
    expect(getSessionTimeBounds(local)).toEqual(getSessionTimeBounds(utc))
  })

  it("formats midnight correctly and keeps a full-day session's original span", () => {
    expect(formatSessionTimeRange(session("Midnight", "2026-10-19T21:00:00Z", "2026-10-19T22:00:00Z"))).toBe("12:00 AM - 1:00 AM EAT")
    expect(formatSessionTimeRange(session("Full day", "2026-10-20T05:30:00Z", "2026-10-20T14:00:00Z"))).toBe("8:30 AM - 5:00 PM EAT")
  })

  it.each([
    [null, "2026-10-20T06:00:00Z"],
    ["2026-10-20T05:30:00Z", undefined],
    ["invalid", "2026-10-20T06:00:00Z"],
    ["2026-10-20T05:30:00Z", "invalid"],
    ["2026-10-20T05:30:00Z", "2026-10-20T05:30:00Z"],
    ["2026-10-20T06:00:00Z", "2026-10-20T05:30:00Z"],
  ])("uses a clear fallback for an incomplete or invalid range %s to %s", (start, end) => {
    expect(formatSessionTimeRange(session("Legacy", start, end))).toBe(SESSION_TIME_TO_BE_CONFIRMED)
    expect(getSessionTimeBounds(session("Legacy", start, end))).toBeNull()
  })

  it("sorts by actual instants instead of timezone-dependent string ordering", () => {
    const early = session("early", "2026-10-20T08:30:00+03:00", "2026-10-20T09:00:00+03:00", { venueHall: "Zulu Hall" })
    const late = session("late", "2026-10-20T05:45:00Z", "2026-10-20T06:15:00Z", { venueHall: "Alpha Hall" })
    expect(sortSessionsByTime([late, early]).map(item => item.$id)).toEqual(["early", "late"])
  })

  it("orders equal starts by end time, hall, title and id, with unknown ranges last", () => {
    const input = [
      session("unknown", null, null),
      session("long", "2026-10-20T05:30:00Z", "2026-10-20T07:30:00Z"),
      session("zulu", "2026-10-20T05:30:00Z", "2026-10-20T06:00:00Z", { venueHall: "Zulu Hall" }),
      session("title-z", "2026-10-20T05:30:00Z", "2026-10-20T06:00:00Z", { venueHall: "Alpha Hall", title: "Zebra" }),
      session("same-b", "2026-10-20T05:30:00Z", "2026-10-20T06:00:00Z", { venueHall: "Alpha Hall", title: "Alpha" }),
      session("same-a", "2026-10-20T05:30:00Z", "2026-10-20T06:00:00Z", { venueHall: "Alpha Hall", title: "Alpha" }),
      session("short", "2026-10-20T05:30:00Z", "2026-10-20T05:45:00Z", { venueHall: "Zulu Hall" }),
    ]
    const original = structuredClone(input)
    expect(sortSessionsByTime(input).map(item => item.$id)).toEqual(["short", "same-a", "same-b", "title-z", "zulu", "long", "unknown"])
    expect(input).toEqual(original)
  })

  it("uses chronological order within a configured period even across different halls", () => {
    const input = [
      session("late", "2026-10-20T06:00:00Z", "2026-10-20T06:30:00Z", { venueHall: "Alpha Hall" }),
      session("early", "2026-10-20T05:30:00Z", "2026-10-20T06:00:00Z", { venueHall: "Zulu Hall" }),
    ]
    expect(getSessionsForBlock(input, morning).map(item => item.$id)).toEqual(["early", "late"])
    expect(buildScheduleRows({ sessions: input, timeBlocks: [morning], day: 1 })[0].sessionEntries.map(entry => entry.session.$id)).toEqual(["early", "late"])
  })

  it("retains ongoing-session times and continuation markers in later periods", () => {
    const full = session("ongoing", "2026-10-20T05:30:00Z", "2026-10-20T14:00:00Z", { timeBlockIds: ["morning", "afternoon"], sessionSpanType: "FULL_DAY" })
    const afternoon = { ...morning, $id: "afternoon", startMinutes: 840, endMinutes: 930 }
    const rows = buildScheduleRows({ sessions: [full], timeBlocks: [morning, afternoon], day: 1 })
    expect(rows.map(row => row.sessionEntries[0].isContinuation)).toEqual([false, true])
    expect(formatSessionTimeRange(rows[1].sessions[0])).toBe("8:30 AM - 5:00 PM EAT")
    const restricted = buildScheduleRows({ sessions: [full], timeBlocks: [afternoon], day: 1 })
    expect(restricted[0].sessionEntries[0].isContinuation).toBe(false)
    expect(formatSessionTimeRange(restricted[0].sessions[0])).toBe("8:30 AM - 5:00 PM EAT")
  })

  it("groups legacy parallel sessions by normalized ranges and places unconfirmed times last", () => {
    const input = [
      session("unknown", "bad", null),
      session("late", "2026-10-20T06:00:00Z", "2026-10-20T07:00:00Z"),
      session("zulu", "2026-10-20T08:30:00+03:00", "2026-10-20T09:00:00+03:00", { venueHall: "Zulu Hall" }),
      session("alpha", "2026-10-20T05:30:00Z", "2026-10-20T06:00:00Z", { venueHall: "Alpha Hall" }),
    ]
    const groups = Object.values(groupSessionsByTimeSlot(input))
    expect(groups.map(group => group.sessions.map(item => item.$id))).toEqual([["alpha", "zulu"], ["late"], ["unknown"]])
    expect(groups[2]).toMatchObject({ startTime: null, toTime: null })
    expect(formatTimeWithTimezone("invalid")).toEqual({ kampala: "", local: "", timezone: "" })
    expect(getSessionsByDay([{ day: "1" }, { day: 2 }], 1)).toEqual([{ day: "1" }])
  })
})

describe("session card time labels", () => {
  // Match the classic JSX transform used by the project's JSX files in this test runner.
  beforeAll(() => vi.stubGlobal("React", React))
  afterAll(() => vi.unstubAllGlobals())

  it("shows custom-session times above the title", () => {
    const html = renderToStaticMarkup(React.createElement(SessionCard, {
      session: session("Short session", "2026-10-20T05:30:00Z", "2026-10-20T06:00:00Z", { sessionSpanType: "CUSTOM" }),
    }))
    expect(html).toContain("8:30 AM - 9:00 AM EAT")
    expect(html.indexOf("8:30 AM - 9:00 AM EAT")).toBeLessThan(html.indexOf("Short session"))
  })

  it("keeps the original time label visible on compact continuation cards", () => {
    const html = renderToStaticMarkup(React.createElement(SessionCard, {
      session: session("Full session", "2026-10-20T05:30:00Z", "2026-10-20T14:00:00Z", { sessionSpanType: "FULL_DAY" }),
      compact: true, continuation: true,
    }))
    expect(html).toContain("8:30 AM - 5:00 PM EAT")
    expect(html).toContain("Continues")
    expect(html).toContain("This session continues through this schedule block.")
  })

  it("keeps legacy sessions visible with an explicit missing-time label", () => {
    const html = renderToStaticMarkup(React.createElement(SessionCard, { session: session("Legacy session", null, null) }))
    expect(html).toContain("Time to be confirmed")
    expect(html).toContain("Legacy session")
    expect(html).not.toContain("Invalid Date")
  })
})
