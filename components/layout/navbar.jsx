"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, ArrowUpRight } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useExcursion } from "@/components/excursions/excursion-provider"
import { excursionPath } from "@/lib/excursions"

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/about", label: "About" },
  { href: "/program", label: "Program" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/media", label: "Media", exact: true },
  { href: "/media/reports", label: "Reports" },
  { href: "/venue", label: "Venue" },
]

export default function Navbar({ conference }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const excursion = useExcursion()
  const links = excursion?.content.placements.includes("nav")
    ? [
        ...NAV_LINKS,
        { href: excursionPath(excursion, "nav"), label: "Explore Uganda" },
      ]
    : NAV_LINKS
  const navLinks = links.map((link) => {
    const active = link.exact
      ? pathname === link.href
      : pathname.startsWith(link.href.split("?")[0])
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
      >
        {link.label}
      </Link>
    )
  })

  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="site-container header-inner">
        <Link href="/" className="site-brand" aria-label="REC & EXPO home">
          <Image
            src={conference?.logoUrl || "/NREP.png"}
            alt="NREP"
            width={48}
            height={48}
          />
          <span>
            <strong>REC & EXPO</strong>
            <small>National Renewable Energy Platform</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navLinks}
        </nav>
        <div className="header-actions">
          {conference?.registrationOpen && (
            <Link href="/register" className="site-button button-small">
              Register <ArrowUpRight size={16} />
            </Link>
          )}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="icon-button mobile-menu-toggle"
                aria-label="Open navigation"
              >
                <Menu size={22} />
              </button>
            </SheetTrigger>
            <SheetContent className="mobile-nav-sheet">
              <SheetTitle>REC & EXPO</SheetTitle>
              <SheetDescription>Conference navigation</SheetDescription>
              <nav className="mobile-nav" aria-label="Mobile navigation">
                {navLinks}
              </nav>
              <Link
                href="/scanner"
                className="site-text-link"
                onClick={() => setMobileOpen(false)}
              >
                Scanner access <ArrowUpRight size={16} />
              </Link>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
