// @vitest-environment jsdom
import React from "react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import ts from "typescript"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const helpers = vi.hoisted(() => ({ store: null, controllers: [], options: [] }))
vi.mock("next/link", () => ({ default: (props) => React.createElement("a", props) }))
vi.mock("@/lib/reporting-draft.mjs", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createReportingDraft(options) {
      helpers.options.push(options)
      const controller = actual.createReportingDraft({ ...options, recoveryStore: helpers.store })
      helpers.controllers.push(controller)
      return controller
    },
    loadRecovery: (identity) => actual.loadRecovery(identity, { store: helpers.store }),
    discardRecovery: (identity, options) => actual.discardRecovery(identity, { ...options, store: helpers.store }),
  }
})

// Model the editor's real contract: writing becomes dirty immediately, its HTML
// notification is delayed, and flushDocument synchronously emits pending HTML.
vi.mock("@/components/engage/EngageWordDocument", async () => {
  const React = await import("react")
  return {
    EngageWordDocument: React.forwardRef(function ReportingEditor({ content, editable, onChangeField, onDocumentDirty }, ref) {
      const [html, setHtml] = React.useState(content._documentHtml)
      const pending = React.useRef(null)
      const timer = React.useRef(null)
      const callback = React.useRef(onChangeField)
      callback.current = onChangeField
      function emit() {
        clearTimeout(timer.current)
        if (pending.current === null) return
        const next = pending.current
        pending.current = null
        callback.current("_documentHtml", { _documentHtml: next })
      }
      React.useImperativeHandle(ref, () => ({ flushDocument: emit }))
      React.useEffect(() => () => clearTimeout(timer.current), [])
      return React.createElement("textarea", {
        "aria-label": "Report document", value: html, readOnly: !editable,
        onChange: (event) => {
          if (!editable) return
          const next = event.target.value
          setHtml(next)
          pending.current = next
          onDocumentDirty(next)
          clearTimeout(timer.current)
          timer.current = setTimeout(emit, 450)
        },
      })
    }),
  }
})

// Next accepts JSX in .js; this test runner only transforms .jsx. Transpile the
// actual page source in memory rather than maintaining a separate test copy.
const draftModule = await import("@/lib/reporting-draft.mjs")
const editorModule = await import("@/components/engage/EngageWordDocument")
const reportRules = await import("@/lib/rec-conference/rapporteur-rules.mjs")
const pageSource = readFileSync(resolve(process.cwd(), "components/rec-registration/RapporteurReportingPage.js"), "utf8")
const compiled = ts.transpileModule(pageSource, { fileName: "RapporteurReportingPage.jsx", compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText
const pageExports = {}
const pageDependencies = {
  react: React,
  "next/link": { default: (props) => React.createElement("a", props) },
  "@/lib/reporting-draft.mjs": draftModule,
  "@/components/engage/EngageWordDocument": editorModule,
  "@/lib/rec-conference/rapporteur-rules.mjs": reportRules,
}
new Function("require", "exports", "React", compiled)((name) => {
  if (name.endsWith(".css")) return {}
  if (!(name in pageDependencies)) throw new Error(`Unmapped reporting page dependency: ${name}`)
  return pageDependencies[name]
}, pageExports, React)
const ReportingPage = pageExports.default

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`
  return JSON.stringify(value)
}
function memoryStore() {
  const records = new Map()
  return {
    records,
    async put(record) { records.set(`${record.identity}:${record.copyId}`, JSON.parse(JSON.stringify(record))) },
    async list(identity) { return [...records.values()].filter((record) => record.identity === identity) },
    async remove(identity, copyId, serialized) {
      for (const [key, record] of records) {
        if (record.identity !== identity || (copyId && record.copyId !== copyId)) continue
        if (serialized && stable(record.content) !== serialized) continue
        records.delete(key)
      }
    },
  }
}
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
const documentHtml = (text) => `<h1>Session report</h1><h2>Purpose of the Session</h2><p>${text}</p><h2>Session composition</h2><p>Speakers retained</p>`
const content = (text) => ({ documentHtml: documentHtml(text), purpose: text })
const recoveryIdentity = "rec-rapporteur:conference-one:jemimah@example.org:report-A"
const morning = { sessionKey: "session-A", title: "Morning financing session", status: "draft", startTime: "08:30", endTime: "10:30", sessionDate: "19 October 2026", hall: "Victoria", sortAt: 1 }
const afternoon = { sessionKey: "session-B", title: "Afternoon clean cooking session", status: "draft", startTime: "14:00", endTime: "16:00", sessionDate: "19 October 2026", hall: "Victoria", sortAt: 2 }
const home = () => ({ name: "Jemimah", email: "jemimah@example.org", halls: ["Victoria"], sessions: [morning, afternoon] })
const report = (session, revision, text) => ({ ...session, $id: session === morning ? "report-A" : "report-B", conferenceId: "conference-one", revision, content: content(text) })
let reports, requests, reportGet, saveRequest, submitRequest, restoreRequest, commentRequest, historyRequest

async function settle() {
  await act(async () => { for (let index = 0; index < 35; index += 1) await Promise.resolve() })
}
async function advance(ms) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}
async function openMorning() {
  render(<ReportingPage />)
  await settle()
  fireEvent.click(screen.getByRole("button", { name: /Morning financing session/ }))
  await settle()
  return screen.getByRole("textbox", { name: "Report document" })
}
const puts = () => requests.filter((request) => request.method === "PUT")
const posts = () => requests.filter((request) => request.method === "POST")

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("React", React)
  window.history.replaceState({}, "", "/reporting")
  helpers.store = memoryStore()
  helpers.options = []
  helpers.controllers = []
  requests = []
  reports = new Map([[morning.sessionKey, report(morning, 8, "Existing morning writing")], [afternoon.sessionKey, report(afternoon, 20, "Existing afternoon writing")]])
  reportGet = (sessionKey) => response(reports.get(sessionKey))
  saveRequest = (request) => {
    const previous = reports.get(request.body.sessionKey)
    if (request.body.expectedRevision !== previous.revision) return response({ error: "A newer version exists" }, 409)
    const next = { ...previous, content: request.body.content, revision: previous.revision + 1 }
    reports.set(request.body.sessionKey, next)
    return response({ content: next.content, revision: next.revision })
  }
  submitRequest = () => response({ success: true })
  commentRequest = () => response({ comments: [] })
  historyRequest = () => response({ versions: [{ revision: 7, kind: "autosave", createdAt: "2026-10-19T12:00:00Z" }, { revision: reports.get("session-A").revision, kind: "current", createdAt: "2026-10-19T14:00:00Z" }] })
  restoreRequest = (request) => {
    const next = { ...reports.get(request.body.sessionKey), content: content("Earlier preserved writing"), revision: request.body.expectedRevision + 1 }
    reports.set(request.body.sessionKey, next)
    return response(next)
  }
  vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
    const parsed = new URL(url, "http://localhost:3002")
    const request = { path: parsed.pathname, method: options.method || "GET", body: options.body ? JSON.parse(options.body) : null, url: String(url) }
    requests.push(request)
    if (parsed.pathname === "/api/reporting/sessions") return response(home())
    if (parsed.pathname === "/api/reporting/comments") return request.method === "POST" ? commentRequest(request) : response({ comments: [] })
    if (parsed.pathname === "/api/reporting/report" && request.method === "GET") return reportGet(parsed.searchParams.get("sessionKey"))
    if (parsed.pathname === "/api/reporting/report" && request.method === "PUT") return saveRequest(request)
    if (parsed.pathname === "/api/reporting/report/submit") return submitRequest(request)
    if (parsed.pathname === "/api/reporting/report/history") return historyRequest(request)
    if (parsed.pathname === "/api/reporting/report/restore") return restoreRequest(request)
    throw new Error(`Unexpected test request ${request.method} ${url}`)
  }))
})

afterEach(() => {
  cleanup()
  helpers.controllers.forEach((controller) => controller.dispose())
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("reporting page preservation and navigation", () => {
  it("reopens saved heading content faithfully and never saves an untouched draft", async () => {
    const editor = await openMorning()
    expect(editor.value).toBe(documentHtml("Existing morning writing"))
    await advance(4000)
    fireEvent.click(screen.getByRole("button", { name: "Sessions", exact: true }))
    await settle()
    expect(screen.queryByRole("textbox", { name: "Report document" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /Morning financing session/ }))
    await settle()
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toBe(documentHtml("Existing morning writing"))
    expect(puts()).toHaveLength(0)
    expect(posts()).toHaveLength(0)
  })

  it("flushes the editor's delayed HTML before leaving and waits for the complete save acknowledgement", async () => {
    const acknowledgement = deferred()
    saveRequest = () => acknowledgement.promise
    const editor = await openMorning()
    fireEvent.change(editor, { target: { value: documentHtml("Last words typed before leaving") } })
    expect(puts()).toHaveLength(0)
    fireEvent.click(screen.getByRole("button", { name: "Sessions", exact: true }))
    await settle()
    expect(puts()).toHaveLength(1)
    expect(puts()[0].body).toMatchObject({ sessionKey: "session-A", expectedRevision: 8, content: content("Last words typed before leaving") })
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Last words typed before leaving")
    expect(screen.getByRole("button", { name: "Sessions", exact: true }).disabled).toBe(true)
    expect((await helpers.store.list(recoveryIdentity))[0].content.documentHtml).toContain("Last words typed before leaving")
    acknowledgement.resolve(response({ content: puts()[0].body.content, revision: 9 }))
    await settle()
    expect(screen.queryByRole("textbox", { name: "Report document" })).toBeNull()
    expect(screen.getByRole("button", { name: /Morning financing session/ })).toBeTruthy()
  })

  it("keeps the report and local writing open when saving fails", async () => {
    saveRequest = () => response({ error: "Storage temporarily unavailable" }, 422)
    const editor = await openMorning()
    fireEvent.change(editor, { target: { value: documentHtml("Writing that must survive") } })
    fireEvent.click(screen.getByRole("button", { name: "Sessions", exact: true }))
    await settle()
    expect(screen.getByRole("alert").textContent).toContain("Storage temporarily unavailable")
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Writing that must survive")
    expect(screen.getByRole("textbox", { name: "Report document" }).readOnly).toBe(false)
    expect(reports.get("session-A").content.documentHtml).toContain("Existing morning writing")
    expect((await helpers.store.list(recoveryIdentity))[0].content.documentHtml).toContain("Writing that must survive")
    expect(posts()).toHaveLength(0)
  })

  it("blocks an internal conference link when its pending draft cannot be saved", async () => {
    saveRequest = () => response({ error: "Could not preserve your latest report" }, 422)
    const editor = await openMorning()
    fireEvent.change(editor, { target: { value: documentHtml("Words immediately before clicking the conference link") } })
    const link = screen.getAllByRole("link").find((item) => item.getAttribute("href") === "/")
    const click = new MouseEvent("click", { bubbles: true, cancelable: true })
    fireEvent(link, click)
    await settle()
    expect(click.defaultPrevented).toBe(true)
    expect(puts()[0].body.content.documentHtml).toContain("Words immediately before clicking the conference link")
    expect(screen.getByRole("alert").textContent).toContain("Could not preserve your latest report")
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Words immediately before clicking the conference link")
    expect(window.location.pathname).toBe("/reporting")
    expect((await helpers.store.list(recoveryIdentity))[0].content.documentHtml).toContain("Words immediately before clicking the conference link")
  })

  it("preserves a returned report's pending edit before sending a note to the approver", async () => {
    reports.set("session-A", { ...reports.get("session-A"), status: "returned" })
    const acknowledgement = deferred()
    saveRequest = () => acknowledgement.promise
    const editor = await openMorning()
    fireEvent.change(editor, { target: { value: documentHtml("Returned report correction typed just before the note") } })
    fireEvent.change(screen.getByPlaceholderText("Add a note…"), { target: { value: "Emmanuel, please review this correction." } })
    fireEvent.click(screen.getByRole("button", { name: "Send note", exact: true }))
    await settle()
    expect(puts()[0].body.content.documentHtml).toContain("Returned report correction typed just before the note")
    expect(posts()).toHaveLength(0)
    acknowledgement.resolve(response({ content: puts()[0].body.content, revision: 9 }))
    await settle()
    expect(posts()).toHaveLength(1)
    expect(posts()[0]).toMatchObject({ path: "/api/reporting/comments", body: { sessionKey: "session-A", message: "Emmanuel, please review this correction." } })
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Returned report correction typed just before the note")
    expect(screen.getByRole("textbox", { name: "Report document" }).readOnly).toBe(false)
  })

  it("flushes the latest delayed edit before submitting the exact newly saved revision", async () => {
    const acknowledgement = deferred()
    saveRequest = () => acknowledgement.promise
    const editor = await openMorning()
    fireEvent.change(editor, { target: { value: documentHtml("Final report sent to Emmanuel") } })
    fireEvent.click(screen.getByRole("button", { name: "Send to approver", exact: true }))
    await settle()
    expect(posts()).toHaveLength(0)
    expect(puts()[0].body.content.documentHtml).toContain("Final report sent to Emmanuel")
    acknowledgement.resolve(response({ content: puts()[0].body.content, revision: 9 }))
    await settle()
    expect(posts()).toHaveLength(1)
    expect(posts()[0]).toMatchObject({ path: "/api/reporting/report/submit", body: { sessionKey: "session-A", expectedRevision: 9 } })
    expect(screen.queryByRole("textbox", { name: "Report document" })).toBeNull()
    expect(screen.getByRole("status").textContent).toContain("Sent to the approver")
  })

  it("ignores an old report's late state notification after opening another report", async () => {
    const editor = await openMorning()
    fireEvent.change(editor, { target: { value: documentHtml("Morning saved") } })
    fireEvent.click(screen.getByRole("button", { name: "Sessions", exact: true }))
    await settle()
    const oldOptions = helpers.options[0]
    fireEvent.click(screen.getByRole("button", { name: /Afternoon clean cooking session/ }))
    await settle()
    await act(async () => oldOptions.onState({ status: "saved", revision: 999, content: content("Stale morning response"), dirty: false }))
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Existing afternoon writing")
    fireEvent.change(screen.getByRole("textbox", { name: "Report document" }), { target: { value: documentHtml("Afternoon edit") } })
    fireEvent.click(screen.getByRole("button", { name: "Save now", exact: true }))
    await settle()
    expect(puts().at(-1).body).toMatchObject({ sessionKey: "session-B", expectedRevision: 20, content: content("Afternoon edit") })
  })

  it("saves and reopens a long multi-page document without clipping its trailing text", async () => {
    const editor = await openMorning()
    const writing = `${"Long report content. ".repeat(4200)}FINAL RETAINED SENTENCE`
    const html = documentHtml(writing)
    fireEvent.change(editor, { target: { value: html } })
    fireEvent.click(screen.getByRole("button", { name: "Sessions", exact: true }))
    await settle()
    expect(puts()[0].body.content.documentHtml).toBe(html)
    expect(puts()[0].body.content.documentHtml.length).toBeGreaterThan(60000)
    fireEvent.click(screen.getByRole("button", { name: /Morning financing session/ }))
    await settle()
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toBe(html)
  })

  it("flushes pending editor text on browser exit and warns until the server acknowledges it", async () => {
    const acknowledgement = deferred()
    saveRequest = () => acknowledgement.promise
    const editor = await openMorning()
    const cleanExit = new Event("beforeunload", { cancelable: true })
    fireEvent(window, cleanExit)
    expect(cleanExit.defaultPrevented).toBe(false)
    fireEvent.change(editor, { target: { value: documentHtml("The last words before closing the browser") } })
    const pendingExit = new Event("beforeunload", { cancelable: true })
    fireEvent(window, pendingExit)
    await settle()
    expect(pendingExit.defaultPrevented).toBe(true)
    expect(puts()[0].body.content.documentHtml).toContain("The last words before closing the browser")
    expect((await helpers.store.list(recoveryIdentity))[0].content.documentHtml).toContain("The last words before closing the browser")
    acknowledgement.resolve(response({ content: puts()[0].body.content, revision: 9 }))
    await settle()
    const savedExit = new Event("beforeunload", { cancelable: true })
    fireEvent(window, savedExit)
    expect(savedExit.defaultPrevented).toBe(false)
  })

  it("keeps the latest editor snapshot for browser recovery when client navigation unmounts before its delayed notification", async () => {
    const editor = await openMorning()
    fireEvent.change(editor, { target: { value: documentHtml("The last words before client-side Back") } })
    expect(puts()).toHaveLength(0)
    cleanup()
    await settle()
    expect(puts()).toHaveLength(0)
    const copies = await helpers.store.list(recoveryIdentity)
    expect(copies).toHaveLength(1)
    expect(copies[0].revision).toBe(8)
    expect(copies[0].content.documentHtml).toBe(documentHtml("The last words before client-side Back"))
    expect(reports.get("session-A").content.documentHtml).toContain("Existing morning writing")
    await advance(5000)
    expect(puts()).toHaveLength(0)
  })

  it("shows transient retry status and retains recovery until the complete server save succeeds", async () => {
    let attempts = 0
    const success = saveRequest
    saveRequest = (request) => {
      attempts += 1
      if (attempts === 1) throw new TypeError("Network disconnected")
      if (attempts === 2) return response({ error: "Server is busy" }, 503)
      return success(request)
    }
    const editor = await openMorning()
    fireEvent.change(editor, { target: { value: documentHtml("Report written during an outage") } })
    await advance(450)
    await advance(700)
    expect(puts()).toHaveLength(1)
    expect(screen.getAllByText("Connection interrupted. Retrying…").length).toBeGreaterThan(0)
    expect((await helpers.store.list(recoveryIdentity))[0].content.documentHtml).toContain("Report written during an outage")
    await advance(1000)
    expect(puts()).toHaveLength(2)
    await advance(3000)
    expect(puts()).toHaveLength(3)
    expect(new Set(puts().map((request) => request.body.mutationId)).size).toBe(1)
    expect(screen.getAllByText("Saved").length).toBeGreaterThan(0)
    expect(await helpers.store.list(recoveryIdentity)).toHaveLength(0)
  })

  it("keeps writing after a cross-browser conflict without retrying or submitting over the newer report", async () => {
    saveRequest = () => response({ error: "Another browser has saved a newer report" }, 409)
    const editor = await openMorning()
    fireEvent.change(editor, { target: { value: documentHtml("Unsaved browser version") } })
    fireEvent.click(screen.getByRole("button", { name: "Save now", exact: true }))
    await settle()
    expect(screen.getAllByText("Another browser has saved a newer report").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Save now", exact: true }).disabled).toBe(true)
    fireEvent.change(screen.getByRole("textbox", { name: "Report document" }), { target: { value: documentHtml("Additional writing kept after conflict") } })
    await advance(6000)
    fireEvent.click(screen.getByRole("button", { name: "Send to approver", exact: true }))
    await settle()
    expect(puts()).toHaveLength(1)
    expect(posts()).toHaveLength(0)
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Additional writing kept after conflict")
    expect((await helpers.store.list(recoveryIdentity))[0].content.documentHtml).toContain("Additional writing kept after conflict")
    expect(reports.get("session-A").revision).toBe(8)
  })
})

describe("recovery and saved-version review", () => {
  it("shows the saved draft until a browser copy is explicitly recovered as a new version", async () => {
    const copy = { identity: recoveryIdentity, copyId: "original-tab", revision: 3, updatedAt: Date.now() - 60000, content: content("Offline writing from an older revision") }
    await helpers.store.put(copy)
    const editor = await openMorning()
    expect(editor.value).toContain("Existing morning writing")
    expect(editor.readOnly).toBe(true)
    expect(screen.getByRole("region", { name: "Browser recovery" }).textContent).toContain("based on version 3")
    await advance(4000)
    expect(puts()).toHaveLength(0)
    expect((await helpers.store.list(recoveryIdentity))).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Recover this copy", exact: true }))
    await settle()
    expect(puts()[0].body).toMatchObject({ expectedRevision: 8, content: copy.content })
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Offline writing from an older revision")
    expect(screen.queryByRole("region", { name: "Browser recovery" })).toBeNull()
    expect(await helpers.store.list(recoveryIdentity)).toHaveLength(0)
    expect(screen.getAllByRole("status").some((item) => item.textContent.includes("new version"))).toBe(true)
  })

  it("discards only the explicitly chosen browser copy without saving over the report", async () => {
    await helpers.store.put({ identity: recoveryIdentity, copyId: "old-tab", revision: 3, updatedAt: Date.now(), content: content("Offline alternative") })
    await openMorning()
    fireEvent.click(screen.getByRole("button", { name: "Discard browser copy", exact: true }))
    await settle()
    expect(puts()).toHaveLength(0)
    expect(posts()).toHaveLength(0)
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Existing morning writing")
    expect(screen.getByRole("textbox", { name: "Report document" }).readOnly).toBe(false)
  })

  it.each([null, "unreadable saved body", []])("refuses malformed loaded content (%j) without creating an editable blank template", async (badContent) => {
    reportGet = () => response({ ...reports.get("session-A"), content: badContent })
    render(<ReportingPage />)
    await settle()
    fireEvent.click(screen.getByRole("button", { name: /Morning financing session/ }))
    await settle()
    expect(screen.queryByRole("textbox", { name: "Report document" })).toBeNull()
    expect(screen.getByRole("alert").textContent).toContain("saved content has not been changed")
    expect(puts()).toHaveLength(0)
    expect(posts()).toHaveLength(0)
  })

  it.each([undefined, 0])("refuses an unusable saved revision (%j) before opening an editable report", async (badRevision) => {
    reportGet = () => response({ ...reports.get("session-A"), revision: badRevision })
    render(<ReportingPage />)
    await settle()
    fireEvent.click(screen.getByRole("button", { name: /Morning financing session/ }))
    await settle()
    expect(screen.queryByRole("textbox", { name: "Report document" })).toBeNull()
    expect(screen.getByRole("alert").textContent).toContain("saved content has not been changed")
    expect(helpers.controllers).toHaveLength(0)
    expect(puts()).toHaveLength(0)
  })

  it("ignores a previous report's delayed history response after another report has opened", async () => {
    const oldHistory = deferred()
    historyRequest = (request) => request.url.includes("session-A") ? oldHistory.promise : response({ versions: [{ revision: 19, kind: "autosave", createdAt: "2026-10-19T15:00:00Z" }] })
    await openMorning()
    fireEvent.click(screen.getByRole("button", { name: "Version history", exact: true }))
    await settle()
    fireEvent.click(screen.getByRole("button", { name: "Sessions", exact: true }))
    await settle()
    fireEvent.click(screen.getByRole("button", { name: /Afternoon clean cooking session/ }))
    await settle()
    oldHistory.resolve(response({ versions: [{ revision: 7, kind: "old morning version", createdAt: "2026-10-19T12:00:00Z" }] }))
    await settle()
    expect(screen.queryByRole("region", { name: "Version history" })).toBeNull()
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Existing afternoon writing")
    fireEvent.click(screen.getByRole("button", { name: "Version history", exact: true }))
    await settle()
    expect(screen.getByRole("region", { name: "Version history" }).textContent).toContain("Version 19")
    expect(screen.getByRole("region", { name: "Version history" }).textContent).not.toContain("old morning version")
    expect(posts()).toHaveLength(0)
    expect(puts()).toHaveLength(0)
  })

  it("requires an explicit history restore and saves current pending writing before creating the restored version", async () => {
    const editor = await openMorning()
    fireEvent.click(screen.getByRole("button", { name: "Version history", exact: true }))
    await settle()
    expect(screen.getByRole("region", { name: "Version history" })).toBeTruthy()
    expect(posts()).toHaveLength(0)
    fireEvent.change(editor, { target: { value: documentHtml("Current writing preserved before restore") } })
    fireEvent.click(screen.getByRole("button", { name: "Restore as a new version", exact: true }))
    await settle()
    expect(puts()[0].body.content.documentHtml).toContain("Current writing preserved before restore")
    expect(posts()[0]).toMatchObject({ path: "/api/reporting/report/restore", body: { sessionKey: "session-A", revision: 7, expectedRevision: 9 } })
    const mutations = requests.filter((request) => request.method !== "GET")
    expect(mutations.map((request) => request.method)).toEqual(["PUT", "POST"])
    expect(screen.getByRole("textbox", { name: "Report document" }).value).toContain("Earlier preserved writing")
    expect(helpers.controllers.at(-1).snapshot().revision).toBe(10)
    expect(screen.getAllByRole("status").some((item) => item.textContent.includes("Version 7 was restored as a new saved version"))).toBe(true)
  })
})
