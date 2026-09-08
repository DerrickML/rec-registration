import "server-only"
import { cache } from "react"
import { fetchHrPortalJson } from "@/lib/hr-portal-api"
export const getExcursion = cache(async slug => {
  try {
    return (await fetchHrPortalJson(`/api/v1/rec/excursions/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(8000) })).excursion
  } catch (error) { if (error.status === 404) return null; throw error }
})
export async function getExcursionCatalog() {
  return fetchHrPortalJson("/api/v1/rec/excursions?catalog=true", { signal: AbortSignal.timeout(8000) })
}
