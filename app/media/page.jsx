"use client"

import { useEffect, useState } from "react"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import { PageErrorState, PageLoadingState } from "@/components/layout/public-page-state"
import MediaDirectory from "@/components/media/media-directory"
import { apiService } from "@/lib/api-service"

export default function MediaPage() {
  const [mediaConferences, setMediaConferences] = useState([])
  const [selectedConferenceId, setSelectedConferenceId] = useState("")
  const [conference, setConference] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const mediaConferenceData = await apiService.getMediaConferences()
        const conferences = mediaConferenceData.documents || []
        if (!conferences.length) {
          const activeConference = await apiService.getActiveConference().catch(() => null)
          if (activeConference) setConference(activeConference)
          setError("No published conference media is available yet.")
          return
        }
        const defaultConference = conferences.find((item) => item.isActive === true) || conferences[0]
        setMediaConferences(conferences)
        setSelectedConferenceId(defaultConference.$id)
        setConference(defaultConference)
      } catch (err) {
        setError(err.message || "Failed to load conference media.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedConferenceId) return
    const loadMedia = async () => {
      setMediaLoading(true)
      setError("")
      try {
        const selected = mediaConferences.find((item) => item.$id === selectedConferenceId)
        if (selected) setConference(selected)
        const media = await apiService.getConferenceMedia(selectedConferenceId, { limit: 100 })
        setItems(media.documents || [])
      } catch (err) {
        setError(err.message || "Failed to load conference media.")
      } finally {
        setMediaLoading(false)
      }
    }
    loadMedia()
  }, [mediaConferences, selectedConferenceId])

  if (loading) return <PageLoadingState message="Loading conference media..." />

  if (error || !conference) {
    return (
      <PageErrorState
        title="Media unavailable"
        message={error || "No active conference found."}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar conference={conference} />
      <PageHero
        eyebrow="Media Library"
        title={`${conference.shortName || "REC"} albums and videos`}
        subtitle="Explore selected conference albums and video highlights."
        conference={conference}
        backgroundImage={conference.heroImageUrl}
      />
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_320px] sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#0B7186]">Conference media space</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">
              {conference.shortName || conference.title || "Selected conference"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {conference.mediaCount || items.length || 0} published media item{(conference.mediaCount || items.length || 0) === 1 ? "" : "s"}
            </p>
          </div>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            View another conference
            <select
              value={selectedConferenceId}
              onChange={(event) => setSelectedConferenceId(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-[#0B7186]"
            >
              {mediaConferences.map((item) => (
                <option key={item.$id} value={item.$id}>
                  {item.shortName || item.title || item.fullName || item.year} ({item.mediaCount})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {mediaLoading ? (
        <PageLoadingState message="Loading selected conference media..." />
      ) : (
        <MediaDirectory items={items} />
      )}
      <Footer conference={conference} />
    </div>
  )
}
