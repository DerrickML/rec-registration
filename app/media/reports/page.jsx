"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import ConferenceSelect from "@/components/layout/conference-select"
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/layout/public-page-state"
import ReportDirectory from "@/components/reports/report-directory"
import { apiService } from "@/lib/api-service"
import { getReportsSiteConfig } from "@/lib/public-site-config"

export default function ConferenceReportsPage() {
  const [siteConference, setSiteConference] = useState(null)
  const [conferences, setConferences] = useState([])
  const [selectedId, setSelectedId] = useState("")
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [error, setError] = useState("")
  const selected = conferences.find(
    (conference) => conference.$id === selectedId
  )
  const config = getReportsSiteConfig(siteConference)

  useEffect(() => {
    let current = true
    apiService
      .getReportConferences()
      .then((data) => {
        if (!current) return
        const list = data.documents || []
        setConferences(list)
        setSelectedId(list[0]?.$id || "")
        setSiteConference(data.siteConference || list[0] || null)
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
  useEffect(() => {
    if (!selectedId) return
    let current = true
    setReportsLoading(true)
    setError("")
    apiService
      .getConferenceReports(selectedId, { limit: 100 })
      .then((data) => {
        if (current) setReports(data.documents || [])
      })
      .catch((err) => {
        if (current) setError(err.message)
      })
      .finally(() => {
        if (current) setReportsLoading(false)
      })
    return () => {
      current = false
    }
  }, [selectedId])
  if (loading)
    return <PageLoadingState message="Loading conference reports..." />
  if (!siteConference)
    return (
      <PageErrorState
        title="Reports unavailable"
        message={error || "No conference information is available."}
      />
    )
  return (
    <div className="bg-white">
      <Navbar conference={siteConference} />
      <PageHero
        title={config.pageTitle}
        eyebrow="Reports & publications"
        subtitle={config.pageDescription}
        conference={siteConference}
        photo="launch"
        showEventInfo={false}
      />
      <main>
        <section className="site-container pt-10">
          <div className="archive-toolbar">
            <div>
              <p className="site-kicker">Knowledge from each edition</p>
              <h2 className="text-2xl font-semibold leading-snug">
                {selected?.title || selected?.shortName || "Conference reports"}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {selected?.reportCount || 0} published{" "}
                {selected?.reportCount === 1 ? "report" : "reports"}
              </p>
              <Link href="/media" className="site-text-link mt-4">
                <ArrowLeft size={16} />
                Albums & videos
              </Link>
            </div>
            <ConferenceSelect
              value={selectedId}
              onValueChange={(value) => {
                setSelectedId(value)
                setReportsLoading(true)
              }}
              conferences={conferences}
              label="View reports from"
              countKey="reportCount"
            />
          </div>
        </section>
        {error && (
          <div className="site-container mt-6" role="alert">
            {error}
          </div>
        )}
        {reportsLoading ? (
          <PageLoadingState
            inline
            message="Loading selected conference reports..."
          />
        ) : (
          <ReportDirectory reports={reports} />
        )}
      </main>
      <Footer conference={siteConference} />
    </div>
  )
}
