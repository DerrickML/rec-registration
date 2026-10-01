"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Download, FileText, LoaderCircle, MapPin, RefreshCw, ShieldCheck } from "lucide-react"
import MobileAppCta from "@/components/mobile-apps/mobile-app-cta"
import { useAppConfiguration } from "@/components/mobile-apps/mobile-app-provider"

export default function DigitalBadge({ token, initialBadge }) {
  const { configuration: appConfiguration } = useAppConfiguration(initialBadge?.conference?.$id || "", Boolean(initialBadge?.conference?.$id))
  const [badge, setBadge] = useState(initialBadge)
  const [warning, setWarning] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [bleed, setBleed] = useState(false)
  const [downloading, setDownloading] = useState("")
  const [error, setError] = useState("")
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const refresh = async () => {
      if (document.hidden) return
      setRefreshing(true)
      try {
        const response = await fetch(`/api/badges/${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
        const data = await response.json()
        if (!active) return
        if (response.status === 404) { setBadge(null); setWarning("This badge has expired, been replaced or been revoked. Contact the conference team."); return }
        if (!response.ok) throw new Error("Verification unavailable")
        setBadge(data); setWarning("")
      } catch (error) { if (active && error.name !== "AbortError") setWarning("Unable to refresh badge status. The scan point will verify access.") }
      finally { if (active) setRefreshing(false) }
    }
    const timer = setInterval(refresh, 30000)
    document.addEventListener("visibilitychange", refresh)
    return () => { active = false; controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh) }
  }, [token])
  const registration = badge?.registration || {}
  const conference = badge?.conference || initialBadge?.conference || {}
  const days = conference.days || []
  const number = badge?.badge?.badgeNumberLabel || badge?.badge?.badgeNumber
  const date = value => new Date(value).toLocaleDateString("en-UG", { timeZone: "Africa/Kampala", dateStyle: "medium" })
  const printUrl = `/api/badges/${encodeURIComponent(token)}/print`
  const download = async format => {
    setDownloading(format); setError("")
    try {
      const response = await fetch(`${printUrl}?${new URLSearchParams({ format, bleed: String(bleed), download: "1" })}`, { cache: "no-store" })
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Badge download failed. Please retry.") }
      const url = URL.createObjectURL(await response.blob()), a = document.createElement("a")
      a.href = url; a.download = `${number || "REC-badge"}${bleed ? "-3mm-bleed" : ""}.${format}`
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError(e.message) } finally { setDownloading("") }
  }
  return <main className="min-h-screen bg-[#f0f4f7] px-3 py-6 text-[#172e3b] sm:px-6">
    <div className="mx-auto mb-5 flex max-w-4xl items-center justify-between gap-4"><Link href="/" className="text-sm font-semibold text-[#176F91]">REC & Expo</Link><span className="flex items-center gap-2 text-xs text-[#526774]">{refreshing ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}Digital badge</span></div>
    {warning && <p role="status" className="mx-auto mb-4 max-w-4xl rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{warning}</p>}
    {badge ? <div className="mx-auto grid max-w-4xl items-start gap-6 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:gap-9">
      <section aria-label="Conference tag" className="min-w-0">
        {!imageFailed ? <Image unoptimized loading="eager" src={`${printUrl}?format=png`} alt={`REC ${conference.year} access badge for ${registration.name}, ${number}`} width={1098} height={1476} onError={() => setImageFailed(true)} className="mx-auto aspect-[93/125] h-auto w-full max-w-[420px] bg-white shadow-md" /> : <div className="bg-white p-6 text-center"><Image unoptimized src={badge.qrDataUrl} alt="Conference entry QR code" width={300} height={300} className="mx-auto h-auto max-w-full" /><p className="mt-3 font-mono font-bold">{number}</p><p className="mt-2 text-sm">The tag preview is unavailable. Your QR code can still be scanned.</p></div>}
      </section>
      <section className="min-w-0" aria-label="Badge details and downloads">
        <span className={`inline-flex rounded px-2 py-1 text-xs font-bold ${warning ? "bg-amber-50 text-amber-900" : "bg-[#e9f4ec] text-[#23623c]"}`}>{warning ? "Verification pending" : "Active"}</span>
        <h1 className="mt-3 break-words text-2xl font-bold leading-snug">{registration.name}</h1>
        <p className="mt-2 break-words text-sm leading-6">{registration.organization}</p>
        <p className="mt-2 text-sm font-semibold text-[#176F91]">{(registration.registrationTypes || [registration.registrationType]).filter(Boolean).join(" / ")}</p>
        <p className="mt-3 font-mono text-base font-bold">{number}</p>
        {(registration.exhibitorCompanies || []).map(company => <p key={company.applicationId} className="mt-2 break-words text-sm leading-6"><strong>Exhibiting with:</strong> {company.name}{company.booth ? ` (${company.booth})` : ""}</p>)}
        {registration.sponsorOrganization && <p className="mt-2 text-sm leading-6 text-[#526774]">Sponsored by {registration.sponsorOrganization}</p>}
        <h2 className="mt-6 flex items-center gap-2 text-sm font-bold"><CalendarDays size={16} />Registered days</h2>
        <ul className="mt-2 space-y-2 text-sm">{(registration.daysAttending || []).map(label => <li key={label} className="border-l-2 border-[#EFA74F] pl-3">{label}{days.find(d => d.label === label)?.date && <span className="block text-xs text-[#526774]">{date(days.find(d => d.label === label).date)}</span>}</li>)}</ul>
        <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-[#526774]"><MapPin size={16} className="mt-1 shrink-0" />{[conference.venue, conference.location].filter(Boolean).join(", ")}</p>
        <div className="mt-6 border-t border-[#cad8e2] pt-5">
          <h2 className="text-base font-bold">Download badge</h2>
          <p className="mt-1 text-sm text-[#526774]">Print size: 9.3 × 12.5 cm. PNG: 300 DPI.</p>
          <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={bleed} disabled={!!downloading} onChange={e => setBleed(e.target.checked)} className="h-4 w-4 accent-[#176F91]" />Add 3 mm print bleed</label>
          {bleed && <p className="mt-2 text-xs leading-5 text-[#526774]">File size: 9.9 × 13.1 cm. Trim to 9.3 × 12.5 cm.</p>}
          <div className="mt-4 flex flex-wrap gap-3">{["pdf", "png"].map(format => <button key={format} type="button" disabled={!!downloading} onClick={() => download(format)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#176F91] bg-white px-4 text-sm font-semibold text-[#176F91] disabled:opacity-60">{downloading === format ? <LoaderCircle size={17} className="animate-spin" /> : format === "pdf" ? <FileText size={17} /> : <Download size={17} />}{format.toUpperCase()}</button>)}</div>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <p className="mt-3 text-xs leading-5 text-[#526774]">Print the PDF at actual size (100%). Keep your badge and downloads private.</p>
        </div>
      </section>
    </div> : <section className="mx-auto max-w-xl py-12 text-center"><h1 className="text-xl font-bold">Badge unavailable</h1><p className="mt-2 text-sm text-[#526774]">Please contact the conference team for assistance.</p></section>}
    {badge && <div className="mx-auto mt-8 max-w-4xl"><MobileAppCta placement="badge" configuration={appConfiguration} /></div>}
    <p className="mx-auto mt-8 max-w-4xl border-t border-[#d8e2e9] pt-4 text-xs leading-5 text-[#526774]">This badge is personal to the named attendee. Entry is subject to the registered days and scan-event rules.</p>
  </main>
}
