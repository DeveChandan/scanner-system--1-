const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
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

// Get production data for all scanners
router.get("/production-data", async (req, res) => {
  const { startDate, endDate } = req.query

  try {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7))
    const end = endDate ? new Date(endDate) : new Date()

    // Ensure end date is set to the end of the day
    end.setHours(23, 59, 59, 999)

    const productionData = {}

    for (const [scannerId, model] of Object.entries(scannerModels)) {
      const aggregationPipeline = [
        {
          $match: {
            timestamp: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
              isValid: "$isValid",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            data: {
              $push: {
                isValid: "$_id.isValid",
                count: "$count",
              },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]

      const scannerData = await model.aggregate(aggregationPipeline)

      productionData[scannerId] = scannerData.map((day) => ({
        date: day._id,
        validCount: day.data.find((d) => d.isValid)?.count || 0,
        invalidCount: day.data.find((d) => !d.isValid)?.count || 0,
      }))
    }

    res.json(productionData)
  } catch (err) {
    console.error("Error fetching production data:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get total production counts
router.get("/production-totals", async (req, res) => {
  try {
    const totals = {}

    for (const [scannerId, model] of Object.entries(scannerModels)) {
      const [result] = await model.aggregate([
        {
          $group: {
            _id: null,
            totalValid: {
              $sum: { $cond: [{ $eq: ["$isValid", true] }, 1, 0] },
            },
            totalInvalid: {
              $sum: { $cond: [{ $eq: ["$isValid", false] }, 1, 0] },
            },
          },
        },
      ])

      totals[scannerId] = {
        totalValid: result ? result.totalValid : 0,
        totalInvalid: result ? result.totalInvalid : 0,
      }
    }

    res.json(totals)
  } catch (err) {
    console.error("Error fetching production totals:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get detailed scanner data
router.get("/scanner-details/:scannerId", async (req, res) => {
  const { scannerId } = req.params
  const { limit = 100, skip = 0, startDate, endDate } = req.query

  try {
    const model = scannerModels[scannerId]

    if (!model) {
      return res.status(404).json({ error: `Scanner ${scannerId} not found` })
    }

    // Build query with optional date filtering
    const query = {}

    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) query.timestamp.$gte = new Date(startDate)
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999) // Set to end of day
        query.timestamp.$lte = endDateTime
      }
    }

    // Fetch the data with pagination
    const data = await model.find(query).sort({ timestamp: -1 }).skip(Number(skip)).limit(Number(limit))

    const total = await model.countDocuments(query)

    res.json({
      data,
      pagination: {
        total,
        limit: Number(limit),
        skip: Number(skip),
        hasMore: total > Number(skip) + Number(limit),
      },
    })
  } catch (err) {
    console.error(`Error fetching detailed data for ${scannerId}:`, err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get line-item level data with date-wise filtering only
router.get("/line-items", async (req, res) => {
  try {
    // Extract and parse query parameters
    const scannerId = req.query.scannerId || null
    const skip = Number.parseInt(req.query.skip || "0", 10)
    const limit = Number.parseInt(req.query.limit || "100", 10)

    // Parse date filter parameters
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null

    console.log("Line items request:", {
      scannerId,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      skip,
      limit,
    })

    // Determine which models to query
    let models = []
    if (scannerId) {
      const model = scannerModels[scannerId]
      if (!model) {
        return res.status(404).json({ error: `Scanner ${scannerId} not found` })
      }
      models = [{ id: scannerId, model }]
    } else {
      models = Object.entries(scannerModels).map(([id, model]) => ({ id, model }))
    }

    // Build the date range query
    const query = {}

    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) {
        query.timestamp.$gte = startDate
      }
      if (endDate) {
        // Set end date to end of day
        const endOfDay = new Date(endDate)
        endOfDay.setHours(23, 59, 59, 999)
        query.timestamp.$lte = endOfDay
      }
    }

    console.log("MongoDB query:", JSON.stringify(query, null, 2))

    // Get total count across all models
    let totalCount = 0
    for (const { model } of models) {
      const count = await model.countDocuments(query)
      totalCount += count
    }

    // Fetch data with pagination
    const results = []
    let remainingSkip = skip
    let remainingLimit = limit

    for (const { id, model } of models) {
      if (remainingLimit <= 0) break

      const modelCount = await model.countDocuments(query)

      // Skip this model if we need to skip more records than it has
      if (remainingSkip >= modelCount) {
        remainingSkip -= modelCount
        continue
      }

      // Calculate how many records to fetch from this model
      const modelSkip = remainingSkip
      const modelLimit = Math.min(remainingLimit, modelCount - modelSkip)

      if (modelLimit > 0) {
        const data = await model.find(query).sort({ timestamp: -1 }).skip(modelSkip).limit(modelLimit)

        // Add scanner ID to each result
        const formattedData = data.map((item) => {
          const doc = item.toObject()
          doc.scannerId = id
          return doc
        })

        results.push(...formattedData)

        // Update remaining limit and skip for next model
        remainingLimit -= formattedData.length
        remainingSkip = 0 // Reset skip for next model
      }
    }

    // Sort combined results by timestamp
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    console.log(`Returning ${results.length} results out of ${totalCount} total (skip=${skip}, limit=${limit})`)

    res.json({
      data: results,
      pagination: {
        total: totalCount,
        limit: limit,
        skip: skip,
        hasMore: totalCount > skip + results.length,
      },
    })
  } catch (err) {
    console.error("Error fetching line-item data:", err)
    res.status(500).json({ error: "Internal server error", message: err.message })
  }
})

// Get line-item statistics
router.get("/line-item-stats", async (req, res) => {
  const { startDate, endDate, scannerId } = req.query

  try {
    // Determine which models to use
    let models = []
    if (scannerId) {
      const model = scannerModels[scannerId]
      if (!model) {
        return res.status(404).json({ error: `Scanner ${scannerId} not found` })
      }
      models = [{ id: scannerId, model }]
    } else {
      models = Object.entries(scannerModels).map(([id, model]) => ({ id, model }))
    }

    // Build date range query
    const query = { isValid: true }
    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) query.timestamp.$gte = new Date(startDate)
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999) // Set to end of day
        query.timestamp.$lte = endDateTime
      }
    }

    const stats = {}

    for (const { id, model } of models) {
      // Get line number stats
      const lineStats = await model.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$parsedData.lineNumber",
            count: { $sum: 1 },
            validCount: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])

      // Get shift stats
      const shiftStats = await model.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$parsedData.shift",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])

      // Get batch code stats
      const batchStats = await model.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$parsedData.batchCode",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])

      // Get material code stats
      const materialStats = await model.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$parsedData.materialCode",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])

      stats[id] = {
        lineStats,
        shiftStats,
        batchStats,
        materialStats,
      }
    }

    res.json(stats)
  } catch (err) {
    console.error("Error fetching line-item statistics:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

module.exports = router

