export const KAMPALA_TIME_ZONE = "Africa/Kampala"

export const TIME_BLOCK_TYPE_LABELS = {
  SESSION: "Session",
  BREAK: "Break",
  LUNCH: "Lunch",
  SOCIAL: "Social",
  CEREMONY: "Ceremony",
  EXHIBITION: "Exhibition",
  OTHER: "Activity",
}

export const SESSION_SPAN_TYPE_LABELS = {
  CUSTOM: "Custom",
  SINGLE_BLOCK: "Single block",
  MORNING_HALF: "Morning half",
  AFTERNOON_HALF: "Afternoon half",
  FULL_DAY: "Full day",
  MULTI_BLOCK: "Multi-block",
}

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toIdArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String)
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()]
  }
  return []
}

export const hasProgramTimeBlocks = (timeBlocks) => Array.isArray(timeBlocks) && timeBlocks.length > 0

export const sortTimeBlocks = (timeBlocks = []) => {
  return [...timeBlocks].sort((a, b) => {
    const dayDiff = toNumber(a.day) - toNumber(b.day)
    if (dayDiff !== 0) return dayDiff

    const startDiff = toNumber(a.startMinutes) - toNumber(b.startMinutes)
    if (startDiff !== 0) return startDiff

    return toNumber(a.sortOrder) - toNumber(b.sortOrder)
  })
}

export const formatMinutesAsClock = (minutes) => {
  const numericMinutes = Math.max(0, Math.min(1440, toNumber(minutes)))
  const normalized = numericMinutes === 1440 ? 0 : numericMinutes
  const hours24 = Math.floor(normalized / 60)
  const mins = normalized % 60
  const suffix = hours24 >= 12 ? "PM" : "AM"
  const hours12 = hours24 % 12 || 12
  return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`
}

const getKampalaMinutesFromDateTime = (dateTime) => {
  if (!dateTime) return null
  const date = new Date(dateTime)
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: KAMPALA_TIME_ZONE,
  }).formatToParts(date)

  const hour = toNumber(parts.find((part) => part.type === "hour")?.value, null)
  const minute = toNumber(parts.find((part) => part.type === "minute")?.value, null)
  if (hour === null || minute === null) return null

  return (hour % 24) * 60 + minute
}

export const formatBlockTimeRange = (block) => {
  if (!block) return ""

  if (Number.isFinite(Number(block.startMinutes)) && Number.isFinite(Number(block.endMinutes))) {
    return `${formatMinutesAsClock(block.startMinutes)} - ${formatMinutesAsClock(block.endMinutes)}`
  }

  const start = getKampalaMinutesFromDateTime(block.startTime)
  const end = getKampalaMinutesFromDateTime(block.endTime)
  if (start !== null && end !== null) {
    return `${formatMinutesAsClock(start)} - ${formatMinutesAsClock(end)}`
  }

  return ""
}

export const getBlockTypeLabel = (type) => TIME_BLOCK_TYPE_LABELS[type] || TIME_BLOCK_TYPE_LABELS.OTHER

export const getSessionSpanLabel = (spanType) => {
  return SESSION_SPAN_TYPE_LABELS[spanType] || SESSION_SPAN_TYPE_LABELS.CUSTOM
}

export const isSessionAllowedBlock = (block) => Boolean(block?.allowSessions)

export const isVenueAllowedForBlock = (block, venueHall) => {
  if (!block || block.venueScope !== "SELECTED") return true
  if (!venueHall) return true

  const venueHalls = Array.isArray(block.venueHalls) ? block.venueHalls : []
  if (venueHalls.length === 0) return true

  return venueHalls.includes(venueHall)
}

export const isTimeBlockVisibleForHall = (block, selectedHall = "all") => {
  if (!selectedHall || selectedHall === "all") return true
  return isVenueAllowedForBlock(block, selectedHall)
}

export const formatVenueScope = (block) => {
  if (!block || block.venueScope !== "SELECTED") return "All halls"
  const venueHalls = Array.isArray(block.venueHalls) ? block.venueHalls : []
  return venueHalls.length > 0 ? venueHalls.join(", ") : "Selected halls"
}

export const getTimeBlocksForDay = (timeBlocks = [], day, selectedHall = "all") => {
  return sortTimeBlocks(timeBlocks).filter((block) => {
    return toNumber(block.day) === toNumber(day) && isTimeBlockVisibleForHall(block, selectedHall)
  })
}

const getSessionStartMinutes = (session) => getKampalaMinutesFromDateTime(session?.startTime)
const getSessionEndMinutes = (session) => getKampalaMinutesFromDateTime(session?.toTime)

export const sessionOccupiesBlock = (session, block) => {
  if (!session || !block || !isSessionAllowedBlock(block)) return false

  const explicitBlockIds = toIdArray(session.timeBlockIds)
  if (block.$id && explicitBlockIds.length > 0) {
    return explicitBlockIds.includes(block.$id)
  }

  const sessionStart = getSessionStartMinutes(session)
  const sessionEnd = getSessionEndMinutes(session)
  const blockStart = toNumber(block.startMinutes, null)
  const blockEnd = toNumber(block.endMinutes, null)

  if (sessionStart === null || sessionEnd === null || blockStart === null || blockEnd === null) {
    return false
  }

  return sessionStart < blockEnd && sessionEnd > blockStart
}

export const getSessionsForBlock = (sessions = [], block, selectedHall = "all") => {
  if (!isSessionAllowedBlock(block)) return []

  return sessions
    .filter((session) => toNumber(session.day) === toNumber(block.day))
    .filter((session) => selectedHall === "all" || session.venueHall === selectedHall)
    .filter((session) => isVenueAllowedForBlock(block, session.venueHall))
    .filter((session) => sessionOccupiesBlock(session, block))
    .sort((a, b) => {
      const hallDiff = String(a.venueHall || "").localeCompare(String(b.venueHall || ""))
      if (hallDiff !== 0) return hallDiff
      return String(a.title || "").localeCompare(String(b.title || ""))
    })
}

export const getMatchingBlocksForSession = (session, timeBlocks = []) => {
  if (!session) return []

  return getTimeBlocksForDay(timeBlocks, session.day)
    .filter(isSessionAllowedBlock)
    .filter((block) => isVenueAllowedForBlock(block, session.venueHall))
    .filter((block) => sessionOccupiesBlock(session, block))
}

export const isSessionContinuationInBlock = (session, block, dayBlocks = []) => {
  if (!session || !block?.$id) return false
  const matchingBlocks = getMatchingBlocksForSession(session, dayBlocks)
  if (matchingBlocks.length <= 1) return false
  return matchingBlocks[0]?.$id !== block.$id
}

export const buildScheduleRows = ({ sessions = [], timeBlocks = [], day, selectedHall = "all" }) => {
  const visibleBlocks = getTimeBlocksForDay(timeBlocks, day, selectedHall)
  const allDayBlocks = getTimeBlocksForDay(timeBlocks, day)

  return visibleBlocks.map((block) => {
    const blockSessions = getSessionsForBlock(sessions, block, selectedHall)

    return {
      key: block.$id || `${block.day}-${block.startMinutes}-${block.endMinutes}-${block.label}`,
      block,
      startTime: block.startTime,
      toTime: block.endTime,
      label: block.label,
      type: block.type,
      allowSessions: isSessionAllowedBlock(block),
      sessions: blockSessions,
      sessionEntries: blockSessions.map((session) => ({
        session,
        isContinuation: isSessionContinuationInBlock(session, block, allDayBlocks),
      })),
    }
  })
}
