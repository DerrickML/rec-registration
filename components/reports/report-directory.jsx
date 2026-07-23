"use client"

import { CalendarDays, ExternalLink, FileText } from "lucide-react"

const typeLabels = {
  conference_report: "Conference report",
  proceedings: "Conference proceedings",
  outcomes: "Outcomes document",
  communique: "Conference communique",
  other: "Publication",
}

function formatDate(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-UG", {
    timeZone: "Africa/Kampala",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function ReportDirectory({ reports = [] }) {
  if (!reports.length) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FileText className="mx-auto h-11 w-11 text-slate-400" />
          <h2 className="mt-4 text-xl font-extrabold text-slate-950">No published reports for this edition</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Select another conference or return later when an official report has been published.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <article key={report.$id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-[16/9] overflow-hidden bg-[#e7f4f7]">
              {report.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.coverImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#054653]">
                  <FileText className="h-14 w-14 text-white/90" />
                </div>
              )}
              <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1 text-xs font-extrabold text-[#054653] shadow-sm">
                {typeLabels[report.reportType] || "Conference report"}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="text-xl font-extrabold leading-7 text-slate-950">{report.title}</h2>
              {report.publicationDate && (
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <CalendarDays className="h-4 w-4 text-[#0B7186]" />
                  Published {formatDate(report.publicationDate)}
                </div>
              )}
              <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">
                {report.summary || "Open the official publication for this REC edition."}
              </p>
              <a
                href={report.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0B7186] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[#054653] focus:outline-none focus:ring-2 focus:ring-[#0B7186] focus:ring-offset-2"
              >
                View report
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
