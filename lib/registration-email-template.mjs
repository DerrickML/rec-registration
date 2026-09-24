const DEFAULT_SITE = "https://rec.nrep.ug"
const NREP_LOGO_URL = "https://appwrite.nrep.ug/v1/storage/buckets/67e0415e002bfc51380a/files/nrep_logo_v2/view?project=66bcc8450005201fa1af"
const MINISTRY_LOGO_URL = "https://appwrite.nrep.ug/v1/storage/buckets/67e0415e002bfc51380a/files/68f0fd3a0021ecab38b5/view?project=66bcc8450005201fa1af"

const MESSAGES = {
  self: {
    label: "Online registration",
    heading: "You're registered.",
    subject: "Registration confirmed",
    preview: "Your registration is confirmed. Review your details and attendance days.",
    introduction: "Thank you for registering. We look forward to welcoming you to the conference. Your confirmed registration details are below.",
  },
  admin: {
    label: "Registration from the REC team",
    heading: "Your registration is ready.",
    subject: "Your registration from the REC team",
    preview: "The REC team has confirmed your registration. Please review your details.",
    introduction: "The REC team has recorded the following conference registration details for you. Please review them and update anything that needs correcting.",
  },
  import: {
    label: "Attendee list registration",
    heading: "Welcome to REC.",
    subject: "Your attendee registration is confirmed",
    preview: "Your attendee-list registration is confirmed. Please check your details and attendance days.",
    introduction: "Your details were included in an attendee list submitted to the REC team. Your conference registration has now been confirmed. Please review the information below, as these details were provided on your behalf.",
  },
}

const html = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;")
const text = (value, fallback = "Not provided") => html((Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value ?? "").trim()) || fallback)
const messageFor = (source) => MESSAGES[Object.hasOwn(MESSAGES, source) ? source : "self"]

function safeUrl(value) {
  try {
    const url = new URL(value)
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return url
  } catch {}
  return null
}

function editionName(year) {
  const value = Number(year)
  return Number.isInteger(value) && value >= 2000 && value <= 2200 ? `REC ${value} & EXPO` : "REC & EXPO"
}

export function registrationEmailSubject(year, source = "self") {
  return `${editionName(year)}: ${messageFor(source).subject}`
}

function detailRow(label, value) {
  return `<tr>
    <th class="detail-label" scope="row" align="left" valign="top" width="34%" style="width:34%;padding:12px 16px 12px 0;border-bottom:1px solid #e3eaf0;color:#526572;font-size:13px;line-height:1.6;font-weight:400;">${html(label)}</th>
    <td class="detail-value" valign="top" style="padding:12px 0;border-bottom:1px solid #e3eaf0;color:#1a303d;font-size:14px;line-height:1.6;font-weight:600;overflow-wrap:anywhere;word-break:break-word;">${value}</td>
  </tr>`
}

function detailSection(heading, rows) {
  return `<h2 style="margin:28px 0 4px;font-size:17px;line-height:1.5;font-weight:700;color:#176F91;">${html(heading)}</h2>
    <table class="details-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;table-layout:fixed;"><tbody>${rows.join("")}</tbody></table>`
}

function conferenceDates(conference) {
  const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Kampala" })
  const format = (value) => {
    if (!value) return ""
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? formatter.format(date) : ""
  }
  const start = format(conference.startDate)
  const end = format(conference.endDate)
  return start && end && start !== end ? `${start} - ${end}` : start || end
}

// Kept portable so the HR and public REC applications use the same email layout and copy.
export function renderRegistrationEmail(data, { year = null, source = "self", publicSiteUrl = DEFAULT_SITE, conference = {}, sponsorshipPackageUrl = null } = {}) {
  const message = messageFor(source)
  const site = safeUrl(publicSiteUrl) || new URL(DEFAULT_SITE)
  const registrationUrl = html(new URL("/register", site).href)
  const fullName = [data.title, data.firstName, data.otherName, data.lastName].filter(Boolean).join(" ")
  const name = conference.title || `Renewable Energy Conference${year ? ` ${year}` : ""} & Expo`
  const contact = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(conference.contactEmail || "") ? conference.contactEmail : "info@nrep.ug"
  const contactUrl = `mailto:${encodeURIComponent(contact)}`
  const dates = conferenceDates(conference)
  const venue = [conference.venue, conference.location].filter(Boolean).join(", ")
  const sponsor = data.sponsorOrganization ? text(data.sponsorOrganization) + (data.sponsorSector ? ` (${text(data.sponsorSector)})` : "") : ""
  const packageUrl = safeUrl(sponsorshipPackageUrl || conference.sponsorshipPackageUrl)
  const days = Array.isArray(data.daysAttending) ? data.daysAttending.filter(Boolean) : []
  const personalRows = [
    detailRow("Full name", text(fullName)),
    detailRow("Email", text(data.email)),
    ...(data.otherEmail ? [detailRow("Other email", text(data.otherEmail))] : []),
    detailRow("Phone", text(data.phone)),
    ...(data.otherPhone ? [detailRow("Other phone", text(data.otherPhone))] : []),
    detailRow("Organisation", text(data.organization)),
    detailRow("Sector", text(data.sector)),
    ...(sponsor ? [detailRow("Sponsored by", sponsor)] : []),
    detailRow("Your location", text([data.city, data.stateRegion, data.country].filter(Boolean))),
  ]
  const attendanceRows = [
    detailRow("Registration type", text(data.registrationType)),
    detailRow("Days attending", days.length ? days.map((day) => `<div style="margin-bottom:4px;">${html(day)}</div>`).join("") : text(null)),
    detailRow("Visa letter requested", data.visaLetterRequired ? "Yes" : "No"),
    ...(String(data.registrationType || "").toLowerCase() === "sponsor" && packageUrl ? [detailRow("Sponsorship package", `<a href="${html(packageUrl.href)}" style="color:#176F91;text-decoration:underline;">View sponsorship package</a>`)] : []),
  ]
  const extraRows = [
    ...(String(data.registrationType || "").toLowerCase() === "exhibitor" && data.exhibitionDetails ? [detailRow("Exhibition details", text(data.exhibitionDetails))] : []),
    ...(data.additionalComments ? [detailRow("Additional comments", text(data.additionalComments))] : []),
  ]

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${html(registrationEmailSubject(year, source))}</title>
  <style>
    body, table, td, th { font-family:Arial,Helvetica,sans-serif;letter-spacing:0; }
    @media only screen and (max-width:600px) {
      .email-outer { padding:12px 8px !important; }
      .email-pad { padding-left:20px !important;padding-right:20px !important; }
      .email-heading { font-size:27px !important; }
      .detail-label, .detail-value { display:block !important;width:100% !important;box-sizing:border-box !important; }
      .detail-label { padding:12px 0 2px !important;border-bottom:0 !important; }
      .detail-value { padding:0 0 12px !important; }
      .edit-button { display:block !important;text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#edf2f6;color:#1a303d;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;color:#edf2f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${html(message.preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#edf2f6;border-collapse:collapse;"><tr><td class="email-outer" align="center" style="padding:32px 16px;">
    <!--[if mso]><table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #dce5eb;border-collapse:separate;border-spacing:0;border-radius:8px;overflow:hidden;">
      <tr><td class="email-pad" style="padding:24px 36px;background:#ffffff;">
        <p style="margin:0 0 18px;text-align:center;font-size:11px;line-height:1.5;font-weight:700;color:#526572;text-transform:uppercase;">Jointly organised by</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>
          <td width="50%" valign="top" align="center" style="padding:0 10px;color:#1a303d;">
            <img src="${html(NREP_LOGO_URL)}" width="68" height="68" alt="NREP" style="display:block;border:0;width:68px;height:68px;margin:0 auto 12px;">
            <span style="display:block;font-size:12px;line-height:1.5;font-weight:700;">National Renewable<br>Energy Platform</span>
          </td>
          <td width="50%" valign="top" align="center" style="padding:0 10px;color:#1a303d;">
            <img src="${html(MINISTRY_LOGO_URL)}" width="68" height="68" alt="Ministry of Energy and Mineral Development" style="display:block;border:0;width:68px;height:68px;margin:0 auto 12px;">
            <span style="display:block;font-size:12px;line-height:1.5;font-weight:700;">Ministry of Energy and<br>Mineral Development</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td height="5" style="height:5px;line-height:5px;font-size:1px;background:#EFA74F;">&nbsp;</td></tr>
      <tr><td class="email-pad" style="padding:30px 36px 32px;background:#176F91;color:#ffffff;">
        <p style="margin:0 0 12px;font-size:12px;line-height:1.5;font-weight:700;text-transform:uppercase;color:#ffffff;">${html(message.label)}</p>
        <h1 class="email-heading" style="margin:0 0 12px;font-size:32px;line-height:1.25;font-weight:700;color:#ffffff;">${html(message.heading)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#ffffff;">${html(name)}</p>
      </td></tr>
      <tr><td class="email-pad" style="padding:28px 36px 32px;">
        <p style="margin:0 0 12px;font-size:16px;line-height:1.6;font-weight:700;">Hello ${text(fullName, "Attendee")},</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.8;color:#526572;">${html(message.introduction)}</p>
        ${dates || venue ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:3px solid #EFA74F;background:#f0f6fa;"><tr><td style="padding:14px 16px;font-size:14px;line-height:1.7;color:#1a303d;">
          ${dates ? `<strong>${html(dates)}</strong><br>` : ""}${venue ? html(venue) : ""}${dates ? '<div style="font-size:12px;color:#526572;">Conference dates / Africa/Kampala (UTC+3)</div>' : ""}
        </td></tr></table>` : ""}
        ${detailSection("Registration details", personalRows)}
        ${detailSection("Your attendance", attendanceRows)}
        ${extraRows.length ? detailSection("Additional information", extraRows) : ""}
        <h2 style="margin:28px 0 10px;font-size:18px;line-height:1.5;color:#1a303d;">Keep your details up to date</h2>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.8;color:#526572;">Open the registration page and enter the email address shown above. We will send you a one-time verification code before you can edit your details. Updates are available while public registration is open.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td bgcolor="#176F91" style="border-radius:6px;background:#176F91;mso-padding-alt:14px 22px;">
          <a class="edit-button" href="${registrationUrl}" style="display:inline-block;padding:14px 22px;border:1px solid #176F91;border-radius:6px;color:#ffffff;background:#176F91;font-size:14px;line-height:1.5;font-weight:700;text-decoration:none;">View or edit registration</a>
        </td></tr></table>
        <p style="margin:14px 0 0;font-size:12px;line-height:1.7;color:#526572;overflow-wrap:anywhere;word-break:break-word;">Or open this link:<br><a href="${registrationUrl}" style="color:#176F91;text-decoration:underline;">${registrationUrl}</a></p>
        <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e3eaf0;font-size:13px;line-height:1.8;color:#526572;">Keep this email for reference and add the attached invitation to your calendar. Conference badge details, when issued, are sent separately.</p>
        <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#1a303d;">We look forward to welcoming you.<br><strong>The REC &amp; EXPO Organising Team</strong></p>
      </td></tr>
      <tr><td class="email-pad" style="padding:20px 36px;background:#f5f8fa;border-top:1px solid #e3eaf0;font-size:12px;line-height:1.8;color:#526572;">
        Need assistance, or received this unexpectedly?<br>
        Contact the REC team at <a href="${html(contactUrl)}" style="color:#176F91;font-weight:700;text-decoration:underline;">${html(contact)}</a>.
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr></table>
</body>
</html>`
}
