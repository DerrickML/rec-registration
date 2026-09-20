import { proxyScannerRequest } from "@/lib/scanner-proxy"

export const dynamic = "force-dynamic"

export async function POST(request) {
  return proxyScannerRequest("/api/v1/rec/scanner/auth/logout", request, { method: "POST", logout: true })
}
