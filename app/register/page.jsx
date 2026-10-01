"use client"

import { useState, useEffect } from "react"
import { PageLoadingState } from "@/components/layout/public-page-state"
import { apiService } from "../../lib/api-service"
import RegistrationForm from "../../components/registration/registration-form"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import MobileAppCta from "@/components/mobile-apps/mobile-app-cta"
import Link from "next/link"

export default function RegisterPage() {
  const [conference, setConference] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConference = async () => {
      try {
        const activeConference = await apiService.getActiveConference()
        setConference(activeConference)
      } catch {
        // Registration form handles its own conference fetching;
        // we just need it for the navbar/footer
      } finally {
        setLoading(false)
      }
    }
    fetchConference()
  }, [])

  if (loading) {
    return <PageLoadingState message="Loading registration..." />
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar conference={conference} />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="mx-auto max-w-5xl px-6 pt-24 text-right"><Link href="/exhibit/apply" className="font-semibold text-[#0B5E78] underline underline-offset-4">Applying as an exhibiting company?</Link></div>
        <RegistrationForm />
        <MobileAppCta placement="register" />
      </main>
      <Footer conference={conference} />
    </div>
  )
}
