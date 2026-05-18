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
export const PROGRAM_TIME_BLOCKS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROGRAM_TIME_BLOCKS_COLLECTION_ID || "rec_program_time_blocks"
export const SPONSOR_CATEGORIES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SPONSOR_CATEGORIES_COLLECTION_ID || "rec_sponsor_categories"
export const SPONSORS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SPONSORS_COLLECTION_ID || "rec_sponsors"

export { Query }
