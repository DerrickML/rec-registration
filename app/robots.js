import { absoluteUrl } from "@/lib/seo"

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/program/embed"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
