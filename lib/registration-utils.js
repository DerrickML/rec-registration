import crypto from "crypto"
export { sanitizeRichHtml } from "./sanitize-html"

export const REGISTRATION_TYPES = ["Attendee", "Exhibitor"]
export const OTP_TTL_MS = 10 * 60 * 1000
export const EDIT_TOKEN_TTL_MS = 15 * 60 * 1000
export const MAX_OTP_ATTEMPTS = 5

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email) {
  const normalized = String(email || "").trim().toLowerCase()
  if (!EMAIL_RE.test(normalized)) {
    throw httpError(400, "Please enter a valid email address")
  }
  return normalized
}

export function normalizeRegistrationType(type) {
  const value = String(type || "Attendee").trim()
  const match = REGISTRATION_TYPES.find((candidate) => candidate.toLowerCase() === value.toLowerCase())
  if (!match) {
    throw httpError(400, "Invalid registration type")
  }
  return match
}

export function deriveConferenceFields(conference) {
  if (!conference?.startDate || !conference?.endDate) {
    throw httpError(500, "Conference dates are not configured")
  }

  const start = new Date(conference.startDate)
  if (Number.isNaN(start.getTime())) {
    throw httpError(500, "Conference start date is invalid")
  }

  return {
    eventStart: conference.startDate,
    eventEnd: conference.endDate,
    conferenceYears: [start.getFullYear()],
  }
}

export function parseConferenceDays(days) {
  if (!days) return []
  if (Array.isArray(days)) return days
  try {
    const parsed = JSON.parse(days)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return String(days)
      .split(",")
      .map((day) => ({ label: day.trim() }))
      .filter((day) => day.label)
  }
}

export function allowedDayLabels(conference) {
  return parseConferenceDays(conference?.days).map((day) => day.label || day).filter(Boolean)
}

export function cleanForDatabase(data) {
  const cleaned = { ...data }
  Object.keys(cleaned).forEach((key) => {
    if (typeof cleaned[key] === "string") {
      const trimmed = cleaned[key].trim()
      cleaned[key] = trimmed === "" ? null : trimmed
    }
  })
  return cleaned
}

export function sanitizeRegistrantForEdit(registrant) {
  const allowed = [
    "email",
    "title",
    "firstName",
    "lastName",
    "otherName",
    "phone",
    "otherPhone",
    "otherEmail",
    "organization",
    "sector",
    "city",
    "stateRegion",
    "country",
    "registrationType",
    "visaLetterRequired",
    "additionalComments",
    "daysAttending",
    "passportNumber",
    "exhibitionDetails",
    "coupon",
    "conferenceYears",
  ]

  return allowed.reduce((result, key) => {
    if (Object.prototype.hasOwnProperty.call(registrant, key)) {
      result[key] = registrant[key]
    }
    return result
  }, {})
}

export function validateRegistrationInput(input, conference, { requireCoupon = true } = {}) {
  const registrationType = normalizeRegistrationType(input.registrationType)
  const email = normalizeEmail(input.email)
  const daysAttending = Array.isArray(input.daysAttending) ? input.daysAttending.filter(Boolean) : []
  const validDays = allowedDayLabels(conference)

  if (daysAttending.length === 0) {
    throw httpError(400, "Please select at least one day to attend")
  }

  if (validDays.length > 0) {
    const invalidDay = daysAttending.find((day) => !validDays.includes(day))
    if (invalidDay) {
      throw httpError(400, `Invalid day selected: ${invalidDay}`)
    }
  }

  const requiredCommon = ["organization", "city", "stateRegion", "country"]
  const missingCommon = requiredCommon.filter((field) => !String(input[field] || "").trim())
  if (missingCommon.length > 0) {
    throw httpError(400, `Please fill in all required fields: ${missingCommon.join(", ")}`)
  }

  if (input.visaLetterRequired && !String(input.passportNumber || "").trim()) {
    throw httpError(400, "Passport number is required when requesting a visa letter")
  }

  const couponCode = String(input.couponCode || input.coupon || "").trim()
  if (requireCoupon && !couponCode) {
    throw httpError(400, "Please enter a coupon code")
  }

  return {
    registrationType,
    email,
    daysAttending,
    couponCode,
  }
}

export function validateAttendeeInput(input) {
  const required = ["title", "firstName", "lastName", "phone"]
  const missing = required.filter((field) => !String(input[field] || "").trim())
  if (missing.length > 0) {
    throw httpError(400, `Please fill in all required fields: ${missing.join(", ")}`)
  }
}

export function validateExhibitorMembers(members) {
  if (!Array.isArray(members) || members.length === 0) {
    throw httpError(400, "At least one exhibitor representative is required")
  }

  const required = ["title", "firstName", "lastName", "email", "phone"]
  const seen = new Set()

  members.forEach((member, index) => {
    const missing = required.filter((field) => !String(member[field] || "").trim())
    if (missing.length > 0) {
      throw httpError(400, `Representative ${index + 1} is missing: ${missing.join(", ")}`)
    }

    const email = normalizeEmail(member.email)
    if (seen.has(email)) {
      throw httpError(400, "Each representative must have a unique email address")
    }
    seen.add(email)
  })
}

export function buildAttendeeRegistrant(input, conference, couponCode) {
  const derived = deriveConferenceFields(conference)
  return cleanForDatabase({
    email: normalizeEmail(input.email),
    conferenceYears: derived.conferenceYears,
    title: input.title,
    firstName: input.firstName,
    lastName: input.lastName,
    otherName: input.otherName,
    phone: input.phone,
    otherPhone: input.otherPhone,
    otherEmail: input.otherEmail,
    organization: input.organization,
    sector: Array.isArray(input.sector) ? input.sector : [],
    city: input.city,
    stateRegion: input.stateRegion,
    country: input.country,
    registrationType: "Attendee",
    visaLetterRequired: Boolean(input.visaLetterRequired),
    additionalComments: input.additionalComments,
    daysAttending: Array.isArray(input.daysAttending) ? input.daysAttending : [],
    eventStart: derived.eventStart,
    eventEnd: derived.eventEnd,
    passportNumber: input.passportNumber,
    visaLetterSent: false,
    exhibitionDetails: null,
    coupon: couponCode,
  })
}

export function buildExhibitorRegistrants(input, conference, couponCode) {
  const derived = deriveConferenceFields(conference)
  const shared = cleanForDatabase({
    organization: input.organization,
    sector: Array.isArray(input.sector) ? input.sector : [],
    city: input.city,
    stateRegion: input.stateRegion,
    country: input.country,
    registrationType: "Exhibitor",
    visaLetterRequired: Boolean(input.visaLetterRequired),
    additionalComments: input.additionalComments,
    daysAttending: Array.isArray(input.daysAttending) ? input.daysAttending : [],
    eventStart: derived.eventStart,
    eventEnd: derived.eventEnd,
    passportNumber: input.passportNumber,
    visaLetterSent: false,
    exhibitionDetails: input.exhibitionDetails,
    coupon: couponCode,
    conferenceYears: derived.conferenceYears,
  })

  return input.members.map((member) =>
    cleanForDatabase({
      ...shared,
      title: member.title,
      firstName: member.firstName,
      lastName: member.lastName,
      otherName: member.otherName,
      email: normalizeEmail(member.email),
      otherEmail: member.otherEmail,
      phone: member.phone,
      otherPhone: member.otherPhone,
    })
  )
}

export function hashSecret(value, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(String(value))
    .digest("hex")
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000))
}

export function generateToken() {
  return crypto.randomBytes(32).toString("base64url")
}

export function lockIdFor(scope) {
  return `lock_${crypto.createHash("sha256").update(scope).digest("hex").slice(0, 28)}`
}

export function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

export function isExpired(dateValue, now = new Date()) {
  return new Date(dateValue).getTime() <= now.getTime()
}
