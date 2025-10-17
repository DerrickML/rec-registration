"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ShareLinkButton({ conference }) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleShare = async () => {
    try {
      // Create the download page URL
      const downloadUrl = `${window.location.origin}/program/download`

      // Create a shareable message
      const conferenceTitle = conference?.title || "Conference"
      const shareMessage = `📄 ${conferenceTitle} Program\n\nDownload the full conference program PDF:\n${downloadUrl}\n\nGet all sessions, speakers, and schedule details in one PDF.`

      // Try to use native share API if available (mobile devices)
      if (navigator.share && navigator.canShare({ text: shareMessage })) {
        await navigator.share({
          title: `${conferenceTitle} Program`,
          text: shareMessage,
        })
        toast({
          title: "Shared successfully!",
          description: "Program download link shared",
        })
      } else {
        // Fallback to clipboard copy
        await navigator.clipboard.writeText(downloadUrl)
        setCopied(true)
        toast({
          title: "Link copied!",
          description: "Download page link copied to clipboard",
        })

        // Reset copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error("Error sharing:", error)
      toast({
        title: "Error",
        description: "Failed to share link. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      className="border-[#0B7186] text-[#0B7186] hover:bg-[#0B7186] hover:text-white transition-all duration-300 shadow-md hover:shadow-lg"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Link Copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 mr-2" />
          Share Download Link
        </>
      )}
    </Button>
  )
}
