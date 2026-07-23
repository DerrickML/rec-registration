import { describe, expect, it } from "vitest"
import {
  DEFAULT_REPORTS_SITE_CONFIG,
  getReportsSiteConfig,
  parseConferenceWebsiteConfig,
} from "../lib/public-site-config"

describe("public report configuration", () => {
  it("uses safe defaults when a conference has no website configuration", () => {
    expect(getReportsSiteConfig({}).programCtaEnabled).toBe(true)
    expect(getReportsSiteConfig({}).pageTitle).toBe(DEFAULT_REPORTS_SITE_CONFIG.pageTitle)
  })

  it("reads report presentation settings from Appwrite JSON strings", () => {
    const conference = {
      socialsJson: JSON.stringify({
        reports: {
          programCtaEnabled: false,
          pageTitle: "REC publications",
        },
      }),
    }
    expect(getReportsSiteConfig(conference)).toMatchObject({
      programCtaEnabled: false,
      pageTitle: "REC publications",
      ctaButtonLabel: DEFAULT_REPORTS_SITE_CONFIG.ctaButtonLabel,
    })
  })

  it("ignores malformed website configuration without breaking public pages", () => {
    expect(parseConferenceWebsiteConfig({ socialsJson: "{bad-json" })).toEqual({})
  })
})
