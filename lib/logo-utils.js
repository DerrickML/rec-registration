/**
 * Logo utility functions for PDF generation
 * This file contains base64 encoded logos for embedding in PDFs
 */

/**
 * Convert image URL to base64 for PDF embedding
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 encoded image
 */
export const imageUrlToBase64 = async (url) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Error converting image to base64:", error)
    return null
  }
}

/**
 * Get logo configuration for PDF
 * Update these paths to match your actual logo files
 */
export const LOGO_CONFIG = {
  memd: {
    path: "/MEMD.png",
    width: 20,
    height: 20,
  },
  nrep: {
    path: "/NREP.png",
    width: 20,
    height: 20,
  },
}

/**
 * Load logos for PDF generation
 * @returns {Promise<Object>} Object containing base64 encoded logos
 */
export const loadLogos = async () => {
  try {
    const logos = {}

    // Try to load MEMD logo
    try {
      logos.memd = await imageUrlToBase64(LOGO_CONFIG.memd.path)
    } catch (error) {
      console.warn("MEMD logo not found, using placeholder")
      logos.memd = null
    }

    // Try to load NREP logo
    try {
      logos.nrep = await imageUrlToBase64(LOGO_CONFIG.nrep.path)
    } catch (error) {
      console.warn("NREP logo not found, using placeholder")
      logos.nrep = null
    }

    return logos
  } catch (error) {
    console.error("Error loading logos:", error)
    return { memd: null, nrep: null }
  }
}
