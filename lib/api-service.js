import {
  databases,
  DATABASE_ID,
  COUPONS_COLLECTION_ID,
  REGISTRANTS_COLLECTION_ID,
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

  // Check if email exists in registrants collection
  async checkEmailExists(email) {
    try {
      const response = await databases.listDocuments(DATABASE_ID, REGISTRANTS_COLLECTION_ID, [
        Query.equal("email", email),
      ])
      return response.documents.length > 0 ? response.documents[0] : null
    } catch (error) {
      console.error("Error checking email:", error)
      throw new Error("Failed to check email")
    }
  },

  // Validate coupon code
  async validateCoupon(couponCode, type='attendee') {
    try {
      console.log("Validating coupon code:", couponCode, "Type:", type)
      const response = await databases.listDocuments(DATABASE_ID, COUPONS_COLLECTION_ID, [
        Query.equal("coupon", couponCode),
        Query.equal("type", type)
      ])

      if (response.documents.length === 0) {
        return { valid: false, error: "Invalid coupon code" }
      }

      const coupon = response.documents[0]

      if (coupon.usersLeft <= 0) {
        return { valid: false, error: "This coupon has no remaining seats" }
      }

      return { valid: true, data: coupon }
    } catch (error) {
      console.error("Error validating coupon:", error)
      throw new Error("Failed to validate coupon")
    }
  },

  // Create new registrant
  async createRegistrant(registrantData) {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        REGISTRANTS_COLLECTION_ID,
        "unique()",
        registrantData,
      )
      return response
    } catch (error) {
      console.error("Error creating registrant:", error)
      throw new Error("Failed to create registration")
    }
  },

  // Create multiple exhibitor members
  async createExhibitorMembers(membersData, sharedData) {
    try {
      const createdMembers = []

      for (const memberData of membersData) {
        const fullRegistrationData = {
          ...sharedData,
          ...memberData,
          registrationType: "Exhibitor",
        }

        const response = await databases.createDocument(
          DATABASE_ID,
          REGISTRANTS_COLLECTION_ID,
          "unique()",
          fullRegistrationData,
        )
        createdMembers.push(response)
      }

      return createdMembers
    } catch (error) {
      console.error("Error creating exhibitor members:", error)
      throw new Error("Failed to create exhibitor registration")
    }
  },

  // Update existing registrant
  async updateRegistrant(documentId, registrantData) {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        REGISTRANTS_COLLECTION_ID,
        documentId,
        registrantData,
      )
      return response
    } catch (error) {
      console.error("Error updating registrant:", error)
      throw new Error("Failed to update registration")
    }
  },

  // Decrement coupon users left
  async decrementCouponUsage(couponId, currentUsersLeft, decrementBy = 1) {
    try {
      const response = await databases.updateDocument(DATABASE_ID, COUPONS_COLLECTION_ID, couponId, {
        usersLeft: currentUsersLeft - decrementBy,
      })
      return response
    } catch (error) {
      console.error("Error updating coupon:", error)
      throw new Error("Failed to update coupon usage")
    }
  },

  // Check exhibitor capacity
  async checkExhibitorCapacity() {
    try {
      const conference = await this.getActiveConference()
      if (!conference || !conference.maxExhibitors) {
        return { hasCapacity: true, remaining: null }
      }

      const response = await databases.listDocuments(DATABASE_ID, REGISTRANTS_COLLECTION_ID, [
        Query.equal("registrationType", "Exhibitor"),
        Query.limit(conference.maxExhibitors + 1), // Get one more to check if at capacity
      ])

      const currentCount = response.documents.length
      const remaining = conference.maxExhibitors - currentCount

      return {
        hasCapacity: remaining > 0,
        remaining: Math.max(0, remaining),
        maxExhibitors: conference.maxExhibitors,
        currentCount,
      }
    } catch (error) {
      console.error("Error checking exhibitor capacity:", error)
      throw new Error("Failed to check exhibitor capacity")
    }
  },

  /**
   * Send confirmation email (placeholder for email service integration)
   * @param {Object} registrationData - Registration data for email content
   * @param {number} year - Conference year
   * @param {string} sponsorshipPackageUrl - URL to sponsorship package (optional)
   * @returns {Promise<boolean>} Success status
   */
  async sendConfirmationEmail(registrationData, year = null, sponsorshipPackageUrl = null) {
    // console.log("Sending confirmation email with data:", registrationData);

    // 1) Get the raw HTML string
    const htmlBody = buildConfirmationEmail(registrationData, year, sponsorshipPackageUrl)

    // 2) Package it up—no stringify on htmlBody
    const emailContent = {
      year: year,
      email: registrationData.email,
      subject: `Renewable Energy Conference ${year} & EXPO: Registration Confirmation`,
      text: htmlBody,
      eventEnd: registrationData.eventEnd,
      eventStart: registrationData.eventStart,
    }
    // console.log("Email content prepared:", emailContent);

    // 3) Send to your server
    const response = await fetch("https://alx.derrickml.com/api/rec/send-reg-confirmation-email", {
      // const response = await fetch("http://localhost:3005/api/rec/send-reg-confirmation-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailContent),
    })

    if (!response.ok) {
      // see exactly what the server replied
      const text = await response.text()
      console.error("Server error:", response.status, text)
      throw new Error(`Failed to send confirmation email: ${response.status}`)
    }

    return true
  },

  // Send confirmation emails for exhibitor members
  async sendExhibitorConfirmationEmails(membersData, sharedData, year = null) {
    // console.log("Preparing to send exhibitor confirmation emails...membersData:", membersData, "sharedData:", sharedData, "Year:", year)
    try {
      const emailPromises = membersData.map((memberData) => {
        const fullRegistrationData = {
          ...sharedData,
          ...memberData,
          registrationType: "Exhibitor",
        }
        return this.sendConfirmationEmail(fullRegistrationData, year, null)
      })

      await Promise.all(emailPromises)
      return true
    } catch (error) {
      console.error("Error sending exhibitor confirmation emails:", error)
      throw new Error("Failed to send confirmation emails")
    }
  },

  // Get published program for a conference
  async getPublishedProgram(conferenceId) {
    try {
      console.log("Fetching published program for conferenceId:", conferenceId)
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
      console.log(`Fetched ${response.documents.length} sessions for programId:`, response.documents)
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

/**
 * Build confirmation email content
 * @param {Object} data - Registration data
 * @returns {string} HTML content for the confirmation email
 */
const buildConfirmationEmail = (data, year = null, sponsorshipPackageUrl = null) => {
  // default to [] if undefined or not an array
  const sector = Array.isArray(data.sector) ? data.sector : []
  const daysAttending = Array.isArray(data.daysAttending) ? data.daysAttending : []
  const conferenceYears = Array.isArray(data.conferenceYears) ? data.conferenceYears : []

  return `
    <div
      style="
        font-family: Arial, sans-serif;
        font-size: 14px;
        background-color: #f9f9f9;
        padding: 20px;
        border-radius: 6px;
        color: #333;
      "
    >
      <h2 style="color: #2a7ae2; margin-top: 0;">
       Renewable Energy Conference ${year} & EXPO Registration Confirmation
      </h2>
      <p style="line-height: 1.5;">
        Thank you for registering. Below are your details:
      </p>
      <table
        cellpadding="0"
        cellspacing="0"
        style="
          border-collapse: collapse;
          width: 100%;
          margin-top: 15px;
        "
      >
        <thead>
          <tr>
            <th
              style="
                background-color: #2a7ae2;
                color: #fff;
                padding: 10px;
                text-align: left;
                border: 1px solid #ddd;
                border-radius: 4px 0 0 0;
              "
            >
              Field
            </th>
            <th
              style="
                background-color: #2a7ae2;
                color: #fff;
                padding: 10px;
                text-align: left;
                border: 1px solid #ddd;
                border-radius: 0 4px 0 0;
              "
            >
              Details
            </th>
          </tr>
        </thead>
        <tbody>
          <tr style="background-color: #fff;">
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>Full Name</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.title} ${data.firstName} ${data.otherName || ""} ${data.lastName}
            </td>
          </tr>
          <tr style="background-color: #f1f1f1;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.email}</td>
          </tr>
          <tr style="background-color: #fff;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Other Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.otherEmail || "N/A"}
            </td>
          </tr>
          <tr style="background-color: #f1f1f1;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.phone}</td>
          </tr>
          <tr style="background-color: #fff;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Other Phone</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.otherPhone || "N/A"}
            </td>
          </tr>
          <tr style="background-color: #f1f1f1;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Organization</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.organization}
            </td>
          </tr>
          <tr style="background-color: #fff;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Sector</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${sector.length ? sector.join(", ") : "N/A"}
            </td>
          </tr>
          <tr style="background-color: #f1f1f1;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>City</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.city}</td>
          </tr>
          <tr style="background-color: #fff;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>State/Region</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.stateRegion}
            </td>
          </tr>
          <tr style="background-color: #f1f1f1;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Country</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.country}
            </td>
          </tr>
          <tr style="background-color: #fff;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Registration Type</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.registrationType}
            </td>
          </tr>
          ${
            data.registrationType && data.registrationType.toLowerCase() === "exhibitor"
              ? `
          <tr style="background-color: #f1f1f1;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Exhibition Details</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.exhibitionDetails || "N/A"}
            </td>
          </tr>
          `
              : ""
          }
          ${
            data.registrationType && data.registrationType.toLowerCase() === "sponsor" && sponsorshipPackageUrl
              ? `
          <tr style="background-color: #f1f1f1;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Sponsorship Package</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <a href="${sponsorshipPackageUrl}" target="_blank" rel="noopener noreferrer" 
                 style="color: #2a7ae2; text-decoration: none;">
                📄 View Sponsorship Package Details
              </a>
            </td>
          </tr>
          `
              : ""
          }
          <tr style="background-color: #f1f1f1;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Days Attending</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${daysAttending.length ? daysAttending.join(", ") : "N/A"}
            </td>
          </tr>
          <tr style="background-color: #fff;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Visa Letter Required</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.visaLetterRequired ? "Yes" : "No"}
            </td>
          </tr>
          <tr style="background-color: #f1f1f1;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Additional Comments</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${data.additionalComments || "N/A"}
            </td>
          </tr>
          <tr style="background-color: #fff;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Conference Attended</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${conferenceYears.length ? conferenceYears.join(", ") : "N/A"}
            </td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top: 20px; line-height: 1.5;">
        We look forward to seeing you at the event!
      </p>
    </div>
  `
}
