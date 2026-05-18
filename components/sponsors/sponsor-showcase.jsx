"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Handshake } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { flattenSponsorsForShowcase } from "@/lib/sponsor-utils"

function SponsorLogo({ sponsor, large = false }) {
  if (sponsor.logoUrl) {
    return (
      <img
        src={sponsor.logoUrl}
        alt={`${sponsor.name} logo`}
        className={`${large ? "h-24 max-w-[220px]" : "h-12 max-w-[140px]"} object-contain`}
      />
    )
  }

  return (
    <div
      className={`${large ? "h-24 w-24 text-3xl" : "h-12 w-12 text-base"} flex items-center justify-center rounded-xl bg-[#0B7186]/10 font-extrabold text-[#0B7186]`}
    >
      {sponsor.name?.slice(0, 2).toUpperCase() || "SP"}
    </div>
  )
}

export default function SponsorShowcase({ conference, categories = [], sponsors = [] }) {
  const sponsorItems = useMemo(() => {
    const items = flattenSponsorsForShowcase(categories, sponsors)
    const featured = items.filter((sponsor) => sponsor.isFeatured)
    const regular = items.filter((sponsor) => !sponsor.isFeatured)
    return [...featured, ...regular].slice(0, 12)
  }, [categories, sponsors])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (sponsorItems.length <= 1) return undefined

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % sponsorItems.length)
    }, 6500)

    return () => clearInterval(timer)
  }, [sponsorItems.length])

  if (sponsorItems.length === 0) {
    return null
  }

  const activeSponsor = sponsorItems[activeIndex] || sponsorItems[0]
  const categoryName = activeSponsor.category?.name || "Sponsor"
  const accentColor = activeSponsor.category?.accentColor || "#0B7186"

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + sponsorItems.length) % sponsorItems.length)
  }

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % sponsorItems.length)
  }

  return (
    <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="mb-4 rounded-md border border-[#0B7186]/15 bg-[#0B7186]/[0.08] px-3 py-1.5 text-sm font-semibold text-[#0B7186]">
              <Handshake className="mr-1.5 h-3.5 w-3.5" />
              Sponsors & Partners
            </Badge>
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              Backing {conference?.shortName || "the conference"} impact
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-500">
              Meet the organizations supporting renewable energy collaboration, exhibition,
              investment, and sector growth.
            </p>
          </div>
          <Link href="/sponsors">
            <Button className="rounded-lg bg-[#0B7186] px-5 font-semibold text-white hover:bg-[#054653]">
              View All Sponsors
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div
              className="absolute left-0 top-0 h-1 w-full"
              style={{ backgroundColor: accentColor }}
            />
            <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:items-center">
              <div className="flex min-h-44 items-center justify-center rounded-xl border border-gray-200 bg-slate-50 p-6">
                <SponsorLogo sponsor={activeSponsor} large />
              </div>
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge
                    className="rounded-md border bg-white px-3 py-1 text-xs font-bold"
                    style={{ borderColor: `${accentColor}40`, color: accentColor }}
                  >
                    {categoryName}
                  </Badge>
                  {activeSponsor.isFeatured && (
                    <Badge className="rounded-md bg-[#FFB803]/15 px-3 py-1 text-xs font-bold text-[#8A6200]">
                      Featured Partner
                    </Badge>
                  )}
                </div>
                <h3 className="text-2xl font-extrabold text-gray-950 sm:text-3xl">
                  {activeSponsor.name}
                </h3>
                {activeSponsor.description && (
                  <p className="mt-4 line-clamp-4 text-base leading-7 text-gray-600">
                    {activeSponsor.description}
                  </p>
                )}
                {activeSponsor.siteUrl && (
                  <a
                    href={activeSponsor.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center text-sm font-bold text-[#0B7186] hover:text-[#054653]"
                  >
                    Visit website
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {sponsorItems.length > 1 && (
              <div className="mt-7 flex items-center justify-between gap-4 border-t border-gray-100 pt-5">
                <div className="text-sm font-semibold text-gray-500">
                  {activeIndex + 1} of {sponsorItems.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-[#0B7186]/30 hover:bg-[#0B7186]/5 hover:text-[#0B7186]"
                    aria-label="Previous sponsor"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-[#0B7186]/30 hover:bg-[#0B7186]/5 hover:text-[#0B7186]"
                    aria-label="Next sponsor"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </article>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Sponsor Slider
              </p>
            </div>
            <div className="max-h-[420px] space-y-1 overflow-y-auto p-2">
              {sponsorItems.map((sponsor, index) => (
                <button
                  key={sponsor.$id || sponsor.name}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`grid w-full grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    activeIndex === index
                      ? "border-[#0B7186]/35 bg-[#0B7186]/[0.06]"
                      : "border-transparent hover:border-gray-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex h-14 items-center justify-center rounded-lg bg-white p-2">
                    <SponsorLogo sponsor={sponsor} />
                  </div>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-bold text-gray-950">
                      {sponsor.name}
                    </strong>
                    <span className="mt-1 block truncate text-xs font-medium text-gray-500">
                      {sponsor.category?.name || "Sponsor"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
