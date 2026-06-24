import { NextResponse } from "next/server"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const payload = await fetchHrPortalJson("/api/v1/rec/media/conferences", {
      cache: "no-store",
    })
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      error.payload || { error: error.message || "Failed to load media conferences" },
      { status: error.status || 500 }
    )
  }
}
