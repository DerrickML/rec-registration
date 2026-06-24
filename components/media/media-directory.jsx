"use client"

import { useMemo, useState } from "react"
import { ExternalLink, Images, PlayCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

const filters = [
  { value: "all", label: "All" },
  { value: "image_album", label: "Albums" },
  { value: "video", label: "Videos" },
]

function itemUrl(item) {
  return item.mediaType === "video" ? item.videoUrl : item.externalUrl
}

export default function MediaDirectory({ items = [] }) {
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items
      .filter((item) => filter === "all" || item.mediaType === filter)
      .filter((item) => {
        if (!query) return true
        return [item.title, item.description].some((value) => String(value || "").toLowerCase().includes(query))
      })
  }, [filter, items, search])

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search media"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#0B7186]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`h-11 rounded-xl px-4 text-sm font-extrabold transition ${
                filter === option.value
                  ? "bg-[#0B7186] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-[#0B7186] hover:text-[#0B7186]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Images className="mx-auto mb-3 h-10 w-10 text-[#0B7186]" />
          <h2 className="text-xl font-extrabold text-slate-950">No media available</h2>
          <p className="mt-2 text-sm text-slate-600">Published albums and videos will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <article key={item.$id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-56 bg-slate-100">
                {item.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverImageUrl} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#054653] text-white">
                    {item.mediaType === "video" ? <PlayCircle className="h-12 w-12" /> : <Images className="h-12 w-12" />}
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-[#054653] shadow-sm">
                  {item.mediaType === "video" ? "Video" : "Image album"}
                </span>
              </div>
              <div className="grid gap-4 p-5">
                <div>
                  <h2 className="text-xl font-extrabold leading-snug text-slate-950">{item.title}</h2>
                  {item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}
                </div>
                {item.mediaType === "image_album" && item.sampleImages?.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {item.sampleImages.slice(0, 4).map((image) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={image.fileId} src={image.url} alt={image.name || item.title} className="h-14 w-full rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                <a href={itemUrl(item)} target="_blank" rel="noopener noreferrer">
                  <Button className="h-11 w-full rounded-lg bg-[#0B7186] font-bold text-white hover:bg-[#054653]">
                    {item.mediaType === "video" ? "Watch video" : "View full album"}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
