import { NextResponse } from "next/server"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"

export const dynamic = "force-dynamic"

export async function GET(_request, { params }) {
  try {
    const { token } = await params
    const badge = await fetchHrPortalJson(`/api/v1/rec/badges/${encodeURIComponent(token)}`)
    return NextResponse.json(badge, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      error.payload || { error: error.message || "Badge could not be loaded" },
      { status: error.status || 500 }
    )
  }
}
