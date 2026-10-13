/**
 * Convert image URL to base64 for PDF embedding
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 encoded image
 */
export const imageUrlToBase64 = async (url) => {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error("Unable to load PDF logo")
    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
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
 * Load the configured NREP image through our server to avoid browser CORS failures.
 */
export const LOGO_CONFIG = {
  memd: {
    path: "/MEMD.png",
    width: 20,
    height: 20,
  },
  nrep: {
    path: "/api/program/logo",
    fallbackPath: "/nrep-logo.png",
    width: 20,
    height: 20,
  },
}

/**
 * Load logos for PDF generation
 * @returns {Promise<Object>} Object containing base64 encoded logos
 */
export const loadLogos = async () => {
  const [memd, configuredNrep] = await Promise.all([
    imageUrlToBase64(LOGO_CONFIG.memd.path),
    imageUrlToBase64(LOGO_CONFIG.nrep.path),
  ])
  const nrep = configuredNrep || await imageUrlToBase64(LOGO_CONFIG.nrep.fallbackPath)
  return { memd, nrep }
}
