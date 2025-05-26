
//New Add Logic 
const net = require("net")
const config = require("./config")
const crypto = require("crypto")
const {
  Scanner1Model,
  Scanner2Model,
  Scanner3Model,
  Scanner4Model,
  Scanner5Model,
  Scanner6Model, 
  Scanner7Model,
} = require("./models/scanner")
const ConnectionStatus = require("./models/connection-status")

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

// Store active client connections
const activeClients = {}
// Track connection status
const connectionStatus = {}

// Store the last timestamp used for each scanner
const lastTimestamps = {
  scanner1: null,
  scanner2: null,
  scanner3: null,
  scanner4: null,
  scanner5: null,
  scanner6: null,
  scanner7: null,
}

// Record connection status change in MongoDB
async function recordConnectionStatus(scannerId, status, ipAddress, port, errorMessage = null, reconnectAttempts = 0) {
  try {
    const statusRecord = new ConnectionStatus({
      scannerId,
      status,
      ipAddress,
      port,
      errorMessage,
      reconnectAttempts,
    })

    await statusRecord.save()

    // Update in-memory status
    connectionStatus[scannerId] = {
      status,
      lastStatusChange: new Date(),
      ipAddress,
      port,
      errorMessage,
      reconnectAttempts,
      // Keep the lastDataReceived timestamp if it exists
      lastDataReceived: connectionStatus[scannerId]?.lastDataReceived || null,
    }

    console.log(`Scanner ${scannerId} ${status} status recorded`)
  } catch (err) {
    console.error(`Error recording connection status for ${scannerId}:`, err)
  }
}

// Parse the received data
function parseData(rawData) {
  const parts = rawData.split(",")
  if (parts.length !== 5) {
    return {
      isValid: false,
      errorMessage: "Invalid data format: incorrect number of fields",
      parsedData: null,
    }
  }

  const [lineNumber, shift, batchCode, materialCode, cartonSerial] = parts

  // Validate the data format
  if (!lineNumber || !shift || !batchCode || !materialCode || !cartonSerial) {
    return {
      isValid: false,
      errorMessage: "Invalid data format: missing required fields",
      parsedData: null,
    }
  }

  return {
    isValid: true,
    errorMessage: null,
    parsedData: {
      type: lineNumber, // Keeping the field names for backward compatibility
      status: shift,
      productCode: batchCode,
      serialNumber: materialCode,
      counter: Number.parseInt(cartonSerial, 10) || 0,
      // Adding new fields with proper names
      lineNumber,
      shift,
      batchCode,
      materialCode,
      cartonSerial,
    },
  }
}

// Generate a unique ID for the database entry
function generateUniqueId(scannerId, timestamp, rawData) {
  return crypto.createHash("md5").update(`${scannerId}:${timestamp.toISOString()}:${rawData}`).digest("hex")
}

// Generate a unique timestamp that ensures no duplicates
function generateUniqueTimestamp(scannerId) {
  const now = new Date()

  // If this is the first timestamp or it's already different from the last one, use it
  if (!lastTimestamps[scannerId] || now.getTime() > lastTimestamps[scannerId].getTime()) {
    lastTimestamps[scannerId] = now
    return now
  }

  // If we have a duplicate timestamp, add 1 millisecond to the last timestamp
  const uniqueTimestamp = new Date(lastTimestamps[scannerId].getTime() + 1)
  lastTimestamps[scannerId] = uniqueTimestamp
  return uniqueTimestamp
}

// Add a new function to check if a connection is healthy and receiving data
function isConnectionHealthy(scannerId) {
  if (!activeClients[scannerId] || !connectionStatus[scannerId]) {
    return false
  }

  // Check if we've received data in the last 5 minutes
  const lastDataTime = connectionStatus[scannerId].lastDataReceived
  if (!lastDataTime) {
    return false
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  return lastDataTime > fiveMinutesAgo
}

// Add a function to monitor connection health and auto-recover if needed
function monitorConnectionHealth() {
  console.log("Monitoring scanner connection health...")

  Object.keys(activeClients).forEach(async (scannerId) => {
    const client = activeClients[scannerId]
    const status = connectionStatus[scannerId]

    if (!client || !status) return

    // If connected but not receiving data for 5 minutes, force reconnect
    if (status.status === "connected" && !isConnectionHealthy(scannerId)) {
      console.log(
        `Watchdog detected stalled connection for ${scannerId}. Last data received: ${status.lastDataReceived || "never"}. Forcing reconnect...`,
      )
      await forceReconnect(scannerId)
    }
  })
}

// Add a function to get scanner type based on scanner ID
function getScannerType(scannerId) {
  const id = Number.parseInt(scannerId.replace("scanner", ""), 10)
  if (id >= 1 && id <= 3) return "pouch"
  if (id >= 4 && id <= 6) return "tin"
  if (id === 7) return "dispatch"
  return "unknown"
}

// Function to create a TCP client for a scanner
function createScannerClient(scanner) {
  const client = new net.Socket()
  const model = scannerModels[scanner.id]
  let reconnectAttempts = 0
  let isConnected = false
  let keepAliveInterval = null

  if (!model) {
    console.error(`No model defined for scanner ${scanner.id}`)
    return null
  }

  function connectToScanner() {
    if (!scanner.ip) {
      console.error(`IP address not configured for ${scanner.id}`)
      recordConnectionStatus(
        scanner.id,
        "disconnected",
        scanner.ip,
        scanner.port,
        "IP address not configured",
        reconnectAttempts,
      )
      setTimeout(connectToScanner, 60000) // Try again in a minute
      return
    }

    // Clear any existing keep-alive interval
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval)
      keepAliveInterval = null
    }

    client.connect(scanner.port, scanner.ip, () => {
      console.log(`Connected to industrial scanner ${scanner.id} at ${scanner.ip}:${scanner.port}`)
      isConnected = true
      reconnectAttempts = 0

      // Set TCP keep-alive options
      client.setKeepAlive(true, 30000) // 30 seconds

      // Set TCP timeout
      client.setTimeout(60000) // 60 seconds

      // Send a keep-alive message every 30 seconds
      keepAliveInterval = setInterval(() => {
        if (client && isConnected) {
          try {
            // Send a null byte as keep-alive
            client.write(Buffer.from([0]))
          } catch (err) {
            console.error(`Error sending keep-alive to ${scanner.id}:`, err)
          }
        }
      }, 30000)

      // Record connection status
      recordConnectionStatus(scanner.id, "connected", scanner.ip, scanner.port)
    })
  }

  // Add timeout handler
  client.on("timeout", () => {
    console.log(`Connection timeout for ${scanner.id}. Destroying connection...`)
    client.destroy()
    // Connection close handler will handle reconnection
  })

  // Handle incoming data from industrial scanner
  client.on("data", async (data) => {
    const rawData = data.toString().trim()
    console.log(`Received data from ${scanner.id}:`, rawData)

    // Update last data received timestamp
    if (connectionStatus[scanner.id]) {
      connectionStatus[scanner.id].lastDataReceived = new Date()
    }

    // Parse the data
    const { isValid, errorMessage, parsedData } = parseData(rawData)

    // Generate a unique timestamp
    const timestamp = generateUniqueTimestamp(scanner.id)

    // Generate a unique ID for this entry
    const uniqueId = generateUniqueId(scanner.id, timestamp, rawData)

    // Save data to MongoDB
    const newData = new model({
      rawData: rawData,
      parsedData: parsedData,
      isValid: isValid,
      errorMessage: errorMessage,
      scannerType: getScannerType(scanner.id),
      timestamp: timestamp,
      uniqueId: uniqueId, // Include the uniqueId field
    })

    try {
      await newData.save()

      if (isValid) {
        console.log(`Valid data saved to MongoDB from ${scanner.id} with timestamp ${timestamp.toISOString()}`)
      } else {
        console.log(
          `Invalid data saved to MongoDB from ${scanner.id} with timestamp ${timestamp.toISOString()}. Error: ${errorMessage}`,
        )
      }
    } catch (err) {
      if (err.code === 11000) {
        // This is a duplicate key error (timestamp already exists)
        console.log(`Duplicate key detected for ${scanner.id}: ${timestamp.toISOString()}. Skipping save.`)
      } else {
        console.error(`Error saving data from ${scanner.id}:`, err)
      }
    }
  })

  // Handle connection close
  client.on("close", () => {
    if (isConnected) {
      console.log(`Connection closed for ${scanner.id}. Attempting to reconnect...`)
      isConnected = false
      reconnectAttempts++

      // Record disconnection
      recordConnectionStatus(
        scanner.id,
        "disconnected",
        scanner.ip,
        scanner.port,
        "Connection closed unexpectedly",
        reconnectAttempts,
      )
    }

    // Exponential backoff for reconnection attempts (max 5 minutes)
    const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts - 1), 300000)
    console.log(`Will attempt to reconnect ${scanner.id} in ${delay / 1000} seconds (attempt ${reconnectAttempts})`)

    setTimeout(connectToScanner, delay)
  })

  // Handle errors
  client.on("error", (err) => {
    console.error(`Connection error for ${scanner.id}:`, err)

    if (isConnected) {
      isConnected = false

      // Record error
      recordConnectionStatus(scanner.id, "disconnected", scanner.ip, scanner.port, err.message, reconnectAttempts)
    }
  })

  // Initial connection
  connectToScanner()

  return client
}

// Get current connection status for all scanners
function getConnectionStatus() {
  return connectionStatus
}

// Initialize all scanner connections
function initializeScanners() {
  // Initialize the last timestamps for each scanner
  Object.keys(scannerModels).forEach((scannerId) => {
    lastTimestamps[scannerId] = null
  })

  config.scanners.forEach((scanner) => {
    const client = createScannerClient(scanner)
    if (client) {
      activeClients[scanner.id] = client

      // Initialize status as disconnected
      connectionStatus[scanner.id] = {
        status: "disconnected",
        lastStatusChange: new Date(),
        ipAddress: scanner.ip,
        port: scanner.port,
        errorMessage: null,
        reconnectAttempts: 0,
        lastDataReceived: null,
      }
    }
  })

  // Start monitoring connection health every minute
  setInterval(monitorConnectionHealth, 60000)
}

// Disconnect all scanner connections
function disconnectAll() {
  Object.entries(activeClients).forEach(([scannerId, client]) => {
    if (client && client.destroy) {
      recordConnectionStatus(
        scannerId,
        "disconnected",
        connectionStatus[scannerId]?.ipAddress,
        connectionStatus[scannerId]?.port,
        "Application shutdown",
      )
      client.destroy()
    }
  })
}

// Force reconnect a specific scanner
async function forceReconnect(scannerId) {
  if (activeClients[scannerId] && activeClients[scannerId].destroy) {
    console.log(`Force reconnecting scanner ${scannerId}`)
    activeClients[scannerId].destroy()

    // Find the scanner config
    const scanner = config.scanners.find((s) => s.id === scannerId)
    if (scanner) {
      // Wait a bit before reconnecting
      await new Promise((resolve) => setTimeout(resolve, 1000))
      activeClients[scannerId] = createScannerClient(scanner)
      return true
    }
  }
  return false
}

module.exports = {
  initializeScanners,
  disconnectAll,
  activeClients,
  getConnectionStatus,
  forceReconnect,
  isConnectionHealthy,
  monitorConnectionHealth,
}
