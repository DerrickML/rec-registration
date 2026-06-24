import { Query } from "appwrite"

const DEFAULT_SITE_URL = "https://rec.nrep.ug"
const SITE_NAME = "Renewable Energy Conference & Expo"
const SITE_SHORT_NAME = "REC & Expo"
const DEFAULT_DESCRIPTION =
  "Renewable Energy Conference & Expo brings together policymakers, investors, innovators, and practitioners advancing clean energy in Uganda and Africa."

function normalizeSiteUrl(value) {
  const raw = String(value || DEFAULT_SITE_URL).trim()
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/+$/, "")
}

export function getSiteUrl() {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL
  )
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getSiteUrl()}${normalizedPath}`
}

export function cleanText(value, fallback = DEFAULT_DESCRIPTION, maxLength = 170) {
  const text = String(value || fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trim()}...`
}

export function buildPageTitle(title) {
  if (!title) return SITE_NAME
  return title.includes(SITE_SHORT_NAME) || title.includes(SITE_NAME)
    ? title
    : `${title} | ${SITE_SHORT_NAME}`
}

export function createRouteMetadata({
  title,
  description,
  path = "/",
  image,
  noIndex = false,
}) {
  const resolvedTitle = buildPageTitle(title)
  const resolvedDescription = cleanText(description)
  const url = absoluteUrl(path)
  const images = image ? [{ url: absoluteUrl(image), width: 1200, height: 630 }] : undefined

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url,
      siteName: SITE_NAME,
      type: "website",
      images,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: resolvedTitle,
      description: resolvedDescription,
      images: image ? [absoluteUrl(image)] : undefined,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": /** @type {"large"} */ ("large"),
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  }
}

function appwriteApiUrl(path) {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
  if (!endpoint) return ""
  const base = endpoint.replace(/\/+$/, "")
  const versionedBase = base.endsWith("/v1") ? base : `${base}/v1`
  return `${versionedBase}${path}`
}

function collectionDocumentsPath(databaseId, collectionId) {
  return `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents`
}

async function listPublicDocuments(collectionId, queries = []) {
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT

  if (!endpoint || !databaseId || !projectId || !collectionId) return []

  const params = new URLSearchParams()
  queries.forEach((query) => params.append("queries[]", query))

  const response = await fetch(
    `${appwriteApiUrl(collectionDocumentsPath(databaseId, collectionId))}?${params.toString()}`,
    {
      headers: {
        "X-Appwrite-Project": projectId,
      },
      next: { revalidate: 300 },
    }
  )

  if (!response.ok) return []

  const payload = await response.json()
  return payload.documents || []
}

export async function getActiveConferenceForSeo() {
  const conferencesCollectionId =
    process.env.NEXT_PUBLIC_APPWRITE_CONFERENCES_COLLECTION_ID ||
    process.env.APPWRITE_CONFERENCES_COLLECTION_ID

  const documents = await listPublicDocuments(conferencesCollectionId, [
    Query.equal("isActive", true),
    Query.limit(1),
  ])

  return documents[0] || null
}

export function getConferenceTitle(conference) {
  return conference?.title || conference?.shortName || SITE_NAME
}

export function getConferenceDescription(conference, maxLength = 170) {
  return cleanText(
    conference?.description ||
      conference?.heroTagline ||
      conference?.theme ||
      DEFAULT_DESCRIPTION,
    DEFAULT_DESCRIPTION,
    maxLength
  )
}

function toDateOnly(value) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

export function createWebsiteJsonLd(conference) {
  const siteUrl = getSiteUrl()
  const title = getConferenceTitle(conference)
  const description = getConferenceDescription(conference)

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: title,
        alternateName: SITE_SHORT_NAME,
        url: siteUrl,
        description,
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "National Renewable Energy Platform",
        alternateName: "NREP",
        url: "https://nrep.ug",
        logo: absoluteUrl("/NREP.png"),
      },
    ],
  }
}

export function createEventJsonLd(conference) {
  if (!conference?.startDate || !conference?.endDate) return null

  const siteUrl = getSiteUrl()
  const image = conference.heroImageUrl || conference.logoUrl
  const event = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${siteUrl}/#event`,
    name: getConferenceTitle(conference),
    description: getConferenceDescription(conference, 250),
    url: siteUrl,
    startDate: toDateOnly(conference.startDate),
    endDate: toDateOnly(conference.endDate),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: [
      {
        "@type": "Organization",
        name: "National Renewable Energy Platform",
        url: "https://nrep.ug",
      },
      {
        "@type": "Organization",
        name: "Ministry of Energy and Mineral Development",
        url: "https://memd.go.ug/",
      },
    ],
  }

  if (image) {
    event.image = [absoluteUrl(image)]
  }

  if (conference.venue || conference.location) {
    event.location = {
      "@type": "Place",
      name: conference.venue || conference.location,
      address: {
        "@type": "PostalAddress",
        addressLocality: conference.location || "Kampala",
        addressCountry: "UG",
      },
    }
  }

  if (conference.registrationOpen) {
    event.offers = {
      "@type": "Offer",
      url: absoluteUrl("/register"),
      availability: "https://schema.org/InStock",
    }
  }

  return event
}

export const publicSitemapRoutes = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/program", priority: 0.9, changeFrequency: "daily" },
  { path: "/program/download", priority: 0.6, changeFrequency: "weekly" },
  { path: "/register", priority: 0.9, changeFrequency: "daily" },
  { path: "/sponsors", priority: 0.75, changeFrequency: "weekly" },
  { path: "/media", priority: 0.7, changeFrequency: "weekly" },
  { path: "/venue", priority: 0.75, changeFrequency: "monthly" },
]
