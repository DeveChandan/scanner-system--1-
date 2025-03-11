"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, RefreshCw } from "lucide-react"
import ProductionOverview from "./ProductionOverview"
import ProductionChart from "./ProductionChart"
import ProductionTable from "./ProductionTable"
import ScannerDetails from "./ScannerDetails"
import { API_URL } from "@/app/config"

// Define a type where both properties are required.
type DateRangeRequired = {
  from: Date
  to: Date
}

// Define a type where properties can be undefined.
type DateRange = {
  from?: Date
  to?: Date
}

export default function ProductionDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [productionData, setProductionData] = useState<any>(null)
  const [productionTotals, setProductionTotals] = useState<any>(null)
  const [dateRange, setDateRange] = useState(7)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [selectedScanner, setSelectedScanner] = useState<string | null>(null)
  const [showScannerDetails, setShowScannerDetails] = useState(false)
  // Initialize date state with required from and to properties.
  const [date, setDate] = useState<DateRangeRequired>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  })

  // Fetch data on initial load and when dateRange or date changes.
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Auto-refresh every 30 seconds
    return () => clearInterval(interval)
  }, [dateRange, date])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      await fetchProductionTotals()
      await fetchProductionData()
      setLastRefresh(new Date())
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProductionTotals = async () => {
    try {
      const response = await fetch(`${API_URL}/api/production-totals`)
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
      const data = await response.json()
      setProductionTotals(data)
    } catch (error) {
      console.error("Error fetching production totals:", error)
    }
  }

  const fetchProductionData = async () => {
    try {
      const startDate = date.from
      const endDate = date.to

      const response = await fetch(
        `${API_URL}/api/production-data?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
      const data = await response.json()
      setProductionData(data)
    } catch (error) {
      console.error("Error fetching production data:", error)
    }
  }

  // Explicitly type scannerId as string.
  const handleScannerSelect = (scannerId: string) => {
    setSelectedScanner(scannerId)
    setShowScannerDetails(true)
  }

  const handleCloseScannerDetails = () => {
    setShowScannerDetails(false)
  }

  const handleDateRangeChange = (range: number) => {
    setDateRange(range)
    // Reset custom date range when using preset ranges.
    setDate({
      from: new Date(new Date().setDate(new Date().getDate() - range)),
      to: new Date(),
    })
  }

  // onSelect handler for Calendar: ensure that the provided value matches DateRangeRequired.
  const handleDateSelect = (value: DateRange | undefined) => {
    if (value && value.from && value.to) {
      setDate({
        from: value.from,
        to: value.to,
      })
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Production Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground mr-2">
              Last updated: {format(lastRefresh, "HH:mm:ss")}
            </span>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={dateRange === 7 ? "default" : "outline"} onClick={() => handleDateRangeChange(7)}>
              7 Days
            </Button>
            <Button variant={dateRange === 30 ? "default" : "outline"} onClick={() => handleDateRangeChange(30)}>
              30 Days
            </Button>
            <Button variant={dateRange === 90 ? "default" : "outline"} onClick={() => handleDateRangeChange(90)}>
              90 Days
            </Button>
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
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date.from}
                  selected={date}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {isLoading && !productionData ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <ProductionOverview data={productionTotals} onScannerSelect={handleScannerSelect} />

          <Tabs defaultValue="chart" className="mt-6">
            <TabsList>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
            <TabsContent value="chart">
              <Card>
                <CardHeader>
                  <CardTitle>Production Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ProductionChart data={productionData} isLoading={isLoading} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="table">
              <Card>
                <CardHeader>
                  <CardTitle>Production Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductionTable data={productionData} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {showScannerDetails && selectedScanner && (
            <ScannerDetails
              scannerId={selectedScanner}
              productionData={productionData?.[selectedScanner] || []}
              onClose={handleCloseScannerDetails}
              dateRange={date}
              apiUrl={API_URL}
            />
          )}
        </>
      )}
    </div>
  )
}
