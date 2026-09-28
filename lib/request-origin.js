export function hasTrustedRequestOrigin(request, { allowMissingOrigin = false } = {}) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false
  const origin = request.headers.get("origin")
  if (origin === null) return allowMissingOrigin
  if (!origin || origin === "null") return false

  try {
    // Production request URLs can contain a proxy's internal host or HTTP scheme.
    // Do not let Host/X-Forwarded-* headers expand the trusted browser origins.
    const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://rec.nrep.ug")
    if (!["https:", "http:"].includes(site.protocol) || site.username || site.password) return false
    return origin === site.origin || (
      process.env.NODE_ENV !== "production" && origin === new URL(request.url).origin
    )
  } catch {
    return false
  }
}
