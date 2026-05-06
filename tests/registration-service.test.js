import { describe, expect, it, vi } from "vitest"
import { createRegistrationService } from "../lib/registration-service"

const config = {
  databaseId: "db",
  couponsCollectionId: "coupons",
  registrantsCollectionId: "registrants",
  conferencesCollectionId: "conferences",
  locksCollectionId: "locks",
  verificationsCollectionId: "verifications",
  tokenSecret: "test-secret",
}

const query = {
  equal: (field, value) => ({ type: "equal", field, value }),
  limit: (value) => ({ type: "limit", value }),
  orderDesc: (field) => ({ type: "orderDesc", field }),
}

function matches(row, queries) {
  return queries.every((item) => {
    if (item.type !== "equal") return true
    return row[item.field] === item.value
  })
}

function createDb(seed = {}) {
  const tables = {
    conferences: [],
    registrants: [],
    coupons: [],
    locks: [],
    verifications: [],
    ...seed,
  }

  const db = {
    tables,
    async listDocuments(_databaseId, collectionId, queries = []) {
      let documents = [...tables[collectionId]]
      documents = documents.filter((row) => matches(row, queries))
      if (queries.some((item) => item.type === "orderDesc")) {
        const field = queries.find((item) => item.type === "orderDesc").field
        documents.sort((a, b) => String(b[field] || "").localeCompare(String(a[field] || "")))
      }
      const limit = queries.find((item) => item.type === "limit")?.value
      return { documents: limit ? documents.slice(0, limit) : documents }
    },
    async getDocument(_databaseId, collectionId, documentId) {
      const row = tables[collectionId].find((item) => item.$id === documentId)
      if (!row) throw Object.assign(new Error("Not found"), { status: 404 })
      return row
    },
    async createDocument(_databaseId, collectionId, documentId, data) {
      if (tables[collectionId].some((item) => item.$id === documentId)) {
        throw Object.assign(new Error("Conflict"), { status: 409 })
      }
      const row = {
        $id: documentId,
        $createdAt: new Date().toISOString(),
        ...data,
      }
      tables[collectionId].push(row)
      return row
    },
    async updateDocument(_databaseId, collectionId, documentId, data) {
      const row = await this.getDocument(_databaseId, collectionId, documentId)
      Object.assign(row, data)
      return row
    },
    async deleteDocument(_databaseId, collectionId, documentId) {
      const index = tables[collectionId].findIndex((item) => item.$id === documentId)
      if (index >= 0) tables[collectionId].splice(index, 1)
      return null
    },
  }

  return db
}

function activeConference(overrides = {}) {
  return {
    $id: "conf",
    isActive: true,
    registrationOpen: true,
    couponRequired: false,
    startDate: "2025-10-20T09:00:00Z",
    endDate: "2025-10-22T18:00:00Z",
    days: JSON.stringify([{ label: "Day 1" }]),
    ...overrides,
  }
}

function attendeeInput(overrides = {}) {
  return {
    email: "new@example.com",
    registrationType: "Attendee",
    title: "Ms.",
    firstName: "New",
    lastName: "Person",
    phone: "+256700000000",
    organization: "Org",
    sector: ["Solar"],
    city: "Kampala",
    stateRegion: "Central",
    country: "UG",
    daysAttending: ["Day 1"],
    couponCode: "SAVE10",
    ...overrides,
  }
}

function service(db, mailer = {}) {
  return createRegistrationService({
    databases: db,
    query,
    config,
    mailer: {
      sendOtp: vi.fn().mockResolvedValue(true),
      sendConfirmation: vi.fn().mockResolvedValue(true),
      ...mailer,
    },
    now: () => new Date("2026-05-05T12:00:00Z"),
    otpGenerator: () => "123456",
    tokenGenerator: () => "edit-token",
  })
}

async function verifiedNewRegistrationToken(svc, email = "new@example.com") {
  await svc.start({ email })
  const verified = await svc.verifyEdit({ email, otp: "123456" })
  return verified.editToken
}

async function verifiedExistingRegistrationToken(svc, email) {
  await svc.start({ email })
  const verified = await svc.verifyEdit({ email, otp: "123456" })
  return verified.editToken
}

describe("registration service", () => {
  it("fails closed when the active conference is closed", async () => {
    const db = createDb({ conferences: [activeConference({ registrationOpen: false })] })
    await expect(service(db).start({ email: "a@example.com" })).rejects.toMatchObject({ status: 403 })
  })

  it("requires OTP for new emails before registration can continue", async () => {
    const mailer = { sendOtp: vi.fn().mockResolvedValue(true) }
    const db = createDb({
      conferences: [activeConference()],
    })

    const svc = service(db, mailer)
    const start = await svc.start({ email: "NEW@example.com" })

    expect(start).toEqual({
      status: "otp_required",
      email: "new@example.com",
      couponRequired: false,
      mode: "new",
      message: "A verification code has been sent to your email address.",
    })
    expect(mailer.sendOtp).toHaveBeenCalledWith("new@example.com", "123456", 10)

    const verified = await svc.verifyEdit({ email: "new@example.com", otp: "123456" })
    expect(verified.status).toBe("verified_new")
    expect(verified.email).toBe("new@example.com")
    expect(verified.editToken).toBe("edit-token")
    expect(verified.registrant).toBeUndefined()
  })

  it("requires OTP for existing emails without leaking registrant data", async () => {
    const mailer = { sendOtp: vi.fn().mockResolvedValue(true) }
    const db = createDb({
      conferences: [activeConference()],
      registrants: [{ $id: "reg1", email: "old@example.com", firstName: "Secret" }],
    })

    const result = await service(db, mailer).start({ email: "OLD@example.com" })

    expect(result).toEqual({
      status: "otp_required",
      email: "old@example.com",
      couponRequired: false,
      mode: "existing",
      message: "A verification code has been sent to your email address.",
    })
    expect(result.registrant).toBeUndefined()
    expect(mailer.sendOtp).toHaveBeenCalledWith("old@example.com", "123456", 10)
  })

  it("rejects wrong OTP attempts and verifies the correct code", async () => {
    const db = createDb({
      conferences: [activeConference()],
      registrants: [{ $id: "reg1", email: "old@example.com", firstName: "Old", conferenceYears: [2025] }],
    })
    const svc = service(db)

    await svc.start({ email: "old@example.com" })
    await expect(svc.verifyEdit({ email: "old@example.com", otp: "000000" })).rejects.toMatchObject({
      status: 401,
    })

    const verified = await svc.verifyEdit({ email: "old@example.com", otp: "123456" })
    expect(verified.status).toBe("verified")
    expect(verified.editToken).toBe("edit-token")
    expect(verified.registrationMode).toBe("edit-current")
    expect(verified.alreadyRegisteredForCurrentConference).toBe(true)
    expect(verified.activeConferenceYear).toBe(2025)
    expect(verified.registrant.email).toBe("old@example.com")
    expect(verified.registrant.conferenceYears).toEqual([2025])
  })

  it("marks existing emails from past conferences as returning current-conference registrations", async () => {
    const db = createDb({
      conferences: [activeConference()],
      registrants: [{ $id: "reg1", email: "old@example.com", firstName: "Old", conferenceYears: [2024] }],
    })
    const svc = service(db)

    await svc.start({ email: "old@example.com" })
    const verified = await svc.verifyEdit({ email: "old@example.com", otp: "123456" })

    expect(verified.status).toBe("verified")
    expect(verified.registrationMode).toBe("returning-current")
    expect(verified.alreadyRegisteredForCurrentConference).toBe(false)
    expect(verified.activeConferenceYear).toBe(2025)
    expect(verified.conferenceDefaults.conferenceYears).toEqual([2025])
    expect(verified.registrant.conferenceYears).toEqual([2024])
  })

  it("creates a new attendee and decrements coupon once", async () => {
    const db = createDb({
      conferences: [activeConference()],
      coupons: [{ $id: "coupon1", coupon: "SAVE10", type: "Attendee", usersLeft: 2, organization: "Org", sector: "Solar" }],
    })

    const svc = service(db)
    const editToken = await verifiedNewRegistrationToken(svc)
    const result = await svc.submit(attendeeInput({ editToken }))

    expect(result.status).toBe("registered")
    expect(db.tables.registrants).toHaveLength(1)
    expect(db.tables.registrants[0].conferenceYears).toEqual([2025])
    expect(db.tables.coupons[0].usersLeft).toBe(1)
  })

  it("rejects new registration submission before email verification", async () => {
    const db = createDb({
      conferences: [activeConference()],
      coupons: [{ $id: "coupon1", coupon: "SAVE10", type: "Attendee", usersLeft: 2, organization: "Org", sector: "Solar" }],
    })

    await expect(service(db).submit(attendeeInput())).rejects.toMatchObject({ status: 401 })
    expect(db.tables.registrants).toHaveLength(0)
    expect(db.tables.coupons[0].usersLeft).toBe(2)
  })

  it("creates a new attendee without a coupon when coupons are optional", async () => {
    const db = createDb({
      conferences: [activeConference({ couponRequired: false })],
    })

    const svc = service(db)
    const editToken = await verifiedNewRegistrationToken(svc)
    const result = await svc.submit(attendeeInput({ couponCode: "", editToken }))

    expect(result.status).toBe("registered")
    expect(db.tables.registrants).toHaveLength(1)
    expect(db.tables.registrants[0].coupon).toBeNull()
    expect(db.tables.coupons).toHaveLength(0)
  })

  it("rejects a new attendee without a coupon when coupons are required", async () => {
    const db = createDb({
      conferences: [activeConference({ couponRequired: true })],
    })

    const svc = service(db)
    const editToken = await verifiedNewRegistrationToken(svc)

    await expect(svc.submit(attendeeInput({ couponCode: "", editToken }))).rejects.toMatchObject({
      status: 400,
    })
    expect(db.tables.registrants).toHaveLength(0)
  })

  it("updates an existing active-year registration without requiring or redeeming a coupon", async () => {
    const db = createDb({
      conferences: [activeConference({ couponRequired: true })],
      registrants: [
        {
          $id: "reg1",
          email: "old@example.com",
          conferenceYears: [2025],
          coupon: "PREVIOUS",
          registrationType: "Attendee",
        },
      ],
      coupons: [{ $id: "coupon1", coupon: "SAVE10", type: "Attendee", usersLeft: 2, organization: "Org", sector: "Solar" }],
    })

    const svc = service(db)
    const editToken = await verifiedExistingRegistrationToken(svc, "old@example.com")
    const result = await svc.submit(attendeeInput({ email: "old@example.com", couponCode: "", editToken }))

    expect(result.status).toBe("registered")
    expect(db.tables.registrants).toHaveLength(1)
    expect(db.tables.registrants[0].conferenceYears).toEqual([2025])
    expect(db.tables.registrants[0].coupon).toBe("PREVIOUS")
    expect(db.tables.coupons[0].usersLeft).toBe(2)
  })

  it("requires a coupon when an old registration is added to the active conference year", async () => {
    const db = createDb({
      conferences: [activeConference({ couponRequired: true })],
      registrants: [
        {
          $id: "reg1",
          email: "old@example.com",
          conferenceYears: [2024],
          registrationType: "Attendee",
        },
      ],
    })

    const svc = service(db)
    const editToken = await verifiedExistingRegistrationToken(svc, "old@example.com")

    await expect(
      svc.submit(attendeeInput({ email: "old@example.com", couponCode: "", editToken }))
    ).rejects.toMatchObject({ status: 400 })
    expect(db.tables.registrants[0].conferenceYears).toEqual([2024])
  })

  it("redeems a coupon once when an old registration is added to the active conference year", async () => {
    const db = createDb({
      conferences: [activeConference({ couponRequired: true })],
      registrants: [
        {
          $id: "reg1",
          email: "old@example.com",
          conferenceYears: [2024],
          registrationType: "Attendee",
        },
      ],
      coupons: [{ $id: "coupon1", coupon: "SAVE10", type: "Attendee", usersLeft: 2, organization: "Org", sector: "Solar" }],
    })

    const svc = service(db)
    const editToken = await verifiedExistingRegistrationToken(svc, "old@example.com")
    const result = await svc.submit(attendeeInput({ email: "old@example.com", editToken }))

    expect(result.status).toBe("registered")
    expect(db.tables.registrants).toHaveLength(1)
    expect(db.tables.registrants[0].conferenceYears).toEqual([2024, 2025])
    expect(db.tables.registrants[0].coupon).toBe("SAVE10")
    expect(db.tables.coupons[0].usersLeft).toBe(1)
  })

  it("rejects coupon oversell", async () => {
    const db = createDb({
      conferences: [activeConference()],
      coupons: [{ $id: "coupon1", coupon: "SAVE10", type: "Attendee", usersLeft: 0, organization: "Org", sector: "Solar" }],
    })

    const svc = service(db)
    const editToken = await verifiedNewRegistrationToken(svc)

    await expect(svc.submit(attendeeInput({ editToken }))).rejects.toMatchObject({ status: 409 })
    expect(db.tables.registrants).toHaveLength(0)
  })

  it("keeps a successful registration when confirmation email fails", async () => {
    const db = createDb({
      conferences: [activeConference()],
      coupons: [{ $id: "coupon1", coupon: "SAVE10", type: "Attendee", usersLeft: 1, organization: "Org", sector: "Solar" }],
    })

    const svc = service(db, { sendConfirmation: vi.fn().mockRejectedValue(new Error("mail down")) })
    const editToken = await verifiedNewRegistrationToken(svc)
    const result = await svc.submit(attendeeInput({ editToken }))

    expect(result.status).toBe("registered")
    expect(result.warnings).toEqual(["Confirmation email could not be sent to new@example.com"])
    expect(db.tables.registrants).toHaveLength(1)
  })
})
