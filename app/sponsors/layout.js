import {
  createRouteMetadata,
  getActiveConferenceForSeo,
  getConferenceTitle,
} from "@/lib/seo"

export async function generateMetadata() {
  const conference = await getActiveConferenceForSeo()
  const title = `Sponsors & Partners - ${conference?.shortName || getConferenceTitle(conference)}`

  return createRouteMetadata({
    title,
    description:
      "Meet the sponsors and partners supporting the Renewable Energy Conference & Expo.",
    path: "/sponsors",
    image: conference?.heroImageUrl || conference?.logoUrl,
  })
}

export default function SponsorsLayout({ children }) {
  return children
}
