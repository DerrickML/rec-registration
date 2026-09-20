import { proxyScannerRequest } from "@/lib/scanner-proxy"

export const dynamic = "force-dynamic"

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  return proxyScannerRequest(`/api/v1/rec/scanner/auth/request-otp?${searchParams.toString()}`, request)
}

export async function POST(request) {
  return proxyScannerRequest("/api/v1/rec/scanner/auth/request-otp", request, { method: "POST" })
}
