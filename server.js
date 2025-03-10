// Load environment variables early
require("dotenv").config();

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
const connectionMonitorRoutes = require("./dashboard/connection-monitor");

// Create Express app
const app = express();
const API_PORT = process.env.API_PORT || 3001; // Use a numeric port

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for chart.js
  })
);

// Enable CORS for the client application
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use("/api/", limiter);

// Performance middleware
app.use(compression());

// Middleware
app.use(express.json());
app.use(
  express.static("public", {
    maxAge: "1d", // Cache static assets for 1 day
  })
);

// Set strictQuery to true to address the deprecation warning
mongoose.set("strictQuery", true);

// MongoDB connection with optimized settings (deprecated options removed)
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  maxPoolSize: 10,
  minPoolSize: 5,
};

mongoose
  .connect(config.mongoURI, mongoOptions)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// API routes
app.use("/api", apiRoutes);
app.use("/api", productionApiRoutes);

// Dashboard routes for the HTML version
app.use("/dashboard/connection-monitor", connectionMonitorRoutes);

// Serve the HTML version of the production dashboard
app.get("/dashboard/production-html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/production-dashboard.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
  });
});

// Start the server
const server = app.listen(API_PORT, () => {
  console.log(`API Server running on port ${API_PORT}`);
  // Initialize scanner connections
  scannerManager.initializeScanners();
});

// Set timeout for the server (2 minutes)
server.timeout = 120000;

// Graceful shutdown function to reduce code duplication
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => {
    console.log("HTTP server closed");
    scannerManager.disconnectAll();
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });

  // Force close if graceful shutdown fails
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
