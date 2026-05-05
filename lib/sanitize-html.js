import DOMPurify from "isomorphic-dompurify"

export function sanitizeRichHtml(html) {
  return DOMPurify.sanitize(String(html || ""), {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "span"],
    ALLOWED_ATTR: ["class"],
  })
}
