import React, { useEffect } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

/**
 * A simplified SIPOC display component that uses direct DOM methods to display SIPOC data
 * This bypasses React state management issues for debugging
 */
const SimpleSipocDisplay = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  useEffect(() => {
    const fetchAndDisplaySipoc = async () => {
      try {
        // Fetch the SIPOC data directly 
        const response = await fetch(`/api/projects/${projectId}/sipoc`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch SIPOC data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const sipoc = data.sipoc;
        
        if (!sipoc) {
          throw new Error('No SIPOC data found');
        }
        
        // Get the display container
        const container = document.getElementById('simple-sipoc-container');
        if (!container) {
          console.error('Could not find the SIPOC display container');
          return;
        }
        
        // Build HTML manually
        let html = `
          <div class="mb-4">
            <h3 class="text-lg font-medium mb-2">Process Name: <span class="text-blue-600">${sipoc.processName || "Not specified"}</span></h3>
          </div>
          
          <div class="grid grid-cols-5 gap-2 mb-4">
            <div class="p-3 bg-blue-50 rounded-md text-center w-[95%]">
              <h4 class="font-medium text-primary text-sm">Suppliers</h4>
            </div>
            <div class="p-3 bg-indigo-50 rounded-md text-center w-[95%]">
              <h4 class="font-medium text-indigo-600 text-sm">Inputs</h4>
            </div>
            <div class="p-3 bg-purple-50 rounded-md text-center w-[95%]">
              <h4 class="font-medium text-purple-600 text-sm">Process</h4>
            </div>
            <div class="p-3 bg-green-50 rounded-md text-center w-[95%]">
              <h4 class="font-medium text-green-600 text-sm">Outputs</h4>
            </div>
            <div class="p-3 bg-yellow-50 rounded-md text-center w-[95%]">
              <h4 class="font-medium text-yellow-600 text-sm">Customers</h4>
            </div>
          </div>
        `;
        
        // Row 1
        html += `
          <div class="grid grid-cols-5 gap-2 mb-2 relative">
            <div class="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers || ""}</div>
            </div>
            <div class="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs || ""}</div>
            </div>
            <div class="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process || ""}</div>
            </div>
            <div class="border border-green-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs || ""}</div>
            </div>
            <div class="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers || ""}</div>
            </div>
          </div>
        `;
        
        // Row 2
        html += `
          <div class="grid grid-cols-5 gap-2 mb-2 relative">
            <div class="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers2 || ""}</div>
            </div>
            <div class="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs2 || ""}</div>
            </div>
            <div class="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process2 || ""}</div>
            </div>
            <div class="border border-green-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs2 || ""}</div>
            </div>
            <div class="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers2 || ""}</div>
            </div>
          </div>
        `;
        
        // Row 3
        html += `
          <div class="grid grid-cols-5 gap-2 mb-2 relative">
            <div class="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers3 || ""}</div>
            </div>
            <div class="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs3 || ""}</div>
            </div>
            <div class="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process3 || ""}</div>
            </div>
            <div class="border border-green-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs3 || ""}</div>
            </div>
            <div class="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
              <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers3 || ""}</div>
            </div>
          </div>
        `;
        
        // Row 4 (if it has data)
        if (sipoc.suppliers4 || sipoc.inputs4 || sipoc.process4 || sipoc.outputs4 || sipoc.customers4) {
          html += `
            <div class="grid grid-cols-5 gap-2 mb-2 relative">
              <div class="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers4 || ""}</div>
              </div>
              <div class="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs4 || ""}</div>
              </div>
              <div class="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process4 || ""}</div>
              </div>
              <div class="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs4 || ""}</div>
              </div>
              <div class="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers4 || ""}</div>
              </div>
              <button 
                type="button"
                class="absolute right-[-15px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full w-6 h-6 flex items-center justify-center"
                title="Delete Row 4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
              </button>
            </div>
          `;
        }
        
        // Row 5 (if it has data)
        if (sipoc.suppliers5 || sipoc.inputs5 || sipoc.process5 || sipoc.outputs5 || sipoc.customers5) {
          html += `
            <div class="grid grid-cols-5 gap-2 mb-2 relative">
              <div class="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers5 || ""}</div>
              </div>
              <div class="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs5 || ""}</div>
              </div>
              <div class="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process5 || ""}</div>
              </div>
              <div class="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs5 || ""}</div>
              </div>
              <div class="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers5 || ""}</div>
              </div>
              <button 
                type="button"
                class="absolute right-[-15px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full w-6 h-6 flex items-center justify-center"
                title="Delete Row 5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
              </button>
            </div>
          `;
        }
        
        // Row 6 (if it has data)
        if (sipoc.suppliers6 || sipoc.inputs6 || sipoc.process6 || sipoc.outputs6 || sipoc.customers6) {
          html += `
            <div class="grid grid-cols-5 gap-2 mb-2 relative">
              <div class="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers6 || ""}</div>
              </div>
              <div class="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs6 || ""}</div>
              </div>
              <div class="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process6 || ""}</div>
              </div>
              <div class="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs6 || ""}</div>
              </div>
              <div class="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers6 || ""}</div>
              </div>
              <button 
                type="button"
                class="absolute right-[-15px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full w-6 h-6 flex items-center justify-center"
                title="Delete Row 6"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
              </button>
            </div>
          `;
        }
        
        // Row 7 (if it has data)
        if (sipoc.suppliers7 || sipoc.inputs7 || sipoc.process7 || sipoc.outputs7 || sipoc.customers7) {
          html += `
            <div class="grid grid-cols-5 gap-2 mb-2 relative">
              <div class="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.suppliers7 || ""}</div>
              </div>
              <div class="border border-indigo-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.inputs7 || ""}</div>
              </div>
              <div class="border border-purple-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.process7 || ""}</div>
              </div>
              <div class="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.outputs7 || ""}</div>
              </div>
              <div class="border border-yellow-100 rounded-md p-2 bg-white w-[95%]">
                <div class="p-2 min-h-[72px] whitespace-pre-wrap">${sipoc.customers7 || ""}</div>
              </div>
              <button 
                type="button"
                class="absolute right-[-15px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full w-6 h-6 flex items-center justify-center"
                title="Delete Row 7"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
              </button>
            </div>
          `;
        }
        
        // Add Row button
        html += `
          <div class="mt-4">
            <button
              type="button"
              class="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
              <span>Add Row</span>
            </button>
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
        <CardTitle>SIPOC Diagram</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          A SIPOC is a high-level process map (helicopter view). It identifies a process's suppliers, inputs, outputs, and customers. The process described in a SIPOC is the one within the project scope. It is recommended to describe your SIPOC in a minimum of 3 and a maximum of 7 steps.
        </p>
        <div id="simple-sipoc-container" className="border p-4 rounded-md">
          <div className="text-center p-4">Loading SIPOC data...</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleSipocDisplay;