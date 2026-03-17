"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar,
  MapPin,
  Users,
  Building,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Clock,
  Globe,
  CheckCircle,
  Loader2,
  AlertCircle,
  Zap,
  Leaf,
  Sun,
  Wind,
} from "lucide-react"
import { apiService } from "../lib/api-service"

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-4">
        <Alert className="max-w-md glass-card">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!conference) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-4">
        <Alert className="max-w-md glass-card">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No active conference found.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const days = parseDays(conference.days)

  const features = [
    {
      icon: Zap,
      title: "Innovation",
      description: "Discover cutting-edge renewable energy technologies and solutions",
      color: "from-amber-400 to-orange-500",
    },
    {
      icon: Users,
      title: "Networking",
      description: "Connect with industry leaders, investors, and fellow professionals",
      color: "from-[#0B7186] to-cyan-500",
    },
    {
      icon: Sun,
      title: "Sustainability",
      description: "Learn about sustainable practices and environmental impact",
      color: "from-emerald-400 to-teal-500",
    },
    {
      icon: Wind,
      title: "Future",
      description: "Shape the future of renewable energy in Africa and beyond",
      color: "from-violet-400 to-purple-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 relative overflow-hidden">
      {/* ─── Background accents ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-[#FFB803]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-gradient-to-br from-[#0B7186]/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-gradient-to-br from-[#054653]/5 to-transparent rounded-full blur-3xl" />
        {/* Geometric dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #0B7186 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* ─── Header ─── */}
        <header className="glass-card !bg-white/80 border-b border-gray-200/60 sticky top-0 z-50 !rounded-none !shadow-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0B7186] to-[#054653] rounded-xl flex items-center justify-center shadow-md shadow-[#0B7186]/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">NREP</h1>
                  <p className="text-xs text-gray-500 font-medium">Renewable Energy Platform</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link href="/program">
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-[#0B7186] hover:bg-[#0B7186]/5 font-medium text-sm"
                  >
                    Program
                  </Button>
                </Link>
                <a
                  href="https://nrep.ug/rec"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-[#0B7186] hover:bg-[#0B7186]/5 font-medium text-sm hidden sm:inline-flex"
                  >
                    Main Website
                    <ExternalLink className="ml-1.5 w-3.5 h-3.5" />
                  </Button>
                </a>
                {conference.registrationOpen && (
                  <Link href="/register">
                    <Button className="bg-[#0B7186] hover:bg-[#054653] text-white text-sm px-4 h-9 shadow-md shadow-[#0B7186]/20 transition-all hover:shadow-lg hover:shadow-[#0B7186]/25">
                      Register
                      <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ─── Hero Section ─── */}
        <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            {/* Floating badge */}
            <div className="animate-fade-in-up">
              <Badge className="mb-8 px-4 py-2 bg-[#0B7186]/8 text-[#0B7186] border border-[#0B7186]/15 text-sm font-medium rounded-full hover:bg-[#0B7186]/12 transition-colors">
                <Leaf className="w-3.5 h-3.5 mr-1.5" />
                {conference.title ? `${conference.title.split(" ").slice(0, 4).join(" ")}` : "Renewable Energy Conference"}
              </Badge>
            </div>

            {/* Main heading */}
            <h1 className="animate-fade-in-up delay-100 text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
              Powering Africa's{" "}
              <span className="gradient-text">Renewable</span>{" "}
              Energy Future
            </h1>

            {/* Subtitle */}
            <p className="animate-fade-in-up delay-200 text-lg sm:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              {conference.description ||
                "Join the most anticipated renewable energy event bringing together industry leaders, innovators, and changemakers."}
            </p>

            {/* Info pills */}
            <div className="animate-fade-in-up delay-300 flex flex-wrap items-center justify-center gap-3 mb-10">
              <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100">
                <Calendar className="w-4 h-4 text-[#0B7186]" />
                <span className="text-sm font-medium text-gray-700">{formatDateRange(conference.startDate, conference.endDate)}</span>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100">
                <MapPin className="w-4 h-4 text-[#0B7186]" />
                <span className="text-sm font-medium text-gray-700">{conference.location}</span>
              </div>
              {conference.venue && (
                <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100">
                  <Building className="w-4 h-4 text-[#0B7186]" />
                  <span className="text-sm font-medium text-gray-700">{conference.venue}</span>
                </div>
              )}
            </div>

            {/* CTA buttons */}
            <div className="animate-fade-in-up delay-400 flex flex-col sm:flex-row items-center justify-center gap-4">
              {conference.registrationOpen ? (
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-[#0B7186] hover:bg-[#054653] text-white px-8 h-12 text-base font-semibold shadow-lg shadow-[#0B7186]/25 hover:shadow-xl hover:shadow-[#0B7186]/30 transition-all duration-300 rounded-xl"
                  >
                    Register Now
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Badge variant="secondary" className="px-5 py-2.5 text-sm bg-gray-100 text-gray-500 border border-gray-200 rounded-xl">
                  <Clock className="w-4 h-4 mr-2" />
                  Registration Closed
                </Badge>
              )}

              <Link href="/program">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 px-8 h-12 text-base font-semibold rounded-xl transition-all"
                >
                  View Program
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Features Section ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Why Attend REC25 & EXPO?
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Join the renewable energy revolution and shape a sustainable future
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="group p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
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
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-[#0B7186]/[0.02] to-transparent">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Conference Agenda</h2>
                <p className="text-lg text-gray-500">Explore our comprehensive {days.length}-day program</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {days.map((day, index) => (
                  <div
                    key={index}
                    className="group relative p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
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

        {/* ─── CTA Section ─── */}
        {conference.registrationOpen && (
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
                    Ready to Join the Revolution?
                  </h2>
                  <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                    Don't miss this opportunity to be part of the most important renewable energy event of the year.
                  </p>
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="bg-white text-[#0B7186] hover:bg-gray-100 px-8 h-12 text-base font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                    >
                      Register Now
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Footer ─── */}
        <footer className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <div className="flex items-center space-x-3 mb-5">
                  <div className="w-9 h-9 bg-gradient-to-br from-[#0B7186] to-[#FFB803] rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold">NREP</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  National Renewable Energy Platform — Leading Uganda's transition to sustainable energy.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-5">Quick Links</h4>
                <ul className="space-y-3">
                  <li>
                    <Link href="/program" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Conference Program
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://nrep.ug/rec"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white text-sm flex items-center space-x-1 transition-colors"
                    >
                      <span>Main Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  {conference.registrationOpen && (
                    <li>
                      <Link href="/register" className="text-gray-400 hover:text-white text-sm transition-colors">
                        Register
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-5">Contact</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  For more information about {conference.title}, visit our main website or contact us directly.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-10 pt-8 text-center">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} National Renewable Energy Platform (NREP). All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
