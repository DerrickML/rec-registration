"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import { useConference } from "@/components/layout/use-conference"
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/layout/public-page-state"
import SponsorsDirectory from "@/components/sponsors/sponsors-directory"
import { apiService } from "@/lib/api-service"

export default function SponsorsPage() {
  const { conference, loading, error } = useConference()
  const [setup, setSetup] = useState({ categories: [], sponsors: [] })
  const [sponsorsLoading, setSponsorsLoading] = useState(true)
  const [sponsorsError, setSponsorsError] = useState("")
  useEffect(() => {
    if (!conference?.$id) return
    let current = true
    apiService
      .getConferenceSponsors(conference.$id)
      .then((data) => {
        if (current) setSetup(data)
      })
      .catch((err) => {
        if (current) setSponsorsError(err.message)
      })
      .finally(() => {
        if (current) setSponsorsLoading(false)
      })
    return () => {
      current = false
    }
  }, [conference?.$id])
  if (loading)
    return <PageLoadingState message="Loading sponsors and partners..." />
  if (error || !conference)
    return (
      <PageErrorState
        title="Sponsors unavailable"
        message={error || "No active conference found."}
      />
    )
  return (
    <div className="bg-white">
      <Navbar conference={conference} />
      <PageHero
        title="Sponsors & partners"
        eyebrow="Our partners"
        subtitle="The organizations supporting dialogue, innovation and collaboration at REC & EXPO."
        conference={conference}
        photo="launch"
      />
      <main>
        {sponsorsError ? (
          <div className="site-container site-section" role="alert">
            {sponsorsError}
          </div>
        ) : sponsorsLoading ? (
          <PageLoadingState inline message="Loading sponsors..." />
        ) : (
          <SponsorsDirectory
            categories={setup.categories}
            sponsors={setup.sponsors}
          />
        )}
        <section className="contact-band">
          <div className="site-container">
            <div>
              <h2>Become part of REC.</h2>
              <p>
                Discuss sponsorship, exhibition and partnership opportunities
                with the conference team.
              </p>
            </div>
            <div className="button-row">
              {conference.sponsorshipPackageUrl && (
                <a
                  href={conference.sponsorshipPackageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-button"
                >
                  Sponsorship package <ArrowUpRight size={17} />
                </a>
              )}
              {(conference.contactEmail || conference.contactPhone) && (
                <a
                  href={
                    conference.contactEmail
                      ? `mailto:${conference.contactEmail}`
                      : `tel:${conference.contactPhone}`
                  }
                  className="site-text-link"
                >
                  Contact the team <ArrowUpRight size={17} />
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer conference={conference} />
    </div>
  )
}
