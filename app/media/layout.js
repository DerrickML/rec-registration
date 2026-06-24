import {
  createRouteMetadata,
  getActiveConferenceForSeo,
  getConferenceTitle,
} from "@/lib/seo"

export async function generateMetadata() {
  const conference = await getActiveConferenceForSeo()
  const title = `Media - ${conference?.shortName || getConferenceTitle(conference)}`

  return createRouteMetadata({
    title,
    description: "Browse conference albums and video highlights from the Renewable Energy Conference & Expo.",
    path: "/media",
    image: conference?.heroImageUrl || conference?.logoUrl,
  })
}

export default function MediaLayout({ children }) {
  return children
}
