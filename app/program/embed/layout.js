import { createRouteMetadata } from "@/lib/seo"

export const metadata = createRouteMetadata({
  title: "Embedded Program",
  description: "Embedded conference program view.",
  path: "/program/embed",
  noIndex: true,
})

export default function EmbeddedProgramLayout({ children }) {
  return children
}
