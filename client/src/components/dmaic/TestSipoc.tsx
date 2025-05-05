import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// A minimal test component to prove the data can be displayed
export default function TestSipoc() {
  const [sipocData, setSipocData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Get SIPOC data directly from the API
    async function fetchSipocData() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/projects/1/sipoc');
        const data = await response.json();
        
        if (data?.sipoc) {
          setSipocData(data.sipoc);
          console.log("SIPOC data loaded:", data.sipoc);
        }
      } catch (error) {
        console.error("Error loading SIPOC data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSipocData();
  }, []);
  
  if (isLoading) return <div>Loading SIPOC data...</div>;
  if (!sipocData) return <div>No SIPOC data available</div>;
  
  return (
    <Card className="mt-8 bg-slate-50">
      <CardHeader>
        <CardTitle>Simple SIPOC Display (Test)</CardTitle>
        <div>Process Name: {sipocData.processName}</div>
      </CardHeader>
      <CardContent>
        <h3 className="text-lg font-semibold mb-4">SIPOC Data (Raw)</h3>
        
        <div className="mb-4">
          <h4 className="font-medium text-blue-700">Row 1:</h4>
          <div className="grid grid-cols-5 gap-2 border-b pb-2">
            <div><strong>Suppliers:</strong> {sipocData.suppliers}</div>
            <div><strong>Inputs:</strong> {sipocData.inputs}</div>
            <div><strong>Process:</strong> {sipocData.process}</div>
            <div><strong>Outputs:</strong> {sipocData.outputs}</div>
            <div><strong>Customers:</strong> {sipocData.customers}</div>
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium text-blue-700">Row 2:</h4>
          <div className="grid grid-cols-5 gap-2 border-b pb-2">
            <div><strong>Suppliers:</strong> {sipocData.suppliers2}</div>
            <div><strong>Inputs:</strong> {sipocData.inputs2}</div>
            <div><strong>Process:</strong> {sipocData.process2}</div>
            <div><strong>Outputs:</strong> {sipocData.outputs2}</div>
            <div><strong>Customers:</strong> {sipocData.customers2}</div>
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium text-blue-700">Row 3:</h4>
          <div className="grid grid-cols-5 gap-2 border-b pb-2">
            <div><strong>Suppliers:</strong> {sipocData.suppliers3}</div>
            <div><strong>Inputs:</strong> {sipocData.inputs3}</div>
            <div><strong>Process:</strong> {sipocData.process3}</div>
            <div><strong>Outputs:</strong> {sipocData.outputs3}</div>
            <div><strong>Customers:</strong> {sipocData.customers3}</div>
          </div>
        </div>
        
        {/* Row 4 - Only show if it has data */}
        {(sipocData.suppliers4 || sipocData.inputs4 || sipocData.process4 || 
          sipocData.outputs4 || sipocData.customers4) && (
          <div className="mb-4">
            <h4 className="font-medium text-blue-700">Row 4:</h4>
            <div className="grid grid-cols-5 gap-2 border-b pb-2">
              <div><strong>Suppliers:</strong> {sipocData.suppliers4}</div>
              <div><strong>Inputs:</strong> {sipocData.inputs4}</div>
              <div><strong>Process:</strong> {sipocData.process4}</div>
              <div><strong>Outputs:</strong> {sipocData.outputs4}</div>
              <div><strong>Customers:</strong> {sipocData.customers4}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}