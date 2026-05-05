"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Target,
  Users,
  Globe,
  Lightbulb,
  TrendingUp,
  Handshake,
  Zap,
  Factory,
  Award,
  PresentationIcon,
  Network,
  Megaphone,
  BarChart3,
  Sparkles,
  Clock,
} from "lucide-react"
import { apiService } from "../../lib/api-service"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import { PageErrorState, PageLoadingState } from "@/components/layout/public-page-state"

const OBJECTIVES = [
  {
    icon: BarChart3,
    title: "Review REC25 Outcomes",
    description: "Build on commitments and progress made during REC25 to accelerate Uganda's clean energy transition.",
  },
  {
    icon: Globe,
    title: "Engage with Global Experts",
    description: "Dialogue with international and regional leaders on scaling renewable energy systems and markets.",
  },
  {
    icon: TrendingUp,
    title: "Drive the Green Economy",
    description: "Explore how renewable energy powers industrial growth, green jobs, and economic resilience.",
  },
  {
    icon: Lightbulb,
    title: "Discover Scalable Solutions",
    description: "Showcase technologies and solutions ready for large-scale deployment across Uganda and Africa.",
  },
  {
    icon: Zap,
    title: "Explore Frontier Innovations",
    description: "Learn about emerging energy technologies, digitalization, grid storage, and smart energy systems.",
  },
  {
    icon: Handshake,
    title: "Unlock Investment Opportunities",
    description: "Connect with financiers and investors exploring opportunities across renewable energy value chains.",
  },
  {
    icon: Factory,
    title: "Strengthen Energy Systems",
    description: "Discuss strategies to build resilient, reliable, and sustainable energy systems.",
  },
  {
    icon: Network,
    title: "Build Strategic Partnerships",
    description: "Strengthen collaboration between government, private sector, development partners, and innovators.",
  },
  {
    icon: PresentationIcon,
    title: "Advance Productive Use of Energy",
    description: "Discover how energy drives agriculture, manufacturing, SMEs, and rural economic growth.",
  },
  {
    icon: Award,
    title: "Showcase Your Innovations",
    description: "Present solutions, research, and business models to a global clean energy audience.",
  },
  {
    icon: Users,
    title: "Network with Sector Leaders",
    description: "Meet policymakers, investors, entrepreneurs, and practitioners shaping Africa's energy future.",
  },
  {
    icon: Megaphone,
    title: "Reach a High-Impact Audience",
    description: "Promote your products, services, and innovations to thousands of participants and stakeholders.",
  },
]

export default function AboutPage() {
  const [conference, setConference] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchConference = async () => {
      try {
        const activeConference = await apiService.getActiveConference()
        setConference(activeConference)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchConference()
  }, [])

  if (loading) {
    return <PageLoadingState message="Loading conference details..." />
  }

  if (error || !conference) {
    return (
      <PageErrorState
        title="Conference details unavailable"
        message={error || "No active conference found."}
      />
    )
  }

  const editionNumber = conference.year ? conference.year - 2020 : null
  const editionLabel = editionNumber ? `${editionNumber}${getSuffix(editionNumber)}` : ""

  return (
    <div className="min-h-screen bg-white">
      <Navbar conference={conference} />

      {/* Hero */}
      <PageHero
        title={`About ${conference.shortName || conference.title || "the Conference"}`}
        subtitle={
          editionLabel
            ? `The ${editionLabel} edition of the Annual Renewable Energy Conference & Expo`
            : "The Annual Renewable Energy Conference & Expo"
        }
        conference={conference}
        backgroundImage={conference.heroImageUrl}
      />

      {/* ─── Conference Theme ─── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <Badge className="mb-5 rounded-md border border-[#0B7186]/[0.15] bg-[#0B7186]/[0.08] px-3 py-1.5 text-sm font-semibold text-[#0B7186]">
              <Target className="mr-1.5 h-3.5 w-3.5" />
              Conference Theme
            </Badge>
            {conference.theme && (
              <h2 className="mb-6 text-3xl font-extrabold leading-tight text-gray-950 sm:text-4xl lg:text-5xl">
                {conference.theme}
              </h2>
            )}
            <div className="space-y-5 text-base leading-8 text-gray-600 sm:text-lg">
              <p>
                The Ministry of Energy and Mineral Development, in partnership with the
                National Renewable Energy Platform, will convene{" "}
                <strong className="font-semibold text-gray-950">
                  {conference.title || "Renewable Energy Conference & Expo"}
                </strong>{" "}
                as a practical forum for policy, investment, innovation, and sector
                coordination.
              </p>
              <p>
                The conference brings together experts, innovators, policymakers, financiers,
                researchers, and practitioners to move clean energy conversations into
                implementation.
              </p>
            </div>
          </div>

          <aside className="rounded-lg border border-gray-200 bg-slate-50 p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
              Event Snapshot
            </h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-950">
                  {new Date(conference.startDate).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  to{" "}
                  {new Date(conference.endDate).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Venue
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-950">
                  {conference.venue || "Venue TBD"}
                  {conference.location ? `, ${conference.location}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Participation
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-950">
                  {(conference.maxAttendees || 1000).toLocaleString()}+ expected attendees
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      {/* ─── Key Highlights ─── */}
      <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Key Highlights
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              What to expect at {conference.shortName || "the conference"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                stat: `${(conference.maxAttendees || 1000).toLocaleString()}+`,
                title: "Participants",
                description:
                  "Engage with a diverse audience including government officials, industry leaders, researchers, CSOs, and the public.",
                color: "from-[#0B7186] to-cyan-500",
              },
              {
                icon: Globe,
                stat: "20+",
                title: "International Presence",
                description:
                  "Connect with stakeholders from various countries, building on previous editions which attracted representatives from over 20 nations.",
                color: "from-amber-400 to-orange-500",
              },
              {
                icon: TrendingUp,
                stat: "Transform",
                title: "Drive Transformation",
                description:
                  "Contribute to shaping the future of energy in Uganda and beyond, focusing on sustainable solutions and conservation.",
                color: "from-emerald-400 to-teal-500",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#0B7186]/25 hover:shadow-lg"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B7186] to-[#FFB803] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-sm`}
                >
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900 mb-1">
                  {item.stat}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Conference Objectives ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Conference Objectives
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Why you should attend {conference.shortName || "the conference"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {OBJECTIVES.map((obj) => (
              <div
                key={obj.title}
                className="group flex items-start space-x-4 rounded-lg border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-[#0B7186]/25 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#0B7186]/[0.08] transition-colors group-hover:bg-[#0B7186]/[0.15]">
                  <obj.icon className="w-5 h-5 text-[#0B7186]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {obj.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {obj.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Exhibition Section ─── */}
      <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <Badge className="mb-6 rounded-md border border-[#FFB803]/20 bg-[#FFB803]/10 px-3 py-1.5 text-sm font-semibold text-[#8A6200]">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Exhibition & EXPO
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            {conference.shortName || "REC"} Exhibition
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed max-w-3xl mx-auto mb-6">
            The conference will feature state-of-the-art pavilions, offering an immersive
            experience into government projects, innovator showcases, researcher insights,
            and works from local and international private sectors.
          </p>
          <p className="text-base text-gray-500 leading-relaxed max-w-3xl mx-auto mb-10">
            The exhibition is a prime platform for Business-to-Individual (B2I) and
            Business-to-Business (B2B) interactions, facilitating networking, product/service
            advertisement, and talent acquisition.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {conference.sponsorshipPackageUrl && (
              <a href={conference.sponsorshipPackageUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#FFB803] hover:bg-[#D9A003] text-gray-900 font-bold rounded-xl px-6">
                  Request Sponsorship Package
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            )}
            {conference.registrationOpen ? (
              <Link href="/register">
                <Button
                  variant="outline"
                  className="rounded-lg border-[#0B7186]/20 px-6 text-[#0B7186] hover:bg-[#0B7186]/5"
                >
                  Register as Exhibitor
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Badge
                variant="secondary"
                className="rounded-lg border border-gray-200 bg-gray-100 px-5 py-2.5 text-sm text-gray-500"
              >
                <Clock className="w-4 h-4 mr-2" />
                Registration Opening Soon
              </Badge>
            )}
          </div>
        </div>
      </section>

      <Footer conference={conference} />
    </div>
  )
}

// Helper for ordinal suffix
function getSuffix(n) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
