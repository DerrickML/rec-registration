"use client"

import { useEffect, useState } from "react"
import { fetchPublicProgramData } from "@/lib/public-program-api"
import { PageErrorState, PageLoadingState } from "@/components/layout/public-page-state"
import ProgramSchedule from "@/components/program/program-schedule"

export default function EmbeddedProgramPage() {
  const [conference, setConference] = useState(null)
  const [program, setProgram] = useState(null)
  const [sessions, setSessions] = useState([])
  const [timeBlocks, setTimeBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const programData = await fetchPublicProgramData()
        setConference(programData.conference)
        setProgram(programData.program)
        setSessions(programData.sessions || [])
        setTimeBlocks(programData.timeBlocks || [])
      } catch (err) {
        setError(err.message || "Failed to fetch conference program")
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

  return (
    <main className="min-h-screen bg-slate-50 p-3 sm:p-5">
      <div className="mx-auto max-w-7xl">
        <ProgramSchedule
          conference={conference}
          program={program}
          sessions={sessions}
          timeBlocks={timeBlocks}
          compact
        />
      </div>
    </main>
  )
}
