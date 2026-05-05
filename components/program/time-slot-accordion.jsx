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
  const panelId = `time-slot-${timeKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`

  return (
    <div className="space-y-4">
      {/* Time Header - Clickable Accordion */}
      <button
        onClick={onToggle}
        type="button"
        className="sticky top-[68px] z-10 w-full rounded-lg border border-[#0B7186]/[0.15] bg-[#0B7186] px-4 py-3 text-white shadow-sm transition-all duration-200 hover:bg-[#054653] sm:px-5 sm:py-4"
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-shrink-0 rounded-lg bg-white/[0.15] p-2">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-0.5 text-left flex-1">
              <span className="font-bold text-lg tracking-tight">
                {startTimes.kampala} - {endTimes.kampala}
              </span>
              <span className="text-xs text-white/[0.85] font-medium">East Africa Time (EAT / UTC+3)</span>
            </div>
            <div className="flex items-center gap-3">
              {showBothTimezones && (
                <div className="hidden rounded-lg border border-white/[0.15] bg-white/10 px-4 py-2 sm:block">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm text-white font-semibold">
                      {startTimes.local} - {endTimes.local}
                    </div>
                    <div className="text-xs text-white/80 font-medium">Your time ({startTimes.timezone})</div>
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-white/[0.15] px-3 py-1.5">
                <span className="text-xs font-semibold">
                  {sessionsInSlot.length} {sessionsInSlot.length === 1 ? "session" : "sessions"}
                </span>
              </div>
              <div className="rounded-lg bg-white/[0.15] p-2">
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </div>
        </div>
        {showBothTimezones && (
          <div className="mt-3 rounded-lg border border-white/[0.15] bg-white/10 px-4 py-2 sm:hidden">
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
          id={panelId}
          className={`grid gap-4 animate-in slide-in-from-top-2 duration-300 ${sessionsInSlot.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}
        >
          {sessionsInSlot.map((session) => (
            <SessionCard key={session.$id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
