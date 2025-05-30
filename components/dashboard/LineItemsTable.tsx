"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet } from "lucide-react";
import { API_URL } from "@/app/config";

interface LineItem {
  _id?: string;
  timestamp: string;
  rawData: string;
  parsedData?: {
    type?: string;
    status?: string;
    productCode?: string;
    serialNumber?: string;
    counter?: string;
  };
  isValid: boolean;
  errorMessage?: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface Pagination {
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
}

interface LineItemsTableProps {
  scannerId?: string;
  dateRange: DateRange;
  apiUrl?: string;
}

export default function LineItemsTable({
  scannerId,
  dateRange,
  apiUrl = API_URL,
}: LineItemsTableProps) {
  const [data, setData] = useState<LineItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    skip: 0,
    limit: 50,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    fetchData(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerId, dateRange]);

  const fetchData = async (skip = 0): Promise<void> => {
    setIsLoading(true);
    try {
      let url = `${apiUrl}/api/line-items?skip=${skip}&limit=${pagination.limit}`;

      if (scannerId) url += `&scannerId=${encodeURIComponent(scannerId)}`;
      if (dateRange.from)
        url += `&startDate=${encodeURIComponent(dateRange.from.toISOString())}`;
      if (dateRange.to)
        url += `&endDate=${encodeURIComponent(dateRange.to.toISOString())}`;

      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const result = await response.json();

      if (skip === 0) {
        setData(result.data);
      } else {
        setData((prev) => [...prev, ...result.data]);
      }

      setPagination({
        total: result.pagination.total,
        skip: result.pagination.skip + result.data.length,
        limit: result.pagination.limit,
        hasMore: result.pagination.hasMore,
      });
    } catch (error) {
      console.error("Error fetching line items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = (): void => {
    if (!isLoading && pagination.hasMore) {
      fetchData(pagination.skip);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      setIsExporting(true);
      let url = `${apiUrl}/api/export-excel?`;

      if (scannerId) url += `scannerId=${encodeURIComponent(scannerId)}&`;
      if (dateRange.from)
        url += `startDate=${encodeURIComponent(dateRange.from.toISOString())}&`;
      if (dateRange.to)
        url += `endDate=${encodeURIComponent(dateRange.to.toISOString())}&`;

      console.log("Export URL:", url);

      // Create a hidden anchor element to trigger the download
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `scanner-data-${scannerId || "all"}-${new Date()
        .toISOString()
        .split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const parseRawData = (
    rawData: string
  ): {
    isValid: boolean;
    parts: string[];
    type?: string;
    status?: string;
    productCode?: string;
    serialNumber?: string;
    counter?: string;
  } => {
    if (!rawData) return { isValid: false, parts: [] };

    const parts = rawData.split(",");
    if (parts.length !== 5) {
      return { isValid: false, parts };
    }

    return {
      isValid: true,
      parts,
      type: parts[0],
      status: parts[1],
      productCode: parts[2],
      serialNumber: parts[3],
      counter: parts[4],
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {pagination.total > 0
            ? `Showing ${data.length} of ${pagination.total} records`
            : "No records found"}
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || data.length === 0}
          size="sm"
          variant="outline"
        >
          {isExporting ? (
            <>
              <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Exporting...
            </>
          ) : (
            <>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export to Excel
            </>
          )}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Line</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Batch Code</TableHead>
              <TableHead>Material Code</TableHead>
              <TableHead>Carton Serial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Raw Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length > 0 ? (
              data.map((item, index) => {
                const parsedData = item.parsedData || parseRawData(item.rawData);
                const isValid = item.isValid;
                const rowClass = "bg-black text-white"; // Force row style to have black background and white text

                return (
                  <TableRow key={item._id || index} className={rowClass}>
                    <TableCell>
                      {format(new Date(item.timestamp), "MMM dd, yyyy HH:mm:ss")}
                    </TableCell>
                    {isValid ? (
                      <>
                        <TableCell>{parsedData.type || "NA"}</TableCell>
                        <TableCell>{parsedData.status || "NA"}</TableCell>
                        <TableCell>{parsedData.productCode || "-"}</TableCell>
                        <TableCell>{parsedData.serialNumber || "-"}</TableCell>
                        <TableCell>{parsedData.counter || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 hover:bg-green-100"
                          >
                            Valid
                          </Badge>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell colSpan={5}>
                          {item.errorMessage || "Invalid data format"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-red-100 text-red-800 hover:bg-red-100"
                          >
                            Invalid
                          </Badge>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="font-mono text-xs">
                      {item.rawData || ""}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  No data available for the selected date range
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center">
        <Button
          onClick={loadMore}
          disabled={isLoading || !pagination.hasMore}
          variant="outline"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
              Loading...
            </>
          ) : (
            "Load More"
          )}
        </Button>
        <div className="text-sm text-muted-foreground">
          Showing {data.length} of {pagination.total} records
        </div>
      </div>
    </div>
  );
}
