"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  MapPin,
  Building,
  ArrowRight,
  Sparkles,
  Clock,
  Globe,
  Target,
} from "lucide-react"
import * as LucideIcons from "lucide-react"
import { apiService } from "../lib/api-service"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import { PageErrorState, PageLoadingState } from "@/components/layout/public-page-state"

/* ───────── Countdown Timer Component ───────── */
function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime()
      const target = new Date(targetDate).getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  const blocks = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Minutes" },
    { value: timeLeft.seconds, label: "Seconds" },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {blocks.map((block) => (
        <div key={block.label} className="text-center">
          <div className="mb-1.5 flex h-14 items-center justify-center rounded-lg border border-white/[0.15] bg-white/10 sm:h-16">
            <span className="text-xl font-bold tabular-nums text-white sm:text-2xl">
              {String(block.value).padStart(2, "0")}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/[0.58]">
            {block.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ───────── Animated Stat Component ───────── */
function AnimatedStat({ value, label, suffix = "" }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 2000
          const steps = 60
          const stepValue = value / steps
          let current = 0
          const timer = setInterval(() => {
            current += stepValue
            if (current >= value) {
              setCount(value)
              clearInterval(timer)
            } else {
              setCount(Math.floor(current))
            }
          }, duration / steps)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} className="text-center px-4 sm:px-8">
      <div className="text-3xl sm:text-4xl font-extrabold text-[#0B7186]">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-sm text-gray-500 font-medium mt-1">{label}</div>
    </div>
  )
}

/* ───────── Main Page Component ───────── */
export default function HomePage() {
  const [conference, setConference] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchConference = async () => {
      try {
        const activeConference = await apiService.getActiveConference()
        setConference(activeConference)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchConference()
  }, [])

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
    }
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${start.getFullYear()}`
  }

  const parseDays = (daysString) => {
    if (!daysString) return []
    try {
      return JSON.parse(daysString)
    } catch {
      return daysString.split(",").map((day) => ({ label: day.trim() }))
    }
  }

  /* ─── Loading ─── */
  if (loading) {
    return <PageLoadingState message="Loading conference information..." />
  }

  /* ─── Error / Empty ─── */
  if (error || !conference) {
    return (
      <PageErrorState
        title="Conference unavailable"
        message={error || "No active conference found."}
      />
    )
  }

  const days = parseDays(conference.days)

  // Parse composite socialsJson field
  const parsedSocialsJson = (() => {
    if (!conference.socialsJson) return { socials: {}, features: [], googleMapsUrl: "" }
    try {
      return JSON.parse(conference.socialsJson)
    } catch {
      return { socials: {}, features: [], googleMapsUrl: "" }
    }
  })()

  // Features with icon mapping
  const defaultFeatures = [
    { icon: "Zap", title: "Innovation", description: "Discover cutting-edge renewable energy technologies and solutions", color: "from-amber-400 to-orange-500" },
    { icon: "Users", title: "Networking", description: "Connect with industry leaders, investors, and fellow professionals", color: "from-[#0B7186] to-cyan-500" },
    { icon: "Sun", title: "Sustainability", description: "Learn about sustainable practices and environmental impact", color: "from-emerald-400 to-teal-500" },
    { icon: "Wind", title: "Future", description: "Shape the future of renewable energy in Africa and beyond", color: "from-violet-400 to-purple-500" },
  ]
  const rawFeatures = parsedSocialsJson.features?.length > 0 ? parsedSocialsJson.features : defaultFeatures
  const features = rawFeatures.map((f) => ({
    ...f,
    icon: LucideIcons[f.icon] || Sparkles,
  }))

  // Stats data
  const maxAttendees = conference.maxAttendees || 500
  const daysCount = days.length || 3
  const heroTitle =
    conference.title || conference.shortName || "Renewable Energy Conference & Expo"
  const heroIntro =
    (conference.heroTagline && conference.heroTagline !== conference.theme
      ? conference.heroTagline
      : "") ||
    conference.description ||
    "Join renewable energy leaders, innovators, and policymakers for practical conversations, partnerships, and sector momentum."

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─── */}
      <Navbar conference={conference} />

      {/* ─── Hero Section ─── */}
      <section className="relative flex min-h-[76vh] items-center overflow-hidden bg-[#054653]">
        {conference.heroImageUrl ? (
          <div className="absolute inset-0">
            <img
              src={conference.heroImageUrl}
              alt="Conference venue and attendees"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/[0.88] via-gray-950/70 to-gray-950/[0.35]" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#053d49_0%,#0B7186_58%,#084e5c_100%)]">
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>
        )}

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:px-8">
          <div className="max-w-4xl">
            <h1 className="animate-fade-in-up text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {heroTitle}
            </h1>

            {conference.theme && (
              <p className="animate-fade-in-up delay-100 mt-5 max-w-3xl text-lg font-semibold leading-7 text-[#FFB803] sm:text-xl">
                {conference.theme}
              </p>
            )}

            <p className="animate-fade-in-up delay-200 mt-5 max-w-2xl text-base leading-7 text-white/[0.72] sm:text-lg">
              {heroIntro}
            </p>

            <div className="animate-fade-in-up delay-300 mt-8 flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 rounded-lg border border-white/[0.15] bg-white/10 px-4 py-2 backdrop-blur-sm">
                <Calendar className="h-4 w-4 text-[#FFB803]" />
                <span className="text-sm font-semibold text-white/90">
                  {formatDateRange(conference.startDate, conference.endDate)}
                </span>
              </div>
              {conference.location && (
                <div className="flex items-center space-x-2 rounded-lg border border-white/[0.15] bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-[#FFB803]" />
                  <span className="text-sm font-semibold text-white/90">{conference.location}</span>
                </div>
              )}
              {conference.venue && (
                <div className="flex items-center space-x-2 rounded-lg border border-white/[0.15] bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <Building className="h-4 w-4 text-[#FFB803]" />
                  <span className="text-sm font-semibold text-white/90">{conference.venue}</span>
                </div>
              )}
            </div>

            <div className="animate-fade-in-up delay-400 mt-9 flex flex-col gap-3 sm:flex-row">
              {conference.registrationOpen ? (
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-12 rounded-lg bg-[#FFB803] px-7 text-base font-bold text-gray-950 shadow-lg shadow-[#FFB803]/20 transition-all hover:bg-[#D9A003]"
                  >
                    Register Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Badge
                  variant="secondary"
                  className="inline-flex h-12 items-center rounded-lg border border-white/[0.15] bg-white/10 px-5 text-sm font-semibold text-white/[0.85]"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {conference.regClosedMessage || "Registration Opening Soon"}
                </Badge>
              )}

              <Link href="/program">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-lg border-white/25 bg-transparent px-7 text-base font-semibold text-white transition-all hover:bg-white/10 hover:text-white"
                >
                  View Program
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {new Date(conference.startDate) > new Date() && (
            <div className="animate-fade-in-up delay-500 rounded-xl border border-white/[0.15] bg-white/10 p-5 backdrop-blur-sm">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/[0.55]">
                Conference Starts In
              </p>
              <CountdownTimer targetDate={conference.startDate} />
            </div>
          )}
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="border-y border-gray-100 bg-slate-50 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-y-8 divide-x-0 md:grid-cols-4 md:divide-x md:divide-gray-200">
            <AnimatedStat value={maxAttendees} suffix="+" label="Expected Attendees" />
            <AnimatedStat value={daysCount} suffix="" label={`Day${daysCount !== 1 ? "s" : ""} of Sessions`} />
            <AnimatedStat value={20} suffix="+" label="Countries" />
            <AnimatedStat value={50} suffix="+" label="Expert Speakers" />
          </div>
        </div>
      </section>

      {/* ─── Conference Theme Section ─── */}
      {conference.theme && (
        <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 px-4 py-2 bg-[#0B7186]/[0.08] text-[#0B7186] border border-[#0B7186]/[0.15] text-sm font-medium rounded-full">
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Conference Theme
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              {conference.theme}
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed max-w-3xl mx-auto mb-8">
              {conference.description ||
                "Join us as we bring together experts, innovators, policymakers, and stakeholders to discuss and advance the clean energy agenda."}
            </p>
            <Link href="/about">
              <Button
                variant="outline"
                className="border-[#0B7186]/20 text-[#0B7186] hover:bg-[#0B7186]/5 rounded-xl px-6"
              >
                Learn More About the Conference
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ─── Why Attend (Features) ─── */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Attend {conference.shortName || conference.title || "the Conference"}?
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Unlock unparalleled opportunities for growth, learning, and collaboration
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#0B7186]/25 hover:shadow-lg"
                >
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.color} shadow-sm transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Conference Agenda ─── */}
      {days.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Conference Agenda
              </h2>
              <p className="text-lg text-gray-500">
                Explore our comprehensive {days.length}-day program
              </p>
            </div>

            <div className={`grid grid-cols-1 ${days.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6`}>
              {days.map((day, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#0B7186]/25 hover:shadow-lg"
                >
                  {/* Top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B7186] to-[#FFB803]" />

                  <div className="flex items-center justify-between mb-4 pt-2">
                    <Badge className="rounded-md bg-[#0B7186] px-3 py-1 text-xs font-semibold text-white">
                      Day {index + 1}
                    </Badge>
                    {day.date && (
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{day.label || `Day ${index + 1}`}</h3>
                  {day.theme && (
                    <div className="rounded-lg border border-[#0B7186]/10 bg-[#0B7186]/5 p-3">
                      <p className="text-sm text-gray-600 leading-relaxed">{day.theme}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/program">
                <Button
                  variant="outline"
                  className="border-[#0B7186]/20 text-[#0B7186] hover:bg-[#0B7186]/5 rounded-xl px-6"
                >
                  View Full Program
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── Organizers Section ─── */}
      <section className="py-14 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-8">
            Organized By
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            <a
              href="https://memd.go.ug/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-md">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-[#0B7186] transition-colors">
                  Ministry of Energy
                </p>
                <p className="text-xs text-gray-500">& Mineral Development</p>
              </div>
            </a>
            <div className="hidden sm:block w-px h-10 bg-gray-200" />
            <a
              href="https://nrep.ug"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0B7186] to-[#054653] flex items-center justify-center shadow-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-[#0B7186] transition-colors">
                  NREP
                </p>
                <p className="text-xs text-gray-500">National Renewable Energy Platform</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-xl bg-[#054653] p-8 text-center sm:p-12">
            {/* Background pattern */}
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {conference.registrationOpen
                  ? "Reserve Your Seat at " + (conference.shortName || "the Conference")
                  : "Get Ready for " + (conference.shortName || "the Conference")}
              </h2>
              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                {conference.registrationOpen
                  ? "Join the conversations, exhibitions, and partnerships shaping renewable energy progress."
                  : "Registration will open soon. Stay tuned for updates on Africa's premier renewable energy gathering."}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {conference.registrationOpen ? (
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="h-12 rounded-lg bg-[#FFB803] px-8 text-base font-bold text-gray-950 shadow-lg shadow-[#FFB803]/20 transition-all duration-300 hover:bg-[#D9A003]"
                    >
                      Register Now
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  conference.contactPhone && (
                    <a href={`tel:${conference.contactPhone}`}>
                      <Button
                      size="lg"
                        className="h-12 rounded-lg bg-white px-8 text-base font-semibold text-[#0B7186] shadow-lg hover:bg-gray-100"
                      >
                        Contact Us for Updates
                      </Button>
                    </a>
                  )
                )}
                <Link href="/about">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-lg border-white/25 bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
                  >
                    Learn More
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <Footer conference={conference} />
    </div>
  )
}
