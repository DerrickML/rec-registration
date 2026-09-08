import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, MapPin, Clock3, ArrowDown, ArrowLeft } from "lucide-react"
import Navbar from "@/components/layout/navbar"
import Footer from "@/components/layout/footer"
import { getExcursion } from "@/lib/excursions-server"
import { excursionEdition } from "@/lib/excursions"
import { createRouteMetadata } from "@/lib/seo"
import { ExcursionPageView, PartnerLink } from "@/components/excursions/excursion-engagement"
import styles from "@/components/excursions/excursions.module.css"
export const dynamic = "force-dynamic"
export async function generateMetadata({ params }) {
  const excursion = await getExcursion((await params).slug)
  if (!excursion) return { title: "Excursion not found", robots: { index: false } }
  return createRouteMetadata({ title: `${excursion.content.title} / ${excursionEdition(excursion)}`, description: excursion.content.introduction, path: `/explore-uganda/${excursion.slug}`, image: excursion.content.heroImage })
}
export default async function ExcursionPage({ params }) {
  const excursion = await getExcursion((await params).slug)
  if (!excursion) notFound()
  const { content, conference } = excursion
  const past = excursion.status === "archived" || Date.now() >= Date.parse(excursion.endsAt)
  return <div className={styles.page}>
    <Navbar conference={conference} />
    <main>
      <ExcursionPageView slug={excursion.slug} />
      <section className={styles.hero}>
        <img src={content.heroImage} alt={content.heroAlt} fetchPriority="high" className={styles.heroPhoto} />
        <div className={styles.heroContent}><p className={styles.eyebrow}>{excursionEdition(excursion)} / Delegate excursions</p><h1>{content.title}</h1><p className={styles.heroLead}>Beyond the conference. A little more Uganda.</p><a href="#experiences" className={styles.button}>Discover the experiences <ArrowDown size={18} /></a></div>
        <span className={styles.photoCredit}>Photography: {content.partnerName}</span>
      </section>
      {past && <div className={styles.archive} role="status">This is an archived {excursionEdition(excursion)} excursion page. The listed dates have ended. Contact {content.partnerName} for current options.</div>}
      <section className={styles.intro}>
        <div className={styles.partner}>{content.partnerLogo && <img src={content.partnerLogo} alt={content.partnerName} width="176" height="64" />}<span>Excursions operated by <strong>{content.partnerName}</strong></span></div>
        <h2>Make time for the journey</h2><p className={styles.introCopy}>{content.introduction}</p>
        <div className={styles.facts}><div><CalendarDays size={22} /><div><h3>When</h3><p>{content.dateLabel}</p></div></div><div><MapPin size={22} /><div><h3>Departure</h3><p>{content.departure}</p></div></div></div>
        {!past && <PartnerLink excursion={excursion}>View itineraries with {content.partnerName}</PartnerLink>}
      </section>
      <div id="experiences" className={styles.experiences}>
        {[["day", "A day of discovery", "Day trips"], ["multiday", "Go a little further", "Multi-day safaris"]].map(([group, title, label]) => {
          const items = content.packages.filter(item => item.group === group)
          return items.length > 0 && <section key={group} className={styles.group}><p className={styles.eyebrow}>{label}</p><h2>{title}</h2><div className={styles.cards}>{items.map((item, index) => <article className={styles.card} key={`${group}-${index}`}><img src={item.image} alt={item.imageAlt} loading="lazy" width="640" height="427" /><div className={styles.cardBody}><p className={styles.duration}><Clock3 size={15} />{item.duration}</p><h3>{item.title}</h3><p>{item.summary}</p><PartnerLink excursion={excursion} subtle>Explore with {content.partnerName}</PartnerLink></div></article>)}</div></section>
        })}
      </div>
      <section className={styles.planning}>
        <div className={styles.inner}><p className={styles.eyebrow}>Before you go</p><h2>{past ? "Planning another visit?" : `Plan your excursion with ${content.partnerName}`}</h2><p>{content.planningNotes}</p><div className={styles.contact}>{content.contactEmail && <a href={`mailto:${content.contactEmail}`}>{content.contactEmail}</a>}{content.contactPhone && <a href={`tel:${content.contactPhone.replace(/\s/g, "")}`}>{content.contactPhone}</a>}</div><PartnerLink excursion={excursion}>Visit {content.partnerName}</PartnerLink><Link href="/program" className={styles.backLink}><ArrowLeft size={16} /> Back to the conference program</Link></div>
      </section>
    </main>
    <Footer conference={conference} />
  </div>
}
