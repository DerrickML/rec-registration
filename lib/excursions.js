export const EXCURSION_SOURCES = ["home_hero", "home", "about", "program", "media", "venue", "nav", "footer", "direct"]
export function excursionSource(value) { return EXCURSION_SOURCES.includes(value) ? value : "direct" }
export function excursionPath(excursion, source = "direct") {
  return `/explore-uganda/${encodeURIComponent(excursion.slug)}?from=${excursionSource(source)}`
}
export function isExcursionPromoted(excursion, now = Date.now()) {
  return Boolean(excursion?.publishedAt && excursion.status === "published" &&
    Date.parse(excursion.promotionStart) <= now && now < Date.parse(excursion.promotionEnd) && now < Date.parse(excursion.endsAt))
}
function attributedDestination(value, excursion, source) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return null
    url.searchParams.set("utm_source", "rec.nrep.ug")
    url.searchParams.set("utm_medium", "referral")
    url.searchParams.set("utm_campaign", excursion.slug)
    url.searchParams.set("utm_content", excursionSource(source))
    return url.toString()
  } catch { return null }
}
export function partnerDestination(excursion, source = "direct") {
  return attributedDestination(excursion.content.partnerUrl, excursion, source)
}
export function usesExternalDestination(excursion) {
  return excursion?.content?.destinationMode === "external"
}
export function excursionDestination(excursion, source = "direct") {
  if (!usesExternalDestination(excursion)) return excursionPath(excursion, source)
  try {
    const url = new URL(excursion.content.destinationUrl)
    const path = decodeURIComponent(url.pathname).replace(/\/+/g, "/")
    if (["rec.nrep.ug", "www.rec.nrep.ug"].includes(url.hostname) && /^\/explore-uganda(?:\/|$)/i.test(path)) return null
    return attributedDestination(url.toString(), excursion, source)
  } catch { return null }
}
export function excursionEdition(excursion) {
  return excursion.conference?.year ? `REC${String(excursion.conference.year).slice(-2)} & EXPO` : excursion.conference?.title || "REC & EXPO"
}
