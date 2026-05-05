"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar,
  MapPin,
  Building,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  Leaf,
  Users,
  Globe,
  Target,
  Lightbulb,
} from "lucide-react"
import * as LucideIcons from "lucide-react"
import { apiService } from "../lib/api-service"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"

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
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {blocks.map((block, i) => (
        <div key={block.label} className="flex items-center gap-3 sm:gap-4">
          <div className="text-center">
            <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center mb-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {String(block.value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-white/60 uppercase tracking-wider">
              {block.label}
            </span>
          </div>
          {i < blocks.length - 1 && (
            <span className="text-xl font-bold text-white/30 mb-6">:</span>
          )}
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center animate-fade-in-scale">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0B7186] to-[#FFB803] flex items-center justify-center mx-auto mb-6 animate-glow-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <p className="text-gray-500 font-medium">Loading conference information...</p>
        </div>
      </div>
    )
  }

  /* ─── Error / Empty ─── */
  if (error || !conference) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-4">
        <Alert className="max-w-md glass-card">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "No active conference found."}</AlertDescription>
        </Alert>
      </div>
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

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─── */}
      <Navbar conference={conference} />

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background Image */}
        {conference.heroImageUrl ? (
          <div className="absolute inset-0">
            <img
              src={conference.heroImageUrl}
              alt="Conference hero"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/60 to-gray-900/85" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#054653] via-[#0B7186] to-[#054653] animate-gradient-shift">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFB803]/15 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl" />
          </div>
        )}

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center w-full">
          {/* Conference badge */}
          <div className="animate-fade-in-up">
            <Badge className="mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm text-white/90 border border-white/15 text-sm font-medium rounded-full">
              <Leaf className="w-3.5 h-3.5 mr-1.5" />
              {conference.shortName || conference.title?.split(" ").slice(0, 4).join(" ") || "Conference"}
            </Badge>
          </div>

          {/* Main heading */}
          <h1 className="animate-fade-in-up delay-100 text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white mb-5 leading-[1.08]">
            {conference.heroTagline || conference.title || "Renewable Energy Conference"}
          </h1>

          {/* Theme */}
          {conference.theme && (
            <p className="animate-fade-in-up delay-200 text-lg sm:text-xl text-[#FFB803] font-medium mb-3 max-w-3xl mx-auto italic">
              "{conference.theme}"
            </p>
          )}

          {/* Description */}
          <p className="animate-fade-in-up delay-200 text-base sm:text-lg text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            {conference.description ||
              "Join the most anticipated renewable energy event bringing together industry leaders, innovators, and changemakers."}
          </p>

          {/* Info pills */}
          <div className="animate-fade-in-up delay-300 flex flex-wrap items-center justify-center gap-3 mb-10">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <Calendar className="w-4 h-4 text-[#FFB803]" />
              <span className="text-sm font-medium text-white/90">
                {formatDateRange(conference.startDate, conference.endDate)}
              </span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <MapPin className="w-4 h-4 text-[#FFB803]" />
              <span className="text-sm font-medium text-white/90">{conference.location}</span>
            </div>
            {conference.venue && (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                <Building className="w-4 h-4 text-[#FFB803]" />
                <span className="text-sm font-medium text-white/90">{conference.venue}</span>
              </div>
            )}
          </div>

          {/* CTA buttons */}
          <div className="animate-fade-in-up delay-400 flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            {conference.registrationOpen ? (
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-[#FFB803] hover:bg-[#D9A003] text-gray-900 px-8 h-13 text-base font-bold shadow-lg shadow-[#FFB803]/25 hover:shadow-xl transition-all duration-300 rounded-xl"
                >
                  Register Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Badge
                variant="secondary"
                className="px-5 py-2.5 text-sm bg-white/10 backdrop-blur-sm text-white/80 border border-white/15 rounded-xl"
              >
                <Clock className="w-4 h-4 mr-2" />
                {conference.regClosedMessage || "Registration Opening Soon"}
              </Badge>
            )}

            <Link href="/program">
              <Button
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 px-8 h-13 text-base font-semibold rounded-xl transition-all bg-transparent"
              >
                View Program
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Countdown timer */}
          {new Date(conference.startDate) > new Date() && (
            <div className="animate-fade-in-up delay-500">
              <p className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">
                Conference Starts In
              </p>
              <CountdownTimer targetDate={conference.startDate} />
            </div>
          )}
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="py-14 bg-gradient-to-r from-slate-50 to-teal-50/30 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center divide-x divide-gray-200">
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
            <Badge className="mb-6 px-4 py-2 bg-[#0B7186]/8 text-[#0B7186] border border-[#0B7186]/15 text-sm font-medium rounded-full">
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#0B7186]/[0.02] to-transparent">
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
                  className="group p-7 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5"
                >
                  <div
                    className={`w-13 h-13 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
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
                  className="group relative p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 overflow-hidden"
                >
                  {/* Top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B7186] to-[#FFB803]" />

                  <div className="flex items-center justify-between mb-4 pt-2">
                    <Badge className="bg-[#0B7186] text-white text-xs font-semibold px-3 py-1 rounded-full">
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
                    <div className="p-3 bg-gradient-to-r from-[#0B7186]/5 to-[#FFB803]/5 rounded-lg">
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
          <div className="relative rounded-3xl bg-gradient-to-br from-[#0B7186] via-[#054653] to-[#0B7186] p-10 sm:p-14 text-center overflow-hidden">
            {/* Background pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB803]/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {conference.registrationOpen
                  ? "Ready to Join the Revolution?"
                  : "Get Ready for " + (conference.shortName || "the Conference")}
              </h2>
              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                {conference.registrationOpen
                  ? "Don't miss this opportunity to be part of the most important renewable energy event of the year."
                  : "Registration will open soon. Stay tuned for updates on Africa's premier renewable energy gathering."}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {conference.registrationOpen ? (
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="bg-[#FFB803] text-gray-900 hover:bg-[#D9A003] px-8 h-12 text-base font-bold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
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
                        className="bg-white text-[#0B7186] hover:bg-gray-100 px-8 h-12 text-base font-semibold shadow-xl rounded-xl"
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
                    className="border-white/20 text-white hover:bg-white/10 px-8 h-12 text-base font-semibold rounded-xl bg-transparent"
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
