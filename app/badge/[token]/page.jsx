import { AlertTriangle, BadgeCheck, CalendarDays, Download, ExternalLink, Hash, MapPin, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import { PageErrorState } from "@/components/layout/public-page-state"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"

export const dynamic = "force-dynamic"

function formatDateRange(conference) {
  if (!conference?.startDate && !conference?.endDate) return "Dates to be confirmed"
  const options = { month: "short", day: "numeric", year: "numeric", timeZone: "Africa/Kampala" }
  const start = conference.startDate ? new Date(conference.startDate).toLocaleDateString("en-UG", options) : ""
  const end = conference.endDate ? new Date(conference.endDate).toLocaleDateString("en-UG", options) : ""
  return [start, end].filter(Boolean).join(" - ")
}

async function getBadge(token) {
  return fetchHrPortalJson(`/api/v1/rec/badges/${encodeURIComponent(token)}`)
}

export async function generateMetadata({ params }) {
  const { token } = await params
  try {
    const badge = await getBadge(token)
    return {
      title: `${badge.registration?.name || "REC"} Badge | ${badge.conference?.shortName || "REC"}`,
      robots: { index: false, follow: false },
    }
  } catch {
    return {
      title: "REC Badge",
      robots: { index: false, follow: false },
    }
  }
}

export default async function DigitalBadgePage({ params }) {
  const { token } = await params
  let badge
  try {
    badge = await getBadge(token)
  } catch (error) {
    return (
      <PageErrorState
        title="Badge unavailable"
        message={error.message || "This badge link is invalid or has been revoked."}
        actionHref="/"
        actionLabel="Back to Conference"
      />
    )
  }

  const conference = badge.conference || {}
  const registration = badge.registration || {}
  const badgeNumber = badge.badge?.badgeNumberLabel || badge.badge?.badgeNumber || ""

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar conference={conference} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#054653] px-5 py-6 text-white sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/85">
                  <BadgeCheck className="h-4 w-4 text-[#FFB803]" />
                  Digital Conference Badge
                </div>
                <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
                  {registration.name || "Conference Registrant"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                  Show this page at configured conference scan points if your physical badge is not available.
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white/85">
                {registration.registrationType || "Registrant"}
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r sm:p-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={badge.qrDataUrl}
                  alt={`QR code for ${registration.name || "conference badge"}`}
                  className="mx-auto h-64 w-64 rounded-xl border border-slate-100 bg-white p-2"
                />
                <div className="mt-4 flex flex-col gap-2">
                  <a
                    href={badge.qrDataUrl}
                    download={`${registration.name || "rec"}-badge-qr.png`}
                  >
                    <Button className="h-10 w-full rounded-lg bg-[#0B7186] text-sm font-bold text-white hover:bg-[#054653]">
                      <Download className="mr-2 h-4 w-4" />
                      Save QR Image
                    </Button>
                  </a>
                </div>
              </div>
              {badgeNumber && (
                <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-center">
                  <div className="mb-2 flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#0B7186]">
                    <Hash className="h-4 w-4" />
                    Manual badge number
                  </div>
                  <div className="font-mono text-2xl font-black tracking-wider text-[#054653]">{badgeNumber}</div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                    Use this number at scan points if camera scanning is not available.
                  </p>
                </div>
              )}
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4" />
                  Badge security
                </div>
                This badge is unique to this registration. If it is revoked or reissued, this link will stop working.
              </div>
            </aside>

            <section className="grid content-start gap-5 p-5 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <UserRound className="h-4 w-4 text-[#0B7186]" />
                    Registrant
                  </div>
                  <p className="text-lg font-extrabold text-slate-950">{registration.name || "Registrant"}</p>
                  <p className="mt-1 text-sm text-slate-600">{registration.email || "No email available"}</p>
                  <p className="mt-1 text-sm text-slate-600">{registration.organization || "No organization provided"}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-[#0B7186]" />
                    Badge Status
                  </div>
                  <p className="text-lg font-extrabold text-emerald-700">Active</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Issued {badge.badge?.issuedAt ? new Date(badge.badge.issuedAt).toLocaleString("en-UG", { timeZone: "Africa/Kampala" }) : "recently"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-extrabold text-slate-950">{conference.title || "Renewable Energy Conference"}</h2>
                <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-5 w-5 text-[#0B7186]" />
                    <span>{formatDateRange(conference)}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-[#0B7186]" />
                    <span>{[conference.venue, conference.location].filter(Boolean).join(", ") || "Venue to be confirmed"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Conference attendance</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(registration.daysAttending || []).length ? (
                    registration.daysAttending.map((day) => (
                      <span key={day} className="rounded-lg bg-[#0B7186]/10 px-3 py-1.5 text-sm font-bold text-[#0B7186]">{day}</span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-600">No specific days recorded.</span>
                  )}
                </div>
              </div>

              <a
                href={badge.badgeUrl}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0B7186] hover:text-[#054653]"
              >
                Open this badge link
                <ExternalLink className="h-4 w-4" />
              </a>
            </section>
          </div>
        </section>
      </main>
      <Footer conference={conference} />
    </div>
  )
}
