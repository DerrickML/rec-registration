"use client"

import { useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import { flattenSponsorsForShowcase } from "@/lib/sponsor-utils"

export default function SponsorShowcase({ categories = [], sponsors = [] }) {
  const rail = useRef(null)
  const items = useMemo(
    () =>
      flattenSponsorsForShowcase(categories, sponsors)
        .sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured))
        .slice(0, 12),
    [categories, sponsors]
  )
  if (!items.length) return null
  const move = (direction) => {
    rail.current?.scrollBy({
      left: direction * rail.current.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    })
  }
  return (
    <section className="site-section section-wash">
      <div className="site-container">
        <div className="section-heading">
          <div>
            <p className="site-kicker">Sponsors & partners</p>
            <h2>Making REC possible.</h2>
          </div>
          <Link href="/sponsors" className="site-text-link">
            All sponsors & partners <ArrowUpRight size={17} />
          </Link>
        </div>
        <div
          className="sponsor-carousel"
          ref={rail}
          role="region"
          aria-label="Conference sponsors"
          tabIndex={0}
        >
          {items.map((sponsor) => (
            <Link
              className="sponsor-slide"
              href="/sponsors"
              key={sponsor.$id || sponsor.name}
            >
              <div className="sponsor-logo">
                {sponsor.logoUrl ? (
                  <Image
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    width={180}
                    height={90}
                  />
                ) : (
                  <span className="text-2xl font-semibold text-primary">
                    {sponsor.name?.slice(0, 2)}
                  </span>
                )}
              </div>
              <h3>{sponsor.name}</h3>
              <p>{sponsor.category?.name || "Partner"}</p>
            </Link>
          ))}
        </div>
        {items.length > 1 && (
          <div className="button-row mt-5 justify-end">
            <button
              onClick={() => move(-1)}
              className="icon-button"
              title="Previous sponsors"
              aria-label="Previous sponsors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => move(1)}
              className="icon-button"
              title="Next sponsors"
              aria-label="Next sponsors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
