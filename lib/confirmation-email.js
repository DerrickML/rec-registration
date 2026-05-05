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

export function buildConfirmationEmail(data, year = null) {
  const sector = Array.isArray(data.sector) ? data.sector : []
  const daysAttending = Array.isArray(data.daysAttending) ? data.daysAttending : []
  const conferenceYears = Array.isArray(data.conferenceYears) ? data.conferenceYears : []

  const safe = {
    title: escapeHtml(data.title),
    firstName: escapeHtml(data.firstName),
    otherName: escapeHtml(data.otherName),
    lastName: escapeHtml(data.lastName),
    email: escapeHtml(data.email),
    otherEmail: escapeHtml(data.otherEmail),
    phone: escapeHtml(data.phone),
    otherPhone: escapeHtml(data.otherPhone),
    organization: escapeHtml(data.organization),
    city: escapeHtml(data.city),
    stateRegion: escapeHtml(data.stateRegion),
    country: escapeHtml(data.country),
    registrationType: escapeHtml(data.registrationType),
    exhibitionDetails: escapeHtml(data.exhibitionDetails),
    additionalComments: escapeHtml(data.additionalComments),
    sector: sector.map(escapeHtml),
    daysAttending: daysAttending.map(escapeHtml),
    conferenceYears: conferenceYears.map(escapeHtml),
  }

  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; background-color: #f9f9f9; padding: 20px; border-radius: 6px; color: #333;">
      <h2 style="color: #0B7186; margin-top: 0;">Renewable Energy Conference ${escapeHtml(year)} & EXPO Registration Confirmation</h2>
      <p style="line-height: 1.5;">Thank you for registering. Below are your details:</p>
      <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-top: 15px;">
        <tbody>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Full Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.title} ${safe.firstName} ${safe.otherName || ""} ${safe.lastName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.email}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Other Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.otherEmail || "N/A"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.phone}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Other Phone</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.otherPhone || "N/A"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Organization</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.organization}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Sector</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.sector.length ? safe.sector.join(", ") : "N/A"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>City</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.city}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>State/Region</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.stateRegion}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Country</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.country}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Registration Type</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.registrationType}</td></tr>
          ${
            String(data.registrationType || "").toLowerCase() === "exhibitor"
              ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Exhibition Details</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.exhibitionDetails || "N/A"}</td></tr>`
              : ""
          }
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Days Attending</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.daysAttending.length ? safe.daysAttending.join(", ") : "N/A"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Visa Letter Required</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.visaLetterRequired ? "Yes" : "No"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Additional Comments</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.additionalComments || "N/A"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Conference Attended</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${safe.conferenceYears.length ? safe.conferenceYears.join(", ") : "N/A"}</td></tr>
        </tbody>
      </table>
      <p style="margin-top: 20px; line-height: 1.5;">We look forward to seeing you at the event.</p>
    </div>
  `
}
