"use client"

import { useParams, usePathname, useRouter } from "next/navigation"
import ScannerPortal from "@/components/scanner/ScannerPortal"
import "./scanner.css"

export default function ScannerLayout({ children }) {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  return <ScannerPortal view={pathname === "/scanner/activity" ? "activity" : params.eventId ? "scan" : "dashboard"} routeEventId={params.eventId || ""} onNavigate={href => router.push(href)}>{children}</ScannerPortal>
}
