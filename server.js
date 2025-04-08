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

// Create Express app
const app = express()
const API_PORT = process.env.API_PORT || 3001 // Separate port for API server

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for chart.js
  }),
)

// Enable CORS for the client application
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
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

// API routes
app.use("/api", apiRoutes)
app.use("/api", productionApiRoutes)
app.use("/api", exportApiRoutes) // Add the export API routes
app.use("/api/sap", sapApiRoutes)

// Dashboard routes for the HTML version
app.use("/dashboard/connection-monitor", connectionMonitorRoutes)

// Serve the HTML version of the production dashboard
app.get("/dashboard/production-html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/production-dashboard.html"))
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

/*
const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const path = require("path");
const scannerManager = require("./scannerManager");
const config = require("./config");
const apiRoutes = require("./routes/api");
const productionApiRoutes = require("./routes/production-api");
const exportApiRoutes = require("./routes/export-api");
const connectionMonitorRoutes = require("./dashboard/connection-monitor");
const sapApiRoutes = require("./routes/sap-api");
const { EventEmitter } = require("events");

// 🚫 Prevent EventEmitter memory leak warning
EventEmitter.defaultMaxListeners = 30;

// Create Express app
const app = express();
const API_PORT = process.env.API_PORT || 3001;

// ✅ Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

// ✅ Enable CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later",
});
app.use("/api/", limiter);

// ✅ Performance and body parsing
app.use(compression());
app.use(express.json());
app.use(
  express.static("public", {
    maxAge: "1d",
  }),
);

// ✅ MongoDB connection
mongoose.set("strictQuery", true);
mongoose
  .connect(config.mongoURI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    maxPoolSize: 10,
    minPoolSize: 5,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ API routes
app.use("/api", apiRoutes);
app.use("/api", productionApiRoutes);
app.use("/api", exportApiRoutes);
app.use("/api/sap", sapApiRoutes);
app.use("/dashboard/connection-monitor", connectionMonitorRoutes);

app.get("/dashboard/production-html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/production-dashboard.html"));
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
  });
});

// ✅ Start the server
const server = app.listen(API_PORT, () => {
  console.log(`🚀 API Server running on port ${API_PORT}`);
  scannerManager.initializeScanners();
});

// ✅ Set server timeout
server.timeout = 120000;

// ✅ Graceful shutdown
const gracefulShutdown = () => {
  console.log("🛑 Shutdown initiated...");
  server.close(() => {
    console.log("🔌 HTTP server closed");
    scannerManager.disconnectAll();
    mongoose.connection.close(false, () => {
      console.log("🗃️ MongoDB connection closed");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error("❗ Force shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
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

// Create Express app
const app = express()
const API_PORT = process.env.API_PORT || 3001 // Separate port for API server

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for chart.js
  }),
)

// Enable CORS for the client application
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
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

