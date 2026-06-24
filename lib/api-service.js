import {
  databases,
  DATABASE_ID,
  CONFERENCES_COLLECTION_ID,
  SESSIONS_COLLECTION_ID,
  PROGRAMS_COLLECTION_ID,
  PROGRAM_TIME_BLOCKS_COLLECTION_ID,
  SPONSOR_CATEGORIES_COLLECTION_ID,
  SPONSORS_COLLECTION_ID,
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

  // Get configured public schedule blocks for a program
  async getProgramTimeBlocks(programId) {
    if (!PROGRAM_TIME_BLOCKS_COLLECTION_ID) {
      return []
    }

    try {
      const response = await databases.listDocuments(DATABASE_ID, PROGRAM_TIME_BLOCKS_COLLECTION_ID, [
        Query.equal("programId", programId),
        Query.orderAsc("day"),
        Query.orderAsc("startMinutes"),
        Query.limit(1000),
      ])
      return response.documents
    } catch (error) {
      console.error("Error fetching program time blocks:", error)
      return []
    }
  },

  // Get conference program with sessions
  async getConferenceProgramWithSessions(conferenceId) {
    try {
      const program = await this.getPublishedProgram(conferenceId)
      if (!program) {
        return null
      }

      const [sessions, timeBlocks] = await Promise.all([
        this.getPublishedSessions(program.$id),
        this.getProgramTimeBlocks(program.$id),
      ])

      return {
        program,
        sessions,
        timeBlocks,
      }
    } catch (error) {
      console.error("Error fetching conference program with sessions:", error)
      throw new Error("Failed to fetch conference program")
    }
  },

  async getSponsorCategories(conferenceId) {
    if (!SPONSOR_CATEGORIES_COLLECTION_ID || !conferenceId) {
      return []
    }

    try {
      const response = await databases.listDocuments(DATABASE_ID, SPONSOR_CATEGORIES_COLLECTION_ID, [
        Query.equal("conferenceId", conferenceId),
        Query.equal("isActive", true),
        Query.orderAsc("displayOrder"),
        Query.limit(200),
      ])
      return response.documents
    } catch (error) {
      console.error("Error fetching sponsor categories:", error)
      return []
    }
  },

  async getSponsors(conferenceId) {
    if (!SPONSORS_COLLECTION_ID || !conferenceId) {
      return []
    }

    try {
      const response = await databases.listDocuments(DATABASE_ID, SPONSORS_COLLECTION_ID, [
        Query.equal("conferenceId", conferenceId),
        Query.equal("isActive", true),
        Query.orderAsc("displayOrder"),
        Query.limit(500),
      ])
      return response.documents
    } catch (error) {
      console.error("Error fetching sponsors:", error)
      return []
    }
  },

  async getConferenceSponsors(conferenceId) {
    const [categories, sponsors] = await Promise.all([
      this.getSponsorCategories(conferenceId),
      this.getSponsors(conferenceId),
    ])

    return { categories, sponsors }
  },

  async getConferenceMedia(conferenceId, options = {}) {
    if (!conferenceId) {
      return { documents: [], total: 0, page: 1, limit: options.limit || 25, totalPages: 1 }
    }

    const params = new URLSearchParams({
      conferenceId,
      page: String(options.page || 1),
      limit: String(options.limit || 25),
    })
    if (options.type) params.set("type", options.type)
    if (options.featured) params.set("featured", "true")

    try {
      const response = await fetch(`/api/media/public?${params.toString()}`, {
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to load conference media")
      return payload
    } catch (error) {
      console.error("Error fetching conference media:", error)
      return { documents: [], total: 0, page: 1, limit: options.limit || 25, totalPages: 1 }
    }
  },

  async getMediaConferences() {
    try {
      const response = await fetch("/api/media/conferences", {
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to load media conferences")
      return payload
    } catch (error) {
      console.error("Error fetching media conferences:", error)
      return { documents: [], total: 0 }
    }
  },
}
