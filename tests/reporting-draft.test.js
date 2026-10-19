import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createReportingDraft, createReportingRecoveryStore, discardRecovery, loadRecovery } from "../lib/reporting-draft.mjs"

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function memoryStore() {
  const records = new Map()
  return {
    records,
    put: vi.fn(async (record) => records.set(`${record.identity}:${record.copyId}`, structuredClone(record))),
    list: vi.fn(async (identity) => [...records.values()].filter((record) => record.identity === identity)),
    remove: vi.fn(async (identity, copyId, serialized) => {
      for (const [key, record] of records) {
        if (record.identity !== identity || (copyId && record.copyId !== copyId)) continue
        if (serialized && JSON.stringify(record.content) !== serialized) continue
        records.delete(key)
      }
    }),
  }
}

const initial = { documentHtml: "<p>Existing draft</p>" }
const changed = (text) => ({ documentHtml: `<p>${text}</p>` })
const identity = "writer@example.org:conference:report-one"
const controllers = []
let store

function controller(options = {}) {
  const draft = createReportingDraft({
    identity, revision: 8, content: initial, recoveryStore: store,
    save: vi.fn(async ({ content, expectedRevision }) => ({ content, revision: expectedRevision + 1 })),
    ...options,
  })
  controllers.push(draft)
  return draft
}

beforeEach(() => {
  vi.useFakeTimers()
  store = memoryStore()
})

afterEach(() => {
  controllers.splice(0).forEach((draft) => draft.dispose())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("per-report draft saving", () => {
  it("does not rewrite a loaded draft or create a browser recovery copy until it is edited", async () => {
    const save = vi.fn()
    const draft = controller({ save })
    await draft.flush()
    expect(save).not.toHaveBeenCalled()
    expect(store.put).not.toHaveBeenCalled()
    expect(draft.snapshot()).toMatchObject({ status: "saved", dirty: false, revision: 8, content: initial })
  })

  it("persists before uploading, coalesces edits, and clears only the exact acknowledged browser copy", async () => {
    const persisted = deferred()
    store.put.mockImplementationOnce(async (record) => {
      await persisted.promise
      store.records.set(`${record.identity}:${record.copyId}`, record)
    })
    const save = vi.fn(async ({ content, expectedRevision }) => ({ content, revision: expectedRevision + 1 }))
    const draft = controller({ save })
    draft.update(changed("First"))
    draft.update(changed("Latest"))
    const flushed = draft.flush()
    await vi.advanceTimersByTimeAsync(0)
    expect(save).not.toHaveBeenCalled()
    persisted.resolve()
    await flushed
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0]).toMatchObject({ content: changed("Latest"), expectedRevision: 8 })
    expect(draft.snapshot()).toMatchObject({ status: "saved", dirty: false, revision: 9, recoveryStatus: "cleared" })
    expect(store.records.size).toBe(0)
  })

  it("serializes an in-flight save and keeps a newer edit pending until its own acknowledgement", async () => {
    const first = deferred()
    const second = deferred()
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const draft = controller({ save })
    draft.update(changed("First"))
    const flushed = draft.flush()
    await vi.advanceTimersByTimeAsync(0)
    draft.update(changed("Newer"))
    first.resolve({ content: changed("First"), revision: 9 })
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1][0]).toMatchObject({ content: changed("Newer"), expectedRevision: 9 })
    expect(draft.snapshot().dirty).toBe(true)
    expect((await loadRecovery(identity, { store })).content).toEqual(changed("Newer"))
    second.resolve({ content: changed("Newer"), revision: 10 })
    await flushed
    expect(draft.snapshot()).toMatchObject({ revision: 10, status: "saved", dirty: false })
  })

  it("retries transient failures with the same mutation and expected revision", async () => {
    const network = new Error("Offline")
    const save = vi.fn().mockRejectedValueOnce(network).mockRejectedValueOnce(Object.assign(new Error("Busy"), { status: 503 }))
      .mockImplementation(async ({ content, expectedRevision }) => ({ content, revision: expectedRevision + 1 }))
    const draft = controller({ save, retryDelays: [10, 20] })
    draft.update(changed("Durable text"))
    const flushed = draft.flush()
    await vi.advanceTimersByTimeAsync(0)
    expect(draft.snapshot().status).toBe("retrying")
    expect((await loadRecovery(identity, { store })).content).toEqual(changed("Durable text"))
    await vi.advanceTimersByTimeAsync(30)
    await flushed
    expect(save).toHaveBeenCalledTimes(3)
    expect(new Set(save.mock.calls.map(([request]) => request.mutationId)).size).toBe(1)
    expect(save.mock.calls.every(([request]) => request.expectedRevision === 8)).toBe(true)
  })

  it("bounds automatic retries and preserves a stable mutation for an explicit retry after exhaustion", async () => {
    const save = vi.fn().mockRejectedValueOnce(new TypeError("Offline")).mockRejectedValueOnce(new TypeError("Offline"))
      .mockImplementation(async ({ content, expectedRevision }) => ({ content, revision: expectedRevision + 1 }))
    const draft = controller({ save, retryDelays: [10] })
    draft.update(changed("Keep this"))
    const flushed = draft.flush().catch((error) => error)
    await vi.advanceTimersByTimeAsync(10)
    expect(await flushed).toBeInstanceOf(Error)
    expect(draft.snapshot()).toMatchObject({ status: "error", dirty: true })
    expect((await loadRecovery(identity, { store })).content).toEqual(changed("Keep this"))
    await vi.advanceTimersByTimeAsync(5000)
    expect(save).toHaveBeenCalledTimes(2)
    await draft.flush()
    expect(new Set(save.mock.calls.map(([request]) => request.mutationId)).size).toBe(1)
  })

  it("never retries a revision conflict or clears the writer's pending content", async () => {
    const conflict = Object.assign(new Error("Changed elsewhere"), { status: 409 })
    const save = vi.fn().mockRejectedValue(conflict)
    const draft = controller({ save })
    draft.update(changed("Unsaved writing"))
    await expect(draft.flush()).rejects.toBe(conflict)
    draft.update(changed("Further writing"))
    await vi.advanceTimersByTimeAsync(30000)
    await expect(draft.flush()).rejects.toBe(conflict)
    expect(save).toHaveBeenCalledTimes(1)
    expect(draft.snapshot()).toMatchObject({ status: "conflict", dirty: true, revision: 8 })
    expect((await loadRecovery(identity, { store })).content).toEqual(changed("Further writing"))
  })

  it("rejects missing or truncated server acknowledgements instead of showing Saved", async () => {
    const save = vi.fn().mockResolvedValue({ content: changed("Truncated"), revision: 9 })
    const draft = controller({ save })
    draft.update(changed("Complete long document"))
    await expect(draft.flush()).rejects.toMatchObject({ code: "INCOMPLETE_ACKNOWLEDGEMENT" })
    expect(draft.snapshot()).toMatchObject({ status: "error", dirty: true, revision: 8 })
    expect((await loadRecovery(identity, { store })).content).toEqual(changed("Complete long document"))
    await expect(draft.flush()).rejects.toMatchObject({ code: "INCOMPLETE_ACKNOWLEDGEMENT" })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("compares acknowledgement object fields independently of their order", async () => {
    const save = vi.fn(async ({ content, expectedRevision }) => ({ content: { purpose: content.purpose, documentHtml: content.documentHtml }, revision: expectedRevision + 1 }))
    const draft = controller({ save })
    draft.update({ documentHtml: "<h1>Heading</h1>", purpose: "Full purpose" })
    await draft.flush()
    expect(draft.snapshot()).toMatchObject({ status: "saved", dirty: false })
  })

  it("saves during continuous typing rather than waiting indefinitely for an idle editor", async () => {
    const save = vi.fn(async ({ content, expectedRevision }) => ({ content, revision: expectedRevision + 1 }))
    const draft = controller({ save, debounceMs: 700, maxWaitMs: 2000 })
    for (let index = 0; index < 5; index += 1) {
      draft.update(changed(`Words ${index}`))
      await vi.advanceTimersByTimeAsync(450)
    }
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0].content).toEqual(changed("Words 4"))
  })

  it("keeps report controllers independent and suppresses a closed editor's delayed response", async () => {
    const delayed = deferred()
    const onState = vi.fn()
    const old = controller({ save: () => delayed.promise, onState })
    old.update(changed("Old report"))
    const finishing = old.flush().catch((error) => error)
    await vi.advanceTimersByTimeAsync(0)
    old.dispose()
    const notifications = onState.mock.calls.length
    const next = controller({ identity: "writer@example.org:conference:report-two", revision: 20 })
    next.update(changed("Different report"))
    await next.flush()
    delayed.resolve({ content: changed("Old report"), revision: 9 })
    await finishing
    expect(onState).toHaveBeenCalledTimes(notifications)
    expect(next.snapshot()).toMatchObject({ revision: 21, content: changed("Different report"), dirty: false })
    expect((await loadRecovery(identity, { store })).content).toEqual(changed("Old report"))
  })

  it("disposal cancels retry uploads while preserving the browser recovery copy", async () => {
    const save = vi.fn().mockRejectedValue(new TypeError("Offline"))
    const draft = controller({ save, retryDelays: [1000] })
    draft.update(changed("Recovered later"))
    const finishing = draft.flush().catch((error) => error)
    await vi.advanceTimersByTimeAsync(0)
    draft.dispose()
    await finishing
    await vi.advanceTimersByTimeAsync(2000)
    expect(save).toHaveBeenCalledTimes(1)
    expect((await loadRecovery(identity, { store })).content).toEqual(changed("Recovered later"))
  })

  it("reports unavailable browser recovery while still allowing a server save", async () => {
    const problem = new Error("Quota exceeded")
    store.put.mockRejectedValue(problem)
    store.remove.mockRejectedValue(problem)
    const draft = controller()
    draft.update(changed("Save to server"))
    await draft.flush()
    expect(draft.snapshot()).toMatchObject({ status: "saved", dirty: false, recoveryStatus: "unavailable", recoveryError: problem })
  })
})

describe("browser recovery review", () => {
  it("preserves separate tab copies and never discards another writer or report", async () => {
    const first = controller()
    const second = controller()
    const other = controller({ identity: "another-owner:conference:report-one" })
    first.update(changed("First browser"))
    await vi.advanceTimersByTimeAsync(1)
    second.update(changed("Second browser"))
    other.update(changed("Other owner"))
    await vi.advanceTimersByTimeAsync(0)
    const pending = await loadRecovery(identity, { store })
    expect(pending.content).toEqual(changed("Second browser"))
    expect(pending.otherCopies).toHaveLength(1)
    await first.flush()
    expect((await loadRecovery(identity, { store })).copyId).toBe(second.snapshot().copyId)
    await discardRecovery(identity, { copyId: second.snapshot().copyId, store })
    expect(await loadRecovery(identity, { store })).toBeNull()
    expect((await loadRecovery("another-owner:conference:report-one", { store })).content).toEqual(changed("Other owner"))
  })

  it("keeps the original revision for explicit review against newer server writing", async () => {
    const draft = controller()
    draft.update(changed("Offline draft"))
    await vi.advanceTimersByTimeAsync(0)
    draft.dispose()
    const recovered = await loadRecovery(identity, { store })
    expect(recovered).toMatchObject({ revision: 8, content: changed("Offline draft") })
    const loadedNewer = controller({ revision: 12, content: changed("Server content") })
    await loadedNewer.flush()
    expect(loadedNewer.snapshot().content).toEqual(changed("Server content"))
    expect((await loadRecovery(identity, { store })).content).toEqual(changed("Offline draft"))
  })

  it("rejects recovery reads when IndexedDB is unavailable instead of reporting no draft", async () => {
    vi.stubGlobal("indexedDB", undefined)
    await expect(loadRecovery(identity, { store: createReportingRecoveryStore() })).rejects.toThrow("Browser recovery is unavailable")
  })
})
