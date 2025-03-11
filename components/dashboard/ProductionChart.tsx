"use client"

import { useEffect, useRef } from "react"
import { Chart, registerables, ChartDataset } from "chart.js"
import 'chartjs-adapter-date-fns'

// Register Chart.js components
Chart.register(...registerables)

// Define types for your chart data
interface ProductionChartDataItem {
  date: string | Date
  validCount: number
  invalidCount: number
}

interface ProductionChartData {
  [scannerId: string]: ProductionChartDataItem[]
}

interface ProductionChartProps {
  data: ProductionChartData | null
  isLoading: boolean
}

export default function ProductionChart({ data, isLoading }: ProductionChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    // Clean up any existing chart instance
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    if (!data || isLoading || !chartRef.current) return

    const ctx = chartRef.current.getContext("2d")
    if (!ctx) return

    // Explicitly type the datasets array for a line chart.
    // Data points now have x as a number (timestamp) and y as a number.
    const datasets: ChartDataset<"line", { x: number; y: number }[]>[] = []
    const scannerIds = Object.keys(data)

    scannerIds.forEach((scannerId, index) => {
      const hue = (index * 137) % 360
      const validColor = `hsl(${hue}, 70%, 60%)`
      const invalidColor = `hsl(${hue}, 70%, 40%)`

      // Convert the x value to a numeric timestamp.
      datasets.push({
        label: `${scannerId} (Valid)`,
        data: data[scannerId].map((day) => ({
          x: new Date(day.date).getTime(),
          y: day.validCount,
        })),
        borderColor: validColor,
        backgroundColor: validColor,
        fill: false,
      })

      datasets.push({
        label: `${scannerId} (Invalid)`,
        data: data[scannerId].map((day) => ({
          x: new Date(day.date).getTime(),
          y: day.invalidCount,
        })),
        borderColor: invalidColor,
        backgroundColor: invalidColor,
        fill: false,
      })
    })

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "time",
            time: {
              unit: "day",
            },
            title: {
              display: true,
              text: "Date",
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Production Count",
            },
          },
        },
        plugins: {
          tooltip: {
            mode: "index",
            intersect: false,
          },
          legend: {
            position: "top",
          },
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, isLoading])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return <canvas ref={chartRef} />
}
