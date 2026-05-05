"use client"

import { Building, Calendar, MapPin } from "lucide-react"

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return ""

  const start = new Date(startDate)
  const end = new Date(endDate)

  return `${start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`
}

export default function PageHero({
  title,
  subtitle,
  conference,
  backgroundImage,
  showEventInfo = true,
}) {
  const eventDate = conference ? formatDateRange(conference.startDate, conference.endDate) : ""

  return (
    <section className="relative overflow-hidden bg-[#054653]">
      {backgroundImage ? (
        <div className="absolute inset-0">
          <img src={backgroundImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/[0.85] via-gray-950/70 to-gray-950/60" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#053d49_0%,#0B7186_58%,#084e5c_100%)]">
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8 lg:text-left">
        <h1 className="mx-auto max-w-4xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:mx-0 lg:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/75 sm:text-lg lg:mx-0">
            {subtitle}
          </p>
        )}

        {showEventInfo && conference && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            {eventDate && (
              <div className="flex items-center space-x-2 rounded-lg border border-white/[0.15] bg-white/10 px-4 py-2 backdrop-blur-sm">
                <Calendar className="h-4 w-4 text-[#FFB803]" />
                <span className="text-sm font-semibold text-white/90">{eventDate}</span>
              </div>
            )}
            {conference.location && (
              <div className="flex items-center space-x-2 rounded-lg border border-white/[0.15] bg-white/10 px-4 py-2 backdrop-blur-sm">
                <MapPin className="h-4 w-4 text-[#FFB803]" />
                <span className="text-sm font-semibold text-white/90">
                  {conference.location}
                </span>
              </div>
            )}
            {conference.venue && (
              <div className="flex items-center space-x-2 rounded-lg border border-white/[0.15] bg-white/10 px-4 py-2 backdrop-blur-sm">
                <Building className="h-4 w-4 text-[#FFB803]" />
                <span className="text-sm font-semibold text-white/90">
                  {conference.venue}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
