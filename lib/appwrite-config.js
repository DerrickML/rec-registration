import { Client, Databases, Query } from "appwrite"

const client = new Client()

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://appwrite.nrep.ug/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "66bcc8450005201fa1af")

export const databases = new Databases(client)

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "66bcc8760033a24883f6"
export const COUPONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID || "6874e7d00006ce94ab43"
export const REGISTRANTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_REGISTRANTS_COLLECTION_ID || "6863affd00058c01e424"
export const CONFERENCES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CONFERENCES_COLLECTION_ID || "6863ae070028061694f1"
export const SESSIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_COLLECTION_ID || "68e60fc1003b0bbb05d8"
export const PROGRAMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROGRAMS_COLLECTION_ID || "your_programs_collection_id"

export { Query }
