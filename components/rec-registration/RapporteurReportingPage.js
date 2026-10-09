"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { EngageWordDocument } from "@/components/engage/EngageWordDocument"
import { downloadRapporteurReport, purposeFromDocument, rapporteurDocumentHtml, reportContentReady } from "@/lib/rec-conference/rapporteur-rules.mjs"
import "@/styles/engage.css"
import "./rapporteur-reporting.css"

const STATUS = { new: "Not started", draft: "Draft", submitted: "With approver", returned: "Returned", approved: "Approved" }

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
  const [busy, setBusy] = useState(false)
  const revision = useRef(1)
  const dirty = useRef(false)
  const previewAssignment = useRef("")
  const reportRef = useRef(null)
  const contentRef = useRef(null)
  const saveTimer = useRef(null)
  const saveChain = useRef(Promise.resolve())

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

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  useEffect(() => {
    if (!report || (report.status !== "submitted" && report.status !== "returned")) return undefined
    const assignmentId = previewAssignment.current
    const url = assignmentId
      ? `/api/rec/rapporteur/preview-report?assignmentId=${encodeURIComponent(assignmentId)}&sessionKey=${encodeURIComponent(report.sessionKey)}&commentsOnly=1`
      : `/api/reporting/comments?sessionKey=${encodeURIComponent(report.sessionKey)}`
    const timer = setInterval(() => {
      fetchJson(url)
        .then((data) => setComments(data.comments || []))
        .catch(() => null)
    }, 8000)
    return () => clearInterval(timer)
  }, [report])

  function writeSave(sessionKey, next) {
    const current = reportRef.current
    if (!current || current.sessionKey !== sessionKey) return Promise.resolve()
    if (current.status !== "draft" && current.status !== "returned") return Promise.resolve()
    if (contentRef.current !== next) return Promise.resolve()
    const assignmentId = previewAssignment.current
    return fetchJson(assignmentId ? "/api/rec/rapporteur/preview-report" : "/api/reporting/report", {
      method: "PUT",
      body: JSON.stringify(assignmentId
        ? { assignmentId, sessionKey, content: next, expectedRevision: revision.current }
        : { sessionKey, content: next, expectedRevision: revision.current }),
    })
      .then((data) => {
        revision.current = data.revision
        if (contentRef.current === next) {
          dirty.current = false
          setSaved("Saved")
        }
      })
      .catch((err) => setSaved(err.status === 409 ? "Reload this report. It changed somewhere else." : err.message))
  }

  function edit(next) {
    contentRef.current = next
    dirty.current = true
    setSaved("Saving")
    setContent(next)
    const current = reportRef.current
    if (!current || (current.status !== "draft" && current.status !== "returned")) return
    const sessionKey = current.sessionKey
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const snapshot = contentRef.current
      saveChain.current = saveChain.current.then(() => writeSave(sessionKey, snapshot)).catch(() => null)
    }, 350)
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
      if (home?.preview) {
        const data = await fetchJson(`/api/rec/rapporteur/preview-report?assignmentId=${encodeURIComponent(home.assignmentId)}&sessionKey=${encodeURIComponent(sessionKey)}`)
        revision.current = data.report?.revision || 1
        dirty.current = false
        setReport(data.report)
        setContent(data.report?.content || {})
        setComments(data.comments || [])
        return
      }
      const data = await fetchJson(`/api/reporting/report?sessionKey=${encodeURIComponent(sessionKey)}`)
      revision.current = data.revision || 1
      dirty.current = false
      setReport(data)
      setContent(data.content)
      const thread = await fetchJson(`/api/reporting/comments?sessionKey=${encodeURIComponent(sessionKey)}`)
      setComments(thread.comments || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitReport() {
    setBusy(true)
    setError("")
    clearTimeout(saveTimer.current)
    try {
      await saveChain.current
      const assignmentId = previewAssignment.current
      if (dirty.current) {
        const savedReport = await fetchJson(assignmentId ? "/api/rec/rapporteur/preview-report" : "/api/reporting/report", {
          method: "PUT",
          body: JSON.stringify(assignmentId
            ? { assignmentId, sessionKey: report.sessionKey, content, expectedRevision: revision.current }
            : { sessionKey: report.sessionKey, content, expectedRevision: revision.current }),
        })
        revision.current = savedReport.revision
        dirty.current = false
      }
      const result = assignmentId
        ? await fetchJson("/api/rec/rapporteur/preview-report", {
          method: "POST",
          body: JSON.stringify({ assignmentId, sessionKey: report.sessionKey }),
        })
        : await fetchJson("/api/reporting/report/submit", {
          method: "POST",
          body: JSON.stringify({ sessionKey: report.sessionKey }),
        })
      setReport(null)
      setContent(null)
      setComments([])
      setComment("")
      setSaved("")
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
    await fetchJson("/api/reporting/auth/logout", { method: "POST", body: "{}" }).catch(() => null)
    setHome(null)
    setReport(null)
    setNotice("")
  }

  const editable = Boolean(report && (report.status === "draft" || report.status === "returned"))
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
          <Link href="/" className="rec-desk-brand">
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
        <Link href="/" className="rec-desk-brand">
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
          {home?.preview ? <Link href="/dashboard/rec-conference/admin/reporting" className="plain">Rapporteurs</Link> : home ? <button type="button" className="plain" onClick={logout}>Sign out</button> : null}
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
          <button type="button" className="plain" onClick={() => setReport(null)}>Sessions</button>
          {report.status === "submitted" ? <p className="rec-desk-state">With the approver for review.</p> : null}
          {report.status === "returned" ? <p className="rec-desk-state is-returned">The approver returned this report. Update it, then send it again.</p> : null}
          {report.status === "approved" ? <p className="rec-desk-state is-approved">Approved.</p> : null}
          <EngageWordDocument
            key={report.sessionKey}
            editable={editable}
            sections={[]}
            content={{ _documentHtml: rapporteurDocumentHtml({ ...report, content }) }}
            onChangeField={(_key, patch) => {
              const documentHtml = patch?._documentHtml
              if (!documentHtml) return
              edit({ ...content, documentHtml, purpose: purposeFromDocument(documentHtml) })
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
            <span className="quiet">{saved}</span>
            <button type="button" className="plain" onClick={() => downloadRapporteurReport({ ...report, content })}>Download</button>
            {editable && !reportContentReady(content) ? <span className="rec-report-need">Write the Purpose of the Session to send this report.</span> : null}
            {editable ? <button type="button" className="gold" disabled={busy || !reportContentReady(content)} onClick={submitReport}>Send to approver</button> : null}
          </div>
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
