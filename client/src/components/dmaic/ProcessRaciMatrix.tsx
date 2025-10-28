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

  // Default data with empty activities and roles
  const defaultProcessRaciData: ProcessRaciMatrixData = {
    activities: [],
    roles: []
  };

  const [processRaciData, setProcessRaciData] = useState<ProcessRaciMatrixData>(defaultProcessRaciData);

  // Get the process RACI matrix data for the solution
  const { data: processRaciMatrixData, isLoading } = useQuery<{ processRaciMatrix: ProcessRaciMatrixType }>({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/process-raci-matrix`],
    enabled: !!projectId && !!solutionId,
  });

  // Load existing data when it's fetched
  useEffect(() => {
    if (processRaciMatrixData?.processRaciMatrix) {
      const raciData = processRaciMatrixData.processRaciMatrix.raciData;
      if (raciData) {
        const parsedData = typeof raciData === 'string' ? JSON.parse(raciData) : raciData;
        setProcessRaciData(parsedData);
      }
    }
  }, [processRaciMatrixData]);

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

  // Add a new activity
  const addActivity = () => {
    const newActivityName = `Activity ${processRaciData.activities.length + 1}`;
    setProcessRaciData(prev => ({
      ...prev,
      activities: [...prev.activities, newActivityName],
      roles: prev.roles.map(role => ({
        ...role,
        responsibilities: {
          ...role.responsibilities,
          [prev.activities.length]: null
        }
      }))
    }));
  };

  // Remove an activity
  const removeActivity = (activityIndex: number) => {
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

  // Add a new role
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

  // Remove a role
  const removeRole = (roleIndex: number) => {
    setProcessRaciData(prev => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== roleIndex)
    }));
  };

  // Update role info
  const updateRoleInfo = (roleIndex: number, field: 'name' | 'role', value: string) => {
    setProcessRaciData(prev => ({
      ...prev,
      roles: prev.roles.map((role, i) =>
        i === roleIndex ? { ...role, [field]: value } : role
      )
    }));
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

        <div className="space-y-6">
          {/* Activities Management */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Process Activities/Steps</h3>
              <Button onClick={addActivity} size="sm" data-testid="button-add-activity">
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Activity
              </Button>
            </div>
            <div className="space-y-2">
              {processRaciData.activities.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-8">{idx + 1}.</span>
                  <Input
                    value={activity}
                    onChange={(e) => updateActivityName(idx, e.target.value)}
                    placeholder={`Activity ${idx + 1}`}
                    className="flex-1"
                    data-testid={`input-activity-${idx}`}
                  />
                  <Button
                    onClick={() => removeActivity(idx)}
                    variant="ghost"
                    size="sm"
                    data-testid={`button-remove-activity-${idx}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {processRaciData.activities.length === 0 && (
                <p className="text-sm text-gray-500 italic">No activities added yet. Click "Add Activity" to start.</p>
              )}
            </div>
          </div>

          {/* RACI Matrix */}
          {processRaciData.activities.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Roles & Responsibilities</h3>
                <Button onClick={addRole} size="sm" data-testid="button-add-role">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Role
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border bg-slate-50 p-2 text-sm font-medium">Name</th>
                      <th className="border bg-slate-100 p-2 text-sm font-medium">Role</th>
                      {processRaciData.activities.map((activity, idx) => (
                        <th key={idx} className="border bg-blue-50 p-2 text-sm font-medium min-w-[100px]">
                          {activity || `Activity ${idx + 1}`}
                        </th>
                      ))}
                      <th className="border bg-white p-2 text-sm font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processRaciData.roles.map((role, roleIdx) => (
                      <tr key={roleIdx}>
                        <td className="border p-2">
                          <Input
                            value={role.name}
                            onChange={(e) => updateRoleInfo(roleIdx, 'name', e.target.value)}
                            placeholder="Name"
                            className="w-full text-sm"
                            data-testid={`input-role-name-${roleIdx}`}
                          />
                        </td>
                        <td className="border p-2">
                          <Input
                            value={role.role}
                            onChange={(e) => updateRoleInfo(roleIdx, 'role', e.target.value)}
                            placeholder="Role"
                            className="w-full text-sm"
                            data-testid={`input-role-type-${roleIdx}`}
                          />
                        </td>
                        {processRaciData.activities.map((_, activityIdx) => (
                          <td key={activityIdx} className="border p-2 text-center">
                            <Select
                              value={role.responsibilities[activityIdx] || "null"}
                              onValueChange={(value) => updateRoleResponsibility(roleIdx, activityIdx, value)}
                            >
                              <SelectTrigger className="w-16 h-10 mx-auto" data-testid={`select-raci-${roleIdx}-${activityIdx}`}>
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
                    {processRaciData.roles.length === 0 && (
                      <tr>
                        <td colSpan={processRaciData.activities.length + 3} className="border p-4 text-center text-sm text-gray-500 italic">
                          No roles added yet. Click "Add Role" to start.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
