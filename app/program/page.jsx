"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Building,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { apiService } from "../../lib/api-service"

export default function ProgramPage() {
  const [conference, setConference] = useState(null)
  const [program, setProgram] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedHall, setSelectedHall] = useState("all")
  const [expandedTimeSlots, setExpandedTimeSlots] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active conference
        const activeConference = await apiService.getActiveConference()
        if (!activeConference) {
          setError("No active conference found")
          setLoading(false)
          return
        }
        setConference(activeConference)

        // Fetch program and sessions
        const programData = await apiService.getConferenceProgramWithSessions(activeConference.$id)
        if (!programData) {
          setError("No published program available for this conference")
          setLoading(false)
          return
        }

        setProgram(programData.program)
        setSessions(programData.sessions)

        // Set default day to 1
        if (programData.program.daysCount > 0) {
          setSelectedDay(1)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatTime = (isoDateTime) => {
    if (!isoDateTime) return ""
    // Parse the UTC time from database
    const date = new Date(isoDateTime)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatTimeWithTimezone = (isoDateTime) => {
    if (!isoDateTime) return { kampala: "", local: "", timezone: "" }

    // Parse the UTC datetime string from Appwrite
    // Format: 2025-10-20T10:00:00.000+00:00
    const utcDate = new Date(isoDateTime)

    // Convert UTC to Africa/Kampala timezone (UTC+3)
    const kampalaTime = utcDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Africa/Kampala",
    })

    // Convert UTC to user's local timezone
    const localTime = utcDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    // Get user's timezone abbreviation
    const localTimezone = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "short",
    })
      .formatToParts(utcDate)
      .find((part) => part.type === "timeZoneName")?.value || ""

    return {
      kampala: kampalaTime,
      local: localTime,
      timezone: localTimezone,
    }
  }

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
    }

    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${start.getFullYear()}`
  }

  const getDayDate = (dayNumber) => {
    if (!conference?.startDate) return ""
    const startDate = new Date(conference.startDate)
    const dayDate = new Date(startDate)
    dayDate.setDate(startDate.getDate() + (dayNumber - 1))
    return dayDate.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getSessionsByDay = (day) => {
    return sessions.filter((session) => session.day === day)
  }

  const getFilteredSessions = (daySessions) => {
    if (selectedHall === "all") return daySessions
    return daySessions.filter((session) => session.venueHall === selectedHall)
  }

  const toggleTimeSlot = (timeKey) => {
    setExpandedTimeSlots((prev) => ({
      ...prev,
      [timeKey]: !prev[timeKey],
    }))
  }

  const isTimeSlotExpanded = (timeKey) => {
    // Default to expanded (true) if not set
    return expandedTimeSlots[timeKey] !== false
  }

  const groupSessionsByTimeSlot = (daySessions) => {
    const grouped = {}
    daySessions.forEach((session) => {
      // Create a time-only key for grouping (ignoring date part)
      const startTime = new Date(session.startTime)
      const endTime = new Date(session.toTime)

      // Create unique key based on time only
      const timeKey = `${startTime.toISOString()}-${endTime.toISOString()}`

      if (!grouped[timeKey]) {
        grouped[timeKey] = {
          startTime: session.startTime,
          toTime: session.toTime,
          sessions: []
        }
      }
      grouped[timeKey].sessions.push(session)
    })
    return grouped
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#0B7186] mx-auto mb-4" />
          <p className="text-gray-600">Loading conference program...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Link href="/">
              <Button className="bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white">
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const daySessions = selectedDay ? getSessionsByDay(selectedDay) : []
  const filteredSessions = getFilteredSessions(daySessions)
  const groupedSessions = groupSessionsByTimeSlot(filteredSessions)
  const halls = program?.venueHalls || []

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
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#0B7186] hover:text-[#054653] hover:bg-[#0B7186]/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div className="w-10 h-10 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Conference Program</h1>
                  <p className="text-sm text-gray-600">{conference?.title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white">
                    Register Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-gradient-to-r from-[#0B7186] to-[#FFB803] text-white">
                {program?.status}
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#0B7186] via-[#054653] to-[#0B7186] bg-clip-text text-transparent mb-4">
                {program?.title}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-6 text-gray-700">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-[#0B7186]" />
                  <span className="font-medium">{formatDateRange(conference?.startDate, conference?.endDate)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-[#0B7186]" />
                  <span className="font-medium">{conference?.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="w-5 h-5 text-[#0B7186]" />
                  <span className="font-medium">{conference?.venue}</span>
                </div>
              </div>
            </div>

            {/* Program Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-3xl font-bold text-[#0B7186]">{program?.daysCount}</p>
                    <p className="text-gray-600">Days</p>
                  </div>
                  <Calendar className="w-10 h-10 text-[#FFB803]" />
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-3xl font-bold text-[#0B7186]">{sessions.length}</p>
                    <p className="text-gray-600">Sessions</p>
                  </div>
                  <Users className="w-10 h-10 text-[#FFB803]" />
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-3xl font-bold text-[#0B7186]">{halls.length}</p>
                    <p className="text-gray-600">Halls/Rooms</p>
                  </div>
                  <Building className="w-10 h-10 text-[#FFB803]" />
                </CardContent>
              </Card>
            </div>

            {/* Sessions Schedule Card */}
            <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl overflow-hidden">
              {/* Header with Title and Filter */}
              <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-3xl font-bold text-gray-900 mb-1">Sessions Schedule</CardTitle>
                    <p className="text-sm text-gray-600">Browse sessions by day and venue</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {halls.length > 0 && (
                      <>
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                          value={selectedHall}
                          onChange={(e) => setSelectedHall(e.target.value)}
                          className="px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white text-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0B7186] focus:border-[#0B7186] transition-all hover:border-gray-300"
                        >
                          <option value="all">All Halls</option>
                          {halls.map((hall) => (
                            <option key={hall} value={hall}>
                              {hall}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Tabs
                  value={String(selectedDay)}
                  onValueChange={(value) => setSelectedDay(parseInt(value))}
                  className="w-full"
                >
                  {/* Day Tabs Section */}
                  <div className="px-6 py-6 bg-gradient-to-br from-gray-50 via-gray-50 to-white border-b border-gray-100">
                    <div
                      className="grid gap-3 w-full"
                      style={{ gridTemplateColumns: `repeat(${program?.daysCount || 1}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: program?.daysCount || 0 }, (_, i) => i + 1).map((day) => {
                        const daySessionCount = getSessionsByDay(day).length
                        const dayDate = getDayDate(day)
                        const isActive = selectedDay === day
                        return (
                          <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`
                              relative group rounded-2xl border-2 transition-all duration-300 overflow-hidden
                              ${
                                isActive
                                  ? "border-[#0B7186] bg-gradient-to-br from-[#0B7186] to-[#FFB803] shadow-lg scale-[1.02]"
                                  : "border-gray-200 bg-white hover:border-[#0B7186]/30 hover:shadow-md hover:scale-[1.01]"
                              }
                            `}
                          >
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-5">
                              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="relative px-4 py-6 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                              <Calendar
                                className={`w-8 h-8 mb-1 transition-transform duration-300 ${isActive ? "text-white scale-110" : "text-[#0B7186] group-hover:scale-110"}`}
                              />
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`text-lg font-bold tracking-tight ${isActive ? "text-white" : "text-gray-900"}`}
                                >
                                  Day {day}
                                </span>
                                {dayDate && (
                                  <span
                                    className={`text-xs font-semibold ${isActive ? "text-white/90" : "text-gray-600"}`}
                                  >
                                    {dayDate}
                                  </span>
                                )}
                              </div>
                              <div
                                className={`
                                  mt-1 px-3 py-1 rounded-full text-xs font-medium
                                  ${
                                    isActive
                                      ? "bg-white/20 text-white backdrop-blur-sm"
                                      : "bg-gray-100 text-gray-700 group-hover:bg-[#0B7186]/10 group-hover:text-[#0B7186]"
                                  }
                                `}
                              >
                                {daySessionCount} {daySessionCount === 1 ? "session" : "sessions"}
                              </div>
                            </div>

                            {/* Active Indicator */}
                            {isActive && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tab Content with Sessions */}
                  <div className="px-6 pt-8 pb-6">
                    {Array.from({ length: program?.daysCount || 0 }, (_, i) => i + 1).map((day) => (
                      <TabsContent key={day} value={String(day)} className="mt-0">
                        {filteredSessions.length === 0 ? (
                          <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">
                              No sessions available for this day{selectedHall !== "all" ? " and hall" : ""}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {Object.entries(groupedSessions).map(([timeKey, timeSlotData]) => {
                              const startTimes = formatTimeWithTimezone(timeSlotData.startTime)
                              const endTimes = formatTimeWithTimezone(timeSlotData.toTime)
                              const showBothTimezones = startTimes.kampala !== startTimes.local
                              const sessionsInSlot = timeSlotData.sessions
                              const isExpanded = isTimeSlotExpanded(timeKey)

                              return (
                                <div key={timeKey} className="space-y-4">
                                  {/* Time Header - Clickable Accordion */}
                                  <button
                                    onClick={() => toggleTimeSlot(timeKey)}
                                    className="w-full sticky top-[72px] z-10 bg-gradient-to-r from-[#0B7186] to-[#FFB803] text-white px-5 py-4 rounded-xl shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300 group"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                      <div className="flex items-center space-x-3 flex-1">
                                        <div className="bg-white/20 p-2 rounded-lg flex-shrink-0 group-hover:bg-white/30 transition-colors">
                                          <Clock className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col gap-0.5 text-left flex-1">
                                          <span className="font-bold text-lg tracking-tight">
                                            {startTimes.kampala} - {endTimes.kampala}
                                          </span>
                                          <span className="text-xs text-white/85 font-medium">
                                            East Africa Time (EAT / UTC+3)
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {showBothTimezones && (
                                            <div className="hidden sm:block bg-white/15 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                                              <div className="flex flex-col gap-0.5">
                                                <div className="text-sm text-white font-semibold">
                                                  {startTimes.local} - {endTimes.local}
                                                </div>
                                                <div className="text-xs text-white/80 font-medium">
                                                  Your time ({startTimes.timezone})
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          <div className="bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                            <span className="text-xs font-semibold">
                                              {sessionsInSlot.length} {sessionsInSlot.length === 1 ? "session" : "sessions"}
                                            </span>
                                          </div>
                                          <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                                            {isExpanded ? (
                                              <ChevronUp className="w-5 h-5" />
                                            ) : (
                                              <ChevronDown className="w-5 h-5" />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {showBothTimezones && (
                                      <div className="sm:hidden mt-3 bg-white/15 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                                        <div className="flex flex-col gap-0.5">
                                          <div className="text-sm text-white font-semibold">
                                            {startTimes.local} - {endTimes.local}
                                          </div>
                                          <div className="text-xs text-white/80 font-medium">
                                            Your time ({startTimes.timezone})
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </button>

                                  {/* Sessions Grid - Collapsible */}
                                  {isExpanded && (
                                    <div
                                      className={`grid gap-5 animate-in slide-in-from-top-2 duration-300 ${sessionsInSlot.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}
                                    >
                                      {sessionsInSlot.map((session) => (
                                        <SessionCard key={session.$id} session={session} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-8 px-4 sm:px-6 lg:px-8 mt-12">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-gray-300">
              © {new Date().getFullYear()} National Renewable Energy Platform (NREP). All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function SessionCard({ session }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="bg-white border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 hover:border-[#0B7186]/30 group">
      <CardContent className="p-6">
        {/* Session Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="bg-[#0B7186]/10 text-[#0B7186] border border-[#0B7186]/20 font-medium px-3 py-1">
                <MapPin className="w-3 h-3 mr-1 inline" />
                {session.venueHall}
              </Badge>
              {session.theme && (
                <Badge
                  variant="outline"
                  className="border-[#FFB803] text-[#FFB803] bg-[#FFB803]/5 font-medium px-3 py-1"
                >
                  {session.theme}
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight group-hover:text-[#0B7186] transition-colors">
              {session.title}
            </h3>
          </div>
        </div>

        {/* Organizer */}
        {session.organizer && (
          <div className="mb-4 flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
            <Building className="w-4 h-4 mr-2 text-[#0B7186] flex-shrink-0" />
            <span className="font-medium">{session.organizer}</span>
          </div>
        )}

        {/* Preamble */}
        {session.preamble && (
          <div className="mb-4">
            <div
              className={`rich-text-content text-sm text-gray-700 leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}
              dangerouslySetInnerHTML={{ __html: session.preamble }}
            />
            {session.preamble.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[#0B7186] text-sm font-semibold hover:text-[#054653] mt-3 flex items-center gap-1 transition-colors"
              >
                {expanded ? (
                  <>
                    <span>Show less</span>
                    <span className="text-xs">↑</span>
                  </>
                ) : (
                  <>
                    <span>Read more</span>
                    <span className="text-xs">→</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Speakers */}
        {session.speakers && (
          <div className="mt-5 pt-5 border-t border-gray-200">
            <div className="flex items-start gap-3">
              <div className="bg-[#FFB803]/10 p-2 rounded-lg flex-shrink-0">
                <Users className="w-4 h-4 text-[#FFB803]" />
              </div>
              <div className="rich-text-content text-sm text-gray-700 flex-1" dangerouslySetInnerHTML={{ __html: session.speakers }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
