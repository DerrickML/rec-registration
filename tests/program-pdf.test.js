import { describe, expect, it } from "vitest"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { jsPDF } from "jspdf"
import { createProgramDocument, getProgramJustificationSpacing, layoutProgramBadges, layoutProgramText, parseProgramRichText } from "../lib/pdf-generator"

const require = createRequire(import.meta.url)
const { JSDOM } = createRequire(require.resolve("isomorphic-dompurify"))("jsdom")
const documentObject = new JSDOM("").window.document
const styles = { normal: "Regular", bold: "Bold", italic: "Italic", bolditalic: "BoldItalic" }
const fonts = Object.fromEntries(Object.entries(styles).map(([style, name]) => [
  style, readFileSync(new URL(`../public/fonts/noto-sans/NotoSans-${name}.ttf`, import.meta.url)).toString("base64"),
]))
function makeDoc() {
  const doc = new jsPDF()
  Object.entries(styles).forEach(([style, name]) => {
    doc.addFileToVFS(name + ".ttf", fonts[style])
    doc.addFont(name + ".ttf", "NotoSans", style)
  })
  return doc
}

describe("program PDF rich text", () => {
  it("converts pasted bullets into hanging lists without indenting later paragraphs", () => {
    const blocks = parseProgramRichText('<p>\u25cf\tGovernment &amp; Energy Regulators: officials.</p><p><span style="font-weight:700;font-style:italic">Partners</span></p>', documentObject)
    expect(blocks[0].marker).toBe("bullet")
    expect(blocks[0].indent).toBe(5)
    expect(blocks[0].runs[0].text).toBe("Government & Energy Regulators: officials.")
    expect(blocks[1].indent).toBe(0)
    expect(blocks[1].runs[0]).toMatchObject({ bold: true, italic: true })
  })

  it("preserves spaces and formatting across inline HTML boundaries", () => {
    const blocks = parseProgramRichText("<p>Meet <strong>Government &amp; Energy Regulators</strong>: officials <em>and partners</em>.</p>", documentObject)
    expect(blocks[0].runs.map(run => run.text).join("")).toBe("Meet Government & Energy Regulators: officials and partners.")
    expect(blocks[0].runs.find(run => run.text.startsWith("Government")).bold).toBe(true)
    expect(blocks[0].runs.find(run => run.text === "and partners").italic).toBe(true)
  })

  it("keeps nested list indentation, numbering and paragraph boundaries", () => {
    const blocks = parseProgramRichText('<ol start="3"><li><p>First</p><ul><li><strong>Nested</strong> details</li></ul></li><li>Second</li></ol><p>After list</p>', documentObject)
    expect(blocks.map(block => [block.marker, block.indent])).toEqual([["3.", 5], ["bullet", 10], ["4.", 5], ["", 0]])
    expect(blocks[1].runs.map(run => run.text).join("")).toBe("Nested details")
  })

  it("ignores executable markup while retaining Unicode names and symbols", () => {
    const blocks = parseProgramRichText('<script>alert(1)</script><style>body{}</style><p>Ren\u00e9e &amp; CO\u2082</p>', documentObject)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].runs.map(run => run.text).join("")).toBe("Ren\u00e9e & CO\u2082")
  })

  it("measures every wrapped run using the font and size that will draw it", () => {
    const doc = makeDoc()
    const runs = [{ text: "Government & Energy Regulators: ", bold: true }, { text: "Officials from the Ministry of Energy, Agriculture, labor, local government, statutory regulatory authorities. ".repeat(10) }, { text: "Industry stakeholders and investors", bold: true, italic: true }]
    doc.setFontSize(30)
    const lines = layoutProgramText(doc, runs, 60, 9.5)
    expect(lines.length).toBeGreaterThan(10)
    for (const line of lines) {
      expect(line.reduce((total, run) => total + run.width, 0)).toBeLessThanOrEqual(60.001)
      for (const run of line) {
        doc.setFont("NotoSans", run.style)
        doc.setFontSize(9.5)
        expect(run.width).toBeCloseTo(doc.getTextWidth(run.text), 8)
      }
    }
    expect(lines.map(line => line.map(run => run.text).join("")).join(" ")).toBe(runs.map(run => run.text).join(""))
  })

  it("wraps long unbroken URLs within the content width without losing characters", () => {
    const text = "https://example.org/" + "conference".repeat(40)
    const lines = layoutProgramText(makeDoc(), [{ text }], 40, 9.5)
    expect(lines.flat().map(run => run.text).join("")).toBe(text)
    expect(lines.every(line => line.reduce((sum, run) => sum + run.width, 0) <= 40.001)).toBe(true)
  })

  it("justifies mixed-format lines to the right margin without changing glyph widths", () => {
    const lines = layoutProgramText(makeDoc(), [{ text: "A renewable energy conference brings ", bold: true }, { text: "together government, industry and development partners. ".repeat(4) }], 80, 9.5)
    lines.forEach((line, index) => {
      const extra = getProgramJustificationSpacing(line, 80, index === lines.length - 1)
      const naturalWidth = line.reduce((sum, run) => sum + run.width, 0)
      const renderedWidth = naturalWidth + line.filter(run => run.text === " ").length * extra
      if (index === lines.length - 1) expect(extra).toBe(0)
      else expect(renderedWidth).toBeCloseTo(80, 8)
      expect(extra).toBeGreaterThanOrEqual(0)
      expect(line.map(run => run.text).join("")).not.toContain("  ")
    })
  })

  it("does not stretch single-word lines or create oversized gaps", () => {
    expect(getProgramJustificationSpacing([{ text: "Conference", width: 15 }], 80)).toBe(0)
    expect(getProgramJustificationSpacing([{ text: "One", width: 6 }, { text: " ", width: 1 }, { text: "two", width: 6 }], 80)).toBe(0)
  })

  it("wraps venue, time, span and long theme badges inside the page margins", () => {
    const labels = ["Victoria Hall (Main Auditorium)", "Morning half", "08:00 AM - 01:00 PM", "Sustainable energy and " + "regional partnerships ".repeat(15)]
    const rows = layoutProgramBadges(makeDoc(), labels.map(text => ({ text })), 174)
    expect(rows.length).toBeGreaterThan(1)
    for (const row of rows) {
      row.badges.forEach((badge, index) => {
        expect(badge.x + badge.width).toBeLessThanOrEqual(174.001)
        expect(badge.height).toBeLessThanOrEqual(row.height)
        if (index > 0) expect(badge.x).toBeGreaterThan(row.badges[index - 1].x + row.badges[index - 1].width)
        expect(badge.lines.map(line => line.map(run => run.text).join("")).join(" ")).toBe(badge.text.trim())
      })
    }
  })

  it("paginates long descriptions and includes days containing only activities", () => {
    const doc = createProgramDocument(
      { title: "REC 2026", startDate: "2026-10-18T21:00:00Z", endDate: "2026-10-20T21:00:00Z" },
      { daysCount: 2 },
      [{ day: "1", title: "Long session", venueHall: "Main Hall", organizer: "An organization ".repeat(20), preamble: "<p><strong>Government & Energy Regulators:</strong> Officials and stakeholders.</p>".repeat(80) }],
      [{ $id: "lunch", day: 2, type: "LUNCH", allowSessions: false, startMinutes: 780, endMinutes: 840, label: "Lunch" }],
      { fonts, documentObject }
    )
    expect(doc.getNumberOfPages()).toBeGreaterThan(3)
    expect(doc.outline.root.children.map(item => item.title)).toEqual(["Day 1 - 19 October 2026", "Day 2 - 20 October 2026"])
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(10000)
  })
})
