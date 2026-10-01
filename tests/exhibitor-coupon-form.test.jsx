import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import ExhibitorApplicationForm from "../components/exhibitors/application-form"

const settings = {
  couponRequired: true,
  sectors: ["Private"],
  categories: ["Solar systems"],
  maxRepresentatives: 2,
  consentText: "Consent declaration"
}

const render = props => renderToStaticMarkup(
  React.createElement(ExhibitorApplicationForm, { settings, onSave: vi.fn(), ...props })
)

describe("public exhibitor coupon fields", () => {
  beforeAll(() => vi.stubGlobal("React", React))
  afterAll(() => vi.unstubAllGlobals())

  it("shows the required company code and preserves the pending draft code", () => {
    const html = render({ admissionPending: true, initialCouponCode: "COMPANY26" })
    expect(html).toContain("Company exhibition coupon *")
    expect(html).toContain('value="COMPANY26"')
    expect(html).toContain("One coupon allocation covers your company, not each representative.")
    expect(html).toContain("Submission does not guarantee approval.")
    expect(html).toContain("Check coupon")
  })

  it("labels a new company's code optional when the exhibition gate is off", () => {
    expect(render({ admissionPending: true, settings: { ...settings, couponRequired: false } }))
      .toContain("Company exhibition coupon (optional)")
  })

  it("does not ask admitted companies for another code", () => {
    const html = render({ admissionPending: false })
    expect(html).not.toContain('id="exh-coupon-code"')
    expect(html).not.toContain("Check coupon")
  })

  it("does not ask representatives to redeem a company code during personal editing", () => {
    const html = render({ admissionPending: false, representativesOnly: true, personalOnly: true })
    expect(html).toContain("My representative details")
    expect(html).not.toContain('id="exh-coupon-code"')
  })
})
