"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Building,
  Plane,
  Hotel,
  Car,
  Phone,
  Mail,
  ExternalLink,
  Navigation,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiService } from "../../lib/api-service"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import PageHero from "@/components/layout/page-hero"
import { PageErrorState, PageLoadingState } from "@/components/layout/public-page-state"

export default function VenuePage() {
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
    return <PageLoadingState message="Loading venue information..." />
  }

  if (error || !conference) {
    return (
      <PageErrorState
        title="Venue details unavailable"
        message={error || "No active conference found."}
      />
    )
  }

  // Parse googleMapsUrl from socialsJson
  const parsedSocialsJson = (() => {
    if (!conference.socialsJson) return { googleMapsUrl: "" }
    try {
      return JSON.parse(conference.socialsJson)
    } catch {
      return { googleMapsUrl: "" }
    }
  })()
  const googleMapsUrl = parsedSocialsJson.googleMapsUrl || ""

  // Create an embeddable Google Maps URL
  const getEmbedMapUrl = () => {
    const venue = conference.venue || ""
    const location = conference.location || ""
    const query = encodeURIComponent(`${venue}, ${location}`)
    return `https://www.google.com/maps?q=${query}&output=embed`
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar conference={conference} />

      {/* Hero */}
      <PageHero
        title="Venue & Travel"
        subtitle={`Everything you need to know about getting to ${conference.shortName || "the conference"}`}
        conference={conference}
      />

      {/* ─── Venue Details ─── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
            {/* Venue Info */}
            <div>
              <Badge className="mb-5 rounded-md border border-[#0B7186]/[0.15] bg-[#0B7186]/[0.08] px-3 py-1.5 text-sm font-semibold text-[#0B7186]">
                <Building className="w-3.5 h-3.5 mr-1.5" />
                Conference Venue
              </Badge>

              <h2 className="mb-4 text-3xl font-extrabold text-gray-950 sm:text-4xl">
                {conference.venue || "Venue TBD"}
              </h2>
              <p className="mb-8 max-w-2xl text-lg leading-7 text-gray-600">
                {conference.location}
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-4 rounded-lg border border-gray-200 bg-slate-50 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#0B7186]/10">
                    <MapPin className="w-5 h-5 text-[#0B7186]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Address</p>
                    <p className="text-sm text-gray-500">
                      {conference.venue}{conference.location ? `, ${conference.location}` : ""}
                    </p>
                  </div>
                </div>

                {conference.contactPhone && (
                  <a
                    href={`tel:${conference.contactPhone}`}
                    className="group flex items-start space-x-4 rounded-lg border border-gray-200 bg-slate-50 p-4 transition-colors hover:border-[#0B7186]/25"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#0B7186]/10">
                      <Phone className="w-5 h-5 text-[#0B7186]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Phone</p>
                      <p className="text-sm text-gray-500 group-hover:text-[#0B7186] transition-colors">
                        {conference.contactPhone}
                      </p>
                    </div>
                  </a>
                )}

                {conference.contactEmail && (
                  <a
                    href={`mailto:${conference.contactEmail}`}
                    className="group flex items-start space-x-4 rounded-lg border border-gray-200 bg-slate-50 p-4 transition-colors hover:border-[#0B7186]/25"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#0B7186]/10">
                      <Mail className="w-5 h-5 text-[#0B7186]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Email</p>
                      <p className="break-all text-sm text-gray-500 transition-colors group-hover:text-[#0B7186]">
                        {conference.contactEmail}
                      </p>
                    </div>
                  </a>
                )}
              </div>

              {/* Directions button */}
              {googleMapsUrl ? (
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="rounded-lg bg-[#0B7186] text-white hover:bg-[#054653]">
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                    <ExternalLink className="w-3.5 h-3.5 ml-2" />
                  </Button>
                </a>
              ) : (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${conference.venue}, ${conference.location}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="rounded-lg bg-[#0B7186] text-white hover:bg-[#054653]">
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                    <ExternalLink className="w-3.5 h-3.5 ml-2" />
                  </Button>
                </a>
              )}
            </div>

            {/* Map */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm h-[400px] lg:h-auto lg:min-h-[450px]">
              <iframe
                src={getEmbedMapUrl()}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "400px" }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Conference Venue Map"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Getting There ─── */}
      <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Getting There
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Travel information for local and international attendees
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* By Air */}
            <div className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#0B7186]/25 hover:shadow-lg">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-600 shadow-sm transition-transform group-hover:scale-105">
                <Plane className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">By Air</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Entebbe International Airport (EBB) is the main international airport,
                located approximately 40km from Kampala city centre. Multiple international
                airlines operate direct and connecting flights to Entebbe.
              </p>
            </div>

            {/* Accommodation */}
            <div className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#0B7186]/25 hover:shadow-lg">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFB803] shadow-sm transition-transform group-hover:scale-105">
                <Hotel className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Accommodation</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {conference.venue ? (
                  <>
                    The {conference.venue} offers on-site accommodation with special conference
                    rates. Numerous hotels and guesthouses are also available within close
                    proximity to the venue.
                  </>
                ) : (
                  "A range of hotels and guesthouses are available near the conference venue to suit all budgets."
                )}
              </p>
            </div>

            {/* Local Transport */}
            <div className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#0B7186]/25 hover:shadow-lg">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 shadow-sm transition-transform group-hover:scale-105">
                <Car className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Local Transport</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Airport transfers and local transportation can be arranged through the hotel or
                via ride-hailing services such as Uber and Bolt, which are widely available
                in Kampala.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Visa Info ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg border border-[#0B7186]/10 bg-[#0B7186]/5 p-8 sm:p-10">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                Visa Information
              </h2>
              <p className="text-base text-gray-500 leading-relaxed max-w-2xl mx-auto">
                Most nationalities can obtain a visa on arrival or apply online through the{" "}
                <a
                  href="https://visas.immigration.go.ug/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0B7186] font-medium hover:underline"
                >
                  Uganda Immigration e-Visa portal
                </a>
                . We recommend applying at least 4 weeks before travel. Attendees requiring
                a visa invitation letter can request one during the registration process.
              </p>
            </div>

            {conference.registrationOpen && (
              <div className="text-center">
                <Link href="/register">
                  <Button className="rounded-lg bg-[#0B7186] px-6 text-white hover:bg-[#054653]">
                    Register & Request Visa Letter
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer conference={conference} />
    </div>
  )
}
