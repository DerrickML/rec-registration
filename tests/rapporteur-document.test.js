import { describe, expect, it } from "vitest"
import {
  emptyReportContent,
  parseReportContent,
  rapporteurDocumentHtml,
  renderReportHtml,
  sanitizeReportContent,
} from "../lib/rec-conference/rapporteur-rules.mjs"

const report = {
  $id: "existing-report", title: "Financing Clean Cooking at Scale", hall: "Victoria",
  authorName: "Jemimah", sessionDate: "19 October 2026", startTime: "08:30", endTime: "10:30",
}

describe("existing rapporteur document preservation", () => {
  it.each(["h1", "h2", "H1", "H2"])("keeps authored %s headings and their writing instead of generating the starting template", (heading) => {
    const html = `<${heading}>Existing report heading</${heading}><p>Jemimah's original morning report.</p><table><tbody><tr><td>Existing findings</td></tr></tbody></table>`
    const content = { documentHtml: html, purpose: "A previous structured purpose" }
    expect(rapporteurDocumentHtml({ ...report, content })).toBe(html)
    expect(renderReportHtml({ ...report, content })).toContain("Jemimah's original morning report.")
    expect(renderReportHtml({ ...report, content })).not.toContain("A previous structured purpose")
  })

  it("preserves the entire long HTML body through normalization, JSON reads, editor display, and export", () => {
    const html = `<h1>Long report</h1>${"<p>Additional evidence and decisions 📝.</p>".repeat(2100)}<h2>Final outcomes</h2><p>FINAL SAVED SENTENCE</p>`
    expect(html.length).toBeGreaterThan(60000)
    const normalized = sanitizeReportContent({ documentHtml: html })
    const parsed = parseReportContent(JSON.stringify(normalized))
    expect(normalized.documentHtml).toBe(html)
    expect(parsed.documentHtml).toBe(html)
    expect(rapporteurDocumentHtml({ ...report, content: parsed })).toBe(html)
    expect(renderReportHtml({ ...report, contentJson: JSON.stringify(normalized) })).toContain(html)
    expect(renderReportHtml({ ...report, content: parsed })).toContain("FINAL SAVED SENTENCE")
  })

  it("retains full structured legacy fields and table rows beyond the former limits", () => {
    const longBlock = `${"Detailed existing evidence. ".repeat(420)}FINAL BLOCK TEXT`
    const longCell = `${"Detailed recommendation. ".repeat(40)}FINAL CELL TEXT`
    const original = {
      purpose: `${longBlock} PURPOSE`,
      composition: Array.from({ length: 65 }, (_, index) => ({ title: "Dr", fullName: `SPEAKER ${index}`, designation: `DESIGNATION ${index}`, organisation: `ORGANISATION ${index}`, role: `ROLE ${index}` })),
      contributions: [{ speaker: `SPEAKER NAME ${longCell}`, presentation: `PRESENTATION ${longCell}`, evidence: `${longBlock} EVIDENCE`, challenges: `${longBlock} SPEAKER CHALLENGES` }],
      challenges: `${longBlock} CHALLENGES`,
      opportunities: `${longBlock} OPPORTUNITIES`,
      recommendations: [{ recommendation: longCell, recipient: "RECIPIENT", organization: "RESPONSIBLE ORGANISATION", timeline: "RECOMMENDATION TIMELINE" }],
      qa: [{ question: longCell, contributor: "QUESTION CONTRIBUTOR", response: `${longBlock} RESPONSE`, status: "Unresolved" }],
      outcomes: `${longBlock} OUTCOMES`,
      commitments: [{ commitment: longCell, person: "COMMITMENT OWNER", timeline: "COMMITMENT TIMELINE" }],
    }
    const before = JSON.stringify(original)
    const parsed = parseReportContent(before)
    expect(parsed).toEqual({ documentHtml: "", ...original })
    const html = rapporteurDocumentHtml({ ...report, content: parsed })
    for (const expected of [
      "Financing Clean Cooking at Scale", "Jemimah", "FINAL BLOCK TEXT PURPOSE",
      "SPEAKER 64", "DESIGNATION 64", "ORGANISATION 64", "ROLE 64", "FINAL CELL TEXT",
      "FINAL BLOCK TEXT EVIDENCE", "FINAL BLOCK TEXT SPEAKER CHALLENGES", "FINAL BLOCK TEXT CHALLENGES",
      "FINAL BLOCK TEXT OPPORTUNITIES", "RECIPIENT", "RESPONSIBLE ORGANISATION", "RECOMMENDATION TIMELINE",
      "QUESTION CONTRIBUTOR", "FINAL BLOCK TEXT RESPONSE", "Unresolved", "FINAL BLOCK TEXT OUTCOMES",
      "COMMITMENT OWNER", "COMMITMENT TIMELINE",
    ]) expect(html).toContain(expected)
    expect(JSON.stringify(original)).toBe(before)
    expect(renderReportHtml({ ...report, content: parsed })).toContain("FINAL BLOCK TEXT OUTCOMES")
  })

  it("renders legacy text as text while keeping newlines and template section structure", () => {
    const content = parseReportContent(JSON.stringify({ purpose: "First line\nSecond line <em>literal text</em>", outcomes: "Keep this outcome & commitment" }))
    const html = rapporteurDocumentHtml({ ...report, content })
    expect(html).toContain("First line<br>Second line &lt;em&gt;literal text&lt;/em&gt;")
    expect(html).toContain("Keep this outcome &amp; commitment")
    for (const heading of ["Purpose of the Session", "Session Composition", "Presentations and Speaker Contributions", "Agreed Outcomes and Decisions"]) expect(html).toContain(heading)
  })

  it.each(["{broken JSON", "[]", "null", "false", "42", '"unexpected string body"'])("refuses malformed serialized report content %j instead of converting it to an empty draft", (raw) => {
    expect(() => parseReportContent(raw)).toThrow("The saved report has been preserved")
    try {
      parseReportContent(raw)
    } catch (error) {
      expect(error).toMatchObject({ status: 422, code: "report_content_invalid" })
    }
  })

  it.each([null, [], "invalid body", 42, false])("refuses malformed report objects %j", (input) => {
    expect(() => sanitizeReportContent(input)).toThrow("The saved report has been preserved")
  })

  it("uses the initial structured template only when no authored document or legacy fields exist", () => {
    const content = emptyReportContent()
    const html = rapporteurDocumentHtml({ ...report, content })
    expect(html).toContain("Financing Clean Cooking at Scale")
    expect(html).toContain("Purpose of the Session")
    expect(html).toContain("Session Composition")
    expect(content.documentHtml).toBeUndefined()
  })
})

describe("A4 report export", () => {
  it("exports complete authored writing with A4 geometry, Word page fields, and continuing tables", () => {
    const content = {
      documentHtml: '<h1>Preserved title</h1><p>First page writing</p><table style="width:950px" width="950"><colgroup><col width="950"></colgroup><tbody><tr><td>Continuing table evidence</td></tr></tbody></table><h2>Final section</h2><p>Final page writing</p>',
    }
    const html = renderReportHtml({ ...report, content })
    expect(html).toMatch(/@page\s+Section1\s*\{[^}]*size:\s*210mm\s+297mm;[^}]*margin:\s*20mm;/)
    expect(html).toContain("div.Section1 { page: Section1; }")
    expect(html).toContain('class="Section1"')
    expect(html).toContain("mso-element:field-begin")
    expect(html).toContain(" PAGE ")
    expect(html).toContain("Preserved title")
    expect(html).toContain("Continuing table evidence")
    expect(html).toContain("Final page writing")
    expect(html).toContain('table style="width:100%;border-collapse:collapse"')
    expect(html).not.toContain("<colgroup")
    expect(html).not.toContain('width="950"')
  })
})
