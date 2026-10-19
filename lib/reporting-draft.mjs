// One controller owns one report. Browser recovery is independent of the server
// and never replaces a document automatically when it is reopened.
const DATABASE = "rec-reporting-recovery"
const STORE = "drafts"

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function uniqueId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function recoveryError() {
  return new Error("Browser recovery is unavailable. Keep this report open until the server confirms it is saved.")
}

/** The injected store contract is put(record), list(identity), remove(identity, copyId?, serializedContent?). */
export function createReportingRecoveryStore() {
  async function open() {
    if (!globalThis.indexedDB) throw recoveryError()
    return new Promise((resolve, reject) => {
      let request
      let settled = false
      const finish = (error, database) => {
        if (settled) {
          database?.close()
          return
        }
        settled = true
        clearTimeout(timeout)
        if (error) reject(error)
        else resolve(database)
      }
      const timeout = setTimeout(() => finish(recoveryError()), 5000)
      try {
        request = globalThis.indexedDB.open(DATABASE, 1)
        request.onupgradeneeded = () => {
          const drafts = request.result.createObjectStore(STORE, { keyPath: "key" })
          drafts.createIndex("identity", "identity")
        }
        request.onsuccess = () => finish(null, request.result)
        request.onerror = () => finish(request.error || recoveryError())
        request.onblocked = () => finish(recoveryError())
      } catch (error) {
        finish(error)
      }
    })
  }

  async function transaction(mode, operation) {
    const database = await open()
    try {
      return await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE, mode)
        let result
        const timeout = setTimeout(() => {
          try { tx.abort() } catch { /* The transaction may already have ended. */ }
          reject(recoveryError())
        }, 5000)
        tx.oncomplete = () => { clearTimeout(timeout); resolve(result) }
        tx.onerror = () => { clearTimeout(timeout); reject(tx.error || recoveryError()) }
        tx.onabort = () => { clearTimeout(timeout); reject(tx.error || recoveryError()) }
        operation(tx.objectStore(STORE), (value) => { result = value })
      })
    } finally {
      database.close()
    }
  }

  return {
    put(record) {
      return transaction("readwrite", (drafts) => {
        drafts.put({ ...clone(record), key: JSON.stringify([record.identity, record.copyId]) })
      })
    },
    list(identity) {
      return transaction("readonly", (drafts, done) => {
        const request = drafts.index("identity").getAll(identity)
        request.onsuccess = () => done(request.result.map((record) => {
          const recovered = { ...record }
          delete recovered.key
          return recovered
        }))
      })
    },
    remove(identity, copyId, serializedContent) {
      return transaction("readwrite", (drafts) => {
        const request = drafts.index("identity").openCursor(identity)
        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) return
          const record = cursor.value
          if ((!copyId || record.copyId === copyId) && (!serializedContent || stable(record.content) === serializedContent)) cursor.delete()
          cursor.continue()
        }
      })
    },
  }
}

const browserRecovery = createReportingRecoveryStore()

export async function loadRecovery(identity, { store = browserRecovery } = {}) {
  const records = await store.list(identity)
  const sorted = records.filter((record) => record.identity === identity && record.content != null)
    .sort((left, right) => right.updatedAt - left.updatedAt)
  if (!sorted.length) return null
  return clone({ ...sorted[0], otherCopies: sorted.slice(1) })
}

export async function discardRecovery(identity, { copyId, store = browserRecovery } = {}) {
  await store.remove(identity, copyId)
}

function transient(error) {
  const status = Number(error?.status || 0)
  return !status || status === 408 || status === 429 || status >= 500
}

/**
 * save({ content, expectedRevision, mutationId }) must acknowledge the complete
 * submitted content and return its committed revision. No browser fetches occur here.
 */
export function createReportingDraft({
  identity,
  revision,
  content,
  save,
  onState = () => {},
  recoveryStore = browserRecovery,
  debounceMs = 350,
  maxWaitMs = 2000,
  retryDelays = [1000, 3000, 8000],
}) {
  if (!identity || typeof save !== "function") throw new Error("A report identity and save function are required.")
  const copyId = uniqueId()
  let current = clone(content)
  let currentKey = stable(current)
  let acknowledgedKey = currentKey
  let committedRevision = revision
  let status = "saved"
  let lastError = null
  let recoveryStatus = "cleared"
  let recoveryFailure = null
  let disposed = false
  let timer = null
  let pendingSince = null
  let cancelRetry = null
  let activeRun = null
  let job = null
  let persistence = Promise.resolve()

  function isDirty() {
    return currentKey !== acknowledgedKey || Boolean(job)
  }

  function snapshot() {
    return {
      identity, copyId, revision: committedRevision, content: clone(current),
      status: disposed ? "disposed" : status, dirty: isDirty(), error: lastError,
      recoveryStatus, recoveryError: recoveryFailure,
    }
  }

  function emit() {
    if (!disposed) onState(snapshot())
  }

  function persist() {
    const record = { identity, copyId, content: clone(current), revision: committedRevision, updatedAt: Date.now() }
    recoveryStatus = "pending"
    persistence = persistence.then(async () => {
      try {
        await recoveryStore.put(record)
        recoveryStatus = "stored"
        recoveryFailure = null
      } catch (error) {
        recoveryStatus = "unavailable"
        recoveryFailure = error
      }
      emit()
    })
    return persistence
  }

  async function clearAcknowledgedRecovery(key) {
    // A new edit can arrive while the IndexedDB transaction is pending. The
    // store compares inside its write transaction before removing this copy.
    persistence = persistence.then(async () => {
      try {
        await recoveryStore.remove(identity, copyId, key)
        if (currentKey === key && !job) {
          recoveryStatus = "cleared"
          recoveryFailure = null
        }
      } catch (error) {
        recoveryStatus = "unavailable"
        recoveryFailure = error
      }
      emit()
    })
    await persistence
  }

  function delay(ms) {
    return new Promise((resolve) => {
      const retryTimer = setTimeout(() => { cancelRetry = null; resolve() }, ms)
      cancelRetry = () => { clearTimeout(retryTimer); cancelRetry = null; resolve() }
    })
  }

  async function upload(pending) {
    for (let attempt = 0; ; attempt += 1) {
      if (disposed) return null
      status = attempt ? "retrying" : "saving"
      emit()
      try {
        const response = await save({ content: clone(pending.content), expectedRevision: pending.expectedRevision, mutationId: pending.mutationId })
        if (disposed) return null
        if (!response || !Number.isInteger(response.revision) || response.revision <= pending.expectedRevision || stable(response.content) !== pending.key) {
          const error = new Error("The server did not confirm the complete report. Your draft has been kept for recovery.")
          error.code = "INCOMPLETE_ACKNOWLEDGEMENT"
          error.status = 422
          throw error
        }
        return response
      } catch (error) {
        if (disposed) return null
        if (!transient(error) || attempt >= retryDelays.length) throw error
        status = "retrying"
        lastError = error
        emit()
        await delay(retryDelays[attempt])
      }
    }
  }

  async function drain() {
    while (!disposed && isDirty()) {
      if (lastError && (Number(lastError.status) === 409 || lastError.code === "INCOMPLETE_ACKNOWLEDGEMENT")) throw lastError
      if (!job) job = { content: clone(current), key: currentKey, expectedRevision: committedRevision, mutationId: uniqueId() }
      // Attempt browser persistence before uploading. If unavailable, the state
      // visibly reports that limitation while the server save can still proceed.
      await persistence
      const response = await upload(job)
      if (!response || disposed) return snapshot()
      committedRevision = response.revision
      acknowledgedKey = job.key
      job = null
      lastError = null
      if (currentKey === acknowledgedKey) await clearAcknowledgedRecovery(acknowledgedKey)
    }
    if (!disposed) {
      status = "saved"
      lastError = null
      emit()
    }
    return snapshot()
  }

  function start() {
    if (activeRun) return activeRun
    if (disposed) return Promise.reject(new Error("This report editor is closed. Its pending draft is retained."))
    clearTimeout(timer)
    timer = null
    pendingSince = null
    activeRun = drain().catch((error) => {
      lastError = error
      status = Number(error.status) === 409 ? "conflict" : "error"
      emit()
      throw error
    }).finally(() => { activeRun = null })
    return activeRun
  }

  function schedule() {
    clearTimeout(timer)
    if (disposed || !isDirty() || Number(lastError?.status) === 409 || lastError?.code === "INCOMPLETE_ACKNOWLEDGEMENT") return
    if (pendingSince === null) pendingSince = Date.now()
    const wait = Math.max(0, Math.min(debounceMs, maxWaitMs - (Date.now() - pendingSince)))
    timer = setTimeout(() => {
      timer = null
      void start().catch(() => {})
    }, wait)
  }

  function update(next) {
    if (disposed) throw new Error("This report editor is closed.")
    const nextContent = clone(next)
    const nextKey = stable(nextContent)
    if (nextKey === currentKey) return snapshot()
    current = nextContent
    currentKey = nextKey
    if (lastError && !transient(lastError) && Number(lastError.status) !== 409 && lastError.code !== "INCOMPLETE_ACKNOWLEDGEMENT") {
      job = null
      lastError = null
    }
    if (Number(lastError?.status) !== 409 && lastError?.code !== "INCOMPLETE_ACKNOWLEDGEMENT") status = isDirty() ? "pending" : "saved"
    persist()
    emit()
    if (!isDirty()) void clearAcknowledgedRecovery(currentKey)
    schedule()
    return snapshot()
  }

  async function flush() {
    clearTimeout(timer)
    timer = null
    if (Number(lastError?.status) === 409 || lastError?.code === "INCOMPLETE_ACKNOWLEDGEMENT") throw lastError
    await start()
    // An update may arrive as a completed queue is resolving. Do not let a
    // navigation caller treat that newer edit as acknowledged.
    while (!disposed && isDirty()) await start()
    if (disposed) throw new Error("This report editor is closed. Its pending draft is retained.")
    return snapshot()
  }

  function dispose() {
    disposed = true
    clearTimeout(timer)
    cancelRetry?.()
  }

  return { update, flush, dispose, snapshot }
}
