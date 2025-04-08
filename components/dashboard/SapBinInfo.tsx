"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import { API_URL } from "@/app/config"

interface BinData {
  BinId: string
  WarehouseId: string
  StorageSection: string
  StorageType: string
  BinStatus: string
  MaterialCode: string
  MaterialDescription: string
  AvailableQuantity: number
  UnitOfMeasure: string
  ProcOrderNo: string
  BatchNo?: string
  CreatedOn?: string
  CreatedBy?: string
}

interface BinHistoryData {
  BinId: string
  ProcOrderNo: string
  MaterialCode: string
  Action: string
  Quantity: number
  Timestamp: string
  UserId: string
  Status: string
}

export default function SapBinInfo() {
  // Search parameters
  const [procOrderNo, setProcOrderNo] = useState("")
  const [materialCode, setMaterialCode] = useState("")
  const [quantity, setQuantity] = useState("")

  // Bin data
  const [binData, setBinData] = useState<BinData[]>([])
  const [selectedBin, setSelectedBin] = useState<BinData | null>(null)
  const [binHistory, setBinHistory] = useState<BinHistoryData[]>([])

  // UI states
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("search")
  const [action, setAction] = useState("ALLOCATE")

  const fetchBinInfo = async () => {
    if (!procOrderNo || !materialCode || !quantity) {
      setError("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setBinData([])

    try {
      const response = await fetch(
        `${API_URL}/api/sap/bin-info?procOrderNo=${encodeURIComponent(procOrderNo)}&materialCode=${encodeURIComponent(materialCode)}&quantity=${encodeURIComponent(quantity)}`,
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to fetch bin information")
      }

      if (result.success && result.data) {
        setBinData(result.data)
        if (result.data.length === 0) {
          setSuccess("Query successful, but no bins found matching the criteria")
        } else {
          setSuccess(`Found ${result.data.length} bin(s) matching the criteria`)
        }
      } else {
        setError("No bin data returned from SAP")
      }
    } catch (err) {
      console.error("Error fetching bin info:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBinHistory = async (binId: string) => {
    setIsLoadingHistory(true)
    setBinHistory([])

    try {
      const response = await fetch(`${API_URL}/api/sap/bin-history?binId=${encodeURIComponent(binId)}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to fetch bin history")
      }

      if (result.success && result.data) {
        setBinHistory(result.data)
      }
    } catch (err) {
      console.error("Error fetching bin history:", err)
      // We don't set the main error state here to avoid disrupting the main UI
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const updateBin = async () => {
    if (!selectedBin) {
      setError("No bin selected")
      return
    }

    setIsUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        binId: selectedBin.BinId,
        procOrderNo: selectedBin.ProcOrderNo || procOrderNo,
        materialCode: selectedBin.MaterialCode || materialCode,
        quantity: Number.parseInt(quantity),
        action: action,
      }

      const response = await fetch(`${API_URL}/api/sap/update-bin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to update bin")
      }

      if (result.success) {
        setSuccess(result.message || `Bin ${selectedBin.BinId} successfully updated`)
        // Refresh bin data
        fetchBinInfo()
        // If we have bin history open, refresh it
        if (selectedBin) {
          fetchBinHistory(selectedBin.BinId)
        }
      } else {
        setError("Failed to update bin in SAP")
      }
    } catch (err) {
      console.error("Error updating bin:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBinSelect = (bin: BinData) => {
    setSelectedBin(bin)
    setActiveTab("details")
    fetchBinHistory(bin.BinId)
  }

  const handleReset = () => {
    setProcOrderNo("")
    setMaterialCode("")
    setQuantity("")
    setBinData([])
    setSelectedBin(null)
    setBinHistory([])
    setError(null)
    setSuccess(null)
    setActiveTab("search")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SAP Bin Information</CardTitle>
          <CardDescription>Search for and manage warehouse bin information from SAP</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="results" disabled={binData.length === 0}>
                Results ({binData.length})
              </TabsTrigger>
              <TabsTrigger value="details" disabled={!selectedBin}>
                Bin Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proc-order-no">Process Order Number</Label>
                  <Input
                    id="proc-order-no"
                    placeholder="e.g. 000001000786"
                    value={procOrderNo}
                    onChange={(e) => setProcOrderNo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material-code">Material Code</Label>
                  <Input
                    id="material-code"
                    placeholder="e.g. 400000926"
                    value={materialCode}
                    onChange={(e) => setMaterialCode(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="e.g. 90"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleReset}>
                  Reset
                </Button>
                <Button onClick={fetchBinInfo} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search Bins
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="results">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bin ID</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Available Qty</TableHead>
                      <TableHead>UoM</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {binData.map((bin) => (
                      <TableRow key={bin.BinId}>
                        <TableCell className="font-medium">{bin.BinId}</TableCell>
                        <TableCell>{bin.WarehouseId}</TableCell>
                        <TableCell>
                          <div className="font-medium">{bin.MaterialCode}</div>
                          <div className="text-xs text-muted-foreground">{bin.MaterialDescription}</div>
                        </TableCell>
                        <TableCell>{bin.AvailableQuantity}</TableCell>
                        <TableCell>{bin.UnitOfMeasure}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bin.BinStatus === "AVAILABLE"
                                ? "success"
                                : bin.BinStatus === "ALLOCATED"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {bin.BinStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleBinSelect(bin)}>
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("search")}>
                  Back to Search
                </Button>
                <Button onClick={fetchBinInfo} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="details">
              {selectedBin && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Bin Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-2 gap-2">
                          <dt className="font-medium">Bin ID:</dt>
                          <dd>{selectedBin.BinId}</dd>

                          <dt className="font-medium">Warehouse:</dt>
                          <dd>{selectedBin.WarehouseId}</dd>

                          <dt className="font-medium">Storage Section:</dt>
                          <dd>{selectedBin.StorageSection}</dd>

                          <dt className="font-medium">Storage Type:</dt>
                          <dd>{selectedBin.StorageType}</dd>

                          <dt className="font-medium">Status:</dt>
                          <dd>
                            <Badge
                              variant={
                                selectedBin.BinStatus === "AVAILABLE"
                                  ? "success"
                                  : selectedBin.BinStatus === "ALLOCATED"
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {selectedBin.BinStatus}
                            </Badge>
                          </dd>
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Material Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-2 gap-2">
                          <dt className="font-medium">Material Code:</dt>
                          <dd>{selectedBin.MaterialCode}</dd>

                          <dt className="font-medium">Description:</dt>
                          <dd>{selectedBin.MaterialDescription}</dd>

                          <dt className="font-medium">Available Quantity:</dt>
                          <dd>
                            {selectedBin.AvailableQuantity} {selectedBin.UnitOfMeasure}
                          </dd>

                          <dt className="font-medium">Process Order:</dt>
                          <dd>{selectedBin.ProcOrderNo}</dd>

                          <dt className="font-medium">Batch Number:</dt>
                          <dd>{selectedBin.BatchNo || "N/A"}</dd>
                        </dl>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Bin Actions</CardTitle>
                      <CardDescription>Perform actions on this bin in SAP</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <Label htmlFor="action-select">Action</Label>
                          <Select value={action} onValueChange={setAction}>
                            <SelectTrigger id="action-select">
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALLOCATE">Allocate</SelectItem>
                              <SelectItem value="DEALLOCATE">Deallocate</SelectItem>
                              <SelectItem value="CONFIRM">Confirm</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex-1">
                          <Label htmlFor="action-quantity">Quantity</Label>
                          <Input
                            id="action-quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                          />
                        </div>

                        <div className="flex items-end">
                          <Button onClick={updateBin} disabled={isUpdating} className="w-full md:w-auto">
                            {isUpdating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>Submit</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Bin History</CardTitle>
                      <CardDescription>Recent activity for this bin</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingHistory ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : binHistory.length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date/Time</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Process Order</TableHead>
                                <TableHead>Material</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {binHistory.map((history, index) => (
                                <TableRow key={index}>
                                  <TableCell>{new Date(history.Timestamp).toLocaleString()}</TableCell>
                                  <TableCell>{history.Action}</TableCell>
                                  <TableCell>{history.ProcOrderNo}</TableCell>
                                  <TableCell>{history.MaterialCode}</TableCell>
                                  <TableCell>{history.Quantity}</TableCell>
                                  <TableCell>{history.UserId}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        history.Status === "SUCCESS"
                                          ? "success"
                                          : history.Status === "FAILED"
                                            ? "destructive"
                                            : "outline"
                                      }
                                    >
                                      {history.Status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">No history available for this bin</div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchBinHistory(selectedBin.BinId)}
                        disabled={isLoadingHistory}
                      >
                        {isLoadingHistory ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Refresh History
                      </Button>
                    </CardFooter>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setActiveTab("results")}>
                      Back to Results
                    </Button>
                    <Button variant="default" onClick={fetchBinInfo} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Refresh Bin Data
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

