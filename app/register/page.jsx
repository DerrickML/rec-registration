"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { apiService } from "../../lib/api-service"
import RegistrationForm from "../../components/registration/registration-form"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"

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
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B7186]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar conference={conference} />
      <div className="flex-1">
        <RegistrationForm />
      </div>
      <Footer conference={conference} />
    </div>
  )
}
