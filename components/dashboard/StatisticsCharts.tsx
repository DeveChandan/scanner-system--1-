"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart, registerables } from "chart.js";

// Register Chart.js components
Chart.register(...registerables);

interface StatItem {
  _id?: string | null;
  count: number;
}

interface Stats {
  lineStats: StatItem[];
  shiftStats: StatItem[];
  batchStats: StatItem[];
  materialStats: StatItem[];
}

interface StatisticsChartsProps {
  stats: Stats | null;
}

export default function StatisticsCharts({ stats }: StatisticsChartsProps) {
  const chartRefs = {
    line: useRef<HTMLCanvasElement>(null),
    shift: useRef<HTMLCanvasElement>(null),
    batch: useRef<HTMLCanvasElement>(null),
    material: useRef<HTMLCanvasElement>(null),
  };

  const chartInstances = {
    line: useRef<Chart | null>(null),
    shift: useRef<Chart | null>(null),
    batch: useRef<Chart | null>(null),
    material: useRef<Chart | null>(null),
  };

  useEffect(() => {
    if (!stats) return;

    // Clean up previous chart instances
    Object.values(chartInstances).forEach((instanceRef) => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    });

    // Helper function to create a chart
    const createChart = (
      ref: React.RefObject<HTMLCanvasElement | null>,
      type: "bar" | "pie",
      labels: (string | number)[],
      data: number[],
      backgroundColor: string | string[],
      borderColor?: string | string[]
    ) => {
      if (ref.current) {
        const ctx = ref.current.getContext("2d");
        if (!ctx) return null;
        return new Chart(ctx, {
          type,
          data: {
            labels,
            datasets: [
              {
                label: "Production Count",
                data,
                backgroundColor,
                borderColor,
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      }
      return null;
    };

    // Create charts for each statistics group
    chartInstances.line.current = createChart(
      chartRefs.line,
      "bar",
      stats.lineStats.map((item) => item._id || "Unknown"),
      stats.lineStats.map((item) => item.count),
      "rgba(54, 162, 235, 0.7)",
      "rgba(54, 162, 235, 1)"
    );

    chartInstances.shift.current = createChart(
      chartRefs.shift,
      "pie",
      stats.shiftStats.map((item) => item._id || "Unknown"),
      stats.shiftStats.map((item) => item.count),
      [
        "rgba(255, 99, 132, 0.7)",
        "rgba(54, 162, 235, 0.7)",
        "rgba(255, 206, 86, 0.7)",
        "rgba(75, 192, 192, 0.7)",
      ]
    );

    const topBatches = stats.batchStats.slice(0, 10);
    chartInstances.batch.current = createChart(
      chartRefs.batch,
      "bar",
      topBatches.map((item) => item._id || "Unknown"),
      topBatches.map((item) => item.count),
      "rgba(75, 192, 192, 0.7)",
      "rgba(75, 192, 192, 1)"
    );

    const topMaterials = stats.materialStats.slice(0, 10);
    chartInstances.material.current = createChart(
      chartRefs.material,
      "bar",
      topMaterials.map((item) => item._id || "Unknown"),
      topMaterials.map((item) => item.count),
      "rgba(153, 102, 255, 0.7)",
      "rgba(153, 102, 255, 1)"
    );

    return () => {
      // Clean up chart instances on unmount
      Object.values(chartInstances).forEach((instanceRef) => {
        if (instanceRef.current) {
          instanceRef.current.destroy();
          instanceRef.current = null;
        }
      });
    };
  }, [stats]);

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">No statistics available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Production by Line</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <canvas ref={chartRefs.line} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production by Shift</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <canvas ref={chartRefs.shift} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Batch Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <canvas ref={chartRefs.batch} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Material Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <canvas ref={chartRefs.material} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
