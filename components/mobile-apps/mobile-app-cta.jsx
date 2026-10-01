"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, Apple, Download, Smartphone } from "lucide-react"
import { useMobileApps } from "./mobile-app-provider"
import { appDownloadUrl, appPageUrl, availableAppPlatforms } from "@/lib/mobile-apps"
import styles from "./mobile-apps.module.css"

export function AppDownloadButtons({ configuration, compact = false }) {
  return <div className={`${styles.buttons} ${compact ? styles.compact : ""}`}>{availableAppPlatforms(configuration).map(platform => <a key={platform.platform} href={appDownloadUrl(configuration.conferenceId, platform.platform)} className={styles.download}>
    {platform.platform === "ios" ? <Apple size={22} aria-hidden="true" /> : platform.source === "apk" ? <Download size={22} aria-hidden="true" /> : <Smartphone size={22} aria-hidden="true" />}
    <span><small>{platform.source === "apk" ? "Android" : platform.source === "testflight" ? "iPhone & iPad beta" : "Download on"}</small><strong>{platform.source === "apk" ? "Download APK" : platform.source === "testflight" ? "TestFlight" : platform.platform === "android" ? "Google Play" : "App Store"}</strong></span>
  </a>)}</div>
}

export default function MobileAppCta({ placement, configuration: supplied }) {
  const current = useMobileApps(), configuration = supplied === undefined ? current : supplied
  if (!availableAppPlatforms(configuration).length || !configuration.content.placements.includes(placement)) return null
  return <section className={styles.cta} aria-label="REC mobile app"><div className={`site-container ${styles.ctaInner}`}>
    <Image unoptimized src={configuration.content.iconUrl || "/NREP.png"} alt={configuration.content.appName} width={72} height={72} className={styles.icon} />
    <div className={styles.ctaCopy}><h2>{configuration.content.ctaTitle}</h2><p>{configuration.content.ctaDescription}</p></div>
    <Link href={appPageUrl(configuration.conferenceId, placement)} className={styles.pageLink}>Get the REC app <ArrowUpRight size={18} /></Link>
  </div></section>
}

export function FooterApps({ configuration: supplied }) {
  const current = useMobileApps(), configuration = supplied === undefined ? current : supplied
  if (!availableAppPlatforms(configuration).length || !configuration.content.placements.includes("footer")) return null
  return <div className={styles.footer}><div><h3>{configuration.content.appName}</h3><p>{configuration.content.ctaDescription}</p><Link href={appPageUrl(configuration.conferenceId, "footer")}>App details & downloads <ArrowUpRight size={15} /></Link></div><AppDownloadButtons configuration={configuration} compact /></div>
}
