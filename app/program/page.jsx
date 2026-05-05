"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Building, Calendar, MapPin } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { formatDateRange } from "@/lib/program-utils"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import { PageErrorState, PageLoadingState } from "@/components/layout/public-page-state"
import ProgramStats from "@/components/program/program-stats"
import ProgramSchedule from "@/components/program/program-schedule"
import DownloadProgramButton from "@/components/program/download-program-button"
import ShareLinkButton from "@/components/program/share-link-button"

export default function ProgramPage() {
  const [conference, setConference] = useState(null)
  const [program, setProgram] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const activeConference = await apiService.getActiveConference()
        if (!activeConference) {
          setError("No active conference found")
          return
        }
        setConference(activeConference)

        const programData = await apiService.getConferenceProgramWithSessions(activeConference.$id)
        if (!programData) {
          setError("No published program available for this conference")
          return
        }

        setProgram(programData.program)
        setSessions(programData.sessions)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <PageLoadingState message="Loading conference program..." />
  }

  if (error || !conference || !program) {
    return (
      <PageErrorState
        title="Program not available"
        message={error || "No published program is available yet."}
      />
    )
  }

  const halls = program?.venueHalls || []

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar conference={conference} />

      <main>
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                {program.status && (
                  <Badge className="mb-4 rounded-md border border-[#0B7186]/[0.15] bg-[#0B7186]/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#0B7186]">
                    {program.status}
                  </Badge>
                )}
                <h1 className="max-w-4xl text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
                  {program.title || "Conference Program"}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
                  Plan your sessions, compare halls, and download a copy of the published schedule.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <DownloadProgramButton conference={conference} program={program} sessions={sessions} />
                <ShareLinkButton conference={conference} />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-slate-50 px-4 py-2">
                <Calendar className="h-4 w-4 text-[#0B7186]" />
                <span className="text-sm font-semibold text-gray-700">
                  {formatDateRange(conference.startDate, conference.endDate)}
                </span>
              </div>
              {conference.location && (
                <div className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-slate-50 px-4 py-2">
                  <MapPin className="h-4 w-4 text-[#0B7186]" />
                  <span className="text-sm font-semibold text-gray-700">
                    {conference.location}
                  </span>
                </div>
              )}
              {conference.venue && (
                <div className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-slate-50 px-4 py-2">
                  <Building className="h-4 w-4 text-[#0B7186]" />
                  <span className="text-sm font-semibold text-gray-700">
                    {conference.venue}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <ProgramStats
            daysCount={program.daysCount}
            sessionCount={sessions.length}
            hallsCount={halls.length}
          />
          <ProgramSchedule conference={conference} program={program} sessions={sessions} />
        </section>
      </main>

      <Footer conference={conference} />
    </div>
  )
}
