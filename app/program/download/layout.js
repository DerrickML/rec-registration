import {
  createRouteMetadata,
  getActiveConferenceForSeo,
  getConferenceTitle,
} from "@/lib/seo"

export async function generateMetadata() {
  const conference = await getActiveConferenceForSeo()

  return createRouteMetadata({
    title: `Download Program - ${conference?.shortName || getConferenceTitle(conference)}`,
    description:
      "Download the Renewable Energy Conference & Expo program as a PDF for offline planning and reference.",
    path: "/program/download",
    image: conference?.heroImageUrl || conference?.logoUrl,
  })
}

export default function DownloadProgramLayout({ children }) {
  return children
}
