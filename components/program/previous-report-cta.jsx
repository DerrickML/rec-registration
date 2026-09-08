"use client"

import Link from "next/link"
import { ArrowRight, ExternalLink, FileText } from "lucide-react"
import { getReportsSiteConfig } from "@/lib/public-site-config"

export default function PreviousReportCta({ conference, report, reportConference }) {
  const config = getReportsSiteConfig(conference)
  if (!report || config.programCtaEnabled === false) return null

  const edition = reportConference?.shortName || reportConference?.title || reportConference?.year

  return (
    <section className="border-y border-[#176F91]/20 bg-[#e7f4f7]">
      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[#176F91]">
            <FileText className="h-4 w-4" />
            {config.ctaEyebrow}
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
            {config.ctaTitle}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 sm:text-base">
            {config.ctaDescription}
          </p>
          <p className="mt-3 text-sm font-semibold text-[#0B5E78]">
            {edition ? `${edition}: ` : ""}{report.title}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          <a
            href={report.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#176F91] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0B5E78] focus:outline-none focus:ring-2 focus:ring-[#176F91] focus:ring-offset-2"
          >
            {config.ctaButtonLabel}
            <ExternalLink className="h-4 w-4" />
          </a>
          <Link
            href="/media/reports"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#176F91] bg-white px-5 text-sm font-semibold text-[#176F91] transition-colors hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#176F91] focus:ring-offset-2"
          >
            Browse all reports
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
