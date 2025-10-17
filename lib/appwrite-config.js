import { Client, Databases, Query } from "appwrite"

const client = new Client()

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)

export const databases = new Databases(client)

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
export const COUPONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID
export const REGISTRANTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_REGISTRANTS_COLLECTION_ID
export const CONFERENCES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CONFERENCES_COLLECTION_ID
export const SESSIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_COLLECTION_ID
export const PROGRAMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROGRAMS_COLLECTION_ID

export { Query }
