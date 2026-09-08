"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { useConference } from "@/components/layout/use-conference"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import ConferencePhoto from "@/components/layout/conference-photo"
import ExcursionCta from "@/components/excursions/excursion-cta"
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/layout/public-page-state"

const OBJECTIVES = [
  [
    "Policy into practice",
    "Exchange perspectives on the policies, markets and partnerships needed to expand access to clean energy.",
  ],
  [
    "Innovation on display",
    "Explore renewable energy technologies, research and business models with the people developing them.",
  ],
  [
    "Investment and opportunity",
    "Connect project developers, financiers and businesses across the renewable energy value chain.",
  ],
  [
    "Energy for productive use",
    "Discuss the role of reliable energy in agriculture, manufacturing, small businesses and local livelihoods.",
  ],
  [
    "Knowledge across borders",
    "Learn from regional and international experience, and share lessons from Uganda's energy sector.",
  ],
  [
    "Partnerships that continue",
    "Build relationships between government, industry, academia, civil society and development partners.",
  ],
]

export default function AboutPage() {
  const { conference, loading, error } = useConference()
  if (loading)
    return <PageLoadingState message="Loading conference details..." />
  if (error || !conference)
    return (
      <PageErrorState
        title="Conference details unavailable"
        message={error || "No active conference found."}
      />
    )
  return (
    <div className="bg-white">
      <Navbar conference={conference} />
      <PageHero
        title="About REC & EXPO"
        eyebrow="About"
        subtitle="A shared platform for Uganda's renewable energy community."
        conference={conference}
        photo="community"
      />
      <main>
        <section className="site-section">
          <div className="site-container editorial-grid">
            <div className="editorial-copy">
              <p className="site-kicker">The conference</p>
              <h2>
                {conference.theme || "Moving clean energy forward, together."}
              </h2>
              <p>
                {conference.description ||
                  "The Renewable Energy Conference & Expo brings together the people shaping Uganda's clean energy transition."}
              </p>
              <p>
                The Ministry of Energy and Mineral Development, together with
                the National Renewable Energy Platform, convenes policymakers,
                businesses, researchers, innovators and development partners for
                dialogue, exhibition and collaboration.
              </p>
              <Link href="/program" className="site-text-link">
                Explore the conference program <ArrowRight size={18} />
              </Link>
            </div>
            <ConferencePhoto photo="audience" />
          </div>
        </section>
        <section className="site-section section-wash">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="site-kicker">Our focus</p>
                <h2>Ideas with a practical purpose.</h2>
              </div>
            </div>
            <div className="feature-list">
              {OBJECTIVES.map(([title, description]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="site-section">
          <div className="site-container editorial-grid">
            <ConferencePhoto photo="expo" />
            <div className="editorial-copy">
              <p className="site-kicker">The expo</p>
              <h2>
                Meet the solutions.
                <br />
                Meet their makers.
              </h2>
              <p>
                The exhibition brings renewable energy into view: technologies,
                products, services and projects from across the sector, with
                space for direct conversations between exhibitors and visitors.
              </p>
              <p>
                Discover new approaches, ask questions and connect with
                potential collaborators.
              </p>
              <div className="button-row mt-6">
                {conference.sponsorshipPackageUrl && (
                  <a
                    href={conference.sponsorshipPackageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-button"
                  >
                    Sponsorship opportunities <ArrowUpRight size={17} />
                  </a>
                )}
                <Link href="/sponsors" className="site-text-link">
                  Our sponsors & partners <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="contact-band">
          <div className="site-container">
            <div>
              <h2>Building on previous conferences.</h2>
              <p>
                Revisit the reports, conversations and moments from earlier REC
                editions.
              </p>
            </div>
            <Link href="/media/reports" className="site-button button-outline">
              Read conference reports <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
        <ExcursionCta placement="about" />
      </main>
      <Footer conference={conference} />
    </div>
  )
}
