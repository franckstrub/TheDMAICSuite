import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProjectRaciMatrix, RaciMatrixData, RaciRole, raciRoleTypes } from "@shared/schema";
import { PlusCircle, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RaciMatrixProps {
  projectId: number;
  sponsor?: string;
  stakeholder?: string;
  stakeholderFunction?: string;
  financialController?: string;
  projectLeader?: string;
  projectCoach?: string;
}

const RaciMatrix = ({
  projectId,
  sponsor = "",
  stakeholder = "",
  stakeholderFunction = "",
  financialController = "",
  projectLeader = "",
  projectCoach = ""
}: RaciMatrixProps) => {
  const { toast } = useToast();
  
  // Default RACI matrix data with predefined roles from project charter
  const defaultRaciData: RaciMatrixData = {
    roles: [
      {
        name: sponsor,
        function: "Sponsor",
        phases: { define: "R", measure: "A", analyze: "A", improve: "A", control: "A" }
      },
      {
        name: financialController,
        function: "Financial Controller",
        phases: { define: "C", measure: "I", analyze: "I", improve: "C", control: "I" }
      },
      {
        name: projectLeader,
        function: "Project Leader",
        phases: { define: "R", measure: "R", analyze: "R", improve: "R", control: "R" }
      },
      {
        name: projectCoach,
        function: "Project Coach",
        phases: { define: "A", measure: "C", analyze: "C", improve: "C", control: "C" }
      },
      {
        name: stakeholder,
        function: stakeholderFunction,
        phases: { define: "C", measure: "C", analyze: "C", improve: "C", control: "I" }
      }
    ].filter(role => role.name) // Only include roles that have a name
  };

  // State for managing RACI matrix data
  const [raciData, setRaciData] = useState<RaciMatrixData>(defaultRaciData);
  
  // Get the RACI matrix data for the project
  const { data: raciMatrixData, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'raci-matrix'],
    queryFn: async () => {
      const response = await apiRequest(`/api/projects/${projectId}/raci-matrix`);
      if (response.ok) {
        const data = await response.json();
        return data.raciMatrix as ProjectRaciMatrix;
      }
      return null;
    },
    onSuccess: (data) => {
      if (data && data.matrixData) {
        try {
          const parsedData = JSON.parse(data.matrixData) as RaciMatrixData;
          setRaciData(parsedData);
        } catch (error) {
          console.error('Error parsing RACI matrix data:', error);
        }
      }
    },
    onError: () => {
      // If no RACI matrix exists, we'll just use the default
    }
  });

  // Create RACI matrix mutation
  const createRaciMatrixMutation = useMutation({
    mutationFn: async () => {
      const matrixDataString = JSON.stringify(raciData);
      const response = await apiRequest(`/api/projects/${projectId}/raci-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          matrixData: matrixDataString
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create RACI matrix');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'raci-matrix'] });
      toast({
        title: "Success",
        description: "RACI matrix created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create RACI matrix: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Update RACI matrix mutation
  const updateRaciMatrixMutation = useMutation({
    mutationFn: async () => {
      if (!raciMatrixData?.id) {
        throw new Error('RACI matrix ID not found');
      }
      
      const matrixDataString = JSON.stringify(raciData);
      const response = await apiRequest(`/api/raci-matrix/${raciMatrixData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matrixData: matrixDataString
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update RACI matrix');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'raci-matrix'] });
      toast({
        title: "Success",
        description: "RACI matrix updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update RACI matrix: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Save RACI matrix
  const saveRaciMatrix = () => {
    if (raciMatrixData?.id) {
      updateRaciMatrixMutation.mutate();
    } else {
      createRaciMatrixMutation.mutate();
    }
  };

  // Add a new role to the RACI matrix
  const addRole = () => {
    setRaciData(prev => ({
      ...prev,
      roles: [
        ...prev.roles,
        {
          name: "",
          function: "",
          phases: { define: null, measure: null, analyze: null, improve: null, control: null }
        }
      ]
    }));
  };

  // Remove a role from the RACI matrix
  const removeRole = (index: number) => {
    setRaciData(prev => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== index)
    }));
  };

  // Update a role's name or function
  const updateRoleInfo = (index: number, field: 'name' | 'function', value: string) => {
    setRaciData(prev => {
      const newRoles = [...prev.roles];
      newRoles[index] = {
        ...newRoles[index],
        [field]: value
      };
      return { ...prev, roles: newRoles };
    });
  };

  // Update a role's RACI responsibility for a specific phase
  const updateRoleResponsibility = (roleIndex: number, phase: keyof typeof raciData.roles[0]['phases'], value: RaciRole | null) => {
    setRaciData(prev => {
      const newRoles = [...prev.roles];
      newRoles[roleIndex] = {
        ...newRoles[roleIndex],
        phases: {
          ...newRoles[roleIndex].phases,
          [phase]: value
        }
      };
      return { ...prev, roles: newRoles };
    });
  };

  return (
    <Card className="my-6 overflow-hidden">
      <CardHeader className="bg-slate-50">
        <CardTitle className="text-lg font-semibold">Project RACI Matrix</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            <p>The RACI matrix defines roles and responsibilities across the DMAIC phases:</p>
            <p><strong>R</strong> = Responsible (does the work), <strong>A</strong> = Accountable (approves the work), <strong>C</strong> = Consulted (provides input), <strong>I</strong> = Informed (kept up-to-date)</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-200 p-2 text-left w-1/6">Role</th>
                  <th className="border border-slate-200 p-2 text-left w-1/6">Function</th>
                  <th className="border border-slate-200 p-2 text-center">Define</th>
                  <th className="border border-slate-200 p-2 text-center">Measure</th>
                  <th className="border border-slate-200 p-2 text-center">Analyze</th>
                  <th className="border border-slate-200 p-2 text-center">Improve</th>
                  <th className="border border-slate-200 p-2 text-center">Control</th>
                  <th className="border border-slate-200 p-2 text-center w-[50px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {raciData.roles.map((role, roleIndex) => (
                  <tr key={roleIndex} className="border-b border-slate-200">
                    <td className="border border-slate-200 p-2">
                      <Input
                        value={role.name || ""}
                        onChange={(e) => updateRoleInfo(roleIndex, 'name', e.target.value)}
                        placeholder="Name"
                        className="w-full"
                      />
                    </td>
                    <td className="border border-slate-200 p-2">
                      <Input
                        value={role.function || ""}
                        onChange={(e) => updateRoleInfo(roleIndex, 'function', e.target.value)}
                        placeholder="Function"
                        className="w-full"
                      />
                    </td>
                    {["define", "measure", "analyze", "improve", "control"].map((phase) => (
                      <td key={phase} className="border border-slate-200 p-2 text-center">
                        <Select
                          value={role.phases[phase as keyof typeof role.phases] || ""}
                          onValueChange={(value) => updateRoleResponsibility(
                            roleIndex,
                            phase as keyof typeof role.phases,
                            value as RaciRole
                          )}
                        >
                          <SelectTrigger className="w-12 h-8 mx-auto">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">-</SelectItem>
                            {raciRoleTypes.map((raciRole) => (
                              <SelectItem key={raciRole} value={raciRole}>
                                {raciRole}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    ))}
                    <td className="border border-slate-200 p-2 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRole(roleIndex)}
                              className="h-8 w-8"
                              disabled={roleIndex < 5} // Prevent removing default roles
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove role</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={addRole}
            >
              <PlusCircle className="h-4 w-4" />
              Add Role
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={saveRaciMatrix}
              disabled={isLoading || createRaciMatrixMutation.isPending || updateRaciMatrixMutation.isPending}
            >
              {raciMatrixData?.id ? "Update RACI Matrix" : "Save RACI Matrix"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RaciMatrix;