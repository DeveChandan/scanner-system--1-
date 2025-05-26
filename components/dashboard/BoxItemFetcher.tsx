"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Download } from "lucide-react"
import { API_URL } from "@/app/config"

export default function BoxItemFetcher() {
  // Form state
  const [scannerId, setScannerId] = useState<string>("scanner5")
  const [date, setDate] = useState<string>(formatDateForInput(new Date()))
  const [time, setTime] = useState<string>("11:40:59")
  const [lineItems, setLineItems] = useState<string>("75")

  // Results state
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  // Helper function to format date for input field
  function formatDateForInput(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  // Function to fetch box items
  async function fetchBoxItems() {
    setIsLoading(true)
    setError(null)
    setSuccess(false)
    setResults([])

    try {
      // Format the query parameters
      const params = new URLSearchParams({
        scannerId,
        date,
        time,
        lineItems,
      })

      const response = await fetch(`${API_URL}/api/box-items?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to fetch box items")
      }

      if (data.success) {
        setResults(data.data || [])
        setSuccess(true)
      } else {
        throw new Error(data.message || "No data returned")
      }
    } catch (err) {
      console.error("Error fetching box items:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to export results to CSV
  function exportToCSV() {
    if (results.length === 0) return

    // Create CSV content
    const headers = ["Timestamp", "Line", "Shift", "Batch Code", "Material Code", "Carton Serial", "Raw Data"]
    const csvRows = [headers]

    results.forEach((item) => {
      const row = [
        new Date(item.timestamp).toLocaleString(),
        item.lineNumber || "",
        item.shift || "",
        item.batchCode || "",
        item.materialCode || "",
        item.cartonSerial || "",
        item.rawData || "",
      ]
      csvRows.push(row)
    })

    // Convert to CSV string
    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `box-items-${scannerId}-${date.replace(/\./g, "-")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Box Item Fetcher</CardTitle>
        <CardDescription>Fetch the most recent box items before the specified time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="scanner-id">Scanner ID</Label>
            <Select value={scannerId} onValueChange={setScannerId}>
              <SelectTrigger id="scanner-id">
                <SelectValue placeholder="Select scanner" />
              </SelectTrigger>
              <SelectContent>
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
            <Label htmlFor="date">Date (DD.MM.YYYY)</Label>
            <Input id="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="10.02.2025" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time (HH:MM:SS - End Time)</Label>
            <Input id="time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="11:40:59" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="line-items">Line Items</Label>
            <Input
              id="line-items"
              type="number"
              value={lineItems}
              onChange={(e) => setLineItems(e.target.value)}
              placeholder="75"
            />
          </div>
        </div>

        <Button onClick={fetchBoxItems} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Fetch Box Items
            </>
          )}
        </Button>

        {error && <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-md">{error}</div>}

        {success && results.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-md">
            No box items found matching the criteria
          </div>
        )}

        <div className="text-sm text-muted-foreground mt-4">
          This will fetch exactly {lineItems} line items from {date} at or before {time}, sorted by most recent first.
        </div>

        {results.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Results ({results.length} items)</h3>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </div>

            <div className="rounded-md border overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Batch Code</TableHead>
                    <TableHead>Material Code</TableHead>
                    <TableHead>Carton Serial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{item.lineNumber}</TableCell>
                      <TableCell>{item.shift}</TableCell>
                      <TableCell>{item.batchCode}</TableCell>
                      <TableCell>{item.materialCode}</TableCell>
                      <TableCell>{item.cartonSerial}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
