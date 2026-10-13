import { describe, expect, it } from "vitest"
import { createProgramExportSelection, getEligibleExportBlocks, getProgramExportOptions, selectProgramForExport, UNASSIGNED_HALL, updateProgramExportSelection } from "../lib/program-export"
import { buildScheduleRows } from "../lib/schedule-utils"

const block = ($id, day, startMinutes, endMinutes, extra = {}) => ({
  $id, day, startMinutes, endMinutes, label: $id, type: "SESSION", allowSessions: true, venueScope: "ALL", ...extra,
})
const data = {
  program: { daysCount: 4, venueHalls: ["Main Hall", "Side Hall", "Expo", "Meals"] },
  timeBlocks: [
    block("morning-1", 1, 510, 630),
    block("break-1", 1, 630, 660, { type: "BREAK", allowSessions: false }),
    block("lunch-1", 1, 780, 840, { type: "LUNCH", allowSessions: false, venueScope: "SELECTED", venueHalls: ["Meals"] }),
    block("afternoon-1", 1, 840, 930),
    block("exhibition-1", 1, 480, 1020, { type: "EXHIBITION", venueScope: "SELECTED", venueHalls: ["Expo"] }),
    block("morning-2", 2, 510, 630),
    block("social-3", 3, 1020, 1080, { type: "SOCIAL", allowSessions: false }),
  ],
  sessions: [
    { $id: "full-day", title: "All-day session", day: "1", venueHall: "Main Hall", startTime: "2026-10-19T05:30:00Z", toTime: "2026-10-19T12:30:00Z", timeBlockIds: ["morning-1", "afternoon-1"] },
    { $id: "side", day: 1, venueHall: "Side Hall", timeBlockIds: ["morning-1"] },
    { $id: "exhibit", day: 1, venueHall: "Expo", timeBlockIds: ["exhibition-1"] },
    { $id: "second-day", day: 2, venueHall: "Side Hall", timeBlockIds: ["morning-2"] },
  ],
}

describe("program export selections", () => {
  it("defaults to the complete published schedule regardless of leftover custom fields", () => {
    const exported = selectProgramForExport(data, { days: [], halls: [], blockIds: [], includeActivities: false })
    expect(exported.sessions).toEqual(data.sessions)
    expect(exported.timeBlocks).toHaveLength(7)
    expect(exported.errors).toEqual([])
    expect(exported.summary).toEqual({ dayCount: 3, hallCount: 4, sessionCount: 4, activityCount: 3, blockCount: 7 })
    expect(exported.days).toEqual([1, 2, 3])
  })

  it("combines multiple day and hall filters without renumbering conference days", () => {
    const exported = selectProgramForExport(data, { mode: "custom", days: ["2", 3], halls: ["Side Hall"] })
    expect(exported.sessions.map(session => session.$id)).toEqual(["second-day"])
    expect(exported.days).toEqual([2, 3])
    expect(exported.timeBlocks.map(item => item.$id)).toEqual(["morning-2", "social-3"])
  })

  it("retains conference-wide breaks but excludes other halls' venue-specific activities and exhibition blocks", () => {
    const exported = selectProgramForExport(data, { mode: "custom", days: [1], halls: ["Main Hall"] })
    expect(exported.sessions.map(session => session.$id)).toEqual(["full-day"])
    expect(exported.timeBlocks.map(item => item.$id)).toEqual(["morning-1", "break-1", "afternoon-1"])
  })

  it("exports a session occupying a later selected block in full without changing its real times", () => {
    const exported = selectProgramForExport(data, { mode: "custom", days: [1], halls: ["Main Hall"], blockIds: ["afternoon-1"] })
    expect(exported.sessions).toEqual([data.sessions[0]])
    expect(exported.sessions[0].startTime).toBe("2026-10-19T05:30:00Z")
    const rows = buildScheduleRows({ sessions: exported.sessions, timeBlocks: exported.timeBlocks, day: 1 })
    expect(rows[0].sessionEntries[0].isContinuation).toBe(false)
  })

  it("does not duplicate the session record when it spans multiple selected blocks", () => {
    const exported = selectProgramForExport(data, { mode: "custom", days: [1], halls: ["Main Hall"], blockIds: ["morning-1", "afternoon-1"] })
    expect(exported.summary.sessionCount).toBe(1)
    const rows = buildScheduleRows({ sessions: exported.sessions, timeBlocks: exported.timeBlocks, day: 1 })
    expect(rows.map(row => row.sessionEntries[0].isContinuation)).toEqual([false, true])
  })

  it("narrows exported selected-venue block labels without changing their source venue scope", () => {
    const scoped = { ...data, timeBlocks: [block("morning-1", 1, 510, 630, { venueScope: "SELECTED", venueHalls: ["Main Hall", "Side Hall"] })] }
    const exported = selectProgramForExport(scoped, { mode: "custom", days: [1], halls: ["Main Hall"] })
    expect(exported.timeBlocks[0].venueHalls).toEqual(["Main Hall"])
    expect(scoped.timeBlocks[0].venueHalls).toEqual(["Main Hall", "Side Hall"])
    expect(exported.sessions.map(session => session.$id)).toEqual(["full-day"])
  })

  it("can omit activities without excluding multi-block sessions", () => {
    const exported = selectProgramForExport(data, { mode: "custom", days: [1], halls: ["Main Hall"], includeActivities: false })
    expect(exported.summary.activityCount).toBe(0)
    expect(exported.sessions).toEqual([data.sessions[0]])
    expect(exported.timeBlocks.every(item => item.allowSessions)).toBe(true)
  })

  it("supports activity-only exports", () => {
    const exported = selectProgramForExport(data, { mode: "custom", days: [3], blockIds: ["social-3"] })
    expect(exported.summary.sessionCount).toBe(0)
    expect(exported.summary.activityCount).toBe(1)
    expect(exported.days).toEqual([3])
    expect(exported.errors).toEqual([])
  })

  it.each([
    [{ days: [] }, "Select at least one conference day."],
    [{ halls: [] }, "Select at least one hall."],
    [{ blockIds: [] }, "Select at least one time block."],
    [{ days: [999] }, "Select at least one conference day."],
    [{ halls: ["unknown"] }, "Select at least one hall."],
    [{ blockIds: ["unknown"] }, "Select at least one time block."],
  ])("rejects empty or unavailable selections %j", (selection, expected) => {
    expect(selectProgramForExport(data, { mode: "custom", ...selection }).errors).toContain(expected)
  })

  it("reports when a valid configured day has no published schedule", () => {
    const exported = selectProgramForExport(data, { mode: "custom", days: [4] })
    expect(exported.errors).toEqual(["No published sessions or activities match this selection."])
  })

  it("prunes unavailable block selections when parent filters change", () => {
    const options = getProgramExportOptions(data)
    const selected = { ...createProgramExportSelection(options), mode: "custom", blockIds: ["morning-1", "morning-2", "exhibition-1"] }
    const next = updateProgramExportSelection(options, selected, { days: [1], halls: ["Main Hall"] })
    expect(next.blockIds).toEqual(["morning-1"])
    expect(getEligibleExportBlocks(options, next).some(item => item.$id === "exhibition-1")).toBe(false)
  })

  it("keeps all eligible blocks selected when refining or expanding an all-block selection", () => {
    const options = getProgramExportOptions(data)
    const selected = updateProgramExportSelection(options, createProgramExportSelection(options), { days: [2] })
    expect(selected.blockIds).toEqual(["morning-2"])
    const expanded = updateProgramExportSelection(options, selected, { days: [1, 2], includeActivities: false })
    expect(expanded.blockIds).toContain("morning-1")
    expect(expanded.blockIds).toContain("morning-2")
    expect(expanded.blockIds).not.toContain("break-1")
  })

  it("preserves unmapped legacy sessions only when all eligible blocks are selected", () => {
    const legacy = { $id: "legacy", day: 1, venueHall: "Main Hall", timeBlockIds: ["deleted-block"] }
    const withLegacy = { ...data, sessions: [...data.sessions, legacy] }
    expect(selectProgramForExport(withLegacy, { mode: "custom", days: [1], halls: ["Main Hall"] }).sessions).toContain(legacy)
    expect(selectProgramForExport(withLegacy, { mode: "custom", days: [1], halls: ["Main Hall"], blockIds: ["afternoon-1"] }).sessions).not.toContain(legacy)
  })

  it("supports legacy schedules with no configured time blocks and unassigned venues", () => {
    const legacy = { program: { daysCount: 2 }, sessions: [{ $id: "legacy", day: 2 }], timeBlocks: [] }
    const options = getProgramExportOptions(legacy)
    expect(options.halls).toEqual([UNASSIGNED_HALL])
    const exported = selectProgramForExport(legacy, { mode: "custom", days: [2] })
    expect(exported.sessions).toEqual(legacy.sessions)
    expect(exported.days).toEqual([2])
    expect(exported.errors).toEqual([])
  })

  it("does not mutate source records or filter arrays", () => {
    const before = structuredClone(data)
    const requested = { mode: "custom", days: [1], halls: ["Main Hall"], blockIds: ["afternoon-1"] }
    const original = structuredClone(requested)
    selectProgramForExport(data, requested)
    expect(data).toEqual(before)
    expect(requested).toEqual(original)
  })
})
