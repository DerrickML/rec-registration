import { describe, expect, it } from "vitest"
import {
  buildScheduleRows,
  formatBlockTimeRange,
  getSessionsForBlock,
  isSessionContinuationInBlock,
  sessionOccupiesBlock,
} from "../lib/schedule-utils"

const blocks = [
  {
    $id: "session-morning",
    day: 1,
    startMinutes: 510,
    endMinutes: 630,
    type: "SESSION",
    label: "Morning Session",
    allowSessions: true,
    venueScope: "ALL",
    venueHalls: [],
    sortOrder: 1,
  },
  {
    $id: "tea",
    day: 1,
    startMinutes: 630,
    endMinutes: 660,
    type: "BREAK",
    label: "Tea Break",
    allowSessions: false,
    venueScope: "ALL",
    venueHalls: [],
    sortOrder: 2,
  },
  {
    $id: "session-late",
    day: 1,
    startMinutes: 660,
    endMinutes: 780,
    type: "SESSION",
    label: "Late Morning Session",
    allowSessions: true,
    venueScope: "SELECTED",
    venueHalls: ["Hall A"],
    sortOrder: 3,
  },
]

const sessions = [
  {
    $id: "s1",
    day: 1,
    title: "Solar Finance",
    venueHall: "Hall A",
    startTime: "2026-10-20T05:30:00.000+00:00",
    toTime: "2026-10-20T07:30:00.000+00:00",
    timeBlockIds: ["session-morning", "session-late"],
    sessionSpanType: "MORNING_HALF",
  },
  {
    $id: "s2",
    day: 1,
    title: "Storage",
    venueHall: "Hall B",
    startTime: "2026-10-20T08:00:00.000+00:00",
    toTime: "2026-10-20T09:00:00.000+00:00",
  },
]

describe("schedule utilities", () => {
  it("formats block ranges from Kampala minutes", () => {
    expect(formatBlockTimeRange(blocks[0])).toBe("8:30 AM - 10:30 AM")
  })

  it("matches sessions by explicit time block ids", () => {
    expect(sessionOccupiesBlock(sessions[0], blocks[0])).toBe(true)
    expect(sessionOccupiesBlock(sessions[0], blocks[1])).toBe(false)
  })

  it("respects selected venue scope", () => {
    expect(getSessionsForBlock(sessions, blocks[2], "all").map((session) => session.$id)).toEqual(["s1"])
    expect(getSessionsForBlock(sessions, blocks[2], "Hall B")).toEqual([])
  })

  it("marks later matched blocks as continuations", () => {
    expect(isSessionContinuationInBlock(sessions[0], blocks[0], blocks)).toBe(false)
    expect(isSessionContinuationInBlock(sessions[0], blocks[2], blocks)).toBe(true)
  })

  it("builds rows for both session and activity blocks", () => {
    const rows = buildScheduleRows({ sessions, timeBlocks: blocks, day: 1, selectedHall: "all" })

    expect(rows).toHaveLength(3)
    expect(rows[0].sessions.map((session) => session.$id)).toEqual(["s1"])
    expect(rows[1].allowSessions).toBe(false)
    expect(rows[2].sessionEntries[0]).toMatchObject({
      isContinuation: true,
      session: { $id: "s1" },
    })
  })
})
