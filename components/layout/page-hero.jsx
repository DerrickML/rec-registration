"use client"

import { Calendar, MapPin, Building } from "lucide-react"

export default function PageHero({
  title,
  subtitle,
  conference,
  backgroundImage,
  showEventInfo = true,
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      {backgroundImage ? (
        <div className="absolute inset-0">
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/70 to-gray-900/90" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#054653] via-[#0B7186] to-[#054653]">
          {/* Decorative elements */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFB803]/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
            {subtitle}
          </p>
        )}

        {showEventInfo && conference && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <Calendar className="w-4 h-4 text-[#FFB803]" />
              <span className="text-sm font-medium text-white/90">
                {new Date(conference.startDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}{" "}
                -{" "}
                {new Date(conference.endDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <MapPin className="w-4 h-4 text-[#FFB803]" />
              <span className="text-sm font-medium text-white/90">
                {conference.location}
              </span>
            </div>
            {conference.venue && (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                <Building className="w-4 h-4 text-[#FFB803]" />
                <span className="text-sm font-medium text-white/90">
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
