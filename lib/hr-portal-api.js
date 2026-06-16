import { NextResponse } from "next/server"

const hrPortalBaseUrl = process.env.HR_PORTAL_BASE_URL || "https://hr.nrep.ug"

function getHrUrl(path) {
  const base = hrPortalBaseUrl.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalizedPath}`
}

async function readJson(request) {
  if (!request) return undefined
  const text = await request.text()
  return text ? JSON.parse(text) : undefined
}

export async function fetchHrPortalJson(path, { method = "GET", body, bearerToken, cache = "no-store" } = {}) {
  const headers = {
    "Content-Type": "application/json",
  }
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`

  const response = await fetch(getHrUrl(path), {
    method,
    cache,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || "HR portal request failed")
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export async function proxyHrPortalJson(path, request, { method = "GET" } = {}) {
  try {
    const body = method === "GET" ? undefined : await readJson(request)
    const authHeader = request?.headers?.get("authorization") || ""
    const payload = await fetchHrPortalJson(path, {
      method,
      body,
      bearerToken: authHeader.replace(/^Bearer\s+/i, ""),
    })
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      error.payload || { error: error.message || "HR portal request failed" },
      { status: error.status || 500 }
    )
  }
}
