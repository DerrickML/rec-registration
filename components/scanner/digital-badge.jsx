"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Download, MapPin, Printer, RefreshCw, ShieldCheck } from "lucide-react"

export default function DigitalBadge({ token, initialBadge }) {
  const [badge, setBadge] = useState(initialBadge)
  const [warning, setWarning] = useState("")
  const [refreshing, setRefreshing] = useState(false)
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
  const conference = badge?.conference || initialBadge.conference || {}
  const days = conference.days || []
  const number = badge?.badge?.badgeNumberLabel || badge?.badge?.badgeNumber
  const date = (value) => new Date(value).toLocaleDateString("en-UG", { timeZone: "Africa/Kampala", dateStyle: "medium" })
  return <main className="min-h-screen bg-[#f0f4f7] px-3 py-6 text-[#172e3b] print:bg-white print:p-0 sm:px-6">
    <div className="mx-auto mb-4 flex max-w-2xl items-center justify-between gap-4 print:hidden"><Link href="/" className="text-sm font-semibold text-[#176F91]">REC & Expo</Link><span className="flex items-center gap-2 text-xs text-[#526774]">{refreshing ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}Digital badge</span></div>
    <article className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border border-[#d8e2e9] bg-white print:max-w-full print:rounded-none print:border-0">
      <header className="flex items-center gap-4 border-b-4 border-[#EFA74F] bg-[#176F91] p-5 text-white print:border-[#EFA74F] print:bg-white print:text-black sm:p-7">
        <Image src="/NREP.png" alt="NREP" width={60} height={60} className="h-14 w-14 shrink-0 rounded-full bg-white p-1" />
        <div className="min-w-0"><h1 className="break-words text-xl font-bold leading-snug">{conference.title || "Renewable Energy Conference & Expo"}</h1><p className="mt-1 text-sm text-white/90 print:text-black">{conference.startDate && date(conference.startDate)}{conference.endDate && ` - ${date(conference.endDate)}`}</p></div>
      </header>
      {warning && <p role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm leading-6 text-amber-900">{warning}</p>}
      {badge ? <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:p-7">
        <div className="min-w-0 sm:col-start-2 sm:row-start-1">
          <span className={`inline-flex rounded px-2 py-1 text-xs font-bold ${warning ? "bg-amber-50 text-amber-900" : "bg-[#e9f4ec] text-[#23623c]"}`}>{warning ? "Verification pending" : "Active"}</span>
          <h2 className="mt-3 break-words text-2xl font-bold leading-snug">{registration.name}</h2>
          <p className="mt-1 text-sm font-semibold text-[#176F91]">{registration.registrationType}</p>
        </div>
        <div className="min-w-0 text-center sm:col-start-1 sm:row-span-2 sm:row-start-1">
          <Image unoptimized src={badge.qrDataUrl} alt="Conference entry QR code" width={360} height={360} className="mx-auto aspect-square h-auto w-full max-w-[260px] bg-white" />
          <p className="mt-3 text-xs font-medium text-[#526774]">Badge number</p><p className="mt-1 break-words font-mono text-lg font-bold text-[#0B5E78]">{number}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 print:hidden"><a href={badge.qrDataUrl} download={`${number || "REC-badge"}.png`} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#cad8e2] px-3 text-sm font-semibold text-[#176F91]"><Download size={16} />Save QR</a><button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#cad8e2] px-3 text-sm font-semibold text-[#176F91]"><Printer size={16} />Print badge</button></div>
        </div>
        <section className="min-w-0 sm:col-start-2 sm:row-start-2">
          <p className="break-words text-sm leading-6">{registration.organization}</p>
          {registration.sponsorOrganization && <p className="mt-2 text-sm leading-6 text-[#526774]">Sponsored by {registration.sponsorOrganization}</p>}
          <p className="mt-2 break-all text-sm text-[#526774]">{registration.email}</p>
          <h3 className="mt-6 flex items-center gap-2 text-sm font-bold"><CalendarDays size={16} />Registered days</h3>
          <ul className="mt-2 space-y-2 text-sm">{(registration.daysAttending || []).map((label) => <li key={label} className="border-l-2 border-[#EFA74F] pl-3">{label}{days.find((d) => d.label === label)?.date && <span className="block text-xs text-[#526774]">{date(days.find((d) => d.label === label).date)}</span>}</li>)}</ul>
          <p className="mt-6 flex items-start gap-2 text-sm leading-6 text-[#526774]"><MapPin size={16} className="mt-1 shrink-0" />{[conference.venue, conference.location].filter(Boolean).join(", ")}</p>
        </section>
      </div> : <div className="p-8 text-center"><h2 className="text-xl font-bold">Badge unavailable</h2><p className="mt-2 text-sm text-[#526774]">Please contact the conference team for assistance.</p></div>}
      <footer className="border-t border-[#d8e2e9] px-5 py-4 text-xs leading-5 text-[#526774]">This badge is personal to the named attendee. Entry is subject to the registered days and scan-event rules.</footer>
    </article>
  </main>
}
