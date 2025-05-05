import React, { useEffect, useState } from "react";
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { MinusCircle, PlusCircle } from "lucide-react";

// Fixed SIPOC component that directly gets and displays data
export default function FixedSipoc() {
  const params = useParams();
  const projectId = params.id;
  
  // State for SIPOC rows
  const [sipocData, setSipocData] = useState<any>(null);
  const [visibleRows, setVisibleRows] = useState(3);
  
  // Direct fetch for SIPOC data
  const { data: fetchedData, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}/sipoc`],
    enabled: !!projectId
  });
  
  // Process data when it's received
  useEffect(() => {
    if (fetchedData?.sipoc) {
      setSipocData(fetchedData.sipoc);
      
      // Determine visible rows
      let maxVisibleRows = 3; 
      
      // Check if rows 4-7 have data
      if (fetchedData.sipoc.suppliers4?.trim() || 
          fetchedData.sipoc.inputs4?.trim() || 
          fetchedData.sipoc.process4?.trim() || 
          fetchedData.sipoc.outputs4?.trim() || 
          fetchedData.sipoc.customers4?.trim()) {
        maxVisibleRows = Math.max(maxVisibleRows, 4);
      }
      
      if (fetchedData.sipoc.suppliers5?.trim() || 
          fetchedData.sipoc.inputs5?.trim() || 
          fetchedData.sipoc.process5?.trim() || 
          fetchedData.sipoc.outputs5?.trim() || 
          fetchedData.sipoc.customers5?.trim()) {
        maxVisibleRows = Math.max(maxVisibleRows, 5);
      }
      
      // Set visible rows
      setVisibleRows(maxVisibleRows);
      
      console.log("SIPOC data loaded:", fetchedData.sipoc);
      console.log(`Setting visible rows to ${maxVisibleRows}`);
    }
  }, [fetchedData]);
  
  const addRow = () => {
    if (visibleRows < 7) {
      setVisibleRows(visibleRows + 1);
    }
  };
  
  if (isLoading) return <div>Loading SIPOC data...</div>;
  if (error) return <div>Error loading SIPOC data</div>;
  if (!sipocData) return <div>No SIPOC data available</div>;
  
  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center gap-x-4 py-4">
        <CardTitle>SIPOC Diagram (Fixed Version)</CardTitle>
        <div className="flex flex-row items-center">
          <label htmlFor="processName" className="mr-2 text-sm">Process Name:</label>
          <input
            type="text"
            id="processName"
            className="px-3 py-1 border rounded-md text-sm w-80"
            value={sipocData.processName || ""}
            readOnly
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          A SIPOC is a high-level process map (helicopter view). 
          This is a simplified, read-only version just to display the data.
        </p>
        
        {/* Headers */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="p-3 bg-blue-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-primary text-sm">Suppliers</h4>
          </div>
          <div className="p-3 bg-indigo-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-indigo-600 text-sm">Inputs</h4>
          </div>
          <div className="p-3 bg-purple-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-purple-600 text-sm">Process</h4>
          </div>
          <div className="p-3 bg-green-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-green-600 text-sm">Outputs</h4>
          </div>
          <div className="p-3 bg-yellow-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-yellow-600 text-sm">Customers</h4>
          </div>
        </div>
        
        {/* Row 1 */}
        <div className="grid grid-cols-5 gap-2 mb-2 relative">
          <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.suppliers || ""}
            </div>
          </div>
          <div className="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.inputs || ""}
            </div>
          </div>
          <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.process || ""}
            </div>
          </div>
          <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.outputs || ""}
            </div>
          </div>
          <div className="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.customers || ""}
            </div>
          </div>
        </div>
        
        {/* Row 2 */}
        <div className="grid grid-cols-5 gap-2 mb-2 relative">
          <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.suppliers2 || ""}
            </div>
          </div>
          <div className="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.inputs2 || ""}
            </div>
          </div>
          <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.process2 || ""}
            </div>
          </div>
          <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.outputs2 || ""}
            </div>
          </div>
          <div className="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.customers2 || ""}
            </div>
          </div>
        </div>
        
        {/* Row 3 */}
        <div className="grid grid-cols-5 gap-2 mb-2 relative">
          <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.suppliers3 || ""}
            </div>
          </div>
          <div className="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.inputs3 || ""}
            </div>
          </div>
          <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.process3 || ""}
            </div>
          </div>
          <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.outputs3 || ""}
            </div>
          </div>
          <div className="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
            <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
              {sipocData.customers3 || ""}
            </div>
          </div>
        </div>
        
        {/* Row 4 */}
        {visibleRows >= 4 && (
          <div className="grid grid-cols-5 gap-2 mb-2 relative">
            <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.suppliers4 || ""}
              </div>
            </div>
            <div className="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.inputs4 || ""}
              </div>
            </div>
            <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.process4 || ""}
              </div>
            </div>
            <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.outputs4 || ""}
              </div>
            </div>
            <div className="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.customers4 || ""}
              </div>
            </div>
          </div>
        )}
        
        {/* Row 5 */}
        {visibleRows >= 5 && (
          <div className="grid grid-cols-5 gap-2 mb-2 relative">
            <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.suppliers5 || ""}
              </div>
            </div>
            <div className="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.inputs5 || ""}
              </div>
            </div>
            <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.process5 || ""}
              </div>
            </div>
            <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.outputs5 || ""}
              </div>
            </div>
            <div className="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
              <div className="w-full p-2 border-0 focus:ring-0 text-sm min-h-[72px]">
                {sipocData.customers5 || ""}
              </div>
            </div>
          </div>
        )}
        
        {/* Add Row Button */}
        <div className="flex justify-start mt-2 mb-4">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            className="flex items-center"
            onClick={addRow}
            disabled={visibleRows >= 7}
          >
            <PlusCircle className="mr-1 h-4 w-4" />
            Add Row
          </Button>
        </div>
        
        <div className="mt-4">
          <Button type="button">
            Update SIPOC
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}