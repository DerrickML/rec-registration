import { Query } from "appwrite"

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const apiKey = process.env.APPWRITE_API_KEY
const registrationServerBaseUrl = process.env.REGISTRATION_SERVER_BASE_URL || "https://server.nrep.ug"
const registrationEmailApiPath =
  process.env.REGISTRATION_EMAIL_API_PATH || "/api/rec/send-reg-confirmation-email"
const registrationOtpEmailApiPath =
  process.env.REGISTRATION_OTP_EMAIL_API_PATH || "/api/rec/send-registration-otp-email"

function registrationApiUrl(path) {
  const base = registrationServerBaseUrl.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalizedPath}`
}

function registrationEmailApiUrl() {
  return process.env.REGISTRATION_EMAIL_API_URL || registrationApiUrl(registrationEmailApiPath)
}

function registrationOtpEmailApiUrl() {
  if (process.env.REGISTRATION_OTP_EMAIL_API_URL) {
    return process.env.REGISTRATION_OTP_EMAIL_API_URL
  }

  return registrationApiUrl(registrationOtpEmailApiPath)
}

export const serverConfig = {
  databaseId: process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  couponsCollectionId: process.env.APPWRITE_COUPONS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID,
  registrantsCollectionId:
    process.env.APPWRITE_REGISTRANTS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_REGISTRANTS_COLLECTION_ID,
  conferencesCollectionId:
    process.env.APPWRITE_CONFERENCES_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_CONFERENCES_COLLECTION_ID,
  sessionsCollectionId:
    process.env.APPWRITE_SESSIONS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_COLLECTION_ID,
  programsCollectionId:
    process.env.APPWRITE_PROGRAMS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_PROGRAMS_COLLECTION_ID,
  programTimeBlocksCollectionId:
    process.env.APPWRITE_PROGRAM_TIME_BLOCKS_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROGRAM_TIME_BLOCKS_COLLECTION_ID ||
    "rec_program_time_blocks",
  locksCollectionId: process.env.APPWRITE_LOCKS_COLLECTION_ID,
  verificationsCollectionId: process.env.APPWRITE_VERIFICATIONS_COLLECTION_ID,
  tokenSecret: process.env.REGISTRATION_TOKEN_SECRET || process.env.APPWRITE_API_KEY || "development-only-secret",
  emailApiUrl: registrationEmailApiUrl(),
  otpEmailApiUrl: registrationOtpEmailApiUrl(),
}

const requiredConfigKeys = [
  "databaseId",
  "couponsCollectionId",
  "registrantsCollectionId",
  "conferencesCollectionId",
  "locksCollectionId",
  "verificationsCollectionId",
]

export function assertServerConfig() {
  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Server Appwrite credentials are not configured")
  }

  const missing = requiredConfigKeys.filter((key) => !serverConfig[key])
  if (missing.length > 0) {
    throw new Error(`Missing Appwrite server config: ${missing.join(", ")}`)
  }
}

export function appwriteApiUrl(path) {
  const base = String(endpoint || "").replace(/\/+$/, "")
  const versionedBase = base.endsWith("/v1") ? base : `${base}/v1`
  return `${versionedBase}${path}`
}

async function request(path, { method = "GET", body } = {}) {
  assertServerConfig()
  const url = appwriteApiUrl(path)

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "X-Appwrite-Response-Format": "1.9.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    const error = new Error(`Appwrite request failed: ${response.status} ${path} ${text}`)
    error.status = response.status
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

function documentPath(databaseId, collectionId, documentId = "") {
  const base = `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents`
  return documentId ? `${base}/${encodeURIComponent(documentId)}` : base
}

function withQueries(path, queries = []) {
  if (!queries.length) return path
  const params = new URLSearchParams()
  queries.forEach((query) => params.append("queries[]", typeof query === "string" ? query : JSON.stringify(query)))
  return `${path}?${params.toString()}`
}

export const serverDatabases = {
  listDocuments(databaseId, collectionId, queries = []) {
    return request(withQueries(documentPath(databaseId, collectionId), queries))
  },

  getDocument(databaseId, collectionId, documentId) {
    return request(documentPath(databaseId, collectionId, documentId))
  },

  createDocument(databaseId, collectionId, documentId, data) {
    return request(documentPath(databaseId, collectionId), {
      method: "POST",
      body: { documentId, data },
    })
  },

  updateDocument(databaseId, collectionId, documentId, data) {
    return request(documentPath(databaseId, collectionId, documentId), {
      method: "PATCH",
      body: { data },
    })
  },

  deleteDocument(databaseId, collectionId, documentId) {
    return request(documentPath(databaseId, collectionId, documentId), {
      method: "DELETE",
    })
  },
}

export const serverQuery = {
  equal: Query.equal,
  limit: Query.limit,
  orderAsc: Query.orderAsc,
  orderDesc: Query.orderDesc,
}
