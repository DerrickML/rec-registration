import Link from "next/link"
import { ArrowRight, Images, PlayCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

function mediaLabel(item) {
  return item.mediaType === "video" ? "Video" : "Image album"
}

function mediaUrl(item) {
  return item.mediaType === "video" ? item.videoUrl : item.externalUrl
}

export default function MediaShowcase({ conference, items = [] }) {
  const visibleItems = items.filter((item) => item?.isPublished !== false).slice(0, 8)
  if (!visibleItems.length) return null

  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-[#0B7186]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#0B7186]">
              <Images className="h-4 w-4" />
              Conference media
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Highlights from {conference?.shortName || "the conference"}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Browse selected albums and videos from the Renewable Energy Conference & Expo.
            </p>
          </div>
          <Link href="/media">
            <Button className="h-11 rounded-lg bg-[#0B7186] px-5 font-bold text-white hover:bg-[#054653]">
              View all media
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3">
          {visibleItems.map((item) => (
            <a
              key={item.$id}
              href={mediaUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl sm:w-[340px]"
            >
              <div className="relative h-48 bg-slate-100">
                {item.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverImageUrl} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#054653] text-white">
                    {item.mediaType === "video" ? <PlayCircle className="h-10 w-10" /> : <Images className="h-10 w-10" />}
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-[#054653] shadow-sm">
                  {mediaLabel(item)}
                </span>
              </div>
              <div className="p-5">
                <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-slate-950 group-hover:text-[#0B7186]">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p>
                )}
                <div className="mt-4 inline-flex items-center text-sm font-bold text-[#0B7186]">
                  {item.mediaType === "video" ? "Watch video" : "View full album"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
