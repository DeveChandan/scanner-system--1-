"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import LineItemsTable from "./LineItemsTable";
import StatisticsCharts from "./StatisticsCharts";

// Define TypeScript types for props
interface DateRange {
  from: Date;
  to: Date;
}

interface ProductionData {
  date: string;
  validCount: number;
  invalidCount: number;
}

interface ScannerDetailsProps {
  scannerId: string;
  productionData: ProductionData[];
  onClose: () => void;
  dateRange?: DateRange;
  apiUrl: string;
}

export default function ScannerDetails({
  scannerId,
  productionData,
  onClose,
  dateRange,
  apiUrl,
}: ScannerDetailsProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "lineItems" | "stats">("summary");
  const [date, setDate] = useState<DateRange>(
    dateRange || {
      from: new Date(new Date().setDate(new Date().getDate() - 7)),
      to: new Date(),
    }
  );
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "stats") {
      fetchStatistics();
    }
  }, [activeTab, scannerId, date]);

  const fetchStatistics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/line-item-stats?scannerId=${scannerId}&startDate=${date.from.toISOString()}&endDate=${date.to.toISOString()}`
      );
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setStats(data[scannerId] || {});
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Scanner Details - {scannerId}</DialogTitle>
          <DialogDescription>View detailed information for this scanner</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="lineItems">Line Items</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="flex-1 overflow-auto">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Valid</TableHead>
                    <TableHead className="text-right">Invalid</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionData.length > 0 ? (
                    productionData.map(({ date, validCount, invalidCount }) => (
                      <TableRow key={date}>
                        <TableCell>{format(new Date(date), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="text-right">{formatNumber(validCount)}</TableCell>
                        <TableCell className="text-right">{formatNumber(invalidCount)}</TableCell>
                        <TableCell className="text-right">{formatNumber(validCount + invalidCount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Line Items Tab */}
          <TabsContent value="lineItems" className="flex-1 overflow-hidden flex flex-col">
            <div className="mb-4 flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date.from}
                    selected={date}
                    onSelect={(selected) => setDate(selected as DateRange)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 overflow-auto">
              <LineItemsTable scannerId={scannerId} dateRange={date} apiUrl={apiUrl} />
            </div>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <StatisticsCharts stats={stats} />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
