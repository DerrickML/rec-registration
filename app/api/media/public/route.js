import { NextResponse } from "next/server"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"

export const dynamic = "force-dynamic"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const params = new URLSearchParams()
    ;["conferenceId", "type", "featured", "page", "limit"].forEach((key) => {
      const value = searchParams.get(key)
      if (value) params.set(key, value)
    })

    const payload = await fetchHrPortalJson(`/api/v1/rec/media?${params.toString()}`, {
      cache: "no-store",
    })
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      error.payload || { error: error.message || "Failed to load media" },
      { status: error.status || 500 }
    )
  }
}
