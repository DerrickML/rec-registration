"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Users, Building } from "lucide-react"

export default function ProgramStats({ daysCount, sessionCount, hallsCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-3xl font-bold text-[#0B7186]">{daysCount}</p>
            <p className="text-gray-600">Days</p>
          </div>
          <Calendar className="w-10 h-10 text-[#FFB803]" />
        </CardContent>
      </Card>

      <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-3xl font-bold text-[#0B7186]">{sessionCount}</p>
            <p className="text-gray-600">Sessions</p>
          </div>
          <Users className="w-10 h-10 text-[#FFB803]" />
        </CardContent>
      </Card>

      <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-3xl font-bold text-[#0B7186]">{hallsCount}</p>
            <p className="text-gray-600">Halls/Rooms</p>
          </div>
          <Building className="w-10 h-10 text-[#FFB803]" />
        </CardContent>
      </Card>
    </div>
  )
}
