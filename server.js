/*const express = require("express")
const mongoose = require("mongoose")
const compression = require("compression")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const cors = require("cors")
const path = require("path")
const scannerManager = require("./scannerManager")
const config = require("./config")
const apiRoutes = require("./routes/api")
const productionApiRoutes = require("./routes/production-api")
const exportApiRoutes = require("./routes/export-api")
const connectionMonitorRoutes = require("./dashboard/connection-monitor")
const sapApiRoutes = require("./routes/sap-api")
const sapBatchApiRoutes = require("./routes/sap-batch-api") // Add this line

// Create Express app
const app = express()
const API_PORT = process.env.API_PORT || 8080 // Separate port for API server

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for chart.js
  })
)

// Dynamic CORS configuration allowing multiple origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://10.255.7.60:3000",
  process.env.CLIENT_URL, // In case you want to set it via environment variable
].filter(Boolean)

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true)
      } else {
        return callback(new Error("Not allowed by CORS"), false)
      }
    },
    credentials: true,
  })
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later",
})
app.use("/api/", limiter)

// Performance middleware
app.use(compression())

// Middleware
app.use(express.json())
app.use(
  express.static("public", {
    maxAge: "1d", // Cache static assets for 1 day
  }),
)

// Set strictQuery to true to address the deprecation warning
mongoose.set("strictQuery", true)

// MongoDB connection with optimized settings
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 5, // Maintain at least 5 socket connections
}

mongoose
  .connect(config.mongoURI, mongoOptions)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Register export routes FIRST to ensure they take precedence
console.log("Registering export API routes")
app.use("/api", exportApiRoutes)

// API routes
app.use("/api", apiRoutes)
app.use("/api", productionApiRoutes)
app.use("/api/sap", sapApiRoutes)
app.use("/api/sap-batch", sapBatchApiRoutes) // Add this line

// Dashboard routes for the HTML version
app.use("/dashboard/connection-monitor", connectionMonitorRoutes)

// Serve the HTML version of the production dashboard
app.get("/dashboard/production-html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/production-dashboard.html"))
})

// Add a direct test route for export functionality
app.get("/test-export", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Export Test</title>
      </head>
      <body>
        <h1>Export Test Page</h1>
        <p>Click the links below to test export functionality:</p>
        <ul>
          <li><a href="/api/export-test" target="_blank">Test Export API</a></li>
          <li><a href="/api/export-debug" target="_blank">Debug Export API</a></li>
          <li><a href="/api/export-excel?scannerId=scanner3" target="_blank">Export Excel (Scanner 3)</a></li>
          <li><a href="/api/export-summary" target="_blank">Export Summary</a></li>
        </ul>
      </body>
    </html>
  `)
})

// Add a test page for SAP batch API
app.get("/test-sap-batch", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SAP Batch API Test</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .test-section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          button { padding: 10px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
          button:hover { background-color: #45a049; }
          pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .result { margin-top: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background-color: #f9f9f9; min-height: 50px; }
          input, textarea { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; }
          textarea { height: 100px; }
        </style>
      </head>
      <body>
        <h1>SAP Batch API Test Page</h1>
        
        <div class="test-section">
          <h2>1. Test API Connection</h2>
          <button onclick="testApiConnection()">Test Connection</button>
          <div id="connection-result" class="result">Results will appear here...</div>
        </div>
        
        <div class="test-section">
          <h2>2. Get CSRF Token</h2>
          <button onclick="getCsrfToken()">Get Token</button>
          <div id="csrf-result" class="result">Results will appear here...</div>
        </div>
        
        <div class="test-section">
          <h2>3. Get Token Details</h2>
          <input type="text" id="token-id" placeholder="Enter Token ID (e.g., 2025-M251-0001113671)" value="2025-M251-0001113671">
          <button onclick="getTokenDetails()">Get Token Details</button>
          <div id="token-result" class="result">Results will appear here...</div>
        </div>
        
        <div class="test-section">
          <h2>4. Create/Update Token</h2>
          <textarea id="token-data" placeholder="Enter token data in JSON format">
{
  "TokenId": "2025-M251-0001113671",
  "MaterialCode": "400000926",
  "Quantity": 90
}
          </textarea>
          <button onclick="createUpdateToken()">Create/Update Token</button>
          <div id="create-token-result" class="result">Results will appear here...</div>
        </div>
        
        <div class="test-section">
          <h2>5. Create Transfer Order</h2>
          <textarea id="transfer-data" placeholder="Enter transfer order data in JSON format">
{
  "TokenId": "2025-M251-0001113671",
  "FromWarehouse": "WH01",
  "ToWarehouse": "WH02",
  "MaterialCode": "400000926",
  "Quantity": 90
}
          </textarea>
          <button onclick="createTransferOrder()">Create Transfer Order</button>
          <div id="transfer-result" class="result">Results will appear here...</div>
        </div>
        
        <div class="test-section">
          <h2>6. Update Batch Quantities</h2>
          <textarea id="batch-data" placeholder="Enter batch update data in JSON format">
{
  "batchUpdates": [
    {
      "BatchId": "0000000001",
      "MaterialCode": "400000926",
      "Quantity": 50
    },
    {
      "BatchId": "0000000002",
      "MaterialCode": "400000926",
      "Quantity": 40
    }
  ]
}
          </textarea>
          <button onclick="updateBatchQuantities()">Update Batch Quantities</button>
          <div id="batch-result" class="result">Results will appear here...</div>
        </div>
        
        <script>
          async function testApiConnection() {
            const resultDiv = document.getElementById('connection-result');
            resultDiv.innerHTML = 'Testing connection...';
            
            try {
              const response = await fetch('/api/sap-batch/test');
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
          
          async function getCsrfToken() {
            const resultDiv = document.getElementById('csrf-result');
            resultDiv.innerHTML = 'Fetching CSRF token...';
            
            try {
              const response = await fetch('/api/sap-batch/csrf-token');
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
          
          async function getTokenDetails() {
            const tokenId = document.getElementById('token-id').value.trim();
            const resultDiv = document.getElementById('token-result');
            
            if (!tokenId) {
              resultDiv.innerHTML = 'Please enter a Token ID';
              return;
            }
            
            resultDiv.innerHTML = \`Fetching token details for \${tokenId}...\`;
            
            try {
              const response = await fetch(\`/api/sap-batch/token/\${encodeURIComponent(tokenId)}\`);
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
          
          async function createUpdateToken() {
            const tokenDataStr = document.getElementById('token-data').value.trim();
            const resultDiv = document.getElementById('create-token-result');
            
            if (!tokenDataStr) {
              resultDiv.innerHTML = 'Please enter token data';
              return;
            }
            
            resultDiv.innerHTML = 'Creating/updating token...';
            
            try {
              const tokenData = JSON.parse(tokenDataStr);
              
              const response = await fetch('/api/sap-batch/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(tokenData),
              });
              
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
          
          async function createTransferOrder() {
            const transferDataStr = document.getElementById('transfer-data').value.trim();
            const resultDiv = document.getElementById('transfer-result');
            
            if (!transferDataStr) {
              resultDiv.innerHTML = 'Please enter transfer order data';
              return;
            }
            
            resultDiv.innerHTML = 'Creating transfer order...';
            
            try {
              const transferData = JSON.parse(transferDataStr);
              
              const response = await fetch('/api/sap-batch/transfer-order', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(transferData),
              });
              
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
          
          async function updateBatchQuantities() {
            const batchDataStr = document.getElementById('batch-data').value.trim();
            const resultDiv = document.getElementById('batch-result');
            
            if (!batchDataStr) {
              resultDiv.innerHTML = 'Please enter batch update data';
              return;
            }
            
            resultDiv.innerHTML = 'Updating batch quantities...';
            
            try {
              const batchData = JSON.parse(batchDataStr);
              
              const response = await fetch('/api/sap-batch/batch-update', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(batchData),
              });
              
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
        </script>
      </body>
    </html>
  `)
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
  })
})

// Start the server
const server = app.listen(API_PORT, () => {
  console.log(`API Server running on port ${API_PORT}`)
  console.log(`Test export functionality at: http://localhost:${API_PORT}/test-export`)
  console.log(`Test SAP batch API at: http://localhost:${API_PORT}/test-sap-batch`)

  // Initialize scanner connections
  scannerManager.initializeScanners()
})

// Set timeout for server
server.timeout = 120000 // 2 minutes

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  server.close(() => {
    console.log("HTTP server closed")
    scannerManager.disconnectAll()
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed")
      process.exit(0)
    })
  })

  // Force close if graceful shutdown fails
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down")
    process.exit(1)
  }, 10000)
})

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully")
  server.close(() => {
    console.log("HTTP server closed")
    scannerManager.disconnectAll()
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed")
      process.exit(0)
    })
  })

  // Force close if graceful shutdown fails
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down")
    process.exit(1)
  }, 10000)
})
*/

const express = require("express")
const mongoose = require("mongoose")
const compression = require("compression")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const cors = require("cors")
const path = require("path")
const scannerManager = require("./scannerManager")
const config = require("./config")
const apiRoutes = require("./routes/api")
const productionApiRoutes = require("./routes/production-api")
const exportApiRoutes = require("./routes/export-api")
const connectionMonitorRoutes = require("./dashboard/connection-monitor")
const sapApiRoutes = require("./routes/sap-api")
const sapBatchApiRoutes = require("./routes/sap-batch-api")
const palletApiRoutes = require("./routes/pallet-api") // Add this line
const sqlService = require("./Services/sql-server-service") // Add this line

// Create Express app
const app = express()
const API_PORT = process.env.API_PORT || 8080 // Separate port for API server

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for chart.js
  })
)
// Increase the limit to a suitable value, e.g., 10mb
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Dynamic CORS configuration allowing multiple origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://10.255.7.60:3000",
  process.env.CLIENT_URL, // In case you want to set it via environment variable
].filter(Boolean)

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true)
      } else {
        return callback(new Error("Not allowed by CORS"), false)
      }
    },
    credentials: true,
  })
)


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later",
})
app.use("/api/", limiter)

// Performance middleware
app.use(compression())

// Middleware
app.use(express.json())
app.use(
  express.static("public", {
    maxAge: "1d", // Cache static assets for 1 day
  }),
)

// Set strictQuery to true to address the deprecation warning
mongoose.set("strictQuery", true)

// MongoDB connection with optimized settings
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 5, // Maintain at least 5 socket connections
}

mongoose
  .connect(config.mongoURI, mongoOptions)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Initialize SQL Server connection pool
sqlService
  .initSqlPool()
  .then(() => console.log("SQL Server connection pool initialized"))
  .catch((err) => console.error("Error initializing SQL Server connection pool:", err))

// Register export routes FIRST to ensure they take precedence
console.log("Registering export API routes")
app.use("/api", exportApiRoutes)

// API routes
app.use("/api", apiRoutes)
app.use("/api", productionApiRoutes)
app.use("/api/sap", sapApiRoutes)
app.use("/api/sap-batch", sapBatchApiRoutes)
app.use("/api/pallet", palletApiRoutes) // Add this line

// Dashboard routes for the HTML version
app.use("/dashboard/connection-monitor", connectionMonitorRoutes)

// Serve the HTML version of the production dashboard
app.get("/dashboard/production-html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/production-dashboard.html"))
})

// Add a direct test route for export functionality
app.get("/test-export", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Export Test</title>
      </head>
      <body>
        <h1>Export Test Page</h1>
        <p>Click the links below to test export functionality:</p>
        <ul>
          <li><a href="/api/export-test" target="_blank">Test Export API</a></li>
          <li><a href="/api/export-debug" target="_blank">Debug Export API</a></li>
          <li><a href="/api/export-excel?scannerId=scanner3" target="_blank">Export Excel (Scanner 3)</a></li>
          <li><a href="/api/export-summary" target="_blank">Export Summary</a></li>
        </ul>
      </body>
    </html>
  `)
})

// Add a test page for pallet API
app.get("/test-pallet", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Pallet API Test</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .test-section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          button { padding: 10px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
          button:hover { background-color: #45a049; }
          pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .result { margin-top: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background-color: #f9f9f9; min-height: 50px; }
          input, textarea { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; }
          textarea { height: 100px; }
        </style>
      </head>
      <body>
        <h1>Pallet API Test Page</h1>
        
        <div class="test-section">
          <h2>1. Test API Connection</h2>
          <button onclick="testApiConnection()">Test Connection</button>
          <div id="connection-result" class="result">Results will appear here...</div>
        </div>
        
        <div class="test-section">
          <h2>2. Get Process Order Details</h2>
          <input type="text" id="order-no" placeholder="Enter Process Order Number (e.g., 000101036766)" value="000101036766">
          <button onclick="getProcessOrderDetails()">Get Order Details</button>
          <div id="order-result" class="result">Results will appear here...</div>
        </div>
        
        <div class="test-section">
          <h2>3. Get Pallet Data from SQL Server</h2>
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <input type="text" id="line-filter" placeholder="Line Filter (e.g., Line-4)" value="Line-4" style="flex: 1;">
            <input type="date" id="filter-date" value="${new Date().toISOString().split("T")[0]}" style="flex: 1;">
            <input type="number" id="subtract-value" placeholder="Subtract Value" value="4" style="flex: 1;">
          </div>
          <button onclick="getPalletData()">Get Pallet Data</button>
          <div id="pallet-result" class="result">Results will appear here...</div>
        </div>
        
        <div class="test-section">
          <h2>4. Get Scanner Data from MongoDB</h2>
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <select id="scanner-id" style="flex: 1;">
              <option value="">All Scanners</option>
              <option value="scanner1">Scanner 1</option>
              <option value="scanner2">Scanner 2</option>
              <option value="scanner3">Scanner 3</option>
              <option value="scanner4">Scanner 4</option>
              <option value="scanner5">Scanner 5</option>
              <option value="scanner6">Scanner 6</option>
              <option value="scanner7">Scanner 7</option>
            </select>
            <input type="date" id="start-date" value="${new Date().toISOString().split("T")[0]}" style="flex: 1;">
            <input type="date" id="end-date" value="${new Date().toISOString().split("T")[0]}" style="flex: 1;">
          </div>
          <button onclick="getScannerData()">Get Scanner Data</button>
          <div id="scanner-result" class="result">Results will appear here...</div>
        </div>
        
        <div class="test-section">
          <h2>5. Submit Pallet Data to SAP</h2>
          <textarea id="pallet-data" placeholder="Enter pallet data in JSON format">
{
  "PalletNo": "20107846",
  "Status": "R",
  "CreatedBy": "VERTIF_02",
  "OrderToPallet": [
    {
      "ProcOrderNo": "000101036769",
      "SkuCode": "420000694",
      "BatchCode": "A1022CD",
      "Shift": "A",
      "LineOper": "04",
      "CartonSerialNo": "0560",
      "Box": "75",
      "Uom": "NOS"
    },
    {
      "ProcOrderNo": "000101036769",
      "SkuCode": "420000694",
      "BatchCode": "A1022CD",
      "Shift": "A",
      "LineOper": "04",
      "CartonSerialNo": "0561",
      "Box": "75",
      "Uom": "NOS"
    }
  ]
}
          </textarea>
          <button onclick="submitPalletData()">Submit Pallet Data</button>
          <div id="submit-result" class="result">Results will appear here...</div>
        </div>
        
        <script>
          async function testApiConnection() {
            const resultDiv = document.getElementById('connection-result');
            resultDiv.innerHTML = 'Testing connection...';
            
            try {
              const response = await fetch('/api/pallet/test');
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
          
          async function getProcessOrderDetails() {
            const orderNo = document.getElementById('order-no').value.trim();
            const resultDiv = document.getElementById('order-result');
            
            if (!orderNo) {
              resultDiv.innerHTML = 'Please enter a Process Order Number';
              return;
            }
            
            resultDiv.innerHTML = \`Fetching process order details for \${orderNo}...\`;
            
            try {
              const response = await fetch(\`/api/pallet/process-order/\${encodeURIComponent(orderNo)}\`);
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
          
          async function getPalletData() {
            const lineFilter = document.getElementById('line-filter').value.trim();
            const filterDate = document.getElementById('filter-date').value.trim();
            const subtractValue = document.getElementById('subtract-value').value.trim();
            const resultDiv = document.getElementById('pallet-result');
            
            if (!lineFilter || !filterDate) {
              resultDiv.innerHTML = 'Please enter Line Filter and Filter Date';
              return;
            }
            
            resultDiv.innerHTML = 'Fetching pallet data...';
            
            try {
              const url = \`/api/pallet/pallet-data?lineFilter=\${encodeURIComponent(lineFilter)}&filterDate=\${encodeURIComponent(filterDate)}\${subtractValue ? \`&subtractValue=\${encodeURIComponent(subtractValue)}\` : ''}\`;
              const response = await fetch(url);
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
          
          async function getScannerData() {
            const scannerId = document.getElementById('scanner-id').value.trim();
            const startDate = document.getElementById('start-date').value.trim();
            const endDate = document.getElementById('end-date').value.trim();
            const resultDiv = document.getElementById('scanner-result');
            
            if (!startDate) {
              resultDiv.innerHTML = 'Please enter Start Date';
              return;
            }
            
            resultDiv.innerHTML = 'Fetching scanner data...';
            
            try {
              let url = \`/api/pallet/scanner-data?startDate=\${encodeURIComponent(startDate)}\`;
              
              if (scannerId) {
                url += \`&scannerId=\${encodeURIComponent(scannerId)}\`;
              }
              
              if (endDate) {
                url += \`&endDate=\${encodeURIComponent(endDate)}\`;
              }
              
              const response = await fetch(url);
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
          
          async function submitPalletData() {
            const palletDataStr = document.getElementById('pallet-data').value.trim();
            const resultDiv = document.getElementById('submit-result');
            
            if (!palletDataStr) {
              resultDiv.innerHTML = 'Please enter pallet data';
              return;
            }
            
            resultDiv.innerHTML = 'Submitting pallet data...';
            
            try {
              const palletData = JSON.parse(palletDataStr);
              
              const response = await fetch('/api/pallet/submit-pallet', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(palletData),
              });
              
              const data = await response.json();
              resultDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } catch (error) {
              resultDiv.innerHTML = \`Error: \${error.message}\`;
            }
          }
        </script>
      </body>
    </html>
  `)
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() })
})

// Add more robust error handling for uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err)
  console.error(err.stack)

  // Log to a file or external service in production
  if (process.env.NODE_ENV === "production") {
    // Implement logging to file or external service here
  }

  // Give the server time to finish current requests before exiting
  setTimeout(() => {
    process.exit(1)
  }, 3000)
})

// Add more robust error handling for unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...", err)
  console.error(err.stack)

  // Log to a file or external service in production
  if (process.env.NODE_ENV === "production") {
    // Implement logging to file or external service here
  }

  // Give the server time to finish current requests before exiting
  setTimeout(() => {
    process.exit(1)
  }, 3000)
})

// Add a health check endpoint that checks scanner connections
app.get("/health-check", (req, res) => {
  const status = scannerManager.getConnectionStatus()
  const healthStatus = {
    server: "ok",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    sqlServer: sqlService.isPoolConnected() ? "connected" : "disconnected",
    scanners: {},
  }

  // Check health for each scanner
  Object.keys(status).forEach((scannerId) => {
    const isHealthy = scannerManager.isConnectionHealthy(scannerId)
    const connectionStatus = status[scannerId].status

    healthStatus.scanners[scannerId] = {
      connected: connectionStatus === "connected",
      receiving: isHealthy,
      status: connectionStatus === "connected" ? (isHealthy ? "healthy" : "stalled") : "disconnected",
    }
  })

  // Determine overall health
  const allScannersHealthy = Object.values(healthStatus.scanners).every((s) => s.status === "healthy")
  const mongodbHealthy = healthStatus.mongodb === "connected"

  if (allScannersHealthy && mongodbHealthy) {
    res.status(200).json({ status: "healthy", details: healthStatus })
  } else {
    res.status(503).json({ status: "unhealthy", details: healthStatus })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
  })
})

// Start the server
const server = app.listen(API_PORT, () => {
  console.log(`API Server running on port ${API_PORT}`)
  console.log(`Test export functionality at: http://localhost:${API_PORT}/test-export`)
  console.log(`Test pallet API at: http://localhost:${API_PORT}/test-pallet`)

  // Initialize scanner connections
  scannerManager.initializeScanners()
})

// Update the server.timeout to a more appropriate value for production
server.timeout = 300000 // 5 minutes

// Add a function to periodically check and restart stalled connections
function setupConnectionWatchdog() {
  const watchdogInterval = setInterval(
    () => {
      console.log("Running connection watchdog check...")
      const status = scannerManager.getConnectionStatus()

      Object.keys(status).forEach(async (scannerId) => {
        const connectionStatus = status[scannerId]
        const isHealthy = scannerManager.isConnectionHealthy(scannerId)

        // If connected but not receiving data (stalled), force reconnect
        if (connectionStatus.status === "connected" && !isHealthy) {
          console.log(
            `Watchdog detected stalled connection for ${scannerId}. Last data received: ${connectionStatus.lastDataReceived || "never"}. Forcing reconnect...`,
          )
          await scannerManager.forceReconnect(scannerId)
        }
      })
    },
    5 * 60 * 1000,
  ) // Check every 5 minutes

  return watchdogInterval
}

// Start the connection watchdog after server initialization
const connectionWatchdog = setupConnectionWatchdog()

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")

  // Clear the watchdog interval
  if (connectionWatchdog) {
    clearInterval(connectionWatchdog)
  }

  server.close(() => {
    console.log("HTTP server closed")
    scannerManager.disconnectAll()
    // Close SQL Server connection pool
    sqlService
      .closeSqlPool()
      .then(() => {
        mongoose.connection.close(false, () => {
          console.log("MongoDB connection closed")
          process.exit(0)
        })
      })
      .catch((err) => {
        console.error("Error closing SQL Server connection pool:", err)
        process.exit(1)
      })
  })

  // Force close if graceful shutdown fails
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down")
    process.exit(1)
  }, 10000)
})

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully")
  server.close(() => {
    console.log("HTTP server closed")
    scannerManager.disconnectAll()
    // Close SQL Server connection pool
    sqlService
      .closeSqlPool()
      .then(() => {
        mongoose.connection.close(false, () => {
          console.log("MongoDB connection closed")
          process.exit(0)
        })
      })
      .catch((err) => {
        console.error("Error closing SQL Server connection pool:", err)
        process.exit(1)
      })
  })

  // Force close if graceful shutdown fails
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down")
    process.exit(1)
  }, 10000)
})
