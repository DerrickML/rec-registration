export async function fetchScannerJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options.headers } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(payload.error || "Request failed"), { status: response.status, code: payload.code || "", details: payload.details || {} })
  return payload
}

export const scannerTypes = { conference_entry: "Conference entrance", lunch: "Lunch", session_entry: "Session entrance", custom: "Other event" }
export const scannerPhases = { open: "Open now", upcoming: "Upcoming", ended: "Ended", unavailable: "Unavailable" }
export function scannerPhase(event, now = Date.now()) {
  if (!event || event.isActive === false) return "unavailable"
  if (event.startTime && Date.parse(event.startTime) > now) return "upcoming"
  if (event.endTime && Date.parse(event.endTime) < now) return "ended"
  if (Number.isFinite(Date.parse(event.startTime)) || Number.isFinite(Date.parse(event.endTime))) return "open"
  if (event.availabilityCode === "event_ended" && !event.endTime) return "ended"
  if (event.availabilityCode === "event_not_started" && !event.startTime) return "upcoming"
  return event.isCurrentlyOpen === false ? "unavailable" : "open"
}
export function scannerDate(value, time = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not scheduled"
  return new Date(value.length === 10 ? `${value}T00:00:00+03:00` : value).toLocaleString("en-UG", { timeZone: "Africa/Kampala", ...(time ? { hour: "2-digit", minute: "2-digit", hour12: true } : { day: "numeric", month: "short", year: "numeric" }) })
}
