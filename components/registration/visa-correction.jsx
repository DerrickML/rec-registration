"use client"
import { useEffect, useState } from "react"
import {
  CheckCircle2,
  LoaderCircle,
  Mail,
  Save,
  ShieldCheck,
} from "lucide-react"
import "./visa-correction.css"

async function api(action, body) {
  const response = await fetch(
    `/api/visa/${action}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  )
  const result = await response.json()
  if (!response.ok)
    throw new Error(result.error || "Unable to complete this request.")
  return result
}
export default function VisaCorrection() {
  const [invitation, setInvitation] = useState(""),
    [ready, setReady] = useState(false),
    [stage, setStage] = useState("start")
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(null),
    [details, setDetails] = useState(null)
  const [passportNumber, setPassportNumber] = useState(""),
    [representatives, setRepresentatives] = useState([]),
    [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    // The invitation stays in the fragment, never in server access logs or referrer URLs.
    setInvitation(window.location.hash.slice(1))
    setReady(true)
    let active = true
    api("details")
      .then((result) => {
        if (active) {
          setDetails(result)
          setRepresentatives(result.representatives || [])
          setStage("edit")
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  const run = async (operation) => {
    setBusy(true)
    setError("")
    try {
      await operation()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const requestCode = () =>
    run(async () => {
      const result = await api("request-otp", { invitation })
      setSent(result)
      setStage("verify")
      setCooldown(60)
    })
  const verify = (event) => {
    event.preventDefault()
    void run(async () => {
      await api("verify-otp", { invitation, code })
      const result = await api("details")
      setDetails(result)
      setRepresentatives(result.representatives || [])
      setStage("edit")
    })
  }
  const save = (event) => {
    event.preventDefault()
    void run(async () => {
      await api(
        "complete",
        details.kind === "clarification"
          ? {
              representatives: representatives.map((r) => ({
                id: r.id,
                visaSupport: r.visaSupport,
                passportNumber: r.passportNumber || "",
              })),
            }
          : { passportNumber },
      )
      setPassportNumber("")
      setRepresentatives([])
      setStage("done")
      window.history.replaceState(null, "", window.location.pathname)
    })
  }
  const changeRep = (id, values) =>
    setRepresentatives((previous) =>
      previous.map((r) => (r.id === id ? { ...r, ...values } : r)),
    )
  return (
    <main className="visa-public">
      <div className="visa-public-heading">
        <ShieldCheck size={32} />
        <p>REC &amp; EXPO</p>
        <h1>Complete visa details</h1>
      </div>
      {error && (
        <div className="visa-public-error" role="alert">
          {error}
        </div>
      )}
      {!ready ? (
        <p role="status">Loading secure access...</p>
      ) : stage === "done" ? (
        <section role="status">
          <CheckCircle2 size={32} />
          <h2>Visa details updated</h2>
          <p>
            Your attendance days, registration, exhibition approval and badge
            have not changed.
          </p>
        </section>
      ) : stage === "edit" ? (
        <form onSubmit={save}>
          <h2>{details.name}</h2>
          <p>{details.conference.title}</p>
          <p>Only your visa-support details will be updated.</p>
          {details.kind === "clarification" ? (
            representatives.map((rep) => (
              <fieldset key={rep.id}>
                <legend>{rep.fullName}</legend>
                <label className="visa-public-check">
                  <input
                    type="checkbox"
                    checked={rep.visaSupport}
                    disabled={busy}
                    onChange={(e) =>
                      changeRep(rep.id, { visaSupport: e.target.checked })
                    }
                  />
                  Visa support required
                </label>
                {rep.visaSupport &&
                  (rep.passportProvided ? (
                    <p>Passport number already provided.</p>
                  ) : (
                    <label>
                      Passport number
                      <input
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        required
                        maxLength={15}
                        value={rep.passportNumber || ""}
                        disabled={busy}
                        onChange={(e) =>
                          changeRep(rep.id, { passportNumber: e.target.value })
                        }
                      />
                    </label>
                  ))}
              </fieldset>
            ))
          ) : (
            <label>
              Passport number
              <input
                type="text"
                name="passportNumber"
                autoComplete="off"
                spellCheck={false}
                required
                maxLength={15}
                value={passportNumber}
                disabled={busy}
                onChange={(e) => setPassportNumber(e.target.value)}
              />
            </label>
          )}
          <p className="visa-public-note">
            Passport details are used for conference visa-support processing.
            Please enter the number exactly as printed, including any leading
            zeros.
          </p>
          <button type="submit" disabled={busy}>
            {busy ? (
              <LoaderCircle className="visa-public-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {busy ? "Saving..." : "Save visa details"}
          </button>
        </form>
      ) : !invitation ? (
        <p>
          This page requires the secure link in your visa-details email. Contact
          the conference team for a new link.
        </p>
      ) : stage === "verify" ? (
        <form onSubmit={verify}>
          <h2>Verify your email</h2>
          <p>
            A code was sent to {sent?.email} for {sent?.conference}.
          </p>
          <label>
            Verification code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              disabled={busy}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <div className="visa-public-actions">
            <button type="submit" disabled={busy}>
              {busy ? (
                <LoaderCircle size={18} className="visa-public-spin" />
              ) : (
                <ShieldCheck size={18} />
              )}
              Verify code
            </button>
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={requestCode}
            >
              Resend code{cooldown ? ` (${cooldown}s)` : ""}
            </button>
          </div>
        </form>
      ) : (
        <section>
          <p>
            Verify your email address to securely complete your conference
            visa-support information.
          </p>
          <button type="button" disabled={busy} onClick={requestCode}>
            {busy ? (
              <LoaderCircle size={18} className="visa-public-spin" />
            ) : (
              <Mail size={18} />
            )}
            {busy ? "Sending..." : "Send verification code"}
          </button>
        </section>
      )}
    </main>
  )
}
