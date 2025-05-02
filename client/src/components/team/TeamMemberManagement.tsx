import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { TeamMember } from "@shared/schema";

export interface TeamMemberManagementProps {
  teamMembers: TeamMember[];
  onChange: (teamMembers: TeamMember[]) => void;
}

export default function TeamMemberManagement({
  teamMembers,
  onChange,
}: TeamMemberManagementProps) {
  const [name, setName] = useState("");
  const [functionValue, setFunctionValue] = useState("");
  const [dedication, setDedication] = useState("100");

  const handleAddTeamMember = () => {
    if (name.trim() === "") return;

    const newTeamMember = {
      name: name.trim(),
      function: functionValue.trim(),
      dedication: parseInt(dedication) || 100,
    };

    onChange([...teamMembers, newTeamMember]);
    setName("");
    setFunctionValue("");
    setDedication("100");
  };

  const handleRemoveTeamMember = (index: number) => {
    const newTeamMembers = [...teamMembers];
    newTeamMembers.splice(index, 1);
    onChange(newTeamMembers);
  };

  return (
    <div>
      <Label htmlFor="teamMembers">Team Members / SMEs</Label>
      <div className="mt-2 space-y-3">
        {teamMembers.map((member, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={member.name}
                onChange={(e) => {
                  const newTeamMembers = [...teamMembers];
                  newTeamMembers[index] = {
                    ...newTeamMembers[index],
                    name: e.target.value,
                  };
                  onChange(newTeamMembers);
                }}
                placeholder="Name"
              />
            </div>
            <div className="flex-1">
              <Input
                value={member.function}
                onChange={(e) => {
                  const newTeamMembers = [...teamMembers];
                  newTeamMembers[index] = {
                    ...newTeamMembers[index],
                    function: e.target.value,
                  };
                  onChange(newTeamMembers);
                }}
                placeholder="Function/Department"
              />
            </div>
            <div className="w-20">
              <Input
                type="number"
                min="0"
                max="100"
                value={member.dedication}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const dedication = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
                  const newTeamMembers = [...teamMembers];
                  newTeamMembers[index] = {
                    ...newTeamMembers[index],
                    dedication,
                  };
                  onChange(newTeamMembers);
                }}
                placeholder="% Dedication"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveTeamMember(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="team-member-form flex items-center gap-3">
          <div className="flex-1">
            <Input
              className="team-member-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add new team member"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTeamMember();
                }
              }}
            />
          </div>
          <div className="flex-1">
            <Input
              className="team-member-function-input"
              value={functionValue}
              onChange={(e) => setFunctionValue(e.target.value)}
              placeholder="Function/Department (optional)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTeamMember();
                }
              }}
            />
          </div>
          <div className="w-20">
            <Input
              className="team-member-dedication-input"
              type="number"
              min="0"
              max="100"
              value={dedication}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || !isNaN(parseInt(val))) {
                  setDedication(val);
                }
              }}
              placeholder="% Dedication"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTeamMember();
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddTeamMember}
          >
            Add
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">Team members involved in the project with their % dedication.</p>
    </div>
  );
}