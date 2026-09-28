"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  LoaderCircle,
  Mail
} from "lucide-react"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import ExhibitorApplicationForm from "./application-form"
const human = (value) => String(value || "").replaceAll("_", " ")
const time = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Kampala" })
    : "Not set"
async function api(path, body, method = "POST") {
  const response = await fetch(`/api/exhibitors/${path}`, {
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
  })
  const result = await response.json()
  if (!response.ok) {
    const error = new Error(result.error || "Request failed.")
    error.fields = result.fields || {}
    error.status = response.status
    throw error
  }
  return result
}
export default function ExhibitorPortal() {
  const query = useSearchParams(),
    conferenceId = query.get("conferenceId") || ""
  const [configuration, setConfiguration] = useState(null),
    [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("")
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [codeSent, setCodeSent] = useState(false),
    [page, setPage] = useState(1),
    [listing, setListing] = useState(null),
    [application, setApplication] = useState(null),
    [mode, setMode] = useState("list"),
    [action, setAction] = useState(""),
    [reason, setReason] = useState(""),
    [consent, setConsent] = useState(false),
    [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setSession(null)
    setApplication(null)
    setListing(null)
    setMode("list")
    setPage(1)
    setError("")
    api(
      `configuration${conferenceId ? `?conferenceId=${encodeURIComponent(conferenceId)}` : ""}`
    )
      .then(async (config) => {
        if (!active) return
        setConfiguration(config)
        try {
          const user = await api("auth/me")
          if (active) setSession(user.conferenceId === config.conference.$id ? user : null)
        } catch (e) {
          if (e.status !== 401 && active) setError(e.message)
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [conferenceId])
  useEffect(() => {
    let active = true
    if (!session) return
    api(`applications?page=${page}&limit=10`)
      .then((result) => active && setListing(result))
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [session, page, revision])
  const choose = async (id) => {
    setBusy(true)
    setError("")
    try {
      const app = await api(`applications/${id}`)
      setApplication(app)
      setMode("detail")
      setAction("")
      setConsent(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const save = async (data, submit) => {
    let result
    if (mode === "personal") {
      const allowed = ["title", "fullName", "firstName", "lastName", "phone", "days", "visaSupport", "passportNumber"]
      const details = Object.fromEntries(allowed.filter(key => Object.hasOwn(data.representatives[0], key)).map(key => [key, data.representatives[0][key]]))
      result = await api(`applications/${application.$id}/my-details`, { details, revision: application.revision, requestId: crypto.randomUUID() }, "PATCH")
    } else if (mode === "representatives")
      result = await api(
        `applications/${application.$id}/representatives`,
        {
          ...data,
          revision: application.revision,
          requestId: crypto.randomUUID()
        },
        "PATCH"
      )
    else
      result = await api(
        mode === "new" ? "applications" : `applications/${application.$id}`,
        {
          data,
          submit,
          revision: application?.revision,
          requestId: crypto.randomUUID()
        },
        mode === "new" ? "POST" : "PATCH"
      )
    setApplication(result.application)
    setMessage(result.warnings?.join(" ") || "Your application has been saved.")
    setMode("detail")
    setRevision((x) => x + 1)
  }
  const login = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      if (!codeSent) {
        await api("auth/request-otp", {
          conferenceId: configuration.conference.$id,
          email
        })
        setCodeSent(true)
        setMessage("Check your email for the six-digit access code.")
      } else {
        await api("auth/verify-otp", {
          conferenceId: configuration.conference.$id,
          email,
          code
        })
        setSession(await api("auth/me"))
        setCode("")
        setMessage("")
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="min-h-screen bg-white" data-site-motion="off">
      <Navbar conference={configuration?.conference} />
      <main
        id="main-content"
        className="exh-workspace"
        style={{ paddingTop: 120, paddingBottom: 64 }}
      >
        <header className="exh-toolbar">
          <div>
            <p className="exh-muted">
              {configuration?.conference.title || "REC & EXPO"}
            </p>
            <h1>Exhibitor applications</h1>
          </div>
          {session && (
            <button
              className="exh-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await api("auth/logout", {})
                  setSession(null)
                  setApplication(null)
                  setMode("list")
                  setCodeSent(false)
                } catch (e) {
                  setError(e.message)
                } finally {
                  setBusy(false)
                }
              }}
            >
              <LogOut size={18} />
              Sign out
            </button>
          )}
        </header>
        {error && (
          <div className="exh-alert exh-error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="exh-alert" role="status">
            {message}
          </div>
        )}
        {loading ? (
          <p role="status">Loading exhibition details...</p>
        ) : (
          configuration && (
            <>
              {!session ? (
                <div style={{ maxWidth: 560 }}>
                  <h2>Access your exhibition details</h2>
                  <p className="exh-muted">
                    Company contacts can manage their applications. Representatives can sign in with their registered email to update their own details. Submission does not guarantee exhibition space.
                  </p>
                  {!configuration.applicationsOpen && (
                    <p className="exh-alert">
                      New applications are currently closed. You can still sign
                      in to review an existing application.
                    </p>
                  )}
                  <form onSubmit={login}>
                    <div className="exh-field">
                      <label htmlFor="exh-access-email">
                        Company contact or representative email
                      </label>
                      <input
                        id="exh-access-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        disabled={busy || codeSent}
                        required
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    {codeSent && (
                      <div className="exh-field">
                        <label htmlFor="exh-access-code">
                          Email access code
                        </label>
                        <input
                          id="exh-access-code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={code}
                          required
                          onChange={(e) => setCode(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="exh-actions">
                      <button
                        className="exh-button exh-primary"
                        disabled={busy}
                      >
                        {busy ? (
                          <LoaderCircle size={18} className="exh-spin" />
                        ) : (
                          <Mail size={18} />
                        )}
                        {codeSent ? "Verify and continue" : "Send access code"}
                      </button>
                      {codeSent && (
                        <button
                          className="exh-button"
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setCodeSent(false)
                            setCode("")
                          }}
                        >
                          Change email / request new code
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {mode !== "list" && (
                    <button
                      className="exh-button"
                      onClick={() => {
                        setMode("list")
                        setError("")
                        setMessage("")
                      }}
                    >
                      <ArrowLeft size={18} />
                      My applications
                    </button>
                  )}
                  {mode === "list" && (
                    <>
                      <div className="exh-toolbar">
                        <p className="exh-muted">
                          Signed in as {session.email}
                        </p>
                        {configuration.applicationsOpen && (
                          <button
                            className="exh-button exh-primary"
                            onClick={() => {
                              setApplication(null)
                              setMode("new")
                              setMessage("")
                            }}
                          >
                            <Plus size={18} />
                            New company application
                          </button>
                        )}
                      </div>
                      <div className="exh-table-wrap">
                        <table className="exh-table">
                          <thead>
                            <tr>
                              <th>Company</th>
                              <th>Status</th>
                              <th>Submitted</th>
                              <th>View</th>
                            </tr>
                          </thead>
                          <tbody>
                            {listing?.documents.map((app) => (
                              <tr key={app.$id}>
                                <td>{app.companyName}</td>
                                <td>
                                  <span
                                    className={`exh-status exh-status-${app.status}`}
                                  >
                                    {human(app.status)}
                                  </span>
                                </td>
                                <td>{time(app.submittedAt)}</td>
                                <td>
                                  <button
                                    className="exh-button"
                                    disabled={busy}
                                    onClick={() => choose(app.$id)}
                                  >
                                    View application
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {!listing?.documents.length && (
                              <tr>
                                <td colSpan={4}>No applications yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="exh-pagination">
                        <span>
                          Page {page} of {listing?.totalPages || 1}
                        </span>
                        <div className="exh-actions">
                          <button
                            className="exh-button"
                            aria-label="Previous page"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            className="exh-button"
                            aria-label="Next page"
                            disabled={page >= (listing?.totalPages || 1)}
                            onClick={() => setPage(page + 1)}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {["new", "edit", "representatives", "personal"].includes(mode) && (
                    <ExhibitorApplicationForm
                      key={`${mode}-${application?.$id}`}
                      initialData={
                        (mode === "personal" ? { ...application.data, representatives: application.data.representatives.filter(r => r.email === session.email) } : application?.data) || {
                          companyName: "",
                          companyEmail: session.email,
                          companyPhone: "",
                          representatives: []
                        }
                      }
                      settings={configuration.settings}
                      days={configuration.conference.days}
                      onSave={save}
                      allowDraft={!["representatives", "personal"].includes(mode) && application?.status !== "submitted"}
                      representativesOnly={["representatives", "personal"].includes(mode)}
                      personalOnly={mode === "personal"}
                      submitLabel={
                        ["representatives", "personal"].includes(mode)
                          ? "Save representative details"
                          : application?.status === "submitted" ? "Amend and resubmit"
                          : "Submit application"
                      }
                      onCancel={() => setMode(application ? "detail" : "list")}
                    />
                  )}
                  {mode === "detail" && application && (
                    <article className="exh-detail">
                      <section>
                        <div className="exh-toolbar">
                          <h2>{application.companyName}</h2>
                          <span
                            className={`exh-status exh-status-${application.status}`}
                          >
                            {human(application.status)}
                          </span>
                        </div>
                        {application.accessRole !== "representative" && <><p>{application.data.proposal}</p>
                        <p>
                          <strong>Category:</strong> {application.data.category}
                        </p></>}
                        {application.decision.message && (
                          <div className="exh-alert">
                            {application.decision.message}
                          </div>
                        )}
                        {application.decision.conditions && (
                          <p>
                            <strong>Approval conditions:</strong>{" "}
                            {application.decision.conditions}
                          </p>
                        )}
                        {application.decision.booth && (
                          <p>
                            <strong>Allocation:</strong>{" "}
                            {application.decision.booth}
                          </p>
                        )}
                        {application.status === "approved" && (
                          <p>
                            <strong>Confirm by:</strong>{" "}
                            {time(application.confirmationDeadline)} (Kampala)
                          </p>
                        )}
                        <div className="exh-actions">
                          {application.accessRole !== "representative" && ["draft", "changes_requested", "submitted"].includes(
                            application.status
                          ) && (
                            <button
                              className="exh-button exh-primary"
                              onClick={() => setMode("edit")}
                            >
                              {application.status === "submitted" ? "Amend application" : "Edit application"}
                            </button>
                          )}
                          {application.accessRole !== "representative" && ["approved", "confirmed"].includes(
                            application.status
                          ) && (
                            <button
                              className="exh-button"
                              onClick={() => setMode("representatives")}
                            >
                              Complete representative details
                            </button>
                          )}
                          {application.data.representatives.some(r => r.email === session.email) && !["withdrawn", "cancelled", "rejected"].includes(application.status) && <button className="exh-button exh-primary" disabled={busy || application.data.representatives.filter(r => r.email === session.email).length !== 1} onClick={() => setMode("personal")}>Edit my details</button>}
                          {application.accessRole !== "representative" && ["under_review", "waitlisted", "approved", "confirmed"].includes(application.status) && <button className="exh-button" disabled={busy} onClick={() => { setAction("request_changes"); setReason("") }}>Request application correction</button>}
                          {application.allowedActions
                            .filter((a) => a !== "submitted")
                            .map((a) => (
                              <button
                                key={a}
                                className="exh-button"
                                disabled={busy}
                                onClick={() => {
                                  setAction(a)
                                  setReason("")
                                  setConsent(false)
                                }}
                              >
                                {a === "confirmed"
                                  ? "Confirm participation"
                                  : "Withdraw application"}
                              </button>
                            ))}
                        </div>
                      </section>
                      {application.accessRole === "representative" && application.data.representatives.length !== 1 && <p className="exh-alert">This email is shared by multiple representatives. Contact the REC team to verify separate email addresses before making personal changes.</p>}
                      {application.accessRole !== "representative" && ["under_review", "waitlisted", "approved", "confirmed"].includes(application.status) && <p className="exh-alert">The exhibition proposal is locked at this stage. Request a correction for the REC team to review. Personal details can still be completed separately.</p>}
                      <section>
                        <h2>Representatives</h2>
                        {application.data.representatives.map((r) => (
                          <div className="exh-representative" key={r.id}>
                            <strong>{r.fullName}</strong>
                            <p>
                              {r.email} / {r.phone}
                            </p>
                            <p>
                              {r.days?.join(", ") ||
                                "Attendance days not selected"}
                            </p>
                            <span className="exh-muted">
                              {application.links.find(
                                (l) => l.representativeId === r.id
                              )?.active
                                ? "Eligible for badge issuance by the REC team"
                                : "Pending representative activation"}
                            </span>
                          </div>
                        ))}
                      </section>
                      {action && (
                        <section>
                          <h2>
                            {action === "confirmed"
                              ? "Confirm your participation"
                              : action === "request_changes" ? "Request an application correction" : "Withdraw this application"}
                          </h2>
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault()
                              setBusy(true)
                              setError("")
                              try {
                                const result = await api(
                                  `applications/${application.$id}/${action === "request_changes" ? "request-changes" : "transition"}`,
                                  {
                                    status: action,
                                    reason,
                                    consentAccepted: consent,
                                    revision: application.revision,
                                    requestId: crypto.randomUUID()
                                  }
                                )
                                setApplication(result.application)
                                setAction("")
                                setMessage(result.warnings?.join(" ") || "Application updated.")
                                setRevision((x) => x + 1)
                              } catch (e) {
                                setError(e.message)
                              } finally {
                                setBusy(false)
                              }
                            }}
                          >
                            {action === "confirmed" ? (
                              <>
                                <div className="exh-consent">
                                  {configuration.settings.consentText}
                                </div>
                                <label className="exh-check">
                                  <input
                                    type="checkbox"
                                    checked={consent}
                                    required
                                    onChange={(e) =>
                                      setConsent(e.target.checked)
                                    }
                                  />
                                  I accept the declaration and approval
                                  conditions.
                                </label>
                              </>
                            ) : (
                              <div className="exh-field">
                                <label htmlFor="exh-withdraw">
                                  {action === "request_changes" ? "What needs to be corrected?" : "Reason for withdrawal"}
                                </label>
                                <textarea
                                  id="exh-withdraw"
                                  value={reason}
                                  required
                                  onChange={(e) => setReason(e.target.value)}
                                />
                              </div>
                            )}
                            <div className="exh-actions">
                              <button
                                type="button"
                                className="exh-button"
                                disabled={busy}
                                onClick={() => setAction("")}
                              >
                                Cancel
                              </button>
                              <button
                                className="exh-button exh-primary"
                                disabled={busy}
                              >
                                {busy ? "Saving..." : "Confirm"}
                              </button>
                            </div>
                          </form>
                        </section>
                      )}
                    </article>
                  )}
                </>
              )}
            </>
          )
        )}
      </main>
      <Footer conference={configuration?.conference} />
    </div>
  )
}
