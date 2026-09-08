import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, ExternalLink, Images, PlayCircle } from "lucide-react"

export default function MediaShowcase({ conference, items = [] }) {
  const visible = items.filter((item) => item.isPublished !== false).slice(0, 3)
  if (!visible.length) return null
  return (
    <section className="site-section">
      <div className="site-container">
        <div className="section-heading">
          <div>
            <p className="site-kicker">Conference media</p>
            <h2>Moments from {conference?.shortName || "REC"}.</h2>
          </div>
          <Link href="/media" className="site-text-link">
            All photos & videos <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="media-grid">
          {visible.map((item) => (
            <article className="media-card" key={item.$id}>
              <a
                className="media-cover"
                href={
                  item.mediaType === "video" ? item.videoUrl : item.externalUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.title}
              >
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt={item.title}
                    width={720}
                    height={480}
                  />
                ) : item.mediaType === "video" ? (
                  <PlayCircle size={40} />
                ) : (
                  <Images size={40} />
                )}
              </a>
              <h2>{item.title}</h2>
              <a
                href={
                  item.mediaType === "video" ? item.videoUrl : item.externalUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="site-text-link"
              >
                {item.mediaType === "video" ? "Watch video" : "View album"}{" "}
                <ExternalLink size={16} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
