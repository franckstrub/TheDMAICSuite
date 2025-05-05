import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from 'wouter';

/**
 * A simplified SIPOC display component that uses direct DOM methods to display SIPOC data
 * This bypasses React state management issues for debugging
 */
const SimpleSipocDisplay: React.FC = () => {
  const params = useParams();
  const projectId = params.id || "1";
  
  useEffect(() => {
    // We'll use a direct fetch and DOM manipulation to display the data
    // This helps debug issues with React state and rendering
    const fetchAndDisplaySipoc = async () => {
      try {
        // Get the DOM container
        const container = document.getElementById('simple-sipoc-container');
        if (!container) return;
        
        // Clear any previous content
        container.innerHTML = '<div class="text-center p-4">Loading SIPOC data...</div>';
        
        // Fetch the data directly
        const response = await fetch(`/api/projects/${projectId}/sipoc`);
        const data = await response.json();
        
        if (!data?.sipoc) {
          container.innerHTML = '<div class="text-center p-4 text-red-500">No SIPOC data found</div>';
          return;
        }
        
        // Use the API response directly rather than React state
        const sipoc = data.sipoc;
        console.log("Direct SIPOC data from API:", sipoc);
        
        // Generate HTML for the SIPOC data
        let html = `
          <div class="mb-4">
            <h3 class="text-lg font-medium mb-2">Process Name: <span class="text-blue-600">${sipoc.processName || "Not specified"}</span></h3>
          </div>
          
          <div class="grid grid-cols-5 gap-2 mb-4">
            <div class="p-3 bg-blue-50 rounded-md text-center">
              <h4 class="font-medium text-primary text-sm">Suppliers</h4>
            </div>
            <div class="p-3 bg-indigo-50 rounded-md text-center">
              <h4 class="font-medium text-indigo-600 text-sm">Inputs</h4>
            </div>
            <div class="p-3 bg-purple-50 rounded-md text-center">
              <h4 class="font-medium text-purple-600 text-sm">Process</h4>
            </div>
            <div class="p-3 bg-green-50 rounded-md text-center">
              <h4 class="font-medium text-green-600 text-sm">Outputs</h4>
            </div>
            <div class="p-3 bg-yellow-50 rounded-md text-center">
              <h4 class="font-medium text-yellow-600 text-sm">Customers</h4>
            </div>
          </div>
        `;
        
        // Row 1
        html += `
          <div class="grid grid-cols-5 gap-2 mb-2">
            <div class="border border-blue-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers || ""}</div>
            </div>
            <div class="border border-indigo-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs || ""}</div>
            </div>
            <div class="border border-purple-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process || ""}</div>
            </div>
            <div class="border border-green-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs || ""}</div>
            </div>
            <div class="border border-yellow-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers || ""}</div>
            </div>
          </div>
        `;
        
        // Row 2
        html += `
          <div class="grid grid-cols-5 gap-2 mb-2">
            <div class="border border-blue-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers2 || ""}</div>
            </div>
            <div class="border border-indigo-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs2 || ""}</div>
            </div>
            <div class="border border-purple-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process2 || ""}</div>
            </div>
            <div class="border border-green-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs2 || ""}</div>
            </div>
            <div class="border border-yellow-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers2 || ""}</div>
            </div>
          </div>
        `;
        
        // Row 3
        html += `
          <div class="grid grid-cols-5 gap-2 mb-2">
            <div class="border border-blue-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers3 || ""}</div>
            </div>
            <div class="border border-indigo-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs3 || ""}</div>
            </div>
            <div class="border border-purple-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process3 || ""}</div>
            </div>
            <div class="border border-green-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs3 || ""}</div>
            </div>
            <div class="border border-yellow-100 rounded-md p-2 bg-white">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers3 || ""}</div>
            </div>
          </div>
        `;
        
        // Row 4 (if it has data)
        if (sipoc.suppliers4 || sipoc.inputs4 || sipoc.process4 || sipoc.outputs4 || sipoc.customers4) {
          html += `
            <div class="grid grid-cols-5 gap-2 mb-2">
              <div class="border border-blue-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers4 || ""}</div>
              </div>
              <div class="border border-indigo-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs4 || ""}</div>
              </div>
              <div class="border border-purple-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process4 || ""}</div>
              </div>
              <div class="border border-green-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs4 || ""}</div>
              </div>
              <div class="border border-yellow-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers4 || ""}</div>
              </div>
            </div>
          `;
        }
        
        // Row 5 (if it has data)
        if (sipoc.suppliers5 || sipoc.inputs5 || sipoc.process5 || sipoc.outputs5 || sipoc.customers5) {
          html += `
            <div class="grid grid-cols-5 gap-2 mb-2">
              <div class="border border-blue-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers5 || ""}</div>
              </div>
              <div class="border border-indigo-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs5 || ""}</div>
              </div>
              <div class="border border-purple-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process5 || ""}</div>
              </div>
              <div class="border border-green-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs5 || ""}</div>
              </div>
              <div class="border border-yellow-100 rounded-md p-2 bg-white">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers5 || ""}</div>
              </div>
            </div>
          `;
        }
        
        // Add debug info
        html += `
          <div class="mt-6 p-4 bg-gray-100 rounded-md text-xs overflow-auto">
            <h4 class="font-bold mb-2">Debug Information:</h4>
            <pre>${JSON.stringify(sipoc, null, 2)}</pre>
          </div>
        `;
        
        // Update the container with our HTML
        container.innerHTML = html;
      } catch (error) {
        console.error("Error fetching SIPOC data:", error);
        const container = document.getElementById('simple-sipoc-container');
        if (container) {
          container.innerHTML = `<div class="text-center p-4 text-red-500">Error loading SIPOC data: ${error.message}</div>`;
        }
      }
    };
    
    // Execute the fetch
    fetchAndDisplaySipoc();
  }, [projectId]);
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>SIPOC Diagram Raw Data</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          This is a direct display of the SIPOC data from the database, bypassing React state management
          to ensure the exact database values are shown.
        </p>
        <div id="simple-sipoc-container" className="border p-4 rounded-md">
          <div className="text-center p-4">Loading SIPOC data...</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleSipocDisplay;