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

// Add a simple test endpoint to verify the export-api routes are working
router.get("/export-test", (req, res) => {
  res.json({
    success: true,
    message: "Export API is working correctly",
    timestamp: new Date(),
  })
})

// Export scanner data to Excel with advanced filtering
router.get("/export-excel", async (req, res) => {
  try {
    const {
      scannerId,
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

    // Validate scanner ID
    if (scannerId && !scannerModels[scannerId]) {
      return res.status(400).json({ error: `Invalid scanner ID: ${scannerId}` })
    }

    // Build query with optional filters
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

    // Add quantity filtering if provided
    if (minQuantity !== undefined || maxQuantity !== undefined) {
      query["parsedData.counter"] = {}
      if (minQuantity !== undefined) {
        query["parsedData.counter"].$gte = Number(minQuantity)
      }
      if (maxQuantity !== undefined) {
        query["parsedData.counter"].$lte = Number(maxQuantity)
      }
    }

    // Add other filters if provided
    if (lineNumber) {
      query["parsedData.lineNumber"] = lineNumber
    }

    if (shift) {
      query["parsedData.shift"] = shift
    }

    if (batchCode) {
      query["parsedData.batchCode"] = batchCode
    }

    if (materialCode) {
      query["parsedData.materialCode"] = materialCode
    }

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Scanner System"
    workbook.lastModifiedBy = "Scanner System"
    workbook.created = new Date()
    workbook.modified = new Date()

    // Determine which scanners to include
    const scannersToProcess = scannerId
      ? [{ id: scannerId, model: scannerModels[scannerId] }]
      : Object.entries(scannerModels).map(([id, model]) => ({ id, model }))

    // Add a filter summary worksheet
    const filterSheet = workbook.addWorksheet("Filter Criteria")
    filterSheet.columns = [
      { header: "Filter", key: "filter", width: 20 },
      { header: "Value", key: "value", width: 30 },
    ]

    // Style the header row
    filterSheet.getRow(1).font = { bold: true }
    filterSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    }

    // Add filter criteria
    const filters = [
      { filter: "Scanner", value: scannerId || "All Scanners" },
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

    filters.forEach((item) => {
      filterSheet.addRow(item)
    })

    // Process each scanner
    let totalRecords = 0

    for (const { id, model } of scannersToProcess) {
      // Create a worksheet for this scanner
      const worksheet = workbook.addWorksheet(id)

      // Define columns
      worksheet.columns = [
        { header: "Timestamp", key: "timestamp", width: 22 },
        { header: "Line Number", key: "lineNumber", width: 15 },
        { header: "Shift", key: "shift", width: 10 },
        { header: "Batch Code", key: "batchCode", width: 15 },
        { header: "Material Code", key: "materialCode", width: 15 },
        { header: "Carton Serial", key: "cartonSerial", width: 15 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Status", key: "status", width: 10 },
        { header: "Raw Data", key: "rawData", width: 30 },
      ]

      // Style the header row
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      }

      // Fetch data with pagination to handle large datasets
      const BATCH_SIZE = 1000
      let skip = 0
      let hasMore = true
      let scannerRecords = 0

      while (hasMore) {
        const data = await model.find(query).sort({ timestamp: -1 }).skip(skip).limit(BATCH_SIZE).lean()

        if (data.length === 0) {
          hasMore = false
          continue
        }

        // Add rows to worksheet
        data.forEach((item) => {
          const parsedData = item.parsedData || {}
          const row = {
            timestamp: item.timestamp,
            lineNumber: parsedData.lineNumber || "-",
            shift: parsedData.shift || "-",
            batchCode: parsedData.batchCode || "-",
            materialCode: parsedData.materialCode || "-",
            cartonSerial: parsedData.cartonSerial || "-",
            quantity: parsedData.counter || 0,
            status: item.isValid ? "Valid" : "Invalid",
            rawData: item.rawData || "-",
          }
          worksheet.addRow(row)
          scannerRecords++
        })

        skip += BATCH_SIZE
        hasMore = data.length === BATCH_SIZE
      }

      // Format timestamp column
      worksheet.getColumn("timestamp").numFmt = "yyyy-mm-dd hh:mm:ss"

      // Add conditional formatting for status column
      worksheet.getColumn("status").eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 1) {
          if (cell.value === "Valid") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE6F4EA" }, // Light green
            }
          } else if (cell.value === "Invalid") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFCE8E6" }, // Light red
            }
          }
        }
      })

      // Add a summary row at the bottom
      worksheet.addRow([])
      const summaryRow = worksheet.addRow(["Total Records", "", "", "", "", "", "", scannerRecords, ""])
      summaryRow.font = { bold: true }

      totalRecords += scannerRecords
    }

    // Update the filter sheet with total records
    filterSheet.addRow({ filter: "Total Records", value: totalRecords })

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=scanner-data-${new Date().toISOString().split("T")[0]}.xlsx`,
    )

    // Write to response
    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error("Error exporting Excel:", error)
    res.status(500).json({ error: "Internal server error", message: error.message })
  }
})

// Export summary data to Excel
router.get("/export-summary", async (req, res) => {
  try {
    const { startDate, endDate, startTime, endTime, lineNumber, shift, batchCode, materialCode } = req.query

    // Build query with optional filters
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

    // Add other filters if provided
    if (lineNumber) {
      query["parsedData.lineNumber"] = lineNumber
    }

    if (shift) {
      query["parsedData.shift"] = shift
    }

    if (batchCode) {
      query["parsedData.batchCode"] = batchCode
    }

    if (materialCode) {
      query["parsedData.materialCode"] = materialCode
    }

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Scanner System"
    workbook.lastModifiedBy = "Scanner System"
    workbook.created = new Date()
    workbook.modified = new Date()

    // Add a filter summary worksheet
    const filterSheet = workbook.addWorksheet("Filter Criteria")
    filterSheet.columns = [
      { header: "Filter", key: "filter", width: 20 },
      { header: "Value", key: "value", width: 30 },
    ]

    // Style the header row
    filterSheet.getRow(1).font = { bold: true }
    filterSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    }

    // Add filter criteria
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

    filters.forEach((item) => {
      filterSheet.addRow(item)
    })

    // Create summary worksheet
    const summarySheet = workbook.addWorksheet("Summary")

    // Define columns for summary
    summarySheet.columns = [
      { header: "Scanner ID", key: "scannerId", width: 15 },
      { header: "Total Records", key: "total", width: 15 },
      { header: "Valid Records", key: "valid", width: 15 },
      { header: "Invalid Records", key: "invalid", width: 15 },
      { header: "Error Rate (%)", key: "errorRate", width: 15 },
      { header: "Date Range", key: "dateRange", width: 30 },
    ]

    // Style the header row
    summarySheet.getRow(1).font = { bold: true }
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    }

    // Get summary data for each scanner
    let totalAllScanners = 0

    for (const [scannerId, model] of Object.entries(scannerModels)) {
      const totalCount = await model.countDocuments(query)
      const validCount = await model.countDocuments({ ...query, isValid: true })
      const invalidCount = await model.countDocuments({ ...query, isValid: false })
      const errorRate = totalCount > 0 ? (invalidCount / totalCount) * 100 : 0

      totalAllScanners += totalCount

      // Get date range
      const firstRecord = await model.findOne(query).sort({ timestamp: 1 }).limit(1)
      const lastRecord = await model.findOne(query).sort({ timestamp: -1 }).limit(1)

      let dateRange = "No data"
      if (firstRecord && lastRecord) {
        const firstDate = new Date(firstRecord.timestamp).toLocaleString()
        const lastDate = new Date(lastRecord.timestamp).toLocaleString()
        dateRange = firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`
      }

      // Add row to summary sheet
      summarySheet.addRow({
        scannerId,
        total: totalCount,
        valid: validCount,
        invalid: invalidCount,
        errorRate: errorRate.toFixed(2),
        dateRange,
      })
    }

    // Add total row
    const totalRow = summarySheet.addRow({
      scannerId: "TOTAL",
      total: totalAllScanners,
    })
    totalRow.font = { bold: true }

    // Format error rate column
    summarySheet.getColumn("errorRate").numFmt = '0.00"%"'

    // Create hourly stats worksheet
    const hourlySheet = workbook.addWorksheet("Hourly Statistics")

    // Define columns for hourly stats
    hourlySheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Hour", key: "hour", width: 8 },
      { header: "Scanner ID", key: "scannerId", width: 15 },
      { header: "Valid Records", key: "valid", width: 15 },
      { header: "Invalid Records", key: "invalid", width: 15 },
      { header: "Total Records", key: "total", width: 15 },
    ]

    // Style the header row
    hourlySheet.getRow(1).font = { bold: true }
    hourlySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    }

    // Get hourly stats for each scanner
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
            _id: {
              date: "$_id.date",
              hour: "$_id.hour",
            },
            stats: {
              $push: {
                isValid: "$_id.isValid",
                count: "$count",
              },
            },
          },
        },
        { $sort: { "_id.date": 1, "_id.hour": 1 } },
      ])

      // Add rows to hourly stats sheet
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

    // Update the filter sheet with total records
    filterSheet.addRow({ filter: "Total Records", value: totalAllScanners })

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=scanner-summary-${new Date().toISOString().split("T")[0]}.xlsx`,
    )

    // Write to response
    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error("Error exporting summary Excel:", error)
    res.status(500).json({ error: "Internal server error", message: error.message })
  }
})

module.exports = router

