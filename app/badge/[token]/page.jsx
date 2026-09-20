import { fetchHrPortalJson } from "@/lib/hr-portal-api"
import { PageErrorState } from "@/components/layout/public-page-state"
import DigitalBadge from "@/components/scanner/digital-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "REC Digital Badge", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" }

export default async function DigitalBadgePage({ params }) {
  const { token } = await params
  let badge, failure
  try {
    badge = await fetchHrPortalJson(`/api/v1/rec/badges/${encodeURIComponent(token)}`)
  } catch (error) {
    failure = error.message || "This badge is invalid, expired or revoked."
  }
  if (failure) return <PageErrorState title="Badge unavailable" message={failure} actionHref="/" actionLabel="Back to Conference" />
  return <DigitalBadge token={token} initialBadge={badge} />
}
