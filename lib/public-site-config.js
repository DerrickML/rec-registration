export const DEFAULT_REPORTS_SITE_CONFIG = Object.freeze({
  programCtaEnabled: true,
  pageTitle: "Previous conference reports",
  pageDescription: "Read official reports, proceedings, and outcomes from earlier REC editions.",
  ctaEyebrow: "From the previous edition",
  ctaTitle: "Continue with the conference report",
  ctaDescription: "Review the outcomes, recommendations, and highlights from the previous REC edition.",
  ctaButtonLabel: "View conference report",
})

export function parseConferenceWebsiteConfig(conference) {
  const value = conference?.socialsJson
  if (value && typeof value === "object") return value
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

export function getReportsSiteConfig(conference) {
  const websiteConfig = parseConferenceWebsiteConfig(conference)
  return {
    ...DEFAULT_REPORTS_SITE_CONFIG,
    ...(websiteConfig.reports || {}),
  }
}
