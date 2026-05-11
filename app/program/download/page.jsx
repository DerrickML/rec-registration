"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
} from "lucide-react"
import { apiService } from "@/lib/api-service"
import { generateProgramPDF } from "@/lib/pdf-generator"
import { useToast } from "@/hooks/use-toast"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import { PageErrorState, PageLoadingState } from "@/components/layout/public-page-state"

export default function DownloadProgramPage() {
  const [conference, setConference] = useState(null)
  const [program, setProgram] = useState(null)
  const [sessions, setSessions] = useState([])
  const [timeBlocks, setTimeBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const activeConference = await apiService.getActiveConference()
        if (!activeConference) {
          setError("No active conference found")
          return
        }
        setConference(activeConference)

        const programData = await apiService.getConferenceProgramWithSessions(activeConference.$id)
        if (!programData) {
          setError("No published program available for this conference")
          return
        }

        setProgram(programData.program)
        setSessions(programData.sessions)
        setTimeBlocks(programData.timeBlocks || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const result = await generateProgramPDF(conference, program, sessions, timeBlocks)
      toast({
        title: "Program downloaded",
        description: `Saved as ${result.filename}`,
      })
    } catch (downloadError) {
      console.error("Error generating PDF:", downloadError)
      toast({
        title: "Download failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  if (loading) {
    return <PageLoadingState message="Loading conference program..." />
  }

  if (error || !conference || !program) {
    return (
      <PageErrorState
        title="Program not available"
        message={error || "No published program is available yet."}
      />
    )
  }

  const dateRange =
    conference.startDate && conference.endDate
      ? `${new Date(conference.startDate).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })} to ${new Date(conference.endDate).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`
      : "Conference dates to be confirmed"

  const includedItems = [
    "Complete session schedule organized by day",
    "Breaks, lunch, ceremonies, and other published activity slots",
    "Session details, descriptions, and topics",
    "Speaker information and session chairs",
    "Venue halls and timing information",
    "Professional formatting for easy reading",
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar conference={conference} />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <section>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-[#0B7186] text-white shadow-sm">
              <FileText className="h-7 w-7" />
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
              Download the Conference Program
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
              Get a PDF copy of the published schedule for planning, printing, and offline reference.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <Calendar className="mb-3 h-5 w-5 text-[#0B7186]" />
                <h2 className="text-sm font-bold text-gray-950">Date</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">{dateRange}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <MapPin className="mb-3 h-5 w-5 text-[#0B7186]" />
                <h2 className="text-sm font-bold text-gray-950">Location</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">{conference.location}</p>
                {conference.venue && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <Building className="h-3.5 w-3.5" />
                    {conference.venue}
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:col-span-2">
                <Clock className="mb-3 h-5 w-5 text-[#0B7186]" />
                <h2 className="text-sm font-bold text-gray-950">Program Details</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {program.daysCount} {program.daysCount === 1 ? "day" : "days"} and{" "}
                  {sessions.length} published {sessions.length === 1 ? "session" : "sessions"}.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-gray-950">PDF includes</h2>
            <ul className="mt-4 space-y-3">
              {includedItems.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-gray-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0B7186]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="mt-6 h-12 w-full rounded-lg bg-[#0B7186] text-base font-semibold text-white shadow-sm hover:bg-[#054653]"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Download PDF
                </>
              )}
            </Button>

            <Link href="/program" className="mt-4 block">
              <Button
                variant="outline"
                className="h-11 w-full rounded-lg border-[#0B7186]/25 font-semibold text-[#0B7186] hover:bg-[#0B7186]/5"
              >
                View Program Online
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </aside>
        </div>
      </main>

      <Footer conference={conference} />
    </div>
  )
}
