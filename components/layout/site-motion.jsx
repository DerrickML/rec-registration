"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const REVEAL_SELECTOR = [
  "[data-site-motion]",
  ".home-hero-content > *",
  ".masthead-content > *",
  ".event-band-inner > *",
  ".section-heading > *",
  ".editorial-grid > *",
  ".feature-list > article",
  ".agenda-day",
  ".photo-strip > *",
  ".sponsor-slide",
  ".media-grid > *",
  ".program-stats > *",
  ".archive-toolbar > *",
  ".directory-toolbar > *",
  ".contact-band .site-container > *",
  ".footer-grid > *",
  ".footer-bottom > *",
  ".empty-state > *",
  ".page-loading > *",
  ".page-error > *",
].join(",")

export default function SiteMotion() {
  const pathname = usePathname()

  useEffect(() => {
    const root = document.documentElement
    const seen = new WeakSet()
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let revealObserver

    const reveal = (element) => element?.classList.add("is-visible")

    const register = (scope) => {
      const elements = []
      if (scope instanceof Element && scope.matches(REVEAL_SELECTOR)) {
        elements.push(scope)
      }
      scope.querySelectorAll?.(REVEAL_SELECTOR).forEach((element) => {
        elements.push(element)
      })

      elements.forEach((element, index) => {
        if (seen.has(element)) return
        seen.add(element)
        element.classList.add("site-reveal")
        element.style.setProperty(
          "--site-reveal-delay",
          `${Math.min(index % 4, 3) * 70}ms`
        )

        if (reducedMotion.matches || !revealObserver) reveal(element)
        else revealObserver.observe(element)
      })
    }

    if ("IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            reveal(entry.target)
            revealObserver.unobserve(entry.target)
          })
        },
        { rootMargin: "0px 0px -36px", threshold: 0.08 }
      )
    }

    root.classList.add("motion-ready")
    register(document)

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) register(node)
        })
      })
    })
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    const showFocusedItem = (event) => {
      reveal(event.target.closest?.(".site-reveal"))
    }
    document.addEventListener("focusin", showFocusedItem)

    const handleMotionPreference = () => {
      if (!reducedMotion.matches) return
      document.querySelectorAll(".site-reveal").forEach(reveal)
    }
    reducedMotion.addEventListener("change", handleMotionPreference)

    return () => {
      mutationObserver.disconnect()
      revealObserver?.disconnect()
      document.removeEventListener("focusin", showFocusedItem)
      reducedMotion.removeEventListener("change", handleMotionPreference)
      root.classList.remove("motion-ready")
    }
  }, [])

  useEffect(() => {
    const main = document.querySelector("main")
    if (!main) return
    main.classList.remove("site-page-enter")
    const frame = requestAnimationFrame(() =>
      main.classList.add("site-page-enter")
    )
    const timer = setTimeout(
      () => main.classList.remove("site-page-enter"),
      560
    )
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [pathname])

  return null
}
