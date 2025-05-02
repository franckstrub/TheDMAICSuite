import React, { useState } from "react";
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

  // Add new stakeholder
  const handleAddStakeholder = () => {
    if (newName.trim() === "" || newFunction.trim() === "") return;
    
    const newStakeholder: Stakeholder = {
      name: newName,
      function: newFunction,
    };
    
    const updatedStakeholders = [...stakeholders, newStakeholder];
    onChange(updatedStakeholders);
    setNewName("");
    setNewFunction("");
    setIsAddingNew(false);
  };

  // Remove stakeholder
  const handleRemoveStakeholder = (index: number) => {
    const updatedStakeholders = stakeholders.filter((_, i) => i !== index);
    onChange(updatedStakeholders);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label htmlFor="stakeholders" className="text-md font-medium">Stakeholders</Label>
        {!isAddingNew && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setIsAddingNew(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Stakeholder
          </Button>
        )}
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
                <td className="px-4 py-2">{stakeholder.name}</td>
                <td className="px-4 py-2">{stakeholder.function}</td>
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
                    placeholder="Stakeholder Function"
                    value={newFunction}
                    onChange={(e) => setNewFunction(e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="px-4 py-2 flex space-x-1">
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={handleAddStakeholder}
                    className="h-8"
                  >
                    Save
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewName("");
                      setNewFunction("");
                    }}
                    className="h-8"
                  >
                    Cancel
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
        Note: Add all relevant stakeholders who have a direct interest in or influence on the project.
      </p>
    </div>
  );
};

export default StakeholderManagement;