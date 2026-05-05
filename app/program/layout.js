import {
  createRouteMetadata,
  getActiveConferenceForSeo,
  getConferenceTitle,
} from "@/lib/seo"

export async function generateMetadata() {
  const conference = await getActiveConferenceForSeo()

  return createRouteMetadata({
    title: `Program - ${conference?.shortName || getConferenceTitle(conference)}`,
    description:
      "Browse the published Renewable Energy Conference & Expo program by day, session, speaker, and venue hall.",
    path: "/program",
    image: conference?.heroImageUrl || conference?.logoUrl,
  })
}

export default function ProgramLayout({ children }) {
  return children
}
