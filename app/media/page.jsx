"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import ExcursionCta from "@/components/excursions/excursion-cta"
import PageHero from "@/components/layout/page-hero"
import ConferenceSelect from "@/components/layout/conference-select"
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/layout/public-page-state"
import MediaDirectory from "@/components/media/media-directory"
import { apiService } from "@/lib/api-service"

export default function MediaPage() {
  const [conferences, setConferences] = useState([])
  const [selectedId, setSelectedId] = useState("")
  const [siteConference, setSiteConference] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [error, setError] = useState("")
  const selected = conferences.find((item) => item.$id === selectedId)

  useEffect(() => {
    let current = true
    Promise.all([
      apiService.getMediaConferences(),
      apiService.getActiveConference().catch(() => null),
    ])
      .then(([data, active]) => {
        if (!current) return
        const list = data.documents || []
        setConferences(list)
        setSelectedId(
          (list.find((item) => item.isActive === true) || list[0])?.$id || ""
        )
        setSiteConference(active || list[0] || null)
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
    setMediaLoading(true)
    setError("")
    apiService
      .getConferenceMedia(selectedId, { limit: 100 })
      .then((data) => {
        if (current) setItems(data.documents || [])
      })
      .catch((err) => {
        if (current) setError(err.message)
      })
      .finally(() => {
        if (current) setMediaLoading(false)
      })
    return () => {
      current = false
    }
  }, [selectedId])
  if (loading) return <PageLoadingState message="Loading conference media..." />
  if (!siteConference)
    return (
      <PageErrorState
        title="Media unavailable"
        message={error || "No conference information is available."}
      />
    )

  return (
    <div className="bg-white">
      <Navbar conference={siteConference} />
      <PageHero
        title="REC in pictures"
        eyebrow="Photos & videos"
        subtitle="The conversations, connections and moments that make the conference."
        conference={siteConference}
        photo="community"
        showEventInfo={false}
      />
      <main>
        <section className="site-container pt-10">
          <div className="archive-toolbar">
            <div>
              <p className="site-kicker">The conference archive</p>
              <h2 className="text-2xl font-semibold leading-snug">
                {selected?.title || selected?.shortName || "Albums & videos"}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {selected?.mediaCount || 0} published media{" "}
                {selected?.mediaCount === 1 ? "item" : "items"}
              </p>
              <Link href="/media/reports" className="site-text-link mt-4">
                Conference reports <ArrowUpRight size={16} />
              </Link>
            </div>
            <ConferenceSelect
              value={selectedId}
              onValueChange={(value) => {
                setSelectedId(value)
                setMediaLoading(true)
              }}
              conferences={conferences}
              label="View another conference"
              countKey="mediaCount"
            />
          </div>
        </section>
        {error && (
          <div className="site-container mt-6" role="alert">
            {error}
          </div>
        )}
        {mediaLoading ? (
          <PageLoadingState
            inline
            message="Loading selected conference media..."
          />
        ) : (
          <MediaDirectory key={selectedId} items={items} />
        )}
        <ExcursionCta placement="media" compact />
      </main>
      <Footer conference={siteConference} />
    </div>
  )
}
