"use client"

import { useState } from "react"
import Image from "next/image"
import { ExternalLink, Handshake } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { groupSponsorsByCategory } from "@/lib/sponsor-utils"

function SponsorLogo({ sponsor, large = false }) {
  return sponsor.logoUrl ? (
    <Image
      src={sponsor.logoUrl}
      alt={`${sponsor.name} logo`}
      width={240}
      height={120}
      className={`object-contain ${large ? "h-28 max-w-[240px]" : "h-20 max-w-[180px]"}`}
    />
  ) : (
    <span className="text-3xl font-semibold text-primary">
      {sponsor.name?.slice(0, 2).toUpperCase() || "SP"}
    </span>
  )
}

export default function SponsorsDirectory({ categories = [], sponsors = [] }) {
  const [selected, setSelected] = useState(null)
  const groups = groupSponsorsByCategory(categories, sponsors)
  return (
    <section className="site-container site-section">
      {!groups.length ? (
        <div className="empty-state">
          <Handshake size={32} />
          <h2>Sponsors coming soon</h2>
          <p>Partner information will appear here once published.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map(({ category, sponsors: list }) => (
            <section key={category.$id || category.name}>
              <div className="mb-6 border-b border-gray-200 pb-5">
                <h2 className="text-2xl font-semibold">{category.name}</h2>
                {category.description && (
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((sponsor) => (
                  <article
                    key={sponsor.$id || sponsor.name}
                    className="rounded-md border border-gray-200 bg-white p-6 text-center transition-colors hover:border-primary"
                  >
                    <button
                      type="button"
                      onClick={() => setSelected({ ...sponsor, category })}
                      aria-label={`View details for ${sponsor.name}`}
                      className="w-full"
                    >
                      <div className="mb-5 flex h-28 items-center justify-center">
                        <SponsorLogo sponsor={sponsor} />
                      </div>
                      <h3 className="text-lg font-semibold leading-6">
                        {sponsor.name}
                      </h3>
                    </button>
                    {sponsor.siteUrl && (
                      <a
                        href={sponsor.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="site-text-link mt-5"
                      >
                        Visit website <ExternalLink size={15} />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <div className="flex justify-center py-6">
                <SponsorLogo sponsor={selected} large />
              </div>
              <DialogHeader>
                <p className="site-kicker">{selected.category?.name}</p>
                <DialogTitle className="pr-8 text-2xl leading-snug">
                  {selected.name}
                </DialogTitle>
                <DialogDescription>Sponsor & partner profile</DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-line text-base leading-7 text-gray-600">
                {selected.description ||
                  "More information will be published soon."}
              </p>
              {selected.siteUrl && (
                <a
                  href={selected.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-text-link mt-4"
                >
                  Visit website <ExternalLink size={16} />
                </a>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
