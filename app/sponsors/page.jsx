"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Handshake } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import { PageErrorState, PageLoadingState } from "@/components/layout/public-page-state"
import SponsorsDirectory from "@/components/sponsors/sponsors-directory"
import { apiService } from "@/lib/api-service"

export default function SponsorsPage() {
  const [conference, setConference] = useState(null)
  const [sponsorCategories, setSponsorCategories] = useState([])
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const activeConference = await apiService.getActiveConference()
        if (!activeConference) {
          setError("No active conference found.")
          return
        }

        const sponsorSetup = await apiService.getConferenceSponsors(activeConference.$id)
        setConference(activeConference)
        setSponsorCategories(sponsorSetup.categories)
        setSponsors(sponsorSetup.sponsors)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSponsors()
  }, [])

  if (loading) {
    return <PageLoadingState message="Loading sponsors and partners..." />
  }

  if (error || !conference) {
    return (
      <PageErrorState
        title="Sponsors unavailable"
        message={error || "No sponsor information is available yet."}
      />
    )
  }

  const visibleSponsors = sponsors.filter((sponsor) => sponsor.isActive !== false)
  const visibleCategories = sponsorCategories.filter((category) => category.isActive !== false)

  return (
    <div className="min-h-screen bg-white">
      <Navbar conference={conference} />

      <PageHero
        title="Sponsors & Partners"
        subtitle={`Organizations supporting ${conference.shortName || conference.title || "the Renewable Energy Conference & Expo"}`}
        conference={conference}
        backgroundImage={conference.heroImageUrl}
      />

      <section className="border-b border-gray-100 bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <Badge className="mb-4 rounded-md border border-[#0B7186]/15 bg-[#0B7186]/[0.08] px-3 py-1.5 text-sm font-semibold text-[#0B7186]">
              <Handshake className="mr-1.5 h-3.5 w-3.5" />
              Partnership Network
            </Badge>
            <h2 className="text-3xl font-extrabold text-gray-950 sm:text-4xl">
              Partners making the conference possible
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-500">
              These organizations help strengthen dialogue, exhibition, innovation, and
              investment across Uganda's renewable energy sector.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm">
              <strong className="block text-3xl font-extrabold text-[#0B7186]">
                {visibleSponsors.length}
              </strong>
              <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-gray-400">
                Sponsors
              </span>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm">
              <strong className="block text-3xl font-extrabold text-[#0B7186]">
                {visibleCategories.length}
              </strong>
              <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-gray-400">
                Tiers
              </span>
            </div>
          </div>
        </div>
      </section>

      <SponsorsDirectory categories={sponsorCategories} sponsors={sponsors} />

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <h2 className="text-2xl font-bold text-gray-950 sm:text-3xl">
            Interested in sponsoring {conference.shortName || "the conference"}?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-500">
            Sponsorship gives your organization visibility with policymakers, investors,
            innovators, practitioners, and clean energy stakeholders.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {conference.sponsorshipPackageUrl && (
              <a href={conference.sponsorshipPackageUrl} target="_blank" rel="noopener noreferrer">
                <Button className="rounded-lg bg-[#FFB803] px-6 font-bold text-gray-950 hover:bg-[#D9A003]">
                  View Sponsorship Package
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            )}
            <Link href="/about">
              <Button
                variant="outline"
                className="rounded-lg border-[#0B7186]/20 px-6 font-semibold text-[#0B7186] hover:bg-[#0B7186]/5"
              >
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer conference={conference} />
    </div>
  )
}
