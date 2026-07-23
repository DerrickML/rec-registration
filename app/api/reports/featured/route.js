import { NextResponse } from "next/server"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"

export const dynamic = "force-dynamic"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const params = new URLSearchParams()
    const conferenceId = searchParams.get("conferenceId")
    if (conferenceId) params.set("conferenceId", conferenceId)
    const payload = await fetchHrPortalJson(`/api/v1/rec/reports/featured?${params.toString()}`, {
      cache: "no-store",
    })
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      error.payload || { error: error.message || "Failed to load previous conference report" },
      { status: error.status || 500 }
    )
  }
}
