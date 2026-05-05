import {
  createRouteMetadata,
  getActiveConferenceForSeo,
  getConferenceTitle,
} from "@/lib/seo"

export async function generateMetadata() {
  const conference = await getActiveConferenceForSeo()
  const title = `About ${conference?.shortName || getConferenceTitle(conference)}`

  return createRouteMetadata({
    title,
    description:
      conference?.theme ||
      "Learn about the Renewable Energy Conference & Expo, its theme, objectives, exhibition, and role in advancing clean energy collaboration.",
    path: "/about",
    image: conference?.heroImageUrl || conference?.logoUrl,
  })
}

export default function AboutLayout({ children }) {
  return children
}
