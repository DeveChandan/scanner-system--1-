const express = require("express")
const router = express.Router()
const sapBatchService = require("../Services/sap-batch-service")

// Middleware to validate SAP credentials are available
const validateSapCredentials = (req, res, next) => {
  if (!process.env.SAP_USERNAME || !process.env.SAP_PASSWORD) {
    return res.status(500).json({
      error: "SAP credentials not configured",
      message: "Please set SAP_USERNAME and SAP_PASSWORD environment variables",
    })
  }
  next()
}

// GET endpoint to fetch token details
router.get("/token/:tokenId", validateSapCredentials, async (req, res) => {
  const { tokenId } = req.params

  try {
    const tokenDetails = await sapBatchService.getTokenDetails(tokenId)

    res.json({
      success: true,
      data: tokenDetails,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error(`Error fetching token details for ${tokenId}:`, error.message)

    const errorResponse = {
      success: false,
      error: "Failed to fetch token details from SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// GET endpoint to fetch all token details
router.get("/tokens", validateSapCredentials, async (req, res) => {
  try {
    const tokens = await sapBatchService.getAllTokenDetails()

    res.json({
      success: true,
      data: tokens,
      count: tokens.length,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error fetching all token details:", error.message)

    const errorResponse = {
      success: false,
      error: "Failed to fetch token details from SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// POST endpoint to create or update token details
router.post("/token", validateSapCredentials, express.json(), async (req, res) => {
  const tokenData = req.body

  // Validate required fields
  if (!tokenData) {
    return res.status(400).json({
      error: "Missing request body",
      message: "Token data is required",
    })
  }

  try {
    const result = await sapBatchService.createOrUpdateTokenDetails(tokenData)

    res.json({
      success: true,
      data: result,
      message: "Token details created/updated successfully",
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error creating/updating token details:", error.message)

    const errorResponse = {
      success: false,
      error: "Failed to create/update token details in SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// POST endpoint to create a transfer order
router.post("/transfer-order", validateSapCredentials, express.json(), async (req, res) => {
  const transferData = req.body

  // Validate required fields
  if (!transferData) {
    return res.status(400).json({
      error: "Missing request body",
      message: "Transfer order data is required",
    })
  }

  try {
    const result = await sapBatchService.createTransferOrder(transferData)

    res.json({
      success: true,
      data: result,
      message: "Transfer order created successfully",
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error creating transfer order:", error.message)

    const errorResponse = {
      success: false,
      error: "Failed to create transfer order in SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// POST endpoint to update batch quantities
router.post("/batch-update", validateSapCredentials, express.json(), async (req, res) => {
  const { batchUpdates } = req.body

  // Validate required fields
  if (!batchUpdates || !Array.isArray(batchUpdates) || batchUpdates.length === 0) {
    return res.status(400).json({
      error: "Invalid request body",
      message: "batchUpdates array is required and must not be empty",
    })
  }

  try {
    const result = await sapBatchService.updateBatchQuantities(batchUpdates)

    res.json({
      success: true,
      data: result,
      message: "Batch quantities updated successfully",
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error updating batch quantities:", error.message)

    const errorResponse = {
      success: false,
      error: "Failed to update batch quantities in SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// GET endpoint to fetch CSRF token (for testing)
router.get("/csrf-token", validateSapCredentials, async (req, res) => {
  try {
    const csrfToken = await sapBatchService.fetchCSRFToken()

    res.json({
      success: true,
      token: csrfToken,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error fetching CSRF token:", error.message)

    const errorResponse = {
      success: false,
      error: "Failed to fetch CSRF token from SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// Test endpoint to verify the API is working
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "SAP Batch Update API routes are working correctly",
    config: {
      baseUrl: process.env.SAP_BASE_URL || "https://edvs4app.emamiagrotech.com:4443",
      service: "/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV",
      client: process.env.SAP_CLIENT || "100",
      credentialsConfigured: !!(process.env.SAP_USERNAME && process.env.SAP_PASSWORD),
    },
    endpoints: {
      getToken: "/api/sap-batch/token/:tokenId",
      getAllTokens: "/api/sap-batch/tokens",
      createUpdateToken: "/api/sap-batch/token",
      createTransferOrder: "/api/sap-batch/transfer-order",
      updateBatchQuantities: "/api/sap-batch/batch-update",
      testCsrfToken: "/api/sap-batch/csrf-token",
    },
    timestamp: new Date(),
  })
})

module.exports = router
