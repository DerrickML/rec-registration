import { readFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const sharedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function loadSharedEnv(file) {
  let text = ""
  try {
    text = readFileSync(file, "utf8")
  } catch {
    return
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue
    process.env[key] = trimmed.slice(eq + 1)
  }
}

if (process.env.NODE_ENV !== "production") loadSharedEnv(path.join(sharedRoot, ".env"))

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return ["/badge/:path*", "/api/badges/:path*", "/scanner", "/api/scanner/:path*"].map((source) => ({ source, headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ] }))
  },
}

export default nextConfig
