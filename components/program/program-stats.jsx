"use client"

import { Calendar, Users, Building } from "lucide-react"

export default function ProgramStats({ daysCount, sessionCount, hallsCount }) {
  const stats = [
    { label: "Days", value: daysCount || 0, icon: Calendar },
    { label: "Sessions", value: sessionCount || 0, icon: Users },
    { label: "Halls/Rooms", value: hallsCount || 0, icon: Building },
  ]

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <div
            key={stat.label}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div>
              <p className="text-3xl font-bold text-[#0B7186]">{stat.value}</p>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#FFB803]/[0.14] text-[#9A6A00]">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
