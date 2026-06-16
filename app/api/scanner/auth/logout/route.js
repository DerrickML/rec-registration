import { proxyHrPortalJson } from "@/lib/hr-portal-api"

export const dynamic = "force-dynamic"

export async function POST(request) {
  return proxyHrPortalJson("/api/v1/rec/scanner/auth/logout", request, { method: "POST" })
}
