"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { fetchPublicProgramData } from "@/lib/public-program-api"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/layout/public-page-state"
import DownloadProgramButton from "@/components/program/download-program-button"
import ShareLinkButton from "@/components/program/share-link-button"
import ProgramStats from "@/components/program/program-stats"

export default function DownloadProgramPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let current = true
    fetchPublicProgramData()
      .then((result) => {
        if (current) setData(result)
      })
      .catch((err) => {
        if (current) setError(err.message)
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
        title="Download the program"
        eyebrow="Conference program"
        subtitle="Keep a copy of the published schedule for your visit."
        conference={conference}
        photo="panel"
      />
      <main className="site-container site-section">
        <div className="max-w-3xl">
          <p className="site-kicker">Published schedule</p>
          <h2 className="mb-6 text-3xl font-semibold">
            {program.title || "Conference program"}
          </h2>
          <ProgramStats
            daysCount={program.daysCount}
            sessionCount={sessions.length}
            hallsCount={(program.venueHalls || []).length}
          />
          <p className="mb-8 text-base leading-7 text-gray-600">
            The PDF includes published sessions, speakers, halls and activity
            times. Check the online program for subsequent schedule updates.
          </p>
          <div className="button-row">
            <DownloadProgramButton
              conference={conference}
              program={program}
              sessions={sessions}
              timeBlocks={timeBlocks}
            />
            <ShareLinkButton conference={conference} />
          </div>
          <Link href="/program" className="site-text-link mt-8">
            <ArrowLeft size={17} />
            Back to the online program
          </Link>
        </div>
      </main>
      <Footer conference={conference} />
    </div>
  )
}
