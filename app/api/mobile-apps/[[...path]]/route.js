import { fetchHrPortalBinary, fetchHrPortalJson } from "@/lib/hr-portal-api"
import { safeAppStoreRedirect } from "@/lib/mobile-apps"

export const runtime = "nodejs"
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
const fail = (message, status) => Response.json({ error: message }, { status, headers })

export async function GET(request, context) {
  try {
    const { path = [] } = await context.params
    const conferenceId = new URL(request.url).searchParams.get("conferenceId") || ""
    if (conferenceId && !/^[\w.-]{1,36}$/.test(conferenceId)) return fail("Select a valid conference.", 400)
    const query = new URLSearchParams(conferenceId ? { conferenceId } : {})
    if (!path.length) {
      const configuration = await fetchHrPortalJson(`/api/v1/rec/apps?${query}`, { signal: AbortSignal.timeout(30000) })
      return Response.json(configuration, { headers })
    }
    if (path.length !== 1 || !["android", "ios"].includes(path[0])) return fail("Not found.", 404)
    const range = request.headers.get("range")
    if (range && !/^bytes=\d+-\d*$/.test(range)) return fail("Only a single byte range is supported.", 416)
    const response = await fetchHrPortalBinary(`/api/v1/rec/apps/${path[0]}?${query}`, { method: request.method === "HEAD" ? "HEAD" : "GET", redirect: "manual", signal: request.signal, headers: range ? { Range: range } : undefined, timeout: 600000 })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel()
      const destination = response.headers.get("location")
      if (!safeAppStoreRedirect(destination, path[0])) return fail("The app destination is unavailable.", 502)
      return new Response(null, { status: 307, headers: { ...headers, Location: destination } })
    }
    if (!response.ok) {
      await response.body?.cancel()
      return fail(response.status === 404 ? "This app download is currently unavailable." : response.status === 416 ? "The requested byte range is unavailable." : "Unable to download the REC app. Please try again.", [404, 409, 416].includes(response.status) ? response.status : 502)
    }
    if (path[0] !== "android" || response.headers.get("content-type")?.split(";")[0] !== "application/vnd.android.package-archive") {
      await response.body?.cancel()
      return fail("The app download is unavailable.", 502)
    }
    const output = new Headers(headers)
    output.set("Content-Type", "application/vnd.android.package-archive")
    const filename = /filename="(REC-\d+\.apk)"/.exec(response.headers.get("content-disposition") || "")?.[1] || "REC.apk"
    output.set("Content-Disposition", `attachment; filename="${filename}"`)
    for (const key of ["content-length", "content-range", "accept-ranges", "x-rec-apk-sha256"]) if (response.headers.has(key)) output.set(key, response.headers.get(key))
    if (request.method === "HEAD") await response.body?.cancel()
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers: output })
  } catch (error) {
    return fail(error.status === 404 ? "This app download is currently unavailable." : "Unable to load REC app information. Please try again.", error.status === 404 ? 404 : 502)
  }
}
export const HEAD = GET
