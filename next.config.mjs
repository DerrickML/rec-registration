/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return ["/badge/:path*", "/api/badges/:path*", "/scanner/:path*", "/api/scanner/:path*"].map((source) => ({ source, headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      ...(source === "/scanner/:path*" ? [{ key: "Permissions-Policy", value: "serial=(self)" }] : []),
    ] }))
  },
}

export default nextConfig
