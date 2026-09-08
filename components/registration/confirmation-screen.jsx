"use client"

import Link from "next/link"
import { CheckCircle, ArrowRight, AlertCircle } from "lucide-react"
import { EventInformation } from "@/components/layout/page-hero"

export default function ConfirmationScreen({
  onRegisterAnother,
  conference,
  registration,
}) {
  const warnings = Array.isArray(registration?.warnings)
    ? registration.warnings
    : []
  const days = Array.isArray(registration?.daysAttending)
    ? registration.daysAttending
    : []
  return (
    <section className="site-container site-section">
      <div className="mx-auto max-w-3xl">
        <CheckCircle size={40} className="mb-5 text-green-700" />
        <p className="site-kicker">Conference registration</p>
        <h1 className="text-3xl font-semibold">Registration successful</h1>
        <p className="mt-4 text-base leading-7 text-gray-600">
          {conference?.successMessage ||
            "Thank you for registering. Your conference details are below."}
        </p>
        {warnings.length > 0 && (
          <div
            role="status"
            className="mt-6 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900"
          >
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <strong>Registration saved, email pending</strong>
              <p className="mt-1 text-sm">{warnings[0]}</p>
            </div>
          </div>
        )}
        <div className="my-8 border-y border-gray-200 py-6">
          <h2 className="mb-4 text-xl font-semibold">
            {conference?.title || "REC & EXPO"}
          </h2>
          <EventInformation conference={conference} />
        </div>
        {registration && (
          <dl className="grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-600">Email</dt>
              <dd className="mt-1 break-words font-semibold">
                {registration.email}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600">Registration type</dt>
              <dd className="mt-1 font-semibold">
                {registration.registrationType}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600">Days attending</dt>
              <dd className="mt-1 font-semibold">
                {days.length ? days.join(", ") : "Not specified"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600">Registrants</dt>
              <dd className="mt-1 font-semibold">{registration.count || 1}</dd>
            </div>
          </dl>
        )}
        <div className="button-row mt-10">
          <button onClick={onRegisterAnother} className="site-button">
            Register another participant <ArrowRight size={17} />
          </button>
          <Link href="/program" className="site-text-link">
            Explore the program <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  )
}
