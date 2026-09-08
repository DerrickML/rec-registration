"use client"

export default function DayTab({
  day,
  dayDate,
  sessionCount,
  isActive,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`min-h-[86px] rounded-md border px-4 py-3 text-left transition-colors ${isActive ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-800 hover:border-primary"}`}
    >
      <span className="block text-base font-semibold">Day {day}</span>
      {dayDate && <span className="mt-1 block text-xs">{dayDate}</span>}
      <span
        className={`mt-2 block text-xs ${isActive ? "text-white" : "text-gray-600"}`}
      >
        {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
      </span>
    </button>
  )
}
