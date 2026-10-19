"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Filter, MapPin, RefreshCcw, ScanLine, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchScannerJson, scannerDate, scannerPhase, scannerPhases, scannerTypes } from "@/lib/scanner-client"

function Pagination({ data, page, setPage, busy }) {
  return <div className="scanner-pagination">
    <span>{data?.total || 0} results · Page {data?.page || page} of {data?.totalPages || 1}</span>
    <div><Button variant="outline" aria-label="Previous page" disabled={busy || page <= 1} onClick={() => setPage(page - 1)}><ArrowLeft className="h-4 w-4" /></Button>
      <Button variant="outline" aria-label="Next page" disabled={busy || page >= (data?.totalPages || 1)} onClick={() => setPage(page + 1)}><ArrowRight className="h-4 w-4" /></Button></div>
  </div>
}

export function ScannerDashboard({ onNavigate, onExpired, revision = 0, now = Date.now() }) {
  const [filters, setFilters] = useState({ status: "auto", day: "", date: "", venue: "", type: "", search: "" })
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState("")
  const [summaryError, setSummaryError] = useState("")
  const [refresh, setRefresh] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const update = (key, value) => { setFilters(previous => ({ ...previous, [key]: value })); setPage(1) }
  useEffect(() => {
    const timer = setTimeout(() => { setFilters(previous => ({ ...previous, search })); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])
  useEffect(() => {
    const controller = new AbortController()
    setBusy(true); setError("")
    const params = new URLSearchParams({ ...filters, page: String(page), limit: "12" })
    fetchScannerJson(`/api/scanner/events?${params}`, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) { setData(result); if (result.page !== page) setPage(result.page || 1) }
    }).catch(err => { if (!controller.signal.aborted) { setError(err.message); if ([401, 403].includes(err.status)) onExpired() } })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [filters, onExpired, page, refresh, revision])
  useEffect(() => {
    const controller = new AbortController()
    fetchScannerJson("/api/scanner/overview", { signal: controller.signal }).then(result => { if (!controller.signal.aborted) { setSummary(result); setSummaryError("") } })
      .catch(err => { if (!controller.signal.aborted) { setSummaryError("Your scan summary could not be refreshed."); if ([401, 403].includes(err.status)) onExpired() } })
    return () => controller.abort()
  }, [onExpired, refresh, revision])
  useEffect(() => {
    const update = () => { if (!document.hidden && navigator.onLine !== false) setRefresh(value => value + 1) }
    const timer = setInterval(update, 30000)
    document.addEventListener("visibilitychange", update)
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", update) }
  }, [])
  const counts = data?.counts || {}
  const selected = filters.status === "auto" ? data?.status || "open" : filters.status
  return <section className="scanner-dashboard">
    <div className="scanner-summary-band">
      <div><span>My accepted scans today</span><strong>{summary ? summary.acceptedToday : "--"}</strong><small>{summary?.date ? scannerDate(summary.date) : "Africa/Kampala"}</small></div>
      <div><span>Assigned events</span><strong>{counts.all ?? "--"}</strong><small>Current access rules</small></div>
      <div><span>Last recorded scan today</span><strong className="scanner-summary-time">{summary?.lastScanAt ? scannerDate(summary.lastScanAt, true) : "--"}</strong><small>{summary?.lastScanAt ? "East Africa Time (UTC+3)" : "No recorded scans today"}</small></div>
    </div>
    {summaryError && <p role="status" className="scanner-inline-warning">{summaryError}</p>}
    <div className="scanner-section-heading"><h2>Assigned events</h2><Button variant="outline" aria-label="Refresh dashboard" onClick={() => setRefresh(value => value + 1)} disabled={busy}><RefreshCcw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></Button></div>
    <div className="scanner-event-tabs" role="tablist" aria-label="Event status">
      {[["open", "Open now"], ["upcoming", "Upcoming"], ["ended", "Ended"], ["all", "All"]].map(([key, label], index) => <button key={key} id={`scanner-tab-${key}`} role="tab" tabIndex={selected === key ? 0 : -1} aria-controls="scanner-events-panel" aria-selected={selected === key} onClick={() => update("status", key)} onKeyDown={event => {
        const next = event.key === "ArrowRight" ? (index + 1) % 4 : event.key === "ArrowLeft" ? (index + 3) % 4 : event.key === "Home" ? 0 : event.key === "End" ? 3 : -1
        if (next < 0) return
        event.preventDefault(); update("status", ["open", "upcoming", "ended", "all"][next]); event.currentTarget.parentElement.querySelectorAll("[role=tab]")[next].focus()
      }}>{label}{" "}<span>{counts[key] ?? "--"}</span></button>)}
    </div>
    <div className="scanner-searchbar">
      <label><Search aria-hidden="true" /><input type="search" aria-label="Search assigned events" placeholder="Search event or venue" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <Button variant="outline" onClick={() => setFiltersOpen(value => !value)} aria-expanded={filtersOpen} aria-controls="scanner-event-filters"><Filter className="h-4 w-4" />Filters</Button>
    </div>
    {filtersOpen && <div id="scanner-event-filters" className="scanner-filter-grid">
      <label>Conference day<select value={filters.day} onChange={event => update("day", event.target.value)}><option value="">All days</option>{data?.facets?.days.map(day => <option key={day} value={day}>Day {day}</option>)}</select></label>
      <label>Date<input type="date" value={filters.date} onChange={event => update("date", event.target.value)} /></label>
      <label>Venue<select value={filters.venue} onChange={event => update("venue", event.target.value)}><option value="">All venues</option>{data?.facets?.venues.map(venue => <option key={venue}>{venue}</option>)}</select></label>
      <label>Event type<select value={filters.type} onChange={event => update("type", event.target.value)}><option value="">All types</option>{data?.facets?.types.map(type => <option key={type} value={type}>{scannerTypes[type] || type}</option>)}</select></label>
      <Button variant="outline" onClick={() => { setSearch(""); setFilters({ status: "auto", day: "", date: "", venue: "", type: "", search: "" }); setPage(1) }}>Reset filters</Button>
    </div>}
    {!filtersOpen && [filters.day, filters.date, filters.venue, filters.type].some(Boolean) && <p className="scanner-muted">Filters applied · {[filters.day && `Day ${filters.day}`, filters.date, filters.venue, scannerTypes[filters.type]].filter(Boolean).join(" / ")}</p>}
    {error && <p className="scanner-inline-error" role="alert">{error}</p>}
    <div id="scanner-events-panel" className="scanner-event-list" role="tabpanel" aria-labelledby={`scanner-tab-${selected}`} aria-busy={busy}>
      {busy ? <div className="scanner-empty" role="status"><RefreshCcw className="h-5 w-5 animate-spin" />Loading events...</div> : !data?.documents?.length ? <div className="scanner-empty">{data?.emptyReason?.message || "No events match these filters."}</div> : data.documents.map(event => {
        const phase = scannerPhase(event, now)
        return <article className="scanner-event-row" key={event.$id}>
          <div className="scanner-event-clock"><Clock3 className="h-4 w-4" /><strong>{scannerDate(event.startTime, true)}</strong><span>{event.endTime ? `to ${scannerDate(event.endTime, true)}` : "No end time"}</span></div>
          <div className="scanner-event-info"><div className="scanner-event-meta"><span className={`scanner-phase scanner-phase-${phase}`}>{scannerPhases[phase]}</span><span>{scannerTypes[event.type] || event.type}</span></div><h3>{event.name}</h3><div className="scanner-event-place"><span><CalendarDays />{scannerDate(event.date || event.startTime)}{event.day ? ` / Day ${event.day}` : ""}</span><span><MapPin />{event.venue || "All venues"}</span></div></div>
          <Button className={phase === "open" ? "scanner-start" : "scanner-view"} variant={phase === "open" ? "default" : "outline"} onClick={() => onNavigate(`/scanner/events/${encodeURIComponent(event.$id)}`)}><ScanLine className="h-4 w-4" />{phase === "open" ? "Scan" : "View event"}</Button>
        </article>
      })}
    </div>
    <Pagination data={data} page={page} setPage={setPage} busy={busy} />
    <p className="scanner-updated">{data?.serverTime ? `Updated ${scannerDate(data.serverTime, true)} EAT` : ""}</p>
  </section>
}

export function ScannerActivity({ onExpired, revision = 0 }) {
  const [filters, setFilters] = useState({ from: "", to: "", status: "" })
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState("")
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setBusy(true); setError("")
    fetchScannerJson(`/api/scanner/activity?${new URLSearchParams({ ...filters, page: String(page), limit: "20" })}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result) })
      .catch(err => { if (!controller.signal.aborted) { setError(err.message); if ([401, 403].includes(err.status)) onExpired() } })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [filters, onExpired, page, refresh, revision])
  const update = (key, value) => { setFilters(previous => ({ ...previous, [key]: value })); setPage(1) }
  return <section className="scanner-dashboard">
    <div className="scanner-section-heading"><h2>My recorded scans</h2><Button variant="outline" aria-label="Refresh activity" disabled={busy} onClick={() => setRefresh(value => value + 1)}><RefreshCcw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></Button></div>
    <p className="scanner-muted">Only your saved scan records are listed. Duplicate responses and some invalid attempts are not stored.</p>
    <div className="scanner-filter-grid">
      <label>From date<input type="date" value={filters.from} onChange={event => update("from", event.target.value)} /></label>
      <label>To date<input type="date" min={filters.from || undefined} value={filters.to} onChange={event => update("to", event.target.value)} /></label>
      <label>Recorded result<select value={filters.status} onChange={event => update("status", event.target.value)}><option value="">All recorded results</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="manual_override">Manual override</option></select></label>
      <Button variant="outline" onClick={() => { setFilters({ from: "", to: "", status: "" }); setPage(1) }}>Reset filters</Button>
    </div>
    {error && <p className="scanner-inline-error" role="alert">{error}</p>}
    <div className="scanner-activity-list" aria-busy={busy}>
      {busy ? <div className="scanner-empty" role="status">Loading recorded scans...</div> : !data?.documents?.length ? <div className="scanner-empty">No saved scans match these filters.</div> : data.documents.map(row => <article className="scanner-activity-row" key={row.$id}>
        <div><strong>{row.attendeeName}</strong><p>{row.organization}</p><span className={`scanner-phase ${row.status === "accepted" || row.status === "manual_override" ? "scanner-phase-open" : "scanner-phase-ended"}`}>{row.status.replaceAll("_", " ")}</span></div>
        <div><strong>{row.eventName}</strong><p>{[row.venue, row.day && `Day ${row.day}`].filter(Boolean).join(" / ")}</p>{row.reason && row.reason !== "ok" && <p>{row.reason.replaceAll("_", " ")}</p>}</div>
        <time dateTime={row.scannedAt}>{scannerDate(row.scannedAt)}<br />{scannerDate(row.scannedAt, true)} EAT</time>
      </article>)}
    </div>
    <Pagination data={data} page={page} setPage={setPage} busy={busy} />
  </section>
}
