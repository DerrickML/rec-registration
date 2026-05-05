"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building, ChevronRight, ChevronUp, MapPin, Users } from "lucide-react"
import { sanitizeRichHtml } from "@/lib/sanitize-html"

export default function SessionCard({ session }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="group border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-[#0B7186]/30 hover:shadow-lg">
      <CardContent className="p-6">
        {/* Session Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="rounded-md border border-[#0B7186]/20 bg-[#0B7186]/10 px-3 py-1 font-medium text-[#0B7186]">
                <MapPin className="w-3 h-3 mr-1 inline" />
                {session.venueHall}
              </Badge>
              {session.theme && (
                <Badge
                  variant="outline"
                  className="rounded-md border-[#FFB803]/40 bg-[#FFB803]/10 px-3 py-1 font-medium text-[#8A6200]"
                >
                  {session.theme}
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight group-hover:text-[#0B7186] transition-colors">
              {session.title}
            </h3>
          </div>
        </div>

        {/* Organizer */}
        {session.organizer && (
          <div className="mb-4 flex items-center rounded-lg bg-slate-50 px-3 py-2 text-sm text-gray-600">
            <Building className="w-4 h-4 mr-2 text-[#0B7186] flex-shrink-0" />
            <span className="font-medium">{session.organizer}</span>
          </div>
        )}

        {/* Preamble */}
        {session.preamble && (
          <div className="mb-4">
            <div
              className={`rich-text-content text-sm text-gray-700 leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(session.preamble) }}
            />
            {session.preamble.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[#0B7186] text-sm font-semibold hover:text-[#054653] mt-3 flex items-center gap-1 transition-colors"
              >
                {expanded ? (
                  <>
                    <span>Show less</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Read more</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Speakers */}
        {session.speakers && (
          <div className="mt-5 pt-5 border-t border-gray-200">
            <div className="flex items-start gap-3">
              <div className="bg-[#FFB803]/10 p-2 rounded-lg flex-shrink-0">
                <Users className="w-4 h-4 text-[#FFB803]" />
              </div>
              <div
                className="rich-text-content text-sm text-gray-700 flex-1"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(session.speakers) }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
