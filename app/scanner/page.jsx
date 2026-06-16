"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import jsQR from "jsqr"
import { BadgeCheck, Camera, CheckCircle2, CircleAlert, LogOut, Mail, QrCode, RefreshCcw, ShieldCheck, Smartphone, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const sessionStorageKey = "nrep.rec.public.scanner.session"
const deviceStorageKey = "nrep.rec.public.scanner.device"

function getDeviceId() {
  if (typeof window === "undefined") return ""
  const existing = window.localStorage.getItem(deviceStorageKey)
  if (existing) return existing
  const next = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  window.localStorage.setItem(deviceStorageKey, next)
  return next
}

async function fetchScannerJson(url, { token, ...options } = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || "Request failed")
  return payload
}

function resultTone(status) {
  if (status === "accepted") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "duplicate") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-red-200 bg-red-50 text-red-800"
}

function resultTitle(result) {
  if (result?.status === "accepted") return "Scan Accepted"
  if (result?.status === "duplicate") return "Already Scanned"
  return "Scan Rejected"
}

function resultMessage(result) {
  if (!result) return ""
  const registrant = result.registration?.name || result.registration?.email || ""
  const organization = result.registration?.organization ? ` · ${result.registration.organization}` : ""
  const previous = result.previousScan?.scannedAt ? ` Previous scan: ${new Date(result.previousScan.scannedAt).toLocaleString("en-UG", { timeZone: "Africa/Kampala", dateStyle: "medium", timeStyle: "short" })}.` : ""
  return `${registrant || result.error || result.reason || "Scan processed"}${organization}${previous}`
}

export default function PublicScannerPage() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const scanningRef = useRef(false)
  const lastPayloadRef = useRef("")

  const [email, setEmail] = useState("")
  const [conferences, setConferences] = useState([])
  const [conferenceId, setConferenceId] = useState("")
  const [otpId, setOtpId] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [session, setSession] = useState(null)
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState("")
  const [manualPayload, setManualPayload] = useState("")
  const [result, setResult] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [loading, setLoading] = useState("")
  const [error, setError] = useState("")

  const activeEvent = useMemo(
    () => events.find((event) => event.$id === eventId) || null,
    [eventId, events]
  )
  const canScanSelectedEvent = Boolean(
    activeEvent &&
    activeEvent.isCurrentlyOpen !== false &&
    !["event_not_started", "event_ended"].includes(activeEvent.availabilityCode)
  )

  const loadEvents = useCallback(async (token) => {
    const data = await fetchScannerJson("/api/scanner/events", { token })
    const rows = data.documents || []
    setEvents(rows)
    setEventId((current) => current || rows[0]?.$id || "")
  }, [])

  useEffect(() => {
    const stored = window.localStorage.getItem(sessionStorageKey)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.token) {
        setSession(parsed)
        loadEvents(parsed.token).catch(() => {
          window.localStorage.removeItem(sessionStorageKey)
          setSession(null)
        })
      }
    } catch {
      window.localStorage.removeItem(sessionStorageKey)
    }
  }, [loadEvents])

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const stopCamera = useCallback(() => {
    scanningRef.current = false
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  const lookupConferences = async (event) => {
    event.preventDefault()
    setLoading("lookup")
    setError("")
    try {
      const data = await fetchScannerJson(`/api/scanner/auth/request-otp?email=${encodeURIComponent(email)}`)
      const rows = data.conferences || []
      setConferences(rows)
      setConferenceId(rows[0]?.$id || "")
      if (!rows.length) setError("No active scanner access was found for this email.")
    } catch (err) {
      setError(err.message || "Could not check scanner access.")
    } finally {
      setLoading("")
    }
  }

  const requestOtp = async () => {
    setLoading("otp")
    setError("")
    try {
      const data = await fetchScannerJson("/api/scanner/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ email, conferenceId }),
      })
      setOtpId(data.otpId)
    } catch (err) {
      setError(err.message || "Could not send access code.")
    } finally {
      setLoading("")
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()
    setLoading("verify")
    setError("")
    try {
      const data = await fetchScannerJson("/api/scanner/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email,
          conferenceId,
          otpId,
          code: otpCode,
          deviceId: getDeviceId(),
          deviceLabel: navigator.userAgent || "Scanner device",
        }),
      })
      const nextSession = {
        token: data.token,
        expiresAt: data.expiresAt,
        operator: data.operator,
        conference: data.conference,
      }
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession))
      setSession(nextSession)
      await loadEvents(data.token)
    } catch (err) {
      setError(err.message || "Could not verify access code.")
    } finally {
      setLoading("")
    }
  }

  const submitScan = useCallback(async (payload) => {
    if (!session?.token || !eventId || !payload) return
    if (!canScanSelectedEvent) {
      setResult({ status: "rejected", reason: "event_closed", error: activeEvent?.availabilityMessage || "This scan event is not open right now." })
      return
    }
    setLoading("scan")
    setError("")
    setResult(null)
    try {
      const data = await fetchScannerJson("/api/scanner/scans", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({
          eventId,
          qrPayload: payload,
          clientNonce: window.crypto?.randomUUID?.() || `${Date.now()}`,
          deviceId: getDeviceId(),
          deviceLabel: navigator.userAgent || "Scanner device",
        }),
      })
      setResult(data)
      setManualPayload("")
    } catch (err) {
      setResult({ status: "rejected", reason: "scan_failed", error: err.message || "Scan failed" })
    } finally {
      stopCamera()
      setLoading("")
    }
  }, [activeEvent, canScanSelectedEvent, eventId, session, stopCamera])

  const startCamera = async () => {
    setCameraError("")
    setResult(null)
    if (!canScanSelectedEvent) {
      setCameraError(activeEvent?.availabilityMessage || "This scan event is not open right now.")
      return
    }

    try {
      detectorRef.current = "BarcodeDetector" in window ? detectorRef.current || new window.BarcodeDetector({ formats: ["qr_code"] }) : null
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      scanningRef.current = true

      const detectWithCanvas = () => {
        const video = videoRef.current
        if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return ""
        const canvas = canvasRef.current || document.createElement("canvas")
        canvasRef.current = canvas
        const maxWidth = 720
        const scale = Math.min(1, maxWidth / video.videoWidth)
        canvas.width = Math.max(1, Math.floor(video.videoWidth * scale))
        canvas.height = Math.max(1, Math.floor(video.videoHeight * scale))
        const context = canvas.getContext("2d", { willReadFrequently: true })
        if (!context) return ""
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        return jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" })?.data || ""
      }

      const tick = async () => {
        if (!scanningRef.current || !videoRef.current) return
        try {
          let payload = ""
          if (detectorRef.current) {
            const codes = await detectorRef.current.detect(videoRef.current)
            payload = codes?.[0]?.rawValue || ""
          } else {
            payload = detectWithCanvas()
          }
          if (payload && payload !== lastPayloadRef.current) {
            lastPayloadRef.current = payload
            stopCamera()
            await submitScan(payload)
            window.setTimeout(() => {
              lastPayloadRef.current = ""
            }, 2500)
          }
        } catch {
          // Ignore transient camera frames.
        }
        window.setTimeout(tick, 500)
      }
      tick()
    } catch (err) {
      setCameraError(err.message || "Could not start the camera.")
      stopCamera()
    }
  }

  const logout = async () => {
    if (session?.token) {
      await fetchScannerJson("/api/scanner/auth/logout", {
        method: "POST",
        token: session.token,
      }).catch(() => {})
    }
    stopCamera()
    window.localStorage.removeItem(sessionStorageKey)
    setSession(null)
    setEvents([])
    setEventId("")
    setOtpId("")
    setOtpCode("")
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#054653] px-3 py-4 text-slate-950 sm:px-6 sm:py-5 lg:px-8">
      <section className="mx-auto grid w-full min-w-0 max-w-5xl gap-4 sm:gap-5">
        <header className="flex flex-col gap-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href="/" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-white/75 hover:text-white">
              <BadgeCheck className="h-4 w-4 text-[#FFB803]" />
              REC & Expo
            </Link>
            <h1 className="break-words text-3xl font-extrabold leading-tight sm:text-5xl sm:leading-none">Conference Scanner</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Sign in with your assigned email, select a scan point, then scan attendee QR badges.
            </p>
          </div>
          {session && (
            <Button variant="outline" className="h-10 w-full rounded-lg border-white/25 bg-white/10 text-white hover:bg-white/15 sm:w-auto" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          )}
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        {!session ? (
          <section className="w-full min-w-0 rounded-2xl border border-white/20 bg-white p-4 shadow-2xl shadow-black/20 sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-[#0B7186]/10 p-3 text-[#0B7186]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Scanner Access</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Use the email address assigned by the REC admin team.</p>
              </div>
            </div>

            {!otpId ? (
              <form className="grid gap-4" onSubmit={lookupConferences}>
                <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                  Email
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#0B7186]">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                      placeholder="scanner@example.com"
                      required
                    />
                  </div>
                </label>

                {conferences.length > 0 && (
                  <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                    Conference
                    <select
                      value={conferenceId}
                      onChange={(event) => setConferenceId(event.target.value)}
                      className="h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0B7186]"
                    >
                      {conferences.map((conference) => (
                        <option key={conference.$id} value={conference.$id}>{conference.title || `REC ${conference.year}`}</option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="h-11 w-full rounded-lg bg-[#0B7186] font-bold text-white hover:bg-[#054653] sm:w-auto" disabled={loading === "lookup"}>
                    {loading === "lookup" ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Check Access
                  </Button>
                  {conferences.length > 0 && (
                    <Button type="button" variant="outline" className="h-11 w-full rounded-lg font-bold sm:w-auto" onClick={requestOtp} disabled={loading === "otp" || !conferenceId}>
                      {loading === "otp" ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                      Send Code
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <form className="grid gap-4" onSubmit={verifyOtp}>
                <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                  Access Code
                  <input
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-14 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-2xl font-extrabold tracking-[0.35em] outline-none focus:border-[#0B7186]"
                    placeholder="000000"
                    inputMode="numeric"
                    required
                  />
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="h-11 w-full rounded-lg bg-[#0B7186] font-bold text-white hover:bg-[#054653] sm:w-auto" disabled={loading === "verify" || otpCode.length !== 6}>
                    {loading === "verify" ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Verify Code
                  </Button>
                  <Button type="button" variant="outline" className="h-11 w-full rounded-lg font-bold sm:w-auto" onClick={() => setOtpId("")}>
                    Change Email
                  </Button>
                </div>
              </form>
            )}
          </section>
        ) : (
          <section className="grid w-full min-w-0 gap-4 rounded-2xl border border-white/20 bg-white p-4 shadow-2xl shadow-black/20 sm:gap-5 sm:p-7">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]">
              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold text-slate-950">{session.conference?.title || "Conference Scanner"}</h2>
                <p className="mt-1 text-sm text-slate-600">{session.operator?.name || session.operator?.email}</p>
              </div>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                Scan Event
                <select
                  value={eventId}
                  onChange={(event) => {
                    setEventId(event.target.value)
                    setResult(null)
                  }}
                  className="h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0B7186]"
                >
                  {events.map((event) => (
                    <option key={event.$id} value={event.$id}>{event.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {activeEvent && (
              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="font-extrabold text-slate-950">{activeEvent.name}</div>
                <div className="mt-1 text-slate-600">
                  {[activeEvent.type, activeEvent.venue, activeEvent.day ? `Day ${activeEvent.day}` : ""].filter(Boolean).join(" · ")}
                </div>
                <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${activeEvent.isCurrentlyOpen ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                  {activeEvent.isCurrentlyOpen ? "Open for scanning" : activeEvent.availabilityMessage || "Not open for scanning"}
                </div>
              </div>
            )}

            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              <video ref={videoRef} className={`${cameraActive ? "block" : "hidden"} min-h-[320px] w-full object-cover`} muted playsInline />
              {!cameraActive && (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center text-white/75">
                  <QrCode className="h-12 w-12" />
                  <p className="text-sm font-bold">Camera is off</p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                {cameraError}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {!cameraActive ? (
                <Button className="h-11 w-full rounded-lg bg-[#0B7186] font-bold text-white hover:bg-[#054653] sm:w-auto" onClick={startCamera} disabled={!eventId || !canScanSelectedEvent}>
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera
                </Button>
              ) : (
                <Button variant="outline" className="h-11 w-full rounded-lg font-bold sm:w-auto" onClick={stopCamera}>
                  Stop Camera
                </Button>
              )}
              <Button variant="outline" className="h-11 w-full rounded-lg font-bold sm:w-auto" onClick={() => loadEvents(session.token)}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh Events
              </Button>
            </div>

            <form
              className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault()
                submitScan(manualPayload)
              }}
            >
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                Manual Badge Number / QR Payload
                <input
                  value={manualPayload}
                  onChange={(event) => setManualPayload(event.target.value)}
                  className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0B7186]"
                  placeholder="Enter badge number, QR payload, or badge link"
                />
              </label>
              <Button type="submit" className="h-11 w-full rounded-lg bg-[#0B7186] font-bold text-white hover:bg-[#054653] sm:w-auto" disabled={!manualPayload || loading === "scan" || !canScanSelectedEvent}>
                {loading === "scan" ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                Submit
              </Button>
            </form>

            {result && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:items-center">
                <div className={`w-full max-w-md rounded-2xl border bg-white p-5 shadow-2xl ${resultTone(result.status)}`}>
                  <div className="flex items-start gap-3">
                    {result.status === "accepted" ? (
                      <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0" />
                    ) : result.status === "duplicate" ? (
                      <CircleAlert className="mt-0.5 h-8 w-8 shrink-0" />
                    ) : (
                      <XCircle className="mt-0.5 h-8 w-8 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-xl font-extrabold text-slate-950">{resultTitle(result)}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{resultMessage(result)}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      className="h-11 rounded-lg bg-[#0B7186] font-bold text-white hover:bg-[#054653]"
                      onClick={() => {
                        setResult(null)
                        lastPayloadRef.current = ""
                        startCamera()
                      }}
                      disabled={!eventId || !canScanSelectedEvent}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Scan Another Badge
                    </Button>
                    <Button type="button" variant="outline" className="h-11 rounded-lg font-bold" onClick={() => setResult(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  )
}
