"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { ExternalLink, Images, PlayCircle, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const filters = [
  { value: "all", label: "All media" },
  { value: "image_album", label: "Albums" },
  { value: "video", label: "Videos" },
]
const itemUrl = (item) =>
  item.mediaType === "video" ? item.videoUrl : item.externalUrl

export default function MediaDirectory({ items = [] }) {
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [preview, setPreview] = useState(null)
  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => filter === "all" || item.mediaType === filter)
        .filter((item) =>
          [item.title, item.description].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(search.trim().toLowerCase())
          )
        ),
    [filter, items, search]
  )

  return (
    <section className="site-container site-section">
      <div className="directory-toolbar">
        <label className="directory-search">
          <span className="sr-only">Search media</span>
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search albums and videos"
            type="search"
          />
        </label>
        <div className="segmented-control" aria-label="Media type">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">
        {filteredItems.length} media items
      </p>
      {!filteredItems.length ? (
        <div className="empty-state">
          <Images size={30} />
          <h2>
            {items.length ? "No matching media" : "No media published yet"}
          </h2>
          <p>
            {items.length
              ? "Try a different search or media type."
              : "Albums and videos will appear here once published."}
          </p>
          {items.length > 0 && (
            <button
              onClick={() => {
                setFilter("all")
                setSearch("")
              }}
              className="site-text-link"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="media-grid">
          {filteredItems.map((item) => (
            <article key={item.$id} className="media-card">
              <a
                className="media-cover"
                href={itemUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.mediaType === "video" ? "Watch" : "Open album"}: ${item.title} (opens in a new tab)`}
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
                <span>
                  {item.mediaType === "video" ? "Video" : "Photo album"}
                </span>
              </a>
              <h2>{item.title}</h2>
              {item.description && <p>{item.description}</p>}
              {item.mediaType === "image_album" &&
                item.sampleImages?.length > 1 && (
                  <div className="media-thumbnails">
                    {item.sampleImages.slice(0, 4).map((photo, index) => (
                      <button
                        key={photo.fileId || index}
                        onClick={() => setPreview({ photo, item })}
                        aria-label={`Preview photo ${index + 1} from ${item.title}`}
                      >
                        <Image
                          src={photo.url}
                          alt=""
                          width={180}
                          height={135}
                        />
                      </button>
                    ))}
                  </div>
                )}
              <a
                href={itemUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                className="site-text-link"
              >
                {item.mediaType === "video" ? "Watch video" : "View full album"}
                <ExternalLink size={16} />
              </a>
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="pr-8">{preview?.item.title}</DialogTitle>
            <DialogDescription>From the conference album</DialogDescription>
          </DialogHeader>
          {preview && (
            <>
              <Image
                src={preview.photo.url}
                alt={`Photograph from ${preview.item.title}`}
                width={1080}
                height={720}
                className="max-h-[60svh] w-full object-contain"
              />
              <a
                href={preview.item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="site-text-link"
              >
                View full album <ExternalLink size={16} />
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
