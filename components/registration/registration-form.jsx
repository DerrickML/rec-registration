"use client"

import { useState, useEffect } from "react"
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
  Plus,
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

export default function RegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Form data
  const [email, setEmail] = useState("")
  const [existingUser, setExistingUser] = useState(null)
  const [couponCode, setCouponCode] = useState("")
  const [couponData, setCouponData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [registrationType, setRegistrationType] = useState("Attendee")
  const [exhibitorCapacity, setExhibitorCapacity] = useState(null)

  const [conference, setConference] = useState(null)

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

  const [formData, setFormData] = useState({
    email: "",
    conferenceYears: [2025],
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
    eventStart: "2025-10-20T09:00:00Z",
    eventEnd: "2025-10-22T18:00:00Z",
    passportNumber: "",
    visaLetterSent: false,
    exhibitionDetails: "",
    coupon: "",
  })

  useEffect(() => {
    const fetchConference = async () => {
      try {
        const activeConference = await apiService.getActiveConference()
        setConference(activeConference)
      } catch (err) {
        console.error("Failed to fetch conference:", err)
      }
    }

    fetchConference()
  }, [])

  useEffect(() => {
    const checkCapacity = async () => {
      if (registrationType === "Exhibitor") {
        try {
          const capacity = await apiService.checkExhibitorCapacity()
          setExhibitorCapacity(capacity)
        } catch (err) {
          console.error("Failed to check exhibitor capacity:", err)
        }
      }
    }

    checkCapacity()
  }, [registrationType])

  const resetForm = () => {
    setCurrentStep(1)
    setEmail("")
    setExistingUser(null)
    setCouponCode("")
    setCouponData(null)
    setIsEditing(false)
    setRegistrationType("Attendee")
    setExhibitorCapacity(null)
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
    setFormData({
      email: "",
      conferenceYears: [2025],
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
      eventStart: "2025-10-20T09:00:00Z",
      eventEnd: "2025-10-22T18:00:00Z",
      passportNumber: "",
      visaLetterSent: false,
      exhibitionDetails: "",
      coupon: "",
    })
    setError("")
    setSuccess(false)
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

    try {
      const existingRecord = await apiService.checkEmailExists(email)

      if (existingRecord) {
        setExistingUser(existingRecord)
        // Show edit confirmation dialog
        const shouldEdit = window.confirm("This email is already registered. Would you like to edit your registration?")

        if (!shouldEdit) {
          setLoading(false)
          return
        }

        // Helper function to filter out Appwrite system attributes
        const filterSystemAttributes = (data) => {
          const filtered = {}
          Object.keys(data).forEach((key) => {
            // Skip Appwrite system attributes that start with $
            if (!key.startsWith("$")) {
              filtered[key] = data[key]
            }
            if (key === "visaLetterSent") {
              // remove visaLetterSent if it exists
              delete filtered.visaLetterSent
            }
          })
          return filtered
        }

        // Pre-fill form with existing data and jump to step 4
        setIsEditing(true)
        const cleanedData = filterSystemAttributes(existingRecord)

        // Helper function to ensure all values are strings or empty strings (never null)
        const sanitizeFormData = (data) => {
          const sanitized = {}
          Object.keys(data).forEach((key) => {
            if (data[key] === null || data[key] === undefined) {
              sanitized[key] = ""
            } else if (Array.isArray(data[key])) {
              sanitized[key] = data[key]
            } else {
              sanitized[key] = String(data[key])
            }
          })
          return sanitized
        }

        if(registrationType === "Attendee"){
          setFormData({
            ...sanitizeFormData(cleanedData),
            email: existingRecord.email || "",
            // Ensure arrays are properly handled
            daysAttending: Array.isArray(existingRecord.daysAttending) ? existingRecord.daysAttending : [],
            sector: Array.isArray(existingRecord.sector) ? existingRecord.sector : [],
            conferenceYears: Array.isArray(existingRecord.conferenceYears) ? existingRecord.conferenceYears : [2025],
          })  
        }
        else if(registrationType === "Exhibitor"){
          // For exhibitors, we need to ensure the form is pre-filled correctly
          // and that we handle the existing members properly
          // For now, we will just pre-fill the first member since that's the only one returned by the API
          setExhibitorMembers([
            {
              title: existingRecord.title || "",
              firstName: existingRecord.firstName || "",
              lastName: existingRecord.lastName || "",
              otherName: existingRecord.otherName || "",
              email: existingRecord.email || "",
              otherEmail: existingRecord.otherEmail || "",
              phone: existingRecord.phone || "",
              otherPhone: existingRecord.otherPhone || "",
            },
          ])

          // Pre-fill the shared data for exhibitors
          setFormData({
            ...sanitizeFormData(cleanedData),
            email: existingRecord.email || "",
            organization: existingRecord.organization || "",
            sector: Array.isArray(existingRecord.sector) ? existingRecord.sector : [],
            city: existingRecord.city || "",
            stateRegion: existingRecord.stateRegion || "",
            country: existingRecord.country || "",
            visaLetterRequired: existingRecord.visaLetterRequired || false,
            additionalComments: existingRecord.additionalComments || "",
            daysAttending: Array.isArray(existingRecord.daysAttending) ? existingRecord.daysAttending : [],
            eventStart: existingRecord.eventStart || "2025-10-20T09:00:00Z",
            eventEnd: existingRecord.eventEnd || "2025-10-22T18:00:00Z",
            passportNumber: existingRecord.passportNumber || "",
            exhibitionDetails: existingRecord.exhibitionDetails || "",
          })
        }
        else {
          // For sponsors, we can pre-fill the form similarly
          setFormData({
            ...sanitizeFormData(cleanedData),
            email: existingRecord.email || "",
            organization: existingRecord.organization || "",
            sector: Array.isArray(existingRecord.sector) ? existingRecord.sector : [],
            city: existingRecord.city || "",
            stateRegion: existingRecord.stateRegion || "",
            country: existingRecord.country || "",
            visaLetterRequired: existingRecord.visaLetterRequired || false,
            additionalComments: existingRecord.additionalComments || "",
            daysAttending: Array.isArray(existingRecord.daysAttending) ? existingRecord.daysAttending : [],
            eventStart: existingRecord.eventStart || "2025-10-20T09:00:00Z",
            eventEnd: existingRecord.eventEnd || "2025-10-22T18:00:00Z",
            passportNumber: existingRecord.passportNumber || "",
          })
        }
        // Set registration type based on existing record
        setRegistrationType(existingRecord.registrationType || "Attendee")
        setCurrentStep(4) // Skip to registration details
      } else {
        // New user, proceed to step 3 (coupon) or step 4 (registration details)
        setFormData((prev) => ({ ...prev, email, registrationType }))

        if (registrationType === "Exhibitor") {
          setCurrentStep(3) // Go to coupon step for exhibitors
        } else {
          setCurrentStep(3) // Go to coupon step for all types
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Coupon Validation (Optional for Exhibitors)
  const handleCouponSubmit = async (e) => {
    e.preventDefault()

    // Allow skipping coupon for exhibitors if they don't have one
    if (registrationType === "Exhibitor" && !couponCode.trim()) {
      setCurrentStep(4)
      return
    }

    if (!couponCode.trim()) {
      setError("Please enter a coupon code")
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await apiService.validateCoupon(couponCode, registrationType)

      if (!result.valid) {
        setError(result.error)
        setLoading(false)
        return
      }

      setCouponData(result.data)
      setFormData((prev) => ({
        ...prev,
        organization: result.data.organization,
        sector: Array.isArray(result.data.sector) ? result.data.sector : [result.data.sector],
        coupon: couponCode,
      }))
      setCurrentStep(4)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Add exhibitor member
  const addExhibitorMember = () => {
    if (exhibitorMembers.length < 2) {
      setExhibitorMembers([
        ...exhibitorMembers,
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
    }
  }

  // Remove exhibitor member
  const removeExhibitorMember = (index) => {
    if (exhibitorMembers.length > 2) {
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
        setError(`Please fill in all required member fields:\n${memberErrors.join("\n")}`)
        return
      }

      // Check for duplicate emails
      const emails = exhibitorMembers.map((member) => member.email.toLowerCase())
      const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
      if (duplicateEmails.length > 0) {
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
        setError(`Please fill in all required fields: ${missingFields.join(", ")}`)
        return
      }
    }

    // Common validation
    if (formData.daysAttending.length === 0) {
      setError("Please select at least one day to attend")
      return
    }

    setLoading(true)
    setError("")

    // Helper function to convert empty strings to null
    const cleanDataForDatabase = (data) => {
      const cleaned = { ...data }
      Object.keys(cleaned).forEach((key) => {
        if (typeof cleaned[key] === "string" && cleaned[key].trim() === "") {
          cleaned[key] = null
        }
        // Handle arrays - if empty array, keep as empty array, don't convert to null
        if (Array.isArray(cleaned[key]) && cleaned[key].length === 0) {
          // Keep empty arrays as they are for fields like daysAttending, sector, etc.
        }
      })
      return cleaned
    }

    try {
      if (registrationType === "Exhibitor") {
        // Create shared data for all exhibitor members
        const sharedData = cleanDataForDatabase({
          organization: formData.organization,
          sector: formData.sector,
          city: formData.city,
          stateRegion: formData.stateRegion,
          country: formData.country,
          visaLetterRequired: formData.visaLetterRequired,
          additionalComments: formData.additionalComments,
          daysAttending: formData.daysAttending,
          eventStart: formData.eventStart,
          eventEnd: formData.eventEnd,
          passportNumber: formData.passportNumber,
          exhibitionDetails: formData.exhibitionDetails,
          coupon: formData.coupon,
          conferenceYears: formData.conferenceYears,
        })

        // Clean member data
        const cleanedMembers = exhibitorMembers.map((member) => cleanDataForDatabase(member))

        // Create exhibitor members
        await apiService.createExhibitorMembers(cleanedMembers, sharedData)

        // Send confirmation emails
        await apiService.sendExhibitorConfirmationEmails(
          cleanedMembers,
          sharedData,
          formData.conferenceYears[formData.conferenceYears.length - 1],
        )

        // Decrement coupon usage by number of members
        if (couponData) {
          await apiService.decrementCouponUsage(couponData.$id, couponData.usersLeft, exhibitorMembers.length)
        }
      } else {
        // Regular registration
        const registrationData = cleanDataForDatabase({
          ...formData,
        })

        if (isEditing && existingUser) {
          // Update existing registration
          await apiService.updateRegistrant(existingUser.$id, registrationData)
        } else {
          // Create new registration
          await apiService.createRegistrant(registrationData)

          // Decrement coupon usage only for new registrations
          if (couponData) {
            await apiService.decrementCouponUsage(couponData.$id, couponData.usersLeft)
          }
        }

        // Send confirmation email
        await apiService.sendConfirmationEmail(
          registrationData,
          registrationData.conferenceYears[registrationData.conferenceYears.length - 1],
          null,
        )
      }

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

  if (success) {
    return <ConfirmationScreen onRegisterAnother={resetForm} />
  }

  const steps = [
    { number: 1, title: "Type", icon: User, description: "Registration type" },
    { number: 2, title: "Email", icon: Mail, description: "Verify your email" },
    { number: 3, title: "Coupon", icon: Ticket, description: "Enter coupon code" },
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FFB803] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0B7186] rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#054653] rounded-full mix-blend-multiply filter blur-xl opacity-3 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full mb-6 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[#0B7186] via-[#054653] to-[#0B7186] bg-clip-text text-transparent mb-4">
              {conference?.title || "REC25 & EXPO"}
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 mb-2">
              {conference?.title || "Renewable Energy Conference 2025"}
            </p>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join the future of sustainable energy. Register now for the most anticipated renewable energy event of
              2025.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex justify-center">
              <div className="flex items-center space-x-4 sm:space-x-8">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  const isActive = currentStep >= step.number
                  const isCurrent = currentStep === step.number

                  return (
                    <div key={step.number} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`
                          relative w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-500 transform
                          ${
                            isActive
                              ? "bg-gradient-to-r from-[#0B7186] to-[#FFB803] shadow-lg shadow-[#0B7186]/25 scale-110"
                              : "bg-white border-2 border-gray-300 shadow-md"
                          }
                          ${isCurrent ? "ring-4 ring-[#FFB803]/30" : ""}
                        `}
                        >
                          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? "text-white" : "text-gray-500"}`} />
                          {isActive && currentStep > step.number && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-center">
                          <p
                            className={`text-sm sm:text-base font-medium ${isActive ? "text-[#0B7186]" : "text-gray-500"}`}
                          >
                            {step.title}
                          </p>
                          <p className="text-xs text-gray-400 hidden sm:block">{step.description}</p>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`
                          w-8 sm:w-16 h-0.5 mx-4 transition-all duration-500
                          ${currentStep > step.number ? "bg-gradient-to-r from-[#0B7186] to-[#FFB803]" : "bg-gray-600"}
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
              <Alert className="border-red-500/50 bg-red-500/10 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300 whitespace-pre-line">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 1: Registration Type Selection */}
          {currentStep === 1 && (
            <div className="animate-in slide-in-from-right duration-500">
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl">
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
                                relative p- rounded-lg border-2 cursor-pointer transition-all
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

          {/* Step 3: Coupon Validation */}
          {currentStep === 3 && (
            <div className="animate-in slide-in-from-right duration-500">
              <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl">
                <CardHeader className="text-center pb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] rounded-full mb-4 mx-auto">
                    <Ticket className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800">Coupon Code</CardTitle>
                  <CardDescription className="text-gray-600 text-lg">
                    {registrationType === "Exhibitor"
                      ? "Enter your organization's coupon code if available (optional)"
                      : "Enter your organization's coupon code to proceed"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleCouponSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="coupon" className="text-gray-700 font-medium">
                        {/* Coupon Code {registrationType !== "Exhibitor" && "*"} */}
                        Coupon Code *
                      </Label>
                      <div className="relative">
                        <Ticket className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="coupon"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Enter coupon code"
                          className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186] focus:ring-[#0B7186]/20"
                          // required={registrationType !== "Exhibitor"}
                          required={true} // EXHIB Always require for now
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
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
                            Validating...
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
                  {couponData && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                        <Badge variant="secondary" className="bg-[#0B7186]/10 text-[#0B7186] border-[#0B7186]/20">
                          <Building className="w-3 h-3 mr-1" />
                          {couponData.organization}
                        </Badge>
                        <Badge variant="secondary" className="bg-[#FFB803]/10 text-[#054653] border-[#FFB803]/20">
                          <Globe className="w-3 h-3 mr-1" />
                          {couponData.sector}
                        </Badge>
                        {/*EXHIB <Badge variant="secondary" className="bg-[#054653]/10 text-[#054653] border-[#054653]/20">
                          <User className="w-3 h-3 mr-1" />
                          {couponData.usersLeft} seats left
                        </Badge> */}
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegistrationSubmit} className="space-y-8">
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
                              required
                            />
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
                              required
                            />
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
                              className="h-12 bg-red border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-[#0B7186]"
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
                            required
                            disabled={!!couponData}
                          />
                        </div>
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
                            required
                          />
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
                            required
                          />
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
                              required
                            />
                          </div>
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
                          onClick={() => setCurrentStep(3)}
                          className="flex-1 h-12 bg-gradient-to-r from-[#0B7186] to-[#FFB803] hover:from-[#054653] hover:to-[#FFB803] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                          <ArrowLeft className="mr-2 h-5 w-5" />
                          Back
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
