"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, RotateCcw, AlertCircle } from "lucide-react"

export function PageLoadingState({
  message = "Loading conference information...",
  inline = false,
}) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 12000)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div
      className={`page-loading ${inline ? "loading-inline" : ""}`}
      aria-busy="true"
    >
      <div className="loading-brand">
        <Image src="/NREP.png" alt="NREP" width={56} height={56} />
        <div>
          <strong>REC & EXPO</strong>
          <span>Renewable Energy Conference</span>
        </div>
      </div>
      <div className="loading-track" aria-hidden="true">
        <span />
      </div>
      <p role="status">{message}</p>
      {slow && (
        <div className="loading-slow">
          <p>This is taking longer than usual. Please check your connection.</p>
          <button
            className="site-text-link"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={16} />
            Try again
          </button>
        </div>
      )}
      <div className="loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <div>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}

export function PageErrorState({
  title = "Content not available",
  message = "We could not load the requested conference information.",
  actionHref = "/",
  actionLabel = "Back to home",
}) {
  return (
    <main className="page-error" id="main-content">
      <Image src="/NREP.png" alt="NREP" width={64} height={64} />
      <AlertCircle size={28} className="text-primary" />
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="button-row">
        <button
          className="site-button"
          onClick={() => window.location.reload()}
        >
          <RotateCcw size={17} />
          Try again
        </button>
        <Link href={actionHref} className="site-text-link">
          <ArrowLeft size={17} />
          {actionLabel}
        </Link>
      </div>
    </main>
  )
}
