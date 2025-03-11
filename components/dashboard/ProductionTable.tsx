import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { format } from "date-fns";
import React from "react";

// Define the types for the props
interface DayData {
  date: string;
  validCount: number;
  invalidCount: number;
}

interface ProductionTableProps {
  data: Record<string, DayData[]>;
}

interface TableRowData {
  date: string;
  scannerId: string;
  validCount: number;
  invalidCount: number;
  total: number;
}

export default function ProductionTable({ data }: ProductionTableProps) {
  if (!data) return null;

  const scannerIds = Object.keys(data);
  const allDates = new Set<string>(); // Explicitly type the Set

  // Collect all unique dates
  scannerIds.forEach((scannerId) => {
    data[scannerId].forEach((day) => allDates.add(day.date));
  });

  const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Create table rows
  const tableRows: TableRowData[] = []; // Explicitly type the array
  sortedDates.forEach((date) => {
    scannerIds.forEach((scannerId) => {
      const dayData = data[scannerId].find((day) => day.date === date);
      if (dayData) {
        tableRows.push({
          date,
          scannerId,
          validCount: dayData.validCount,
          invalidCount: dayData.invalidCount,
          total: dayData.validCount + dayData.invalidCount,
        });
      }
    });
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Scanner</TableHead>
            <TableHead className="text-right">Valid</TableHead>
            <TableHead className="text-right">Invalid</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRows.length > 0 ? (
            tableRows.map((row, index) => (
              <TableRow key={`${row.date}-${row.scannerId}`}>
                <TableCell>{format(new Date(row.date), "MMM dd, yyyy")}</TableCell>
                <TableCell>{row.scannerId}</TableCell>
                <TableCell className="text-right">{formatNumber(row.validCount)}</TableCell>
                <TableCell className="text-right">{formatNumber(row.invalidCount)}</TableCell>
                <TableCell className="text-right">{formatNumber(row.total)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6">
                No data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
