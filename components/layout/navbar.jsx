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
  { href: "/venue", label: "Venue" },
]

export default function Navbar({ conference }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!conference) return null

  return (
    <>
      <header className="glass-card !bg-white/80 border-b border-gray-200/60 sticky top-0 z-50 !rounded-none !shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo + Brand */}
            <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
              {conference.logoUrl ? (
                <img
                  src={conference.logoUrl}
                  alt={conference.shortName || "Logo"}
                  className="w-10 h-10 rounded-xl object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-[#0B7186] to-[#054653] rounded-xl flex items-center justify-center shadow-md shadow-[#0B7186]/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  {conference.shortName || "NREP"}
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  {conference.fullName || "Renewable Energy Platform"}
                </p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href)
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant="ghost"
                      className={`text-sm font-medium transition-colors ${
                        isActive
                          ? "text-[#0B7186] bg-[#0B7186]/5"
                          : "text-gray-600 hover:text-[#0B7186] hover:bg-[#0B7186]/5"
                      }`}
                    >
                      {link.label}
                    </Button>
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
                    className="text-gray-600 hover:text-[#0B7186] hover:bg-[#0B7186]/5 font-medium text-sm"
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
                  <Button className="bg-[#0B7186] hover:bg-[#054653] text-white text-sm px-4 h-9 shadow-md shadow-[#0B7186]/20 transition-all hover:shadow-lg hover:shadow-[#0B7186]/25">
                    Register
                    <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-lg animate-in slide-in-from-top-2 duration-200">
            <nav className="px-4 py-3 space-y-1">
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
                        ? "text-[#0B7186] bg-[#0B7186]/5"
                        : "text-gray-600 hover:text-[#0B7186] hover:bg-gray-50"
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
