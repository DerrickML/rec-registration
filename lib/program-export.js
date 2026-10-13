import { getMatchingBlocksForSession, isSessionAllowedBlock, isVenueAllowedForBlock, sortTimeBlocks } from "./schedule-utils"

export const UNASSIGNED_HALL = "__unassigned_hall__"
export const getExportHallLabel = hall => hall === UNASSIGNED_HALL ? "Venue to be confirmed" : hall

const unique = values => [...new Set(values)]
const sessionHall = session => String(session.venueHall || "").trim() || UNASSIGNED_HALL
const knownSelection = (values, available) => {
  const chosen = values === undefined ? available : Array.isArray(values) ? values : []
  const selected = new Set(chosen)
  return available.filter(value => selected.has(value))
}

export function getProgramExportOptions({ program, sessions = [], timeBlocks = [] }) {
  const declaredDays = Math.min(366, Math.max(0, Math.floor(Number(program?.daysCount) || 0)))
  const days = unique([
    ...Array.from({ length: declaredDays }, (_, index) => index + 1),
    ...sessions.map(session => Number(session.day)),
    ...timeBlocks.map(block => Number(block.day)),
  ]).filter(day => Number.isInteger(day) && day > 0).sort((a, b) => a - b)
  const configuredHalls = Array.isArray(program?.venueHalls) ? program.venueHalls : []
  const halls = unique([
    ...configuredHalls,
    ...sessions.map(sessionHall),
    ...timeBlocks.flatMap(block => Array.isArray(block.venueHalls) ? block.venueHalls : []),
  ].map(hall => String(hall || "").trim()).filter(Boolean))
    .sort((a, b) => getExportHallLabel(a).localeCompare(getExportHallLabel(b)))
  const blocks = sortTimeBlocks(timeBlocks).map(block => ({
    ...block,
    exportId: block.$id || JSON.stringify([
      block.day, block.startMinutes, block.endMinutes, block.label, block.type,
      block.venueScope, block.venueHalls,
    ]),
  }))
  return { days, halls, blocks }
}

export function createProgramExportSelection(options) {
  return {
    mode: "complete",
    days: [...options.days],
    halls: [...options.halls],
    blockIds: options.blocks.map(block => block.exportId),
    includeActivities: true,
  }
}

export function getEligibleExportBlocks(options, selection) {
  return options.blocks.filter(block =>
    selection.days.includes(Number(block.day)) &&
    (selection.includeActivities || isSessionAllowedBlock(block)) &&
    (!options.halls.length || selection.halls.some(hall => isVenueAllowedForBlock(block, hall)))
  )
}

export function updateProgramExportSelection(options, previous, updates) {
  const before = getEligibleExportBlocks(options, previous)
  const allPreviouslySelected = before.every(block => previous.blockIds.includes(block.exportId))
  const next = {
    ...previous,
    ...updates,
    days: knownSelection(updates.days ?? previous.days, options.days),
    halls: knownSelection(updates.halls ?? previous.halls, options.halls),
  }
  const eligibleIds = getEligibleExportBlocks(options, next).map(block => block.exportId)
  next.blockIds = updates.blockIds !== undefined
    ? knownSelection(updates.blockIds, eligibleIds)
    : allPreviouslySelected ? eligibleIds : knownSelection(previous.blockIds, eligibleIds)
  return next
}

export function selectProgramForExport(data, requested = {}) {
  const { sessions = [], timeBlocks = [] } = data
  const options = getProgramExportOptions(data)
  const selection = requested.mode === "custom" ? {
    mode: "custom",
    days: knownSelection(requested.days?.map(Number), options.days),
    halls: knownSelection(requested.halls, options.halls),
    blockIds: knownSelection(requested.blockIds, options.blocks.map(block => block.exportId)),
    includeActivities: requested.includeActivities !== false,
  } : createProgramExportSelection(options)
  const eligible = getEligibleExportBlocks(options, selection)
  const blocks = eligible.filter(block => selection.blockIds.includes(block.exportId)).map(block =>
    selection.mode === "custom" && block.venueScope === "SELECTED" && block.venueHalls?.length
      ? { ...block, venueHalls: block.venueHalls.filter(hall => selection.halls.includes(hall)) }
      : block
  )
  const allEligibleBlocks = eligible.every(block => selection.blockIds.includes(block.exportId))
  const exportedSessions = sessions.filter(session => {
    if (!selection.days.includes(Number(session.day)) || !selection.halls.includes(sessionHall(session))) return false
    if (selection.mode === "complete") return true
    if (getMatchingBlocksForSession(session, blocks).length) return true
    // Preserve unlinked legacy sessions only when no time-block subset is imposed.
    return allEligibleBlocks && !getMatchingBlocksForSession(session, timeBlocks).length
  })
  const days = selection.days.filter(day =>
    blocks.some(block => Number(block.day) === day) || exportedSessions.some(session => Number(session.day) === day)
  )
  const errors = []
  if (!selection.days.length) errors.push("Select at least one conference day.")
  if (options.halls.length && !selection.halls.length) errors.push("Select at least one hall.")
  if (eligible.length && !blocks.length) errors.push("Select at least one time block.")
  if (!exportedSessions.length && !blocks.length && !errors.length) {
    errors.push("No published sessions or activities match this selection.")
  }
  return {
    sessions: exportedSessions,
    timeBlocks: blocks,
    days,
    selection: { ...selection, allHalls: selection.halls.length === options.halls.length, allEligibleBlocks },
    summary: {
      dayCount: days.length,
      hallCount: selection.halls.length,
      sessionCount: exportedSessions.length,
      activityCount: blocks.filter(block => !isSessionAllowedBlock(block)).length,
      blockCount: blocks.length,
    },
    errors,
  }
}
