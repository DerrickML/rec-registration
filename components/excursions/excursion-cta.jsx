"use client"
import Image from "next/image"
import { ArrowRight, Compass } from "lucide-react"
import { useExcursion } from "./excursion-provider"
import { excursionEdition } from "@/lib/excursions"
import { ExcursionLink } from "./excursion-engagement"
import styles from "./excursions.module.css"
export default function ExcursionCta({ placement, compact = false }) {
  const excursion = useExcursion()
  if (!excursion?.content.placements.includes(placement)) return null
  return <section className={`${styles.cta} ${compact ? styles.compact : ""}`} aria-label={`${excursionEdition(excursion)} excursions`}>
    {!compact && <Image src={excursion.content.heroImage} alt="" fill sizes="100vw" className={styles.ctaPhoto} />}
    <div className={styles.ctaInner}><div><p className={styles.eyebrow}><Compass size={17} /> {excursionEdition(excursion)} / Beyond the conference</p><h2>{excursion.content.title}</h2><p>{compact ? "Day trips and safari experiences with " + excursion.content.partnerName + "." : "Stay a little longer. Discover Uganda's heritage, the Nile and its national parks with " + excursion.content.partnerName + "."}</p></div>
      <ExcursionLink excursion={excursion} source={placement} className={styles.button}>Explore the excursions <ArrowRight size={18} /></ExcursionLink>
    </div>
  </section>
}

export function ExcursionHeroButton() {
  const excursion = useExcursion()
  if (!excursion?.content.placements.includes("home_hero")) return null
  return <ExcursionLink excursion={excursion} source="home_hero" className="site-button button-gold"><Compass size={18} />{excursion.content.title}<ArrowRight size={18} /></ExcursionLink>
}
