/*const express = require("express")
const router = express.Router()
const axios = require("axios")
const https = require("https")
const { URL } = require("url")

// Environment variables for SAP connection
const SAP_BASE_URL = process.env.SAP_BASE_URL || "https://edvs4app.emamiagrotech.com:4443"
const SAP_USERNAME = process.env.SAP_USERNAME
const SAP_PASSWORD = process.env.SAP_PASSWORD
const SAP_CLIENT = process.env.SAP_CLIENT || "110"

// Create axios instance with default configuration for SAP
const sapClient = axios.create({
  // Allow self-signed certificates in development
  httpsAgent: new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV === "production",
  }),
  // Set default timeout
  timeout: 30000,
})

// Middleware to validate SAP credentials are available
const validateSapCredentials = (req, res, next) => {
  if (!SAP_USERNAME || !SAP_PASSWORD) {
    return res.status(500).json({
      error: "SAP credentials not configured",
      message: "Please set SAP_USERNAME and SAP_PASSWORD environment variables",
    })
  }
  next()
}

// Middleware to validate request parameters
const validateBinRequest = (req, res, next) => {
  const { procOrderNo, materialCode, quantity } = req.query

  if (!procOrderNo) {
    return res.status(400).json({ error: "Missing required parameter: procOrderNo" })
  }

  if (!materialCode) {
    return res.status(400).json({ error: "Missing required parameter: materialCode" })
  }

  if (!quantity) {
    return res.status(400).json({ error: "Missing required parameter: quantity" })
  }

  // Validate format of parameters
  if (!/^\d+$/.test(quantity)) {
    return res.status(400).json({ error: "Invalid quantity format. Must be a number." })
  }

  next()
}

// Helper function to build SAP OData URL with proper encoding
const buildSapODataUrl = (endpoint, filters) => {
  const baseUrl = `${SAP_BASE_URL}/sap/opu/odata/sap/ZWAREHOUSE_BIN_SRV/${endpoint}`

  if (!filters || Object.keys(filters).length === 0) {
    return baseUrl
  }

  // Build filter string
  const filterParts = Object.entries(filters).map(([key, value]) => {
    // Handle string values with quotes
    const formattedValue = typeof value === "string" ? `'${value}'` : value
    return `${key} eq ${formattedValue}`
  })

  const filterString = filterParts.join(" and ")
  return `${baseUrl}?$filter=${encodeURIComponent(filterString)}`
}

// GET endpoint to fetch bin information from SAP
router.get("/bin-info", validateSapCredentials, validateBinRequest, async (req, res) => {
  const { procOrderNo, materialCode, quantity } = req.query

  try {
    console.log(`Fetching bin info for PO: ${procOrderNo}, Material: ${materialCode}, Quantity: ${quantity}`)

    // Build the SAP OData URL
    const url = buildSapODataUrl("GetBinSet", {
      ProcOrderNo: procOrderNo,
      MaterialCode: materialCode,
      Quantity: Number.parseInt(quantity, 10),
    })

    console.log(`SAP OData request URL: ${url}`)

    // Make the request to SAP
    const response = await sapClient.get(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString("base64")}`,
        "sap-client": SAP_CLIENT,
        Accept: "application/json",
      },
    })

    // Log successful response (without sensitive data)
    console.log(`SAP OData response status: ${response.status}`)

    // Extract and format the bin data
    const binData = response.data.d && response.data.d.results ? response.data.d.results : []

    // Return the formatted response
    res.json({
      success: true,
      data: binData,
      count: binData.length,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error fetching SAP bin information:", error.message)

    // Format error response
    const errorResponse = {
      success: false,
      error: "Failed to fetch bin information from SAP",
      details: error.message,
    }

    // Add response data if available
    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// POST endpoint to update bin information in SAP
router.post("/update-bin", validateSapCredentials, express.json(), async (req, res) => {
  const { binId, procOrderNo, materialCode, quantity, action } = req.body

  // Validate required fields
  if (!binId || !procOrderNo || !materialCode || !quantity || !action) {
    return res.status(400).json({
      error: "Missing required parameters",
      message: "binId, procOrderNo, materialCode, quantity, and action are required",
    })
  }

  // Validate action type
  if (!["ALLOCATE", "DEALLOCATE", "CONFIRM"].includes(action)) {
    return res.status(400).json({
      error: "Invalid action",
      message: "Action must be one of: ALLOCATE, DEALLOCATE, CONFIRM",
    })
  }

  try {
    console.log(`Updating bin info - Bin: ${binId}, PO: ${procOrderNo}, Action: ${action}`)

    // Build the SAP OData endpoint for updating bin information
    const url = `${SAP_BASE_URL}/sap/opu/odata/sap/ZWAREHOUSE_BIN_SRV/UpdateBinSet`

    // Prepare the payload for SAP
    const payload = {
      BinId: binId,
      ProcOrderNo: procOrderNo,
      MaterialCode: materialCode,
      Quantity: Number.parseInt(quantity, 10),
      Action: action,
    }

    // Make the POST request to SAP
    const response = await sapClient.post(url, payload, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString("base64")}`,
        "sap-client": SAP_CLIENT,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    // Log successful response
    console.log(`SAP OData update response status: ${response.status}`)

    // Return the response from SAP
    res.json({
      success: true,
      data: response.data,
      message: `Bin ${binId} successfully ${action.toLowerCase()}d`,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error updating SAP bin information:", error.message)

    // Format error response
    const errorResponse = {
      success: false,
      error: "Failed to update bin information in SAP",
      details: error.message,
    }

    // Add response data if available
    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// GET endpoint to fetch bin history from SAP
router.get("/bin-history", validateSapCredentials, async (req, res) => {
  const { binId, startDate, endDate } = req.query

  if (!binId) {
    return res.status(400).json({ error: "Missing required parameter: binId" })
  }

  try {
    console.log(`Fetching bin history for Bin ID: ${binId}`)

    // Build filter object
    const filters = { BinId: binId }

    // Add date filters if provided
    if (startDate) {
      filters.StartDate = startDate
    }

    if (endDate) {
      filters.EndDate = endDate
    }

    // Build the SAP OData URL
    const url = buildSapODataUrl("BinHistorySet", filters)

    // Make the request to SAP
    const response = await sapClient.get(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString("base64")}`,
        "sap-client": SAP_CLIENT,
        Accept: "application/json",
      },
    })

    // Extract and format the history data
    const historyData = response.data.d && response.data.d.results ? response.data.d.results : []

    // Return the formatted response
    res.json({
      success: true,
      data: historyData,
      count: historyData.length,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error fetching SAP bin history:", error.message)

    const errorResponse = {
      success: false,
      error: "Failed to fetch bin history from SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

module.exports = router

*/

const express = require("express")
const router = express.Router()
const axios = require("axios")
const https = require("https")
const { URL } = require("url")

// Environment variables for SAP connection
const SAP_BASE_URL = process.env.SAP_BASE_URL || "https://edvs4app.emamiagrotech.com:4443"
const SAP_USERNAME = process.env.SAP_USERNAME
const SAP_PASSWORD = process.env.SAP_PASSWORD
const SAP_CLIENT = process.env.SAP_CLIENT || "110"

// Create axios instance with default configuration for SAP
const sapClient = axios.create({
  // Allow self-signed certificates in development
  httpsAgent: new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV === "production",
  }),
  // Set default timeout
  timeout: 30000,
})

// Middleware to validate SAP credentials are available
const validateSapCredentials = (req, res, next) => {
  if (!SAP_USERNAME || !SAP_PASSWORD) {
    return res.status(500).json({
      error: "SAP credentials not configured",
      message: "Please set SAP_USERNAME and SAP_PASSWORD environment variables",
    })
  }
  next()
}

// Middleware to validate request parameters
const validateBinRequest = (req, res, next) => {
  const { procOrderNo, materialCode, quantity } = req.query

  if (!procOrderNo) {
    return res.status(400).json({ error: "Missing required parameter: procOrderNo" })
  }

  if (!materialCode) {
    return res.status(400).json({ error: "Missing required parameter: materialCode" })
  }

  if (!quantity) {
    return res.status(400).json({ error: "Missing required parameter: quantity" })
  }

  // Validate format of parameters
  if (!/^\d+$/.test(quantity)) {
    return res.status(400).json({ error: "Invalid quantity format. Must be a number." })
  }

  next()
}

// Helper function to build SAP OData URL with proper encoding
const buildSapODataUrl = (endpoint, filters) => {
  const baseUrl = `${SAP_BASE_URL}/sap/opu/odata/sap/${endpoint}`

  if (!filters || Object.keys(filters).length === 0) {
    return baseUrl
  }

  // Build filter string
  const filterParts = Object.entries(filters).map(([key, value]) => {
    // Handle string values with quotes
    const formattedValue = typeof value === "string" ? `'${value}'` : value
    return `${key} eq ${formattedValue}`
  })

  const filterString = filterParts.join(" and ")
  return `${baseUrl}?$filter=${encodeURIComponent(filterString)}`
}

// GET endpoint to fetch bin information from SAP
router.get("/bin-info", validateSapCredentials, validateBinRequest, async (req, res) => {
  const { procOrderNo, materialCode, quantity } = req.query

  try {
    console.log(`Fetching bin info for PO: ${procOrderNo}, Material: ${materialCode}, Quantity: ${quantity}`)

    // Build the SAP OData URL
    const url = buildSapODataUrl("ZWAREHOUSE_BIN_SRV/GetBinSet", {
      ProcOrderNo: procOrderNo,
      MaterialCode: materialCode,
      Quantity: Number.parseInt(quantity, 10),
    })

    console.log(`SAP OData request URL: ${url}`)

    // Make the request to SAP
    const response = await sapClient.get(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString("base64")}`,
        "sap-client": SAP_CLIENT,
        Accept: "application/json",
      },
    })

    // Log successful response (without sensitive data)
    console.log(`SAP OData response status: ${response.status}`)

    // Extract and format the bin data
    const binData = response.data.d && response.data.d.results ? response.data.d.results : []

    // Return the formatted response
    res.json({
      success: true,
      data: binData,
      count: binData.length,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error fetching SAP bin information:", error.message)

    // Format error response
    const errorResponse = {
      success: false,
      error: "Failed to fetch bin information from SAP",
      details: error.message,
    }

    // Add response data if available
    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// POST endpoint to update bin information in SAP
router.post("/update-bin", validateSapCredentials, express.json(), async (req, res) => {
  const { binId, procOrderNo, materialCode, quantity, action } = req.body

  // Validate required fields
  if (!binId || !procOrderNo || !materialCode || !quantity || !action) {
    return res.status(400).json({
      error: "Missing required parameters",
      message: "binId, procOrderNo, materialCode, quantity, and action are required",
    })
  }

  // Validate action type
  if (!["ALLOCATE", "DEALLOCATE", "CONFIRM"].includes(action)) {
    return res.status(400).json({
      error: "Invalid action",
      message: "Action must be one of: ALLOCATE, DEALLOCATE, CONFIRM",
    })
  }

  try {
    console.log(`Updating bin info - Bin: ${binId}, PO: ${procOrderNo}, Action: ${action}`)

    // Build the SAP OData endpoint for updating bin information
    const url = `${SAP_BASE_URL}/sap/opu/odata/sap/ZWAREHOUSE_BIN_SRV/UpdateBinSet`

    // Prepare the payload for SAP
    const payload = {
      BinId: binId,
      ProcOrderNo: procOrderNo,
      MaterialCode: materialCode,
      Quantity: Number.parseInt(quantity, 10),
      Action: action,
    }

    // Make the POST request to SAP
    const response = await sapClient.post(url, payload, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString("base64")}`,
        "sap-client": SAP_CLIENT,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    // Log successful response
    console.log(`SAP OData update response status: ${response.status}`)

    // Return the response from SAP
    res.json({
      success: true,
      data: response.data,
      message: `Bin ${binId} successfully ${action.toLowerCase()}d`,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error updating SAP bin information:", error.message)

    // Format error response
    const errorResponse = {
      success: false,
      error: "Failed to update bin information in SAP",
      details: error.message,
    }

    // Add response data if available
    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// GET endpoint to fetch bin history from SAP
router.get("/bin-history", validateSapCredentials, async (req, res) => {
  const { binId, startDate, endDate } = req.query

  if (!binId) {
    return res.status(400).json({ error: "Missing required parameter: binId" })
  }

  try {
    console.log(`Fetching bin history for Bin ID: ${binId}`)

    // Build filter object
    const filters = { BinId: binId }

    // Add date filters if provided
    if (startDate) {
      filters.StartDate = startDate
    }

    if (endDate) {
      filters.EndDate = endDate
    }

    // Build the SAP OData URL
    const url = buildSapODataUrl("ZWAREHOUSE_BIN_SRV/BinHistorySet", filters)

    // Make the request to SAP
    const response = await sapClient.get(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString("base64")}`,
        "sap-client": SAP_CLIENT,
        Accept: "application/json",
      },
    })

    // Extract and format the history data
    const historyData = response.data.d && response.data.d.results ? response.data.d.results : []

    // Return the formatted response
    res.json({
      success: true,
      data: historyData,
      count: historyData.length,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error fetching SAP bin history:", error.message)

    const errorResponse = {
      success: false,
      error: "Failed to fetch bin history from SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// New GET endpoint to fetch loading sequence data using a token
router.get("/loading-sequence", validateSapCredentials, async (req, res) => {
  const { token } = req.query

  if (!token) {
    return res.status(400).json({ error: "Missing required parameter: token" })
  }

  try {
    console.log(`Fetching loading sequence data for Token: ${token}`)

    // Build the SAP OData URL
    const url = `${SAP_BASE_URL}/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/TokenDetailsSet('${token}')?$expand=getloadingsequence`

    // Make the request to SAP
    const response = await sapClient.get(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString("base64")}`,
        "sap-client": SAP_CLIENT,
        Accept: "application/json",
      },
    })

    // Extract and format the loading sequence data
    const loadingSequenceData = response.data.d ? response.data.d : {}

    // Return the formatted response
    res.json({
      success: true,
      data: loadingSequenceData,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error fetching loading sequence data:", error.message)

    const errorResponse = {
      success: false,
      error: "Failed to fetch loading sequence data from SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// New POST endpoint to update token details in SAP
router.post("/update-token", validateSapCredentials, express.json(), async (req, res) => {
  const { token, payload } = req.body

  if (!token || !payload) {
    return res.status(400).json({ error: "Missing required parameters: token and payload" })
  }

  try {
    console.log(`Updating token details for Token: ${token}`)

    // Fetch CSRF token
    const csrfResponse = await sapClient.get(`${SAP_BASE_URL}/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString("base64")}`,
        "sap-client": SAP_CLIENT,
        "X-CSRF-Token": "Fetch",
      },
    })

    const csrfToken = csrfResponse.headers["x-csrf-token"]

    if (!csrfToken) {
      throw new Error("CSRF token not found in response")
    }

    // Build the SAP OData URL
    const url = `${SAP_BASE_URL}/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/TokenDetailsSet('${token}')`

    // Make the POST request to SAP
    const response = await sapClient.post(url, payload, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString("base64")}`,
        "sap-client": SAP_CLIENT,
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
    })

    // Log successful response
    console.log(`SAP OData update token response status: ${response.status}`)

    // Return the response from SAP
    res.json({
      success: true,
      data: response.data,
      message: `Token ${token} successfully updated`,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error updating token details in SAP:", error.message)

    // Format error response
    const errorResponse = {
      success: false,
      error: "Failed to update token details in SAP",
      details: error.message,
    }

    // Add response data if available
    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

module.exports = router
