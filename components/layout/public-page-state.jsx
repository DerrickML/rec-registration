"use client"

import Link from "next/link"
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PageLoadingState({ message = "Loading conference information..." }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[#0B7186] shadow-md shadow-[#0B7186]/20">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
        <p className="text-sm font-medium text-gray-600">{message}</p>
      </div>
    </div>
  )
}

export function PageErrorState({
  title = "Content not available",
  message = "We could not load the requested conference information.",
  actionHref = "/",
  actionLabel = "Back to Home",
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-950">{title}</h1>
        <p className="mb-6 text-sm leading-6 text-gray-600">{message}</p>
        <Link href={actionHref}>
          <Button className="h-11 rounded-lg bg-[#0B7186] px-5 text-sm font-semibold text-white hover:bg-[#054653]">
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
