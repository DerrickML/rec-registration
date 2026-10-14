export const DEFAULT_CLOSED_MESSAGE =
  "Registration is currently closed. We are not accepting new registrations at this time."
export const DEFAULT_NOT_OPEN_MESSAGE =
  "Registration has not opened yet. Please check back for updates."

function text(value) {
  return typeof value === "string" ? value.trim() : ""
}

export function registrationNoticeSettings(value) {
  try {
    const website = typeof value === "string" ? JSON.parse(value) : value
    const settings = website?.registrationNotice
    return {
      state: settings?.state === "not_yet_open" ? "not_yet_open" : "closed",
      openingMessage: text(settings?.openingMessage),
    }
  } catch {
    return { state: "closed", openingMessage: "" }
  }
}

export function resetOpeningNotice(value) {
  try {
    const website = typeof value === "string" ? JSON.parse(value) : value
    if (!website || Array.isArray(website) || typeof website.registrationNotice !== "object" ||
      !website.registrationNotice || Array.isArray(website.registrationNotice)) return value
    const updated = {
      ...website,
      registrationNotice: { ...website.registrationNotice, state: "closed" },
    }
    return typeof value === "string" ? JSON.stringify(updated) : updated
  } catch {
    return value
  }
}

function isLegacyOpeningPlaceholder(message) {
  return /^registration\s+(?:is\s+)?(?:opening\s+soon|will\s+open\s+soon|not\s+(?:yet\s+open|open\s+yet))[.!\s]*$/i.test(message)
}

export function conferenceRegistrationNotice(conference) {
  if (!conference) {
    return {
      state: "unavailable",
      title: "Registration unavailable",
      message: "No active conference is available for registration. Please check back later.",
    }
  }
  if (conference.registrationOpen === true) {
    return {
      state: "open",
      title: "Registration open",
      message: conference.couponRequired === true
        ? "A coupon is required for new registrations."
        : "Registration is open. A coupon is optional.",
    }
  }
  const settings = registrationNoticeSettings(conference.socialsJson)
  const closedMessage = text(conference.regClosedMessage)
  if (settings.state === "not_yet_open") {
    return {
      state: "not_yet_open",
      title: "Registration not yet open",
      message: settings.openingMessage ||
        (isLegacyOpeningPlaceholder(closedMessage) ? closedMessage : DEFAULT_NOT_OPEN_MESSAGE),
    }
  }
  return {
    state: "closed",
    title: "Registration closed",
    // Old opening-soon placeholders must not override an explicitly closed state.
    message: closedMessage && !isLegacyOpeningPlaceholder(closedMessage)
      ? closedMessage
      : DEFAULT_CLOSED_MESSAGE,
  }
}
