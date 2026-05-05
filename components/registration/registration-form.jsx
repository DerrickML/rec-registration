"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  Ticket,
  User,
  Building,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Globe,
  BadgeIcon as IdCard,
  Minus,
  Users,
  Store,
} from "lucide-react"
import { apiService } from "../../lib/api-service"
import { countries } from "../../data/countries"
import ConfirmationScreen from "./confirmation-screen"
import { CustomPhoneInput } from "./phone-input"

const titles = ["Mr.", "Mrs.", "Ms.", "Dr.", "Eng.", "Rev.", "Prof."]
const registrationTypes = ["Attendee", "Exhibitor"] //, "Sponsor"]

function FieldError({ message }) {
  if (!message) return null
  return <p className="text-sm font-medium text-red-600">{message}</p>
}

export default function RegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const otpInputRef = useRef(null)

  // Form data
  const [email, setEmail] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [couponData, setCouponData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [awaitingOtp, setAwaitingOtp] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [otpResendCooldown, setOtpResendCooldown] = useState(0)
  const [editToken, setEditToken] = useState("")
  const [emailVerificationMode, setEmailVerificationMode] = useState("new")
  const [registrationType, setRegistrationType] = useState("Attendee")
  const [exhibitorCapacity, setExhibitorCapacity] = useState(null)
  const [couponRequired, setCouponRequired] = useState(false)

  const [conference, setConference] = useState(null)
  const [registrationClosed, setRegistrationClosed] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [submittedRegistration, setSubmittedRegistration] = useState(null)

  // Exhibitor members data
  const [exhibitorMembers, setExhibitorMembers] = useState([
    {
      title: "",
      firstName: "",
      lastName: "",
      otherName: "",
      email: email,
      otherEmail: "",
      phone: "",
      otherPhone: "",
    },
    //EXHIB {
    //   title: "",
    //   firstName: "",
    //   lastName: "",
    //   otherName: "",
    //   email: "",
    //   otherEmail: "",
    //   phone: "",
    //   otherPhone: "",
    // },
  ])

  const currentYear = new Date().getFullYear()

  const [formData, setFormData] = useState({
    email: "",
    conferenceYears: [currentYear],
    title: "",
    firstName: "",
    lastName: "",
    otherName: "",
    phone: "",
    otherPhone: "",
    otherEmail: "",
    organization: "",
    sector: [],
    city: "",
    stateRegion: "",
    country: "",
    registrationType: "Attendee",
    visaLetterRequired: false,
    additionalComments: "",
    daysAttending: [],
    eventStart: "",
    eventEnd: "",
    passportNumber: "",
    visaLetterSent: false,
    exhibitionDetails: "",
    coupon: "",
  })

  useEffect(() => {
    const fetchConference = async () => {
      try {
        const activeConference = await apiService.getActiveConference()
        if (!activeConference) {
          setRegistrationClosed(true)
          setError("Registration is unavailable because no active conference is configured.")
          return
        }
        setConference(activeConference)
        setCouponRequired(activeConference.couponRequired === true)

        // Check registration status
        if (!activeConference.registrationOpen) {
          setRegistrationClosed(true)
        }
      } catch (err) {
        console.error("Failed to fetch conference:", err)
        setRegistrationClosed(true)
        setError("Registration is unavailable. Please try again later or contact support.")
      } finally {
        setCheckingStatus(false)
      }
    }

    fetchConference()
  }, [])

  // Update eventStart/eventEnd when conference data is available
  useEffect(() => {
    if (conference) {
      setFormData((prev) => ({
        ...prev,
        eventStart: conference.startDate || prev.eventStart,
        eventEnd: conference.endDate || prev.eventEnd,
      }))
    }
  }, [conference])

  useEffect(() => {
    const checkCapacity = async () => {
      if (registrationType === "Exhibitor") {
        try {
          const response = await fetch("/api/registration/exhibitor-capacity")
          const capacity = await response.json()
          if (!response.ok) {
            throw new Error(capacity.error || "Failed to check exhibitor capacity")
          }
          setExhibitorCapacity(capacity)
        } catch (err) {
          console.error("Failed to check exhibitor capacity:", err)
        }
      }
    }

    checkCapacity()
  }, [registrationType])

  useEffect(() => {
    if (!awaitingOtp) return
    otpInputRef.current?.focus()
  }, [awaitingOtp])

  useEffect(() => {
    if (otpResendCooldown <= 0) return
    const timer = window.setTimeout(() => {
      setOtpResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [otpResendCooldown])

  const resetForm = () => {
    setCurrentStep(1)
    setEmail("")
    setCouponCode("")
    setCouponData(null)
    setIsEditing(false)
    setAwaitingOtp(false)
    setOtpCode("")
    setOtpResendCooldown(0)
    setEditToken("")
    setEmailVerificationMode("new")
    setRegistrationType("Attendee")
    setExhibitorCapacity(null)
    setCouponRequired(conference?.couponRequired === true)
    setExhibitorMembers([
      {
        title: "",
        firstName: "",
        lastName: "",
        otherName: "",
        email: "",
        otherEmail: "",
        phone: "",
        otherPhone: "",
      },
    ])
    const resetYear = conference?.startDate
      ? new Date(conference.startDate).getFullYear()
      : currentYear
    setFormData({
      email: "",
      conferenceYears: [resetYear],
      title: "",
      firstName: "",
      lastName: "",
      otherName: "",
      phone: "",
      otherPhone: "",
      otherEmail: "",
      organization: "",
      sector: [],
      city: "",
      stateRegion: "",
      country: "",
      registrationType: "Attendee",
      visaLetterRequired: false,
      additionalComments: "",
      daysAttending: [],
      eventStart: conference?.startDate || "",
      eventEnd: conference?.endDate || "",
      passportNumber: "",
      visaLetterSent: false,
      exhibitionDetails: "",
      coupon: "",
    })
    setError("")
    setFieldErrors({})
    setSuccess(false)
    setSubmittedRegistration(null)
  }

  // Step 1: Registration Type Selection
  const handleRegistrationTypeSubmit = (e) => {
    e.preventDefault()
    setFormData((prev) => ({ ...prev, registrationType }))

    if (registrationType === "Exhibitor") {
      // Check capacity first
      if (exhibitorCapacity && !exhibitorCapacity.hasCapacity) {
        setError("Exhibitor registration is at full capacity. Please try again later or contact support.")
        return
      }
      setCurrentStep(2) // Go to email step for exhibitors
    } else {
      setCurrentStep(2) // Go to email step for other types
    }
  }

  // Step 2: Email Verification
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Please enter an email address")
      return
    }

    setLoading(true)
    setError("")
    setFieldErrors({})

    try {
      const response = await fetch("/api/registration/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to verify email")
      }

      if (result.status === "otp_required") {
        setAwaitingOtp(true)
        setOtpCode("")
        setIsEditing(false)
        setEditToken("")
        setEmailVerificationMode(result.mode || "new")
        setCouponRequired(result.couponRequired === true)
        setFormData((prev) => ({ ...prev, email: result.email }))
        setEmail(result.email)
        setOtpResendCooldown(60)
        setCurrentStep(3)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeEmail = () => {
    setAwaitingOtp(false)
    setOtpCode("")
    setOtpResendCooldown(0)
    setEditToken("")
    setEmailVerificationMode("new")
    setFormData((prev) => ({ ...prev, email: "" }))
    setCurrentStep(2)
    setError("")
    setFieldErrors({})
  }

  const handleResendOtp = async () => {
    if (otpResendCooldown > 0 || loading) return
    setLoading(true)
    setError("")
    setFieldErrors({})

    try {
      const response = await fetch("/api/registration/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to resend verification code")
      }

      setOtpCode("")
      setEmailVerificationMode(result.mode || emailVerificationMode)
      setCouponRequired(result.couponRequired === true)
      setOtpResendCooldown(60)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (value) => {
    setOtpCode(value.replace(/\D/g, "").slice(0, 6))
  }

  const sanitizeFormData = (data) => {
    const sanitized = {}
    Object.keys(data || {}).forEach((key) => {
      if (data[key] === null || data[key] === undefined) {
        sanitized[key] = ""
      } else if (Array.isArray(data[key])) {
        sanitized[key] = data[key]
      } else if (typeof data[key] === "boolean") {
        sanitized[key] = data[key]
      } else {
        sanitized[key] = String(data[key])
      }
    })
    return sanitized
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    if (!otpCode.trim()) {
      setError("Please enter the verification code")
      return
    }

    setLoading(true)
    setError("")
    setFieldErrors({})

    try {
      const response = await fetch("/api/registration/verify-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to verify code")
      }

      if (result.status === "verified_new") {
        setIsEditing(false)
        setAwaitingOtp(false)
        setEditToken(result.editToken)
        setCouponRequired(result.couponRequired === true)
        setFormData((prev) => ({
          ...prev,
          email: result.email,
          registrationType,
          ...(result.conferenceDefaults || {}),
        }))

        if (registrationType === "Exhibitor") {
          setExhibitorMembers((prev) => {
            const updated = [...prev]
            updated[0] = { ...updated[0], email: result.email }
            return updated
          })
        }

        setCurrentStep(4)
        return
      }

      const existingRecord = sanitizeFormData(result.registrant || {})
      const existingType = existingRecord.registrationType || "Attendee"
      setIsEditing(true)
      setAwaitingOtp(false)
      setEditToken(result.editToken)
      setCouponRequired(result.couponRequired === true)
      setRegistrationType(existingType)

      setFormData((prev) => ({
        ...prev,
        ...existingRecord,
        email: result.email || existingRecord.email || "",
        registrationType: existingType,
        daysAttending: Array.isArray(existingRecord.daysAttending) ? existingRecord.daysAttending : [],
        sector: Array.isArray(existingRecord.sector) ? existingRecord.sector : [],
        conferenceYears: Array.isArray(existingRecord.conferenceYears) ? existingRecord.conferenceYears : prev.conferenceYears,
      }))

      if (existingType === "Exhibitor") {
        setExhibitorMembers([
          {
            title: existingRecord.title || "",
            firstName: existingRecord.firstName || "",
            lastName: existingRecord.lastName || "",
            otherName: existingRecord.otherName || "",
            email: result.email || existingRecord.email || "",
            otherEmail: existingRecord.otherEmail || "",
            phone: existingRecord.phone || "",
            otherPhone: existingRecord.otherPhone || "",
          },
        ])
      }

      setCurrentStep(4)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Coupon validation
  const handleCouponSubmit = async (e) => {
    e?.preventDefault()

    if (!couponCode.trim()) {
      if (couponRequired) {
        setFieldErrors({ coupon: "Coupon code is required" })
        setError("Please enter a coupon code")
        return
      }

      setCouponData(null)
      setFormData((prev) => ({
        ...prev,
        coupon: "",
      }))
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/registration/coupon-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode, registrationType }),
      })
      const result = await response.json()
      if (!response.ok) {
        setFieldErrors({ coupon: result.error || "Invalid coupon code" })
        throw new Error(result.error || "Failed to validate coupon")
      }

      setCouponData(result.coupon)
      setFormData((prev) => ({
        ...prev,
        organization: result.coupon.organization,
        sector: Array.isArray(result.coupon.sector) ? result.coupon.sector : [result.coupon.sector],
        coupon: couponCode,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clearCoupon = () => {
    const hadAppliedCoupon = Boolean(couponData)
    setCouponCode("")
    setCouponData(null)
    setFormData((prev) => ({
      ...prev,
      coupon: "",
      organization: hadAppliedCoupon ? "" : prev.organization,
      sector: hadAppliedCoupon ? [] : prev.sector,
    }))
  }

  // Remove exhibitor member
  const removeExhibitorMember = (index) => {
    if (exhibitorMembers.length > 1) {
      setExhibitorMembers(exhibitorMembers.filter((_, i) => i !== index))
    }
  }

  // Update exhibitor member
  const updateExhibitorMember = (index, field, value) => {
    const updatedMembers = [...exhibitorMembers]
    updatedMembers[index][field] = value
    setExhibitorMembers(updatedMembers)
  }

  // Step 4: Registration Form Submission
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})

    if (!editToken) {
      setFieldErrors({ email: "Please verify your email before submitting" })
      setError("Please verify your email before submitting your registration")
      setCurrentStep(3)
      return
    }

    if (!isEditing && couponRequired && !formData.coupon) {
      setFieldErrors({ coupon: "Please apply your coupon code before submitting" })
      setError("Please apply your coupon code before submitting your registration")
      return
    }

    if (!isEditing && couponCode.trim() && !formData.coupon) {
      setFieldErrors({ coupon: "Apply this coupon code or clear it before submitting" })
      setError("Apply the coupon code or clear it before submitting your registration")
      return
    }

    if (registrationType === "Exhibitor") {
      // Validate exhibitor members
      const requiredMemberFields = ["title", "firstName", "lastName", "email", "phone"]
      const memberErrors = []

      exhibitorMembers.forEach((member, index) => {
        const missingFields = requiredMemberFields.filter((field) => !member[field].trim())
        if (missingFields.length > 0) {
          memberErrors.push(`Member ${index + 1}: ${missingFields.join(", ")}`)
        }
      })

      if (memberErrors.length > 0) {
        setFieldErrors({ members: "Please complete all required representative fields" })
        setError(`Please fill in all required member fields:\n${memberErrors.join("\n")}`)
        return
      }

      // Check for duplicate emails
      const emails = exhibitorMembers.map((member) => member.email.toLowerCase())
      const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
      if (duplicateEmails.length > 0) {
        setFieldErrors({ members: "Each representative must use a unique email address" })
        setError("Each member must have a unique email address")
        return
      }
    } else {
      // Validation for regular attendees
      const requiredFields = ["title", "firstName", "lastName", "phone", "city", "stateRegion", "country"]
      const missingFields = requiredFields.filter((field) => !formData[field].trim())

      // Add passport number validation if visa letter is required
      if (formData.visaLetterRequired && !formData.passportNumber.trim()) {
        missingFields.push("passportNumber")
      }

      if (missingFields.length > 0) {
        setFieldErrors(
          missingFields.reduce((result, field) => {
            result[field] = "Required"
            return result
          }, {})
        )
        setError(`Please fill in all required fields: ${missingFields.join(", ")}`)
        return
      }
    }

    // Common validation
    if (formData.daysAttending.length === 0) {
      setFieldErrors({ daysAttending: "Select at least one day to attend" })
      setError("Please select at least one day to attend")
      return
    }

    setLoading(true)
    setError("")

    try {
      const payload = {
        ...formData,
        email: formData.email || email,
        registrationType,
        couponCode: formData.coupon,
        editToken,
      }
      if (registrationType === "Exhibitor") {
        payload.members = exhibitorMembers
      }

      const response = await fetch("/api/registration/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit registration")
      }

      setSubmittedRegistration({
        ...payload,
        warnings: Array.isArray(result.warnings) ? result.warnings : [],
        count: result.count,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      daysAttending: prev.daysAttending.includes(day)
        ? prev.daysAttending.filter((d) => d !== day)
        : [...prev.daysAttending, day],
    }))
  }

  const handleCountryChange = (value) => {
    setFormData((prev) => ({ ...prev, country: value }))
  }

  // Loading state while checking registration status
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FFB803] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0B7186] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#054653] rounded-full mix-blend-multiply filter blur-xl opacity-3 animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#0B7186] mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Checking registration status...</p>
          </div>
        </div>
      </div>
    )
  }

  // Registration closed screen
  if (registrationClosed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Registration Closed</h2>
          <p className="text-gray-500 mb-8">
            {conference?.regClosedMessage || "The registration period has ended and we are no longer accepting new registrations at this time."}
          </p>
          
          <div className="space-y-4">
            <Button asChild className="bg-[#0B7186] hover:bg-[#054653] text-white px-6 h-11 font-semibold rounded-xl shadow-md w-full">
              <Link href="/">Back to Home</Link>
            </Button>
            <Button asChild variant="outline" className="border-2 border-[#0B7186] text-[#0B7186] hover:bg-[#0B7186] hover:text-white px-6 h-11 font-semibold rounded-xl w-full">
              <Link href="/program">View Program</Link>
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need assistance?{" "}
              {conference?.contactEmail || conference?.contactPhone ? (
                <>
                  Contact us at{" "}
                  {conference.contactEmail && (
                    <a href={`mailto:${conference.contactEmail}`} className="text-[#0B7186] hover:underline font-medium">
                      {conference.contactEmail}
                    </a>
                  )}
                  {conference.contactEmail && conference.contactPhone && " or "}
                  {conference.contactPhone && (
                    <a href={`tel:${conference.contactPhone}`} className="text-[#0B7186] hover:underline font-medium">
                      {conference.contactPhone}
                    </a>
                  )}
                </>
              ) : (
                "Please contact the conference organizers."
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <ConfirmationScreen
        onRegisterAnother={resetForm}
        conference={conference}
        registration={submittedRegistration}
      />
    )
  }

  const steps = [
    { number: 1, title: "Type", icon: User, description: "Registration type" },
    { number: 2, title: "Email", icon: Mail, description: "Verify your email" },
    { number: 3, title: "Verify", icon: Mail, description: "Enter code" },
    { number: 4, title: "Details", icon: Building, description: "Complete details" },
  ]

  const conferenceDays = conference?.days
    ? (() => {
        try {
          const parsedDays = JSON.parse(conference.days)
          return Array.isArray(parsedDays) ? parsedDays : []
        } catch {
          return typeof conference.days === "string"
            ? conference.days.split(",").map((day) => ({ label: day.trim() }))
            : []
        }
      })()
    : [
        { label: "20th October – Day 1", theme: "Renewable Energy Policy & Investment" },
        { label: "21st October – Day 2", theme: "Technology & Innovation" },
        { label: "22nd October – Day 3", theme: "Implementation & Sustainability" },
      ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] bg-gradient-to-br from-[#FFB803]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-[350px] h-[350px] bg-gradient-to-br from-[#0B7186]/6 to-transparent rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "radial-gradient(circle, #0B7186 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#0B7186] to-[#054653] rounded-2xl mb-5 shadow-lg shadow-[#0B7186]/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
              {conference?.title || "REC25 & EXPO"}
            </h1>
            <p className="text-gray-500 max-w-lg mx-auto">
              Register now for the most anticipated renewable energy event.
            </p>
          </div>

          <div className="mb-10">
            <div className="flex justify-center">
              <div className="flex items-center space-x-3 sm:space-x-6">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  const isActive = currentStep >= step.number
                  const isCurrent = currentStep === step.number

                  return (
                    <div key={step.number} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`
                          relative w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-500
                          ${
                            isActive
                              ? "bg-[#0B7186] shadow-lg shadow-[#0B7186]/25"
                              : "bg-white border border-gray-200 shadow-sm"
                          }
                          ${isCurrent ? "ring-4 ring-[#0B7186]/15 scale-105" : ""}
                        `}
                        >
                          {isActive && currentStep > step.number ? (
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          ) : (
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                          )}
                        </div>
                        <div className="mt-2 text-center">
                          <p
                            className={`text-xs sm:text-sm font-semibold ${isActive ? "text-[#0B7186]" : "text-gray-400"}`}
                          >
                            {step.title}
                          </p>
                          <p className="text-[10px] text-gray-400 hidden sm:block">{step.description}</p>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`
                          w-6 sm:w-12 h-0.5 mx-2 sm:mx-3 rounded-full transition-all duration-500
                          ${currentStep > step.number ? "bg-[#0B7186]" : "bg-gray-200"}
                        `}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-8 animate-in slide-in-from-top duration-300">
              <Alert role="alert" aria-live="assertive" className="border-red-500/50 bg-red-500/10 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-600 whitespace-pre-line">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 1: Registration Type Selection */}
          {currentStep === 1 && (
            <div className="animate-in slide-in-from-right duration-500">
              <Card className="bg-white border border-gray-100 shadow-lg shadow-gray-200/50 rounded-2xl">
                <CardHeader className="text-center pb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full mb-4 mx-auto">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800">Registration Type</CardTitle>
                  <CardDescription className="text-gray-600 text-lg">Select your registration category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleRegistrationTypeSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-gray-700 font-medium">Choose Registration Type *</Label>
                      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"> */}
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* for 2 columns without sponsor card */}
                        {registrationTypes.map((type) => {
                          const isExhibitor = type === "Exhibitor"
                          const isDisabled = isExhibitor && exhibitorCapacity && !exhibitorCapacity.hasCapacity

                          return (
                            <div
                              key={type}
                              className={`
                                relative p-6 rounded-lg border-2 cursor-pointer transition-all
                                ${
                                  registrationType === type
                                    ? "border-[#0B7186] bg-[#0B7186]/10"
                                    : isDisabled
                                      ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                                      : "border-gray-300 bg-white hover:bg-gray-50"
                                }
                              `}
                              onClick={() => !isDisabled && setRegistrationType(type)}
                            >
                              <div className="flex flex-col items-center text-center space-y-3">
                                {type === "Attendee" && <User className="w-8 h-8 text-[#0B7186]" />}
                                {type === "Exhibitor" && <Store className="w-8 h-8 text-[#0B7186]" />}
                                {type === "Sponsor" && <Building className="w-8 h-8 text-[#0B7186]" />}

                                <div>
                                  <h3 className="font-semibold text-gray-800">{type}</h3>
                                  {type === "Attendee" && (
                                    <p className="text-sm text-gray-600 mt-1">Individual conference attendee</p>
                                  )}
                                  {type === "Exhibitor" && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      {/* <p>Exhibition booth (2-4 members)</p> */}
                                      <p>Exhibition booth</p>
                                      {exhibitorCapacity && (
                                        <p className="text-xs mt-1">
                                          {exhibitorCapacity.hasCapacity
                                            ? `${exhibitorCapacity.remaining} spots remaining`
                                            : "Full capacity reached"}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {/* {type === "Sponsor" && (
                                    <p className="text-sm text-gray-600 mt-1">Conference sponsor</p>
                                  )} */}
                                </div>
                              </div>

                              <input
                                type="radio"
                                name="registrationType"
                                value={type}
                                checked={registrationType === type}
                                onChange={(e) => setRegistrationType(e.target.value)}
                                className="sr-only"
                                disabled={isDisabled}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Email Verification */}
          {currentStep === 2 && (
            <div className="animate-in slide-in-from-right duration-500">
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl">
                <CardHeader className="text-center pb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full mb-4 mx-auto">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800">Email Verification</CardTitle>
                  <CardDescription className="text-gray-600 text-lg">
                    Enter your email address to begin your registration journey
                  </CardDescription>
                  {registrationType && (
                    <Badge variant="secondary" className="bg-[#0B7186]/10 text-[#0B7186] border-[#0B7186]/20 mt-4">
                      {registrationType} Registration
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186] focus:ring-[#0B7186]/20"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Email Verification */}
          {currentStep === 3 && (
            <div className="animate-in slide-in-from-right duration-500">
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl">
                <CardHeader className="text-center pb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full mb-4 mx-auto">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800">Verify Email</CardTitle>
                  <CardDescription className="text-gray-600 text-lg">
                    {emailVerificationMode === "edit"
                      ? "Enter the verification code sent to your email address to edit your registration"
                      : "Enter the verification code sent to your email address to continue"}
                  </CardDescription>
                  <p className="text-sm text-gray-500 mt-3">
                    Code sent to <span className="font-semibold text-gray-700">{email}</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-gray-700 font-medium">
                        Verification Code *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          ref={otpInputRef}
                          id="otp"
                          value={otpCode}
                          onChange={(e) => handleOtpChange(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186] focus:ring-[#0B7186]/20 text-center tracking-[0.35em] font-semibold"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg bg-gray-50 border border-gray-200 p-4">
                      <button
                        type="button"
                        onClick={handleChangeEmail}
                        className="text-sm font-semibold text-[#0B7186] hover:text-[#054653] text-left"
                      >
                        Change email
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading || otpResendCooldown > 0}
                        className="text-sm font-semibold text-[#0B7186] hover:text-[#054653] disabled:text-gray-400 disabled:cursor-not-allowed text-left sm:text-right"
                      >
                        {otpResendCooldown > 0 ? `Resend code in ${otpResendCooldown}s` : "Resend code"}
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleChangeEmail}
                        className="flex-1 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Registration Details */}
          {currentStep === 4 && (
            <div className="animate-in slide-in-from-right duration-500">
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl">
                <CardHeader className="text-center pb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full mb-4 mx-auto">
                    {registrationType === "Exhibitor" ? (
                      <Store className="w-6 h-6 text-white" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800">
                    {isEditing ? "Edit Registration" : `Complete ${registrationType} Registration`}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-lg">
                    {isEditing ? "Update your registration information" : "Fill in your details to secure your spot"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegistrationSubmit} className="space-y-8">
                    {isEditing && (
                      <div className="rounded-xl border border-[#0B7186]/20 bg-[#0B7186]/10 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#054653]">
                              Editing existing registration for {formData.firstName || formData.email}
                            </p>
                            <p className="text-sm text-gray-600">
                              Changes will update the registration tied to {formData.email}.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetForm}
                            className="border-[#0B7186] text-[#0B7186] hover:bg-white"
                          >
                            Cancel Edit
                          </Button>
                        </div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-[#0B7186]" />
                            <h3 className="text-lg font-semibold text-gray-800">
                              {couponRequired ? "Coupon Code" : "Have a coupon?"}
                            </h3>
                          </div>
                          {!couponRequired && !couponData && (
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Optional</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {couponRequired
                            ? "Apply your organization's coupon code before submitting this registration."
                            : "Apply a coupon if your organization provided one. Otherwise continue with your details below."}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
                          <div className="relative">
                            <Ticket className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                              id="coupon"
                              value={couponCode}
                              onChange={(e) => {
                                setCouponCode(e.target.value)
                                if (formData.coupon && e.target.value !== formData.coupon) {
                                  setCouponData(null)
                                  setFormData((prev) => ({ ...prev, coupon: "" }))
                                }
                              }}
                              placeholder="Enter coupon code"
                              className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186] focus:ring-[#0B7186]/20"
                              required={couponRequired}
                              aria-invalid={Boolean(fieldErrors.coupon)}
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleCouponSubmit}
                            className="h-12 bg-[#0B7186] hover:bg-[#054653] text-white font-semibold"
                            disabled={loading || (couponData && formData.coupon === couponCode)}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Applying...
                              </>
                            ) : couponData && formData.coupon === couponCode ? (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Applied
                              </>
                            ) : (
                              "Apply"
                            )}
                          </Button>
                          {(couponCode || couponData) && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={clearCoupon}
                              className="h-12 border-gray-300 text-gray-700 hover:bg-white"
                              disabled={loading}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <FieldError message={fieldErrors.coupon} />
                        {couponData && (
                          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white border border-gray-200 p-4 text-sm">
                            <Badge variant="secondary" className="bg-[#0B7186]/10 text-[#0B7186] border-[#0B7186]/20">
                              <Building className="w-3 h-3 mr-1" />
                              {couponData.organization}
                            </Badge>
                            <Badge variant="secondary" className="bg-[#FFB803]/10 text-[#054653] border-[#FFB803]/20">
                              <Globe className="w-3 h-3 mr-1" />
                              {couponData.sector}
                            </Badge>
                            <span className="text-gray-500">{couponData.usersLeft} seats left</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Exhibitor Members Section */}
                    {registrationType === "Exhibitor" && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Users className="w-5 h-5 text-[#0B7186]" />
                            {/*EXHIB <h3 className="text-xl font-semibold text-gray-800">Exhibitor Members</h3> */}
                            <h3 className="text-xl font-semibold text-gray-800">Exhibitor Representative Details</h3>
                          </div>
                          {/*EXHIB <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              onClick={addExhibitorMember}
                              disabled={exhibitorMembers.length >= 4}
                              className="bg-[#0B7186] hover:bg-[#054653] text-white px-3 py-1 text-sm"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Member
                            </Button>
                          </div> */}
                        </div>

                        <div className="text-sm text-gray-600 mb-4">
                          {/*EXHIB <p>• Minimum 2 members, maximum 4 members</p>
                          <p>• Each member will receive individual confirmation emails</p> */}
                          <p>• You will receive a confirmation emails after registration.</p>
                        </div>
                        <FieldError message={fieldErrors.members} />

                        {exhibitorMembers.map((member, index) => (
                          <Card key={index} className="bg-gray-50 border border-gray-200">
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between">
                                {/* <CardTitle className="text-lg text-gray-800">Member {index + 1}</CardTitle> */}
                                {exhibitorMembers.length > 2 && (
                                  <Button
                                    type="button"
                                    onClick={() => removeExhibitorMember(index)}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    <Minus className="w-4 h-4 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-gray-700 font-medium">Title *</Label>
                                  <Select
                                    value={member.title}
                                    onValueChange={(value) => updateExhibitorMember(index, "title", value)}
                                  >
                                    <SelectTrigger className="h-12 bg-white border-gray-300 text-gray-800 focus:border-[#0B7186]">
                                      <SelectValue placeholder="Select title" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                      {titles.map((title) => (
                                        <SelectItem
                                          key={title}
                                          value={title}
                                          className="text-gray-800 hover:bg-gray-100"
                                        >
                                          {title}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-gray-700 font-medium">First Name *</Label>
                                  <Input
                                    value={member.firstName}
                                    onChange={(e) => updateExhibitorMember(index, "firstName", e.target.value)}
                                    className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                                    required
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-gray-700 font-medium">Last Name *</Label>
                                  <Input
                                    value={member.lastName}
                                    onChange={(e) => updateExhibitorMember(index, "lastName", e.target.value)}
                                    className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                                    required
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-gray-700 font-medium">Other Name</Label>
                                  <Input
                                    value={member.otherName}
                                    onChange={(e) => updateExhibitorMember(index, "otherName", e.target.value)}
                                    className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-gray-700 font-medium">Email *</Label>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <Input
                                      type="email"
                                      value={member.email}
                                      onChange={(e) => updateExhibitorMember(index, "email", e.target.value)}
                                      className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                                      required
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-gray-700 font-medium">Alternate Email</Label>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <Input
                                      type="email"
                                      value={member.otherEmail}
                                      onChange={(e) => updateExhibitorMember(index, "otherEmail", e.target.value)}
                                      className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <CustomPhoneInput
                                    value={member.phone}
                                    onChange={(value) => updateExhibitorMember(index, "phone", value || "")}
                                    label="Phone"
                                    required
                                    placeholder="Enter phone number"
                                    id={`member-${index}-phone`}
                                    className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <CustomPhoneInput
                                    value={member.otherPhone}
                                    onChange={(value) => updateExhibitorMember(index, "otherPhone", value || "")}
                                    label="Alternate Phone"
                                    placeholder="Enter alternate phone number"
                                    id={`member-${index}-other-phone`}
                                    className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Regular Attendee Personal Information */}
                    {registrationType !== "Exhibitor" && (
                      <div className="space-y-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <User className="w-5 h-5 text-[#0B7186]" />
                          <h3 className="text-xl font-semibold text-gray-800">Personal Information</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="title" className="text-gray-700 font-medium">
                              Title *
                            </Label>
                            <Select
                              value={formData.title}
                              onValueChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
                            >
                              <SelectTrigger className="h-12 bg-white border-gray-300 text-gray-800 focus:border-[#0B7186]">
                                <SelectValue placeholder="Select title" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200">
                                {titles.map((title) => (
                                  <SelectItem key={title} value={title} className="text-gray-800 hover:bg-gray-100">
                                    {title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldError message={fieldErrors.title} />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-gray-700 font-medium">
                              First Name *
                            </Label>
                            <Input
                              id="firstName"
                              value={formData.firstName}
                              onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                              className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                              autoComplete="given-name"
                              required
                            />
                            <FieldError message={fieldErrors.firstName} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-gray-700 font-medium">
                              Last Name *
                            </Label>
                            <Input
                              id="lastName"
                              value={formData.lastName}
                              onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                              className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                              autoComplete="family-name"
                              required
                            />
                            <FieldError message={fieldErrors.lastName} />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="otherName" className="text-gray-700 font-medium">
                              Other Name
                            </Label>
                            <Input
                              id="otherName"
                              value={formData.otherName}
                              onChange={(e) => setFormData((prev) => ({ ...prev, otherName: e.target.value }))}
                              className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                            />
                            <FieldError message={fieldErrors.phone} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-700 font-medium">
                              Email *
                            </Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                className="pl-10 h-12 bg-white/5 border-gray-300 text-gray-500 cursor-not-allowed"
                                disabled
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="otherEmail" className="text-gray-700 font-medium">
                              Other Email
                            </Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <Input
                                id="otherEmail"
                                type="email"
                                value={formData.otherEmail}
                                onChange={(e) => setFormData((prev) => ({ ...prev, otherEmail: e.target.value }))}
                                className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                                autoComplete="email"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <CustomPhoneInput
                              value={formData.phone}
                              onChange={(value) => setFormData((prev) => ({ ...prev, phone: value || "" }))}
                              label="Phone"
                              required
                              placeholder="Enter phone number"
                              id="phone"
                              className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                            />
                          </div>

                          <div className="space-y-2">
                            <CustomPhoneInput
                              value={formData.otherPhone}
                              onChange={(value) => setFormData((prev) => ({ ...prev, otherPhone: value || "" }))}
                              label="Other Phone"
                              placeholder="Enter alternate phone number"
                              id="otherPhone"
                              className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Organization Information */}
                    <div className="space-y-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <Building className="w-5 h-5 text-[#0B7186]" />
                        <h3 className="text-xl font-semibold text-gray-800">Organization Information</h3>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="organization" className="text-gray-700 font-medium">
                          Organization *
                        </Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            id="organization"
                            value={formData.organization}
                            onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
                            className={`pl-10 h-12 border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186] ${
                              !!couponData ? "bg-white/5 cursor-not-allowed" : "bg-white"
                            }`}
                            autoComplete="organization"
                            required
                            disabled={!!couponData}
                          />
                        </div>
                        <FieldError message={fieldErrors.organization} />
                      </div>

                      {registrationType === "Exhibitor" && (
                        <div className="space-y-2">
                          <Label htmlFor="exhibitionDetails" className="text-gray-700 font-medium">
                            Exhibition Details
                          </Label>
                          <Textarea
                            id="exhibitionDetails"
                            value={formData.exhibitionDetails}
                            onChange={(e) => setFormData((prev) => ({ ...prev, exhibitionDetails: e.target.value }))}
                            placeholder="Describe your products/services, booth requirements, etc."
                            rows={4}
                            className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186] resize-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Location Information */}
                    <div className="space-y-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <MapPin className="w-5 h-5 text-[#0B7186]" />
                        <h3 className="text-xl font-semibold text-gray-800">Location Information</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-gray-700 font-medium">
                            City *
                          </Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                            className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                            autoComplete="address-level2"
                            required
                          />
                          <FieldError message={fieldErrors.city} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="stateRegion" className="text-gray-700 font-medium">
                            State/Region *
                          </Label>
                          <Input
                            id="stateRegion"
                            value={formData.stateRegion}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stateRegion: e.target.value }))}
                            className="h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                            autoComplete="address-level1"
                            required
                          />
                          <FieldError message={fieldErrors.stateRegion} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-gray-700 font-medium">
                          Country *
                        </Label>
                        <Select value={formData.country} onValueChange={handleCountryChange}>
                          <SelectTrigger className="h-12 bg-white border-gray-300 text-gray-800 focus:border-[#0B7186]">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 max-h-60">
                            {countries.map((country) => (
                              <SelectItem
                                key={country.value}
                                value={country.value}
                                className="text-gray-800 hover:bg-gray-100"
                              >
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError message={fieldErrors.country} />
                      </div>
                    </div>

                    {/* Registration Details */}
                    <div className="space-y-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <Calendar className="w-5 h-5 text-[#0B7186]" />
                        <h3 className="text-xl font-semibold text-gray-800">Registration Details</h3>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-gray-700 font-medium">Days Attending * (Select at least one)</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {conferenceDays.map((day, index) => {
                            const dayLabel = day.label || day
                            return (
                              <div
                                key={index}
                                className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
                              >
                                <Checkbox
                                  id={dayLabel}
                                  checked={formData.daysAttending.includes(dayLabel)}
                                  onCheckedChange={() => handleDayToggle(dayLabel)}
                                  className="border-gray-300 data-[state=checked]:bg-[#0B7186] data-[state=checked]:border-[#0B7186] mt-1"
                                />
                                <div className="flex-1">
                                  <Label
                                    htmlFor={dayLabel}
                                    className="text-gray-700 cursor-pointer font-medium block mb-1"
                                  >
                                    {dayLabel}
                                  </Label>
                                  {day.theme && <p className="text-sm text-gray-500">{day.theme}</p>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <FieldError message={fieldErrors.daysAttending} />
                      </div>

                      <div className="space-y-4">
                        <Label className="text-gray-700 font-medium">Do you require a visa letter? *</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={`
                            flex items-center justify-center space-x-2 p-4 rounded-lg border-2 cursor-pointer transition-all
                            ${
                              !formData.visaLetterRequired
                                ? "border-[#0B7186] bg-[#0B7186]/10"
                                : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                            }
                          `}
                            onClick={() => setFormData((prev) => ({ ...prev, visaLetterRequired: false }))}
                          >
                            <input
                              type="radio"
                              id="visaNo"
                              name="visaLetter"
                              value="false"
                              checked={!formData.visaLetterRequired}
                              onChange={() => setFormData((prev) => ({ ...prev, visaLetterRequired: false }))}
                              className="sr-only"
                            />
                            <Label htmlFor="visaNo" className="text-gray-700 cursor-pointer font-medium">
                              No
                            </Label>
                          </div>
                          <div
                            className={`
                            flex items-center justify-center space-x-2 p-4 rounded-lg border-2 cursor-pointer transition-all
                            ${
                              formData.visaLetterRequired
                                ? "border-[#0B7186] bg-[#0B7186]/10"
                                : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                            }
                          `}
                            onClick={() => setFormData((prev) => ({ ...prev, visaLetterRequired: true }))}
                          >
                            <input
                              type="radio"
                              id="visaYes"
                              name="visaLetter"
                              value="true"
                              checked={formData.visaLetterRequired}
                              onChange={() => setFormData((prev) => ({ ...prev, visaLetterRequired: true }))}
                              className="sr-only"
                            />
                            <Label htmlFor="visaYes" className="text-gray-700 cursor-pointer font-medium">
                              Yes
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Conditional Passport Number Field */}
                      {formData.visaLetterRequired && (
                        <div className="space-y-2 animate-in slide-in-from-top duration-300">
                          <Label htmlFor="passportNumber" className="text-gray-700 font-medium">
                            Passport Number *
                          </Label>
                          <div className="relative">
                            <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                              id="passportNumber"
                              value={formData.passportNumber}
                              onChange={(e) => setFormData((prev) => ({ ...prev, passportNumber: e.target.value }))}
                              placeholder="Enter passport number"
                              className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
                              aria-invalid={Boolean(fieldErrors.passportNumber)}
                              required
                            />
                          </div>
                          <FieldError message={fieldErrors.passportNumber} />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="comments" className="text-gray-700 font-medium">
                          Additional Comments/Requirements
                        </Label>
                        <Textarea
                          id="comments"
                          value={formData.additionalComments}
                          onChange={(e) => setFormData((prev) => ({ ...prev, additionalComments: e.target.value }))}
                          placeholder="Any special requirements or comments..."
                          rows={4}
                          className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186] resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      {!isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetForm}
                          className="flex-1 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                          <ArrowLeft className="mr-2 h-5 w-5" />
                          Start Over
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className="flex-1 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {isEditing ? "Updating..." : "Registering..."}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            {isEditing ? "Update Registration" : "Complete Registration"}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
