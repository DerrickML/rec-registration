"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Loader2, AlertCircle, FileText, Calendar, Users, Clock } from "lucide-react"
import { apiService } from "../../../lib/api-service"
import { generateProgramPDF } from "../../../lib/pdf-generator"
import { useToast } from "@/hooks/use-toast"

export default function DownloadProgramPage() {
  const [conference, setConference] = useState(null)
  const [program, setProgram] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active conference
        const activeConference = await apiService.getActiveConference()
        if (!activeConference) {
          setError("No active conference found")
          setLoading(false)
          return
        }
        setConference(activeConference)

        // Fetch program and sessions
        const programData = await apiService.getConferenceProgramWithSessions(activeConference.$id)
        if (!programData) {
          setError("No published program available for this conference")
          setLoading(false)
          return
        }

        setProgram(programData.program)
        setSessions(programData.sessions)
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
      const result = await generateProgramPDF(conference, program, sessions)
      toast({
        title: "Success!",
        description: `Program downloaded as ${result.filename}`,
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#0B7186] mx-auto mb-4" />
          <p className="text-gray-600">Loading conference program...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{error}</p>
              <Button
                onClick={() => (window.location.href = "/")}
                className="bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FFB803] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0B7186] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#0B7186] to-[#FFB803] rounded-full flex items-center justify-center">
                <FileText className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-[#0B7186] to-[#FFB803] bg-clip-text text-transparent">
              Download Conference Program
            </CardTitle>
            <p className="text-gray-600 mt-2">Get the complete schedule as a PDF</p>
          </CardHeader>

          <CardContent className="pt-6 pb-8">
            {/* Conference Info */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">{conference?.title}</h2>

              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-[#0B7186] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Date</p>
                    <p className="text-gray-600">
                      {new Date(conference?.startDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      -{" "}
                      {new Date(conference?.endDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-[#0B7186] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Location</p>
                    <p className="text-gray-600">{conference?.location}</p>
                    <p className="text-gray-500 text-sm">{conference?.venue}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-[#0B7186] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Program Details</p>
                    <p className="text-gray-600">
                      {program?.daysCount} Days • {sessions.length} Sessions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">What's included in the PDF:</h3>
              <ul className="space-y-1 text-gray-700 text-sm">
                <li className="flex items-start">
                  <span className="text-[#0B7186] mr-2">✓</span>
                  Complete session schedule organized by day
                </li>
                <li className="flex items-start">
                  <span className="text-[#0B7186] mr-2">✓</span>
                  All session details, descriptions, and topics
                </li>
                <li className="flex items-start">
                  <span className="text-[#0B7186] mr-2">✓</span>
                  Speaker information and session chairs
                </li>
                <li className="flex items-start">
                  <span className="text-[#0B7186] mr-2">✓</span>
                  Venue halls and timing information
                </li>
                <li className="flex items-start">
                  <span className="text-[#0B7186] mr-2">✓</span>
                  Professional formatting for easy reading
                </li>
              </ul>
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full h-14 text-lg bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Program (PDF)
                </>
              )}
            </Button>

            {/* Additional Links */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-500">Want to view online instead?</p>
              <Button
                variant="link"
                onClick={() => (window.location.href = "/program")}
                className="text-[#0B7186] hover:text-[#054653]"
              >
                View Program Online →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
