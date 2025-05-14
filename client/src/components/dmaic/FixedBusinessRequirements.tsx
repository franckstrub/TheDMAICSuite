import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";

// This is just the Voice of Business section with fixed validation logic
export default function BusinessRequirementsSection({ 
  businessRequirements, 
  updateBusinessRequirement, 
  removeBusinessRequirement, 
  addBusinessRequirement,
  saveBusinessRequirementsMutation
}) {
  return (
    <>
      {/* Headers using grid layout with consistent spacing */}
      <div className="grid grid-cols-12 gap-2 mb-4">
        <div className="col-span-4 p-3 bg-blue-50 rounded-md text-center w-[95%]">
          <h4 className="font-medium text-blue-800 text-sm">Business Requirement</h4>
        </div>
        <div className="col-span-4 p-3 bg-emerald-50 rounded-md text-center w-[95%]">
          <h4 className="font-medium text-emerald-800 text-sm">BUSINESS NEED</h4>
        </div>
        <div className="col-span-1 p-3 bg-amber-50 rounded-md text-center w-[95%]">
          <h4 className="font-medium text-amber-800 text-sm">Imp.</h4>
        </div>
        <div className="col-span-3 p-3 bg-purple-50 rounded-md text-center w-[95%]">
          <h4 className="font-medium text-purple-800 text-sm">Critical to Satisfaction (CTS)</h4>
        </div>
      </div>
      
      {/* Business Requirements rows using grid */}
      {businessRequirements.map((req, index) => (
        <div key={index} className="grid grid-cols-12 gap-2 mb-2 relative">
          <div className="col-span-4 border border-blue-100 rounded-md p-2 bg-white w-[95%]">
            <Textarea
              className="w-full p-1 border-0 focus:ring-0 text-sm min-h-[60px]"
              value={req.requirement}
              onChange={(e) => updateBusinessRequirement(index, "requirement", e.target.value)}
              placeholder="Enter requirement"
            />
          </div>
          <div className="col-span-4 border border-emerald-100 rounded-md p-2 bg-white w-[95%]">
            <Textarea
              className="w-full p-1 border-0 focus:ring-0 text-sm min-h-[60px]"
              value={req.businessRequirement}
              onChange={(e) => updateBusinessRequirement(index, "businessRequirement", e.target.value)}
              placeholder="Enter business need"
            />
          </div>
          <div className="col-span-1 border border-amber-100 rounded-md p-2 bg-white w-[95%]">
            <select
              className="w-full p-2 border-0 focus:ring-0 text-sm"
              value={req.importance}
              onChange={(e) => updateBusinessRequirement(index, "importance", parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((val) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
          <div className="col-span-3 border border-purple-100 rounded-md p-2 bg-white w-[95%]">
            <Textarea
              className="w-full p-1 border-0 focus:ring-0 text-sm min-h-[60px]"
              value={req.criticalToQuality}
              onChange={(e) => updateBusinessRequirement(index, "criticalToQuality", e.target.value)}
              placeholder="Add CTS (CTQ, CTD, CTC) specification..."
            />
          </div>
          {index !== 0 && (
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 mr-2">
              <Button 
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6"
                onClick={() => removeBusinessRequirement(index)}
              >
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          )}
        </div>
      ))}
      
      {/* Add Business Requirement Button */}
      <div className="flex justify-start mt-4 mb-4">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1"
          onClick={addBusinessRequirement}
          disabled={businessRequirements.length > 0 && 
                    !businessRequirements[businessRequirements.length - 1].requirement && 
                    !businessRequirements[businessRequirements.length - 1].businessRequirement}
        >
          <PlusCircle className="h-4 w-4" />
          Add Business Requirement
        </Button>
      </div>
      
      {/* Save Business Requirements Button */}
      <div className="flex justify-start mt-4">
        <Button 
          type="button"
          onClick={() => saveBusinessRequirementsMutation.mutate(businessRequirements)}
          variant="default" 
          size="sm"
          className="flex items-center gap-1"
          disabled={saveBusinessRequirementsMutation.isPending}
        >
          {saveBusinessRequirementsMutation.isPending ? "Saving..." : "Save Business Requirements"}
        </Button>
      </div>
    </>
  );
}