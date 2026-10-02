export function availableAppPlatforms(configuration, now = Date.now()) {
  if (!configuration?.enabled) return []
  return (configuration.platforms || []).filter(p => p.available && ["android", "ios"].includes(p.platform)
    && (p.source !== "testflight" || Date.parse(p.expiresAt) > now))
}

export function appPageUrl(conferenceId, source = "") {
  return `/app?${new URLSearchParams({ ...(conferenceId ? { conferenceId } : {}), ...(source ? { source } : {}) })}`
}

export function appDownloadUrl(conferenceId, platform) {
  return `/api/mobile-apps/${platform}?${new URLSearchParams({ conferenceId })}`
}

export function apkReleaseDetails(release) {
  const hasCode = Number.isInteger(release?.versionCode) && release.versionCode > 0
  const name = typeof release?.versionName === "string" ? release.versionName.trim() : ""
  const published = Date.parse(release?.publishedAt)
  return [
    ["Version", name ? `${name}${hasCode ? ` (code ${release.versionCode})` : ""}` : hasCode ? `Build ${release.versionCode}` : null],
    ["File size", Number.isFinite(release?.size) && release.size > 0 ? `${(release.size / 1_000_000).toFixed(1)} MB` : null],
    ["Minimum Android API", Number.isInteger(release?.minSdk) && release.minSdk > 0 ? String(release.minSdk) : null],
    ["Published", Number.isFinite(published) ? `${new Intl.DateTimeFormat("en-UG", { timeZone: "Africa/Kampala", dateStyle: "medium" }).format(new Date(published))} (EAT)` : null],
    ["SHA-256 checksum", /^[a-f0-9]{64}$/i.test(release?.sha256 || "") ? release.sha256 : null],
  ].filter(([, value]) => value !== null)
}

export function safeAppStoreRedirect(value, platform) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false
    if (platform === "android") return url.hostname === "play.google.com" && url.pathname === "/store/apps/details"
      && /^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+$/.test(url.searchParams.get("id") || "")
      && [...url.searchParams.keys()].every(key => ["id", "hl", "gl"].includes(key))
    return (url.hostname === "apps.apple.com" && /^(?:\/[a-z]{2})?\/app\/(?:[^/]+\/)?id\d+\/?$/.test(url.pathname)
      && [...url.searchParams.keys()].every(key => ["l", "mt", "pt", "ct"].includes(key)))
      || (url.hostname === "testflight.apple.com" && /^\/join\/[A-Za-z0-9]{8}\/?$/.test(url.pathname) && !url.search)
  } catch { return false }
}
