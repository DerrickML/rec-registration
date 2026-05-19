const PUBLIC_PROGRAM_TIMEOUT_MS = 15000

export async function fetchPublicProgramData() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PUBLIC_PROGRAM_TIMEOUT_MS)

  try {
    const response = await fetch("/api/program/public", {
      signal: controller.signal,
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch conference program")
    }

    return data
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The conference program request timed out. Please refresh and try again.")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
