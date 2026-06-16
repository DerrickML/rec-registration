import { proxyHrPortalJson } from "@/lib/hr-portal-api"

export const dynamic = "force-dynamic"

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  return proxyHrPortalJson(`/api/v1/rec/scanner/auth/request-otp?${searchParams.toString()}`, request)
}

export async function POST(request) {
  return proxyHrPortalJson("/api/v1/rec/scanner/auth/request-otp", request, { method: "POST" })
}
