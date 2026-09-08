import {
  absoluteUrl,
  getActiveConferenceForSeo,
  publicSitemapRoutes,
} from "@/lib/seo"
import { getExcursionCatalog } from "@/lib/excursions-server"

export default async function sitemap() {
  const conference = await getActiveConferenceForSeo()
  const lastModified = conference?.$updatedAt
    ? new Date(conference.$updatedAt)
    : new Date()

  const excursions = await getExcursionCatalog().catch(() => ({ documents: [] }))
  return [...publicSitemapRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  })), ...excursions.documents.map(excursion => ({ url: absoluteUrl(`/explore-uganda/${excursion.slug}`), changeFrequency: "weekly", priority: 0.6 }))]
}
