import { proxyHrPortalJson } from "@/lib/hr-portal-api"

export const dynamic = "force-dynamic"

export async function GET(request) {
  return proxyHrPortalJson("/api/v1/rec/scanner/events", request)
}
