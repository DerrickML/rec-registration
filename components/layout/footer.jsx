"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Mail, Phone } from "lucide-react"
import { useExcursion } from "@/components/excursions/excursion-provider"
import { ExcursionLink } from "@/components/excursions/excursion-engagement"
import { conferenceExtras } from "@/lib/conference-display"

export default function Footer({ conference }) {
  const excursion = useExcursion()
  const socials = conferenceExtras(conference?.socialsJson).socials || {}
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Image
              src={conference?.logoUrl || "/NREP.png"}
              alt="NREP"
              width={64}
              height={64}
            />
            <h2>
              Renewable Energy
              <br />
              Conference & Expo
            </h2>
            <p>
              A meeting place for the people, ideas and partnerships advancing
              clean energy.
            </p>
            <div className="footer-socials">
              {Object.entries(socials)
                .filter(
                  ([, url]) =>
                    typeof url === "string" && /^https?:\/\//.test(url)
                )
                .map(([name, url]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {name === "twitter" ? "X / Twitter" : name}{" "}
                    <ArrowUpRight size={13} />
                  </a>
                ))}
            </div>
          </div>
          <div>
            <h3>The conference</h3>
            <nav aria-label="Conference links">
              <Link href="/about">About REC</Link>
              <Link href="/program">Conference program</Link>
              <Link href="/sponsors">Sponsors & partners</Link>
              <Link href="/venue">Venue & travel</Link>
              {excursion?.content.placements.includes("footer") && (
                <ExcursionLink excursion={excursion} source="footer">
                  Explore Uganda
                </ExcursionLink>
              )}
              {conference?.registrationOpen && (
                <Link href="/register">Register to attend</Link>
              )}
            </nav>
          </div>
          <div>
            <h3>Explore the archive</h3>
            <nav aria-label="Resources">
              <Link href="/media">Photos & videos</Link>
              <Link href="/media/reports">Conference reports</Link>
              <a
                href={conference?.mainWebsiteUrl || "https://nrep.ug"}
                target="_blank"
                rel="noopener noreferrer"
              >
                NREP website <ArrowUpRight size={14} />
              </a>
              <Link href="/scanner">Scanner access</Link>
            </nav>
          </div>
          <div>
            <h3>Get in touch</h3>
            <div className="footer-contact">
              {conference?.contactEmail && (
                <a href={`mailto:${conference.contactEmail}`}>
                  <Mail size={17} />
                  {conference.contactEmail}
                </a>
              )}
              {conference?.contactPhone && (
                <a href={`tel:${conference.contactPhone}`}>
                  <Phone size={17} />
                  {conference.contactPhone}
                </a>
              )}
              <p>
                {conference?.venue}
                <br />
                {conference?.location}
              </p>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} National Renewable Energy
            Platform.
          </p>
          <p>
            Convened with the{" "}
            <a
              href="https://memd.go.ug/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ministry of Energy & Mineral Development
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
