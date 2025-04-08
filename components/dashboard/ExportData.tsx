"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { CalendarIcon, Download, FileSpreadsheet, Clock } from "lucide-react"
import { API_URL } from "@/app/config"

export default function ExportData() {
  const [isExporting, setIsExporting] = useState(false)
  const [selectedScanner, setSelectedScanner] = useState<string>("all")
  const [date, setDate] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  })

  // Time filters
  const [startTime, setStartTime] = useState<string>("")
  const [endTime, setEndTime] = useState<string>("")

  // Quantity filters
  const [minQuantity, setMinQuantity] = useState<string>("")
  const [maxQuantity, setMaxQuantity] = useState<string>("")

  // Additional filters
  const [lineNumber, setLineNumber] = useState<string>("")
  const [shift, setShift] = useState<string>("")
  const [batchCode, setBatchCode] = useState<string>("")
  const [materialCode, setMaterialCode] = useState<string>("")

  const handleExportRawData = async () => {
    try {
      setIsExporting(true)

      // Make sure we're using the correct API endpoint
      let url = `${API_URL}/api/export-excel?`

      if (selectedScanner !== "all") {
        url += `scannerId=${selectedScanner}&`
      }

      if (date.from) {
        url += `startDate=${date.from.toISOString()}&`
      }

      if (date.to) {
        url += `endDate=${date.to.toISOString()}&`
      }

      if (startTime) {
        url += `startTime=${encodeURIComponent(startTime)}&`
      }

      if (endTime) {
        url += `endTime=${encodeURIComponent(endTime)}&`
      }

      if (minQuantity) {
        url += `minQuantity=${encodeURIComponent(minQuantity)}&`
      }

      if (maxQuantity) {
        url += `maxQuantity=${encodeURIComponent(maxQuantity)}&`
      }

      if (lineNumber) {
        url += `lineNumber=${encodeURIComponent(lineNumber)}&`
      }

      if (shift) {
        url += `shift=${encodeURIComponent(shift)}&`
      }

      if (batchCode) {
        url += `batchCode=${encodeURIComponent(batchCode)}&`
      }

      if (materialCode) {
        url += `materialCode=${encodeURIComponent(materialCode)}&`
      }

      console.log("Export URL:", url) // Add this for debugging

      // Create a hidden anchor element to trigger the download
      const link = document.createElement("a")
      link.href = url
      link.target = "_blank"
      link.download = `scanner-data-${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error exporting data:", error)
      alert("Error exporting data. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSummary = async () => {
    try {
      setIsExporting(true)

      let url = `${API_URL}/api/export-summary?`

      if (date.from) {
        url += `startDate=${date.from.toISOString()}&`
      }

      if (date.to) {
        url += `endDate=${date.to.toISOString()}&`
      }

      if (startTime) {
        url += `startTime=${encodeURIComponent(startTime)}&`
      }

      if (endTime) {
        url += `endTime=${encodeURIComponent(endTime)}&`
      }

      if (lineNumber) {
        url += `lineNumber=${encodeURIComponent(lineNumber)}&`
      }

      if (shift) {
        url += `shift=${encodeURIComponent(shift)}&`
      }

      if (batchCode) {
        url += `batchCode=${encodeURIComponent(batchCode)}&`
      }

      if (materialCode) {
        url += `materialCode=${encodeURIComponent(materialCode)}&`
      }

      // Create a hidden anchor element to trigger the download
      const link = document.createElement("a")
      link.href = url
      link.target = "_blank"
      link.download = `scanner-summary-${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error exporting summary:", error)
      alert("Error exporting summary. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const resetFilters = () => {
    setSelectedScanner("all")
    setDate({
      from: new Date(new Date().setDate(new Date().getDate() - 7)),
      to: new Date(),
    })
    setStartTime("")
    setEndTime("")
    setMinQuantity("")
    setMaxQuantity("")
    setLineNumber("")
    setShift("")
    setBatchCode("")
    setMaterialCode("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Scanner Data</CardTitle>
        <CardDescription>Filter and export scanner data to Excel format</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Basic Filters</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Filters</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scanner-select">Scanner</Label>
                <Select value={selectedScanner} onValueChange={setSelectedScanner}>
                  <SelectTrigger id="scanner-select">
                    <SelectValue placeholder="Select scanner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scanners</SelectItem>
                    <SelectItem value="scanner1">Scanner 1</SelectItem>
                    <SelectItem value="scanner2">Scanner 2</SelectItem>
                    <SelectItem value="scanner3">Scanner 3</SelectItem>
                    <SelectItem value="scanner4">Scanner 4</SelectItem>
                    <SelectItem value="scanner5">Scanner 5</SelectItem>
                    <SelectItem value="scanner6">Scanner 6</SelectItem>
                    <SelectItem value="scanner7">Scanner 7</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
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
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time (optional)</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time">End Time (optional)</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-quantity">Minimum Quantity</Label>
                <Input
                  id="min-quantity"
                  type="number"
                  placeholder="Min quantity"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-quantity">Maximum Quantity</Label>
                <Input
                  id="max-quantity"
                  type="number"
                  placeholder="Max quantity"
                  value={maxQuantity}
                  onChange={(e) => setMaxQuantity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="line-number">Line Number</Label>
                <Input
                  id="line-number"
                  placeholder="Filter by line number"
                  value={lineNumber}
                  onChange={(e) => setLineNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <Input
                  id="shift"
                  placeholder="Filter by shift"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-code">Batch Code</Label>
                <Input
                  id="batch-code"
                  placeholder="Filter by batch code"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="material-code">Material Code</Label>
                <Input
                  id="material-code"
                  placeholder="Filter by material code"
                  value={materialCode}
                  onChange={(e) => setMaterialCode(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <div className="flex flex-col md:flex-row gap-4 pt-6">
            <Button onClick={handleExportRawData} disabled={isExporting} className="flex-1">
              {isExporting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Raw Data
                </>
              )}
            </Button>

            <Button onClick={handleExportSummary} disabled={isExporting} variant="outline" className="flex-1">
              {isExporting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Summary
                </>
              )}
            </Button>

            <Button onClick={resetFilters} variant="ghost" className="flex-none">
              Reset Filters
            </Button>
          </div>

          <div className="text-sm text-muted-foreground mt-4">
            <p>Export options:</p>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>
                <strong>Raw Data</strong>: Exports detailed scanner data including timestamps, line numbers, shift,
                batch codes, and material codes.
              </li>
              <li>
                <strong>Summary</strong>: Exports aggregated statistics including hourly counts and totals by scanner.
              </li>
            </ul>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}

