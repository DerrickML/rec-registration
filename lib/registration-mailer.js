import { buildConfirmationEmail, buildOtpEmail } from "./confirmation-email"

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

export function createRegistrationMailer({ emailApiUrl, otpEmailApiUrl = emailApiUrl }) {
  return {
    sendOtp(email, otp, minutes) {
      return postEmail(otpEmailApiUrl, {
        email,
        subject: "Registration edit verification code",
        text: buildOtpEmail({ otp, minutes }),
        otp,
      })
    },

    sendConfirmation(registrationData, year) {
      return postEmail(emailApiUrl, {
        template: "registration-confirmation",
        year,
        email: registrationData.email,
        subject: `Renewable Energy Conference ${year || ""} & EXPO: Registration Confirmation`,
        text: buildConfirmationEmail(registrationData, year),
        eventEnd: registrationData.eventEnd,
        eventStart: registrationData.eventStart,
      })
    },
  }
}
