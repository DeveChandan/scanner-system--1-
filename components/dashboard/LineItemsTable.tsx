"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { API_URL } from "@/app/config"

// Define types for props
interface DateRange {
  from: Date;
  to: Date;
}

interface LineItemsTableProps {
  scannerId: string;
  dateRange: DateRange;
  apiUrl?: string;
}

export default function LineItemsTable({
  scannerId,
  dateRange,
  apiUrl = API_URL,
}: LineItemsTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    skip: 0,
    limit: 50,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData(0);
  }, [scannerId, dateRange]);

  const fetchData = async (skip = 0) => {
    setIsLoading(true);
    try {
      let url = `${apiUrl}/api/line-items?skip=${skip}&limit=${pagination.limit}`;

      if (scannerId) url += `&scannerId=${encodeURIComponent(scannerId)}`;
      if (dateRange.from)
        url += `&startDate=${encodeURIComponent(dateRange.from.toISOString())}`;
      if (dateRange.to)
        url += `&endDate=${encodeURIComponent(dateRange.to.toISOString())}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

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

  const loadMore = () => {
    if (!isLoading && pagination.hasMore) {
      fetchData(pagination.skip);
    }
  };

  const parseRawData = (rawData: string) => {
    if (!rawData) return { isValid: false, parts: [] };

    const parts = rawData.split(",");
    if (parts.length !== 5) {
      return { isValid: false, parts };
    }

    return {
      isValid: true,
      lineNumber: parts[0],
      shift: parts[1],
      batchCode: parts[2],
      materialCode: parts[3],
      cartonSerial: parts[4],
    };
  };

  return (
    <div className="space-y-4">
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

                return (
                  <TableRow
                    key={item._id || index}
                    className={isValid ? "bg-green-500" : "bg-red-500"}
                  >
                    <TableCell>
                      {format(new Date(item.timestamp), "MMM dd, yyyy HH:mm:ss")}
                    </TableCell>
                    {isValid ? (
                      <>
                        <TableCell>{parsedData.lineNumber || "-"}</TableCell>
                        <TableCell>{parsedData.shift || "-"}</TableCell>
                        <TableCell>{parsedData.batchCode || "-"}</TableCell>
                        <TableCell>{parsedData.materialCode || "-"}</TableCell>
                        <TableCell>{parsedData.cartonSerial || "-"}</TableCell>
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

