import { proxyScannerRequest } from "@/lib/scanner-proxy"
export const dynamic = "force-dynamic"
export async function GET(request) {
  const query = new URLSearchParams()
  const incoming = new URL(request.url).searchParams
  for (const key of ["page", "limit", "status", "eventId", "from", "to"]) if (incoming.has(key)) query.set(key, incoming.get(key))
  return proxyScannerRequest(`/api/v1/rec/scanner/activity?${query}`, request)
}
