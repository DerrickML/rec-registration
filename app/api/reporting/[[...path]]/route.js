import { proxyReportingRequest } from "@/lib/reporting-proxy"

export const runtime = "nodejs"

async function handle(request, context) {
  const params = await context.params
  return proxyReportingRequest(params?.path || [], request)
}

export const GET = handle
export const POST = handle
export const PUT = handle
