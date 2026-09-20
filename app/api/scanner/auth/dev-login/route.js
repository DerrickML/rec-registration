import { NextResponse } from "next/server"
import { proxyScannerRequest, scannerDevEnabled } from "@/lib/scanner-proxy"

export function GET(request) {
  return NextResponse.json({ enabled: scannerDevEnabled(request) }, { headers: { "Cache-Control": "no-store" } })
}
export function POST(request) {
  return proxyScannerRequest("/api/v1/rec/scanner/auth/dev-login", request, { method: "POST", login: true, development: true })
}
