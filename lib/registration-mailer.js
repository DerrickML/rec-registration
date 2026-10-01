import { buildConfirmationEmail, buildOtpEmail } from "./confirmation-email"
import { registrationEmailSubject } from "./registration-email-template.mjs"
import { fetchHrPortalJson } from "./hr-portal-api"

async function appEmailBlock(conference, type) {
  if (!conference?.$id) return { html: "", text: "" }
  try { return await fetchHrPortalJson(`/api/v1/rec/apps/email?${new URLSearchParams({ conferenceId: conference.$id, type })}`, { signal: AbortSignal.timeout(10000) }) }
  catch { return { html: "", text: "" } }
}

async function postEmail(emailApiUrl, payload) {
  const response = await fetch(emailApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Email API failed: ${response.status} ${text}`)
  }

  return true
}

export function createRegistrationMailer({ emailApiUrl, otpEmailApiUrl = emailApiUrl, getAppEmailBlock = appEmailBlock }) {
  return {
    async sendOtp(email, otp, minutes, conference) {
      const block = await getAppEmailBlock(conference, "otp")
      return postEmail(otpEmailApiUrl, {
        email,
        subject: "Registration edit verification code",
        text: buildOtpEmail({ otp, minutes, appEmailHtml: block.html }),
        otp,
      })
    },

    async sendConfirmation(registrationData, year, conference = {}) {
      const block = await getAppEmailBlock(conference, "registration")
      return postEmail(emailApiUrl, {
        template: "registration-confirmation",
        year,
        email: registrationData.email,
        subject: registrationEmailSubject(year, "self"),
        text: buildConfirmationEmail(registrationData, year, conference, block.html),
        eventEnd: registrationData.eventEnd,
        eventStart: registrationData.eventStart,
      })
    },
  }
}
