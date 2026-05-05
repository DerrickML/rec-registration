"use client"

import { Calendar } from "lucide-react"

export default function DayTab({ day, dayDate, sessionCount, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`
        group relative overflow-hidden rounded-lg border text-left transition-all duration-200
        ${
          isActive
            ? "border-[#0B7186] bg-[#0B7186] shadow-sm"
            : "border-gray-200 bg-white hover:border-[#0B7186]/30 hover:shadow-sm"
        }
      `}
      aria-pressed={isActive}
    >
      {/* Content */}
      <div className="relative flex min-h-[104px] flex-col justify-between gap-3 px-4 py-4">
        <Calendar
          className={`h-5 w-5 transition-transform duration-200 ${isActive ? "text-white" : "text-[#0B7186] group-hover:scale-105"}`}
        />
        <div className="flex flex-col gap-1">
          <span className={`text-base font-bold tracking-tight ${isActive ? "text-white" : "text-gray-950"}`}>
            Day {day}
          </span>
          {dayDate && (
            <span className={`text-xs font-semibold ${isActive ? "text-white/90" : "text-gray-600"}`}>{dayDate}</span>
          )}
        </div>
        <div
          className={`
            w-fit rounded-md px-2.5 py-1 text-xs font-semibold
            ${
              isActive
                ? "bg-white/[0.15] text-white"
                : "bg-gray-100 text-gray-700 group-hover:bg-[#0B7186]/10 group-hover:text-[#0B7186]"
            }
          `}
        >
          {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
        </div>
      </div>
    </button>
  )
}
