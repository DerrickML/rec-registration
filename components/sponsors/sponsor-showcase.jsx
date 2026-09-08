"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react"
import {
  flattenSponsorsForShowcase,
  getNextSponsorScrollPosition,
} from "@/lib/sponsor-utils"

const AUTO_SCROLL_INTERVAL = 5000
const INTERACTION_PAUSE = 7000

export default function SponsorShowcase({ categories = [], sponsors = [] }) {
  const rail = useRef(null)
  const resumeTimer = useRef(null)
  const autoplayChoice = useRef(false)
  const [autoScroll, setAutoScroll] = useState(false)
  const [canScroll, setCanScroll] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const items = useMemo(
    () =>
      flattenSponsorsForShowcase(categories, sponsors)
        .sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured))
        .slice(0, 12),
    [categories, sponsors]
  )

  const move = useCallback(
    (direction) => {
      const carousel = rail.current
      if (!carousel) return
      const slides = Array.from(carousel.children)
      const firstOffset = slides[0]?.offsetLeft || 0
      const maxScroll = carousel.scrollWidth - carousel.clientWidth
      const left = getNextSponsorScrollPosition({
        scrollLeft: carousel.scrollLeft,
        maxScroll,
        positions: slides.map((slide) => slide.offsetLeft - firstOffset),
        direction,
      })
      carousel.scrollTo({
        left,
        behavior: reducedMotion ? "instant" : "smooth",
      })
    },
    [reducedMotion]
  )

  const pauseAfterInteraction = useCallback(() => {
    clearTimeout(resumeTimer.current)
    setInteracting(true)
    resumeTimer.current = setTimeout(
      () => setInteracting(false),
      INTERACTION_PAUSE
    )
  }, [])

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncPreference = () => {
      setReducedMotion(preference.matches)
      if (preference.matches) setAutoScroll(false)
      else if (!autoplayChoice.current) setAutoScroll(true)
    }
    syncPreference()
    preference.addEventListener("change", syncPreference)
    return () => preference.removeEventListener("change", syncPreference)
  }, [])

  useEffect(() => {
    const carousel = rail.current
    if (!carousel) return
    const measure = () =>
      setCanScroll(carousel.scrollWidth - carousel.clientWidth > 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(carousel)
    return () => observer.disconnect()
  }, [items.length])

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener("visibilitychange", handleVisibility)
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  useEffect(() => {
    if (
      !autoScroll ||
      !canScroll ||
      hovered ||
      focused ||
      interacting ||
      !pageVisible
    )
      return
    const timer = setInterval(() => move(1), AUTO_SCROLL_INTERVAL)
    return () => clearInterval(timer)
  }, [autoScroll, canScroll, focused, hovered, interacting, move, pageVisible])

  useEffect(
    () => () => {
      clearTimeout(resumeTimer.current)
    },
    []
  )

  if (!items.length) return null
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
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setFocused(false)
          }}
          onPointerDown={() => {
            clearTimeout(resumeTimer.current)
            setInteracting(true)
          }}
          onPointerUp={pauseAfterInteraction}
          onPointerCancel={pauseAfterInteraction}
          onWheel={pauseAfterInteraction}
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
        {items.length > 1 && canScroll && (
          <div className="button-row sponsor-controls mt-5 justify-end">
            <button
              onClick={() => {
                pauseAfterInteraction()
                move(-1)
              }}
              className="icon-button"
              title="Previous sponsors"
              aria-label="Previous sponsors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => {
                autoplayChoice.current = true
                setInteracting(false)
                setAutoScroll((current) => !current)
              }}
              className="icon-button"
              title={
                autoScroll
                  ? "Pause automatic sponsor scrolling"
                  : "Start automatic sponsor scrolling"
              }
              aria-label={
                autoScroll
                  ? "Pause automatic sponsor scrolling"
                  : "Start automatic sponsor scrolling"
              }
              aria-pressed={autoScroll}
            >
              {autoScroll ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={() => {
                pauseAfterInteraction()
                move(1)
              }}
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
