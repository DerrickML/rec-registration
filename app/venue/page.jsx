"use client"

import { Mail, Phone, Navigation, ArrowUpRight } from "lucide-react"
import { useConference } from "@/components/layout/use-conference"
import { conferenceExtras } from "@/lib/conference-display"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import ExcursionCta from "@/components/excursions/excursion-cta"
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/layout/public-page-state"

export default function VenuePage() {
  const { conference, loading, error } = useConference()
  if (loading)
    return <PageLoadingState message="Loading venue information..." />
  if (error || !conference)
    return (
      <PageErrorState
        title="Venue details unavailable"
        message={error || "No active conference found."}
      />
    )
  const address = [conference.venue, conference.location]
    .filter(Boolean)
    .join(", ")
  const query = encodeURIComponent(address)
  const mapsUrl =
    conferenceExtras(conference.socialsJson).googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${query}`
  return (
    <div className="bg-white">
      <Navbar conference={conference} />
      <PageHero
        title="Venue & travel"
        eyebrow="Plan your visit"
        subtitle="We look forward to welcoming you to the conference."
        conference={conference}
        photo="expo"
      />
      <main>
        <section className="site-section">
          <div className="site-container editorial-grid">
            <div className="editorial-copy">
              <p className="site-kicker">Meet us here</p>
              <h2>{conference.venue || "Venue to be confirmed"}</h2>
              <p>{conference.location}</p>
              <div className="venue-contact">
                {conference.contactEmail && (
                  <a href={`mailto:${conference.contactEmail}`}>
                    <Mail size={18} />
                    {conference.contactEmail}
                  </a>
                )}
                {conference.contactPhone && (
                  <a href={`tel:${conference.contactPhone}`}>
                    <Phone size={18} />
                    {conference.contactPhone}
                  </a>
                )}
              </div>
              {address && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-button"
                >
                  <Navigation size={17} />
                  Get directions <ArrowUpRight size={17} />
                </a>
              )}
            </div>
            {address && (
              <iframe
                src={`https://www.google.com/maps?q=${query}&output=embed`}
                className="venue-map"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Conference venue map"
              />
            )}
          </div>
        </section>
        <section className="site-section section-wash">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="site-kicker">Before you travel</p>
                <h2>A little planning goes a long way.</h2>
              </div>
            </div>
            <div className="feature-list">
              <article>
                <h3>Arrival & transfers</h3>
                <p>
                  Allow time for your journey to the conference. For airport
                  transfers and local transport, confirm arrangements directly
                  with your accommodation or transport provider.
                </p>
              </article>
              <article>
                <h3>Where to stay</h3>
                <p>
                  Choose accommodation convenient to the venue and confirm
                  availability, rates and cancellation terms directly with the
                  property.
                </p>
              </article>
              <article>
                <h3>Travel documents</h3>
                <p>
                  Check current entry and travel requirements through the
                  official Uganda immigration service before making travel
                  arrangements.
                </p>
                <a
                  className="site-text-link mt-4"
                  href="https://visas.immigration.go.ug/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Uganda immigration portal <ArrowUpRight size={16} />
                </a>
              </article>
              <article>
                <h3>Questions about your visit?</h3>
                <p>
                  Contact the conference team for venue and participation
                  enquiries, including accessibility requirements or other
                  arrangements you would like to discuss.
                </p>
                {(conference.contactEmail || conference.contactPhone) && (
                  <a
                    className="site-text-link mt-4"
                    href={
                      conference.contactEmail
                        ? `mailto:${conference.contactEmail}`
                        : `tel:${conference.contactPhone}`
                    }
                  >
                    Contact the REC team <ArrowUpRight size={16} />
                  </a>
                )}
              </article>
            </div>
          </div>
        </section>
        <ExcursionCta placement="venue" />
      </main>
      <Footer conference={conference} />
    </div>
  )
}
