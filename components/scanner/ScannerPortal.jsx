"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import jsQR from "jsqr"
import * as Dialog from "@radix-ui/react-dialog"
import { Camera, CheckCircle2, CircleAlert, Keyboard, LogOut, Mail, PauseCircle, Plug, QrCode, RefreshCcw, ScanLine, ShieldCheck, Smartphone, Unplug, Usb, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createSerialScanner, SERIAL_BAUD_RATES, SERIAL_DEFAULT_OPTIONS } from "@/lib/scanner-serial"
import { fetchScannerJson, scannerDate, scannerPhase, scannerPhases, scannerTypes } from "@/lib/scanner-client"
import { ScannerDashboard, ScannerActivity } from "./ScannerViews"

const sessionStorageKey = "nrep.rec.public.scanner.session"
const deviceStorageKey = "nrep.rec.public.scanner.device"
const scanModes = [
  { value: "camera", label: "Camera", icon: Camera },
  { value: "external", label: "External Scanner", icon: ScanLine },
  { value: "serial", label: "USB Serial", icon: Usb },
  { value: "manual", label: "Manual Entry", icon: Keyboard },
]

function getDeviceId() {
  if (typeof window === "undefined") return ""
  const existing = window.localStorage.getItem(deviceStorageKey)
  if (existing) return existing
  const next = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  window.localStorage.setItem(deviceStorageKey, next)
  return next
}

function resultTone(status) {
  if (status === "accepted") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "duplicate") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-red-200 bg-red-50 text-red-800"
}

function resultTitle(result) {
  if (result?.status === "accepted") return "Scan Accepted"
  if (result?.status === "duplicate") return "Already Scanned"
  if (result?.status === "unconfirmed") return "Scan not confirmed"
  return "Scan Rejected"
}

function resultMessage(result) {
  if (!result) return ""
  const registrant = result.registration?.name || result.registration?.email || ""
  const organization = result.registration?.organization ? ` · ${result.registration.organization}` : ""
  const sponsor = result.registration?.sponsorOrganization
    ? ` · Sponsored by ${result.registration.sponsorOrganization}`
    : ""
  const previous = result.previousScan?.scannedAt ? ` Previous scan: ${new Date(result.previousScan.scannedAt).toLocaleString("en-UG", { timeZone: "Africa/Kampala", dateStyle: "medium", timeStyle: "short" })}.` : ""
  return `${registrant || result.error || result.message || result.reason || "Scan processed"}${organization}${sponsor}${previous}`
}

function resultAttendance(result) {
  return result?.attendance || result?.details?.attendance || null
}

function formatDays(days) {
  return Array.isArray(days) && days.length ? days.join(", ") : "None"
}

function AttendanceSummary({ result }) {
  const attendance = resultAttendance(result)
  if (!attendance) return null

  return (
    <div className="mt-4 grid gap-2 rounded-lg bg-white/70 p-3 text-sm">
      <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
        <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Registered days</span>
        <strong className="break-words text-slate-950">{formatDays(attendance.registeredDays)}</strong>
      </div>
      <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
        <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Required event days</span>
        <strong className="break-words text-slate-950">{formatDays(attendance.requiredDays)}</strong>
      </div>
      {attendance.matchedDays?.length > 0 && (
        <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Matched days</span>
          <strong className="break-words text-slate-950">{formatDays(attendance.matchedDays)}</strong>
        </div>
      )}
      {attendance.message && <p className="m-0 text-sm font-bold leading-6 text-red-800">{attendance.message}</p>}
    </div>
  )
}

export default function ScannerPortal({ view = "dashboard", routeEventId = "", onNavigate, children }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const scanningRef = useRef(false)
  const lastPayloadRef = useRef("")
  const submittingRef = useRef(false)
  const requestRef = useRef(null)
  const cameraGeneration = useRef(0)
  const externalInputRef = useRef(null)
  const manualInputRef = useRef(null)
  const resultDialogRef = useRef(null)
  const readyInputButtonRef = useRef(null)
  const pendingReviewButtonRef = useRef(null)
  const serialControllerRef = useRef(null)
  const serialSubmitRef = useRef(null)
  const serialReadyButtonRef = useRef(null)
  const routeEventRef = useRef(routeEventId)

  const [email, setEmail] = useState("")
  const [conferences, setConferences] = useState([])
  const [conferenceId, setConferenceId] = useState("")
  const [otpId, setOtpId] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [session, setSession] = useState(null)
  const [events, setEvents] = useState([])
  const [eventListStatus, setEventListStatus] = useState("loading")
  const [eventListMessage, setEventListMessage] = useState("")
  const [eventId, setEventId] = useState(routeEventId)
  const [clockOffset, setClockOffset] = useState(0)
  const [clock, setClock] = useState(() => Date.now())
  const [revision, setRevision] = useState(0)
  const [lastRefreshed, setLastRefreshed] = useState("")
  const [authChecking, setAuthChecking] = useState(true)
  const [manualPayload, setManualPayload] = useState("")
  const [scanMode, setScanMode] = useState("camera")
  const [externalPayload, setExternalPayload] = useState("")
  const [externalArmed, setExternalArmed] = useState(false)
  const [externalFocused, setExternalFocused] = useState(false)
  const [online, setOnline] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)
  const [pendingScan, setPendingScan] = useState(null)
  const [result, setResult] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [loading, setLoading] = useState("")
  const [error, setError] = useState("")
  const [devLogin, setDevLogin] = useState(false)
  const [serialSupported, setSerialSupported] = useState(false)
  const [serialState, setSerialState] = useState("disconnected")
  const [serialError, setSerialError] = useState("")
  const [serialOptions, setSerialOptions] = useState(SERIAL_DEFAULT_OPTIONS)

  const activeEvent = useMemo(
    () => events.find((event) => event.$id === eventId) || null,
    [eventId, events]
  )
  const phase = scannerPhase(activeEvent, clock + clockOffset)
  const canScanSelectedEvent = phase === "open"
  const scanBlocked = Boolean(view !== "scan" || eventId !== routeEventId || loading || result || pendingScan || !online || !pageVisible || !canScanSelectedEvent)
  const serialConnected = ["connected", "arming", "ready"].includes(serialState)
  const pauseSerial = useCallback(() => serialControllerRef.current?.pause(), [])
  const expireSession = useCallback(() => {
    setError(requestRef.current ? "Your scanner access ended before the scan was confirmed. Check attendance with an administrator before scanning this badge again." : "Your scanner access has ended. Please sign in again.")
    requestRef.current = null
    setPendingScan(null); setResult(null); setSession(null); setEvents([])
  }, [])

  useLayoutEffect(() => {
    routeEventRef.current = routeEventId
    setEventId(routeEventId)
  }, [routeEventId])
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const available = Boolean(window.isSecureContext && navigator.serial?.requestPort)
    setSerialState("disconnected")
    setSerialSupported(available)
    if (!available) return
    const controller = createSerialScanner({
      serial: navigator.serial,
      onState: setSerialState,
      onError: setSerialError,
      onScan: (payload) => serialSubmitRef.current?.(payload),
    })
    serialControllerRef.current = controller
    return () => {
      serialControllerRef.current = null
      void controller.dispose()
    }
  }, [])

  useEffect(() => {
    if (!session) void serialControllerRef.current?.disconnect()
  }, [session])

  const loadEvents = useCallback(async () => {
    let data
    try {
      data = await fetchScannerJson("/api/scanner/events")
    } catch (err) {
      if ([401, 403].includes(err.status)) expireSession()
      setEvents([])
      setEventId("")
      setEventListStatus("error")
      setEventListMessage("Scan events could not be loaded. Check your connection and refresh events.")
      throw err
    }
    const rows = data.documents || []
    setEvents(rows)
    if (data.serverTime && Number.isFinite(Date.parse(data.serverTime))) setClockOffset(Date.parse(data.serverTime) - Date.now())
    setLastRefreshed(data.serverTime || new Date().toISOString())
    setEventListStatus("ready")
    setEventListMessage(data.emptyReason?.message || "No scan events are available for your account. Ask a conference administrator to review your event access.")
    setEventId(routeEventRef.current)
  }, [expireSession])

  useEffect(() => {
    window.localStorage.removeItem(sessionStorageKey)
    let active = true
    fetchScannerJson("/api/scanner/auth/me").then(async (data) => {
      if (!active) return
      setSession(data)
      await loadEvents()
    }).catch((err) => { if (active && err.status !== 401) setError(err.message) }).finally(() => { if (active) setAuthChecking(false) })
    fetchScannerJson("/api/scanner/auth/dev-login").then((data) => { if (active) setDevLogin(data.enabled === true) }).catch(() => {})
    return () => { active = false }
  }, [loadEvents])

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const stopCamera = useCallback(() => {
    cameraGeneration.current++
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
        expiresAt: data.expiresAt,
        operator: data.operator,
        conference: data.conference,
      }
      setSession(nextSession)
      await loadEvents()
    } catch (err) {
      setError(err.message || "Could not verify access code.")
    } finally {
      setLoading("")
    }
  }

  const submitScan = useCallback(async (payload, { retry = false } = {}) => {
    if (!session || submittingRef.current) return
    if (retry && !requestRef.current) return
    if (!retry && (view !== "scan" || eventId !== routeEventId || result || pendingScan || !online || !pageVisible || document.hidden)) return
    const value = String(payload || "").trim()
    if (!retry && (!eventId || !value)) return
    pauseSerial()
    if (!retry && (value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value))) {
      setExternalArmed(false)
      setExternalPayload("")
      setError("The scanned value is incomplete or contains unsupported characters. Check the scanner settings and try again.")
      return
    }
    if (!retry && !canScanSelectedEvent) {
      setExternalArmed(false)
      setResult({ status: "rejected", reason: "event_closed", error: activeEvent?.availabilityMessage || "This scan event is not open right now." })
      return
    }
    submittingRef.current = true
    setExternalArmed(false)
    setExternalPayload("")
    stopCamera()
    setLoading("scan")
    setError("")
    setResult(null)
    let timeout
    try {
      // Retries must keep the original event, credential, device and idempotency key.
      if (!retry) requestRef.current = {
        event: activeEvent,
        body: {
          eventId,
          qrPayload: value,
          clientNonce: crypto.randomUUID(),
          deviceId: getDeviceId(),
          deviceLabel: navigator.userAgent || "Scanner device",
        },
      }
      const controller = new AbortController()
      timeout = window.setTimeout(() => controller.abort(), 30000)
      const data = await fetchScannerJson("/api/scanner/scans", {
        method: "POST",
        body: JSON.stringify(requestRef.current.body),
        signal: controller.signal,
      })
      if (!["accepted", "duplicate", "rejected"].includes(data.status)) throw new Error("Missing scan confirmation")
      setResult({ ...data, event: data.event || requestRef.current.event })
      setRevision(value => value + 1)
      requestRef.current = null
      setPendingScan(null)
      setManualPayload("")
    } catch (err) {
      if (err.status === 401) {
        void serialControllerRef.current?.disconnect()
        requestRef.current = null
        setPendingScan(null)
        window.localStorage.removeItem(sessionStorageKey)
        setSession(null)
        setEvents([])
        setEventId("")
        setResult(null)
        setError(`${err.message || "Scanner access is no longer active."} Sign in again.`)
        return
      }
      const unconfirmed = Boolean(requestRef.current && (!err.status || err.status >= 500 || err.status === 408))
      const nextResult = {
        status: unconfirmed ? "unconfirmed" : "rejected",
        event: requestRef.current?.event || activeEvent,
        reason: err.code || "scan_failed",
        error: unconfirmed ? "The server did not confirm this scan. Retry this request without recording it twice." : err.message || "Scan failed",
        details: err.details || {},
      }
      setResult(nextResult)
      setPendingScan(unconfirmed ? nextResult : null)
      if (!unconfirmed) requestRef.current = null
    } finally {
      window.clearTimeout(timeout)
      submittingRef.current = false
      stopCamera()
      setLoading("")
    }
  }, [activeEvent, canScanSelectedEvent, eventId, online, pageVisible, pauseSerial, pendingScan, result, session, stopCamera, view, routeEventId])

  // Update the device gate before paint, so serial frames cannot use an old event/session.
  useLayoutEffect(() => {
    serialSubmitRef.current = (payload) => {
      if (scanMode !== "serial" || !session || scanBlocked || document.hidden || navigator.onLine === false) return
      void submitScan(payload)
    }
    if (scanMode !== "serial" || !session || scanBlocked) pauseSerial()
  }, [pauseSerial, scanBlocked, scanMode, session, submitScan])

  const startCamera = async () => {
    if (view !== "scan" || eventId !== routeEventId || submittingRef.current || pendingScan || !online || document.hidden) return
    setCameraError("")
    setResult(null)
    if (!canScanSelectedEvent) {
      setCameraError(activeEvent?.availabilityMessage || "This scan event is not open right now.")
      return
    }

    const generation = ++cameraGeneration.current
    lastPayloadRef.current = ""
    try {
      try { detectorRef.current = "BarcodeDetector" in window ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null } catch { detectorRef.current = null }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      if (generation !== cameraGeneration.current) { stream.getTracks().forEach((track) => track.stop()); return }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      if (generation !== cameraGeneration.current) { stream.getTracks().forEach((track) => track.stop()); return }
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
        if (!scanningRef.current || !videoRef.current || generation !== cameraGeneration.current) return
        try {
          let payload = ""
          if (detectorRef.current) {
            try { const codes = await detectorRef.current.detect(videoRef.current); payload = codes?.[0]?.rawValue || "" }
            catch { detectorRef.current = null; payload = detectWithCanvas() }
          } else {
            payload = detectWithCanvas()
          }
          if (generation !== cameraGeneration.current || !scanningRef.current) return
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

  useLayoutEffect(() => {
    stopCamera()
    pauseSerial()
    setExternalArmed(false)
    setExternalPayload("")
    setManualPayload("")
    if (view !== "scan") void serialControllerRef.current?.disconnect()
  }, [eventId, pauseSerial, stopCamera, view])

  useEffect(() => {
    if (!canScanSelectedEvent) {
      stopCamera()
      setExternalArmed(false)
      setExternalPayload("")
    }
  }, [canScanSelectedEvent, stopCamera])

  useEffect(() => {
    const updateAvailability = () => {
      setOnline(navigator.onLine !== false)
      setPageVisible(!document.hidden)
      if (document.hidden || navigator.onLine === false) {
        stopCamera()
        pauseSerial()
        setExternalArmed(false)
        setExternalPayload("")
      }
    }
    updateAvailability()
    const pauseInput = () => {
      stopCamera()
      pauseSerial()
      setExternalArmed(false)
      setExternalPayload("")
    }
    window.addEventListener("online", updateAvailability)
    window.addEventListener("offline", updateAvailability)
    window.addEventListener("blur", pauseInput)
    document.addEventListener("visibilitychange", updateAvailability)
    return () => {
      window.removeEventListener("online", updateAvailability)
      window.removeEventListener("offline", updateAvailability)
      window.removeEventListener("blur", pauseInput)
      document.removeEventListener("visibilitychange", updateAvailability)
    }
  }, [pauseSerial, stopCamera])

  useEffect(() => {
    if (session && scanMode === "external" && externalArmed && !scanBlocked) externalInputRef.current?.focus()
  }, [externalArmed, scanBlocked, scanMode, session])

  useEffect(() => {
    if (!pendingScan && loading !== "scan") return
    const warnBeforeLeaving = (event) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [pendingScan, loading])

  const changeScanMode = (value) => {
    if (loading === "scan" || pendingScan) return
    stopCamera()
    pauseSerial()
    if (value !== "serial") void serialControllerRef.current?.disconnect()
    setScanMode(value)
    setResult(null)
    setManualPayload("")
    setExternalPayload("")
    setExternalArmed(value === "external" && online && pageVisible && canScanSelectedEvent)
    setCameraError("")
    setError("")
  }

  const scanAnother = () => {
    if (pendingScan || loading === "scan") return
    setResult(null)
    setManualPayload("")
    setExternalPayload("")
    lastPayloadRef.current = ""
    if (scanMode === "camera") startCamera()
    else if (scanMode === "external") setExternalArmed(true)
    else if (scanMode === "serial") {
      if (serialConnected && online && pageVisible && canScanSelectedEvent) serialControllerRef.current?.arm()
      window.setTimeout(() => serialReadyButtonRef.current?.focus(), 0)
    }
    else window.setTimeout(() => manualInputRef.current?.focus(), 0)
  }

  const closeResult = () => {
    pauseSerial()
    setExternalArmed(false)
    setExternalPayload("")
    setResult(null)
    window.setTimeout(() => {
      if (pendingScan) pendingReviewButtonRef.current?.focus()
      else if (scanMode === "external") readyInputButtonRef.current?.focus()
      else if (scanMode === "serial") serialReadyButtonRef.current?.focus()
      else if (scanMode === "manual") manualInputRef.current?.focus()
    }, 0)
  }

  useEffect(() => {
    if (!session || view !== "scan") return
    const refresh = () => loadEvents().catch((err) => {
      if (err.status === 401) { setSession(null); stopCamera() }
      setError(err.message)
    })
    const timer = window.setInterval(refresh, 30000)
    const hidden = () => { if (document.hidden) stopCamera(); else refresh() }
    document.addEventListener("visibilitychange", hidden)
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", hidden) }
    refresh()
  }, [loadEvents, session, stopCamera, view])

  const loginForDevelopment = async () => {
    setLoading("dev"); setError("")
    try {
      const data = await fetchScannerJson("/api/scanner/auth/dev-login", { method: "POST", body: JSON.stringify({ email, conferenceId, deviceId: getDeviceId() }) })
      setSession(data); await loadEvents()
    } catch (err) { setError(err.message) } finally { setLoading("") }
  }

  const logout = async () => {
    if (submittingRef.current) return
    if (pendingScan && !window.confirm("This scan has not been confirmed. Signing out loses its retry request. Check attendance with an administrator before scanning this badge again. Sign out anyway?")) return
    pauseSerial()
    void serialControllerRef.current?.disconnect()
    if (session) {
      await fetchScannerJson("/api/scanner/auth/logout", {
        method: "POST",
      }).catch(() => {})
    }
    stopCamera()
    setExternalArmed(false)
    setExternalPayload("")
    setManualPayload("")
    setResult(null)
    setPendingScan(null)
    requestRef.current = null
    window.localStorage.removeItem(sessionStorageKey)
    setSession(null)
    setEvents([])
    setEventId("")
    setOtpId("")
    setOtpCode("")
  }

  const navigate = (href) => {
    if (loading === "scan" || pendingScan) { setError("Resolve the pending scan before changing pages or events."); return }
    stopCamera(); pauseSerial(); setExternalArmed(false); setResult(null); setError("")
    onNavigate?.(href)
  }

  return (
    <main data-site-motion="off" className="scanner-surface min-h-screen px-3 py-4 text-slate-950 sm:px-6 sm:py-5 lg:px-8">
      <section className="scanner-shell mx-auto grid w-full min-w-0 max-w-6xl gap-4 sm:gap-5">
        <header className="scanner-portal-header">
          <div className="min-w-0">
            <Link href="/" onClick={(event) => {
              if (loading === "scan" || pendingScan) {
                event.preventDefault()
                setError("Resolve the pending scan before leaving this page.")
              }
            }} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-white/75 hover:text-white">
              <Image src="/NREP.png" alt="NREP" width={36} height={36} />
              REC & Expo
            </Link>
            <h1>Scanner workspace</h1>
            <p className="scanner-muted">{session ? `${session.operator?.name || session.operator?.email} / ${session.conference?.title || "REC Conference"}` : "Conference operator access"}</p>
          </div>
          <div className="scanner-header-actions"><span className={`scanner-phase ${online ? "scanner-phase-open" : "scanner-phase-ended"}`}>{online ? "Online" : "Offline"}</span>
          {session && (
            <Button variant="outline" className="h-10 w-full rounded-lg border-white/25 bg-white/10 text-white hover:bg-white/15 sm:w-auto" onClick={logout} disabled={loading === "scan"}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          )}
          </div>
        </header>

        {session && <nav className="scanner-portal-nav" aria-label="Scanner navigation">
          <button type="button" aria-current={view === "dashboard" ? "page" : undefined} onClick={() => navigate("/scanner")}>Events</button>
          <button type="button" aria-current={view === "activity" ? "page" : undefined} onClick={() => navigate("/scanner/activity")}>My activity</button>
          <span>Times in EAT (UTC+3)</span>
        </nav>}
        {session && pendingScan && view !== "scan" && <div role="alert" className="scanner-inline-warning">A scan is awaiting confirmation. <Button onClick={() => onNavigate?.(`/scanner/events/${encodeURIComponent(requestRef.current?.body.eventId || eventId)}`)}>Return to pending scan</Button></div>}

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        {authChecking ? <div className="scanner-empty" role="status"><RefreshCcw className="h-5 w-5 animate-spin" />Checking scanner access...</div> : !session ? (
          <section className="w-full min-w-0 rounded-lg border border-white/20 bg-white p-4 shadow-sm shadow-black/20 sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-lg bg-[#176F91]/10 p-3 text-[#176F91]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Scanner Access</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Use the email address assigned by the REC admin team.</p>
              </div>
            </div>

            {!otpId ? (
              <form className="grid gap-4" onSubmit={lookupConferences}>
                <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                  Email
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-[#176F91]">
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
                      className="h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#176F91]"
                    >
                      {conferences.map((conference) => (
                        <option key={conference.$id} value={conference.$id}>{conference.title || `REC ${conference.year}`}</option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="h-11 w-full rounded-lg bg-[#176F91] font-bold text-white hover:bg-[#0B5E78] sm:w-auto" disabled={loading === "lookup"}>
                    {loading === "lookup" ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Check Access
                  </Button>
                  {conferences.length > 0 && (
                    <Button type="button" variant="outline" className="h-11 w-full rounded-lg font-bold sm:w-auto" onClick={requestOtp} disabled={loading === "otp" || !conferenceId}>
                      {loading === "otp" ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                      Send Code
                    </Button>
                  )}
                  {devLogin && conferenceId && <Button type="button" variant="outline" onClick={loginForDevelopment} disabled={Boolean(loading)}>Development sign-in</Button>}
                </div>
              </form>
            ) : (
              <form className="grid gap-4" onSubmit={verifyOtp}>
                <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                  Access Code
                  <input
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-14 rounded-lg border border-slate-200 bg-slate-50 px-3 text-center text-2xl font-semibold tracking-[0.35em] outline-none focus:border-[#176F91]"
                    placeholder="000000"
                    inputMode="numeric"
                    required
                  />
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="h-11 w-full rounded-lg bg-[#176F91] font-bold text-white hover:bg-[#0B5E78] sm:w-auto" disabled={loading === "verify" || otpCode.length !== 6}>
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
        ) : <>
          {view === "dashboard" && <ScannerDashboard onNavigate={navigate} onExpired={expireSession} revision={revision} now={clock + clockOffset} />}
          {view === "activity" && <ScannerActivity onExpired={expireSession} revision={revision} />}
          <section hidden={view !== "scan"} className="scanner-capture grid w-full min-w-0 gap-4 bg-white p-4 sm:gap-5 sm:p-7">
            <div className="scanner-capture-heading">
            <div className="grid min-w-0 gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold text-slate-950">{session.conference?.title || "Conference Scanner"}</h2>
                <p className="mt-1 text-sm text-slate-600">{session.operator?.name || session.operator?.email}</p>
              </div>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                Scan Event
                <select
                  value={activeEvent ? eventId : ""}
                  disabled={!events.length || loading === "scan" || Boolean(pendingScan)}
                  aria-describedby={!events.length ? "scanner-events-status" : undefined}
                  onChange={(event) => {
                    stopCamera()
                    pauseSerial()
                    setExternalArmed(false)
                    navigate(`/scanner/events/${encodeURIComponent(event.target.value)}`)
                    setResult(null)
                  }}
                  className="h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#176F91]"
                >
                  {!activeEvent && <option value="">{eventListStatus === "loading" ? "Loading scan events..." : eventListStatus === "error" ? "Events could not be loaded" : events.length ? "Event unavailable" : "No events available"}</option>}
                  {events.filter(event => event.$id === eventId || scannerPhase(event, clock + clockOffset) === "open").map((event) => (
                    <option key={event.$id} value={event.$id}>{event.name}{event.isCurrentlyOpen ? "" : " (closed)"}</option>
                  ))}
                </select>
              </label>
            </div>

            {!activeEvent && (
              <div id="scanner-events-status" role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <strong className="block">{eventListStatus === "loading" ? "Loading scan events..." : eventListStatus === "error" ? "Unable to load scan events" : "No scan events available"}</strong>
                {eventListStatus !== "loading" && <p className="mb-0 mt-1 leading-6">{events.length ? "This event is unavailable or no longer assigned to you. Choose another event from the dashboard." : eventListMessage}</p>}
              </div>
            )}

            {activeEvent && (
              <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="font-semibold text-slate-950">{activeEvent.name}</div>
                <div className="mt-1 text-slate-600">
                  {[scannerTypes[activeEvent.type], activeEvent.venue, activeEvent.day ? `Day ${activeEvent.day}` : ""].filter(Boolean).join(" · ")}
                </div>
                <p className="mt-2 text-sm text-slate-700">{scannerDate(activeEvent.date || activeEvent.startTime)} / {scannerDate(activeEvent.startTime, true)} - {scannerDate(activeEvent.endTime, true)} EAT</p>
                <div className={`scanner-phase scanner-phase-${phase}`}>
                  {canScanSelectedEvent ? "Open for scanning" : activeEvent.availabilityMessage || scannerPhases[phase]}
                </div>
              </div>
            )}
            </div>
            <div className="scanner-capture-work">

            {!online && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                Offline. Scanning is paused until your internet connection returns.
              </div>
            )}

            {pendingScan && !result && (
              <div role="alert" className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                <strong>A scan is awaiting confirmation. New scans are paused.</strong>
                <Button ref={pendingReviewButtonRef} type="button" variant="outline" onClick={() => setResult(pendingScan)} disabled={loading === "scan"}>Review pending scan</Button>
              </div>
            )}

            <div role="group" aria-label="Scan input method" className="grid min-w-0 grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:grid-cols-4">
              {scanModes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={scanMode === value}
                  disabled={loading === "scan" || Boolean(pendingScan)}
                  onClick={() => changeScanMode(value)}
                  className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-center text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176F91] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-row sm:gap-2 sm:text-sm ${scanMode === value ? "bg-white text-[#0B5E78] shadow-sm" : "text-slate-600 hover:bg-white/70"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {scanMode === "camera" && (
              <>
                <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                  <video ref={videoRef} className={`${cameraActive ? "block" : "hidden"} min-h-[320px] w-full object-cover`} muted playsInline />
                  {!cameraActive && (
                    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center text-white/75">
                      <QrCode className="h-12 w-12" />
                      <p className="text-sm font-bold">Camera is off</p>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    {cameraError}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  {!cameraActive ? (
                    <Button className="h-11 w-full rounded-lg bg-[#176F91] font-bold text-white hover:bg-[#0B5E78] sm:w-auto" onClick={startCamera} disabled={scanBlocked || !eventId}>
                      <Camera className="mr-2 h-4 w-4" />
                      Start Camera
                    </Button>
                  ) : (
                    <Button variant="outline" className="h-11 w-full rounded-lg font-bold sm:w-auto" onClick={stopCamera}>
                      Stop Camera
                    </Button>
                  )}
                </div>
              </>
            )}

            {scanMode === "external" && (
              <form
                aria-label="External scanner"
                className="grid min-w-0 gap-4 border-y border-slate-200 py-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (externalArmed && externalFocused && !scanBlocked) submitScan(externalPayload)
                }}
              >
                <div role="status" aria-live="polite" className={`flex min-w-0 items-center gap-2 text-sm font-semibold ${externalArmed && externalFocused && !scanBlocked ? "text-emerald-800" : "text-amber-900"}`}>
                  {externalArmed && externalFocused && !scanBlocked ? <ScanLine className="h-5 w-5 shrink-0" /> : <PauseCircle className="h-5 w-5 shrink-0" />}
                  {loading === "scan" ? "Checking badge..." : pendingScan ? "Paused - awaiting scan confirmation" : !online ? "Paused - offline" : !activeEvent ? "Paused - no scan event available" : !canScanSelectedEvent ? "Paused - scan event is closed" : externalArmed && externalFocused && !scanBlocked ? "Ready for scanner input" : "Scanner input paused"}
                </div>
                <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                  Scanner input
                  <input
                    ref={externalInputRef}
                    value={externalPayload}
                    onChange={(event) => setExternalPayload(event.target.value)}
                    onFocus={() => setExternalFocused(true)}
                    onBlur={() => {
                      setExternalFocused(false)
                      setExternalArmed(false)
                      setExternalPayload("")
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return
                      event.preventDefault()
                      if (!event.repeat && !event.nativeEvent.isComposing && externalArmed && externalFocused && !scanBlocked) submitScan(event.currentTarget.value)
                    }}
                    disabled={!externalArmed || scanBlocked}
                    inputMode="none"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={4096}
                    className="h-14 w-full min-w-0 rounded-lg border-2 border-slate-300 bg-white px-3 font-mono text-base outline-none focus:border-[#176F91] disabled:bg-slate-100"
                  />
                </label>
                <div>
                  <Button ref={readyInputButtonRef} type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => { setError(""); setExternalPayload(""); setExternalArmed(true) }} disabled={scanBlocked || externalArmed}>
                    <ScanLine className="mr-2 h-4 w-4" />
                    Ready to Scan
                  </Button>
                </div>
              </form>
            )}

            {scanMode === "serial" && (
              <div className="grid min-w-0 gap-4 border-y border-slate-200 py-5">
                {!serialSupported ? (
                  <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    USB Serial is unavailable in this browser or connection. Use a supported browser over HTTPS, or select External Scanner or Camera.
                  </div>
                ) : <>
                  <div role="status" aria-live="polite" className={`flex items-center gap-2 text-sm font-semibold ${serialState === "ready" && !scanBlocked ? "text-emerald-800" : "text-slate-700"}`}>
                    <Usb className="h-5 w-5 shrink-0" />
                    {serialState === "connecting" ? "Selecting / connecting serial port..." : serialState === "disconnecting" ? "Disconnecting serial port..." : serialState === "arming" ? "Clearing pending serial input..." : serialState === "ready" && !scanBlocked ? "Ready for serial scans" : serialConnected ? "Serial scanner connected - paused" : "Serial scanner disconnected"}
                  </div>
                  {serialError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{serialError}</div>}
                  <fieldset disabled={serialState !== "disconnected"} className="grid min-w-0 gap-3">
                    <legend className="mb-3 text-sm font-semibold text-slate-700">Serial port settings</legend>
                    <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                      Baud rate
                      <select value={serialOptions.baudRate} onChange={(event) => setSerialOptions({ ...serialOptions, baudRate: Number(event.target.value) || "" })} className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100">
                        <option value="">Select scanner baud rate</option>
                        {SERIAL_BAUD_RATES.map(rate => <option key={rate} value={rate}>{rate}</option>)}
                      </select>
                    </label>
                    <details>
                      <summary className="cursor-pointer py-2 text-sm font-semibold text-slate-700">Advanced port settings</summary>
                      <div className="mt-2 grid min-w-0 grid-cols-2 gap-3">
                        {[
                          { key: "dataBits", label: "Data bits", values: [7, 8] },
                          { key: "parity", label: "Parity", values: ["none", "even", "odd"] },
                          { key: "stopBits", label: "Stop bits", values: [1, 2] },
                          { key: "flowControl", label: "Flow control", values: ["none", "hardware"] },
                        ].map(({ key, label, values }) => (
                          <label key={key} className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
                            {label}
                            <select value={serialOptions[key]} onChange={(event) => setSerialOptions({ ...serialOptions, [key]: ["dataBits", "stopBits"].includes(key) ? Number(event.target.value) : event.target.value })} className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-base disabled:bg-slate-100">
                              {values.map(value => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                    </details>
                  </fieldset>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {!serialConnected ? (
                      <Button type="button" className="min-h-11" disabled={serialState !== "disconnected" || !serialOptions.baudRate} onClick={() => { setSerialError(""); void serialControllerRef.current?.connect(serialOptions) }}>
                        <Plug className="mr-2 h-4 w-4" />Connect Scanner
                      </Button>
                    ) : <>
                      <Button ref={serialReadyButtonRef} type="button" className="min-h-11" disabled={scanBlocked || serialState !== "connected"} onClick={() => { setSerialError(""); serialControllerRef.current?.arm() }}>
                        <ScanLine className="mr-2 h-4 w-4" />Ready to Scan
                      </Button>
                      <Button type="button" variant="outline" className="min-h-11" disabled={!["ready", "arming"].includes(serialState)} onClick={pauseSerial}>
                        <PauseCircle className="mr-2 h-4 w-4" />Pause Scanner
                      </Button>
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => { void serialControllerRef.current?.disconnect() }}>
                        <Unplug className="mr-2 h-4 w-4" />Disconnect Scanner
                      </Button>
                    </>}
                  </div>
                </>}
              </div>
            )}

            {scanMode === "manual" && <form
              className="grid min-w-0 gap-3 border-y border-slate-200 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault()
                submitScan(manualPayload)
              }}
            >
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
                Badge Number / QR Payload
                <input
                  ref={manualInputRef}
                  value={manualPayload}
                  onChange={(event) => setManualPayload(event.target.value)}
                  disabled={scanBlocked}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={4096}
                  className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#176F91]"
                  placeholder="Enter badge number, QR payload, or badge link"
                />
              </label>
              <Button type="submit" className="h-11 w-full rounded-lg bg-[#176F91] font-bold text-white hover:bg-[#0B5E78] sm:w-auto" disabled={!manualPayload.trim() || scanBlocked}>
                {loading === "scan" ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                Submit
              </Button>
            </form>}

            <div>
              <Button variant="outline" className="min-h-11 w-full font-bold sm:w-auto" disabled={loading === "scan"} onClick={() => { setError(""); loadEvents().catch((e) => setError(e.message)) }}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh Events
              </Button>
              <span className="scanner-updated">{lastRefreshed ? ` Updated ${scannerDate(lastRefreshed, true)} EAT` : ""}</span>
            </div>
            </div>
          </section>
            {result && (
              <Dialog.Root open onOpenChange={(open) => { if (!open) closeResult() }}><Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60" />
                <Dialog.Content ref={resultDialogRef} tabIndex={-1} onOpenAutoFocus={(event) => { event.preventDefault(); resultDialogRef.current?.focus() }} onCloseAutoFocus={(event) => { event.preventDefault() }} onPointerDownOutside={(e) => e.preventDefault()} className={`fixed left-1/2 top-1/2 z-[101] max-h-[90svh] w-[calc(100%-24px)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-white p-5 shadow-sm ${resultTone(result.status)}`}>
                  <div className="flex items-start gap-3">
                    {result.status === "accepted" ? (
                      <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0" />
                    ) : result.status === "duplicate" ? (
                      <CircleAlert className="mt-0.5 h-8 w-8 shrink-0" />
                    ) : (
                      <XCircle className="mt-0.5 h-8 w-8 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <Dialog.Title className="text-xl font-semibold text-slate-950">{resultTitle(result)}</Dialog.Title>
                      {result.event?.name && <p className="mt-2 text-sm font-bold text-[#176F91]">{result.event.name}</p>}
                      <Dialog.Description className="mt-2 break-words text-sm leading-6 text-slate-700">{resultMessage(result)}</Dialog.Description>
                      <AttendanceSummary result={result} />
                    </div>
                  </div>
                  {result.status === "unconfirmed" && <Button type="button" className="mt-4 w-full" disabled={loading === "scan" || !online} onClick={() => submitScan("", { retry: true })}>Retry this scan</Button>}
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      className="h-11 rounded-lg bg-[#176F91] font-bold text-white hover:bg-[#0B5E78]"
                      onClick={scanAnother}
                      disabled={view !== "scan" || Boolean(pendingScan) || loading === "scan" || !eventId || !canScanSelectedEvent || !online || (scanMode === "serial" && !serialConnected)}
                    >
                      {scanMode === "camera" ? <Camera className="mr-2 h-4 w-4" /> : scanMode === "serial" ? <Usb className="mr-2 h-4 w-4" /> : scanMode === "external" ? <ScanLine className="mr-2 h-4 w-4" /> : <Keyboard className="mr-2 h-4 w-4" />}
                      Scan Another Badge
                    </Button>
                    <Button type="button" variant="outline" className="h-11 rounded-lg font-bold" onClick={closeResult}>
                      Close
                    </Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal></Dialog.Root>
            )}
          </>
        }
        {children}
      </section>
    </main>
  )
}
