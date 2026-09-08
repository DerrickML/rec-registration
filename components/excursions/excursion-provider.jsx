"use client"
import { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { isExcursionPromoted } from "@/lib/excursions"
const ExcursionContext = createContext(null)
export function useExcursion() { return useContext(ExcursionContext) }
export default function ExcursionProvider({ children }) {
  const pathname = usePathname()
  const enabled = ["/", "/about", "/program", "/media", "/media/reports", "/venue", "/sponsors"].includes(pathname) || pathname.startsWith("/explore-uganda")
  const [excursion, setExcursion] = useState(null)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!enabled) return
    let active = true
    let controller
    const refresh = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const result = await fetch("/api/excursions", { signal: controller.signal, cache: "no-store" })
        const data = await result.json()
        if (active) { setExcursion(data.documents?.[0] || null); setNow(Date.now()) }
      } catch (error) { if (active && error.name !== "AbortError") setExcursion(null) }
    }
    refresh()
    const timer = setInterval(refresh, 60000)
    return () => { active = false; controller?.abort(); clearInterval(timer) }
  }, [enabled])
  useEffect(() => {
    if (!excursion) return
    const remaining = Math.min(Date.parse(excursion.promotionEnd), Date.parse(excursion.endsAt)) - Date.now()
    if (remaining <= 0) return
    const timer = setTimeout(() => setNow(Date.now()), Math.min(remaining, 2147483647))
    return () => clearTimeout(timer)
  }, [excursion])
  return <ExcursionContext.Provider value={enabled && isExcursionPromoted(excursion, now) ? excursion : null}>{children}</ExcursionContext.Provider>
}
