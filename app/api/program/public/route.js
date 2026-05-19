import { NextResponse } from "next/server"
import { serverConfig, serverDatabases, serverQuery } from "@/lib/appwrite-server"

export const dynamic = "force-dynamic"

const jsonError = (message, status = 500) => NextResponse.json({ error: message }, { status })

async function getActiveConference() {
  const response = await serverDatabases.listDocuments(
    serverConfig.databaseId,
    serverConfig.conferencesCollectionId,
    [serverQuery.equal("isActive", true), serverQuery.limit(1)]
  )

  return response.documents[0] || null
}

async function getPublishedProgram(conferenceId) {
  const response = await serverDatabases.listDocuments(
    serverConfig.databaseId,
    serverConfig.programsCollectionId,
    [
      serverQuery.equal("conferenceId", conferenceId),
      serverQuery.equal("status", "PUBLISHED"),
      serverQuery.limit(1),
    ]
  )

  return response.documents[0] || null
}

async function getPublishedSessions(programId) {
  const response = await serverDatabases.listDocuments(
    serverConfig.databaseId,
    serverConfig.sessionsCollectionId,
    [
      serverQuery.equal("programId", programId),
      serverQuery.equal("status", "PUBLISHED"),
      serverQuery.orderAsc("day"),
      serverQuery.orderAsc("startTime"),
      serverQuery.limit(1000),
    ]
  )

  return response.documents
}

async function getProgramTimeBlocks(programId) {
  if (!serverConfig.programTimeBlocksCollectionId) return []

  try {
    const response = await serverDatabases.listDocuments(
      serverConfig.databaseId,
      serverConfig.programTimeBlocksCollectionId,
      [
        serverQuery.equal("programId", programId),
        serverQuery.orderAsc("day"),
        serverQuery.orderAsc("startMinutes"),
        serverQuery.limit(1000),
      ]
    )

    return response.documents
  } catch (error) {
    console.error("Error fetching public program time blocks:", error)
    return []
  }
}

export async function GET() {
  try {
    const activeConference = await getActiveConference()
    if (!activeConference) {
      return jsonError("No active conference found", 404)
    }

    const program = await getPublishedProgram(activeConference.$id)
    if (!program) {
      return jsonError("No published program available for this conference", 404)
    }

    const [sessions, timeBlocks] = await Promise.all([
      getPublishedSessions(program.$id),
      getProgramTimeBlocks(program.$id),
    ])

    return NextResponse.json(
      {
        conference: activeConference,
        program,
        sessions,
        timeBlocks,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    console.error("Error loading public conference program:", error)
    return jsonError("Failed to fetch conference program", 500)
  }
}
