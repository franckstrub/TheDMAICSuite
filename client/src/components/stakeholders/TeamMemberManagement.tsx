import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { Stakeholder } from "@shared/schema";

// Since we're reusing the same data structure as stakeholders
type TeamMember = Stakeholder;

interface TeamMemberManagementProps {
  teamMembers: TeamMember[];
  onChange: (teamMembers: TeamMember[]) => void;
}

const TeamMemberManagement: React.FC<TeamMemberManagementProps> = ({ 
  teamMembers = [], 
  onChange 
}) => {
  // State for new team member form
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFunction, setNewFunction] = useState("");

  // This ref tracks if there's pending team member data
  const hasPendingData = useRef(false);

  // Update the hasPendingData ref whenever user inputs something
  useEffect(() => {
    hasPendingData.current = isAddingNew && (newName !== "" || newFunction !== "");
  }, [isAddingNew, newName, newFunction]);

  // Add new team member - allow empty values but ensure validation
  const handleAddTeamMember = (keepValues = false) => {
    console.log("handleAddTeamMember called with", {keepValues, newName, newFunction});
    
    // Only add if there's actually something worth adding
    if (newName.trim() || newFunction.trim()) {
      const newTeamMember: TeamMember = {
        name: newName.trim() || "Unnamed Team Member", // Ensure there's at least a name
        function: newFunction.trim() ? newFunction.trim() : undefined,
      };
      
      console.log("Adding new team member:", newTeamMember);
      
      // Update the team members list
      const updatedTeamMembers = [...teamMembers, newTeamMember];
      onChange(updatedTeamMembers);
      
      console.log("Updated team members list:", updatedTeamMembers);
      
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
      console.log("No team member data to add, skipping");
    }
    // Keep input form open for adding more team members
  };
  
  // This will be called before form submission to ensure pending data is saved
  useEffect(() => {
    // Define a handler function within the effect to avoid dependency issues
    const handleFormSubmit = (e: Event) => {
      // Only save if there's actually data to add
      if (isAddingNew && (newName.trim() || newFunction.trim())) {
        console.log("TeamMemberManagement: manually saving pending data", newName, newFunction);
        
        // Create a new team member object
        const pendingTeamMember: TeamMember = {
          name: newName.trim() || "Unnamed Team Member",
          function: newFunction.trim() ? newFunction.trim() : undefined,
        };
        
        // Update the team members list without losing form data
        onChange([...teamMembers, pendingTeamMember]);
        
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
  }, [isAddingNew, newName, newFunction, teamMembers, onChange]);

  // Remove team member - allow removing all team members
  const handleRemoveTeamMember = (index: number) => {
    const updatedTeamMembers = teamMembers.filter((_, i) => i !== index);
    onChange(updatedTeamMembers);
  };

  // Update team member field
  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    const updatedTeamMembers = [...teamMembers];
    updatedTeamMembers[index] = {
      ...updatedTeamMembers[index],
      [field]: value
    };
    onChange(updatedTeamMembers);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label htmlFor="teamMembers" className="text-md font-medium">Team Members/SME</Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => {
            if (isAddingNew) {
              // Save current team member and keep form open with values intact
              handleAddTeamMember(true);
            } else {
              setIsAddingNew(true);
            }
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Team Member
        </Button>
      </div>

      {/* Regular table for screen display */}
      <div className="border rounded-md html2canvas-hide">
        <table className="w-full">
          <thead className="bg-muted border-b">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Function/Expertise</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16 print-hide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teamMembers.map((teamMember, index) => (
              <tr key={index}>
                <td className="px-4 py-2">
                  <Input
                    placeholder="Enter team member name"
                    value={teamMember.name}
                    onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    placeholder="Enter function/expertise (optional)"
                    value={teamMember.function}
                    onChange={(e) => updateTeamMember(index, 'function', e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="px-4 py-2 print-hide">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveTeamMember(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            
            {/* Form for adding a new team member */}
            {isAddingNew && (
              <tr className="bg-accent/50 team-member-form print-hide">
                <td className="px-4 py-2">
                  <Input 
                    placeholder="Team Member Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 team-member-name-input"
                  />
                </td>
                <td className="px-4 py-2">
                  <Input 
                    placeholder="Function/Expertise (optional)"
                    value={newFunction}
                    onChange={(e) => setNewFunction(e.target.value)}
                    className="h-8 team-member-function-input"
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
            {teamMembers.length === 0 && !isAddingNew && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-sm text-muted-foreground">
                  No team members added yet. Click "Add Team Member" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Super simplified table just for PDF export */}
      <div className="html2canvas-show pdf-text-only-table" id="team-members-pdf-table">
        <p className="font-semibold text-sm mb-1">Team Members:</p>
        <div className="text-sm space-y-0.5">
          {teamMembers.length > 0 ? teamMembers.map((teamMember, index) => (
            <div key={index} className="team-member-list-item">
              {teamMember.name}{teamMember.function ? ` (${teamMember.function})` : ''}
            </div>
          )) : (
            <div className="text-muted-foreground">No team members added.</div>
          )}
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground italic">
        Note: Add team members and subject matter experts (SMEs) who will work on or contribute to the project.
        Include their roles or areas of expertise.
      </p>
    </div>
  );
};

export default TeamMemberManagement;