import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

// Stakeholder interface
interface Stakeholder {
  id: string;
  name: string;
  function: string;
}

// Example stakeholder component for Project Charter
const StakeholderManagement = () => {
  // Sample initial stakeholders
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([
    { id: "1", name: "John Doe", function: "Department Head" },
    { id: "2", name: "Jane Smith", function: "Process Owner" },
  ]);

  // State for new stakeholder form
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFunction, setNewFunction] = useState("");

  // Add new stakeholder
  const handleAddStakeholder = () => {
    if (newName.trim() === "" || newFunction.trim() === "") return;
    
    const newStakeholder: Stakeholder = {
      id: Date.now().toString(),
      name: newName,
      function: newFunction,
    };
    
    setStakeholders([...stakeholders, newStakeholder]);
    setNewName("");
    setNewFunction("");
    setIsAddingNew(false);
  };

  // Remove stakeholder
  const handleRemoveStakeholder = (id: string) => {
    setStakeholders(stakeholders.filter(stakeholder => stakeholder.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-md font-medium">Stakeholders</h3>
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
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Function</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stakeholders.map((stakeholder) => (
              <tr key={stakeholder.id}>
                <td className="px-4 py-2">{stakeholder.name}</td>
                <td className="px-4 py-2">{stakeholder.function}</td>
                <td className="px-4 py-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveStakeholder(stakeholder.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            
            {/* Form for adding a new stakeholder */}
            {isAddingNew && (
              <tr className="bg-blue-50">
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
                <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">
                  No stakeholders added yet. Click "Add Stakeholder" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hidden field to store stakeholder data for form submission */}
      <input 
        type="hidden" 
        name="stakeholders" 
        value={JSON.stringify(stakeholders)} 
      />
      
      <p className="text-xs text-gray-500 italic">
        Note: Add all relevant stakeholders who have a direct interest in or influence on the project.
      </p>
    </div>
  );
};

export default StakeholderManagement;