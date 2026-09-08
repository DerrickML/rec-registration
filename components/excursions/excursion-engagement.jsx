"use client"
import { useEffect, useState } from "react"
import { ExternalLink } from "lucide-react"
import { excursionSource, partnerDestination } from "@/lib/excursions"
import styles from "./excursions.module.css"
function event(slug, kind, source) {
  fetch(`/api/excursions/${encodeURIComponent(slug)}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, source }), keepalive: true }).catch(() => {})
}
export function ExcursionPageView({ slug }) {
  useEffect(() => {
    const source = excursionSource(new URLSearchParams(window.location.search).get("from"))
    try {
      const key = `rec-excursion-view:${slug}:${source}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch { /* Private browsing may disable session storage; viewing still works. */ }
    event(slug, "view", source)
  }, [slug])
  return null
}
export function PartnerLink({ excursion, children = "View details & enquire", subtle = false }) {
  const [source, setSource] = useState("direct")
  useEffect(() => { setSource(excursionSource(new URLSearchParams(window.location.search).get("from"))) }, [])
  const href = partnerDestination(excursion, source)
  if (!href) return null
  return <a href={href} target="_blank" rel="noopener noreferrer" className={subtle ? styles.textLink : styles.button} onClick={() => event(excursion.slug, "outbound", source)}>{children}<ExternalLink size={16} /><span className={styles.srOnly}> (opens {excursion.content.partnerName} in a new tab)</span></a>
}
