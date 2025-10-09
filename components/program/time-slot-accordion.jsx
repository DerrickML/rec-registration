"use client"

import { Clock, ChevronDown, ChevronUp } from "lucide-react"
import SessionCard from "./session-card"

export default function TimeSlotAccordion({
  timeKey,
  timeSlotData,
  isExpanded,
  onToggle,
  formatTimeWithTimezone,
}) {
  const startTimes = formatTimeWithTimezone(timeSlotData.startTime)
  const endTimes = formatTimeWithTimezone(timeSlotData.toTime)
  const showBothTimezones = startTimes.kampala !== startTimes.local
  const sessionsInSlot = timeSlotData.sessions

  return (
    <div className="space-y-4">
      {/* Time Header - Clickable Accordion */}
      <button
        onClick={onToggle}
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
              <span className="text-xs text-white/85 font-medium">East Africa Time (EAT / UTC+3)</span>
            </div>
            <div className="flex items-center gap-3">
              {showBothTimezones && (
                <div className="hidden sm:block bg-white/15 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm text-white font-semibold">
                      {startTimes.local} - {endTimes.local}
                    </div>
                    <div className="text-xs text-white/80 font-medium">Your time ({startTimes.timezone})</div>
                  </div>
                </div>
              )}
              <div className="bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <span className="text-xs font-semibold">
                  {sessionsInSlot.length} {sessionsInSlot.length === 1 ? "session" : "sessions"}
                </span>
              </div>
              <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
              <div className="text-xs text-white/80 font-medium">Your time ({startTimes.timezone})</div>
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
}
