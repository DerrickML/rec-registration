import {
  createRouteMetadata,
  getActiveConferenceForSeo,
  getConferenceTitle,
} from "@/lib/seo"

export async function generateMetadata() {
  const conference = await getActiveConferenceForSeo()
  return createRouteMetadata({
    title: `Conference Reports - ${conference?.shortName || getConferenceTitle(conference)}`,
    description: "Read official reports, proceedings, outcomes, and publications from previous Renewable Energy Conference & Expo editions.",
    path: "/media/reports",
    image: conference?.heroImageUrl || conference?.logoUrl,
  })
}

export default function ConferenceReportsLayout({ children }) {
  return children
}
