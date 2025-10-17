import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { loadLogos, LOGO_CONFIG } from "./logo-utils"

/**
 * Remove emojis from text
 * @param {string} text - Text that may contain emojis
 * @returns {string} Text without emojis
 */
const removeEmojis = (text) => {
  if (!text) return ""
  // Remove emojis and other symbols
  return text.replace(
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/gu,
    ""
  )
}

/**
 * Parse HTML content and extract formatted segments
 * @param {string} html - HTML content to parse
 * @returns {Array} Array of content segments with formatting info
 */
const parseHtmlContent = (html) => {
  if (!html) return []

  const segments = []

  if (typeof window !== "undefined") {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html

    const processNode = (node, isBold = false, isListItem = false) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = removeEmojis(node.textContent.trim())
        if (text) {
          segments.push({
            text,
            bold: isBold,
            listItem: isListItem,
          })
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase()

        if (tagName === "strong" || tagName === "b") {
          Array.from(node.childNodes).forEach((child) => processNode(child, true, isListItem))
        } else if (tagName === "li") {
          segments.push({ text: "bullet", bold: false, listItem: true })
          Array.from(node.childNodes).forEach((child) => processNode(child, isBold, true))
          segments.push({ text: "newline", bold: false, listItem: false })
        } else if (tagName === "p" || tagName === "h1" || tagName === "h2" || tagName === "h3" || tagName === "h4") {
          const isHeading = tagName.startsWith("h")
          Array.from(node.childNodes).forEach((child) => processNode(child, isHeading || isBold, isListItem))
          segments.push({ text: "newline", bold: false, listItem: false })
        } else if (tagName === "br") {
          segments.push({ text: "newline", bold: false, listItem: false })
        } else {
          Array.from(node.childNodes).forEach((child) => processNode(child, isBold, isListItem))
        }
      }
    }

    Array.from(tmp.childNodes).forEach((child) => processNode(child))
  }

  return segments
}

/**
 * Strip HTML tags and decode HTML entities from HTML string (fallback for simple text)
 * @param {string} html - HTML string to convert to plain text
 * @returns {string} Plain text without HTML tags
 */
const stripHtml = (html) => {
  if (!html) return ""

  // Create a temporary DOM element to parse HTML
  if (typeof window !== "undefined") {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    // Get text content and clean up extra whitespace
    return removeEmojis(tmp.textContent || tmp.innerText || "")
  }

  // Fallback for server-side: basic HTML tag removal
  return removeEmojis(
    html
      .replace(/<style[^>]*>.*<\/style>/gm, "")
      .replace(/<script[^>]*>.*<\/script>/gm, "")
      .replace(/<[^>]+>/gm, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .trim()
  )
}

/**
 * Render formatted HTML content to PDF
 * @param {jsPDF} doc - jsPDF document instance
 * @param {Array} segments - Parsed HTML segments
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} contentWidth - Available width for content
 * @param {number} lineHeight - Line height in mm
 * @param {number} pageBottom - Bottom margin for page breaks
 * @param {Object} logos - Logos for header
 * @param {Object} baseStyle - Base style (fontSize, color)
 * @returns {number} Final Y position after rendering
 */
const renderFormattedContent = (doc, segments, startX, startY, contentWidth, lineHeight, pageBottom, logos, baseStyle) => {
  let yPosition = startY
  let currentLine = []
  let currentLineWidth = 0
  const bulletIndent = 8
  const maxWidth = contentWidth

  const flushLine = (isListItem = false) => {
    if (currentLine.length === 0) return

    // Check page break
    if (yPosition + lineHeight > pageBottom) {
      doc.addPage()
      addHeader(doc, doc.internal.getCurrentPageInfo().pageNumber, logos)
      yPosition = 50
      // Restore base styling after page break
      doc.setFontSize(baseStyle.fontSize)
      doc.setTextColor(...baseStyle.color)
    }

    let xPos = startX
    if (isListItem) xPos += bulletIndent

    currentLine.forEach((segment) => {
      doc.setFont("helvetica", segment.bold ? "bold" : "normal")
      doc.setTextColor(...baseStyle.color)
      doc.text(segment.text, xPos, yPosition)
      xPos += segment.width
    })

    currentLine = []
    currentLineWidth = 0
    yPosition += lineHeight
  }

  let isCurrentlyInListItem = false

  segments.forEach((segment) => {
    if (segment.text === "newline") {
      flushLine(isCurrentlyInListItem)
      isCurrentlyInListItem = false
      yPosition += 1 // Extra spacing after paragraphs
      return
    }

    if (segment.text === "bullet") {
      flushLine(isCurrentlyInListItem)
      isCurrentlyInListItem = true
      if (yPosition + lineHeight > pageBottom) {
        doc.addPage()
        addHeader(doc, doc.internal.getCurrentPageInfo().pageNumber, logos)
        yPosition = 50
      }
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...baseStyle.color)
      doc.text("•", startX + 2, yPosition)
      return
    }

    // Set font for width calculation
    doc.setFont("helvetica", segment.bold ? "bold" : "normal")
    const words = segment.text.split(" ")

    words.forEach((word, index) => {
      const space = index < words.length - 1 ? " " : ""
      const textToAdd = word + space
      const textWidth = doc.getTextWidth(textToAdd)

      const effectiveMaxWidth = isCurrentlyInListItem ? maxWidth - bulletIndent : maxWidth

      if (currentLineWidth + textWidth > effectiveMaxWidth && currentLine.length > 0) {
        flushLine(isCurrentlyInListItem)
      }

      currentLine.push({
        text: textToAdd,
        bold: segment.bold,
        width: textWidth,
      })
      currentLineWidth += textWidth
    })
  })

  // Flush remaining content
  flushLine(isCurrentlyInListItem)

  return yPosition
}

/**
 * Format time for display in PDF
 * @param {string} isoDateTime - ISO datetime string
 * @returns {string} Formatted time
 */
const formatTime = (isoDateTime) => {
  if (!isoDateTime) return ""
  const date = new Date(isoDateTime)
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Kampala",
  })
}

/**
 * Format date for display
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
const formatDate = (isoDate) => {
  if (!isoDate) return ""
  const date = new Date(isoDate)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Add professional header with logos to PDF
 * @param {jsPDF} doc - jsPDF document instance
 * @param {number} pageNumber - Current page number
 * @param {Object} logos - Logos object with memd and nrep base64 images
 */
const addHeader = (doc, pageNumber, logos = null) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Add gradient background for header (using rectangles with opacity)
  doc.setFillColor(11, 113, 134) // #0B7186
  doc.rect(0, 0, pageWidth, 35, "F")

  // Add decorative accent
  doc.setFillColor(255, 184, 3) // #FFB803
  doc.rect(0, 35, pageWidth, 2, "F")

  // Add logos
  let logoX = 15
  const logoY = 10

  if (logos?.memd) {
    try {
      doc.addImage(logos.memd, "PNG", logoX, logoY, LOGO_CONFIG.memd.width, LOGO_CONFIG.memd.height)
      logoX += LOGO_CONFIG.memd.width + 5
    } catch (error) {
      console.error("Error adding MEMD logo:", error)
    }
  }

  if (logos?.nrep) {
    try {
      doc.addImage(logos.nrep, "PNG", logoX, logoY, LOGO_CONFIG.nrep.width, LOGO_CONFIG.nrep.height)
    } catch (error) {
      console.error("Error adding NREP logo:", error)
    }
  }

  // If no logos, add text placeholders
  if (!logos?.memd && !logos?.nrep) {
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text("MEMD | NREP", 15, 22)
  }

  // Add title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  const title = "Conference Program"
  const titleWidth = doc.getTextWidth(title)
  doc.text(title, pageWidth - titleWidth - 15, 22)

  // Add page number in footer
  doc.setFontSize(9)
  doc.setTextColor(128, 128, 128)
  doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: "center" })

  // Add footer line
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)
}

/**
 * Add cover page with conference details
 * @param {jsPDF} doc - jsPDF document instance
 * @param {Object} conference - Conference data
 * @param {Object} program - Program data
 * @param {Array} sessions - Array of session data
 */
const addCoverPage = (doc, conference, program, sessions) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  let yPosition = 60

  // Main title with gradient effect (using multiple text layers)
  doc.setFontSize(28)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(11, 113, 134)
  const mainTitle = conference?.title || "Conference"
  doc.text(mainTitle, pageWidth / 2, yPosition, { align: "center" })

  yPosition += 20
  doc.setFontSize(18)
  doc.setTextColor(255, 184, 3)
  doc.text(program?.title || "Program Schedule", pageWidth / 2, yPosition, { align: "center" })

  // Add decorative line
  yPosition += 15
  doc.setDrawColor(11, 113, 134)
  doc.setLineWidth(1)
  doc.line(pageWidth / 4, yPosition, (3 * pageWidth) / 4, yPosition)

  // Conference details in a styled box
  yPosition += 20
  const boxX = 30
  const boxWidth = pageWidth - 60
  const boxY = yPosition
  const boxHeight = 80

  // Box background
  doc.setFillColor(247, 250, 252) // Light gray background
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "F")

  // Box border
  doc.setDrawColor(11, 113, 134)
  doc.setLineWidth(0.5)
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "S")

  // Conference details
  yPosition += 15
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(60, 60, 60)

  const details = [
    {
      label: "Dates:",
      value: `${formatDate(conference?.startDate)} - ${formatDate(conference?.endDate)}`,
    },
    { label: "Location:", value: conference?.location || "TBD" },
    { label: "Venue:", value: conference?.venue || "TBD" },
    { label: "Days:", value: `${program?.daysCount || 0} Days` },
    { label: "Sessions:", value: `${sessions?.length || 0} Sessions` },
  ]

  details.forEach((detail) => {
    doc.setFont("helvetica", "normal")
    doc.text(detail.label, boxX + 10, yPosition)
    doc.setFont("helvetica", "bold")
    doc.text(detail.value, boxX + 40, yPosition)
    yPosition += 12
  })

  // Add status badge
  yPosition += 20
  doc.setFillColor(11, 113, 134)
  doc.roundedRect(pageWidth / 2 - 25, yPosition, 50, 12, 2, 2, "F")
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(program?.status || "PUBLISHED", pageWidth / 2, yPosition + 8, { align: "center" })

  // Add disclaimer/note at bottom
  yPosition = doc.internal.pageSize.getHeight() - 40
  doc.setFontSize(9)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(100, 100, 100)
  const note = "This program is subject to change. Please check for updates regularly."
  doc.text(note, pageWidth / 2, yPosition, { align: "center" })
}

/**
 * Add sessions for a specific day
 * @param {jsPDF} doc - jsPDF document instance
 * @param {number} day - Day number
 * @param {Array} daySessions - Sessions for this day
 * @param {string} dayDate - Formatted date for this day
 * @param {Object} logos - Logos object
 */
const addDaySessions = (doc, day, daySessions, dayDate, logos) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  let yPosition = 50

  // Day header
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(11, 113, 134)
  doc.text(`Day ${day}`, 15, yPosition)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  doc.text(dayDate, 15, yPosition + 8)

  yPosition += 20

  // Group sessions by time slot
  const timeSlots = {}
  daySessions.forEach((session) => {
    const timeKey = `${session.startTime}-${session.toTime}`
    if (!timeSlots[timeKey]) {
      timeSlots[timeKey] = {
        startTime: session.startTime,
        toTime: session.toTime,
        sessions: [],
      }
    }
    timeSlots[timeKey].sessions.push(session)
  })

  // Add sessions by time slot
  Object.values(timeSlots).forEach((timeSlot) => {
    // Check if we need a new page
    if (yPosition > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      addHeader(doc, doc.internal.getCurrentPageInfo().pageNumber, logos)
      yPosition = 50
    }

    // Time slot header
    const startTime = formatTime(timeSlot.startTime)
    const endTime = formatTime(timeSlot.toTime)

    doc.setFillColor(11, 113, 134)
    doc.roundedRect(15, yPosition, pageWidth - 30, 10, 2, 2, "F")

    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255, 255, 255)
    doc.text(`${startTime} - ${endTime} (EAT)`, 20, yPosition + 7)

    yPosition += 15

    // Add sessions in this time slot
    timeSlot.sessions.forEach((session, index) => {
      const contentWidth = pageWidth - 50 // Working width for text
      const lineHeight = 4.5 // Consistent line height in mm
      const pageBottom = doc.internal.pageSize.getHeight() - 25

      // Check if we need a new page
      if (yPosition > pageBottom - 30) {
        doc.addPage()
        addHeader(doc, doc.internal.getCurrentPageInfo().pageNumber, logos)
        yPosition = 50
      }

      // Session separator line
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.line(20, yPosition, pageWidth - 20, yPosition)
      yPosition += 8

      // Badges
      doc.setFillColor(11, 113, 134)
      doc.setFontSize(7)
      doc.setFont("helvetica", "bold")
      const hallBadgeWidth = doc.getTextWidth(session.venueHall) + 6
      doc.roundedRect(20, yPosition - 3, hallBadgeWidth, 6, 1, 1, "F")
      doc.setTextColor(255, 255, 255)
      doc.text(session.venueHall, 23, yPosition + 1)

      if (session.theme) {
        const themeX = 23 + hallBadgeWidth
        doc.setFillColor(255, 184, 3)
        const themeBadgeWidth = doc.getTextWidth(session.theme) + 6
        doc.roundedRect(themeX, yPosition - 3, themeBadgeWidth, 6, 1, 1, "F")
        doc.text(session.theme, themeX + 3, yPosition + 1)
      }
      yPosition += 8

      // Title
      const title = session.title || "Untitled Session"
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(11, 113, 134)
      const titleLines = doc.splitTextToSize(title, contentWidth)

      titleLines.forEach((line) => {
        if (yPosition + lineHeight > pageBottom) {
          doc.addPage()
          addHeader(doc, doc.internal.getCurrentPageInfo().pageNumber, logos)
          yPosition = 50
          // Restore title styling after page break
          doc.setFontSize(11)
          doc.setFont("helvetica", "bold")
          doc.setTextColor(11, 113, 134)
        }
        doc.text(line, 20, yPosition)
        yPosition += lineHeight
      })
      yPosition += 3

      // Organizer
      if (session.organizer) {
        if (yPosition + 5 > pageBottom) {
          doc.addPage()
          addHeader(doc, doc.internal.getCurrentPageInfo().pageNumber, logos)
          yPosition = 50
        }
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(80, 80, 80)
        doc.text("Organizer:", 20, yPosition)
        doc.setFont("helvetica", "normal")
        doc.text(session.organizer, 45, yPosition)
        yPosition += 6
      }

      // Preamble - show all content with formatting
      if (session.preamble) {
        const preambleSegments = parseHtmlContent(session.preamble)
        if (preambleSegments.length > 0) {
          doc.setFontSize(8)
          doc.setTextColor(60, 60, 60)
          yPosition = renderFormattedContent(
            doc,
            preambleSegments,
            20,
            yPosition,
            contentWidth,
            lineHeight,
            pageBottom,
            logos,
            { fontSize: 8, color: [60, 60, 60] }
          )
          yPosition += 3
        }
      }

      // Speakers - show all content with formatting
      if (session.speakers) {
        const speakersSegments = parseHtmlContent(session.speakers)
        if (speakersSegments.length > 0) {
          doc.setFontSize(7)
          doc.setTextColor(11, 113, 134)
          yPosition = renderFormattedContent(
            doc,
            speakersSegments,
            20,
            yPosition,
            contentWidth,
            lineHeight,
            pageBottom,
            logos,
            { fontSize: 7, color: [11, 113, 134] }
          )
          yPosition += 3
        }
      }

      yPosition += 5
    })

    yPosition += 5
  })
}

/**
 * Generate and download conference program PDF
 * @param {Object} conference - Conference data
 * @param {Object} program - Program data
 * @param {Array} sessions - Array of session data
 */
export const generateProgramPDF = async (conference, program, sessions) => {
  try {
    // Load logos
    const logos = await loadLogos()

    // Create new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    let pageNumber = 1

    // Add cover page
    addHeader(doc, pageNumber, logos)
    addCoverPage(doc, conference, program, sessions)

    // Add sessions for each day
    for (let day = 1; day <= (program?.daysCount || 0); day++) {
      const daySessions = sessions.filter((session) => session.day === day)

      if (daySessions.length > 0) {
        // Calculate day date
        const startDate = new Date(conference?.startDate)
        const dayDate = new Date(startDate)
        dayDate.setDate(startDate.getDate() + (day - 1))
        const formattedDayDate = formatDate(dayDate)

        // Add new page for each day
        doc.addPage()
        pageNumber++
        addHeader(doc, pageNumber, logos)
        addDaySessions(doc, day, daySessions, formattedDayDate, logos)
      }
    }

    // Generate filename
    const conferenceTitle = conference?.title || "Conference"
    const year = new Date(conference?.startDate).getFullYear()
    const filename = `${conferenceTitle.replace(/[^a-z0-9]/gi, "_")}_Program_${year}.pdf`

    // Save PDF
    doc.save(filename)

    return { success: true, filename }
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error("Failed to generate PDF")
  }
}
