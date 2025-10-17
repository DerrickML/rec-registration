"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Loader2, AlertCircle, Filter } from "lucide-react"
import { apiService } from "../../../lib/api-service"
import {
  formatTimeWithTimezone,
  getDayDate,
  getSessionsByDay,
  getFilteredSessions,
  groupSessionsByTimeSlot,
} from "../../../lib/program-utils"
import DayTab from "../../../components/program/day-tab"
import TimeSlotAccordion from "../../../components/program/time-slot-accordion"
import DownloadProgramButton from "../../../components/program/download-program-button"
import ShareLinkButton from "../../../components/program/share-link-button"

export default function EmbeddedProgramPage() {
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

  const toggleTimeSlot = (timeKey) => {
    setExpandedTimeSlots((prev) => ({
      ...prev,
      [timeKey]: !prev[timeKey],
    }))
  }

  const isTimeSlotExpanded = (timeKey) => {
    return expandedTimeSlots[timeKey] !== false
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
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
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const daySessions = selectedDay ? getSessionsByDay(sessions, selectedDay) : []
  const filteredSessions = getFilteredSessions(daySessions, selectedHall)
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

      <div className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Action Buttons */}
          {/* <div className="flex justify-center items-center gap-4 mb-6">
            <DownloadProgramButton conference={conference} program={program} sessions={sessions} />
            <ShareLinkButton conference={conference} />
          </div> */}

          {/* Sessions Schedule Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl overflow-hidden">
            {/* Header with Filter */}
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
              <Tabs value={String(selectedDay)} className="w-full">
                {/* Day Tabs Section */}
                <div className="px-6 py-6 bg-gradient-to-br from-gray-50 via-gray-50 to-white border-b border-gray-100">
                  <div
                    className="grid gap-3 w-full"
                    style={{ gridTemplateColumns: `repeat(${program?.daysCount || 1}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: program?.daysCount || 0 }, (_, i) => i + 1).map((day) => {
                      const daySessionCount = getSessionsByDay(sessions, day).length
                      const dayDate = getDayDate(conference?.startDate, day)
                      const isActive = selectedDay === day

                      return (
                        <DayTab
                          key={day}
                          day={day}
                          dayDate={dayDate}
                          sessionCount={daySessionCount}
                          isActive={isActive}
                          onClick={() => setSelectedDay(day)}
                        />
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
                          {Object.entries(groupedSessions).map(([timeKey, timeSlotData]) => (
                            <TimeSlotAccordion
                              key={timeKey}
                              timeKey={timeKey}
                              timeSlotData={timeSlotData}
                              isExpanded={isTimeSlotExpanded(timeKey)}
                              onToggle={() => toggleTimeSlot(timeKey)}
                              formatTimeWithTimezone={formatTimeWithTimezone}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
