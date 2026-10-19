import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSerialScanner } from "../lib/scanner-serial"
import nextConfig from "../next.config.mjs"

const settings = { baudRate: 9600, dataBits: 8, parity: "none", stopBits: 1, flowControl: "none" }
let device
let scanner
let states
let scans
let errors

function makePort() {
  let source
  const port = new EventTarget()
  port.open = vi.fn(async () => {
    port.readable = new ReadableStream({ start(controller) { source = controller } })
  })
  port.close = vi.fn(async () => { port.readable = null })
  port.send = value => source.enqueue(typeof value === "string" ? new TextEncoder().encode(value) : value)
  port.end = () => source.close()
  port.fail = () => source.error(new Error("USB cable removed"))
  return port
}

beforeEach(() => {
  vi.useFakeTimers()
  device = new EventTarget()
  device.port = makePort()
  device.requestPort = vi.fn(async () => device.port)
  states = vi.fn()
  scans = vi.fn()
  errors = vi.fn()
  scanner = createSerialScanner({ serial: device, onState: states, onScan: scans, onError: errors })
})
afterEach(async () => {
  await scanner.dispose()
  vi.useRealTimers()
})

const flush = () => vi.advanceTimersByTimeAsync(0)
async function ready() {
  expect(scanner.arm()).toBe(true)
  await vi.advanceTimersByTimeAsync(200)
}
async function connect() {
  expect(await scanner.connect(settings)).toBe(true)
}

describe("USB serial scanner transport", () => {
  it("limits the serial Permissions-Policy to the scanner page's own origin", async () => {
    const headers = await nextConfig.headers()
    expect(headers.find(item => item.source === "/scanner/:path*").headers).toContainEqual({ key: "Permissions-Policy", value: "serial=(self)" })
    expect(headers.filter(item => item.source !== "/scanner/:path*").some(item => item.headers.some(header => header.key === "Permissions-Policy"))).toBe(false)
  })

  it("requests a port during the connect action and remains paused until armed", async () => {
    const opening = scanner.connect(settings)
    expect(device.requestPort).toHaveBeenCalledOnce()
    expect(await opening).toBe(true)
    expect(device.port.open).toHaveBeenCalledWith({ ...settings, bufferSize: 8192 })
    device.port.send("ignored\r")
    await flush()
    expect(scans).not.toHaveBeenCalled()
    expect(states).toHaveBeenLastCalledWith("connected")
    await ready()
    expect(states).toHaveBeenLastCalledWith("ready")
  })

  it.each([{}, { baudRate: "9600" }, { baudRate: 0 }, { ...settings, dataBits: 9 }, { ...settings, parity: "invalid" }, { ...settings, stopBits: 3 }, { ...settings, flowControl: "invalid" }])("rejects invalid port settings %j before asking for permission", async options => {
    expect(await scanner.connect(options)).toBe(false)
    expect(device.requestPort).not.toHaveBeenCalled()
    expect(errors).toHaveBeenCalledWith(expect.stringContaining("valid port settings"))
  })

  it.each(["\r", "\n", "\r\n"])("assembles fragments and accepts %j terminators exactly once", async ending => {
    await connect()
    await ready()
    device.port.send("rec:v1:Ab")
    await flush()
    device.port.send(`Cd_123${ending}`)
    await flush()
    expect(scans).toHaveBeenCalledExactlyOnceWith("rec:v1:AbCd_123")
    expect(states).toHaveBeenLastCalledWith("connected")
  })

  it("decodes UTF-8 characters split across byte chunks", async () => {
    await connect()
    await ready()
    const bytes = new TextEncoder().encode("Case-\u00e9-\u2713\r")
    for (const byte of bytes) {
      device.port.send(new Uint8Array([byte]))
      await flush()
    }
    expect(scans).toHaveBeenCalledExactlyOnceWith("Case-\u00e9-\u2713")
  })

  it("drops blank endings and does not replay additional scans from one packet", async () => {
    await connect()
    await ready()
    device.port.send("\r\n\rfirst\rsecond\rthird\r")
    await flush()
    expect(scans).toHaveBeenCalledExactlyOnceWith("first")
    await ready()
    await flush()
    expect(scans).toHaveBeenCalledOnce()
    device.port.send("fourth\r")
    await flush()
    expect(scans).toHaveBeenLastCalledWith("fourth")
  })

  it("discards paused frames and their partial tails after rearming", async () => {
    await connect()
    await ready()
    device.port.send("partial")
    await flush()
    scanner.pause()
    device.port.send("ignored\rtrailing")
    await flush()
    await ready()
    device.port.send("-tail\rFreshBadge\r")
    await flush()
    expect(scans).toHaveBeenCalledExactlyOnceWith("FreshBadge")
  })

  it("waits for a quiet input drain before accepting new scans", async () => {
    await connect()
    scanner.arm()
    await vi.advanceTimersByTimeAsync(150)
    device.port.send("queued\r")
    await flush()
    await vi.advanceTimersByTimeAsync(150)
    expect(states).toHaveBeenLastCalledWith("arming")
    await vi.advanceTimersByTimeAsync(50)
    expect(states).toHaveBeenLastCalledWith("ready")
    expect(scans).not.toHaveBeenCalled()
  })

  it("fails closed when an upload continuously fills the drain window", async () => {
    await connect()
    scanner.arm()
    for (let i = 0; i < 25; i++) {
      device.port.send("stored\r")
      await vi.advanceTimersByTimeAsync(100)
    }
    expect(states).toHaveBeenLastCalledWith("connected")
    expect(errors).toHaveBeenCalledWith(expect.stringContaining("still sending data"))
    expect(scans).not.toHaveBeenCalled()
  })

  it.each(["x".repeat(4097) + "\r", "rec:v1:bad\u0000value\r", "bad\tdata\r"])("rejects oversized or invalid frames without leaking their contents", async value => {
    await connect()
    await ready()
    device.port.send(value)
    await flush()
    expect(scans).not.toHaveBeenCalled()
    expect(errors).toHaveBeenCalledOnce()
    expect(errors.mock.calls[0][0]).not.toContain(value)
    await ready()
    device.port.send("valid\r")
    await flush()
    expect(scans).toHaveBeenCalledExactlyOnceWith("valid")
  })

  it("caps large binary packets before decoding", async () => {
    await connect()
    await ready()
    device.port.send(new Uint8Array(65537))
    await flush()
    expect(errors).toHaveBeenCalledWith(expect.stringContaining("too large"))
    expect(scans).not.toHaveBeenCalled()
  })

  it("rejects malformed UTF-8 and drops the affected frame", async () => {
    await connect()
    await ready()
    device.port.send(new Uint8Array([0xc3, 0x28]))
    await flush()
    expect(errors).toHaveBeenCalledWith(expect.stringContaining("could not be decoded"))
    expect(scans).not.toHaveBeenCalled()
    device.port.send("\r")
    await flush()
    await ready()
    device.port.send("full-rescan\r")
    await flush()
    expect(scans).toHaveBeenCalledExactlyOnceWith("full-rescan")
  })

  it("never submits a partial frame on idle timeout or stream end", async () => {
    await connect()
    await ready()
    device.port.send("unterminated")
    await flush()
    await vi.advanceTimersByTimeAsync(3000)
    expect(errors).toHaveBeenCalledWith(expect.stringContaining("Incomplete serial scan"))
    expect(scans).not.toHaveBeenCalled()
    device.port.end()
    await flush()
    expect(states).toHaveBeenLastCalledWith("disconnected")
  })

  it("cancels the reader, unlocks the stream and closes the owned port once", async () => {
    await connect()
    await ready()
    const stream = device.port.readable
    expect(stream.locked).toBe(true)
    await scanner.disconnect()
    expect(stream.locked).toBe(false)
    expect(device.port.close).toHaveBeenCalledOnce()
    await scanner.disconnect()
    expect(device.port.close).toHaveBeenCalledOnce()
    expect(scanner.arm()).toBe(false)
  })

  it.each(["event", "read-error"])("pauses and disconnects on %s without automatic reconnection", async source => {
    await connect()
    await ready()
    if (source === "event") {
      const event = new Event("disconnect")
      Object.defineProperty(event, "port", { value: device.port })
      device.dispatchEvent(event)
    } else device.port.fail()
    await flush()
    expect(states).toHaveBeenLastCalledWith("disconnected")
    expect(errors).toHaveBeenCalledOnce()
    expect(device.requestPort).toHaveBeenCalledOnce()
    expect(device.port.close).toHaveBeenCalledOnce()
  })

  it.each(["NotFoundError", "SecurityError", "NetworkError"])("handles %s connection failures without unhandled errors", async name => {
    device.requestPort.mockRejectedValue(new DOMException("Test failure", name))
    expect(await scanner.connect(settings)).toBe(false)
    expect(states).toHaveBeenLastCalledWith("disconnected")
    expect(errors).toHaveBeenCalledOnce()
    expect(scanner.arm()).toBe(false)
  })

  it("cleans up a successfully opened port if no readable stream is available", async () => {
    device.port.open.mockResolvedValue()
    expect(await scanner.connect(settings)).toBe(false)
    expect(device.port.close).toHaveBeenCalledOnce()
    expect(errors).toHaveBeenCalledOnce()
  })

  it("does not open a port selected after the connection was cancelled", async () => {
    let select
    device.requestPort.mockImplementation(() => new Promise(resolve => { select = resolve }))
    const opening = scanner.connect(settings)
    await scanner.disconnect()
    select(device.port)
    expect(await opening).toBe(false)
    expect(device.port.open).not.toHaveBeenCalled()
  })

  it("closes a port whose delayed open completes after disposal", async () => {
    let finish
    device.port.open.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const opening = scanner.connect(settings)
    await flush()
    await scanner.dispose()
    const notificationCount = states.mock.calls.length
    finish()
    expect(await opening).toBe(false)
    expect(device.port.close).toHaveBeenCalledOnce()
    expect(states.mock.calls).toHaveLength(notificationCount)
  })

  it("ignores stale disconnect events from a previously selected port", async () => {
    await connect()
    const oldPort = device.port
    await scanner.disconnect()
    device.port = makePort()
    await connect()
    const event = new Event("disconnect")
    Object.defineProperty(event, "port", { value: oldPort })
    device.dispatchEvent(event)
    await flush()
    expect(states).toHaveBeenLastCalledWith("connected")
    expect(device.port.close).not.toHaveBeenCalled()
  })
})
