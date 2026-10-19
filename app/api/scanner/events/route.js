import { proxyScannerRequest } from "@/lib/scanner-proxy"

export const dynamic = "force-dynamic"

export async function GET(request) {
  const query = new URLSearchParams()
  const incoming = new URL(request.url).searchParams
  for (const key of ["page", "limit", "status", "search", "day", "date", "venue", "type"]) if (incoming.has(key)) query.set(key, incoming.get(key))
  return proxyScannerRequest(`/api/v1/rec/scanner/events${query.size ? `?${query}` : ""}`, request)
}
