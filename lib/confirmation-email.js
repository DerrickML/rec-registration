import { getSiteUrl } from "./seo"
import { renderRegistrationEmail } from "./registration-email-template.mjs"

const escapeHtml = (str) => {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function buildOtpEmail({ otp, minutes }) {
  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
      <h2 style="color:#0B7186;">Registration edit verification</h2>
      <p>Use this code to verify your email address and edit your conference registration:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${escapeHtml(otp)}</p>
      <p>This code expires in ${Number(minutes)} minutes. If you did not request this, ignore this email.</p>
    </div>
  `
}

export function buildConfirmationEmail(data, year = null, conference = {}) {
  return renderRegistrationEmail(data, { year, source: "self", publicSiteUrl: getSiteUrl(), conference })
}
