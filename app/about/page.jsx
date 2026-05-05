"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Loader2,
  AlertCircle,
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiService } from "../../lib/api-service"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"

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
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center animate-fade-in-scale">
          <Loader2 className="w-10 h-10 animate-spin text-[#0B7186] mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !conference) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "No active conference found."}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar conference={conference} />

      {/* Hero */}
      <PageHero
        title={`About ${conference.shortName || conference.title || "the Conference"}`}
        subtitle={`The ${conference.year ? conference.year - 2020 : ""}${conference.year ? getSuffix(conference.year - 2020) : ""} edition of the Annual Renewable Energy Conference & Expo`}
        conference={conference}
        backgroundImage={conference.heroImageUrl}
      />

      {/* ─── Conference Theme ─── */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-6 px-4 py-2 bg-[#0B7186]/8 text-[#0B7186] border border-[#0B7186]/15 text-sm font-medium rounded-full">
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Conference Theme
            </Badge>
            {conference.theme && (
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                {conference.theme}
              </h2>
            )}
          </div>

          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-6">
            <p>
              The Ministry of Energy and Mineral Development, in partnership with the National
              Renewable Energy Platform, is excited to announce the{" "}
              <strong className="text-gray-900">
                {conference.title || "Renewable Energy Conference & EXPO"}
              </strong>{" "}
              from{" "}
              <strong className="text-gray-900">
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
              </strong>
              , at the{" "}
              <strong className="text-gray-900">
                {conference.venue}, {conference.location}
              </strong>
              . This event will be a pivotal moment in our journey towards a sustainable
              energy future.
            </p>
            <p>
              Join us as we bring together experts, innovators, policymakers, and
              stakeholders to discuss and advance the clean energy agenda. Your participation
              is crucial to the success of this conference, and we look forward to your
              invaluable contributions.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Key Highlights ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50/80 to-white">
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
                className="group relative p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B7186] to-[#FFB803] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg`}
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
            {OBJECTIVES.map((obj, index) => (
              <div
                key={obj.title}
                className="group flex items-start space-x-4 p-5 rounded-xl bg-white border border-gray-100 hover:border-[#0B7186]/20 hover:shadow-md transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-[#0B7186]/8 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0B7186]/15 transition-colors">
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50/80">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 px-4 py-2 bg-[#FFB803]/10 text-[#FFB803] border border-[#FFB803]/20 text-sm font-medium rounded-full">
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
                  className="border-[#0B7186]/20 text-[#0B7186] hover:bg-[#0B7186]/5 rounded-xl px-6"
                >
                  Register as Exhibitor
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Badge
                variant="secondary"
                className="px-5 py-2.5 text-sm bg-gray-100 text-gray-500 border border-gray-200 rounded-xl"
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
