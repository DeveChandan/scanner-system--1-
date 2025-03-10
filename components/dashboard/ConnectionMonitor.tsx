"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { API_URL } from "@/app/config"

export default function ConnectionMonitor() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch both endpoints concurrently with cache busting
      const [statusResponse, historyResponse] = await Promise.all([
        fetch(`${API_URL}/api/connection-status`, { cache: "no-store" }),
        fetch(`${API_URL}/api/connection-history?limit=10`, { cache: "no-store" })
      ])

      if (!statusResponse.ok || !historyResponse.ok) {
        const errorStatus = !statusResponse.ok ? statusResponse.status : historyResponse.status
        throw new Error(`HTTP error! Status: ${errorStatus}`)
      }

      // Parse responses concurrently
      const [statusData, historyData] = await Promise.all([
        statusResponse.json(),
        historyResponse.json()
      ])

      setData({
        currentStatus: statusData,
        recentDisconnections: historyData.history.filter((item) => item.status === "disconnected")
      })
      setLastRefresh(new Date())
    } catch (error) {
      console.error("Error fetching connection data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Auto-refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  const handleReconnect = async (scannerId) => {
    try {
      const response = await fetch(`${API_URL}/api/scanners/${scannerId}/reconnect`, {
        method: "POST",
        cache: "no-store"
      })

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)

      const result = await response.json()
      if (result.success) {
        alert(`Reconnection initiated for ${scannerId}`)
        // Refresh data after a short delay
        setTimeout(fetchData, 2000)
      } else {
        alert(`Failed to reconnect ${scannerId}: ${result.message}`)
      }
    } catch (error) {
      console.error("Error reconnecting scanner:", error)
      alert("Error reconnecting scanner. See console for details.")
    }
  }

  const formatTimeElapsed = (timestamp) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now - then

    const diffSecs = Math.floor(diffMs / 1000)
    if (diffSecs < 60) return `${diffSecs} seconds ago`

    const diffMins = Math.floor(diffSecs / 60)
    if (diffMins < 60) return `${diffMins} minutes ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hours ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} days ago`
  }

  if (isLoading && !data) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Connection Monitor</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Connection Monitor</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Last updated: {format(lastRefresh, "HH:mm:ss")}</span>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.entries(data.currentStatus).map(([scannerId, status]) => {
              const isConnected = status.status === "connected"
              return (
                <Card
                  key={scannerId}
                  className={`hover:shadow-md transition-shadow ${isConnected ? "border-green-500" : "border-red-500"}`}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{scannerId}</h3>
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Badge variant={isConnected ? "success" : "destructive"} className="mr-2">
                              {isConnected ? "Connected" : "Disconnected"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeElapsed(status.lastStatusChange)}
                            </span>
                          </div>
                          <div className="text-sm">
                            IP: {status.ipAddress || "N/A"}
                            <br />
                            Port: {status.port || "N/A"}
                          </div>
                        </div>
                      </div>
                      {!isConnected && (
                        <Button size="sm" variant="outline" onClick={() => handleReconnect(scannerId)}>
                          Reconnect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Disconnections</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scanner</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Attempts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentDisconnections.length > 0 ? (
                    data.recentDisconnections.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.scannerId}</TableCell>
                        <TableCell>{format(new Date(item.timestamp), "MMM dd, yyyy HH:mm:ss")}</TableCell>
                        <TableCell>{item.errorMessage || "Unknown"}</TableCell>
                        <TableCell>{item.reconnectAttempts}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No recent disconnections
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p>Could not load connection data. Please make sure the API server is running.</p>
              <Button className="mt-4" onClick={fetchData}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
