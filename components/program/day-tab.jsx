"use client"

import { Calendar } from "lucide-react"

export default function DayTab({ day, dayDate, sessionCount, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
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
          <span className={`text-lg font-bold tracking-tight ${isActive ? "text-white" : "text-gray-900"}`}>
            Day {day}
          </span>
          {dayDate && (
            <span className={`text-xs font-semibold ${isActive ? "text-white/90" : "text-gray-600"}`}>{dayDate}</span>
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
          {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40" />}
    </button>
  )
}
