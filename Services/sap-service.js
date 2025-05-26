const axios = require("axios")
const https = require("https")

// Environment variables for SAP connection
const SAP_BASE_URL = process.env.SAP_BASE_URL || "https://edvs4app.emamiagrotech.com:4443"
const SAP_USERNAME = process.env.SAP_USERNAME
const SAP_PASSWORD = process.env.SAP_PASSWORD
const SAP_CLIENT = process.env.SAP_CLIENT || "110"

// OData service path for Manual Palletization
const MANUAL_PALLET_SERVICE = "/sap/opu/odata/sap/ZMANUALPALLET_SRV"

// Create axios instance with default configuration for SAP
const sapClient = axios.create({
  baseURL: SAP_BASE_URL,
  // Allow self-signed certificates in development
  httpsAgent: new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV === "production",
  }),
  // Set default timeout
  timeout: 30000,
  // Basic auth headers
  auth: {
    username: SAP_USERNAME,
    password: SAP_PASSWORD,
  },
  headers: {
    "sap-client": SAP_CLIENT,
    Accept: "application/json",
  },
  // Important: Enable withCredentials to maintain cookies across requests
  withCredentials: true,
})

// Store the CSRF token and cookies
let csrfToken = null
let cookies = null

/**
 * Fetch CSRF token from SAP
 * @returns {Promise<{token: string, cookies: string}>} CSRF token and cookies
 */
async function fetchCSRFToken() {
  try {
    console.log("Fetching CSRF token from SAP...")

    const response = await sapClient.get(`${MANUAL_PALLET_SERVICE}/ManualPalletizationSet`, {
      headers: {
        "X-CSRF-Token": "Fetch",
      },
    })

    // Extract CSRF token from response headers
    const token = response.headers["x-csrf-token"]

    // Extract cookies from response headers
    const responseCookies = response.headers["set-cookie"]

    if (!token) {
      throw new Error("Failed to retrieve CSRF token from SAP")
    }

    console.log("Successfully retrieved CSRF token")

    // Store token and cookies for future requests
    csrfToken = token
    cookies = responseCookies

    return { token, cookies }
  } catch (error) {
    console.error("Error fetching CSRF token:", error.message)
    throw error
  }
}

/**
 * Get process order details by order number
 * @param {string} procOrderNo - The process order number
 * @returns {Promise<Object>} Process order details
 */
async function getProcessOrderDetails(procOrderNo) {
  try {
    console.log(`Fetching process order details for: ${procOrderNo}`)

    // Format the process order number with leading zeros if needed
    const formattedProcOrderNo = procOrderNo.startsWith("0") ? procOrderNo : procOrderNo.padStart(12, "0")

    const url = `/sap/opu/odata/sap/ZWAREHOUSE_BIN_SRV/ProcessOrderSet?$filter=ProcOrderNo eq '${encodeURIComponent(formattedProcOrderNo)}'`

    console.log(`SAP API URL: ${url}`)

    const response = await sapClient.get(url)

    console.log(`Successfully retrieved process order details for: ${procOrderNo}`)
    return response.data.d.results
  } catch (error) {
    console.error(`Error fetching process order details for ${procOrderNo}:`, error.message)
    throw error
  }
}

/**
 * Submit pallet data to SAP
 * @param {Object} palletData - The pallet data to submit
 * @returns {Promise<Object>} Submission result
 */
async function submitPalletData(palletData) {
  try {
    // Ensure all data is properly formatted
    const formattedPalletData = {
      ...palletData,
      OrderToPallet: palletData.OrderToPallet.map((item) => ({
        ...item,
        // Ensure ProcOrderNo is properly formatted with leading zeros
        ProcOrderNo: item.ProcOrderNo.startsWith("0") ? item.ProcOrderNo : item.ProcOrderNo.padStart(12, "0"),
        // Ensure Shift is not empty
        Shift: item.Shift || "A",
        // Ensure LineOper is padded to 2 digits
        LineOper: (item.LineOper || "").padStart(2, "0"),
        // Ensure CartonSerialNo is a string
        // If it's already 5 digits or more, use as is, otherwise pad to 4 digits
        CartonSerialNo: item.CartonSerialNo.length >= 5 ? item.CartonSerialNo : item.CartonSerialNo.padStart(4, "0"),
        // Ensure Box is a string
        Box: item.Box.toString(),
        // Ensure UoM is set
        Uom: item.Uom || "NOS",
      })),
    }

    console.log("Submitting pallet data to SAP:", JSON.stringify(formattedPalletData, null, 2))

    // Fetch a fresh CSRF token for each submission
    const { token, cookies } = await fetchCSRFToken()

    // Prepare headers with token and cookies
    const headers = {
      "X-CSRF-Token": token,
      "Content-Type": "application/json",
    }

    // If we have cookies, add them to the request
    if (cookies) {
      headers.Cookie = cookies.join("; ")
    }

    // Make the POST request with the token and cookies
    const response = await sapClient.post(`${MANUAL_PALLET_SERVICE}/ManualPalletizationSet`, formattedPalletData, {
      headers: headers,
    })

    console.log("Successfully submitted pallet data to SAP")
    return response.data.d
  } catch (error) {
    console.error("Error submitting pallet data to SAP:", error.message)

    // Add more detailed error information if available
    if (error.response) {
      console.error("SAP response status:", error.response.status)
      console.error("SAP response data:", JSON.stringify(error.response.data, null, 2))
    }

    throw error
  }
}

module.exports = {
  getProcessOrderDetails,
  submitPalletData,
  fetchCSRFToken,
}
