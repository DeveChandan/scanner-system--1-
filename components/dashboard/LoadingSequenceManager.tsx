"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function LoadingSequenceManager() {
  // State variables
  const [token, setToken] = useState("");
  const [loadingSequenceData, setLoadingSequenceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Function to fetch loading sequence data using fetch API
  const fetchLoadingSequence = async () => {
    if (!token) {
      setError("Token is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setLoadingSequenceData(null);

    try {
      const response = await fetch(`/api/sap/loading-sequence?token=${encodeURIComponent(token)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch loading sequence data: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setLoadingSequenceData(data.data);
        setSuccess("Loading sequence data fetched successfully");
      } else {
        setError("Failed to fetch loading sequence data");
      }
    } catch (err) {
      console.error("Error fetching loading sequence data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update loading sequence data using fetch API
  const updateLoadingSequence = async () => {
    if (!token || !loadingSequenceData) {
      setError("Token and loading sequence data are required");
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        // Prepare the payload with the necessary data
        // Example: someField: loadingSequenceData.someField
      };

      const response = await fetch(`/api/sap/update-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, payload }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update loading sequence data: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccess("Loading sequence data updated successfully");
        // Optionally, fetch the updated data
        fetchLoadingSequence();
      } else {
        setError("Failed to update loading sequence data");
      }
    } catch (err) {
      console.error("Error updating loading sequence data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Loading Sequence Manager</CardTitle>
          <CardDescription>Fetch and update loading sequence data from SAP</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Input
                id="token"
                placeholder="Enter token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button onClick={fetchLoadingSequence} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>Fetch Loading Sequence</>
                )}
              </Button>

              <Button onClick={updateLoadingSequence} disabled={isUpdating || !loadingSequenceData}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>Update Loading Sequence</>
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

            {loadingSequenceData && (
              <div>
                <CardHeader>
                  <CardTitle>Loading Sequence Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre>{JSON.stringify(loadingSequenceData, null, 2)}</pre>
                </CardContent>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
