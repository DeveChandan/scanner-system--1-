const express = require("express")
const router = express.Router()
const ExcelJS = require("exceljs")
const {
  Scanner1Model,
  Scanner2Model,
  Scanner3Model,
  Scanner4Model,
  Scanner5Model,
  Scanner6Model,
  Scanner7Model,
} = require("../models/scanner")

// Helper function to get scanner type based on ID
function getScannerType(scannerId) {
  const id = Number.parseInt(scannerId.replace("scanner", ""), 10)
  if (id >= 1 && id <= 3) return "pouch"
  if (id >= 4 && id <= 6) return "tin"
  if (id === 7) return "dispatch"
  return "unknown"
}

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

// Utility: Convert a UTC timestamp to IST string
function convertToIST(utcTimestamp) {
  return new Date(utcTimestamp).toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

// Simple test endpoint to verify the export API routes are working
router.get("/export-test", (req, res) => {
  console.log("Export test endpoint accessed")
  res.json({
    success: true,
    message: "Export API is working correctly",
    timestamp: new Date(),
  })
})

// Debug endpoint to check if the export-excel route is registered
router.get("/export-debug", (req, res) => {
  console.log("Export debug endpoint accessed")
  res.json({
    success: true,
    message: "Export debug endpoint is working",
    query: req.query,
    timestamp: new Date(),
  })
})

// Main Excel export endpoint for scanner data
router.get("/export-excel", async (req, res) => {
  console.log("Export Excel endpoint accessed with query:", req.query)

  try {
    const {
      scannerId,
      scannerType,
      startDate,
      endDate,
      startTime,
      endTime,
      minQuantity,
      maxQuantity,
      lineNumber,
      shift,
      batchCode,
      materialCode,
    } = req.query

    // Validate scanner ID if provided
    if (scannerId && !scannerModels[scannerId]) {
      return res.status(400).json({ error: `Invalid scanner ID: ${scannerId}` })
    }

    // Build MongoDB query with optional filters
    const query = {}
    if (startDate || endDate || startTime || endTime) {
      query.timestamp = {}
      if (startDate) {
        const start = new Date(startDate)
        if (startTime) {
          const [hours, minutes] = startTime.split(":").map(Number)
          start.setHours(hours, minutes, 0, 0)
        } else {
          start.setHours(0, 0, 0, 0)
        }
        query.timestamp.$gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        if (endTime) {
          const [hours, minutes] = endTime.split(":").map(Number)
          end.setHours(hours, minutes, 59, 999)
        } else {
          end.setHours(23, 59, 59, 999)
        }
        query.timestamp.$lte = end
      }
    }

    // Additional filters
    if (scannerType) query.scannerType = scannerType
    if (minQuantity !== undefined || maxQuantity !== undefined) {
      query["parsedData.counter"] = {}
      if (minQuantity !== undefined) query["parsedData.counter"].$gte = Number(minQuantity)
      if (maxQuantity !== undefined) query["parsedData.counter"].$lte = Number(maxQuantity)
    }
    if (lineNumber) query["parsedData.lineNumber"] = lineNumber
    if (shift) query["parsedData.shift"] = shift
    if (batchCode) query["parsedData.batchCode"] = batchCode
    if (materialCode) query["parsedData.materialCode"] = materialCode

    console.log("MongoDB query:", JSON.stringify(query, null, 2))

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Scanner System"
    workbook.lastModifiedBy = "Scanner System"
    workbook.created = new Date()
    workbook.modified = new Date()

    // Determine scanners to process
    let scannersToProcess = []
    if (scannerId) {
      scannersToProcess = [{ id: scannerId, model: scannerModels[scannerId] }]
    } else if (scannerType) {
      const scannerIds = Object.keys(scannerModels)
      switch (scannerType) {
        case "pouch":
          scannersToProcess = scannerIds.slice(0, 3).map((id) => ({ id, model: scannerModels[id] }))
          break
        case "tin":
          scannersToProcess = scannerIds.slice(3, 6).map((id) => ({ id, model: scannerModels[id] }))
          break
        case "dispatch":
          scannersToProcess = [{ id: "scanner7", model: scannerModels["scanner7"] }]
          break
        default:
          scannersToProcess = Object.entries(scannerModels).map(([id, model]) => ({ id, model }))
      }
    } else {
      scannersToProcess = Object.entries(scannerModels).map(([id, model]) => ({ id, model }))
    }

    // Create Filter Summary worksheet
    const filterSheet = workbook.addWorksheet("Filter Criteria")
    filterSheet.columns = [
      { header: "Filter", key: "filter", width: 20 },
      { header: "Value", key: "value", width: 30 },
    ]
    filterSheet.getRow(1).font = { bold: true }
    filterSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }
    const filters = [
      { filter: "Scanner", value: scannerId || "All Scanners" },
      { filter: "Scanner Type", value: scannerType || "All Types" },
      { filter: "Start Date", value: startDate ? new Date(startDate).toLocaleDateString() : "Not specified" },
      { filter: "End Date", value: endDate ? new Date(endDate).toLocaleDateString() : "Not specified" },
      { filter: "Start Time", value: startTime || "Not specified" },
      { filter: "End Time", value: endTime || "Not specified" },
      { filter: "Min Quantity", value: minQuantity || "Not specified" },
      { filter: "Max Quantity", value: maxQuantity || "Not specified" },
      { filter: "Line Number", value: lineNumber || "Not specified" },
      { filter: "Shift", value: shift || "Not specified" },
      { filter: "Batch Code", value: batchCode || "Not specified" },
      { filter: "Material Code", value: materialCode || "Not specified" },
      { filter: "Export Date", value: new Date().toLocaleString() },
    ]
    filters.forEach((item) => filterSheet.addRow(item))

    // Create a Summary worksheet (for overall scanner summary)
    const summarySheet = workbook.addWorksheet("Summary")
    summarySheet.columns = [
      { header: "Scanner ID", key: "scannerId", width: 15 },
      { header: "Scanner Type", key: "scannerType", width: 15 },
      { header: "Total Records", key: "total", width: 15 },
      { header: "Valid Records", key: "valid", width: 15 },
      { header: "Invalid Records", key: "invalid", width: 15 },
      { header: "First Record", key: "firstRecord", width: 20 },
      { header: "Last Record", key: "lastRecord", width: 20 },
    ]
    summarySheet.getRow(1).font = { bold: true }
    summarySheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

    let totalRecords = 0

    // Process each scanner in parallel for performance
    await Promise.all(
      scannersToProcess.map(async ({ id, model }) => {
        // Create worksheet for this scanner
        const worksheet = workbook.addWorksheet(id)
        worksheet.columns = [
          { header: "Timestamp", key: "timestamp", width: 22 },
          { header: "Scanner Type", key: "scannerType", width: 12 },
          { header: "Line Number", key: "lineNumber", width: 15 },
          { header: "Shift", key: "shift", width: 10 },
          { header: "Batch Code", key: "batchCode", width: 15 },
          { header: "Material Code", key: "materialCode", width: 15 },
          { header: "Carton Serial", key: "cartonSerial", width: 15 },
          { header: "Quantity", key: "quantity", width: 10 },
          { header: "Status", key: "status", width: 10 },
          { header: "Raw Data", key: "rawData", width: 30 },
        ]
        worksheet.getRow(1).font = { bold: true }
        worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

        const BATCH_SIZE = 5000
        let skip = 0
        let hasMore = true
        let scannerRecords = 0
        let validRecords = 0
        let invalidRecords = 0
        let firstRecord = null
        let lastRecord = null

        // Create scanner-specific query (if needed)
        const scannerQuery = { ...query }

        while (hasMore) {
          const data = await model.find(scannerQuery).sort({ timestamp: -1 }).skip(skip).limit(BATCH_SIZE).lean()
          if (!data.length) {
            hasMore = false
            continue
          }

          // Update first and last record timestamps
          if (!firstRecord && data.length > 0) {
            firstRecord = new Date(data[data.length - 1].timestamp)
          }
          if (data.length > 0) {
            lastRecord = new Date(data[0].timestamp)
          }

          // Map each document into a row with converted timestamp
          const rows = data.map((item) => {
            const parsedData = item.parsedData || {}
            if (item.isValid) validRecords++
            else invalidRecords++

            return {
              timestamp: convertToIST(item.timestamp), // Convert to IST
              scannerType: item.scannerType || getScannerType(id),
              lineNumber: parsedData.lineNumber || "-",
              shift: parsedData.shift || "-",
              batchCode: parsedData.batchCode || "-",
              materialCode: parsedData.materialCode || "-",
              cartonSerial: parsedData.cartonSerial || "-",
              quantity: parsedData.counter || 0,
              status: item.isValid ? "Valid" : "Invalid",
              rawData: item.rawData || "-",
            }
          })

          worksheet.addRows(rows)
          scannerRecords += data.length
          skip += BATCH_SIZE
          hasMore = data.length === BATCH_SIZE
        }

        // Format the timestamp column (Excel number format)
        worksheet.getColumn("timestamp").numFmt = "yyyy-mm-dd hh:mm:ss"

        // (Optional) Add conditional cell styling on the "status" column
        worksheet.getColumn("status").eachCell({ includeEmpty: false }, (cell, rowNumber) => {
          if (rowNumber > 1) {
            if (cell.value === "Valid") {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4EA" } }
            } else if (cell.value === "Invalid") {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE8E6" } }
            }
          }
        })

        // Add a summary row at the bottom of the scanner's sheet
        worksheet.addRow([])
        const sheetSummaryRow = worksheet.addRow([
          "Total Records",
          getScannerType(id),
          "",
          "",
          "",
          "",
          "",
          scannerRecords,
          "",
        ])
        sheetSummaryRow.font = { bold: true }

        // Add summary data for this scanner into the overall summary sheet (convert dates to IST)
        summarySheet.addRow({
          scannerId: id,
          scannerType: getScannerType(id),
          total: scannerRecords,
          valid: validRecords,
          invalid: invalidRecords,
          firstRecord: firstRecord ? convertToIST(firstRecord) : "N/A",
          lastRecord: lastRecord ? convertToIST(lastRecord) : "N/A",
        })

        totalRecords += scannerRecords
      })
    )

    // Add a total row to the summary sheet
    const totalRow = summarySheet.addRow({
      scannerId: "TOTAL",
      scannerType: "",
      total: totalRecords,
      valid: "",
      invalid: "",
      firstRecord: "",
      lastRecord: "",
    })
    totalRow.font = { bold: true }

    // Update the filter sheet with total records information
    filterSheet.addRow({ filter: "Total Records", value: totalRecords })

    // Set response headers for Excel download
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename=scanner-data-${new Date().toISOString().split("T")[0]}.xlsx`)

    // Write the workbook to the response stream and end the response
    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error("Error exporting Excel:", error)
    res.status(500).json({ error: "Internal server error", message: error.message })
  }
})

// Endpoint to export summary data to Excel
router.get("/export-summary", async (req, res) => {
  console.log("Export Summary endpoint accessed with query:", req.query)

  try {
    const { startDate, endDate, startTime, endTime, lineNumber, shift, batchCode, materialCode } = req.query
    const query = {}

    // Date and time filtering
    if (startDate || endDate || startTime || endTime) {
      query.timestamp = {}
      if (startDate) {
        const start = new Date(startDate)
        if (startTime) {
          const [hours, minutes] = startTime.split(":").map(Number)
          start.setHours(hours, minutes, 0, 0)
        } else {
          start.setHours(0, 0, 0, 0)
        }
        query.timestamp.$gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        if (endTime) {
          const [hours, minutes] = endTime.split(":").map(Number)
          end.setHours(hours, minutes, 59, 999)
        } else {
          end.setHours(23, 59, 59, 999)
        }
        query.timestamp.$lte = end
      }
    }

    // Additional filters
    if (lineNumber) query["parsedData.lineNumber"] = lineNumber
    if (shift) query["parsedData.shift"] = shift
    if (batchCode) query["parsedData.batchCode"] = batchCode
    if (materialCode) query["parsedData.materialCode"] = materialCode

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Scanner System"
    workbook.lastModifiedBy = "Scanner System"
    workbook.created = new Date()
    workbook.modified = new Date()

    // Filter summary worksheet
    const filterSheet = workbook.addWorksheet("Filter Criteria")
    filterSheet.columns = [
      { header: "Filter", key: "filter", width: 20 },
      { header: "Value", key: "value", width: 30 },
    ]
    filterSheet.getRow(1).font = { bold: true }
    filterSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }
    const filters = [
      { filter: "Start Date", value: startDate ? new Date(startDate).toLocaleDateString() : "Not specified" },
      { filter: "End Date", value: endDate ? new Date(endDate).toLocaleDateString() : "Not specified" },
      { filter: "Start Time", value: startTime || "Not specified" },
      { filter: "End Time", value: endTime || "Not specified" },
      { filter: "Line Number", value: lineNumber || "Not specified" },
      { filter: "Shift", value: shift || "Not specified" },
      { filter: "Batch Code", value: batchCode || "Not specified" },
      { filter: "Material Code", value: materialCode || "Not specified" },
      { filter: "Export Date", value: new Date().toLocaleString() },
    ]
    filters.forEach((item) => filterSheet.addRow(item))

    // Summary worksheet for overall scanner summary
    const summarySheet = workbook.addWorksheet("Summary")
    summarySheet.columns = [
      { header: "Scanner ID", key: "scannerId", width: 15 },
      { header: "Total Records", key: "total", width: 15 },
      { header: "Valid Records", key: "valid", width: 15 },
      { header: "Invalid Records", key: "invalid", width: 15 },
      { header: "Error Rate (%)", key: "errorRate", width: 15 },
      { header: "Date Range", key: "dateRange", width: 30 },
    ]
    summarySheet.getRow(1).font = { bold: true }
    summarySheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

    let totalAllScanners = 0

    for (const [scannerId, model] of Object.entries(scannerModels)) {
      const totalCount = await model.countDocuments(query)
      const validCount = await model.countDocuments({ ...query, isValid: true })
      const invalidCount = await model.countDocuments({ ...query, isValid: false })
      const errorRate = totalCount > 0 ? (invalidCount / totalCount) * 100 : 0
      totalAllScanners += totalCount

      // Get date range for the scanner and convert to IST
      const firstRecord = await model.findOne(query).sort({ timestamp: 1 }).limit(1)
      const lastRecord = await model.findOne(query).sort({ timestamp: -1 }).limit(1)
      let dateRange = "No data"
      if (firstRecord && lastRecord) {
        const firstDate = convertToIST(firstRecord.timestamp)
        const lastDate = convertToIST(lastRecord.timestamp)
        dateRange = firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`
      }

      summarySheet.addRow({
        scannerId,
        total: totalCount,
        valid: validCount,
        invalid: invalidCount,
        errorRate: errorRate.toFixed(2),
        dateRange,
      })
    }

    const totalRow = summarySheet.addRow({
      scannerId: "TOTAL",
      total: totalAllScanners,
    })
    totalRow.font = { bold: true }
    summarySheet.getColumn("errorRate").numFmt = '0.00"%"'

    // Hourly statistics worksheet
    const hourlySheet = workbook.addWorksheet("Hourly Statistics")
    hourlySheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Hour", key: "hour", width: 8 },
      { header: "Scanner ID", key: "scannerId", width: 15 },
      { header: "Valid Records", key: "valid", width: 15 },
      { header: "Invalid Records", key: "invalid", width: 15 },
      { header: "Total Records", key: "total", width: 15 },
    ]
    hourlySheet.getRow(1).font = { bold: true }
    hourlySheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

    for (const [scannerId, model] of Object.entries(scannerModels)) {
      const hourlyStats = await model.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
              hour: { $hour: "$timestamp" },
              isValid: "$isValid",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: { date: "$_id.date", hour: "$_id.hour" },
            stats: { $push: { isValid: "$_id.isValid", count: "$count" } },
          },
        },
        { $sort: { "_id.date": 1, "_id.hour": 1 } },
      ])

      hourlyStats.forEach((item) => {
        const validCount = item.stats.find((s) => s.isValid)?.count || 0
        const invalidCount = item.stats.find((s) => !s.isValid)?.count || 0
        hourlySheet.addRow({
          date: item._id.date,
          hour: item._id.hour,
          scannerId,
          valid: validCount,
          invalid: invalidCount,
          total: validCount + invalidCount,
        })
      })
    }

    filterSheet.addRow({ filter: "Total Records", value: totalAllScanners })

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=scanner-summary-${new Date().toISOString().split("T")[0]}.xlsx`
    )

    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error("Error exporting summary Excel:", error)
    res.status(500).json({ error: "Internal server error", message: error.message })
  }
})

// Endpoint to export by scanner type (redirect to export-excel)
router.get("/export-by-type", async (req, res) => {
  const { type, startDate, endDate } = req.query
  if (!type || !["pouch", "tin", "dispatch"].includes(type)) {
    return res.status(400).json({ error: "Invalid scanner type. Must be 'pouch', 'tin', or 'dispatch'" })
  }
  const redirectUrl = `/api/export-excel?scannerType=${type}${startDate ? `&startDate=${startDate}` : ""}${
    endDate ? `&endDate=${endDate}` : ""
  }`
  res.redirect(redirectUrl)
})

module.exports = router
