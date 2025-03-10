# Scanner Data Collector System

A comprehensive system for collecting, storing, and visualizing data from industrial scanners.

## Features

- **Real-time Scanner Monitoring**: Monitor the connection status of multiple industrial scanners
- **Data Collection**: Collect and store data from scanners in MongoDB
- **Production Dashboard**: Visualize production data with interactive charts and tables
- **Line Item Analysis**: Analyze detailed line item data with filtering capabilities
- **Statistics**: View production statistics by line, shift, batch code, and material code

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Next.js, React
- **Database**: MongoDB
- **Styling**: Tailwind CSS, shadcn/ui
- **Charts**: Chart.js
- **Deployment**: PM2

## On-Premises Deployment

### Prerequisites

- Node.js (v18 or higher)
- MongoDB
- PM2 (for process management)
- Industrial scanners configured with TCP/IP

### Installation

1. Clone the repository to your on-premises server
2. Create a `.env` file based on `.env.example` and update with your specific configuration
3. Make the deployment script executable:

