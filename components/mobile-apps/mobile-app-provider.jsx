"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { availableAppPlatforms } from "@/lib/mobile-apps"

const AppContext = createContext(null)
export function useMobileApps() { return useContext(AppContext) }

export function useAppConfiguration(conferenceId, active = true) {
  const [state, setState] = useState({ configuration: null, loading: true, error: "" })
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (!active) return
    let live = true, controller
    const load = async () => {
      if (document.hidden) return
      controller?.abort(); controller = new AbortController()
      try {
        const response = await fetch(`/api/mobile-apps?${new URLSearchParams(conferenceId ? { conferenceId } : {})}`, { cache: "no-store", signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Unable to load app information.")
        if (live) setState({ configuration: data, loading: false, error: "" })
      } catch (error) {
        if (live && error.name !== "AbortError") setState({ configuration: null, loading: false, error: error.message })
      }
    }
    setState({ configuration: null, loading: true, error: "" }); load()
    const timer = setInterval(load, 60000)
    window.addEventListener("focus", load); document.addEventListener("visibilitychange", load)
    return () => { live = false; controller?.abort(); clearInterval(timer); window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", load) }
  }, [conferenceId, active, refresh])
  return { ...state, retry: () => setRefresh(v => v + 1) }
}

export default function MobileAppProvider({ children }) {
  const pathname = usePathname()
  const enabled = ["/", "/about", "/program", "/media", "/media/reports", "/venue", "/sponsors", "/register", "/exhibit/apply", "/app"].includes(pathname)
  const { configuration } = useAppConfiguration("", enabled)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const expires = configuration?.platforms?.find(p => p.source === "testflight")?.expiresAt
    if (!expires) return
    const remaining = Date.parse(expires) - Date.now()
    if (remaining <= 0) { setNow(Date.now()); return }
    const timer = setTimeout(() => setNow(Date.now()), Math.min(remaining + 1, 2147483647))
    return () => clearTimeout(timer)
  }, [configuration])
  const value = enabled && availableAppPlatforms(configuration, Math.max(now, Date.now())).length ? configuration : null
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
