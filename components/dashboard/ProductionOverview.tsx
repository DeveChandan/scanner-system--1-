import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import React from "react";

// Define the types for the props
interface Totals {
  totalValid: number;
  totalInvalid: number;
}

interface ProductionOverviewProps {
  data: Record<string, Totals>;
  onScannerSelect: (scannerId: string) => void;
}

export default function ProductionOverview({ data, onScannerSelect }: ProductionOverviewProps) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(data).map(([scannerId, totals]) => {
        const total = totals.totalValid + totals.totalInvalid;
        const validPercentage = total > 0 ? ((totals.totalValid / total) * 100).toFixed(2) : 0;

        return (
          <Card
            key={scannerId}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onScannerSelect(scannerId)}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">{scannerId}</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">{formatNumber(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid:</span>
                  <span className="font-medium text-green-600">
                    {formatNumber(totals.totalValid)} ({validPercentage}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invalid:</span>
                  <span className="font-medium text-red-600">{formatNumber(totals.totalInvalid)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
