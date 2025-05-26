/*const axios = require("axios")
const https = require("https")

// Environment variables for SAP connection
const SAP_BASE_URL = process.env.SAP_BASE_URL || "https://edvs4app.emamiagrotech.com:4443"
const SAP_USERNAME = process.env.SAP_USERNAME
const SAP_PASSWORD = process.env.SAP_PASSWORD
const SAP_CLIENT = process.env.SAP_CLIENT || "110"

// OData service path
const BATCH_UPDATE_SERVICE = "/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV"

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
})


async function fetchCSRFToken() {
  try {
    console.log("Fetching CSRF token from SAP...")

    const response = await sapClient.get(`${BATCH_UPDATE_SERVICE}/TokenDetailsSet`, {
      headers: {
        "X-CSRF-Token": "Fetch",
      },
    })

    const csrfToken = response.headers["x-csrf-token"]

    if (!csrfToken) {
      throw new Error("Failed to retrieve CSRF token from SAP")
    }

    console.log("Successfully retrieved CSRF token")
    return csrfToken
  } catch (error) {
    console.error("Error fetching CSRF token:", error.message)
    throw error
  }
}


async function getTokenDetails(tokenId) {
  try {
    console.log(`Fetching token details for: ${tokenId}`)
 throw new Error(`HTTP error! Status: ${response.status}`)
 const response = await sapClient.get(`${BATCH_UPDATE_SERVICE}/TokenDetailsSet('${encodeURIComponent(tokenId)}')?$expand=getloadingsequence`, {
      headers: {
        Accept: "application/json",
      },
    })

    console.log(`Successfully retrieved token details for: ${tokenId}`)
    return response.data.d
  } catch (error) {
    console.error(`Error fetching token details for ${tokenId}:`, error.message)
    throw error
  }
}


async function getAllTokenDetails() {
  try {
    console.log("Fetching all token details")

    const response = await sapClient.get(`${BATCH_UPDATE_SERVICE}/TokenDetailsSet`, {
      headers: {
        Accept: "application/json",
      },
    })

    console.log(`Successfully retrieved ${response.data.d.results.length} token details`)
    return response.data.d.results
  } catch (error) {
    console.error("Error fetching all token details:", error.message)
    throw error
  }
}


async function createOrUpdateTokenDetails(tokenData) {
  try {
    console.log("Creating/updating token details:", tokenData.TokenId || "New Token")

    // First fetch a CSRF token
    const csrfToken = await fetchCSRFToken()

    // Then make the POST request with the token
    const response = await sapClient.post(`${BATCH_UPDATE_SERVICE}/TokenDetailsSet`, tokenData, {
      headers: {
        "X-CSRF-Token": csrfToken,
        "Content-Type": "application/json",
      },
    })

    console.log("Successfully created/updated token details")
    return response.data.d
  } catch (error) {
    console.error("Error creating/updating token details:", error.message)

    // Add more detailed error information if available
    if (error.response) {
      console.error("SAP response status:", error.response.status)
      console.error("SAP response data:", JSON.stringify(error.response.data, null, 2))
    }

    throw error
  }
}


async function createTransferOrder(transferData) {
  try {
    console.log("Creating transfer order:", JSON.stringify(transferData, null, 2))

    // First fetch a CSRF token
    const csrfToken = await fetchCSRFToken()

    // Then make the POST request with the token
    const response = await sapClient.post(`${BATCH_UPDATE_SERVICE}/TransferOrderSet`, transferData, {
      headers: {
        "X-CSRF-Token": csrfToken,
        "Content-Type": "application/json",
      },
    })

    console.log("Successfully created transfer order")
    return response.data.d
  } catch (error) {
    console.error("Error creating transfer order:", error.message)

    // Add more detailed error information if available
    if (error.response) {
      console.error("SAP response status:", error.response.status)
      console.error("SAP response data:", JSON.stringify(error.response.data, null, 2))
    }

    throw error
  }
}


async function updateBatchQuantities(batchUpdates) {
  try {
    console.log(`Updating quantities for ${batchUpdates.length} batches`)

    // First fetch a CSRF token
    const csrfToken = await fetchCSRFToken()

    // Then make the POST request with the token
    const response = await sapClient.post(
      `${BATCH_UPDATE_SERVICE}/BatchUpdateSet`,
      {
        BatchUpdates: batchUpdates,
      },
      {
        headers: {
          "X-CSRF-Token": csrfToken,
          "Content-Type": "application/json",
        },
      },
    )

    console.log("Successfully updated batch quantities")
    return response.data.d
  } catch (error) {
    console.error("Error updating batch quantities:", error.message)

    // Add more detailed error information if available
    if (error.response) {
      console.error("SAP response status:", error.response.status)
      console.error("SAP response data:", JSON.stringify(error.response.data, null, 2))
    }

    throw error
  }
}

module.exports = {
  getTokenDetails,
  getAllTokenDetails,
  createOrUpdateTokenDetails,
  createTransferOrder,
  updateBatchQuantities,
  fetchCSRFToken,
}
*/

const axios = require("axios")
const https = require("https")

// Environment variables for SAP connection
const SAP_BASE_URL = process.env.SAP_BASE_URL || "https://edvs4app.emamiagrotech.com:4443"
const SAP_USERNAME = process.env.SAP_USERNAME
const SAP_PASSWORD = process.env.SAP_PASSWORD
const SAP_CLIENT = process.env.SAP_CLIENT || "110"

// OData service path
const BATCH_UPDATE_SERVICE = "/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV"

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
})

/**
 * Fetch CSRF token from SAP
 * @returns {Promise<string>} CSRF token
 */
async function fetchCSRFToken() {
  try {
    console.log("Fetching CSRF token from SAP...")

    const response = await sapClient.get(`${BATCH_UPDATE_SERVICE}/TokenDetailsSet`, {
      headers: {
        "X-CSRF-Token": "Fetch",
      },
    })

    const csrfToken = response.headers["x-csrf-token"]

    if (!csrfToken) {
      throw new Error("Failed to retrieve CSRF token from SAP")
    }

    console.log("Successfully retrieved CSRF token")
    return csrfToken
  } catch (error) {
    console.error("Error fetching CSRF token:", error.message)
    throw error
  }
}

/**
 * Get token details by token ID
 * @param {string} tokenId - The token ID to fetch details for
 * @returns {Promise<Object>} Token details
 */
async function getTokenDetails(tokenId) {
  try {
    console.log(`Fetching token details for: ${tokenId}`);
    
    // Removed the unnecessary throw statement

    const response = await sapClient.get(
      `${BATCH_UPDATE_SERVICE}/TokenDetailsSet('${encodeURIComponent(tokenId)}')?$expand=getloadingsequence`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    console.log(`Successfully retrieved token details for: ${tokenId}`);
    return response.data.d;
  } catch (error) {
    console.error(`Error fetching token details for ${tokenId}:`, error.message);
    throw error;
  }
}


/**
 * Get all token details
 * @returns {Promise<Array>} List of token details
 */
async function getAllTokenDetails() {
  try {
    console.log("Fetching all token details")

    const response = await sapClient.get(`${BATCH_UPDATE_SERVICE}/TokenDetailsSet`, {
      headers: {
        Accept: "application/json",
      },
    })

    console.log(`Successfully retrieved ${response.data.d.results.length} token details`)
    return response.data.d.results
  } catch (error) {
    console.error("Error fetching all token details:", error.message)
    throw error
  }
}

/**
 * Create or update token details
 * @param {Object} tokenData - The token data to create or update
 * @returns {Promise<Object>} Created or updated token details
 */
async function createOrUpdateTokenDetails(tokenData) {
  try {
    console.log("Creating/updating token details:", tokenData.TokenId || "New Token")

    // First fetch a CSRF token
    const csrfToken = await fetchCSRFToken()

    // Then make the POST request with the token
    const response = await sapClient.post(`${BATCH_UPDATE_SERVICE}/TokenDetailsSet`, tokenData, {
      headers: {
        "X-CSRF-Token": csrfToken,
        "Content-Type": "application/json",
      },
    })

    console.log("Successfully created/updated token details")
    return response.data.d
  } catch (error) {
    console.error("Error creating/updating token details:", error.message)

    // Add more detailed error information if available
    if (error.response) {
      console.error("SAP response status:", error.response.status)
      console.error("SAP response data:", JSON.stringify(error.response.data, null, 2))
    }

    throw error
  }
}

/**
 * Create a transfer order in SAP
 * @param {Object} transferData - The transfer order data
 * @returns {Promise<Object>} Created transfer order details
 */
async function createTransferOrder(transferData) {
  try {
    console.log("Creating transfer order:", JSON.stringify(transferData, null, 2))

    // First fetch a CSRF token
    const csrfToken = await fetchCSRFToken()

    // Then make the POST request with the token
    const response = await sapClient.post(`${BATCH_UPDATE_SERVICE}/TransferOrderSet`, transferData, {
      headers: {
        "X-CSRF-Token": csrfToken,
        "Content-Type": "application/json",
      },
    })

    console.log("Successfully created transfer order")
    return response.data.d
  } catch (error) {
    console.error("Error creating transfer order:", error.message)

    // Add more detailed error information if available
    if (error.response) {
      console.error("SAP response status:", error.response.status)
      console.error("SAP response data:", JSON.stringify(error.response.data, null, 2))
    }

    throw error
  }
}

/**
 * Update batch quantities
 * @param {Array} batchUpdates - Array of batch updates
 * @returns {Promise<Object>} Result of batch update operation
 */
async function updateBatchQuantities(batchUpdates) {
  try {
    console.log(`Updating quantities for ${batchUpdates.length} batches`)

    // First fetch a CSRF token
    const csrfToken = await fetchCSRFToken()

    // Then make the POST request with the token
    const response = await sapClient.post(
      `${BATCH_UPDATE_SERVICE}/BatchUpdateSet`,
      {
        BatchUpdates: batchUpdates,
      },
      {
        headers: {
          "X-CSRF-Token": csrfToken,
          "Content-Type": "application/json",
        },
      },
    )

    console.log("Successfully updated batch quantities")
    return response.data.d
  } catch (error) {
    console.error("Error updating batch quantities:", error.message)

    // Add more detailed error information if available
    if (error.response) {
      console.error("SAP response status:", error.response.status)
      console.error("SAP response data:", JSON.stringify(error.response.data, null, 2))
    }

    throw error
  }
}

module.exports = {
  getTokenDetails,
  getAllTokenDetails,
  createOrUpdateTokenDetails,
  createTransferOrder,
  updateBatchQuantities,
  fetchCSRFToken,
}
