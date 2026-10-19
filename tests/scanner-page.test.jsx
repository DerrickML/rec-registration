// @vitest-environment jsdom

import React from "react"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ScannerPortal from "../components/scanner/ScannerPortal"

function PublicScannerPage() {
  const [path, setPath] = React.useState("/scanner/events/entrance")
  return <ScannerPortal view={path === "/scanner/activity" ? "activity" : path === "/scanner" ? "dashboard" : "scan"} routeEventId={path.startsWith("/scanner/events/") ? path.split("/").at(-1) : ""} onNavigate={setPath} />
}

const openEvent = { $id: "entrance", name: "Main entrance", isCurrentlyOpen: true, day: 1 }
const secondEvent = { $id: "lunch", name: "Lunch", isCurrentlyOpen: true, day: 1 }
const session = { operator: { name: "Test operator" }, conference: { title: "REC test conference" } }
let scanRequest
let eventRows
let requests
let getUserMedia
let eventsRequest

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
const accepted = () => response({ status: "accepted", registration: { name: "Test attendee" } })

beforeEach(() => {
  vi.stubGlobal("React", React)
  vi.stubGlobal("isSecureContext", true)
  Object.defineProperty(navigator, "serial", { configurable: true, value: undefined })
  const storage = new Map()
  vi.stubGlobal("localStorage", {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  })
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.spyOn(document, "hidden", "get").mockReturnValue(false)
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] })
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } })
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue()
  eventRows = [openEvent, secondEvent]
  eventsRequest = async () => response({ documents: eventRows })
  requests = []
  scanRequest = async () => accepted()
  vi.stubGlobal("fetch", vi.fn(async (url, options) => {
    if (url === "/api/scanner/auth/me") return response(session)
    if (url === "/api/scanner/auth/dev-login") return response({ enabled: false })
    if (url === "/api/scanner/events") return eventsRequest()
    if (url === "/api/scanner/scans") {
      requests.push(JSON.parse(options.body))
      return scanRequest(options)
    }
    if (url === "/api/scanner/auth/logout") return response({ ok: true })
    throw new Error(`Unexpected test request: ${url}`)
  }))
})

function mockSerialDevice() {
  let stream
  const port = new EventTarget()
  port.open = vi.fn(async () => {
    port.readable = new ReadableStream({ start(controller) { stream = controller } })
  })
  port.close = vi.fn(async () => { port.readable = null })
  port.send = async (value) => act(async () => {
    stream.enqueue(new TextEncoder().encode(value))
    await Promise.resolve()
  })
  const serial = new EventTarget()
  serial.requestPort = vi.fn(async () => port)
  Object.defineProperty(navigator, "serial", { configurable: true, value: serial })
  return { port, serial }
}

async function connectSerial() {
  fireEvent.click(screen.getByRole("button", { name: "USB Serial", exact: true }))
  fireEvent.change(screen.getByRole("combobox", { name: "Baud rate" }), { target: { value: "9600" } })
  fireEvent.click(screen.getByRole("button", { name: "Connect Scanner" }))
  await screen.findByText("Serial scanner connected - paused")
}

async function armSerial() {
  fireEvent.click(screen.getByRole("button", { name: "Ready to Scan" }))
  await screen.findByText("Ready for serial scans")
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mount() {
  render(<PublicScannerPage />)
  await screen.findByRole("heading", { name: "REC test conference" })
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Scan Event" }).value).toBe("entrance"))
}

async function hardware() {
  fireEvent.click(screen.getByRole("button", { name: "External Scanner", exact: true }))
  const input = screen.getByRole("textbox", { name: "Scanner input" })
  await waitFor(() => expect(document.activeElement).toBe(input))
  return input
}

function scan(input, value = "rec:v1:AbCd_Ef-123") {
  fireEvent.change(input, { target: { value } })
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" })
}

describe("scanner event availability", () => {
  it("explains an unavailable assignment instead of rendering a blank dropdown", async () => {
    eventsRequest = async () => response({ documents: [], emptyReason: { code: "assigned_events_unavailable", message: "Your assigned scan events are unavailable. Ask an administrator to review them." } })
    render(<PublicScannerPage />)
    await screen.findByText("Your assigned scan events are unavailable. Ask an administrator to review them.")
    const select = screen.getByRole("combobox", { name: "Scan Event" })
    expect(select.disabled).toBe(true)
    expect(select.options[0].text).toBe("No events available")
    expect(screen.getByRole("button", { name: "Start Camera" }).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Manual Entry", exact: true }))
    expect(screen.getByRole("button", { name: "Submit", exact: true }).disabled).toBe(true)
    expect(requests).toHaveLength(0)
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it("handles older API responses with no explanation and refreshes after access repair", async () => {
    eventRows = []
    render(<PublicScannerPage />)
    await screen.findByText("No scan events are available for your account. Ask a conference administrator to review your event access.")
    eventRows = [openEvent]
    fireEvent.click(screen.getByRole("button", { name: "Refresh Events" }))
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Scan Event" }).value).toBe("entrance"))
    expect(screen.queryByText("No scan events available")).toBeNull()
    expect(screen.getByRole("button", { name: "Start Camera" }).disabled).toBe(false)
  })

  it("distinguishes loading failures from empty permissions and supports retry", async () => {
    eventsRequest = async () => response({ error: "Service unavailable" }, 503)
    render(<PublicScannerPage />)
    await screen.findByText("Unable to load scan events")
    expect(screen.getByRole("combobox", { name: "Scan Event" }).disabled).toBe(true)
    eventsRequest = async () => response({ documents: [openEvent] })
    fireEvent.click(screen.getByRole("button", { name: "Refresh Events" }))
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Scan Event" }).value).toBe("entrance"))
    expect(screen.queryByText("Unable to load scan events")).toBeNull()
  })

  it("does not mistake future assigned events for an empty event list", async () => {
    eventRows = [{ ...openEvent, isCurrentlyOpen: false, availabilityCode: "event_not_started", availabilityMessage: "This scan event has not started yet." }]
    await mount()
    expect(screen.getByRole("combobox", { name: "Scan Event" }).disabled).toBe(false)
    expect(screen.getByText("This scan event has not started yet.")).toBeTruthy()
    expect(screen.queryByText("No scan events available")).toBeNull()
    expect(screen.getByRole("button", { name: "Start Camera" }).disabled).toBe(true)
  })
})

describe("external REC scanner input", () => {
  it("uses explicit input modes with no camera access when hardware is selected", async () => {
    await mount()
    const input = await hardware()
    expect(screen.getByText("Ready for scanner input")).toBeTruthy()
    expect(input.getAttribute("inputmode")).toBe("none")
    expect(input.getAttribute("autocapitalize")).toBe("none")
    expect(input.getAttribute("autocomplete")).toBe("off")
    expect(screen.queryByRole("button", { name: "Start Camera" })).toBeNull()
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it.each(["rec:v1:AbCd_Ef-123", "https://rec.nrep.ug/badge/AbCd_Ef-123", "REC26ABC123", "REC-2026-123456"])("submits %s unchanged through the existing API", async value => {
    await mount()
    scan(await hardware(), value)
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Scan Accepted")).toBeTruthy()
    expect(document.getElementById(dialog.getAttribute("aria-describedby"))?.textContent).toContain("Test attendee")
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({ qrPayload: value, eventId: "entrance" })
    expect(requests[0].clientNonce).toMatch(/^[a-f0-9-]{36}$/)
    expect(requests[0].deviceId).toBeTruthy()
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it("prevents overlapping requests, held Enter and input while the result is open", async () => {
    let release
    scanRequest = () => new Promise(resolve => { release = resolve })
    await mount()
    const input = await hardware()
    scan(input)
    fireEvent.keyDown(input, { key: "Enter", repeat: true })
    fireEvent.submit(screen.getByRole("form", { name: "External scanner" }))
    expect(requests).toHaveLength(1)
    expect(input.disabled).toBe(true)
    await act(async () => release(accepted()))
    const dialog = await screen.findByRole("dialog")
    await waitFor(() => expect(document.activeElement).toBe(dialog))
    fireEvent.keyDown(dialog, { key: "Enter" })
    fireEvent.submit(screen.getByRole("form", { name: "External scanner", hidden: true }))
    expect(requests).toHaveLength(1)
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("ignores empty, composing and repeated Enter input", async () => {
    await mount()
    const input = await hardware()
    fireEvent.keyDown(input, { key: "Enter" })
    fireEvent.change(input, { target: { value: "REC26ABC123" } })
    fireEvent.keyDown(input, { key: "Enter", repeat: true })
    fireEvent.keyDown(input, { key: "Enter", isComposing: true })
    expect(requests).toHaveLength(0)
  })

  it("rearms hardware after Scan Another without opening the camera", async () => {
    await mount()
    const input = await hardware()
    scan(input)
    fireEvent.click(await screen.findByRole("button", { name: "Scan Another Badge" }))
    await waitFor(() => expect(document.activeElement).toBe(input))
    expect(input.value).toBe("")
    expect(input.disabled).toBe(false)
    scan(input)
    await screen.findByRole("dialog")
    expect(requests).toHaveLength(2)
    expect(requests[1].clientNonce).not.toBe(requests[0].clientNonce)
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it("Close pauses capture and requires explicit rearming", async () => {
    await mount()
    const input = await hardware()
    scan(input)
    fireEvent.click(await screen.findByRole("button", { name: "Close", exact: true }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(input.disabled).toBe(true)
    expect(screen.getByText("Scanner input paused")).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ready to Scan" })))
    fireEvent.click(screen.getByRole("button", { name: "Ready to Scan" }))
    await waitFor(() => expect(document.activeElement).toBe(input))
  })

  it("losing focus clears a partial scan rather than appending to it later", async () => {
    await mount()
    const input = await hardware()
    fireEvent.change(input, { target: { value: "rec:v1:partial" } })
    act(() => screen.getByRole("combobox", { name: "Scan Event" }).focus())
    expect(input.disabled).toBe(true)
    expect(input.value).toBe("")
    fireEvent.click(screen.getByRole("button", { name: "Ready to Scan" }))
    await waitFor(() => expect(document.activeElement).toBe(input))
    scan(input, "REC26ABC123")
    await screen.findByRole("dialog")
    expect(requests[0].qrPayload).toBe("REC26ABC123")
  })

  it.each(["offline", "blur", "hidden"])("pauses on %s and does not silently rearm", async reason => {
    await mount()
    const input = await hardware()
    fireEvent.change(input, { target: { value: "partial" } })
    act(() => {
      if (reason === "offline") {
        vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
        window.dispatchEvent(new Event("offline"))
      } else if (reason === "hidden") {
        vi.spyOn(document, "hidden", "get").mockReturnValue(true)
        document.dispatchEvent(new Event("visibilitychange"))
      } else window.dispatchEvent(new Event("blur"))
    })
    expect(input.disabled).toBe(true)
    expect(input.value).toBe("")
    act(() => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
      vi.spyOn(document, "hidden", "get").mockReturnValue(false)
      window.dispatchEvent(new Event("online"))
      document.dispatchEvent(new Event("visibilitychange"))
    })
    expect(input.disabled).toBe(true)
    expect(requests).toHaveLength(0)
  })

  it("ignores keyboard input elsewhere and pauses when changing the selected event", async () => {
    await mount()
    const input = await hardware()
    fireEvent.change(input, { target: { value: "partial" } })
    const selector = screen.getByRole("combobox", { name: "Scan Event" })
    fireEvent.change(selector, { target: { value: "lunch" } })
    fireEvent.keyDown(selector, { key: "Enter" })
    expect(input.value).toBe("")
    expect(input.disabled).toBe(true)
    expect(requests).toHaveLength(0)
    fireEvent.click(screen.getByRole("button", { name: "Ready to Scan" }))
    await waitFor(() => expect(document.activeElement).toBe(input))
    scan(input)
    await screen.findByRole("dialog")
    expect(requests[0].eventId).toBe("lunch")
  })

  it("stops hardware capture when refreshed event availability closes", async () => {
    await mount()
    const input = await hardware()
    eventRows = [{ ...openEvent, isCurrentlyOpen: false, availabilityCode: "event_ended" }]
    fireEvent.click(screen.getByRole("button", { name: "Refresh Events" }))
    await screen.findByText("Paused - scan event is closed")
    expect(input.disabled).toBe(true)
    expect(screen.getByRole("button", { name: "Ready to Scan" }).disabled).toBe(true)
    fireEvent.submit(screen.getByRole("form", { name: "External scanner" }))
    expect(requests).toHaveLength(0)
  })

  it.each(["duplicate", "rejected"])("shows %s results without claiming acceptance", async status => {
    scanRequest = async () => response({ status, message: "Not an admission confirmation" })
    await mount()
    scan(await hardware())
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).queryByText("Scan Accepted")).toBeNull()
    expect(within(dialog).getByText(status === "duplicate" ? "Already Scanned" : "Scan Rejected")).toBeTruthy()
  })

  it("keeps unconfirmed scans paused and retries exactly the original request", async () => {
    scanRequest = async () => response({ error: "Gateway unavailable" }, 503)
    await mount()
    scan(await hardware(), "rec:v1:CaseSensitive")
    await screen.findByText("Scan not confirmed")
    expect(screen.getByRole("button", { name: "Scan Another Badge" }).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Review pending scan" })))
    const leaving = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(leaving)
    expect(leaving.defaultPrevented).toBe(true)
    expect(screen.getByRole("combobox", { name: "Scan Event" }).disabled).toBe(true)
    expect(screen.getByRole("button", { name: "Camera", exact: true }).disabled).toBe(true)
    expect(screen.getByRole("button", { name: "Ready to Scan" }).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Review pending scan" }))
    scanRequest = async () => accepted()
    fireEvent.click(screen.getByRole("button", { name: "Retry this scan" }))
    await screen.findByText("Scan Accepted")
    expect(requests).toHaveLength(2)
    expect(requests[1]).toEqual(requests[0])
    const resolved = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(resolved)
    expect(resolved.defaultPrevented).toBe(false)
  })

  it("retries the original event even if it is removed from the refreshed event list", async () => {
    scanRequest = async () => response({ error: "Gateway unavailable" }, 503)
    await mount()
    scan(await hardware())
    fireEvent.click(await screen.findByRole("button", { name: "Close", exact: true }))
    eventRows = [secondEvent]
    fireEvent.click(screen.getByRole("button", { name: "Refresh Events" }))
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Scan Event" }).value).toBe(""))
    fireEvent.click(screen.getByRole("button", { name: "Review pending scan" }))
    scanRequest = async () => accepted()
    fireEvent.click(screen.getByRole("button", { name: "Retry this scan" }))
    await screen.findByText("Scan Accepted")
    expect(requests[1]).toEqual(requests[0])
    expect(requests[1].eventId).toBe("entrance")
  })

  it("warns before signing out with an unconfirmed scan and respects cancellation", async () => {
    scanRequest = async () => response({ error: "Gateway unavailable" }, 503)
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    await mount()
    scan(await hardware())
    fireEvent.click(await screen.findByRole("button", { name: "Close", exact: true }))
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(screen.getByRole("button", { name: "Review pending scan" })).toBeTruthy()
    expect(fetch.mock.calls.some(([url]) => url === "/api/scanner/auth/logout")).toBe(false)
  })

  it.each(["network", "invalid-json", "timeout"])("never reports acceptance for a %s failure", async failure => {
    scanRequest = async ({ signal }) => {
      if (failure === "network") throw new TypeError("Network failed")
      if (failure === "invalid-json") return response({})
      return new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true }))
    }
    await mount()
    const input = await hardware()
    if (failure === "timeout") vi.useFakeTimers()
    scan(input)
    if (failure === "timeout") {
      await act(async () => vi.advanceTimersByTimeAsync(30000))
      expect(screen.getByText("Scan not confirmed")).toBeTruthy()
    } else await screen.findByText("Scan not confirmed")
    expect(requests).toHaveLength(1)
  })

  it("treats a revoked badge as a definitive rejection and preserves operator access", async () => {
    scanRequest = async () => response({ error: "Badge revoked", code: "invalid_token" }, 400)
    await mount()
    scan(await hardware())
    await screen.findByText("Badge revoked")
    expect(screen.queryByRole("button", { name: "Retry this scan" })).toBeNull()
    expect(screen.getByRole("button", { name: "Scan Another Badge" }).disabled).toBe(false)
    expect(screen.getByRole("button", { name: "Sign out", hidden: true })).toBeTruthy()
  })

  it("returns an expired operator session to login", async () => {
    scanRequest = async () => response({ error: "Scanner session expired" }, 401)
    await mount()
    scan(await hardware())
    await screen.findByRole("heading", { name: "Scanner Access" })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.queryByRole("textbox", { name: "Scanner input" })).toBeNull()
  })

  it("keeps manual entry available and never starts the camera after its results", async () => {
    await mount()
    fireEvent.click(screen.getByRole("button", { name: "Manual Entry", exact: true }))
    const input = screen.getByRole("textbox", { name: "Badge Number / QR Payload" })
    fireEvent.change(input, { target: { value: "  REC26ABC123  " } })
    fireEvent.click(screen.getByRole("button", { name: "Submit", exact: true }))
    fireEvent.click(await screen.findByRole("button", { name: "Scan Another Badge" }))
    await waitFor(() => expect(document.activeElement).toBe(input))
    expect(requests[0].qrPayload).toBe("REC26ABC123")
    expect(input.value).toBe("")
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it("rejects control characters before contacting the server", async () => {
    await mount()
    scan(await hardware(), "rec:v1:bad\u0000value")
    await screen.findByText(/contains unsupported characters/)
    expect(requests).toHaveLength(0)
  })

  it("retains camera scanning and stops the stream when switching to hardware", async () => {
    const stop = vi.fn()
    getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] })
    await mount()
    fireEvent.click(screen.getByRole("button", { name: "Start Camera" }))
    await screen.findByRole("button", { name: "Stop Camera" })
    await hardware()
    expect(stop).toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: "Stop Camera" })).toBeNull()
  })
})

describe("USB serial REC scanner page", () => {
  it.each(["unsupported", "insecure"])("offers fallback modes when serial is %s", async reason => {
    const device = mockSerialDevice()
    if (reason === "unsupported") Object.defineProperty(navigator, "serial", { configurable: true, value: undefined })
    else vi.stubGlobal("isSecureContext", false)
    await mount()
    fireEvent.click(screen.getByRole("button", { name: "USB Serial", exact: true }))
    expect(screen.getByText(/USB Serial is unavailable/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Connect Scanner" })).toBeNull()
    expect(device.serial.requestPort).not.toHaveBeenCalled()
  })

  it("requires explicit baud selection and forwards advanced settings", async () => {
    const { port, serial } = mockSerialDevice()
    await mount()
    fireEvent.click(screen.getByRole("button", { name: "USB Serial", exact: true }))
    expect(screen.getByRole("button", { name: "Connect Scanner" }).disabled).toBe(true)
    expect(serial.requestPort).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole("combobox", { name: "Baud rate" }), { target: { value: "115200" } })
    fireEvent.click(screen.getByText("Advanced port settings"))
    fireEvent.change(screen.getByRole("combobox", { name: "Parity" }), { target: { value: "even" } })
    fireEvent.change(screen.getByRole("combobox", { name: "Stop bits" }), { target: { value: "2" } })
    fireEvent.change(screen.getByRole("combobox", { name: "Flow control" }), { target: { value: "hardware" } })
    fireEvent.click(screen.getByRole("button", { name: "Connect Scanner" }))
    await screen.findByText("Serial scanner connected - paused")
    expect(port.open).toHaveBeenCalledWith({ baudRate: 115200, dataBits: 8, parity: "even", stopBits: 2, flowControl: "hardware", bufferSize: 8192 })
    expect(screen.getByRole("combobox", { name: "Baud rate" }).closest("fieldset").disabled).toBe(true)
  })

  it("submits a complete serial badge without a focused text field and rearms without camera access", async () => {
    const { port } = mockSerialDevice()
    await mount()
    await connectSerial()
    await port.send("ignored-before-ready\r")
    await armSerial()
    act(() => screen.getByRole("button", { name: "Refresh Events" }).focus())
    await port.send("rec:v1:MiXeD_")
    expect(requests).toHaveLength(0)
    await port.send("Token\r\nsecond-badge\r")
    await screen.findByText("Scan Accepted")
    expect(requests).toHaveLength(1)
    expect(requests[0].qrPayload).toBe("rec:v1:MiXeD_Token")
    fireEvent.click(screen.getByRole("button", { name: "Scan Another Badge" }))
    await screen.findByText("Ready for serial scans")
    await port.send("REC26ABC123\r")
    await screen.findByText("Scan Accepted")
    expect(requests).toHaveLength(2)
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it("Close keeps the connection but pauses input until explicitly rearmed", async () => {
    const { port } = mockSerialDevice()
    await mount()
    await connectSerial()
    await armSerial()
    await port.send("REC26ABC123\r")
    fireEvent.click(await screen.findByRole("button", { name: "Close", exact: true }))
    await port.send("ignored-while-paused\r")
    expect(requests).toHaveLength(1)
    expect(port.close).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ready to Scan" })))
    await armSerial()
    await port.send("REC26XYZ123\r")
    await screen.findByRole("dialog")
    expect(requests).toHaveLength(2)
  })

  it.each(["offline", "hidden", "blur", "event-change", "event-closed", "pause-button"])("discards live input after %s without replaying it", async reason => {
    const { port } = mockSerialDevice()
    await mount()
    await connectSerial()
    await armSerial()
    if (reason === "event-change") fireEvent.change(screen.getByRole("combobox", { name: "Scan Event" }), { target: { value: "lunch" } })
    else if (reason === "event-closed") {
      eventRows = [{ ...openEvent, isCurrentlyOpen: false, availabilityCode: "event_ended" }]
      fireEvent.click(screen.getByRole("button", { name: "Refresh Events" }))
      await screen.findByRole("option", { name: "Main entrance (closed)" })
    } else if (reason === "pause-button") fireEvent.click(screen.getByRole("button", { name: "Pause Scanner" }))
    else act(() => {
      if (reason === "offline") {
        vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
        window.dispatchEvent(new Event("offline"))
      } else if (reason === "hidden") {
        vi.spyOn(document, "hidden", "get").mockReturnValue(true)
        document.dispatchEvent(new Event("visibilitychange"))
      } else window.dispatchEvent(new Event("blur"))
    })
    await screen.findByText("Serial scanner connected - paused")
    await port.send("paused-badge\r")
    expect(requests).toHaveLength(0)
    expect(port.close).not.toHaveBeenCalled()
  })

  it("disconnects when switching modes and does not submit serial data again", async () => {
    const { port } = mockSerialDevice()
    await mount()
    await connectSerial()
    await armSerial()
    fireEvent.click(screen.getByRole("button", { name: "Manual Entry", exact: true }))
    await waitFor(() => expect(port.close).toHaveBeenCalledOnce())
    expect(requests).toHaveLength(0)
    expect(screen.getByRole("textbox", { name: "Badge Number / QR Payload" })).toBeTruthy()
  })

  it("keeps the HTTP retry valid after the serial device disconnects", async () => {
    const { port } = mockSerialDevice()
    scanRequest = async () => response({ error: "Gateway unavailable" }, 503)
    await mount()
    await connectSerial()
    await armSerial()
    await port.send("rec:v1:OriginalBadge\r")
    fireEvent.click(await screen.findByRole("button", { name: "Close", exact: true }))
    expect(screen.getByRole("button", { name: "Ready to Scan" }).disabled).toBe(true)
    await port.send("must-not-queue\r")
    fireEvent.click(screen.getByRole("button", { name: "Disconnect Scanner" }))
    await waitFor(() => expect(port.close).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole("button", { name: "Review pending scan" }))
    scanRequest = async () => accepted()
    fireEvent.click(screen.getByRole("button", { name: "Retry this scan" }))
    await screen.findByText("Scan Accepted")
    expect(requests).toHaveLength(2)
    expect(requests[1]).toEqual(requests[0])
    expect(screen.getByRole("button", { name: "Scan Another Badge" }).disabled).toBe(true)
  })

  it("shows a cancelled chooser without losing the operator session", async () => {
    const { serial } = mockSerialDevice()
    serial.requestPort.mockRejectedValue(new DOMException("Cancelled", "NotFoundError"))
    await mount()
    fireEvent.click(screen.getByRole("button", { name: "USB Serial", exact: true }))
    fireEvent.change(screen.getByRole("combobox", { name: "Baud rate" }), { target: { value: "9600" } })
    fireEvent.click(screen.getByRole("button", { name: "Connect Scanner" }))
    await screen.findByText("No serial port was selected.")
    expect(screen.getByRole("button", { name: "Connect Scanner" }).disabled).toBe(false)
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy()
  })

  it("cleans up the port on page unmount", async () => {
    const { port } = mockSerialDevice()
    await mount()
    await connectSerial()
    cleanup()
    await waitFor(() => expect(port.close).toHaveBeenCalledOnce())
  })

  it("closes serial access when the operator session expires", async () => {
    const { port } = mockSerialDevice()
    scanRequest = async () => response({ error: "Expired scanner session" }, 401)
    await mount()
    await connectSerial()
    await armSerial()
    await port.send("REC26ABC123\r")
    await screen.findByRole("heading", { name: "Scanner Access" })
    await waitFor(() => expect(port.close).toHaveBeenCalledOnce())
  })

  it("releases the serial port when event refresh detects a signed-out session", async () => {
    const { port } = mockSerialDevice()
    await mount()
    await connectSerial()
    const original = fetch.getMockImplementation()
    fetch.mockImplementation((url, options) => url === "/api/scanner/events" ? Promise.resolve(response({ error: "Expired" }, 401)) : original(url, options))
    fireEvent.click(screen.getByRole("button", { name: "Refresh Events" }))
    await screen.findByRole("heading", { name: "Scanner Access" })
    await waitFor(() => expect(port.close).toHaveBeenCalledOnce())
    expect(requests).toHaveLength(0)
  })
})
