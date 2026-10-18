import { fetchHrPortalJson } from "@/lib/hr-portal-api"
import { PageErrorState } from "@/components/layout/public-page-state"
import { DigitalTag } from "@/components/scanner/digital-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "REC Digital Tag", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" }
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#e9eff3" }

export default async function DigitalTagPage({ params }) {
  const { token } = await params
  let badge
  try {
    badge = await fetchHrPortalJson(`/api/v1/rec/badges/${encodeURIComponent(token)}`)
  } catch {
    return <PageErrorState title="Tag unavailable" message="This Tag has been replaced or is no longer valid. Please contact the conference team." actionHref="/" actionLabel="Back to Conference" />
  }
  return <DigitalTag token={token} initialBadge={badge} />
}
