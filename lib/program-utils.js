/**
 * Format time with timezone conversion
 * Converts UTC time to Africa/Kampala (EAT) and user's local timezone
 */
export const formatTimeWithTimezone = (isoDateTime) => {
  if (!isoDateTime) return { kampala: "", local: "", timezone: "" }

  // Parse the UTC datetime string from Appwrite
  // Format: 2025-10-20T10:00:00.000+00:00
  const utcDate = new Date(isoDateTime)

  // Convert UTC to Africa/Kampala timezone (UTC+3)
  const kampalaTime = utcDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Kampala",
  })

  // Convert UTC to user's local timezone
  const localTime = utcDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  // Get user's timezone abbreviation
  const localTimezone =
    new Intl.DateTimeFormat("en-US", {
      timeZoneName: "short",
    })
      .formatToParts(utcDate)
      .find((part) => part.type === "timeZoneName")?.value || ""

  return {
    kampala: kampalaTime,
    local: localTime,
    timezone: localTimezone,
  }
}

/**
 * Format date range for display
 */
export const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }

  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${start.getFullYear()}`
}

/**
 * Get the actual date for a specific conference day
 */
export const getDayDate = (conferenceStartDate, dayNumber) => {
  if (!conferenceStartDate) return ""
  const startDate = new Date(conferenceStartDate)
  const dayDate = new Date(startDate)
  dayDate.setDate(startDate.getDate() + (dayNumber - 1))
  return dayDate.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Get sessions for a specific day
 */
export const getSessionsByDay = (sessions, day) => {
  return sessions.filter((session) => session.day === day)
}

/**
 * Filter sessions by venue hall
 */
export const getFilteredSessions = (daySessions, selectedHall) => {
  if (selectedHall === "all") return daySessions
  return daySessions.filter((session) => session.venueHall === selectedHall)
}

/**
 * Group sessions by time slot
 */
export const groupSessionsByTimeSlot = (daySessions) => {
  const grouped = {}
  daySessions.forEach((session) => {
    // Create a time-only key for grouping (ignoring date part)
    const startTime = new Date(session.startTime)
    const endTime = new Date(session.toTime)

    // Create unique key based on time only
    const timeKey = `${startTime.toISOString()}-${endTime.toISOString()}`

    if (!grouped[timeKey]) {
      grouped[timeKey] = {
        startTime: session.startTime,
        toTime: session.toTime,
        sessions: [],
      }
    }
    grouped[timeKey].sessions.push(session)
  })
  return grouped
}
