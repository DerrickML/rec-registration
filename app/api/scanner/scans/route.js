import { proxyScannerRequest } from "@/lib/scanner-proxy"

export const dynamic = "force-dynamic"

export async function POST(request) {
  return proxyScannerRequest("/api/v1/rec/scanner/scans", request, { method: "POST" })
}
