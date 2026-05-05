"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarX, Filter } from "lucide-react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  formatTimeWithTimezone,
  getDayDate,
  getFilteredSessions,
  getSessionsByDay,
  groupSessionsByTimeSlot,
} from "@/lib/program-utils"
import DayTab from "@/components/program/day-tab"
import TimeSlotAccordion from "@/components/program/time-slot-accordion"

export default function ProgramSchedule({ conference, program, sessions, compact = false }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedHall, setSelectedHall] = useState("all")
  const [expandedTimeSlots, setExpandedTimeSlots] = useState({})

  const days = useMemo(
    () => Array.from({ length: program?.daysCount || 0 }, (_, index) => index + 1),
    [program?.daysCount]
  )
  const halls = program?.venueHalls || []

  useEffect(() => {
    if (!selectedDay && days.length > 0) {
      setSelectedDay(days[0])
    }
  }, [days, selectedDay])

  const daySessions = selectedDay ? getSessionsByDay(sessions, selectedDay) : []
  const filteredSessions = getFilteredSessions(daySessions, selectedHall)
  const groupedSessions = groupSessionsByTimeSlot(filteredSessions)

  const toggleTimeSlot = (timeKey) => {
    setExpandedTimeSlots((previous) => ({
      ...previous,
      [timeKey]: previous[timeKey] === false,
    }))
  }

  const isTimeSlotExpanded = (timeKey) => expandedTimeSlots[timeKey] !== false

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-white px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              Sessions Schedule
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Browse {sessions.length} published {sessions.length === 1 ? "session" : "sessions"} by day and venue.
            </p>
          </div>

          {halls.length > 0 && (
            <label className="flex w-full items-center gap-2 sm:w-auto">
              <Filter className="h-4 w-4 flex-shrink-0 text-gray-500" />
              <span className="sr-only">Filter sessions by hall</span>
              <select
                value={selectedHall}
                onChange={(event) => setSelectedHall(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 outline-none transition-all hover:border-gray-400 focus:border-[#0B7186] focus:ring-2 focus:ring-[#0B7186]/[0.15] sm:w-56"
              >
                <option value="all">All Halls</option>
                {halls.map((hall) => (
                  <option key={hall} value={hall}>
                    {hall}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <Tabs value={selectedDay ? String(selectedDay) : "none"} className="w-full">
        <div className="border-b border-gray-200 bg-slate-50 px-4 py-4 sm:px-6">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: compact
                ? "repeat(auto-fit, minmax(120px, 1fr))"
                : "repeat(auto-fit, minmax(150px, 1fr))",
            }}
          >
            {days.map((day) => (
              <DayTab
                key={day}
                day={day}
                dayDate={getDayDate(conference?.startDate, day)}
                sessionCount={getSessionsByDay(sessions, day).length}
                isActive={selectedDay === day}
                onClick={() => setSelectedDay(day)}
              />
            ))}
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <TabsContent value={selectedDay ? String(selectedDay) : "none"} className="mt-0">
            {filteredSessions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-slate-50 px-6 py-12 text-center">
                <CalendarX className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                <h3 className="text-base font-semibold text-gray-950">No sessions match this view</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Try another day{selectedHall !== "all" ? " or choose all halls" : ""}.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
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
        </div>
      </Tabs>
    </section>
  )
}
