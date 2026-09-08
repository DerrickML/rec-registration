"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { apiService } from "@/lib/api-service"
import {
  REC_PHOTOS,
  conferenceDays,
  conferenceDate,
  conferenceExtras,
} from "@/lib/conference-display"
import { useConference } from "@/components/layout/use-conference"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import { EventInformation } from "@/components/layout/page-hero"
import ConferencePhoto from "@/components/layout/conference-photo"
import ExcursionCta from "@/components/excursions/excursion-cta"
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/layout/public-page-state"
import MediaShowcase from "@/components/media/media-showcase"
import SponsorShowcase from "@/components/sponsors/sponsor-showcase"

export default function HomePage() {
  const { conference, loading, error } = useConference()
  const [sponsorSetup, setSponsorSetup] = useState({
    categories: [],
    sponsors: [],
  })
  const [mediaItems, setMediaItems] = useState([])
  useEffect(() => {
    if (!conference?.$id) return
    let current = true
    apiService
      .getConferenceSponsors(conference.$id)
      .then((data) => {
        if (current) setSponsorSetup(data)
      })
      .catch(() => {})
    apiService
      .getConferenceMedia(conference.$id, { featured: true, limit: 8 })
      .then((data) => {
        if (current) setMediaItems(data.documents || [])
      })
      .catch(() => {})
    return () => {
      current = false
    }
  }, [conference?.$id])

  if (loading) return <PageLoadingState />
  if (error || !conference)
    return (
      <PageErrorState
        title="Conference unavailable"
        message={error || "No active conference is available yet."}
      />
    )

  const days = conferenceDays(conference.days)
  const extras = conferenceExtras(conference.socialsJson)
  const features =
    Array.isArray(extras.features) && extras.features.length
      ? extras.features
      : [
          {
            title: "Conversations that move the sector forward",
            description:
              "Policy, research and investment perspectives, shared by the people working in renewable energy.",
          },
          {
            title: "Clean energy, up close",
            description:
              "Meet exhibitors and discover the technologies, services and practical solutions behind the transition.",
          },
          {
            title: "Connections beyond the session",
            description:
              "Exchange ideas with government, business, researchers, development partners and fellow practitioners.",
          },
          {
            title: "A shared agenda",
            description:
              "Bring your experience into discussions on energy access, productive use and sustainable growth.",
          },
        ]

  return (
    <div className="bg-white">
      <Navbar conference={conference} />
      <main id="main-content" tabIndex={-1}>
        <section className="home-hero">
          <Image
            src={conference.heroImageUrl || REC_PHOTOS.expo.src}
            alt={
              conference.heroImageUrl
                ? "Renewable Energy Conference & Expo"
                : REC_PHOTOS.expo.alt
            }
            fill
            sizes="100vw"
            priority
            className="hero-photo"
          />
          <div className="site-container home-hero-content">
            <p className="site-kicker">Uganda / Renewable energy, together</p>
            <h1>{conference.title || "Renewable Energy Conference & Expo"}</h1>
            <p className="home-hero-lead">
              {conference.heroTagline ||
                conference.theme ||
                "Ideas, people and partnerships advancing Uganda's clean energy transition."}
            </p>
            <div className="button-row">
              {conference.registrationOpen && (
                <Link href="/register" className="site-button button-gold">
                  Register to attend <ArrowUpRight size={18} />
                </Link>
              )}
              <Link
                href="/program"
                className="site-button button-white-outline"
              >
                View the program <ArrowRight size={18} />
              </Link>
            </div>
            {!conference.registrationOpen && (
              <p className="hero-closed">
                {conference.regClosedMessage ||
                  "Registration is currently closed."}
              </p>
            )}
          </div>
          {!conference.heroImageUrl && (
            <span className="photo-credit">
              REC25 & EXPO / Exhibition grounds
            </span>
          )}
        </section>
        <section className="event-band" aria-label="Conference dates and venue">
          <div className="site-container event-band-inner">
            <EventInformation conference={conference} />
            <Link href="/venue" className="site-text-link">
              Plan your visit <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
        <section className="site-section">
          <div className="site-container editorial-grid">
            <div className="editorial-copy">
              <p className="site-kicker">
                {conference.year
                  ? `The ${conference.year} conference`
                  : "The conference"}
              </p>
              <h2>{conference.theme || "A meeting place for clean energy."}</h2>
              <p>
                {conference.description ||
                  "REC brings together policymakers, innovators, investors and practitioners to exchange ideas and build practical partnerships for renewable energy."}
              </p>
              <Link href="/about" className="site-text-link">
                Discover the conference <ArrowRight size={18} />
              </Link>
            </div>
            <ConferencePhoto photo="community" />
          </div>
        </section>
        <section className="site-section section-wash">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="site-kicker">Take part</p>
                <h2>More than a conversation.</h2>
              </div>
              <Link href="/sponsors" className="site-text-link">
                Meet our partners <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="feature-list">
              {features.map((feature, index) => (
                <article key={index}>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        {days.length > 0 && (
          <section className="site-section">
            <div className="site-container">
              <div className="section-heading">
                <div>
                  <p className="site-kicker">The program</p>
                  <h2>Your conference, day by day.</h2>
                </div>
                <Link href="/program" className="site-text-link">
                  Full program <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="agenda-list">
                {days.map((day, index) => (
                  <Link
                    href="/program"
                    key={day.date || index}
                    className="agenda-day"
                  >
                    <div>
                      <strong>Day {index + 1}</strong>
                      {day.date && (
                        <small>
                          {conferenceDate(day.date, {
                            month: "short",
                            year: undefined,
                          })}
                        </small>
                      )}
                    </div>
                    <div>
                      <h3>{day.label || `Conference day ${index + 1}`}</h3>
                      {day.theme && <p>{day.theme}</p>}
                    </div>
                    <ArrowUpRight size={21} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
        <SponsorShowcase
          conference={conference}
          categories={sponsorSetup.categories}
          sponsors={sponsorSetup.sponsors}
        />
        {mediaItems.length ? (
          <MediaShowcase conference={conference} items={mediaItems} />
        ) : (
          <section className="site-section">
            <div className="site-container">
              <div className="section-heading">
                <div>
                  <p className="site-kicker">From the archive / REC25</p>
                  <h2>The people behind the progress.</h2>
                </div>
                <Link href="/media" className="site-text-link">
                  Explore photos & videos <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="photo-strip">
                <ConferencePhoto photo="panel" />
                <ConferencePhoto photo="audience" />
                <ConferencePhoto photo="launch" />
              </div>
            </div>
          </section>
        )}
        <ExcursionCta placement="home" />
        <section className="contact-band">
          <div className="site-container">
            <div>
              <h2>Be part of the conversation.</h2>
              <p>
                Explore the sessions, meet our partners and plan your time at
                REC & EXPO.
              </p>
            </div>
            <Link
              href={conference.registrationOpen ? "/register" : "/program"}
              className="site-button"
            >
              {conference.registrationOpen
                ? "Register to attend"
                : "Explore the program"}{" "}
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Footer conference={conference} />
    </div>
  )
}
