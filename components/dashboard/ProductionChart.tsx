"use client"

import { useEffect, useRef } from "react"
import { Chart, registerables } from "chart.js"
import 'chartjs-adapter-date-fns'  // Import the date adapter

// Register Chart.js components
Chart.register(...registerables)

export default function ProductionChart({ data, isLoading }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    // Clean up previous chart instance
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    if (!data || isLoading || !chartRef.current) return

    const ctx = chartRef.current.getContext("2d")
    if (!ctx) return

    const datasets = []
    const scannerIds = Object.keys(data)

    scannerIds.forEach((scannerId, index) => {
      const hue = (index * 137) % 360
      const validColor = `hsl(${hue}, 70%, 60%)`
      const invalidColor = `hsl(${hue}, 70%, 40%)`

      datasets.push({
        label: `${scannerId} (Valid)`,
        data: data[scannerId].map((day) => ({
          x: day.date,
          y: day.validCount,
        })),
        borderColor: validColor,
        backgroundColor: validColor,
        fill: false,
      })

      datasets.push({
        label: `${scannerId} (Invalid)`,
        data: data[scannerId].map((day) => ({
          x: day.date,
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
