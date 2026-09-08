"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles } from "lucide-react"

export default function ProgramHeader({ conferenceTitle, registrationOpen }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#176F91] hover:text-[#0B5E78] hover:bg-[#176F91]/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="w-10 h-10 bg-[#176F91] rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Conference Program</h1>
              <p className="text-sm text-gray-600">{conferenceTitle}</p>
            </div>
          </div>
          {registrationOpen && (
            <div className="flex items-center space-x-4">
              <Link href="/register">
                <Button className="bg-[#176F91] hover:bg-[#0B5E78] text-white">
                  Register Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
