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
      // Fallback for simple string format
      return daysString.split(",").map((day) => ({ label: day.trim() }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#0B7186] mx-auto mb-4" />
          <p className="text-gray-600">Loading conference information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!conference) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No active conference found.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const days = parseDays(conference.days)

  const bodySection = () => {
    return <>       
        {/* Conference Details */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Conference Details</h2>
              <p className="text-xl text-gray-600">Everything you need to know about the event</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Event Schedule */}
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-6 h-6 text-[#0B7186]" />
                    <CardTitle className="text-gray-800">Event Schedule</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium text-gray-800">Start Date</p>
                    <p className="text-gray-600">{formatDate(conference.startDate)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">End Date</p>
                    <p className="text-gray-600">{formatDate(conference.endDate)}</p>
                  </div>
                  {days.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-800 mb-3">Event Days</p>
                      <div className="space-y-3">
                        {days.map((day, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="secondary" className="bg-[#0B7186]/10 text-[#0B7186] border-[#0B7186]/20">
                                {day.label || day}
                              </Badge>
                              {day.date && (
                                <span className="text-xs text-gray-500">
                                  {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                                </span>
                              )}
                            </div>
                            {day.theme && <p className="text-sm text-gray-600 font-medium">{day.theme}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location & Venue */}
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-6 h-6 text-[#0B7186]" />
                    <CardTitle className="text-gray-800">Location & Venue</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium text-gray-800">Location</p>
                    <p className="text-gray-600">{conference.location}</p>
                  </div>
                  {conference.venue && (
                    <div>
                      <p className="font-medium text-gray-800">Venue</p>
                      <p className="text-gray-600">{conference.venue}</p>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-[#0B7186]">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">View on Maps</span>
                  </div>
                </CardContent>
              </Card>

              {/* Registration Info */}
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Users className="w-6 h-6 text-[#0B7186]" />
                    <CardTitle className="text-gray-800">Registration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    {conference.registrationOpen ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-600 font-medium">Registration Open</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-500 font-medium">Registration Closed</span>
                      </>
                    )}
                  </div>

                  {conference.maxAttendees && (
                    <div>
                      <p className="font-medium text-gray-800">Max Attendees</p>
                      <p className="text-gray-600">{conference.maxAttendees.toLocaleString()}</p>
                    </div>
                  )}

                  {conference.registrationFee && (
                    <div>
                      <p className="font-medium text-gray-800">Registration Fee</p>
                      <p className="text-gray-600">{conference.registrationFee}</p>
                    </div>
                  )}

                  {conference.registrationOpen && (
                    <Link href="/register">
                      <Button className="w-full bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white">
                        Register Now
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Conference Agenda */}
        {days.length > 0 && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Conference Agenda</h2>
                <p className="text-xl text-gray-600">Explore our comprehensive 3-day program</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {days.map((day, index) => (
                  <Card
                    key={index}
                    className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-gradient-to-r from-[#0B7186] to-[#FFB803] text-white">
                          Day {index + 1}
                        </Badge>
                        {day.date && (
                          <span className="text-sm text-gray-500">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-xl text-gray-800">{day.label || `Day ${index + 1}`}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {day.theme && (
                        <div className="p-4 bg-gradient-to-r from-[#0B7186]/5 to-[#FFB803]/5 rounded-lg border border-gray-100">
                          <h4 className="font-semibold text-gray-800 mb-2">Theme</h4>
                          <p className="text-gray-600">{day.theme}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Why Attend */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Why Attend REC25 & EXPO?</h2>
              <p className="text-xl text-gray-600">Join the renewable energy revolution</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Innovation</h3>
                <p className="text-gray-600">Discover cutting-edge renewable energy technologies and solutions</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Networking</h3>
                <p className="text-gray-600">Connect with industry leaders, investors, and fellow professionals</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sun className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Sustainability</h3>
                <p className="text-gray-600">Learn about sustainable practices and environmental impact</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wind className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Future</h3>
                <p className="text-gray-600">Shape the future of renewable energy in Africa and beyond</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {conference.registrationOpen && (
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#0B7186] to-[#FFB803]">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Join the Renewable Energy Revolution?
              </h2>
              <p className="text-xl text-white/90 mb-8">
                Don't miss this opportunity to be part of the most important renewable energy event of the year.
              </p>
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-[#0B7186] hover:bg-gray-100 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Register Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </section>
        )}
    </>
  }
   
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FFB803] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0B7186] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#054653] rounded-full mix-blend-multiply filter blur-xl opacity-3 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">NREP</h1>
                  <p className="text-sm text-gray-600">National Renewable Energy Platform</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/program">
                  <Button
                    variant="ghost"
                    className="text-[#0B7186] hover:text-[#054653] hover:bg-[#0B7186]/10 font-medium"
                  >
                    Program
                  </Button>
                </Link>
                <a
                  href="https://nrep.ug/rec"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0B7186] hover:text-[#054653] font-medium flex items-center space-x-1"
                >
                  <span>Main Website</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                {conference.registrationOpen && (
                  <Link href="/register">
                    <Button className="bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white">
                      Register Now
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full mb-8 shadow-lg">
              <Leaf className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold bg-gradient-to-r from-[#0B7186] via-[#054653] to-[#0B7186] bg-clip-text text-transparent mb-6">
              {conference.title}
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto">
              {conference.description ||
                "Join the future of sustainable energy. The most anticipated renewable energy event bringing together industry leaders, innovators, and changemakers."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
              <div className="flex items-center space-x-2 text-gray-700">
                <Calendar className="w-5 h-5 text-[#0B7186]" />
                <span className="font-medium">{formatDateRange(conference.startDate, conference.endDate)}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-700">
                <MapPin className="w-5 h-5 text-[#0B7186]" />
                <span className="font-medium">{conference.location}</span>
              </div>
              {conference.venue && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <Building className="w-5 h-5 text-[#0B7186]" />
                  <span className="font-medium">{conference.venue}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {conference.registrationOpen ? (
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    Register Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Badge variant="secondary" className="px-4 py-2 text-lg">
                  <Clock className="w-4 h-4 mr-2" />
                  Registration Closed
                </Badge>
              )}

              <a href="https://nrep.ug/rec" target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#0B7186] text-[#0B7186] hover:bg-[#0B7186] hover:text-white px-8 py-4 text-lg font-semibold bg-transparent"
                >
                  Learn More
                  <ExternalLink className="ml-2 w-5 h-5" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Body Section */}
        {/* {bodySection()} */}

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">NREP</h3>
                </div>
                <p className="text-gray-300">
                  National Renewable Energy Platform - Leading Uganda's transition to sustainable energy.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/program" className="text-gray-300 hover:text-white">
                      Conference Program
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://nrep.ug/rec"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-white flex items-center space-x-1"
                    >
                      <span>Main Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  {conference.registrationOpen && (
                    <li>
                      <Link href="/register" className="text-gray-300 hover:text-white">
                        Register
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-4">Contact</h4>
                <p className="text-gray-300">
                  For more information about {conference.title}, visit our main website or contact us directly.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-700 mt-8 pt-8 text-center">
              <p className="text-gray-300">
                © {new Date().getFullYear()} National Renewable Energy Platform (NREP). All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
