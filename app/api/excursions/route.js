import { NextResponse } from "next/server"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"
export async function GET() {
  try {
    return NextResponse.json(await fetchHrPortalJson("/api/v1/rec/excursions", { signal: AbortSignal.timeout(8000) }), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.warn("Excursion promotion unavailable:", error.message)
    return NextResponse.json({ documents: [], total: 0, unavailable: true }, { headers: { "Cache-Control": "no-store" } })
  }
}
