import {
  databases,
  DATABASE_ID,
  CONFERENCES_COLLECTION_ID,
  SESSIONS_COLLECTION_ID,
  PROGRAMS_COLLECTION_ID,
  Query,
} from "./appwrite-config"

export const apiService = {
  // Get active conference
  async getActiveConference() {
    try {
      const response = await databases.listDocuments(DATABASE_ID, CONFERENCES_COLLECTION_ID, [
        Query.equal("isActive", true),
        Query.limit(1),
      ])
      return response.documents.length > 0 ? response.documents[0] : null
    } catch (error) {
      console.error("Error fetching active conference:", error)
      throw new Error("Failed to fetch conference information")
    }
  },

  // Get published program for a conference
  async getPublishedProgram(conferenceId) {
    try {
      const response = await databases.listDocuments(DATABASE_ID, PROGRAMS_COLLECTION_ID, [
        Query.equal("conferenceId", conferenceId),
        Query.equal("status", "PUBLISHED"),
        Query.limit(1),
      ])
      return response.documents.length > 0 ? response.documents[0] : null
    } catch (error) {
      console.error("Error fetching program:", error)
      throw new Error("Failed to fetch conference program")
    }
  },

  // Get published sessions for a program
  async getPublishedSessions(programId) {
    try {
      const response = await databases.listDocuments(DATABASE_ID, SESSIONS_COLLECTION_ID, [
        Query.equal("programId", programId),
        Query.equal("status", "PUBLISHED"),
        Query.orderAsc("day"),
        Query.orderAsc("startTime"),
        Query.limit(1000), // Adjust limit as needed
      ])
      return response.documents
    } catch (error) {
      console.error("Error fetching sessions:", error)
      throw new Error("Failed to fetch conference sessions")
    }
  },

  // Get conference program with sessions
  async getConferenceProgramWithSessions(conferenceId) {
    try {
      const program = await this.getPublishedProgram(conferenceId)
      if (!program) {
        return null
      }

      const sessions = await this.getPublishedSessions(program.$id)

      return {
        program,
        sessions,
      }
    } catch (error) {
      console.error("Error fetching conference program with sessions:", error)
      throw new Error("Failed to fetch conference program")
    }
  },
}
