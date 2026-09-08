"use client"

import { useEffect, useState } from "react"
import { fetchPublicProgramData } from "@/lib/public-program-api"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import ExcursionCta from "@/components/excursions/excursion-cta"
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/layout/public-page-state"
import ProgramStats from "@/components/program/program-stats"
import ProgramSchedule from "@/components/program/program-schedule"
import DownloadProgramButton from "@/components/program/download-program-button"
import ShareLinkButton from "@/components/program/share-link-button"
import PreviousReportCta from "@/components/program/previous-report-cta"
import { apiService } from "@/lib/api-service"

export default function ProgramPage() {
  const [data, setData] = useState(null)
  const [previousReport, setPreviousReport] = useState({
    report: null,
    conference: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    let current = true
    fetchPublicProgramData()
      .then((result) => {
        if (!current) return
        setData(result)
        apiService
          .getFeaturedPreviousReport(result.conference?.$id)
          .then((report) => {
            if (current)
              setPreviousReport(report || { report: null, conference: null })
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (current)
          setError(err.message || "Failed to load conference program.")
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [])
  if (loading)
    return <PageLoadingState message="Loading conference program..." />
  if (error || !data?.conference || !data?.program)
    return (
      <PageErrorState
        title="Program not available"
        message={error || "No published program is available yet."}
      />
    )
  const { conference, program, sessions = [], timeBlocks = [] } = data
  return (
    <div className="bg-white">
      <Navbar conference={conference} />
      <PageHero
        title="Conference program"
        eyebrow="The program"
        subtitle={
          program.title ||
          "Sessions, conversations and connections across the conference."
        }
        conference={conference}
        photo="panel"
      />
      <main>
        <section className="site-container site-section">
          <div className="section-heading">
            <ProgramStats
              daysCount={program.daysCount}
              sessionCount={sessions.length}
              hallsCount={(program.venueHalls || []).length}
            />
            <div className="button-row">
              <DownloadProgramButton
                conference={conference}
                program={program}
                sessions={sessions}
                timeBlocks={timeBlocks}
              />
              <ShareLinkButton conference={conference} />
            </div>
          </div>
          <ProgramSchedule
            conference={conference}
            program={program}
            sessions={sessions}
            timeBlocks={timeBlocks}
          />
        </section>
        <PreviousReportCta
          conference={conference}
          report={previousReport.report}
          reportConference={previousReport.conference}
        />
        <ExcursionCta placement="program" compact />
      </main>
      <Footer conference={conference} />
    </div>
  )
}
