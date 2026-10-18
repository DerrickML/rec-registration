export const SERIAL_BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400]
export const SERIAL_DEFAULT_OPTIONS = { baudRate: "", dataBits: 8, parity: "none", stopBits: 1, flowControl: "none" }

function portOptions(options) {
  const { baudRate, dataBits = 8, parity = "none", stopBits = 1, flowControl = "none" } = options || {}
  if (!SERIAL_BAUD_RATES.includes(baudRate) || ![7, 8].includes(dataBits) ||
      !["none", "even", "odd"].includes(parity) || ![1, 2].includes(stopBits) ||
      !["none", "hardware"].includes(flowControl)) {
    throw new Error("Select valid port settings matching the scanner before connecting.")
  }
  return { baudRate, dataBits, parity, stopBits, flowControl, bufferSize: 8192 }
}

function connectionError(error) {
  if (error?.name === "NotFoundError") return "No serial port was selected."
  if (error?.name === "SecurityError" || error?.name === "NotAllowedError") {
    return "Serial access was denied. Check browser permissions and the site's serial Permissions-Policy."
  }
  return "Could not open the serial scanner. Check its connection and port settings, and close other apps using the port."
}

// Serial owns framing and connection lifetime only. Admission stays in the scanner page/API.
export function createSerialScanner({ serial, onState, onScan, onError }) {
  let connection = null
  let disposed = false
  let status = "disconnected"
  let armed = false
  let buffer = ""
  let discardFrame = false
  let readyTimer
  let drainDeadline
  let frameTimer

  const emit = (next) => {
    status = next
    if (!disposed) onState(next)
  }
  const clearTimers = () => {
    clearTimeout(readyTimer)
    clearTimeout(drainDeadline)
    clearTimeout(frameTimer)
  }
  const pause = () => {
    armed = false
    if (buffer) discardFrame = true
    buffer = ""
    clearTimers()
    if (["ready", "arming"].includes(status)) emit("connected")
  }
  const failFrame = (message) => {
    pause()
    discardFrame = true
    if (!disposed) onError(message)
  }
  const scheduleReady = () => {
    clearTimeout(readyTimer)
    readyTimer = setTimeout(() => {
      clearTimeout(drainDeadline)
      if (!connection?.reader || status !== "arming") return
      armed = true
      emit("ready")
    }, 200)
  }
  const receive = (text) => {
    for (const character of text) {
      if (character === "\r" || character === "\n") {
        const value = buffer.trim()
        buffer = ""
        clearTimeout(frameTimer)
        if (armed && !discardFrame && value) {
          // Disarm synchronously before callbacks or any further frames in this chunk.
          pause()
          onScan(value)
        }
        discardFrame = false
      } else if (!armed || discardFrame) {
        discardFrame = true
      } else if (character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) {
        failFrame("Scanner input contains unsupported characters. Check encoding, prefixes and port settings, then rescan.")
      } else if (buffer.length + character.length > 4096) {
        failFrame("Scanner input exceeds 4096 characters. Check scanner settings, then rescan.")
      } else {
        buffer += character
        clearTimeout(frameTimer)
        frameTimer = setTimeout(() => failFrame("Incomplete serial scan. Configure a CR or LF terminator, then rescan the full badge."), 3000)
      }
    }
  }
  const closeOwnedPort = async (owner) => {
    if (owner.closeTask) return owner.closeTask
    owner.closeTask = (async () => {
      if (owner.reader) {
        await owner.reader.cancel().catch(() => {})
        await owner.readTask
      }
      if (owner.opened) await owner.port.close().catch(() => {})
    })()
    return owner.closeTask
  }
  const disconnect = async () => {
    pause()
    const owner = connection
    connection = null
    buffer = ""
    discardFrame = false
    if (!owner) return
    emit("disconnecting")
    await closeOwnedPort(owner)
    if (!connection) emit("disconnected")
  }
  const read = async (owner) => {
    let decoder = new TextDecoder("utf-8", { fatal: true })
    try {
      while (connection === owner && !disposed) {
        const { value, done } = await owner.reader.read()
        if (done || connection !== owner || disposed) break
        if (!value?.byteLength) continue
        if (status === "arming") scheduleReady()
        if (value.byteLength > 65536) {
          decoder = new TextDecoder("utf-8", { fatal: true })
          failFrame("Serial input is too large. Disable stored-code uploads and reconnect the scanner in Real Time Mode.")
          continue
        }
        try {
          receive(decoder.decode(value, { stream: true }))
        } catch (error) {
          if (!(error instanceof TypeError)) throw error
          decoder = new TextDecoder("utf-8", { fatal: true })
          failFrame("Serial input could not be decoded. Check the scanner encoding and port settings, then rescan.")
        }
      }
    } catch {
      if (connection === owner && !disposed) onError("Serial connection was interrupted. Check the cable and port settings, then reconnect.")
    } finally {
      owner.reader.releaseLock()
      owner.reader = null
      if (connection === owner) {
        pause()
        connection = null
        emit("disconnecting")
        await owner.port.close().catch(() => {})
        if (!connection) emit("disconnected")
      }
    }
  }
  const connect = async (options) => {
    if (disposed || connection || status === "disconnecting") return false
    let settings
    try { settings = portOptions(options) } catch (error) { onError(error.message); return false }
    if (!serial?.requestPort) { onError("USB Serial is unavailable in this browser."); return false }
    const owner = { port: null, reader: null, opened: false, readTask: null, closeTask: null }
    connection = owner
    emit("connecting")
    try {
      // Keep the chooser directly in the user-initiated connect call.
      owner.port = await serial.requestPort()
      if (connection !== owner || disposed) return false
      await owner.port.open(settings)
      owner.opened = true
      if (connection !== owner || disposed) {
        await owner.port.close().catch(() => {})
        return false
      }
      if (!owner.port.readable) throw new Error("Port has no readable stream")
      owner.reader = owner.port.readable.getReader()
      buffer = ""
      discardFrame = false
      emit("connected")
      owner.readTask = read(owner)
      return true
    } catch (error) {
      if (connection === owner && !disposed) {
        connection = null
        await closeOwnedPort(owner)
        emit("disconnected")
        onError(connectionError(error))
      }
      return false
    }
  }
  const onDisconnect = (event) => {
    if (connection?.port && (event.target === connection.port || event.port === connection.port)) {
      if (!disposed) onError("Serial scanner disconnected. Reconnect it before scanning another badge.")
      void disconnect()
    }
  }
  serial?.addEventListener?.("disconnect", onDisconnect)

  return {
    connect,
    disconnect,
    pause,
    arm() {
      if (disposed || !connection?.reader || status !== "connected") return false
      pause()
      emit("arming")
      // Drain queued input first; never replay scans captured while paused.
      scheduleReady()
      drainDeadline = setTimeout(() => {
        pause()
        if (!disposed) onError("Scanner is still sending data. Stop scanning, check Real Time Mode and try Ready again.")
      }, 2500)
      return true
    },
    async dispose() {
      disposed = true
      serial?.removeEventListener?.("disconnect", onDisconnect)
      await disconnect()
    },
  }
}
