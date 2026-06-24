"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  ArrowRight,
  ExternalLink,
  Menu,
  X,
} from "lucide-react"

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/program", label: "Program" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/media", label: "Media" },
  { href: "/venue", label: "Venue" },
]

export default function Navbar({ conference }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!conference) return null

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo + Brand */}
            <Link href="/" className="flex min-w-0 flex-shrink-0 items-center space-x-3">
              {conference.logoUrl ? (
                <img
                  src={conference.logoUrl}
                  alt={conference.shortName || "Logo"}
                  className="h-10 w-10 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B7186] shadow-md shadow-[#0B7186]/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="hidden min-w-0 sm:block">
                <h1 className="truncate text-base font-bold leading-tight text-gray-950">
                  {conference.shortName || "NREP"}
                </h1>
                <p className="max-w-[260px] truncate text-xs font-medium text-gray-500 lg:max-w-[360px]">
                  {conference.fullName || "Renewable Energy Platform"}
                </p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Primary navigation">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-[#0B7186]/[0.08] text-[#0B7186]"
                        : "text-gray-600 hover:bg-[#0B7186]/[0.06] hover:text-[#0B7186]"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
              {conference.mainWebsiteUrl && (
                <a
                  href={conference.mainWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    className="h-9 rounded-lg text-sm font-semibold text-gray-600 hover:bg-[#0B7186]/[0.06] hover:text-[#0B7186]"
                  >
                    NREP
                    <ExternalLink className="ml-1.5 w-3.5 h-3.5" />
                  </Button>
                </a>
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-2">
              {conference.registrationOpen && (
                <Link href="/register">
                  <Button className="h-9 rounded-lg bg-[#0B7186] px-4 text-sm font-semibold text-white shadow-sm shadow-[#0B7186]/20 transition-all hover:bg-[#054653] hover:shadow-md hover:shadow-[#0B7186]/25">
                    Register
                    <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileOpen && (
          <div className="border-t border-gray-100 bg-white md:hidden">
            <nav className="space-y-1 px-4 py-3" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#0B7186]/[0.08] text-[#0B7186]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-[#0B7186]"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
              {conference.mainWebsiteUrl && (
                <a
                  href={conference.mainWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-[#0B7186] hover:bg-gray-50 transition-colors"
                >
                  NREP Website
                  <ExternalLink className="ml-1.5 w-3.5 h-3.5" />
                </a>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
