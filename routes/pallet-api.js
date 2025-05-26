const express = require("express")
const router = express.Router()
const sapService = require("../Services/sap-service")
const sqlService = require("../Services/sql-server-service")
const {
  Scanner1Model,
  Scanner2Model,
  Scanner3Model,
  Scanner4Model,
  Scanner5Model,
  Scanner6Model,
  Scanner7Model,
} = require("../models/scanner")

// Map scanner IDs to their models
const scannerModels = {
  scanner1: Scanner1Model,
  scanner2: Scanner2Model,
  scanner3: Scanner3Model,
  scanner4: Scanner4Model,
  scanner5: Scanner5Model,
  scanner6: Scanner6Model,
  scanner7: Scanner7Model,
}

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

// GET endpoint to fetch process order details
router.get("/process-order/:orderNo", validateSapCredentials, async (req, res) => {
  const { orderNo } = req.params

  try {
    const orderDetails = await sapService.getProcessOrderDetails(orderNo)

    res.json({
      success: true,
      data: orderDetails,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error(`Error fetching process order details for ${orderNo}:`, error.message)

    const errorResponse = {
      success: false,
      error: "Failed to fetch process order details from SAP",
      details: error.message,
    }

    if (error.response) {
      errorResponse.statusCode = error.response.status
      errorResponse.sapResponse = error.response.data
    }

    res.status(error.response?.status || 500).json(errorResponse)
  }
})

// GET endpoint to fetch pallet data from SQL Server
router.get("/pallet-data", async (req, res) => {
  const { lineFilter, filterDate, subtractValue } = req.query

  if (!lineFilter || !filterDate) {
    return res.status(400).json({
      error: "Missing required parameters",
      message: "lineFilter and filterDate are required",
    })
  }

  try {
    const palletData = await sqlService.getPalletData(
      lineFilter,
      filterDate,
      subtractValue ? Number.parseInt(subtractValue) : 4,
    )

    res.json({
      success: true,
      data: palletData,
      count: palletData.length,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error fetching pallet data:", error.message)

    res.status(500).json({
      success: false,
      error: "Failed to fetch pallet data from SQL Server",
      details: error.message,
    })
  }
})

// GET endpoint to fetch scanner data from MongoDB based on box count and date
router.get("/scanner-data", async (req, res) => {
  const { scannerId, startDate, endDate, boxCount, lineNumber, limit } = req.query

  if (!startDate) {
    return res.status(400).json({
      error: "Missing required parameter",
      message: "startDate is required",
    })
  }

  try {
    // Build query with date filtering
    const query = { timestamp: {}, isValid: true }

    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      query.timestamp.$gte = start
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query.timestamp.$lte = end
    }

    // Add line number filter if provided
    if (lineNumber) {
      query["parsedData.lineNumber"] = lineNumber
    }

    // Determine which models to query
    let models = []
    if (scannerId && scannerModels[scannerId]) {
      models = [{ id: scannerId, model: scannerModels[scannerId] }]
    } else {
      models = Object.entries(scannerModels).map(([id, model]) => ({ id, model }))
    }

    // Fetch data from each model
    const results = []

    for (const { id, model } of models) {
      const data = await model
        .find(query)
        .sort({ timestamp: -1 })
        .limit(Number(limit) || Number(boxCount) || 1000)

      // Add scanner ID to each result
      const formattedData = data.map((item) => {
        const doc = item.toObject()
        doc.scannerId = id
        return doc
      })

      results.push(...formattedData)
    }

    // Sort combined results by timestamp (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    res.json({
      success: true,
      data: results,
      count: results.length,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error fetching scanner data:", error.message)

    res.status(500).json({
      success: false,
      error: "Failed to fetch scanner data from MongoDB",
      details: error.message,
    })
  }
})

// POST endpoint to submit pallet data to SAP
router.post("/submit-pallet", validateSapCredentials, express.json(), async (req, res) => {
  const palletData = req.body

  // Validate required fields
  if (
    !palletData ||
    !palletData.PalletNo ||
    !Array.isArray(palletData.OrderToPallet) ||
    palletData.OrderToPallet.length === 0
  ) {
    return res.status(400).json({
      error: "Invalid request body",
      message: "PalletNo and OrderToPallet array are required",
    })
  }

  try {
    // Add retry mechanism for CSRF token issues
    let retryCount = 0
    const maxRetries = 3
    let result
    let success = false

    while (!success && retryCount < maxRetries) {
      try {
        result = await sapService.submitPalletData(palletData)
        success = true
      } catch (error) {
        // If it's a CSRF token error, retry
        if (
          error.response &&
          error.response.status === 403 &&
          (error.response.data.includes("CSRF token validation failed") ||
            error.message.includes("CSRF token validation failed"))
        ) {
          retryCount++
          console.log(`CSRF token validation failed. Retrying (${retryCount}/${maxRetries})...`)
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } else {
          // For other errors, throw
          throw error
        }
      }
    }

    if (!success) {
      throw new Error("Maximum retry attempts reached for CSRF token validation")
    }

    res.json({
      success: true,
      data: result,
      message: "Pallet data submitted successfully",
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error submitting pallet data:", error.message)

    const errorResponse = {
      success: false,
      error: "Failed to submit pallet data to SAP",
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
    message: "Pallet API routes are working correctly",
    endpoints: {
      getProcessOrder: "/api/pallet/process-order/:orderNo",
      getPalletData: "/api/pallet/pallet-data?lineFilter=Line-4&filterDate=2025-03-20&subtractValue=4",
      getScannerData:
        "/api/pallet/scanner-data?scannerId=scanner1&startDate=2025-03-20&endDate=2025-03-20&boxCount=75&lineNumber=4",
      submitPallet: "/api/pallet/submit-pallet",
    },
    timestamp: new Date(),
  })
})

module.exports = router
