import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TeamMember {
  name: string;
  function: string;
  dedication: number; // % of time dedication to the project
}

interface TeamMemberManagementProps {
  teamMembers: TeamMember[];
  onChange: (teamMembers: TeamMember[]) => void;
}

export default function TeamMemberManagement({
  teamMembers,
  onChange,
}: TeamMemberManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>(teamMembers || []);
  const [pendingMember, setPendingMember] = useState<TeamMember>({
    name: "",
    function: "",
    dedication: 100, // Default to 100%
  });

  // Update parent component when members change
  useEffect(() => {
    onChange(members);
  }, [members, onChange]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof TeamMember
  ) => {
    const value = field === 'dedication' 
      ? Math.min(100, Math.max(0, Number(e.target.value))) // Ensure dedication is between 0-100
      : e.target.value;
      
    setPendingMember({
      ...pendingMember,
      [field]: value,
    });
  };

  const handleAddMember = () => {
    if (pendingMember.name.trim() === "") return;

    setMembers([...members, { ...pendingMember }]);
    setPendingMember({ name: "", function: "", dedication: 100 });
  };

  const handleRemoveMember = (index: number) => {
    const updatedMembers = [...members];
    updatedMembers.splice(index, 1);
    setMembers(updatedMembers);
  };

  const handleUpdateMember = (
    index: number,
    field: keyof TeamMember,
    value: string | number
  ) => {
    // For dedication field, ensure value is between 0-100
    if (field === 'dedication') {
      value = Math.min(100, Math.max(0, Number(value)));
    }
    
    const updatedMembers = [...members];
    updatedMembers[index] = {
      ...updatedMembers[index],
      [field]: value,
    };
    setMembers(updatedMembers);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Team Members / Subject Matter Experts (SMEs)</h3>
        
        {/* Existing Team Members */}
        {members.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 mb-1">
              <div className="col-span-5">Name</div>
              <div className="col-span-4">Function</div>
              <div className="col-span-2">Dedication (%)</div>
              <div className="col-span-1"></div>
            </div>
            {members.map((member, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input
                    value={member.name}
                    onChange={(e) =>
                      handleUpdateMember(index, "name", e.target.value)
                    }
                    className="h-8"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    value={member.function}
                    onChange={(e) =>
                      handleUpdateMember(index, "function", e.target.value)
                    }
                    placeholder="Role/Function"
                    className="h-8"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={member.dedication}
                    onChange={(e) =>
                      handleUpdateMember(index, "dedication", e.target.value)
                    }
                    className="h-8"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveMember(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new Team Member form */}
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-5">
            <Label htmlFor="memberName" className="text-xs mb-1">Name</Label>
            <Input
              id="memberName"
              value={pendingMember.name}
              onChange={(e) => handleInputChange(e, "name")}
              placeholder="Enter name"
              className="h-8"
            />
          </div>
          <div className="col-span-4">
            <Label htmlFor="memberFunction" className="text-xs mb-1">Function</Label>
            <Input
              id="memberFunction"
              value={pendingMember.function}
              onChange={(e) => handleInputChange(e, "function")}
              placeholder="Role/Function"
              className="h-8"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="memberDedication" className="text-xs mb-1">Dedication (%)</Label>
            <Input
              id="memberDedication"
              type="number"
              min="0"
              max="100"
              value={pendingMember.dedication}
              onChange={(e) => handleInputChange(e, "dedication")}
              className="h-8"
            />
          </div>
          <div className="col-span-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full"
              onClick={handleAddMember}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}