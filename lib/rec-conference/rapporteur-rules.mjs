import { RAPPORTEUR_TEMPLATE_DOCUMENT } from "./rapporteur-template-document.mjs"

export const RAPPORTEUR_HALLS = Object.freeze([
  "Achwa",
  "Addis",
  "Katonga",
  "Kazinga",
  "Kyoga",
  "Nile",
  "Victoria",
  "Rwizi",
  "E-Cooking Pavilion",
])

export const RAPPORTEUR_APPROVER_NAME = "Emmanuel Nabaho"
export const RAPPORTEUR_ARCHIVE_NAME = "Mukisa Nicholas"
export const RAPPORTEUR_FOLDER_KEY = "rec26:rapporteur"
export const RAPPORTEUR_FOLDER_LABEL = "REC26 & EXPO Rapporteur Reports"

const HALL_ALIASES = new Map([
  ["ecookingpavilion", "E-Cooking Pavilion"],
  ["ecookingpavillion", "E-Cooking Pavilion"],
])

const HALL_KEYS = RAPPORTEUR_HALLS
  .map((hall) => [hall, hall.toLowerCase().replace(/[^a-z0-9]+/g, "")])
  .sort((left, right) => right[1].length - left[1].length)

export function normalizeHall(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, "")
  if (HALL_ALIASES.has(key)) return HALL_ALIASES.get(key)
  const exact = HALL_KEYS.find(([, hallKey]) => hallKey === key)
  if (exact) return exact[0]
  const prefixed = HALL_KEYS.find(([, hallKey]) => key.startsWith(hallKey))
  return prefixed ? prefixed[0] : raw
}

export function clockTime(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleTimeString("en-UG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Kampala",
  })
}

export function hallsMatch(left, right) {
  const a = normalizeHall(left).toLowerCase()
  const b = normalizeHall(right).toLowerCase()
  return Boolean(a) && a === b
}

export function emptyReportContent() {
  return {
    purpose: "",
    composition: [],
    contributions: [],
    challenges: "",
    opportunities: "",
    recommendations: [],
    qa: [],
    outcomes: "",
    commitments: [],
  }
}

function text(value, max = 4000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max)
}

function block(value, max = 8000) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, max)
}

function rows(value, mapRow, limit = 40) {
  if (!Array.isArray(value)) return []
  return value.slice(0, limit).map(mapRow).filter((row) => Object.values(row).some(Boolean))
}

export function sanitizeReportContent(input = {}) {
  const source = input && typeof input === "object" ? input : {}
  return {
    documentHtml: String(source.documentHtml || "").slice(0, 48000),
    purpose: block(source.purpose),
    composition: rows(source.composition, (row) => ({
      title: text(row?.title, 40),
      fullName: text(row?.fullName, 160),
      designation: text(row?.designation, 160),
      organisation: text(row?.organisation, 160),
      role: text(row?.role, 80),
    })),
    contributions: rows(source.contributions, (row) => ({
      speaker: text(row?.speaker, 200),
      presentation: text(row?.presentation, 300),
      evidence: block(row?.evidence),
      challenges: block(row?.challenges),
    })),
    challenges: block(source.challenges),
    opportunities: block(source.opportunities),
    recommendations: rows(source.recommendations, (row) => ({
      recommendation: text(row?.recommendation, 500),
      recipient: text(row?.recipient, 200),
      organization: text(row?.organization, 200),
      timeline: text(row?.timeline, 120),
    })),
    qa: rows(source.qa, (row) => ({
      question: text(row?.question, 500),
      contributor: text(row?.contributor, 200),
      response: block(row?.response),
      status: row?.status === "Unresolved" ? "Unresolved" : row?.status === "Resolved" ? "Resolved" : "",
    })),
    outcomes: block(source.outcomes),
    commitments: rows(source.commitments, (row) => ({
      commitment: text(row?.commitment, 500),
      person: text(row?.person, 200),
      timeline: text(row?.timeline, 120),
    })),
  }
}

export function parseReportContent(raw) {
  if (!raw) return emptyReportContent()
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    return sanitizeReportContent(parsed)
  } catch {
    return emptyReportContent()
  }
}

export function purposeFromDocument(html) {
  const text = String(html || "")
    .replace(/<\/?(strong|b|em|i|u|s|span|mark|a|sub|sup|code)\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&rsquo;|&#8217;/gi, "’")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
  const start = text.match(/purpose\s+of\s+(the\s+)?session\s*:?/i)
  if (!start) return ""
  const rest = text.slice(start.index + start[0].length)
  const end = rest.search(/session\s+composition/i)
  return (end < 0 ? rest.slice(0, 8000) : rest.slice(0, end))
    .replace(/Briefly state the session[’']s objectives[\s\S]*?opening address\)?/i, "")
    .trim()
}

export function reportContentReady(content) {
  if (block(content?.purpose)) return true
  return Boolean(purposeFromDocument(content?.documentHtml))
}

const EDITABLE = new Set(["draft", "returned"])

export function canEditReport(status) {
  return EDITABLE.has(String(status || ""))
}

export function canSubmitReport(status) {
  return EDITABLE.has(String(status || ""))
}

export function canReviewReport(status) {
  return String(status || "") === "submitted"
}

export function ordinalDate(date) {
  const day = date.getUTCDate()
  const suffix = day % 10 === 1 && day !== 11 ? "st"
    : day % 10 === 2 && day !== 12 ? "nd"
      : day % 10 === 3 && day !== 13 ? "rd"
        : "th"
  const month = date.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })
  return `${day}${suffix} ${month} ${date.getUTCFullYear()}`
}

export function sessionDateLabel(session, conferenceStart) {
  const explicit = String(session?.date || session?.sessionDate || "").trim()
  if (explicit) return explicit
  const day = Number(session?.day)
  const start = String(conferenceStart || "").slice(0, 10)
  if (!start || !Number.isFinite(day) || day < 1) return ""
  const date = new Date(`${start}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ""
  date.setUTCDate(date.getUTCDate() + day - 1)
  return ordinalDate(date)
}

export function speakersToComposition(speakers) {
  let list = speakers
  if (typeof speakers === "string") {
    const trimmed = speakers.trim()
    if (!trimmed) return []
    try {
      list = JSON.parse(trimmed)
    } catch {
      return []
    }
  }
  if (!Array.isArray(list)) return []
  return sanitizeReportContent({
    composition: list.map((item) => ({
      title: item?.title || item?.salutation || "",
      fullName: item?.name || item?.fullName || "",
      designation: item?.designation || "",
      organisation: item?.organization || item?.organisation || item?.org || "",
      role: item?.sessionRole || item?.speakerRole || item?.role || "",
    })),
  }).composition
}

export function parseMediaLinks(raw) {
  if (!raw) return []
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => ({
        label: text(item?.label || "Session media", 160),
        url: String(item?.url || "").trim(),
      }))
      .filter((item) => /^https:\/\//i.test(item.url))
      .slice(0, 30)
  } catch {
    return []
  }
}

export function mediaLinksFromText(raw) {
  return String(raw || "")
    .split(/\s+/)
    .map((url) => url.trim())
    .filter((url) => /^https:\/\//i.test(url))
    .slice(0, 30)
    .map((url) => ({ label: "Session media", url }))
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function paragraphText(paragraph) {
  return paragraph
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function fillParagraph(html, label, value) {
  const extra = String(value || "").trim()
  if (!extra) return html
  return html.replace(/<p\b[^>]*>[\s\S]*?<\/p>/g, (paragraph) => {
    if (paragraphText(paragraph) !== label) return paragraph
    return paragraph.replace(/<\/p>$/, ` ${escapeHtml(extra)}</p>`)
  })
}

function hallParagraph(hall) {
  const line = "Achwa ☐ |Addis ☐ | Kyoga ☐ | Nile ☐ | Victoria ☐ | Rwizi ☐ | E-Cooking Pavillion ☐|"
  const names = ["Achwa", "Addis", "Kyoga", "Nile", "Victoria", "Rwizi", "E-Cooking Pavillion"]
  const marked = names.reduce((text, name) => (
    hallsMatch(name, hall) ? text.replace(`${name} ☐`, `${name} ☑`) : text
  ), line)
  return `<p><strong>Hall: </strong>${escapeHtml(marked)}</p>`
}

export function rapporteurTemplateBody(report = {}) {
  let html = RAPPORTEUR_TEMPLATE_DOCUMENT
  html = fillParagraph(html, "Session Title:", report.title)
  html = fillParagraph(html, "Date:", report.sessionDate)
  html = fillParagraph(html, "Start Time:", report.startTime)
  html = fillParagraph(html, "End Time:", report.endTime)
  html = fillParagraph(html, "Rapporteur’s Full Name:", report.authorName)
  html = fillParagraph(html, "Phone Number and Email Address:", [report.authorPhone, report.authorEmail].filter(Boolean).join(" · "))
  html = html.replace(/<p><strong>Hall:<\/strong>[\s\S]*?<\/p>/, hallParagraph(report.hall))
  return html
}

function withoutTemplateMark(html) {
  return String(html || "")
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (figure) => (figure.includes("nrep-mark.png") ? "" : figure))
    .replace(/<p\b[^>]*>\s*(?:<img\b[^>]*nrep-mark\.png[^>]*>\s*)+<\/p>/gi, "")
    .replace(/<img\b[^>]*nrep-mark\.png[^>]*>/gi, "")
}

export function rapporteurDocumentHtml(report = {}) {
  const saved = String(report.content?.documentHtml || "")
  const body = saved && !/<h1|<h2/i.test(saved) ? saved : rapporteurTemplateBody(report)
  return withoutTemplateMark(body)
}

function prepareWordBody(html) {
  return String(html || "")
    .replace(/<colgroup\b[^>]*>[\s\S]*?<\/colgroup>/gi, "")
    .replace(/<table\b([^>]*)>/gi, (_tag, attrs) => {
      const cleaned = String(attrs).replace(/\sstyle="[^"]*"/gi, "").replace(/\swidth="[^"]*"/gi, "")
      return `<table${cleaned} style="width:100%;border-collapse:collapse">`
    })
}

export function renderReportHtml(report = {}) {
  const content = report.content || parseReportContent(report.contentJson)
  const media = Array.isArray(report.mediaLinks) ? report.mediaLinks : parseMediaLinks(report.mediaLinksJson)
  const body = prepareWordBody(rapporteurDocumentHtml({ ...report, content }))
  const mediaHtml = media.length
    ? `<p><strong>Session media</strong></p>${media.map((item) => `<p><a href="${escapeHtml(item.url)}">${escapeHtml(item.label || item.url)}</a></p>`).join("")}`
    : ""
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<title>${escapeHtml(report.title || "REC26 rapporteur report")}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: 8.5in 11in;
    margin: 1in 1in 1in 1in;
    mso-header-margin: 0.5in;
    mso-footer-margin: 0.5in;
    mso-header: h1;
    mso-footer: f1;
  }
  div.Section1 { page: Section1; }
  body, p, li, td, th { font-family: Calibri, sans-serif; font-size: 12pt; color: #000; }
  p { margin: 0 0 8pt; line-height: 1.15; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0 8pt; }
  td, th { border: 0.5pt solid #000; padding: 3pt 5pt; vertical-align: top; }
  a { color: #000; text-decoration: underline; }
</style>
</head>
<body>
<div style="mso-element:header" id="h1"><p style="text-align:center;margin:0"><img src="/reporting/nrep-mark.png" alt="" width="123" height="124" style="width:32.5mm;height:32.7mm"></p></div>
<div style="mso-element:footer" id="f1"><p style="text-align:right;margin:0"><!--[if supportFields]><span style="mso-element:field-begin"></span> PAGE <span style="mso-element:field-separator"></span><![endif]-->1<!--[if supportFields]><span style="mso-element:field-end"></span><![endif]--></p></div>
<div class="Section1">
${body}
${mediaHtml}
</div>
</body>
</html>`
}

export function reportFileName(title) {
  const clean = String(title || "session")
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "session"
  return `REC26 Rapporteur - ${clean}.doc`
}

export async function downloadRapporteurReport(report = {}) {
  let html = renderReportHtml(report)
  if (typeof window === "undefined") return
  try {
    const response = await fetch("/reporting/nrep-mark.png")
    if (response.ok) {
      const bytes = await response.arrayBuffer()
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(new Blob([bytes]))
      })
      html = html.replaceAll("/reporting/nrep-mark.png", String(dataUrl))
    }
  } catch {
    // The report still downloads if the mark cannot be embedded.
  }
  const url = URL.createObjectURL(new Blob([html], { type: "application/msword" }))
  const link = document.createElement("a")
  link.href = url
  link.download = reportFileName(report.title)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
