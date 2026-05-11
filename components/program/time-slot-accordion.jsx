"use client"

import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Sparkles,
  Utensils,
  Users,
} from "lucide-react"
import SessionCard from "./session-card"
import {
  formatBlockTimeRange,
  formatVenueScope,
  getBlockTypeLabel,
  isSessionAllowedBlock,
} from "@/lib/schedule-utils"

const blockIcons = {
  SESSION: Clock,
  BREAK: Coffee,
  LUNCH: Utensils,
  SOCIAL: Users,
  CEREMONY: Sparkles,
  EXHIBITION: Building2,
  OTHER: CalendarDays,
}

export default function TimeSlotAccordion({
  timeKey,
  timeSlotData,
  isExpanded,
  onToggle,
  formatTimeWithTimezone,
}) {
  const block = timeSlotData.block
  const blockLabel = block?.label || ""
  const blockTypeLabel = block ? getBlockTypeLabel(block.type) : ""
  const blockTimeRange = block ? formatBlockTimeRange(block) : ""
  const startTimes = block ? null : formatTimeWithTimezone(timeSlotData.startTime)
  const endTimes = block ? null : formatTimeWithTimezone(timeSlotData.toTime)
  const displayedTimeRange = block ? blockTimeRange || "Time to be confirmed" : `${startTimes.kampala} - ${endTimes.kampala}`
  const showBothTimezones = !block && startTimes.kampala !== startTimes.local
  const sessionEntries =
    timeSlotData.sessionEntries || timeSlotData.sessions.map((session) => ({ session, isContinuation: false }))
  const sessionsInSlot = sessionEntries.map((entry) => entry.session)
  const allowsSessions = block ? isSessionAllowedBlock(block) : true
  const panelId = `time-slot-${timeKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`
  const BlockIcon = blockIcons[block?.type] || Clock

  if (block && !allowsSessions) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#FFB803]/20 text-[#8A6200]">
              <BlockIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wide text-[#8A6200]">
                  {blockTypeLabel}
                </span>
                <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {displayedTimeRange} EAT
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-gray-950">{blockLabel || blockTypeLabel}</h3>
              {block.notes && <p className="mt-1 text-sm leading-6 text-gray-700">{block.notes}</p>}
            </div>
          </div>
          <div className="rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">
            {formatVenueScope(block)}
          </div>
        </div>
      </div>
    )
  }

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
              <BlockIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-0.5 text-left flex-1">
              <span className="font-bold text-lg tracking-tight">
                {displayedTimeRange}
              </span>
              {blockLabel && (
                <span className="text-sm font-semibold text-white/[0.92]">{blockLabel}</span>
              )}
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
        sessionsInSlot.length > 0 ? (
          <div
            id={panelId}
            className={`grid gap-4 animate-in slide-in-from-top-2 duration-300 ${sessionsInSlot.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}
          >
            {sessionEntries.map(({ session, isContinuation }) => (
              <SessionCard
                key={`${session.$id}-${block?.$id || timeKey}`}
                session={session}
                compact={isContinuation}
                continuation={isContinuation}
              />
            ))}
          </div>
        ) : (
          <div
            id={panelId}
            className="rounded-lg border border-dashed border-gray-300 bg-slate-50 px-5 py-7 text-center"
          >
            <p className="text-sm font-semibold text-gray-800">No published sessions in this slot yet</p>
            <p className="mt-1 text-xs text-gray-500">
              This time remains available in the published program.
            </p>
          </div>
        )
      )}
    </div>
  )
}
