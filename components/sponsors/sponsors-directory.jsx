"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { groupSponsorsByCategory } from "@/lib/sponsor-utils"

function SponsorLogo({ sponsor, large = false }) {
  if (sponsor.logoUrl) {
    return (
      <img
        src={sponsor.logoUrl}
        alt={`${sponsor.name} logo`}
        className={`${large ? "h-24 max-w-[240px]" : "h-16 max-w-[180px]"} object-contain`}
      />
    )
  }

  return (
    <div
      className={`${large ? "h-24 w-24 text-3xl" : "h-16 w-16 text-xl"} flex items-center justify-center rounded-xl bg-[#0B7186]/10 font-extrabold text-[#0B7186]`}
    >
      {sponsor.name?.slice(0, 2).toUpperCase() || "SP"}
    </div>
  )
}

export default function SponsorsDirectory({ categories = [], sponsors = [] }) {
  const [selectedSponsor, setSelectedSponsor] = useState(null)
  const groups = groupSponsorsByCategory(categories, sponsors)

  if (groups.length === 0) {
    return (
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-950">Sponsors coming soon</h2>
          <p className="mt-3 text-gray-500">
            Sponsor and partner information will appear here once it has been published.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        {groups.map(({ category, sponsors: categorySponsors }) => {
          const accentColor = category.accentColor || "#0B7186"

          return (
            <div key={category.$id || category.name}>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Badge
                    className="mb-3 rounded-md border bg-white px-3 py-1.5 text-sm font-bold"
                    style={{ borderColor: `${accentColor}40`, color: accentColor }}
                  >
                    {category.name}
                  </Badge>
                  {category.description && (
                    <p className="max-w-3xl text-base leading-7 text-gray-500">
                      {category.description}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-400">
                  {categorySponsors.length} {categorySponsors.length === 1 ? "organization" : "organizations"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {categorySponsors.map((sponsor) => (
                  <article
                    key={sponsor.$id || sponsor.name}
                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0B7186]/25 hover:shadow-lg"
                  >
                    <div
                      className="absolute left-0 top-0 h-1 w-full opacity-80"
                      style={{ backgroundColor: accentColor }}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedSponsor({ ...sponsor, category })}
                      className="block w-full rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-[#0B7186]/25"
                      aria-label={`View details for ${sponsor.name}`}
                    >
                      <div className="mb-5 flex min-h-28 items-center justify-center rounded-xl border border-gray-100 bg-slate-50 p-5">
                        <SponsorLogo sponsor={sponsor} />
                      </div>
                      <h3 className="text-center text-lg font-extrabold leading-6 text-gray-950">
                        {sponsor.name}
                      </h3>
                    </button>
                    {sponsor.siteUrl && (
                      <a
                        href={sponsor.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mx-auto mt-5 flex w-fit items-center text-sm font-bold text-[#0B7186] hover:text-[#054653]"
                      >
                        Visit website
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog
        open={Boolean(selectedSponsor)}
        onOpenChange={(open) => {
          if (!open) setSelectedSponsor(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-0 bg-white p-0 sm:max-w-2xl">
          {selectedSponsor && (
            <div className="overflow-hidden rounded-lg">
              <div
                className="h-2 w-full"
                style={{ backgroundColor: selectedSponsor.category?.accentColor || "#0B7186" }}
              />
              <div className="p-6 sm:p-8">
                <DialogHeader>
                  <div className="mb-6 flex min-h-36 items-center justify-center rounded-xl border border-gray-100 bg-slate-50 p-6">
                    <SponsorLogo sponsor={selectedSponsor} large />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedSponsor.category?.name && (
                      <Badge
                        className="rounded-md border bg-white px-3 py-1 text-xs font-bold"
                        style={{
                          borderColor: `${selectedSponsor.category.accentColor || "#0B7186"}40`,
                          color: selectedSponsor.category.accentColor || "#0B7186",
                        }}
                      >
                        {selectedSponsor.category.name}
                      </Badge>
                    )}
                    {selectedSponsor.isFeatured && (
                      <Badge className="rounded-md bg-[#FFB803]/15 px-3 py-1 text-xs font-bold text-[#8A6200]">
                        Featured Partner
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="pt-2 text-2xl font-extrabold leading-tight text-gray-950 sm:text-3xl">
                    {selectedSponsor.name}
                  </DialogTitle>
                  <DialogDescription className="text-base leading-7 text-gray-500">
                    Sponsor and partner profile
                  </DialogDescription>
                </DialogHeader>

                {selectedSponsor.description ? (
                  <div className="mt-6 rounded-xl border border-gray-100 bg-slate-50 p-5">
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
                      About
                    </h3>
                    <p className="text-sm leading-7 text-gray-600 sm:text-base">
                      {selectedSponsor.description}
                    </p>
                  </div>
                ) : (
                  <p className="mt-6 rounded-xl border border-gray-100 bg-slate-50 p-5 text-sm leading-7 text-gray-500">
                    More details about this sponsor will be published soon.
                  </p>
                )}

                {selectedSponsor.siteUrl && (
                  <div className="mt-6 flex justify-end">
                    <a
                      href={selectedSponsor.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="rounded-lg bg-[#0B7186] px-5 font-semibold text-white hover:bg-[#054653]">
                        Visit website
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
