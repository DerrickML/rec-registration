// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Editor } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
import {
  EngageReportPagination,
  REPORT_PAGE,
  reportPageAt,
  reportPageBreak,
  reportPageCount,
  reportPaginationKey,
} from "../components/engage/engage-word-pagination.mjs"

describe("rapporteur pagination", () => {
  let editor
  beforeEach(() => {
    // Layout is browser-tested separately. These tests verify schema, history,
    // selection, and serialization guarantees without simulated DOM geometry.
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1))
    vi.stubGlobal("cancelAnimationFrame", vi.fn())
  })
  afterEach(() => { editor?.destroy(); vi.unstubAllGlobals() })

  it("uses real A4 body boundaries and accounts for the gap between sheets", () => {
    const body = REPORT_PAGE.height - REPORT_PAGE.margin * 2
    const period = REPORT_PAGE.height + REPORT_PAGE.gap
    expect(reportPageBreak(body - 20, body)).toBeNull()
    expect(reportPageBreak(body - 10, body + 10)).toEqual({ page: 1, height: period - body + 10 })
    expect(reportPageAt(period)).toBe(1)
    expect(reportPageCount(body)).toBe(1)
    expect(reportPageCount(period + body)).toBe(2)
    expect(reportPageCount(period * 12 + body)).toBe(13)
  })

  it("keeps layout decorations out of HTML, report JSON, undo history, and selection", () => {
    editor = new Editor({ extensions: [StarterKit, EngageReportPagination.configure({ enabled: true })], content: "<p>Original report</p>" })
    editor.commands.setTextSelection(5)
    editor.commands.insertContent(" typed")
    const html = editor.getHTML()
    const json = editor.getJSON()
    const selection = editor.state.selection.toJSON()
    editor.view.dispatch(editor.state.tr.setMeta(reportPaginationKey, [{ pos: 3, height: 175, key: "line:3" }]).setMeta("addToHistory", false))
    expect(editor.view.dom.querySelector("[data-auto-page-break]")).not.toBeNull()
    expect(editor.getHTML()).toBe(html)
    expect(editor.getJSON()).toEqual(json)
    expect(editor.state.selection.toJSON()).toEqual(selection)
    editor.commands.undo()
    expect(editor.getHTML()).toBe("<p>Original report</p>")
  })

  it("preserves the original structured table when cell content crosses pages", () => {
    editor = new Editor({ extensions: [StarterKit, Table, TableRow, TableHeader, TableCell, EngageReportPagination.configure({ enabled: true })], content: "<h2>Session notes</h2><table><tbody><tr><th>Topic</th><th>Report</th></tr><tr><td><p>Funding</p></td><td><p>Long original draft continued</p></td></tr></tbody></table><p></p>" })
    const html = editor.getHTML()
    let cellPosition
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text.startsWith("Long original")) cellPosition = pos + 5
    })
    editor.view.dispatch(editor.state.tr.setMeta(reportPaginationKey, [{ pos: cellPosition, height: 180, key: "cell" }]).setMeta("addToHistory", false))
    expect(editor.view.dom.querySelector("td [data-auto-page-break]")).not.toBeNull()
    expect(editor.getHTML()).toBe(html)
    expect(editor.getHTML()).not.toContain("auto-page-break")
  })

  it("does not enable pagination in other Engage editors by default", () => {
    editor = new Editor({ extensions: [StarterKit, EngageReportPagination], content: "<p>Other module</p>" })
    expect(reportPaginationKey.getState(editor.state)).toBeUndefined()
    expect(editor.view.dom.querySelector("[data-auto-page-break]")).toBeNull()
  })

  it("keeps first-page branding in the screen layout without changing the saved draft", () => {
    editor = new Editor({ extensions: [StarterKit, EngageReportPagination.configure({ enabled: true, headerImage: "/reporting/nrep-mark.png" })], content: "<p>Existing authored draft</p>" })
    const html = editor.getHTML()
    editor.view.dispatch(editor.state.tr.setMeta(reportPaginationKey, []).setMeta("addToHistory", false))
    expect(editor.view.dom.querySelector(".engage-word-pagination-header-logo").style.backgroundImage).toContain("nrep-mark.png")
    expect(editor.getHTML()).toBe(html)
    expect(editor.getHTML()).not.toContain("nrep-mark")
  })
})
