"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, RefreshCw, CheckCircle, AlertCircle, Truck, ArrowRight } from "lucide-react"
import { API_URL } from "@/app/config"

interface PalletData {
  PalletBarcode: string
  BatchNo: string
  SKUCode: string
  SKUDescription: string
  BoxCount: number
  IsFull: boolean
  OperationType: string
  OrderNo: string
  RobotNo: string
  Line: string
  ScanTime: string
  PalletStatus: string
  LineMinus: number
}

interface ScannerData {
  _id: string
  scannerId: string
  timestamp: string
  rawData: string
  parsedData: {
    type: string
    shift: string
    batchCode: string
    materialCode: string
    cartonSerial: string

    status?: string
    productCode?: string
    serialNumber?: string
    counter?: number
  }
  isValid: boolean
}

interface OrderToPalletItem {
  ProcOrderNo: string
  SkuCode: string
  BatchCode: string
  Shift: string
  LineOper: string
  CartonSerialNo: string
  Box: string
  Uom: string
}

interface PalletSubmission {
  PalletNo: string
  Status: string
  CreatedBy: string
  OrderToPallet: OrderToPalletItem[]
}

export default function LoadingSequenceManager() {
  // Process order input
  const [procOrderNo, setProcOrderNo] = useState<string>("")
  const [orderDetails, setOrderDetails] = useState<any>(null)

  // Date and line filter
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [lineFilter, setLineFilter] = useState<string>("Line-4")
  const [subtractValue, setSubtractValue] = useState<number>(4)

  // Pallet data
  const [palletData, setPalletData] = useState<PalletData[]>([])
  const [selectedPallet, setSelectedPallet] = useState<PalletData | null>(null)

  // Scanner data
  const [scannerData, setScannerData] = useState<ScannerData[]>([])
  const [filteredScannerData, setFilteredScannerData] = useState<ScannerData[]>([])

  // Submission data
  const [palletSubmission, setPalletSubmission] = useState<PalletSubmission>({
    PalletNo: "",
    Status: "R",
    CreatedBy: "VERTIF_02",
    OrderToPallet: [],
  })

  // UI states
  const [isLoadingOrder, setIsLoadingOrder] = useState(false)
  const [isLoadingPallets, setIsLoadingPallets] = useState(false)
  const [isLoadingScanner, setIsLoadingScanner] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("order")

  // Fetch process order details
  const fetchProcessOrder = async () => {
    if (!procOrderNo) {
      setError("Please enter a Process Order Number")
      return
    }

    setIsLoadingOrder(true)
    setError(null)
    setSuccess(null)
    setOrderDetails(null)

    try {
      const response = await fetch(`${API_URL}/api/pallet/process-order/${encodeURIComponent(procOrderNo)}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data && result.data.length > 0) {
        setOrderDetails(result.data[0])
        setSuccess(`Found process order details for ${procOrderNo}`)
        setActiveTab("pallets")

        // Auto-fetch pallet data if we have a date and line filter
        if (filterDate && lineFilter) {
          fetchPalletData()
        }
      } else {
        setError("No process order details found")
      }
    } catch (err) {
      console.error("Error fetching process order details:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoadingOrder(false)
    }
  }

  // Load pallet data when filter changes
  const fetchPalletData = async () => {
    if (!filterDate || !lineFilter) {
      setError("Please enter Date and Line Filter")
      return
    }

    setIsLoadingPallets(true)
    setError(null)
    setPalletData([])
    setSelectedPallet(null)

    try {
      const url = `${API_URL}/api/pallet/pallet-data?lineFilter=${encodeURIComponent(lineFilter)}&filterDate=${encodeURIComponent(filterDate)}&subtractValue=${subtractValue}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        setPalletData(result.data)
        if (result.data.length === 0) {
          setError("No pallet data found for the selected date and line")
        }
      } else {
        setError("Failed to fetch pallet data")
      }
    } catch (err) {
      console.error("Error fetching pallet data:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoadingPallets(false)
    }
  }

  // Fetch scanner data for a specific pallet
  const fetchScannerDataForPallet = async (pallet: PalletData) => {
    if (!pallet) {
      setError("No pallet selected")
      return
    }

    setIsLoadingScanner(true)
    setError(null)
    setScannerData([])
    setFilteredScannerData([])

    try {
      // Extract the line number from the selected pallet
      const lineNumber = pallet.LineMinus?.toString() || ""

      // Get scanner data based on date, line number, and box count
      const url = `${API_URL}/api/pallet/scanner-data?startDate=${encodeURIComponent(filterDate)}&endDate=${encodeURIComponent(filterDate)}&lineNumber=${lineNumber}&boxCount=${pallet.BoxCount}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        setScannerData(result.data)
        setFilteredScannerData(result.data)

        if (result.data.length === 0) {
          setError("No scanner data found for this pallet")
        } else if (result.data.length < pallet.BoxCount) {
          setError(`Warning: Found only ${result.data.length} scanner records out of ${pallet.BoxCount} expected`)
        }
      } else {
        setError("Failed to fetch scanner data")
      }
    } catch (err) {
      console.error("Error fetching scanner data:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoadingScanner(false)
    }
  }

  // Prepare submission data when filtered scanner data changes
  useEffect(() => {
    if (selectedPallet && filteredScannerData.length > 0 && orderDetails) {
      prepareSubmissionData()
    }
  }, [selectedPallet, filteredScannerData, orderDetails])

  const prepareSubmissionData = () => {
    if (!selectedPallet || filteredScannerData.length === 0 || !orderDetails) {
      setPalletSubmission({
        PalletNo: "",
        Status: "R",
        CreatedBy: "VERTIF_02",
        OrderToPallet: [],
      })
      return
    }

    // Create order to pallet items from filtered scanner data
  const orderToPalletItems: OrderToPalletItem[] = filteredScannerData.map((item) => ({
    ProcOrderNo: orderDetails.ProcOrderNo || procOrderNo,
    SkuCode: item.parsedData?.serialNumber || "",
    BatchCode: item.parsedData?.productCode || "",
    Shift: item.parsedData?.shift || "",
    LineOper: item.parsedData?.type?.padStart(2, "0") || "",
    CartonSerialNo: item.parsedData?.counter || "",
    Box: selectedPallet.BoxCount?.toString() || "0",
    Uom: "NOS",
  }));
    setPalletSubmission({
      PalletNo: selectedPallet.PalletBarcode || "",
      Status: "R",
      CreatedBy: "VERTIF_02",
      OrderToPallet: orderToPalletItems,
    })
  }

  const handlePalletSelect = (pallet: PalletData) => {
    setSelectedPallet(pallet)
    fetchScannerDataForPallet(pallet)
    setActiveTab("scanner")
  }

  const handleSubmitPallet = async () => {
    if (!selectedPallet) {
      setError("No pallet selected");
      return;
    }
  
    if (palletSubmission.OrderToPallet.length === 0) {
      setError("No scanner data found for this pallet");
      return;
    }
  
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
  
    try {
      console.log("Submitting pallet submission:", JSON.stringify(palletSubmission, null, 2));
      const response = await fetch(`${API_URL}/api/pallet/submit-pallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(palletSubmission),
        
      });
      console.log("Submitting pallet data:", JSON.stringify(palletSubmission, null, 2));

      if (!response.ok) {
        const errorResponse = await response.text();
        console.error("Error response from API:", errorResponse);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const result = await response.json();
  
      if (result.success) {
        setSuccess(`Pallet ${palletSubmission.PalletNo} successfully submitted to SAP`);
  
        // Reset selection
        setSelectedPallet(null);
        setFilteredScannerData([]);
        setPalletSubmission({
          PalletNo: "",
          Status: "R",
          CreatedBy: "VERTIF_02",
          OrderToPallet: [],
        });
  
        // Refresh pallet data
        fetchPalletData();
        setActiveTab("pallets");
      } else {
        setError("Failed to submit pallet data to SAP");
      }
    } catch (err) {
      console.error("Error submitting pallet data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReset = () => {
    setSelectedPallet(null)
    setFilteredScannerData([])
    setPalletSubmission({
      PalletNo: "",
      Status: "R",
      CreatedBy: "VERTIF_02",
      OrderToPallet: [],
    })
    setError(null)
    setSuccess(null)
    setActiveTab("pallets")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SAP Palletization</CardTitle>
          <CardDescription>Manage pallet data and submit to SAP</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="order">Process Order</TabsTrigger>
              <TabsTrigger value="pallets" disabled={!orderDetails}>
                Pallets
              </TabsTrigger>
              <TabsTrigger value="scanner" disabled={!selectedPallet}>
                Scanner Data
              </TabsTrigger>
              <TabsTrigger value="submission" disabled={!selectedPallet || filteredScannerData.length === 0}>
                Submission
              </TabsTrigger>
            </TabsList>

            <TabsContent value="order">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proc-order-no">Process Order Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="proc-order-no"
                        placeholder="e.g. 000101036766"
                        value={procOrderNo}
                        onChange={(e) => setProcOrderNo(e.target.value)}
                      />
                      <Button onClick={fetchProcessOrder} disabled={isLoadingOrder}>
                        {isLoadingOrder ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="mr-2 h-4 w-4" />
                        )}
                        Search
                      </Button>
                    </div>
                  </div>
                </div>

                {orderDetails && (
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-lg font-medium mb-2">Process Order Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Order Number</div>
                        <div className="font-medium">{orderDetails.ProcOrderNo}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Material</div>
                        <div className="font-medium">{orderDetails.MaterialCode}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Description</div>
                        <div className="font-medium">{orderDetails.MaterialDescription}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Quantity</div>
                        <div className="font-medium">
                          {orderDetails.Quantity} {orderDetails.UnitOfMeasure}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pallets">
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filter-date">Date</Label>
                    <Input
                      id="filter-date"
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="line-filter">Line Filter</Label>
                    <Select value={lineFilter} onValueChange={setLineFilter}>
                      <SelectTrigger id="line-filter">
                        <SelectValue placeholder="Select line" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Line-1">Line 1</SelectItem>
                        <SelectItem value="Line-2">Line 2</SelectItem>
                        <SelectItem value="Line-3">Line 3</SelectItem>
                        <SelectItem value="Line-4">Line 4</SelectItem>
                        <SelectItem value="Line-5">Line 5</SelectItem>
                        <SelectItem value="Olusum 3">Olusum 3</SelectItem>
                        <SelectItem value="Olusum 4">Olusum 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subtract-value">Subtract Value</Label>
                    <Input
                      id="subtract-value"
                      type="number"
                      value={subtractValue}
                      onChange={(e) => setSubtractValue(Number.parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={fetchPalletData} disabled={isLoadingPallets}>
                    {isLoadingPallets ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pallet Barcode</TableHead>
                      <TableHead>Order No</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Batch No</TableHead>
                      <TableHead>Box Count</TableHead>
                      <TableHead>Line</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPallets ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : palletData.length > 0 ? (
                      palletData.map((pallet, index) => (
                        <TableRow
                          key={index}
                          className={selectedPallet?.PalletBarcode === pallet.PalletBarcode ? "bg-muted" : ""}
                        >
                          <TableCell className="font-medium">{pallet.PalletBarcode}</TableCell>
                          <TableCell>{pallet.OrderNo}</TableCell>
                          <TableCell>
                            <div>{pallet.SKUCode}</div>
                            <div className="text-xs text-muted-foreground">{pallet.SKUDescription}</div>
                          </TableCell>
                          <TableCell>{pallet.BatchNo}</TableCell>
                          <TableCell>{pallet.BoxCount}</TableCell>
                          <TableCell>
                            {pallet.Line} ({pallet.LineMinus})
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                pallet.PalletStatus === "COMPLETE"
                                  ? "success"
                                  : pallet.PalletStatus === "PARTIAL"
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {pallet.PalletStatus || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handlePalletSelect(pallet)}>
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          No pallet data found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="scanner">
              {selectedPallet && (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-lg font-medium mb-2">Selected Pallet</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Pallet Barcode</div>
                        <div className="font-medium">{selectedPallet.PalletBarcode}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Order No</div>
                        <div className="font-medium">{selectedPallet.OrderNo}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">SKU</div>
                        <div className="font-medium">{selectedPallet.SKUCode}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Box Count</div>
                        <div className="font-medium">{selectedPallet.BoxCount}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Scanner Data</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchScannerDataForPallet(selectedPallet)}
                      disabled={isLoadingScanner}
                    >
                      {isLoadingScanner ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Refresh
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
                          <TableHead>Raw Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingScanner ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : filteredScannerData.length > 0 ? (
                          filteredScannerData.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                              <TableCell>{item.parsedData?.type || "4"}</TableCell>

                              <TableCell>{item.parsedData?.shift || "-"}</TableCell>
                              <TableCell>{item.parsedData?.batchCode || "-"}</TableCell>
                              <TableCell>{item.parsedData?.serialNumber || "-"}</TableCell>
                              <TableCell>{item.parsedData?.counter || "-"}</TableCell>

                              <TableCell className="font-mono text-xs">{item.rawData}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4">
                              No scanner data found for this pallet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleReset}>
                      Reset
                    </Button>
                    <Button onClick={() => setActiveTab("submission")} disabled={filteredScannerData.length === 0}>
                      Continue to Submission
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="submission">
              {selectedPallet && filteredScannerData.length > 0 && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Submission Data</CardTitle>
                      <CardDescription>Review and submit pallet data to SAP</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor="pallet-no">Pallet Number</Label>
                          <Input
                            id="pallet-no"
                            value={palletSubmission.PalletNo}
                            onChange={(e) => setPalletSubmission({ ...palletSubmission, PalletNo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={palletSubmission.Status}
                            onValueChange={(value) => setPalletSubmission({ ...palletSubmission, Status: value })}
                          >
                            <SelectTrigger id="status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="R">Ready (R)</SelectItem>
                              <SelectItem value="P">Processing (P)</SelectItem>
                              <SelectItem value="C">Complete (C)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="created-by">Created By</Label>
                          <Input
                            id="created-by"
                            value={palletSubmission.CreatedBy}
                            onChange={(e) => setPalletSubmission({ ...palletSubmission, CreatedBy: e.target.value })}
                          />
                        </div>
                      </div>

                      <h4 className="text-sm font-medium mb-2">
                        Order To Pallet Items ({palletSubmission.OrderToPallet.length})
                      </h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Process Order</TableHead>
                              <TableHead>SKU Code</TableHead>
                              <TableHead>Batch Code</TableHead>
                              <TableHead>Shift</TableHead>
                              <TableHead>Line</TableHead>
                              <TableHead>Carton Serial</TableHead>
                              <TableHead>Box</TableHead>
                              <TableHead>UoM</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {palletSubmission.OrderToPallet.length > 0 ? (
                              palletSubmission.OrderToPallet.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.ProcOrderNo}</TableCell>
                                  <TableCell>{item.SkuCode}</TableCell>
                                  <TableCell>{item.BatchCode}</TableCell>
                                  <TableCell>{item.Shift}</TableCell>
                                  <TableCell>{item.LineOper}</TableCell>
                                  <TableCell>{item.CartonSerialNo}</TableCell>
                                  <TableCell>{item.Box}</TableCell>
                                  <TableCell>{item.Uom}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-4">
                                  No items to submit
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleReset}>
                        Reset
                      </Button>
                      <Button
                        onClick={handleSubmitPallet}
                        disabled={isSubmitting || palletSubmission.OrderToPallet.length === 0}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Truck className="mr-2 h-4 w-4" />
                            Submit to SAP
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="default" className="mt-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
