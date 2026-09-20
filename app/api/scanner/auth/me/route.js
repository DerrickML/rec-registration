import { proxyScannerRequest } from "@/lib/scanner-proxy"

export const dynamic = "force-dynamic"

export async function GET(request) {
  return proxyScannerRequest("/api/v1/rec/scanner/auth/me", request)
}
