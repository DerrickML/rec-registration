import Image from "next/image"
import Link from "next/link"
import { CalendarDays, MapPin } from "lucide-react"
import { REC_PHOTOS, conferenceDateRange } from "@/lib/conference-display"

export function EventInformation({ conference }) {
  if (!conference) return null
  return (
    <div className="event-information">
      <span>
        <CalendarDays size={17} />
        {conferenceDateRange(conference.startDate, conference.endDate)}
      </span>
      {(conference.venue || conference.location) && (
        <span>
          <MapPin size={17} />
          {[conference.venue, conference.location].filter(Boolean).join(", ")}
        </span>
      )}
    </div>
  )
}

export default function PageHero({
  title,
  subtitle,
  conference,
  backgroundImage,
  photo = "community",
  showEventInfo = true,
  eyebrow,
  children,
}) {
  const asset = REC_PHOTOS[photo] || REC_PHOTOS.community
  return (
    <section className="page-masthead" id="main-content" tabIndex={-1}>
      <Image
        className="masthead-photo"
        src={backgroundImage || asset.src}
        alt={backgroundImage ? "" : asset.alt}
        fill
        sizes="100vw"
        priority
      />
      <div className="site-container masthead-content">
        <div className="masthead-breadcrumb">
          <Link href="/">REC & EXPO</Link>
          <span aria-hidden="true">/</span>
          <span>{eyebrow || "The conference"}</span>
        </div>
        <h1>{title}</h1>
        {subtitle && <p className="masthead-lead">{subtitle}</p>}
        {showEventInfo && <EventInformation conference={conference} />}
        {children}
      </div>
      {!backgroundImage && (
        <span className="photo-credit">Photography: REC25 & EXPO</span>
      )}
    </section>
  )
}
