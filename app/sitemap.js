import {
  absoluteUrl,
  getActiveConferenceForSeo,
  publicSitemapRoutes,
} from "@/lib/seo"

export default async function sitemap() {
  const conference = await getActiveConferenceForSeo()
  const lastModified = conference?.$updatedAt
    ? new Date(conference.$updatedAt)
    : new Date()

  return publicSitemapRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
