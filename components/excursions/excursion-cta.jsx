"use client"
import Link from "next/link"
import { ArrowRight, Compass } from "lucide-react"
import { useExcursion } from "./excursion-provider"
import { excursionEdition, excursionPath } from "@/lib/excursions"
import styles from "./excursions.module.css"
export default function ExcursionCta({ placement, compact = false }) {
  const excursion = useExcursion()
  if (!excursion?.content.placements.includes(placement)) return null
  return <section className={`${styles.cta} ${compact ? styles.compact : ""}`} aria-label={`${excursionEdition(excursion)} excursions`}>
    {!compact && <img src={excursion.content.heroImage} alt="" loading="lazy" className={styles.ctaPhoto} />}
    <div className={styles.ctaInner}><div><p className={styles.eyebrow}><Compass size={17} /> {excursionEdition(excursion)} / Beyond the conference</p><h2>{excursion.content.title}</h2><p>{compact ? "Day trips and safari experiences with " + excursion.content.partnerName + "." : "Stay a little longer. Discover Uganda's heritage, the Nile and its national parks with " + excursion.content.partnerName + "."}</p></div>
      <Link href={excursionPath(excursion, placement)} className={styles.button}>Explore the excursions <ArrowRight size={18} /></Link>
    </div>
  </section>
}
