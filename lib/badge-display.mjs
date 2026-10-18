const defaults = Object.freeze({ showCategory: false, showAttendanceDates: false, showRecId: true, showHashtag: true })

export function digitalBadgeDisplay(badge) {
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof badge?.digitalDisplay?.[key] === "boolean" ? badge.digitalDisplay[key] : fallback]))
}

export function digitalBadgeImageUrl(token, badge) {
  const display = digitalBadgeDisplay(badge)
  const revision = Object.keys(defaults).map(key => display[key] ? "1" : "0").join("")
  return `/api/badges/${encodeURIComponent(token)}/print?${new URLSearchParams({ format: "png", profile: "digital", v: revision })}`
}
