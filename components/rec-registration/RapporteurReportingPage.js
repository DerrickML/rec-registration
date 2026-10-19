"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { EngageWordDocument } from "@/components/engage/EngageWordDocument"
import { createReportingDraft, discardRecovery, loadRecovery } from "@/lib/reporting-draft.mjs"
import { downloadRapporteurReport, purposeFromDocument, rapporteurDocumentHtml, reportContentReady } from "@/lib/rec-conference/rapporteur-rules.mjs"
import "@/styles/engage.css"
import "./rapporteur-reporting.css"
import "./rapporteur-draft.css"

const STATUS = { new: "Not started", draft: "Draft", submitted: "With approver", returned: "Returned", approved: "Approved" }

function saveLabel(state, typing = false) {
  if (state.status === "saved") return typing ? "Unsaved changes…" : "Saved"
  if (state.status === "retrying") return "Connection interrupted. Retrying…"
  if (state.status === "conflict") return state.error?.message || "The report changed. Your writing is kept in this browser."
  if (state.status === "error") return state.error?.message || "Not saved. Your writing is still here."
  return "Saving…"
}

function shortDay(label) {
  const match = String(label || "").match(/^(\d+)(?:st|nd|rd|th)?\s+([A-Za-z]+)/)
  if (!match) return label
  return `${match[1]} ${match[2].slice(0, 3)}`
}

function stillToWrite(items) {
  return items.filter((session) => !session.status || session.status === "new" || session.status === "draft" || session.status === "returned").length
}

function sessionGroups(sessions) {
  const groups = []
  for (const session of sessions) {
    const label = session.sessionDate || "Date not set"
    const group = groups.find((item) => item.label === label)
    if (group) group.items.push(session)
    else groups.push({ label, items: [session] })
  }
  return groups
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || "Request failed")
    error.status = response.status
    error.code = payload.code
    throw error
  }
  return payload
}

export default function ReportingPage() {
  const [email, setEmail] = useState("")
  const [conferences, setConferences] = useState([])
  const [conferenceId, setConferenceId] = useState("")
  const [otpId, setOtpId] = useState("")
  const [code, setCode] = useState("")
  const [devCode, setDevCode] = useState("")
  const [home, setHome] = useState(null)
  const [report, setReport] = useState(null)
  const [content, setContent] = useState(null)
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [pickedDay, setPickedDay] = useState("")
  const [saved, setSaved] = useState("")
  const [saveState, setSaveState] = useState(null)
  const [recoveryCopies, setRecoveryCopies] = useState([])
  const [history, setHistory] = useState(null)
  const [editorEpoch, setEditorEpoch] = useState(0)
  const [busy, setBusy] = useState(false)
  const revision = useRef(1)
  const previewAssignment = useRef("")
  const reportRef = useRef(null)
  const contentRef = useRef(null)
  const editorRef = useRef(null)
  const draftRef = useRef(null)
  const editorDirty = useRef(false)
  const pendingDocumentHtml = useRef(null)
  const identityRef = useRef("")

  useEffect(() => {
    reportRef.current = report
  }, [report])

  useEffect(() => {
    previewAssignment.current = home?.preview ? home.assignmentId || "" : ""
  }, [home])

  useEffect(() => {
    const assignmentId = new URLSearchParams(window.location.search).get("assignment") || ""
    if (assignmentId) {
      fetchJson(`/api/rec/rapporteur/dashboard?assignmentId=${encodeURIComponent(assignmentId)}`)
        .then((data) => setHome(data))
        .catch((err) => setError(err.message))
      return
    }
    fetchJson("/api/reporting/sessions")
      .then((data) => setHome(data))
      .catch(() => null)
  }, [])

  useEffect(() => {
    function preserve() {
      if (!draftRef.current) return
      if (editorDirty.current) editorRef.current?.flushDocument()
      draftRef.current.flush().catch(() => null)
    }
    function warnBeforeLeaving(event) {
      const wasDirty = editorDirty.current || draftRef.current?.snapshot().dirty
      preserve()
      if (wasDirty || draftRef.current?.snapshot().dirty) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    function onVisibility() { if (document.visibilityState === "hidden") preserve() }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    window.addEventListener("online", preserve)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving)
      window.removeEventListener("online", preserve)
      document.removeEventListener("visibilitychange", onVisibility)
      const controller = draftRef.current
      draftRef.current = null
      // Client-side Back/Forward can unmount without beforeunload. The latest
      // dirty HTML is independent of the child editor's ref/unmount ordering.
      if (controller && editorDirty.current && typeof pendingDocumentHtml.current === "string") {
        const documentHtml = pendingDocumentHtml.current
        controller.update({ ...contentRef.current, documentHtml, purpose: purposeFromDocument(documentHtml) })
      }
      controller?.dispose()
    }
  }, [])

  useEffect(() => {
    if (!report || (report.status !== "submitted" && report.status !== "returned")) return undefined
    const assignmentId = previewAssignment.current
    const url = assignmentId
      ? `/api/rec/rapporteur/preview-report?assignmentId=${encodeURIComponent(assignmentId)}&sessionKey=${encodeURIComponent(report.sessionKey)}&commentsOnly=1`
      : `/api/reporting/comments?sessionKey=${encodeURIComponent(report.sessionKey)}`
    const timer = setInterval(() => {
      fetchJson(url)
        .then((data) => { if (reportRef.current?.$id === report.$id) setComments(data.comments || []) })
        .catch(() => null)
    }, 8000)
    return () => clearInterval(timer)
  }, [report])

  function installReport(data) {
    if (!data?.$id || !data.content || typeof data.content !== "object" || Array.isArray(data.content) || !Number.isSafeInteger(data.revision) || data.revision < 1) {
      throw new Error("This report could not be loaded. Its saved content has not been changed.")
    }
    draftRef.current?.dispose()
    draftRef.current = null
    reportRef.current = data
    contentRef.current = data.content
    revision.current = data.revision
    editorDirty.current = false
    pendingDocumentHtml.current = null
    identityRef.current = ["rec-rapporteur", data.conferenceId, home?.email || email, data.$id].join(":")
    setReport(data)
    setContent(data.content)
    setHistory(null)
    setEditorEpoch((value) => value + 1)
    if (!home?.readOnly && (data.status === "draft" || data.status === "returned")) {
      const assignmentId = home?.preview ? home.assignmentId : ""
      const controller = createReportingDraft({
        identity: identityRef.current,
        revision: data.revision,
        content: data.content,
        debounceMs: 700,
        maxWaitMs: 2000,
        save: (payload) => fetchJson(assignmentId ? "/api/rec/rapporteur/preview-report" : "/api/reporting/report", {
          method: "PUT",
          body: JSON.stringify({ ...payload, sessionKey: data.sessionKey, ...(assignmentId ? { assignmentId } : {}) }),
        }),
        onState: (state) => {
          if (draftRef.current !== controller || reportRef.current?.$id !== data.$id) return
          revision.current = state.revision
          setSaveState(state)
          setSaved(saveLabel(state, editorDirty.current))
        },
      })
      draftRef.current = controller
      setSaveState(controller.snapshot())
      setSaved("Saved")
    } else {
      setSaveState(null)
      setSaved("")
    }
  }

  function edit(next) {
    if (!draftRef.current) return
    contentRef.current = next
    editorDirty.current = false
    pendingDocumentHtml.current = null
    setContent(next)
    const state = draftRef.current.update(next)
    setSaveState(state)
    setSaved(saveLabel(state))
  }

  async function flushCurrent() {
    const controller = draftRef.current
    if (!controller) return
    if (editorDirty.current) editorRef.current?.flushDocument()
    await controller.flush()
    if (controller.snapshot().dirty) throw new Error("This report is not fully saved. Your writing has been kept here.")
  }

  async function closeReport() {
    setBusy(true)
    setError("")
    try {
      await flushCurrent()
      const current = reportRef.current
      draftRef.current?.dispose()
      draftRef.current = null
      reportRef.current = null
      setReport(null)
      setContent(null)
      setRecoveryCopies([])
      setHistory(null)
      setHome((previous) => ({ ...previous, sessions: previous.sessions.map((item) => item.sessionKey === current.sessionKey ? { ...item, status: current.status, reportId: current.$id } : item) }))
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }

  async function leaveReport(event, href) {
    if (!draftRef.current || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    try {
      await flushCurrent()
      window.location.assign(href)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  function downloadCurrent() {
    if (draftRef.current && editorDirty.current) editorRef.current?.flushDocument()
    downloadRapporteurReport({ ...reportRef.current, content: contentRef.current }).catch((err) => setError(err.message))
  }

  async function recoverCopy(copy) {
    if (!draftRef.current) return
    setBusy(true)
    setError("")
    try {
      edit(copy.content)
      setEditorEpoch((value) => value + 1)
      setRecoveryCopies([])
      await draftRef.current.flush()
      await discardRecovery(identityRef.current, { copyId: copy.copyId })
      setNotice("The browser copy has been saved as a new version. The previous saved version is preserved.")
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function discardCopy(copy) {
    try {
      await discardRecovery(identityRef.current, { copyId: copy.copyId })
      setRecoveryCopies((copies) => copies.filter((item) => item.copyId !== copy.copyId))
    } catch (err) { setError(err.message) }
  }

  async function loadHistory() {
    setError("")
    const current = reportRef.current
    try {
      const assignmentId = previewAssignment.current
      const query = new URLSearchParams({ sessionKey: current.sessionKey, ...(assignmentId ? { assignmentId, history: "1" } : {}) })
      const result = await fetchJson(`${assignmentId ? "/api/rec/rapporteur/preview-report" : "/api/reporting/report/history"}?${query}`)
      if (reportRef.current?.$id === current.$id) setHistory(result)
    } catch (err) { if (reportRef.current?.$id === current?.$id) setError(err.message) }
  }

  async function restoreVersion(targetRevision) {
    setBusy(true)
    setError("")
    try {
      await flushCurrent()
      const current = reportRef.current
      const assignmentId = previewAssignment.current
      const restored = await fetchJson(assignmentId ? "/api/rec/rapporteur/preview-report" : "/api/reporting/report/restore", {
        method: "POST",
        body: JSON.stringify({ sessionKey: current.sessionKey, revision: targetRevision, expectedRevision: revision.current, ...(assignmentId ? { assignmentId, action: "restore" } : {}) }),
      })
      installReport({ ...current, ...restored })
      setNotice(`Version ${targetRevision} was restored as a new saved version. Earlier versions are preserved.`)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function downloadVersion(targetRevision) {
    setError("")
    try {
      const current = reportRef.current
      const assignmentId = previewAssignment.current
      const query = new URLSearchParams({ sessionKey: current.sessionKey, revision: String(targetRevision), ...(assignmentId ? { assignmentId, history: "1" } : {}) })
      const version = await fetchJson(`${assignmentId ? "/api/rec/rapporteur/preview-report" : "/api/reporting/report/history"}?${query}`)
      await downloadRapporteurReport({ ...current, content: version.content })
    } catch (err) { setError(err.message) }
  }

  async function lookup(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const data = await fetchJson(`/api/reporting/auth/request-otp?email=${encodeURIComponent(email)}`)
      const found = data.conferences || []
      setConferences(found)
      setConferenceId(found[0]?.$id || "")
      if (!found.length) setError("This email is not assigned as a rapporteur.")
      else if (found.length === 1) await requestCode(found[0].$id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function requestCode(targetConferenceId) {
    setBusy(true)
    setError("")
    try {
      const data = await fetchJson("/api/reporting/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ email, conferenceId: targetConferenceId }),
      })
      setConferenceId(targetConferenceId)
      setOtpId(data.otpId || "")
      setDevCode(data.devOtpCode || "")
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function sendCode(event) {
    event.preventDefault()
    await requestCode(conferenceId)
  }

  function restartSignIn() {
    setOtpId("")
    setCode("")
    setDevCode("")
    setConferences([])
    setError("")
  }

  async function verify(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      await fetchJson("/api/reporting/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, conferenceId, otpId, code }),
      })
      setHome(await fetchJson("/api/reporting/sessions"))
      setCode("")
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function openSession(sessionKey) {
    setBusy(true)
    setError("")
    setSaved("")
    setNotice("")
    try {
      await flushCurrent()
      let nextReport
      let nextComments = []
      if (home?.preview) {
        const data = await fetchJson(`/api/rec/rapporteur/preview-report?assignmentId=${encodeURIComponent(home.assignmentId)}&sessionKey=${encodeURIComponent(sessionKey)}`)
        nextReport = data.report
        nextComments = data.comments || []
      } else {
        nextReport = await fetchJson(`/api/reporting/report?sessionKey=${encodeURIComponent(sessionKey)}`)
        // A failed comments request must not hide successfully loaded report content.
        const thread = await fetchJson(`/api/reporting/comments?sessionKey=${encodeURIComponent(sessionKey)}`).catch(() => ({ comments: [] }))
        nextComments = thread.comments || []
      }
      if (!nextReport?.$id || !nextReport.content || typeof nextReport.content !== "object") throw new Error("This report could not be loaded. Its saved content has not been changed.")
      const identity = ["rec-rapporteur", nextReport.conferenceId, home?.email || email, nextReport.$id].join(":")
      const recovery = !home?.readOnly && (nextReport.status === "draft" || nextReport.status === "returned")
        ? await loadRecovery(identity).catch(() => {
          setNotice("Browser recovery is unavailable. Keep this report open until the save indicator confirms Saved.")
          return null
        })
        : null
      const copies = recovery ? [recovery, ...(recovery.otherCopies || [])].filter((copy) => JSON.stringify(copy.content) !== JSON.stringify(nextReport.content)) : []
      installReport(nextReport)
      setRecoveryCopies(copies)
      setComments(nextComments)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitReport() {
    setBusy(true)
    setError("")
    try {
      await flushCurrent()
      const assignmentId = previewAssignment.current
      const result = assignmentId
        ? await fetchJson("/api/rec/rapporteur/preview-report", {
          method: "POST",
          body: JSON.stringify({ assignmentId, sessionKey: report.sessionKey, expectedRevision: revision.current }),
        })
        : await fetchJson("/api/reporting/report/submit", {
          method: "POST",
          body: JSON.stringify({ sessionKey: report.sessionKey, expectedRevision: revision.current }),
        })
      draftRef.current?.dispose()
      draftRef.current = null
      reportRef.current = null
      setReport(null)
      setContent(null)
      setComments([])
      setComment("")
      setSaved("")
      setRecoveryCopies([])
      setHistory(null)
      setNotice(result.notice ? "Sent to the approver for review. The approver could not be notified." : "Sent to the approver for review.")
      setHome(assignmentId
        ? await fetchJson(`/api/rec/rapporteur/dashboard?assignmentId=${encodeURIComponent(assignmentId)}`)
        : await fetchJson("/api/reporting/sessions"))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function sendComment(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await flushCurrent()
      const assignmentId = previewAssignment.current
      const data = assignmentId
        ? await fetchJson("/api/rec/rapporteur/preview-report", {
          method: "POST",
          body: JSON.stringify({ action: "comment", assignmentId, sessionKey: report.sessionKey, message: comment }),
        })
        : await fetchJson("/api/reporting/comments", {
          method: "POST",
          body: JSON.stringify({ sessionKey: report.sessionKey, message: comment }),
        })
      setComments(data.comments || [])
      setComment("")
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    setError("")
    try {
      await flushCurrent()
      await fetchJson("/api/reporting/auth/logout", { method: "POST", body: "{}" })
      draftRef.current?.dispose()
      draftRef.current = null
      reportRef.current = null
      setHome(null)
      setReport(null)
      setContent(null)
      setRecoveryCopies([])
      setNotice("")
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const editable = Boolean(report && !home?.readOnly && !recoveryCopies.length && !busy && (report.status === "draft" || report.status === "returned"))
  const sessions = (home?.sessions || [])
    .slice()
    .sort((left, right) => (Number(left.sortAt) - Number(right.sortAt)) || String(left.title || "").localeCompare(String(right.title || "")))
  const counts = {
    total: sessions.length,
    open: sessions.filter((session) => !session.status || session.status === "new").length,
    draft: sessions.filter((session) => session.status === "draft" || session.status === "returned").length,
    sent: sessions.filter((session) => session.status === "submitted" || session.status === "approved").length,
  }
  const severalHalls = (home?.halls || []).length > 1
  const nextKey = sessions.find((session) => !session.status || session.status === "new" || session.status === "draft" || session.status === "returned")?.sessionKey
  const rowAction = (session) => {
    if (session.status === "draft" || session.status === "returned") return "Continue"
    if (session.status === "submitted" || session.status === "approved") return "Read"
    return "Write"
  }
  const groups = sessionGroups(sessions)
  const defaultDay = groups.find((group) => group.items.some((session) => session.sessionKey === nextKey))?.label || groups[0]?.label || ""
  const activeDay = groups.some((group) => group.label === pickedDay) ? pickedDay : defaultDay
  const activeGroup = groups.find((group) => group.label === activeDay)
  const onDesk = Boolean(home && !report)

  if (!home) {
    const step = otpId ? "code" : conferences.length > 1 ? "conference" : "email"
    return (
      <main className="rec-report-page rec-rap-auth" data-site-motion="off">
        <div className="rec-rap-auth-card">
          <div className="rec-rap-auth-brand">
            <img src="/nrep-logo.png" alt="NREP" width="44" height="44" />
            <span>
              <small>REC26 &amp; Expo</small>
              <strong>Rapporteur</strong>
            </span>
          </div>

          <h1>{step === "code" ? "Enter your code" : "Sign in"}</h1>
          <p className="rec-rap-auth-hint">
            {step === "code"
              ? `We emailed a 6-digit code to ${email}.`
              : step === "conference"
                ? "You are assigned on more than one conference. Choose the one you are reporting for."
                : "Use the email address the REC team assigned to you."}
          </p>

          {error ? <div className="rec-rap-auth-error" role="alert">{error}</div> : null}

          {step === "email" ? (
            <form onSubmit={lookup}>
              <label htmlFor="report-email">Email address</label>
              <input
                id="report-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <button type="submit" disabled={busy || !email}>{busy ? "Checking…" : "Continue"}</button>
            </form>
          ) : null}

          {step === "conference" ? (
            <form onSubmit={sendCode}>
              <label htmlFor="report-conference">Conference</label>
              <select id="report-conference" value={conferenceId} onChange={(event) => setConferenceId(event.target.value)} required>
                {conferences.map((conference) => <option key={conference.$id} value={conference.$id}>{conference.title}</option>)}
              </select>
              <button type="submit" disabled={busy || !conferenceId}>{busy ? "Sending…" : "Send access code"}</button>
              <button type="button" className="rec-rap-auth-link" onClick={restartSignIn}>Use a different email</button>
            </form>
          ) : null}

          {step === "code" ? (
            <form onSubmit={verify}>
              {devCode ? <p className="rec-rap-auth-dev">Test mode, no email is configured here. Your code is <b>{devCode}</b>.</p> : null}
              <label htmlFor="report-code">Access code</label>
              <input
                id="report-code"
                className="rec-rap-auth-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              <button type="submit" disabled={busy || code.length !== 6}>{busy ? "Signing in…" : "Open my sessions"}</button>
              <button type="button" className="rec-rap-auth-link" onClick={() => requestCode(conferenceId)} disabled={busy}>Send a new code</button>
              <button type="button" className="rec-rap-auth-link" onClick={restartSignIn} disabled={busy}>Use a different email</button>
            </form>
          ) : null}
        </div>
        <Link href="/" className="rec-rap-auth-back">← Back to the conference site</Link>
      </main>
    )
  }

  return (
    <main className={onDesk ? "rec-report-page has-side" : "rec-report-page"} data-site-motion="off">
      {onDesk ? (
        <aside className="rec-side">
          <img className="rec-side-logo" src="/nrep-logo.png" alt="NREP" width="72" height="72" />
          <Link href="/" className="rec-desk-brand" onClick={(event) => leaveReport(event, "/")}>
            <span>
              <small>REC26 &amp; Expo</small>
              <strong>Rapporteur</strong>
            </span>
          </Link>
          <div className="rec-side-who">
            <strong>{home.name}</strong>
            <span>{home.halls?.join(" · ")}</span>
          </div>
          <div className="rec-side-counts" aria-label="Session progress">
            <div><strong>{counts.open}</strong><span>To write</span></div>
            <div><strong>{counts.draft}</strong><span>Draft</span></div>
            <div><strong>{counts.sent}</strong><span>Sent</span></div>
            <div><strong>{counts.total}</strong><span>Sessions</span></div>
          </div>
          <nav className="rec-side-days" aria-label="Conference days">
            {groups.map((group) => {
              const left = stillToWrite(group.items)
              return (
                <button type="button" key={group.label} className={group.label === activeDay ? "is-on" : ""} onClick={() => setPickedDay(group.label)}>
                  <span>{shortDay(group.label)}</span>
                  {left ? <b>{left}</b> : null}
                </button>
              )
            })}
          </nav>
          <div className="rec-side-foot">
            {home.preview ? <Link href="/dashboard/rec-conference/admin/reporting" className="plain">Rapporteurs</Link> : <button type="button" className="plain" onClick={logout}>Sign out</button>}
          </div>
        </aside>
      ) : null}
      {onDesk ? null : <header className="rec-desk-bar">
        <Link href="/" className="rec-desk-brand" onClick={(event) => leaveReport(event, "/")}>
          <span>
            <small>REC26 &amp; Expo</small>
            <strong>Rapporteur</strong>
          </span>
        </Link>
        {home ? (
          <div className="rec-desk-who">
            <strong>{home.name}</strong>
            <span>{home.halls?.join(" · ")}</span>
          </div>
        ) : <div />}
        <div className="rec-desk-end">
          {report && saved ? <span className={`rec-desk-save${saved === "Saved" ? " is-saved" : ""}`}>{saved}</span> : null}
          {home?.preview ? <Link href="/dashboard/rec-conference/admin/reporting" className="plain" onClick={(event) => leaveReport(event, "/dashboard/rec-conference/admin/reporting")}>Rapporteurs</Link> : home ? <button type="button" className="plain" disabled={busy} onClick={logout}>Sign out</button> : null}
        </div>
      </header>}
      {onDesk ? (
        <div className="rec-side-main">
          {error ? <p className="warn" role="alert">{error}</p> : null}
          {notice ? <p className="rec-desk-notice" role="status">{notice}</p> : null}
          {activeGroup ? (
            <section className="rec-desk-day">
              <h1>{activeGroup.label}</h1>
              <div className="rec-desk-table">
                {activeGroup.items.map((session) => (
                  <button className={`rec-desk-row is-${session.status || "new"}${session.sessionKey === nextKey ? " is-next" : ""}`} type="button" key={session.sessionKey} disabled={busy} onClick={() => openSession(session.sessionKey)}>
                    <span className="rec-desk-time">
                      <span>{session.startTime || "Time not set"}</span>
                      {session.endTime ? <span>{session.endTime}</span> : null}
                    </span>
                    <span className="rec-desk-title">
                      <strong>{session.title}</strong>
                      {severalHalls || session.unplanned ? <span>{[severalHalls ? session.hall : "", session.unplanned ? "Unplanned" : ""].filter(Boolean).join(" · ")}</span> : null}
                    </span>
                    <span className="rec-desk-endcol">
                      {session.status && session.status !== "new" ? <span className={`rec-report-status rec-report-status-${session.status}`}>{STATUS[session.status]}</span> : null}
                      <span className="rec-desk-go">{rowAction(session)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : <p className="quiet">No sessions in your hall yet.</p>}
        </div>
      ) : null}
      {onDesk ? null : <div className="rec-desk">
      {error ? <p className="warn" role="alert">{error}</p> : null}
      {report && content ? (
        <div className="rec-desk-write">
        <article className="rec-desk-editor">
          <button type="button" className="plain" onClick={closeReport} disabled={busy}>Sessions</button>
          {notice ? <p className="rec-desk-notice" role="status">{notice}</p> : null}
          {recoveryCopies.length ? (
            <section className="rec-draft-recovery" aria-label="Browser recovery">
              <h2>Unsaved writing was found in this browser</h2>
              <p>The saved report is shown below. Choose a browser copy to recover, or download it before discarding it. Recovering creates a new version and preserves the saved report.</p>
              {recoveryCopies.map((copy) => (
                <div key={copy.copyId} className="rec-draft-copy">
                  <span>Browser copy from {new Date(copy.updatedAt).toLocaleString("en-GB", { timeZone: "Africa/Kampala" })} (based on version {copy.revision})</span>
                  <button type="button" disabled={busy} onClick={() => recoverCopy(copy)}>Recover this copy</button>
                  <button type="button" className="plain" onClick={() => downloadRapporteurReport({ ...report, content: copy.content }).catch((err) => setError(err.message))}>Download browser copy</button>
                  <button type="button" className="plain" disabled={busy} onClick={() => discardCopy(copy)}>Discard browser copy</button>
                </div>
              ))}
            </section>
          ) : null}
          {report.status === "submitted" ? <p className="rec-desk-state">With the approver for review.</p> : null}
          {report.status === "returned" ? <p className="rec-desk-state is-returned">The approver returned this report. Update it, then send it again.</p> : null}
          {report.status === "approved" ? <p className="rec-desk-state is-approved">Approved.</p> : null}
          <EngageWordDocument
            key={`${report.$id}:${editorEpoch}`}
            ref={editorRef}
            paginate
            paginationHeaderImage="/reporting/nrep-mark.png"
            editable={editable}
            sections={[]}
            content={{ _documentHtml: rapporteurDocumentHtml({ ...report, content }) }}
            onChangeField={(_key, patch) => {
              const documentHtml = patch?._documentHtml
              if (typeof documentHtml !== "string") return
              edit({ ...contentRef.current, documentHtml, purpose: purposeFromDocument(documentHtml) })
            }}
            onDocumentDirty={(html) => {
              if (typeof html === "string") pendingDocumentHtml.current = html
              if (!editorDirty.current) setSaved("Unsaved changes…")
              editorDirty.current = true
            }}
          />
          {(report.mediaLinks || []).length ? (
            <section className="rec-desk-media">
              <h2>Session media</h2>
              <div className="rec-doc-media">
                {report.mediaLinks.map((item) => (
                  <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.label || item.url}</a>
                ))}
              </div>
            </section>
          ) : null}
          <div className="rec-report-actions">
            <span className="quiet" role="status" aria-live="polite">{saved}</span>
            <button type="button" className="plain" onClick={downloadCurrent}>Download</button>
            {saveState && !recoveryCopies.length ? <button type="button" className="plain" disabled={busy || saveState?.status === "conflict"} onClick={() => flushCurrent().catch((err) => setError(err.message))}>Save now</button> : null}
            <button type="button" className="plain" disabled={busy} onClick={loadHistory}>Version history</button>
            {editable && !reportContentReady(content) ? <span className="rec-report-need">Write the Purpose of the Session to send this report.</span> : null}
            {editable ? <button type="button" className="gold" disabled={busy || !reportContentReady(content)} onClick={submitReport}>Send to approver</button> : null}
          </div>
          {saveState?.recoveryStatus === "unavailable" ? <p className="warn" role="alert">This browser could not keep a recovery copy. {saveState.recoveryError?.message || "Keep the report open until it is saved, or download a copy."}</p> : null}
          {saveState?.status === "conflict" ? <p className="warn" role="alert">Keep this tab open or download your writing. Open the saved report in another tab to compare versions before recovering this browser copy.</p> : null}
          {history ? (
            <section className="rec-draft-history" aria-label="Version history">
              <h2>Saved versions</h2>
              <p>Restoring creates a new saved version. Earlier writing stays recoverable.</p>
              {history.versions?.length ? history.versions.map((version) => (
                <div className="rec-draft-version" key={version.revision}>
                  <span>Version {version.revision} · {version.kind} · {new Date(version.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Kampala" })}</span>
                  {version.kind !== "legacy" ? <button type="button" className="plain" disabled={busy} onClick={() => downloadVersion(version.revision)}>Download version</button> : null}
                  {editable && version.revision < (saveState?.revision || report.revision) ? <button type="button" className="plain" disabled={busy} onClick={() => restoreVersion(version.revision)}>Restore as a new version</button> : null}
                </div>
              )) : <p>Versions are retained from the first protected save. Older revision numbers do not contain saved copies.</p>}
              <button type="button" className="plain" onClick={() => setHistory(null)}>Close history</button>
            </section>
          ) : null}
        </article>
        {report.status !== "draft" && report.status !== "new" ? (
          <aside className="rec-desk-notes">
            <h2>Notes</h2>
            {comments.length ? comments.map((item) => (
              <div className="comment" key={item.$id}>
                <b>{item.authorRole === "approver" ? "Approver" : item.authorName}</b>
                <p>{item.message}</p>
              </div>
            )) : <p className="quiet">No notes yet.</p>}
            {report.status === "submitted" || report.status === "returned" ? (
              <form onSubmit={sendComment}>
                <textarea value={comment} placeholder="Add a note…" onChange={(event) => setComment(event.target.value)} />
                <button type="submit" disabled={busy || !comment.trim()}>Send note</button>
              </form>
            ) : null}
          </aside>
        ) : null}
        </div>
      ) : null}
      </div>}
    </main>
  )
}
