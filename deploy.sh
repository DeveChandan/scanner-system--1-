#!/bin/bash

# Scanner System Deployment Script
# This script builds and deploys the scanner system on an on-premises server

# Exit on error
set -e

echo "=== Scanner System Deployment ==="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
  echo "Loaded environment variables from .env"
else
  echo "Warning: .env file not found"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the Next.js application
echo "Building Next.js application..."
npm run build

# Update PM2 configuration with actual server IP
echo "Updating PM2 configuration..."
SERVER_IP=$(hostname -I | awk '{print $1}')
sed -i "s/your-server-ip/$SERVER_IP/g" ecosystem.config.js

# Start or restart the application with PM2
if pm2 list | grep -q "scanner-api-server\|scanner-client"; then
  echo "Restarting application with PM2..."
  pm2 restart ecosystem.config.js
else
  echo "Starting application with PM2..."
  pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
echo "Setting up PM2 to start on system boot..."
pm2 startup

echo "=== Deployment Complete ==="
echo "API Server running on http://$SERVER_IP:$API_PORT"
echo "Client running on http://$SERVER_IP:$CLIENT_PORT"

