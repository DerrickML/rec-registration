"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpen, CalendarDays } from "lucide-react"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import { PageErrorState, PageLoadingState } from "@/components/layout/public-page-state"
import ReportDirectory from "@/components/reports/report-directory"
import { apiService } from "@/lib/api-service"
import { getReportsSiteConfig } from "@/lib/public-site-config"

function conferenceName(conference) {
  return conference?.shortName || conference?.title || conference?.fullName || `REC ${conference?.year || ""}`
}

export default function ConferenceReportsPage() {
  const [siteConference, setSiteConference] = useState(null)
  const [reportConferences, setReportConferences] = useState([])
  const [selectedConferenceId, setSelectedConferenceId] = useState("")
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedConference = useMemo(
    () => reportConferences.find((conference) => conference.$id === selectedConferenceId) || null,
    [reportConferences, selectedConferenceId]
  )
  const pageConfig = getReportsSiteConfig(siteConference)

  useEffect(() => {
    const load = async () => {
      try {
        const conferenceData = await apiService.getReportConferences()
        const conferences = conferenceData.documents || []
        setReportConferences(conferences)
        setSelectedConferenceId(conferences[0]?.$id || "")
        setSiteConference(conferenceData.siteConference || conferences[0] || null)
      } catch (err) {
        setError(err.message || "Failed to load conference reports.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedConferenceId) {
      setReports([])
      return
    }
    const loadReports = async () => {
      setReportsLoading(true)
      setError("")
      try {
        const data = await apiService.getConferenceReports(selectedConferenceId, { limit: 100 })
        setReports(data.documents || [])
      } catch (err) {
        setError(err.message || "Failed to load reports for this conference.")
      } finally {
        setReportsLoading(false)
      }
    }
    loadReports()
  }, [selectedConferenceId])

  if (loading) return <PageLoadingState message="Loading conference reports..." />

  if (error && !siteConference) {
    return <PageErrorState title="Reports unavailable" message={error} />
  }

  if (!siteConference) {
    return <PageErrorState title="Reports unavailable" message="No conference information is available." />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar conference={siteConference} />
      <PageHero
        eyebrow="Conference Publications"
        title={pageConfig.pageTitle}
        subtitle={pageConfig.pageDescription}
        conference={siteConference}
        backgroundImage={siteConference.heroImageUrl}
      />

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(260px,420px)] md:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#0B7186]">
              <BookOpen className="h-4 w-4" /> Report Archive
            </div>
            <h2 className="mt-2 break-words text-xl font-extrabold text-slate-950">
              {selectedConference ? conferenceName(selectedConference) : "Conference reports"}
            </h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays className="h-4 w-4 flex-shrink-0 text-[#0B7186]" />
              {selectedConference
                ? `${selectedConference.reportCount || reports.length} published report${selectedConference.reportCount === 1 ? "" : "s"}`
                : "No published reports are available yet."}
            </p>
          </div>

          <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
            <span>View reports from</span>
            <select
              value={selectedConferenceId}
              onChange={(event) => setSelectedConferenceId(event.target.value)}
              disabled={!reportConferences.length}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-md border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0B7186] focus:ring-2 focus:ring-[#0B7186]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!reportConferences.length && <option value="">No report conferences</option>}
              {reportConferences.map((conference) => (
                <option key={conference.$id} value={conference.$id}>
                  {conferenceName(conference)} ({conference.reportCount})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <Link href="/media" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0B7186] hover:text-[#054653]">
            <ArrowLeft className="h-4 w-4" /> Back to albums and videos
          </Link>
        </div>
      </section>

      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>
        </div>
      )}

      {reportsLoading ? <PageLoadingState message="Loading selected conference reports..." /> : <ReportDirectory reports={reports} />}
      <Footer conference={siteConference} />
    </div>
  )
}
