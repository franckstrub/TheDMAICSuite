import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { Stakeholder } from "@shared/schema";

interface StakeholderManagementProps {
  stakeholders: Stakeholder[];
  onChange: (stakeholders: Stakeholder[]) => void;
}

const StakeholderManagement: React.FC<StakeholderManagementProps> = ({ 
  stakeholders = [], 
  onChange 
}) => {
  // State for new stakeholder form
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFunction, setNewFunction] = useState("");

  // This ref tracks if there's pending stakeholder data
  const hasPendingData = useRef(false);

  // Update the hasPendingData ref whenever user inputs something
  useEffect(() => {
    hasPendingData.current = isAddingNew && (newName !== "" || newFunction !== "");
  }, [isAddingNew, newName, newFunction]);

  // Add new stakeholder - allow empty values but ensure validation
  const handleAddStakeholder = (keepValues = false) => {
    console.log("handleAddStakeholder called with", {keepValues, newName, newFunction});
    
    // Only add if there's actually something worth adding
    if (newName.trim() || newFunction.trim()) {
      const newStakeholder: Stakeholder = {
        name: newName.trim() || "Unnamed Stakeholder", // Ensure there's at least a name
        function: newFunction.trim() ? newFunction.trim() : undefined,
      };
      
      console.log("Adding new stakeholder:", newStakeholder);
      
      // Update the stakeholders list
      const updatedStakeholders = [...stakeholders, newStakeholder];
      onChange(updatedStakeholders);
      
      console.log("Updated stakeholders list:", updatedStakeholders);
      
      // Only clear the form if we don't want to keep the values
      if (!keepValues) {
        setNewName("");
        setNewFunction("");
        hasPendingData.current = false;
      } else {
        // Make sure we track that there's still pending data
        hasPendingData.current = true;
      }
    } else {
      console.log("No stakeholder data to add, skipping");
    }
    // Keep input form open for adding more stakeholders
  };
  
  // This will be called before form submission to ensure pending data is saved
  useEffect(() => {
    // Define a handler function within the effect to avoid dependency issues
    const handleFormSubmit = (e: Event) => {
      // Only save if there's actually data to add
      if (isAddingNew && (newName.trim() || newFunction.trim())) {
        console.log("StakeholderManagement: manually saving pending data", newName, newFunction);
        
        // Create a new stakeholder object
        const pendingStakeholder: Stakeholder = {
          name: newName.trim() || "Unnamed Stakeholder",
          function: newFunction.trim() ? newFunction.trim() : undefined,
        };
        
        // Update the stakeholders list without losing form data
        onChange([...stakeholders, pendingStakeholder]);
        
        // Clear the inputs to prevent duplicate entries
        setNewName("");
        setNewFunction("");
        setIsAddingNew(false);
        
        // Mark that we've handled the pending data
        hasPendingData.current = false;
      }
    };
    
    // 1. Expose the save function to the parent form component
    const parentForm = document.querySelector('form');
    if (parentForm) {
      parentForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Clean up
    return () => {
      if (parentForm) {
        parentForm.removeEventListener('submit', handleFormSubmit);
      }
    };
  }, [isAddingNew, newName, newFunction, stakeholders, onChange]);

  // Remove stakeholder - allow removing all stakeholders
  const handleRemoveStakeholder = (index: number) => {
    const updatedStakeholders = stakeholders.filter((_, i) => i !== index);
    onChange(updatedStakeholders);
  };

  // Update stakeholder field
  const updateStakeholder = (index: number, field: keyof Stakeholder, value: string) => {
    const updatedStakeholders = [...stakeholders];
    updatedStakeholders[index] = {
      ...updatedStakeholders[index],
      [field]: value
    };
    onChange(updatedStakeholders);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label htmlFor="stakeholders" className="text-md font-medium">Stakeholders</Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => {
            if (isAddingNew) {
              // Save current stakeholder and keep form open with values intact
              handleAddStakeholder(true);
            } else {
              setIsAddingNew(true);
            }
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Stakeholder
        </Button>
      </div>

      {/* Regular table for screen display */}
      <div className="border rounded-md html2canvas-hide">
        <table className="w-full">
          <thead className="bg-muted border-b">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Function</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16 print-hide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stakeholders.map((stakeholder, index) => (
              <tr key={index}>
                <td className="px-4 py-2">
                  <Input
                    placeholder="Enter Stakeholder name"
                    value={stakeholder.name}
                    onChange={(e) => updateStakeholder(index, 'name', e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    placeholder="Enter function/department (optional)"
                    value={stakeholder.function}
                    onChange={(e) => updateStakeholder(index, 'function', e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="px-4 py-2 print-hide">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveStakeholder(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            
            {/* Form for adding a new stakeholder */}
            {isAddingNew && (
              <tr className="bg-accent/50 stakeholder-form print-hide">
                <td className="px-4 py-2">
                  <Input 
                    placeholder="Stakeholder Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 stakeholder-name-input"
                  />
                </td>
                <td className="px-4 py-2">
                  <Input 
                    placeholder="Stakeholder Function (optional)"
                    value={newFunction}
                    onChange={(e) => setNewFunction(e.target.value)}
                    className="h-8 stakeholder-function-input"
                  />
                </td>
                <td className="px-4 py-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewName("");
                      setNewFunction("");
                    }}
                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            )}
            
            {/* Empty state */}
            {stakeholders.length === 0 && !isAddingNew && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-sm text-muted-foreground">
                  No stakeholders added yet. Click "Add Stakeholder" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Simple two-column HTML table for PDF export */}
      <div className="html2canvas-show pdf-direct-list" id="stakeholders-pdf-table">
        <h4 className="font-semibold text-sm mb-3">Stakeholders</h4>
        
        {stakeholders.length > 0 ? (
          <table className="two-column-pdf-table">
            <thead>
              <tr>
                <th className="text-left text-base font-medium">Name</th>
                <th className="text-left text-base font-medium">Function</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((stakeholder, index) => (
                <tr key={index}>
                  <td>{stakeholder.name || 'N/A'}</td>
                  <td>{stakeholder.function || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-muted-foreground text-sm">No stakeholders added.</div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground italic">
        Note: Add relevant stakeholders who have a direct interest in or influence on the project.
        Projects can have any number of stakeholders, including none.
      </p>
    </div>
  );
};

export default StakeholderManagement;