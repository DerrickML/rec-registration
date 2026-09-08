import Image from "next/image"
import { REC_PHOTOS } from "@/lib/conference-display"

export default function ConferencePhoto({
  photo = "expo",
  caption = true,
  className = "",
  priority = false,
}) {
  const asset = REC_PHOTOS[photo] || REC_PHOTOS.expo
  return (
    <figure className={`conference-photo ${className}`}>
      <Image
        src={asset.src}
        alt={asset.alt}
        width={1080}
        height={720}
        priority={priority}
      />
      {caption && (
        <figcaption>REC25 & EXPO / From the conference archive</figcaption>
      )}
    </figure>
  )
}
