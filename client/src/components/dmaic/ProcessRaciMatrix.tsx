import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, X } from "lucide-react";
import { ProcessRaciMatrix as ProcessRaciMatrixType, ProcessRaciMatrixData, RaciRole, raciRoleTypes } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ProcessRaciMatrixProps {
  projectId: number;
  solutionId: string;
}

const ProcessRaciMatrix = ({ projectId, solutionId }: ProcessRaciMatrixProps) => {
  const { toast } = useToast();

  // Default data with one empty activity and one empty role
  const defaultProcessRaciData: ProcessRaciMatrixData = {
    activities: [""],
    roles: [{
      name: "",
      role: "",
      responsibilities: { 0: null }
    }]
  };

  const [processRaciData, setProcessRaciData] = useState<ProcessRaciMatrixData>(defaultProcessRaciData);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Get the process RACI matrix data for the solution
  const { data: processRaciMatrixData, isLoading } = useQuery<{ processRaciMatrix: ProcessRaciMatrixType }>({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/process-raci-matrix`],
    enabled: !!projectId && !!solutionId,
  });

  // Load existing data when it's fetched, or set default with one empty row
  useEffect(() => {
    if (processRaciMatrixData?.processRaciMatrix) {
      const raciData = processRaciMatrixData.processRaciMatrix.raciData;
      if (raciData) {
        const parsedData = typeof raciData === 'string' ? JSON.parse(raciData) : raciData;
        setProcessRaciData(parsedData);
        setHasLoadedData(true);
      }
    } else if (!isLoading && !hasLoadedData) {
      // No existing data, set default with one empty row
      setProcessRaciData(defaultProcessRaciData);
      setHasLoadedData(true);
    }
  }, [processRaciMatrixData, isLoading, hasLoadedData]);

  // Save mutation
  const saveProcessRaciMatrixMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/solutions/${solutionId}/process-raci-matrix`, {
        projectId,
        solutionId,
        raciData: processRaciData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/process-raci-matrix`] });
      toast({
        title: "Success",
        description: "Process RACI matrix saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save process RACI matrix",
        variant: "destructive",
      });
    },
  });

  // Add a new activity column
  const addActivity = () => {
    const newActivityIndex = processRaciData.activities.length;
    setProcessRaciData(prev => ({
      ...prev,
      activities: [...prev.activities, ""],
      roles: prev.roles.map(role => ({
        ...role,
        responsibilities: {
          ...role.responsibilities,
          [newActivityIndex]: null
        }
      }))
    }));
  };

  // Remove an activity column
  const removeActivity = (activityIndex: number) => {
    if (processRaciData.activities.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "At least one activity is required",
        variant: "destructive",
      });
      return;
    }

    setProcessRaciData(prev => ({
      ...prev,
      activities: prev.activities.filter((_, i) => i !== activityIndex),
      roles: prev.roles.map(role => {
        const newResponsibilities: { [key: number]: RaciRole | null } = {};
        Object.entries(role.responsibilities).forEach(([key, value]) => {
          const idx = parseInt(key);
          if (idx < activityIndex) {
            newResponsibilities[idx] = value;
          } else if (idx > activityIndex) {
            newResponsibilities[idx - 1] = value;
          }
        });
        return {
          ...role,
          responsibilities: newResponsibilities
        };
      })
    }));
  };

  // Update activity name
  const updateActivityName = (index: number, newName: string) => {
    setProcessRaciData(prev => ({
      ...prev,
      activities: prev.activities.map((activity, i) => i === index ? newName : activity)
    }));
  };

  // Add a new role row
  const addRole = () => {
    const emptyResponsibilities: { [key: number]: RaciRole | null } = {};
    processRaciData.activities.forEach((_, idx) => {
      emptyResponsibilities[idx] = null;
    });

    setProcessRaciData(prev => ({
      ...prev,
      roles: [
        ...prev.roles,
        {
          name: "",
          role: "",
          responsibilities: emptyResponsibilities
        }
      ]
    }));
  };

  // Remove a role row
  const removeRole = (roleIndex: number) => {
    if (processRaciData.roles.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "At least one role is required",
        variant: "destructive",
      });
      return;
    }

    setProcessRaciData(prev => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== roleIndex)
    }));
  };

  // Update combined name/role field
  const updateNameRole = (roleIndex: number, value: string) => {
    // Parse the combined value (e.g., "John Doe - Manager")
    const parts = value.split('-').map(p => p.trim());
    const name = parts[0] || "";
    const role = parts.slice(1).join('-').trim() || "";

    setProcessRaciData(prev => ({
      ...prev,
      roles: prev.roles.map((r, i) =>
        i === roleIndex ? { ...r, name, role } : r
      )
    }));
  };

  // Get combined name/role value for display
  const getNameRoleValue = (roleData: { name: string; role: string }) => {
    if (roleData.name && roleData.role) {
      return `${roleData.name} - ${roleData.role}`;
    } else if (roleData.name) {
      return roleData.name;
    } else if (roleData.role) {
      return roleData.role;
    }
    return "";
  };

  // Update role responsibility for an activity
  const updateRoleResponsibility = (roleIndex: number, activityIndex: number, value: string) => {
    const processedValue = value === "null" ? null : value as RaciRole;

    setProcessRaciData(prev => ({
      ...prev,
      roles: prev.roles.map((role, i) =>
        i === roleIndex
          ? {
              ...role,
              responsibilities: {
                ...role.responsibilities,
                [activityIndex]: processedValue
              }
            }
          : role
      )
    }));
  };

  if (isLoading) {
    return <p>Loading process RACI matrix...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>TO BE Process RACI Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Define roles and responsibilities for each activity in the TO BE process:
          <br />
          <strong>R</strong> = Responsible (does the work), <strong>A</strong> = Accountable (approves the work), 
          <strong>C</strong> = Consulted (provides input), <strong>I</strong> = Informed (kept up-to-date)
        </p>

        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={addActivity} size="sm" variant="outline" data-testid="button-add-activity">
              <PlusCircle className="h-4 w-4 mr-1" />
              Add Activity
            </Button>
            <Button onClick={addRole} size="sm" variant="outline" data-testid="button-add-role">
              <PlusCircle className="h-4 w-4 mr-1" />
              Add Role
            </Button>
          </div>

          {/* RACI Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border bg-slate-100 p-2 text-sm font-medium min-w-[200px]">
                    Team Member / Role
                  </th>
                  {processRaciData.activities.map((activity, idx) => (
                    <th key={idx} className="border bg-blue-50 p-2 text-sm font-medium min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <Input
                          value={activity}
                          onChange={(e) => updateActivityName(idx, e.target.value)}
                          placeholder={`Activity ${idx + 1}`}
                          className="flex-1 text-sm h-8"
                          data-testid={`input-activity-${idx}`}
                        />
                        <Button
                          onClick={() => removeActivity(idx)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          data-testid={`button-remove-activity-${idx}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </th>
                  ))}
                  <th className="border bg-white p-2 text-sm font-medium w-16">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {processRaciData.roles.map((role, roleIdx) => (
                  <tr key={roleIdx}>
                    <td className="border p-2">
                      <Input
                        value={getNameRoleValue(role)}
                        onChange={(e) => updateNameRole(roleIdx, e.target.value)}
                        placeholder="Name - Role (e.g., John Doe - Manager)"
                        className="w-full text-sm"
                        data-testid={`input-name-role-${roleIdx}`}
                      />
                    </td>
                    {processRaciData.activities.map((_, activityIdx) => (
                      <td key={activityIdx} className="border p-2 text-center">
                        <Select
                          value={role.responsibilities[activityIdx] || "null"}
                          onValueChange={(value) => updateRoleResponsibility(roleIdx, activityIdx, value)}
                        >
                          <SelectTrigger className="w-20 h-10 mx-auto" data-testid={`select-raci-${roleIdx}-${activityIdx}`}>
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">-</SelectItem>
                            {raciRoleTypes.map((raciRole) => (
                              <SelectItem key={raciRole} value={raciRole}>
                                {raciRole}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    ))}
                    <td className="border p-2 text-center">
                      <Button
                        onClick={() => removeRole(roleIdx)}
                        variant="ghost"
                        size="sm"
                        data-testid={`button-remove-role-${roleIdx}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={() => saveProcessRaciMatrixMutation.mutate()}
              disabled={saveProcessRaciMatrixMutation.isPending}
              data-testid="button-save-process-raci"
            >
              {saveProcessRaciMatrixMutation.isPending ? "Saving..." : "Save Process RACI Matrix"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessRaciMatrix;
