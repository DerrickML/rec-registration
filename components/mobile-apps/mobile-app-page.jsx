"use client"

import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { LoaderCircle, RefreshCw } from "lucide-react"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import { useAppConfiguration } from "./mobile-app-provider"
import { AppDownloadButtons } from "./mobile-app-cta"
import { availableAppPlatforms } from "@/lib/mobile-apps"
import styles from "./mobile-apps.module.css"

export default function MobileAppPage() {
  const conferenceId = useSearchParams().get("conferenceId") || ""
  const { configuration, loading, error, retry } = useAppConfiguration(conferenceId)
  const platforms = availableAppPlatforms(configuration), c = configuration?.content
  const apk = platforms.find(p => p.source === "apk"), beta = platforms.find(p => p.source === "testflight")
  return <div className={styles.page} data-site-motion="off">
    <Navbar conference={configuration?.conference} />
    <main id="main-content" tabIndex={-1}>{loading ? <div className={`site-container ${styles.loading}`} role="status"><LoaderCircle size={22} className="animate-spin" />Loading the REC app...</div> : error || !platforms.length ? <div className={`site-container ${styles.empty}`}><h1>REC mobile app</h1><p role={error ? "alert" : undefined}>{error || "App downloads are not currently available for this conference. Please check back later or contact the REC team."}</p><button type="button" className={styles.retry} onClick={retry}><RefreshCw size={17} />Check again</button></div> : <>
      <section className={styles.intro}><div className="site-container"><Image unoptimized src={c.iconUrl || "/NREP.png"} alt={c.appName} width={92} height={92} className={styles.icon} /><span className={styles.conference}>{configuration.conference.title}</span><h1>{c.appName}</h1><p>{c.description}</p><AppDownloadButtons configuration={configuration} /></div></section>
      <section className={styles.body}><div className="site-container">
        {apk && <><h2>Android release</h2><dl className={styles.details}>{[["Version", `${apk.versionName} (code ${apk.versionCode})`], ["File size", `${(apk.size / 1_000_000).toFixed(1)} MB`], ["Minimum Android API", apk.minSdk], ["Published", `${new Intl.DateTimeFormat("en-UG", { timeZone: "Africa/Kampala", dateStyle: "medium" }).format(new Date(apk.publishedAt))} (EAT)`], ["SHA-256 checksum", <code key="checksum">{apk.sha256}</code>]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className={styles.notice}>This is the official Android APK, distributed directly by NREP. Your phone may ask for permission to install from your browser. Keep Google Play Protect enabled. Updates are installed manually from this page.</p>{apk.notes && <><h2>Release notes</h2><p className={styles.notes}>{apk.notes}</p></>}</>}
        {beta && <p className={styles.notice}>The iPhone & iPad app is a TestFlight beta and requires Apple&apos;s TestFlight app. The current build expires on {new Intl.DateTimeFormat("en-UG", { timeZone: "Africa/Kampala", dateStyle: "medium", timeStyle: "short" }).format(new Date(beta.expiresAt))} (EAT).</p>}
        {!!c.screenshots?.length && <><h2>Inside the app</h2><div className={styles.screenshots} tabIndex={0} aria-label="App screenshots">{c.screenshots.map((s, index) => <Image unoptimized src={s.url} alt={s.alt} width={300} height={600} key={`${index}-${s.url}`} />)}</div></>}
        {c.supportEmail && <p className={styles.support}>App support: <a href={`mailto:${c.supportEmail}`}>{c.supportEmail}</a></p>}
      </div></section>
    </>}</main>
    <Footer conference={configuration?.conference} appConfiguration={configuration} />
  </div>
}
