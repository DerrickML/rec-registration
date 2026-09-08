export const REC_PHOTOS = {
  expo: {
    src: "/images/rec/expo-aerial.webp",
    alt: "Exhibition pavilions and visitors at REC25 & EXPO",
  },
  launch: {
    src: "/images/rec/conference-speaker.webp",
    alt: "Delegates at a publication launch during REC25 & EXPO",
  },
  speaker: {
    src: "/images/rec/conference-panel.webp",
    alt: "A speaker addressing REC25 & EXPO",
  },
  community: {
    src: "/images/rec/conference-community.webp",
    alt: "REC25 & EXPO delegates on the conference stage",
  },
  panel: {
    src: "/images/rec/panel-discussion.webp",
    alt: "A panel discussion at REC25 & EXPO",
  },
  audience: {
    src: "/images/rec/audience-participation.webp",
    alt: "An audience member contributing to a REC25 discussion",
  },
}

export function conferenceDate(value, options = {}) {
  if (!value) return "Date to be confirmed"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date to be confirmed"
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kampala",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(date)
}

export function conferenceDateRange(start, end) {
  if (!start) return "Dates to be confirmed"
  if (!end || conferenceDate(start) === conferenceDate(end))
    return conferenceDate(start)
  return `${conferenceDate(start)} - ${conferenceDate(end)}`
}

export function conferenceDays(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return String(value)
      .split(",")
      .filter((day) => day.trim())
      .map((day) => ({ label: day.trim() }))
  }
}

export function conferenceExtras(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}
