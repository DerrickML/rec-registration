import {
  EDIT_TOKEN_TTL_MS,
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
  buildAttendeeRegistrant,
  buildExhibitorRegistrants,
  cleanForDatabase,
  deriveConferenceFields,
  generateOtp,
  generateToken,
  hashSecret,
  httpError,
  isExpired,
  lockIdFor,
  normalizeEmail,
  normalizeRegistrationType,
  sanitizeRegistrantForEdit,
  validateAttendeeInput,
  validateExhibitorMembers,
  validateRegistrationInput,
} from "./registration-utils"
import crypto from "crypto"

function addMs(date, ms) {
  return new Date(date.getTime() + ms).toISOString()
}

function documentId() {
  return crypto.randomUUID()
}

const NEW_REGISTRATION_REGISTRANT_ID = "__new_registration__"

async function firstDocument(databases, config, collectionId, queries) {
  const response = await databases.listDocuments(config.databaseId, collectionId, queries)
  return response.documents?.[0] || null
}

export function createRegistrationService({
  databases,
  query,
  config,
  mailer,
  now = () => new Date(),
  otpGenerator = generateOtp,
  tokenGenerator = generateToken,
} = {}) {
  if (!databases || !query || !config || !mailer) {
    throw new Error("Registration service requires databases, query, config, and mailer")
  }

  const activeConference = async () => {
    const conference = await firstDocument(databases, config, config.conferencesCollectionId, [
      query.equal("isActive", true),
      query.limit(1),
    ])

    if (!conference) {
      throw httpError(503, "Registration is unavailable because no active conference is configured")
    }

    if (!conference.registrationOpen) {
      throw httpError(403, conference.regClosedMessage || "Registration is closed")
    }

    return conference
  }

  const findRegistrantByEmail = async (email) => {
    return firstDocument(databases, config, config.registrantsCollectionId, [
      query.equal("email", email),
      query.limit(1),
    ])
  }

  const findCoupon = async (couponCode, registrationType) => {
    const response = await databases.listDocuments(config.databaseId, config.couponsCollectionId, [
      query.equal("coupon", couponCode),
      query.limit(10),
    ])

    const type = registrationType.toLowerCase()
    return (
      response.documents?.find((coupon) => String(coupon.type || "").toLowerCase() === type) ||
      null
    )
  }

  const createVerification = async (data) => {
    return databases.createDocument(
      config.databaseId,
      config.verificationsCollectionId,
      documentId(),
      data
    )
  }

  const createVerifiedEmailToken = async ({ email, registrantId, purpose }) => {
    const token = tokenGenerator()
    await createVerification({
      email,
      purpose,
      tokenHash: hashSecret(token, config.tokenSecret),
      registrantId,
      attempts: 0,
      consumed: false,
      expiresAt: addMs(now(), EDIT_TOKEN_TTL_MS),
    })
    return token
  }

  const verifyEmailToken = async ({ email, token, purpose }) => {
    if (!token) {
      throw httpError(401, "Please verify your email before continuing")
    }

    const tokenHash = hashSecret(token, config.tokenSecret)
    const verification = await firstDocument(databases, config, config.verificationsCollectionId, [
      query.equal("email", email),
      query.equal("purpose", purpose),
      query.equal("tokenHash", tokenHash),
      query.equal("consumed", false),
      query.limit(1),
    ])

    if (!verification || isExpired(verification.expiresAt, now())) {
      throw httpError(401, "Your verified email session has expired. Please verify your email again.")
    }

    return verification
  }

  const consumeVerification = async (verification) => {
    await databases.updateDocument(config.databaseId, config.verificationsCollectionId, verification.$id, {
      consumed: true,
    })
  }

  const findPendingOtpVerification = async (email) => {
    const candidates = await Promise.all(
      ["edit", "new-registration"].map((purpose) =>
        firstDocument(databases, config, config.verificationsCollectionId, [
          query.equal("email", email),
          query.equal("purpose", purpose),
          query.equal("consumed", false),
          query.orderDesc("$createdAt"),
          query.limit(1),
        ])
      )
    )

    return candidates
      .filter(Boolean)
      .sort((a, b) => String(b.$createdAt || "").localeCompare(String(a.$createdAt || "")))[0] || null
  }

  const acquireLock = async (scope) => {
    const id = lockIdFor(scope)
    const expiresAt = addMs(now(), 30000)

    try {
      await databases.createDocument(config.databaseId, config.locksCollectionId, id, {
        scope,
        expiresAt,
      })
      return id
    } catch {
      try {
        const current = await databases.getDocument(config.databaseId, config.locksCollectionId, id)
        if (isExpired(current.expiresAt, now())) {
          await databases.deleteDocument(config.databaseId, config.locksCollectionId, id)
          await databases.createDocument(config.databaseId, config.locksCollectionId, id, {
            scope,
            expiresAt,
          })
          return id
        }
      } catch {
        // If stale-lock cleanup races, fall through to the conflict response.
      }

      throw httpError(409, "Registration is busy. Please try again.")
    }
  }

  const releaseLock = async (lockId) => {
    if (!lockId) return
    try {
      await databases.deleteDocument(config.databaseId, config.locksCollectionId, lockId)
    } catch {
      // Stale lock cleanup is best-effort; locks expire server-side by timestamp.
    }
  }

  const checkExhibitorCapacity = async (conference, requestedCount = 1) => {
    if (!conference.maxExhibitors) {
      return { hasCapacity: true, remaining: null }
    }

    const response = await databases.listDocuments(config.databaseId, config.registrantsCollectionId, [
      query.equal("registrationType", "Exhibitor"),
      query.limit(Number(conference.maxExhibitors) + requestedCount),
    ])

    const currentCount = response.documents?.length || 0
    const remaining = Number(conference.maxExhibitors) - currentCount
    return {
      hasCapacity: remaining >= requestedCount,
      remaining: Math.max(0, remaining),
      maxExhibitors: Number(conference.maxExhibitors),
      currentCount,
    }
  }

  const validateCouponCapacity = (coupon, decrementBy) => {
    if (!coupon) {
      throw httpError(400, "Invalid coupon code")
    }
    if (Number(coupon.usersLeft) < decrementBy) {
      throw httpError(409, "This coupon has no remaining seats")
    }
  }

  const decrementCoupon = async (coupon, decrementBy) => {
    const next = Number(coupon.usersLeft) - decrementBy
    await databases.updateDocument(config.databaseId, config.couponsCollectionId, coupon.$id, {
      usersLeft: next,
    })
  }

  const rollbackCoupon = async (coupon, decrementBy) => {
    if (!coupon) return
    try {
      const current = await databases.getDocument(config.databaseId, config.couponsCollectionId, coupon.$id)
      await databases.updateDocument(config.databaseId, config.couponsCollectionId, coupon.$id, {
        usersLeft: Number(current.usersLeft) + decrementBy,
      })
    } catch {
      // The caller will surface the original failure; operators can reconcile from logs.
    }
  }

  const sendConfirmations = async (registrants) => {
    const warnings = []
    for (const registrant of registrants) {
      try {
        await mailer.sendConfirmation(registrant, registrant.conferenceYears?.at(-1) || null)
      } catch {
        warnings.push(`Confirmation email could not be sent to ${registrant.email}`)
      }
    }
    return warnings
  }

  const activeConferenceYear = (conference) => {
    return deriveConferenceFields(conference).conferenceYears[0]
  }

  const registrantHasConferenceYear = (registrant, year) => {
    return Array.isArray(registrant?.conferenceYears) && registrant.conferenceYears.includes(year)
  }

  const mergeConferenceYears = (registrant, year) => {
    const years = Array.isArray(registrant?.conferenceYears) ? registrant.conferenceYears : []
    return years.includes(year) ? years : [...years, year]
  }

  return {
    async start({ email }) {
      const normalizedEmail = normalizeEmail(email)
      const conference = await activeConference()
      const couponRequired = conference.couponRequired === true
      const existing = await findRegistrantByEmail(normalizedEmail)
      const mode = existing ? "existing" : "new"
      const purpose = existing ? "edit" : "new-registration"

      const otp = otpGenerator()
      await createVerification({
        email: normalizedEmail,
        purpose,
        codeHash: hashSecret(otp, config.tokenSecret),
        registrantId: existing?.$id || NEW_REGISTRATION_REGISTRANT_ID,
        attempts: 0,
        consumed: false,
        expiresAt: addMs(now(), OTP_TTL_MS),
      })

      await mailer.sendOtp(normalizedEmail, otp, OTP_TTL_MS / 60000)

      return {
        status: "otp_required",
        email: normalizedEmail,
        couponRequired,
        mode,
        message: "A verification code has been sent to your email address.",
      }
    },

    async verifyEdit({ email, otp }) {
      const normalizedEmail = normalizeEmail(email)
      const conference = await activeConference()
      const verification = await findPendingOtpVerification(normalizedEmail)

      if (!verification || isExpired(verification.expiresAt, now())) {
        throw httpError(401, "The verification code is invalid or expired")
      }

      if (Number(verification.attempts || 0) >= MAX_OTP_ATTEMPTS) {
        throw httpError(429, "Too many invalid verification attempts")
      }

      if (verification.codeHash !== hashSecret(String(otp || ""), config.tokenSecret)) {
        await databases.updateDocument(
          config.databaseId,
          config.verificationsCollectionId,
          verification.$id,
          { attempts: Number(verification.attempts || 0) + 1 }
        )
        throw httpError(401, "The verification code is invalid or expired")
      }

      await databases.updateDocument(config.databaseId, config.verificationsCollectionId, verification.$id, {
        consumed: true,
      })

      if (verification.purpose === "new-registration") {
        const editToken = await createVerifiedEmailToken({
          email: normalizedEmail,
          registrantId: NEW_REGISTRATION_REGISTRANT_ID,
          purpose: "registration-token",
        })

        return {
          status: "verified_new",
          email: normalizedEmail,
          couponRequired: conference.couponRequired === true,
          editToken,
          conferenceDefaults: deriveConferenceFields(conference),
        }
      }

      const registrant = await databases.getDocument(
        config.databaseId,
        config.registrantsCollectionId,
        verification.registrantId
      )
      const currentConferenceYear = activeConferenceYear(conference)
      const alreadyRegisteredForCurrentConference = registrantHasConferenceYear(registrant, currentConferenceYear)
      const editToken = await createVerifiedEmailToken({
        email: normalizedEmail,
        registrantId: registrant.$id,
        purpose: "edit-token",
      })

      return {
        status: "verified",
        email: normalizedEmail,
        couponRequired: conference.couponRequired === true,
        editToken,
        registrationMode: alreadyRegisteredForCurrentConference ? "edit-current" : "returning-current",
        activeConferenceYear: currentConferenceYear,
        alreadyRegisteredForCurrentConference,
        conferenceDefaults: deriveConferenceFields(conference),
        registrant: sanitizeRegistrantForEdit(registrant),
      }
    },

    async couponPreview({ couponCode, registrationType }) {
      const type = normalizeRegistrationType(registrationType)
      await activeConference()
      const coupon = await findCoupon(String(couponCode || "").trim(), type)
      if (!coupon || Number(coupon.usersLeft) <= 0) {
        throw httpError(400, "Invalid coupon code")
      }

      return {
        valid: true,
        coupon: {
          organization: coupon.organization,
          sector: coupon.sector,
          usersLeft: coupon.usersLeft,
        },
      }
    },

    async exhibitorCapacity() {
      const conference = await activeConference()
      return checkExhibitorCapacity(conference)
    },

    async submit(input) {
      const conference = await activeConference()
      const couponRequired = conference.couponRequired === true
      const currentConferenceYear = activeConferenceYear(conference)
      const submittedEmail = normalizeEmail(input.email)
      const existing = await findRegistrantByEmail(submittedEmail)
      const isEditing = Boolean(existing)
      const alreadyRegisteredForCurrentYear = registrantHasConferenceYear(existing, currentConferenceYear)
      const requiresNewConferenceSeat = !isEditing || !alreadyRegisteredForCurrentYear
      const base = validateRegistrationInput(input, conference, {
        requireCoupon: requiresNewConferenceSeat && couponRequired,
      })
      let emailVerification = null

      if (isEditing) {
        emailVerification = await verifyEmailToken({
          email: base.email,
          token: input.editToken,
          purpose: "edit-token",
        })
      } else {
        emailVerification = await verifyEmailToken({
          email: base.email,
          token: input.editToken,
          purpose: "registration-token",
        })
      }

      if (base.registrationType === "Exhibitor") {
        validateExhibitorMembers(input.members)
      } else {
        validateAttendeeInput(input)
      }

      const lockId = await acquireLock("registration-submit")
      let coupon = null
      let couponDecremented = false
      let savedRegistrants = []

      try {
        const decrementBy = base.registrationType === "Exhibitor" ? input.members.length : 1
        const hasCoupon = Boolean(base.couponCode)

        if (requiresNewConferenceSeat) {
          if (base.registrationType === "Exhibitor") {
            const capacity = await checkExhibitorCapacity(conference, decrementBy)
            if (!capacity.hasCapacity) {
              throw httpError(409, "Exhibitor registration is at full capacity")
            }
          }

          if (hasCoupon) {
            coupon = await findCoupon(base.couponCode, base.registrationType)
            validateCouponCapacity(coupon, decrementBy)
            await decrementCoupon(coupon, decrementBy)
            couponDecremented = true
          }
        }

        if (base.registrationType === "Exhibitor") {
          const couponForRecord = requiresNewConferenceSeat ? base.couponCode : existing?.coupon || null
          const registrants = buildExhibitorRegistrants(
            { ...input, registrationType: base.registrationType },
            conference,
            couponForRecord
          )

          if (isEditing) {
            const updatedRegistrant = {
              ...registrants[0],
              conferenceYears: mergeConferenceYears(existing, currentConferenceYear),
            }
            const updated = await databases.updateDocument(
              config.databaseId,
              config.registrantsCollectionId,
              emailVerification.registrantId,
              updatedRegistrant
            )
            savedRegistrants = [updated]
            await consumeVerification(emailVerification)
          } else {
            for (const registrant of registrants) {
              const saved = await databases.createDocument(
                config.databaseId,
                config.registrantsCollectionId,
                documentId(),
                registrant
              )
              savedRegistrants.push(saved)
            }
            await consumeVerification(emailVerification)
          }
        } else {
          const couponForRecord = requiresNewConferenceSeat ? base.couponCode : existing?.coupon || null
          const registrant = buildAttendeeRegistrant(
            { ...input, email: base.email, registrationType: base.registrationType },
            conference,
            couponForRecord
          )

          if (isEditing) {
            const updatedRegistrant = cleanForDatabase({
              ...registrant,
              conferenceYears: mergeConferenceYears(existing, currentConferenceYear),
            })
            const updated = await databases.updateDocument(
              config.databaseId,
              config.registrantsCollectionId,
              emailVerification.registrantId,
              updatedRegistrant
            )
            savedRegistrants = [updated]
            await consumeVerification(emailVerification)
          } else {
            const saved = await databases.createDocument(
              config.databaseId,
              config.registrantsCollectionId,
              documentId(),
              registrant
            )
            savedRegistrants = [saved]
            await consumeVerification(emailVerification)
          }
        }
      } catch (error) {
        if (couponDecremented) {
          await rollbackCoupon(coupon, base.registrationType === "Exhibitor" ? input.members.length : 1)
        }
        throw error
      } finally {
        await releaseLock(lockId)
      }

      const warnings = await sendConfirmations(savedRegistrants)

      return {
        status: "registered",
        registrationType: base.registrationType,
        count: savedRegistrants.length,
        warnings,
      }
    },
  }
}
