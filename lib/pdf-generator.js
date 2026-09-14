import { jsPDF } from "jspdf"
import { loadLogos } from "./logo-utils"
import {
  buildScheduleRows, formatBlockTimeRange, formatVenueScope, getBlockTypeLabel,
  getSessionSpanLabel, getTimeBlocksForDay, isSessionAllowedBlock,
} from "./schedule-utils"

const COLORS = {
  primary: [23, 111, 145], gold: [239, 167, 79], ink: [24, 45, 57],
  muted: [82, 100, 112], line: [220, 229, 233], white: [255, 255, 255],
  paleBlue: [237, 246, 250], paleGold: [255, 244, 228], neutral: [240, 243, 245],
}
const FONT = "NotoSans"
const FONT_FILES = {
  normal: "NotoSans-Regular.ttf", bold: "NotoSans-Bold.ttf",
  italic: "NotoSans-Italic.ttf", bolditalic: "NotoSans-BoldItalic.ttf",
}
let fontsPromise

const cleanText = (value) => String(value ?? "")
  .normalize("NFC")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\ufeff]/g, "")
  .replace(/[\u2010-\u2015]/g, "-")
  .replace(/\p{Extended_Pictographic}|[\uFE0E\uFE0F\u200D]/gu, "")
  .replace(/[\ue000-\uf8ff]/g, "")
  .replace(/\s+/g, " ")

const fontStyle = ({ bold, italic }) => bold ? (italic ? "bolditalic" : "bold") : (italic ? "italic" : "normal")

// Parse inert HTML into paragraphs and inline runs; never trim individual text nodes.
export function parseProgramRichText(html, documentObject = globalThis.document) {
  if (!html) return []
  if (!documentObject) throw new Error("A document is required to parse program descriptions")
  const template = documentObject.createElement("template")
  template.innerHTML = String(html)
  const blocks = []
  let runs = []
  let marker = ""
  let indent = 0
  const flush = () => {
    if (runs.some(run => run.text.trim())) blocks.push({ runs, marker, indent })
    runs = []
    marker = ""
  }
  const append = (text, style) => {
    // Rich editors also produce plain paragraphs with pasted Word bullet glyphs.
    if (!marker && !runs.some(run => run.text.trim()) && /^\s*[\u2022\u25cf\u00b7\uf0b7]\s+/.test(text)) {
      marker = "bullet"
      indent = Math.max(indent, 5)
      text = text.replace(/^\s*[\u2022\u25cf\u00b7\uf0b7]\s+/, "")
    }
    const value = cleanText(text)
    if (value) runs.push({ text: value, ...style })
  }
  const visit = (node, style = {}, depth = 0) => {
    if (node.nodeType === 3) return append(node.textContent, style)
    if (node.nodeType !== 1) return
    const tag = node.tagName.toLowerCase()
    if (["script", "style", "noscript", "iframe", "svg"].includes(tag)) return
    if (node.hidden || node.getAttribute("aria-hidden") === "true") return
    if (tag === "br") return flush()
    if (tag === "ul" || tag === "ol") {
      flush()
      let number = Number.parseInt(node.getAttribute("start"), 10) || 1
      Array.from(node.children).filter(child => child.tagName === "LI").forEach(child => {
        const explicitNumber = Number.parseInt(child.getAttribute("value"), 10)
        if (Number.isFinite(explicitNumber)) number = explicitNumber
        indent = Math.min(depth + 1, 5) * 5
        marker = tag === "ol" ? String(number++) + "." : "bullet"
        Array.from(child.childNodes).forEach(item => visit(item, style, depth + 1))
        flush()
      })
      indent = Math.min(depth, 5) * 5
      return
    }
    const paragraph = /^(p|div|h[1-6]|blockquote|tr)$/.test(tag)
    if (paragraph && runs.some(run => run.text.trim())) flush()
    const nextStyle = {
      bold: style.bold || ["strong", "b", "th"].includes(tag) || /^h[1-6]$/.test(tag) || /^(bold|[6-9]00)$/.test(node.style.fontWeight),
      italic: style.italic || ["em", "i"].includes(tag) || node.style.fontStyle === "italic",
    }
    Array.from(node.childNodes).forEach(child => visit(child, nextStyle, depth))
    if (["td", "th"].includes(tag) && node.nextElementSibling) append(" | ", {})
    if (paragraph) {
      flush()
      indent = Math.min(depth, 5) * 5
    }
  }
  Array.from(template.content.childNodes).forEach(node => visit(node))
  flush()
  return blocks
}

// Measure independently of drawing. Every token uses its own exact font and size.
export function layoutProgramText(doc, runs, width, size, family = FONT) {
  const lines = []
  let line = []
  let used = 0
  let space = null
  const measure = (text, style) => {
    doc.setFont(family, style)
    doc.setFontSize(size)
    return doc.getTextWidth(text)
  }
  const flush = () => {
    if (line.length) lines.push(line)
    line = []
    used = 0
    space = null
  }
  const push = (text, style, length) => {
    line.push({ text, style, width: length })
    used += length
  }
  runs.forEach(run => {
    const style = fontStyle(run)
    for (const token of cleanText(run.text).match(/\s+|\S+/g) || []) {
      if (/^\s+$/.test(token)) {
        if (line.length) space = { style, width: measure(" ", style) }
        continue
      }
      const tokenWidth = measure(token, style)
      if (line.length && used + (space?.width || 0) + tokenWidth > width) flush()
      if (space && line.length) push(" ", space.style, space.width)
      space = null
      if (tokenWidth <= width) push(token, style, tokenWidth)
      else {
        // Long URLs and unbroken words must also stay inside the text column.
        for (const character of Array.from(token)) {
          const length = measure(character, style)
          if (line.length && used + length > width) flush()
          push(character, style, length)
        }
      }
    }
  })
  flush()
  return lines
}

export function getProgramJustificationSpacing(line, width, isLastLine = false) {
  if (isLastLine) return 0
  const spaces = line.filter(run => run.text === " ").length
  if (!spaces) return 0
  const remaining = width - line.reduce((sum, run) => sum + run.width, 0)
  // Do not create rivers of whitespace before unusually long words or URLs.
  const extra = remaining / spaces
  return extra > 0 && extra <= 3 ? extra : 0
}

export function layoutProgramBadges(doc, badges, width) {
  const rows = []
  let row = { badges: [], height: 0 }
  let x = 0
  badges.filter(badge => badge.text).forEach(badge => {
    const runs = [{ text: cleanText(badge.text), bold: true }]
    const lines = layoutProgramText(doc, runs, width - 6, 8)
    const badgeWidth = Math.max(...lines.map(line => line.reduce((sum, run) => sum + run.width, 0)), 0) + 6
    if (row.badges.length && x + badgeWidth > width) {
      rows.push(row)
      row = { badges: [], height: 0 }
      x = 0
    }
    const height = lines.length * 4.3 + 3
    row.badges.push({ ...badge, lines, x, width: badgeWidth, height })
    row.height = Math.max(row.height, height)
    x += badgeWidth + 2
  })
  if (row.badges.length) rows.push(row)
  return rows
}

async function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all(Object.entries(FONT_FILES).map(async ([style, file]) => {
      const response = await fetch("/fonts/noto-sans/" + file)
      if (!response.ok) throw new Error("Unable to load program fonts. Please retry the download.")
      const bytes = new Uint8Array(await response.arrayBuffer())
      let binary = ""
      for (let index = 0; index < bytes.length; index += 8192) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
      }
      return [style, btoa(binary)]
    })).then(Object.fromEntries).catch(error => { fontsPromise = null; throw error })
  }
  return fontsPromise
}

function formatDate(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Kampala" })
    : "Date to be confirmed"
}

function formatTime(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kampala" })
    : "TBC"
}

function dayDate(conference, day) {
  const start = new Date(conference?.startDate)
  if (Number.isNaN(start.getTime())) return "Date to be confirmed"
  start.setUTCDate(start.getUTCDate() + day - 1)
  return formatDate(start)
}

export function createProgramDocument(conference, program, sessions = [], timeBlocks = [], { fonts, logos = {}, documentObject = globalThis.document } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true, putOnlyUsedFonts: true })
  for (const [style, file] of Object.entries(FONT_FILES)) {
    if (!fonts?.[style]) throw new Error("Missing program font: " + style)
    doc.addFileToVFS(file, fonts[style])
    doc.addFont(file, FONT, style)
  }
  doc.setProperties({ title: (conference?.title || "REC & EXPO") + " - Conference program", author: "National Renewable Energy Platform", subject: program?.title || "Conference program" })
  const margin = 18
  const pageWidth = doc.internal.pageSize.getWidth()
  const width = pageWidth - margin * 2
  const bottom = 277
  let y = 35
  let context = "Conference program"
  const pageContexts = []
  const style = (size = 9, bold = false, color = COLORS.ink) => {
    doc.setFont(FONT, bold ? "bold" : "normal")
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }
  const newPage = () => {
    doc.addPage()
    pageContexts[doc.getNumberOfPages() - 1] = context
    y = 46
  }
  const ensure = height => { if (y + height > bottom) newPage() }
  const write = (runs, { size = 9.5, color = COLORS.ink, indent = 0, inset = 0, marker = "", gap = 2, keep = 0, justify = false, background, accent } = {}) => {
    const contentWidth = width - indent - inset * 2
    const lines = layoutProgramText(doc, runs, contentWidth, size)
    const leading = size * 0.352778 * 1.55
    ensure(Math.min(lines.length, 2) * leading + keep)
    lines.forEach((line, index) => {
      ensure(leading)
      if (background) {
        doc.setFillColor(...background)
        doc.rect(margin, y - size * 0.352778 - 1.2, width, leading + 0.05, "F")
        if (accent) {
          doc.setFillColor(...accent)
          doc.rect(margin, y - size * 0.352778 - 1.2, 1, leading + 0.05, "F")
        }
      }
      if (index === 0 && marker) {
        style(size, false, color)
        if (marker === "bullet") {
          doc.setFillColor(...color)
          doc.circle(margin + inset + indent - 3, y - 1, 0.55, "F")
        } else doc.text(marker, margin + inset + indent - 1.5, y, { align: "right" })
      }
      const extraSpace = justify ? getProgramJustificationSpacing(line, contentWidth, index === lines.length - 1) : 0
      let x = margin + inset + indent
      for (const run of line) {
        doc.setFont(FONT, run.style)
        doc.setFontSize(size)
        doc.setTextColor(...color)
        doc.text(run.text, x, y)
        x += run.width + (run.text === " " ? extraSpace : 0)
      }
      y += leading
    })
    y += gap
  }
  const text = (value, options = {}) => write([{ text: cleanText(value), bold: options.bold }], options)
  const rich = (html, options = {}) => {
    for (const block of parseProgramRichText(html, documentObject)) {
      const isHeading = block.runs.filter(run => run.text.trim()).every(run => run.bold)
      write(block.runs, { ...options, keep: isHeading ? 12 : 0, justify: options.justify && !block.marker && !isHeading, indent: block.indent, marker: block.marker })
    }
  }
  const rule = () => {
    doc.setDrawColor(...COLORS.line)
    doc.setLineWidth(0.3)
    doc.line(margin, y, margin + width, y)
    y += 7
  }
  const badges = (items, keep = 18) => {
    const rows = layoutProgramBadges(doc, items, width)
    ensure(rows.reduce((sum, row) => sum + row.height + 2, 0) + keep)
    rows.forEach(row => {
      ensure(row.height + 5)
      row.badges.forEach(badge => {
        doc.setFillColor(...badge.background)
        doc.roundedRect(margin + badge.x, y - 3, badge.width, badge.height, 1, 1, "F")
        badge.lines.forEach((line, index) => {
          style(8, true, badge.color)
          doc.text(line.map(run => run.text).join(""), margin + badge.x + 3, y + 1 + index * 4.3)
        })
      })
      y += row.height + 2
    })
    y += 3
  }
  const band = (items, { background = COLORS.primary, accent = COLORS.gold, keep = 12 } = {}) => {
    const height = items.reduce((sum, item) => sum + layoutProgramText(doc, [{ text: cleanText(item.text), bold: item.bold }], width - 12, item.size).length * item.size * 0.352778 * 1.55 + (item.gap || 0), 0) + 9
    ensure(Math.min(height + keep, bottom - 46))
    // Paint one complete band when it fits; unusually long content remains page-safe.
    if (height <= bottom - y) {
      doc.setFillColor(...background)
      doc.roundedRect(margin, y - 4, width, height, 1.5, 1.5, "F")
      doc.setFillColor(...accent)
      doc.rect(margin, y - 2.5, 1.2, height - 3, "F")
      y += 3
      items.forEach(item => text(item.text, { ...item, inset: 6, gap: item.gap || 0 }))
      y += 6
    } else {
      items.forEach(item => text(item.text, { ...item, inset: 6, gap: 0, background, accent }))
      y += 6
    }
  }

  const days = [...new Set([
    ...Array.from({ length: Math.max(0, Number(program?.daysCount) || 0) }, (_, index) => index + 1),
    ...sessions.map(session => Number(session.day)), ...timeBlocks.map(block => Number(block.day)),
  ])].filter(day => Number.isInteger(day) && day > 0).sort((a, b) => a - b)
  y = 50
  band([
    { text: "PROGRAM & SESSION GUIDE", size: 9, bold: true, color: COLORS.paleGold, gap: 6 },
    { text: conference?.title || "Renewable Energy Conference & Expo", size: 26, bold: true, color: COLORS.white, gap: 4 },
    { text: program?.title || "Conference program", size: 11, color: COLORS.white, gap: 2 },
  ], { keep: 0 })
  y += 6
  text("WHEN & WHERE", { size: 8, bold: true, color: COLORS.primary, gap: 2 })
  text(formatDate(conference?.startDate) + " - " + formatDate(conference?.endDate), { size: 12, bold: true, gap: 2 })
  text([conference?.venue, conference?.location].filter(Boolean).join(" / ") || "Venue to be confirmed", { size: 10, color: COLORS.muted, gap: 7 })
  badges([
    { text: days.length + " conference days", background: COLORS.primary, color: COLORS.white },
    { text: sessions.length + " sessions", background: COLORS.paleBlue, color: COLORS.primary },
    { text: new Set(sessions.map(session => session.venueHall).filter(Boolean)).size + " venues", background: COLORS.paleGold, color: COLORS.ink },
  ], 0)
  text("DAY INDEX", { size: 9, bold: true, color: COLORS.primary, gap: 4 })
  const indexLinks = []
  days.forEach(day => {
    ensure(14)
    doc.setFillColor(...(day % 2 ? COLORS.paleBlue : COLORS.neutral))
    doc.rect(margin, y - 4, width, 11, "F")
    style(9, true, COLORS.primary)
    doc.text("DAY " + String(day).padStart(2, "0"), margin + 4, y + 2)
    style(9, false, COLORS.ink)
    doc.text(dayDate(conference, day), margin + 30, y + 2)
    indexLinks.push({ day, page: doc.getNumberOfPages(), y: y + 2 })
    y += 13
  })
  y += 4
  text("All times are East Africa Time (Africa/Kampala, UTC+3).", { size: 8.5, bold: true, color: COLORS.primary })
  text("Full session details appear at their first time slot. Later slots identify continuing sessions.", { size: 8.5, color: COLORS.muted })
  text("Program subject to change. Visit rec.nrep.ug/program for the latest schedule.", { size: 8.5, color: COLORS.muted })
  const dayIndex = []

  for (const day of days) {
    const daySessions = sessions.filter(session => Number(session.day) === day)
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)) || String(a.venueHall).localeCompare(String(b.venueHall)))
    const blocks = getTimeBlocksForDay(timeBlocks, day)
    if (!daySessions.length && !blocks.length) continue
    context = "Day " + day + " / " + dayDate(conference, day)
    newPage()
    y = 48
    dayIndex.push({ day, page: doc.getNumberOfPages() })
    doc.setFillColor(...COLORS.paleBlue)
    doc.rect(margin, y - 4, width, 24, "F")
    doc.setFillColor(...COLORS.gold)
    doc.rect(margin, y - 4, 34, 24, "F")
    style(10, true)
    doc.text("DAY", margin + 5, y + 3)
    style(22, true)
    doc.text(String(day).padStart(2, "0"), margin + 5, y + 14)
    style(12, true, COLORS.primary)
    doc.text(dayDate(conference, day), margin + 40, y + 5)
    style(9, false, COLORS.muted)
    doc.text(daySessions.length + " sessions  |  All times EAT (UTC+3)", margin + 40, y + 13)
    y += 31
    const groups = new Map()
    daySessions.forEach(session => {
      const key = session.startTime + "/" + session.toTime
      if (!groups.has(key)) groups.set(key, { startTime: session.startTime, toTime: session.toTime, sessions: [] })
      groups.get(key).sessions.push(session)
    })
    const rows = blocks.length ? buildScheduleRows({ sessions: daySessions, timeBlocks: blocks, day }) : [...groups.values()]
    // Keep legacy sessions visible even if their old block references no longer resolve.
    const scheduled = new Set(rows.flatMap(row => row.sessions))
    const unmatched = daySessions.filter(session => !scheduled.has(session))
    if (unmatched.length) rows.push({ label: "Additional published sessions", sessions: unmatched })
    for (const row of rows) {
      context = "Day " + day + " / " + dayDate(conference, day)
      const block = row.block
      const range = block ? formatBlockTimeRange(block) : row.startTime ? formatTime(row.startTime) + " - " + formatTime(row.toTime) : "See session times below"
      const label = block?.label || (block ? getBlockTypeLabel(block.type) : row.label || "Sessions")
      const activity = block && !isSessionAllowedBlock(block)
      band([
        { text: range + "  /  EAT", size: 12, bold: true, color: activity ? COLORS.ink : COLORS.white },
        { text: label, size: 10, color: activity ? COLORS.ink : COLORS.white },
      ], { background: activity ? COLORS.paleGold : COLORS.primary, keep: activity ? 10 : 35 })
      if (block) text(formatVenueScope(block), { size: 8.5, color: COLORS.muted, gap: 4 })
      if (activity) {
        if (block.notes) rich(block.notes, { justify: true })
        y += 5
        continue
      }
      const entries = row.sessionEntries || row.sessions.map(session => ({ session, isContinuation: false }))
      if (!entries.length) text("Session details to be confirmed.", { color: COLORS.muted, gap: 5 })
      for (const { session, isContinuation } of entries) {
        context = "Day " + day + " / " + (session.venueHall || "Session") + " / " + (session.title || "Session details")
        ensure(32)
        const span = session.sessionSpanType && session.sessionSpanType !== "CUSTOM" ? getSessionSpanLabel(session.sessionSpanType) : ""
        const headingHeight = layoutProgramText(doc, [{ text: session.title || "Untitled session", bold: true }], width - 8, 13).length * 13 * 0.352778 * 1.55
        badges([
          { text: session.venueHall || "Venue to be confirmed", background: COLORS.primary, color: COLORS.white },
          { text: isContinuation ? "Continues" : span, background: COLORS.neutral, color: COLORS.ink },
          { text: formatTime(session.startTime) + " - " + formatTime(session.toTime), background: COLORS.neutral, color: COLORS.ink },
          { text: session.theme, background: COLORS.paleGold, color: COLORS.ink },
        ], headingHeight + 12)
        text(session.title || "Untitled session", { size: 13, bold: true, color: COLORS.primary, background: COLORS.paleBlue, accent: COLORS.primary, inset: 4, gap: 4, keep: 7 })
        if (isContinuation) {
          text("Continues from an earlier block. See the first occurrence for the full session details.", { color: COLORS.muted, gap: 7 })
          continue
        }
        if (session.organizer) write([{ text: "Organizer: ", bold: true }, { text: session.organizer }], { size: 9, gap: 4 })
        if (session.preamble) rich(session.preamble, { justify: true })
        if (session.speakers) {
          ensure(14)
          text("SPEAKERS & PARTICIPANTS", { size: 8, bold: true, color: COLORS.primary, background: COLORS.paleBlue, inset: 3, gap: 2, keep: 14 })
          rich(session.speakers, { size: 9, color: COLORS.muted })
        }
        y += 3
        if (y + 7 <= bottom) rule()
      }
      y += 3
    }
  }

  // Add furniture last so font changes cannot affect content measurement.
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setFillColor(...COLORS.primary)
    doc.rect(0, 0, pageWidth, 29, "F")
    doc.setFillColor(...COLORS.gold)
    doc.rect(0, 29, pageWidth, 1.5, "F")
    doc.setFillColor(...COLORS.white)
    doc.roundedRect(margin, 4, 44, 21, 1.5, 1.5, "F")
    let logoX = margin + 3
    for (const logo of [logos.memd, logos.nrep].filter(Boolean)) {
      const properties = doc.getImageProperties(logo)
      const scale = Math.min(16 / properties.width, 16 / properties.height)
      doc.addImage(logo, "PNG", logoX, 6.5, properties.width * scale, properties.height * scale)
      logoX += 20
    }
    if (!logos.memd && !logos.nrep) {
      style(9, true, COLORS.primary)
      doc.text("MEMD | NREP", margin + 22, 16, { align: "center" })
    }
    style(16, true, COLORS.white)
    doc.text("Conference Program", margin + width, 16, { align: "right" })
    style(8, true, COLORS.paleGold)
    doc.text("REC & EXPO", margin + width, 23, { align: "right" })
    if (pageContexts[page - 1]) {
      style(7, false, COLORS.muted)
      const line = doc.splitTextToSize(cleanText(pageContexts[page - 1]), width)[0]
      doc.text(line, margin, 37)
    }
    doc.setFillColor(...COLORS.paleBlue)
    doc.rect(0, 283, pageWidth, 14, "F")
    doc.setFillColor(...COLORS.primary)
    doc.rect(margin + width - 22, 283, 22, 14, "F")
    style(7.5, false, COLORS.muted)
    doc.text("rec.nrep.ug/program  |  All times EAT (UTC+3)", margin, 290)
    style(8, true, COLORS.white)
    doc.text(page + " / " + pageCount, margin + width - 11, 290, { align: "center" })
  }
  dayIndex.forEach(({ day, page }) => {
    doc.outline?.add(null, "Day " + day + " - " + dayDate(conference, day), { pageNumber: page })
    const entry = indexLinks.find(item => item.day === day)
    if (entry) {
      doc.setPage(entry.page)
      style(9, true, COLORS.primary)
      doc.text("Page " + page, margin + width - 4, entry.y, { align: "right" })
      doc.link(margin, entry.y - 6, width, 11, { pageNumber: page })
    }
  })
  return doc
}

export async function generateProgramPDF(conference, program, sessions, timeBlocks = []) {
  const [fonts, logos] = await Promise.all([loadFonts(), loadLogos()])
  const doc = createProgramDocument(conference, program, sessions, timeBlocks, { fonts, logos })
  const title = conference?.title || "Conference"
  const year = new Date(conference?.startDate).getFullYear()
  const filename = title.replace(/[^a-z0-9]/gi, "_") + "_Program" + (Number.isFinite(year) ? "_" + year : "") + ".pdf"
  doc.save(filename)
  return { success: true, filename }
}
