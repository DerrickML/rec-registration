import { fetchHrPortalJson } from "@/lib/hr-portal-api"
import { PageErrorState } from "@/components/layout/public-page-state"

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
  const name = badge?.registration?.name || "participant"
  return (
    <main
      data-site-motion="off"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "#e9eff3",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(100%, 340px, calc((100dvh - 32px) * 1098 / 1476))",
          aspectRatio: "1098 / 1476",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.18)",
        }}
      >
        <p
          style={{
            position: "absolute",
            inset: 0,
            margin: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          Loading your Tag…
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/badges/${encodeURIComponent(token)}/print?format=png`}
          alt={`REC digital Tag for ${name}`}
          width={1098}
          height={1476}
          style={{ position: "relative", display: "block", width: "100%", height: "100%" }}
        />
      </div>
    </main>
  )
}
