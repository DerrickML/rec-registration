import {
  createRouteMetadata,
  getActiveConferenceForSeo,
  getConferenceTitle,
} from "@/lib/seo"
import { conferenceRegistrationNotice } from "@/lib/registration-notice.mjs"

export async function generateMetadata() {
  const conference = await getActiveConferenceForSeo()
  const title = `Register for ${conference?.shortName || getConferenceTitle(conference)}`
  const description = conference?.registrationOpen
    ? "Register for the Renewable Energy Conference & Expo as an attendee, exhibitor, or participant."
    : conferenceRegistrationNotice(conference).message

  return createRouteMetadata({
    title,
    description,
    path: "/register",
    image: conference?.heroImageUrl || conference?.logoUrl,
  })
}

export default function RegisterLayout({ children }) {
  return children
}
