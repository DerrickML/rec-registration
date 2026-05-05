import {
  createRouteMetadata,
  getActiveConferenceForSeo,
  getConferenceTitle,
} from "@/lib/seo"

export async function generateMetadata() {
  const conference = await getActiveConferenceForSeo()
  const venue = conference?.venue || "conference venue"

  return createRouteMetadata({
    title: `Venue & Travel - ${conference?.shortName || getConferenceTitle(conference)}`,
    description: `Find venue details, directions, travel guidance, accommodation information, and visa notes for ${venue}.`,
    path: "/venue",
    image: conference?.heroImageUrl || conference?.logoUrl,
  })
}

export default function VenueLayout({ children }) {
  return children
}
