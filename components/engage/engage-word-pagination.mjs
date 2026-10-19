import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

// Screen layout only. No page nodes, spacers, or generated page numbers belong
// to the document schema, saved HTML, collaborative content, or undo history.
export const REPORT_PAGE = Object.freeze({
  width: (210 * 96) / 25.4,
  height: (297 * 96) / 25.4,
  margin: (20 * 96) / 25.4,
  gap: 24,
})
export const reportPaginationKey = new PluginKey("engageReportPagination")
const PERIOD = REPORT_PAGE.height + REPORT_PAGE.gap
const BODY_HEIGHT = REPORT_PAGE.height - REPORT_PAGE.margin * 2

export function reportPageAt(y) {
  return Math.max(0, Math.floor((y + 0.5) / PERIOD))
}

export function reportPageCount(bottom) {
  return Math.max(1, Math.ceil((bottom + REPORT_PAGE.margin * 2 + REPORT_PAGE.gap - 1) / PERIOD))
}

export function reportPageBreak(top, bottom) {
  const page = reportPageAt(top)
  if (bottom <= page * PERIOD + BODY_HEIGHT + 0.5) return null
  return { height: (page + 1) * PERIOD - top, page: page + 1 }
}

function spacerDecoration(item) {
  return Decoration.widget(item.pos, () => {
    const spacer = document.createElement("span")
    spacer.className = "engage-word-auto-page-break"
    spacer.setAttribute("aria-hidden", "true")
    spacer.setAttribute("data-auto-page-break", "true")
    spacer.style.height = `${Math.max(0, item.height)}px`
    spacer.contentEditable = "false"
    return spacer
  }, { side: -1, key: `${item.key}:${item.height.toFixed(2)}`, ignoreSelection: true })
}

function characterRect(view, pos, origin, scale) {
  // A text Range measures the glyph after a decoration; coordsAtPos at exactly
  // the same position can report the position before a pagination widget.
  const resolved = view.domAtPos(pos, 1)
  let rect
  if (resolved.node.nodeType === 3 && resolved.offset < resolved.node.length) {
    const range = document.createRange()
    range.setStart(resolved.node, resolved.offset)
    range.setEnd(resolved.node, resolved.offset + 1)
    rect = range.getBoundingClientRect()
  }
  if (!rect || (!rect.height && !rect.width)) rect = view.coordsAtPos(pos, 1)
  return { top: (rect.top - origin) / scale, bottom: (rect.bottom - origin) / scale }
}

function firstPositionBelow(view, from, to, bottom, origin, scale) {
  let low = from
  let high = to
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (characterRect(view, mid, origin, scale).bottom > bottom + 0.5) high = mid
    else low = mid + 1
  }
  return low
}

function findNextBreak(view, items) {
  const root = view.dom
  const rootRect = root.getBoundingClientRect()
  const scale = root.offsetWidth ? rootRect.width / root.offsetWidth : 1
  if (!scale || !rootRect.width) return null
  const origin = rootRect.top
  const known = new Set(items.map((item) => item.key))
  let next = null
  const consider = (item) => {
    if (item.height > 0.5 && !known.has(item.key) && (!next || item.top < next.top)) next = item
  }
  const blocks = []
  view.state.doc.descendants((node, pos) => {
    if (node.isTextblock || (node.isBlock && node.isAtom)) blocks.push({ node, pos })
  })
  for (let index = 0; index < blocks.length; index += 1) {
    const { node, pos } = blocks[index]
    if (node.type.name === "pageBreak") {
      const dom = view.nodeDOM(pos)
      if (!dom?.getBoundingClientRect) continue
      const top = (dom.getBoundingClientRect().top - origin) / scale
      consider({ pos, top, height: (reportPageAt(top) + 1) * PERIOD - top, key: `manual:${pos}` })
      continue
    }
    if (!node.isTextblock) {
      const dom = view.nodeDOM(pos)
      if (!dom?.getBoundingClientRect) continue
      const rect = dom.getBoundingClientRect()
      const top = (rect.top - origin) / scale
      const bottom = (rect.bottom - origin) / scale
      const overflow = reportPageBreak(top, bottom)
      // Oversized figures are constrained by screen CSS; never loop or remove
      // content when a third-party/custom atomic node is taller than one page.
      if (overflow && bottom - top < BODY_HEIGHT) {
        consider({ pos, top, height: overflow.height, key: `atom:${pos}` })
      }
      continue
    }
    const from = pos + 1
    const to = Math.max(from, pos + node.nodeSize - 2)
    let first = characterRect(view, from, origin, scale)
    const last = characterRect(view, to, origin, scale)
    if (node.type.name === "heading" && blocks[index + 1]) {
      const following = blocks[index + 1]
      const followingRect = characterRect(view, following.pos + (following.node.isTextblock ? 1 : 0), origin, scale)
      const overflow = reportPageBreak(first.top, Math.max(last.bottom, followingRect.bottom))
      if (overflow && followingRect.bottom - first.top < BODY_HEIGHT) {
        consider({ pos: from, top: first.top, height: overflow.height, key: `heading:${from}` })
        continue
      }
    }
    let cursor = from
    // A paragraph or one table cell can continue through any number of pages.
    // Search measured line boundaries, rather than moving entire tables/rows.
    while (cursor <= to) {
      const page = reportPageAt(first.top)
      const limit = page * PERIOD + BODY_HEIGHT
      if (last.bottom <= limit + 0.5) break
      const at = firstPositionBelow(view, cursor, to, limit, origin, scale)
      const line = characterRect(view, at, origin, scale)
      const overflow = reportPageBreak(line.top, line.bottom)
      if (overflow) {
        consider({ pos: at, top: line.top, height: overflow.height, key: `line:${at}` })
        break
      }
      // This line is already on the next sheet (an earlier decoration moved
      // it). Continue looking for the next overflowing line in this paragraph.
      if (at <= cursor && reportPageAt(line.top) <= page) break
      cursor = at
      first = line
    }
  }
  return next
}

export const EngageReportPagination = Extension.create({
  name: "engageReportPagination",
  addOptions() { return { enabled: false, onLayout: null, headerImage: null } },
  addProseMirrorPlugins() {
    if (!this.options.enabled) return []
    const onLayout = this.options.onLayout
    const headerImage = this.options.headerImage
    const createDecorations = (doc, items) => {
      const decorations = items.map(spacerDecoration)
      if (headerImage) decorations.push(Decoration.widget(0, () => {
        const header = document.createElement("span")
        header.className = "engage-word-pagination-header"
        header.contentEditable = "false"
        header.setAttribute("aria-hidden", "true")
        const logo = document.createElement("span")
        logo.className = "engage-word-pagination-header-logo"
        logo.style.backgroundImage = `url(${JSON.stringify(headerImage)})`
        header.appendChild(logo)
        return header
      }, { key: "report-branding", side: -1, ignoreSelection: true }))
      return DecorationSet.create(doc, decorations)
    }
    let layoutItems = []
    let layoutDecorations = DecorationSet.empty
    return [new Plugin({
      key: reportPaginationKey,
      state: {
        init: () => ({ items: [], decorations: DecorationSet.empty }),
        apply(transaction) {
          const layout = transaction.getMeta(reportPaginationKey)
          if (layout) {
            layoutItems = layout
            layoutDecorations = createDecorations(transaction.doc, layout)
          } else {
            layoutDecorations = layoutDecorations.map(transaction.mapping, transaction.doc)
          }
          return { items: layoutItems, decorations: layoutDecorations }
        },
      },
      props: { decorations: () => layoutDecorations },
      view(view) {
        let frame = 0
        let destroyed = false
        let rebuilding = false
        let needsReset = true
        let lastPageCount = 0
        let lastWidth = view.dom.clientWidth
        const dispatchLayout = (items) => {
          layoutItems = items
          layoutDecorations = createDecorations(view.state.doc, items)
          // Redraw decorations without dispatching a document transaction.
          // Even an empty transaction can activate another extension's
          // appendTransaction (e.g. StarterKit's trailing paragraph), causing
          // an untouched existing draft to emit a content change on opening.
          view.updateState(view.state)
        }
        const layout = () => {
          frame = 0
          if (destroyed) return
          if (view.composing) { schedule(); return }
          rebuilding = true
          if (needsReset) { needsReset = false; dispatchLayout([]) }
          const started = performance.now()
          // Work in short frames for large reports; keep every inserted spacer
          // in plugin state so the next frame continues from the same place.
          let next
          do {
            const items = layoutItems
            next = findNextBreak(view, items)
            if (next) dispatchLayout([...items, next])
          } while (next && performance.now() - started < 18)
          const rootRect = view.dom.getBoundingClientRect()
          const scale = view.dom.offsetWidth ? rootRect.width / view.dom.offsetWidth : 1
          const last = view.dom.lastElementChild?.getBoundingClientRect()
          const bottom = last ? (last.bottom - rootRect.top) / (scale || 1) : 0
          // Keep diagnostics outside contenteditable. Mutating root attributes
          // is observed by ProseMirror and can create spurious edit loops.
          view.dom.parentElement?.setAttribute("data-pagination-ready", next ? "false" : "true")
          const pageCount = reportPageCount(bottom)
          if (!next && pageCount !== lastPageCount) {
            lastPageCount = pageCount
            onLayout?.({ pageCount, settled: true })
          }
          rebuilding = false
          if (next) schedule()
        }
        const schedule = (reset = false) => {
          if (destroyed) return
          if (reset) { needsReset = true; view.dom.parentElement?.setAttribute("data-pagination-ready", "false") }
          if (!frame) frame = requestAnimationFrame(layout)
        }
        const onAssetLoad = () => schedule(true)
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
          const width = view.dom.clientWidth
          if (width !== lastWidth) { lastWidth = width; schedule(true) }
        })
        observer?.observe(view.dom)
        view.dom.addEventListener("load", onAssetLoad, true)
        view.dom.addEventListener("compositionend", onAssetLoad)
        document.fonts?.ready.then(() => { if (!destroyed) schedule(true) })
        schedule(true)
        return {
          update(current, previous) {
            if (!rebuilding && !current.state.doc.eq(previous.doc)) schedule(true)
          },
          destroy() {
            destroyed = true
            cancelAnimationFrame(frame)
            observer?.disconnect()
            view.dom.removeEventListener("load", onAssetLoad, true)
            view.dom.removeEventListener("compositionend", onAssetLoad)
          },
        }
      },
    })]
  },
})
