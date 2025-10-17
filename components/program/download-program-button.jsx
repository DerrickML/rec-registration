"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { generateProgramPDF } from "@/lib/pdf-generator"
import { useToast } from "@/hooks/use-toast"

export default function DownloadProgramButton({ conference, program, sessions }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const handleDownload = async () => {
    try {
      setIsGenerating(true)

      // Generate and download PDF
      const result = await generateProgramPDF(conference, program, sessions)

      toast({
        title: "Success!",
        description: `Program downloaded as ${result.filename}`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Error downloading program:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating}
      className="bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download Program
        </>
      )}
    </Button>
  )
}
