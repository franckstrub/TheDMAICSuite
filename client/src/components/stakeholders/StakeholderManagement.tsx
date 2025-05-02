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

  // Add new stakeholder - allow empty values
  const handleAddStakeholder = () => {
    const newStakeholder: Stakeholder = {
      name: newName,
      function: newFunction || undefined,
    };
    
    const updatedStakeholders = [...stakeholders, newStakeholder];
    onChange(updatedStakeholders);
    setNewName("");
    setNewFunction("");
    hasPendingData.current = false;
    // Keep input form open for adding more stakeholders
  };
  
  // Helper function to save pending stakeholder data
  // This will be called when the parent form submits
  useEffect(() => {
    // Create a function to save pending stakeholder data
    const savePendingStakeholder = () => {
      if (hasPendingData.current && isAddingNew) {
        handleAddStakeholder();
      }
    };
    
    // Add an event listener to catch form submission
    document.addEventListener('submit', savePendingStakeholder);
    
    // Clean up
    return () => {
      document.removeEventListener('submit', savePendingStakeholder);
    };
  }, [isAddingNew, newName, newFunction, stakeholders]);

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
              // Save current stakeholder and keep form open
              handleAddStakeholder();
            } else {
              setIsAddingNew(true);
            }
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Stakeholder
        </Button>
      </div>

      {/* Stakeholders Table */}
      <div className="border rounded-md">
        <table className="w-full">
          <thead className="bg-muted border-b">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Function</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stakeholders.map((stakeholder, index) => (
              <tr key={index}>
                <td className="px-4 py-2">
                  <Input
                    placeholder="Enter stakeholder name"
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
                <td className="px-4 py-2">
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
              <tr className="bg-accent/50">
                <td className="px-4 py-2">
                  <Input 
                    placeholder="Stakeholder Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="px-4 py-2">
                  <Input 
                    placeholder="Stakeholder Function (optional)"
                    value={newFunction}
                    onChange={(e) => setNewFunction(e.target.value)}
                    className="h-8"
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
      
      <p className="text-xs text-muted-foreground italic">
        Note: Add relevant stakeholders who have a direct interest in or influence on the project.
        Projects can have any number of stakeholders, including none.
      </p>
    </div>
  );
};

export default StakeholderManagement;