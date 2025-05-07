import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { useParams } from "wouter";
import { ProjectRaciMatrix, RaciMatrixData, RaciRole, raciRoleTypes } from "@shared/schema";
import { useAppContext } from "@/store/AppContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define role types for the RACI matrix
const roleTypes = [
  "Sponsor",
  "Project Leader",
  "Stakeholder",
  "Financial Controller",
  "Coach",
  "Team Member/SME", 
  "Other"
];

interface RaciMatrixProps {
  projectId: number;
  sponsor?: string;
  stakeholder?: string;
  stakeholderFunction?: string;
  financialController?: string;
  projectLeader?: string;
  projectCoach?: string;
}

const RaciMatrixNew = ({
  projectId,
  sponsor = "",
  stakeholder = "",
  stakeholderFunction = "",
  financialController = "",
  projectLeader = "",
  projectCoach = ""
}: RaciMatrixProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppContext();
  const raciFormInitialized = useRef(false);
  
  // Default RACI matrix data with predefined roles from project charter
  const defaultRaciData: RaciMatrixData = {
    roles: [
      {
        name: sponsor,
        role: "Sponsor",
        phases: { 
          define: "R" as RaciRole, 
          measure: "A" as RaciRole, 
          analyze: "A" as RaciRole, 
          improve: "A" as RaciRole, 
          control: "A" as RaciRole 
        }
      },
      {
        name: financialController,
        role: "Financial Controller",
        phases: { 
          define: "C" as RaciRole, 
          measure: "I" as RaciRole, 
          analyze: "I" as RaciRole, 
          improve: "C" as RaciRole, 
          control: "I" as RaciRole 
        }
      },
      {
        name: projectLeader,
        role: "Project Leader",
        phases: { 
          define: "R" as RaciRole, 
          measure: "R" as RaciRole, 
          analyze: "R" as RaciRole, 
          improve: "R" as RaciRole, 
          control: "R" as RaciRole 
        }
      },
      {
        name: projectCoach,
        role: "Coach",
        phases: { 
          define: "A" as RaciRole, 
          measure: "C" as RaciRole, 
          analyze: "C" as RaciRole, 
          improve: "C" as RaciRole, 
          control: "C" as RaciRole 
        }
      },
      {
        name: stakeholder,
        role: stakeholderFunction || "Stakeholder",
        phases: { 
          define: "C" as RaciRole, 
          measure: "C" as RaciRole, 
          analyze: "C" as RaciRole, 
          improve: "C" as RaciRole, 
          control: "I" as RaciRole 
        }
      }
    ].filter(role => role.name) // Only include roles that have a name
  };

  // State for managing RACI matrix data
  const [raciData, setRaciData] = useState<RaciMatrixData>(defaultRaciData);
  
  // Function to clear RACI form initialization state
  const resetRaciFormInitialization = () => {
    raciFormInitialized.current = false;
  };

  // Re-initialize the form when navigating between projects
  useEffect(() => {
    resetRaciFormInitialization();
  }, [projectId]);

  // Define the response type
  type RaciMatrixResponse = {
    raciMatrix: {
      id: number;
      projectId: number;
      raciData: string | RaciMatrixData;
      userId: number;
    }
  };
  
  // Get the RACI matrix data for the project
  const { data: raciMatrixData, isLoading } = useQuery<RaciMatrixResponse>({
    queryKey: ['/api/projects', projectId, 'raci-matrix'],
    enabled: !!projectId,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Process RACI data when it's received
  useEffect(() => {
    if (raciMatrixData && raciMatrixData.raciMatrix) {
      try {
        console.log("Fetched RACI matrix data:", raciMatrixData);
        // The data structure is nested and the raciData field might be an object or string
        const raciData = raciMatrixData.raciMatrix.raciData;
        console.log("RACI data from response:", raciData);
        
        if (raciData) {
          // Handle both string and object formats
          let parsedData: RaciMatrixData;
          
          if (typeof raciData === 'string') {
            // If it's a string, parse it
            parsedData = JSON.parse(raciData) as RaciMatrixData;
          } else if (typeof raciData === 'object') {
            // If it's already an object, use it directly
            parsedData = raciData as RaciMatrixData;
          } else {
            throw new Error("Unexpected raciData format");
          }
          
          console.log("Final parsed RACI data:", parsedData);
          setRaciData(parsedData);
          raciFormInitialized.current = true;
          
          // Store a flag in sessionStorage to remember that we have RACI data
          sessionStorage.setItem(`project_${projectId}_has_raci_data`, 'true');
        } else {
          console.warn("No raciData found in response");
        }
      } catch (error) {
        console.error('Error processing RACI matrix data:', error);
      }
    }
  }, [raciMatrixData, projectId]);

  // Initial setup when component mounts
  useEffect(() => {
    // Always check if RACI data exists for this project when the component mounts
    console.log("RaciMatrixNew component mounted for project:", projectId);
    
    // Always attempt to load RACI matrix data from database on component mount
    if (!raciFormInitialized.current) {
      console.log("RACI form not initialized yet, checking for existing RACI data");
      loadRaciDataFromDatabase(true);
    }
  }, [projectId]);

  // Main loading function for RACI matrix data
  const loadRaciDataFromDatabase = async (silent = false) => {
    try {
      console.log("Explicitly loading RACI matrix from database for project:", projectId);
      const response = await fetch(`/api/projects/${projectId}/raci-matrix`);
      
      // If the response is not OK, it means there's no RACI matrix yet
      if (!response.ok) {
        console.log("No RACI matrix found for project:", projectId);
        if (!silent) {
          toast({
            title: "No Data",
            description: "Using default RACI matrix template",
          });
        }
        setRaciData(defaultRaciData);
        return defaultRaciData;
      }
      
      const data = await response.json();
      console.log("Loaded RACI matrix from database:", data);
      
      // Check if we got a valid RACI matrix object
      if (!data || !data.raciMatrix) {
        console.log("Response does not contain a valid RACI matrix");
        setRaciData(defaultRaciData);
        return defaultRaciData;
      }
      
      // Navigate to the raciMatrix data
      const raciMatrixObj = data.raciMatrix;
      
      try {
        // Get the raciData, which could be a string or an object
        const raciData = raciMatrixObj.raciData;
        console.log("RACI data from database:", raciData);
        
        if (!raciData) {
          console.log("No RACI data found in the matrix object");
          setRaciData(defaultRaciData);
          return defaultRaciData;
        }
        
        // Handle both string and object formats
        let parsedData: RaciMatrixData;
        
        if (typeof raciData === 'string') {
          // If it's a string, parse it
          parsedData = JSON.parse(raciData) as RaciMatrixData;
        } else if (typeof raciData === 'object') {
          // If it's already an object, use it directly
          parsedData = raciData as RaciMatrixData;
        } else {
          throw new Error("Unexpected raciData format");
        }
        
        // Validate that parsedData has the expected structure
        if (!parsedData.roles || !Array.isArray(parsedData.roles)) {
          console.error("Invalid RACI data format - missing roles array:", parsedData);
          setRaciData(defaultRaciData);
          return defaultRaciData;
        }
        
        // Check if the roles array is empty and use default if it is
        if (parsedData.roles.length === 0) {
          console.log("RACI data has empty roles array, using default template");
          setRaciData(defaultRaciData);
          return defaultRaciData;
        }
        
        console.log("Final parsed RACI data:", parsedData);
        setRaciData(parsedData);
        raciFormInitialized.current = true;
        
        // Store a flag in sessionStorage to remember that we have RACI data
        sessionStorage.setItem(`project_${projectId}_has_raci_data`, 'true');
        
        // Also trigger a query invalidation for React Query
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'raci-matrix'] });
        
        if (!silent) {
          toast({
            title: "Data Loaded",
            description: "RACI matrix loaded successfully",
          });
        }
        
        return parsedData;
      } catch (error) {
        console.error('Error parsing RACI matrix data:', error);
        setRaciData(defaultRaciData);
        return defaultRaciData;
      }
    } catch (error) {
      console.error("Error loading RACI matrix from database:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Could not load RACI matrix",
          variant: "destructive",
        });
      }
      
      setRaciData(defaultRaciData);
      return defaultRaciData;
    }
  };

  // Create RACI matrix mutation
  const saveRaciMatrixMutation = useMutation({
    mutationFn: async () => {
      console.log("Saving RACI matrix with data:", raciData);
      
      try {
        // We'll now always use the POST endpoint and let the server determine if it's an update or create
        const response = await fetch(`/api/projects/${projectId}/raci-matrix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: parseInt(projectId.toString(), 10),
            raciData: raciData, // Send the object directly - server handles JSON serialization
            userId: user?.id
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("RACI matrix save error:", errorText);
          throw new Error(`Failed to save RACI matrix: ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log("RACI matrix save response:", responseData);
        return responseData; // This now contains raciMatrix and isUpdate flag
      } catch (error) {
        console.error("RACI matrix save error:", error);
        throw error;
      }
    },
    onSuccess: async (result) => {
      console.log("RACI matrix saved successfully", result);
      // Store a flag in sessionStorage to remember that we have RACI data
      sessionStorage.setItem(`project_${projectId}_has_raci_data`, 'true');
      
      // Invalidate the cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'raci-matrix'] });
      
      // Force a refresh from the database to ensure we have the latest data
      await loadRaciDataFromDatabase(true);
      
      toast({
        title: "Success",
        description: "RACI matrix saved successfully",
      });
    },
    onError: (error) => {
      console.error("RACI matrix save error:", error);
      toast({
        title: "Error",
        description: "Failed to save RACI matrix. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle saving the RACI matrix
  const handleSaveRaci = async () => {
    console.log("handleSaveRaci called with data:", raciData);
    
    try {
      // Disable refetching temporarily to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['/api/projects', projectId, 'raci-matrix'] });
      
      // Now proceed with saving
      console.log("Initiating save operation...");
      await saveRaciMatrixMutation.mutateAsync();
      
      console.log("RACI matrix save operation complete");
    } catch (error) {
      console.error("Error in handleSaveRaci:", error);
      toast({
        title: "Error",
        description: "Failed to save RACI matrix. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add a new role to the RACI matrix
  const addRole = () => {
    setRaciData(prev => {
      const updatedRoles = [
        ...prev.roles,
        {
          name: "",
          role: "",     // Role field for selection
          phases: { define: null, measure: null, analyze: null, improve: null, control: null }
        }
      ];
      
      // Update showOtherRoleInputs to match the new number of roles
      setShowOtherRoleInputs([...showOtherRoleInputs, false]);
      
      return {
        ...prev,
        roles: updatedRoles
      };
    });
  };

  // Remove a role from the RACI matrix
  const removeRole = (index: number) => {
    setRaciData(prev => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== index)
    }));
    
    // Also update the showOtherRoleInputs array to remove the corresponding entry
    setShowOtherRoleInputs(prev => prev.filter((_, i) => i !== index));
  };

  // Update a role's name or role type
  const updateRoleInfo = (index: number, field: 'name' | 'role', value: string) => {
    setRaciData(prev => {
      const newRoles = [...prev.roles];
      newRoles[index] = {
        ...newRoles[index],
        [field]: value
      };
      return { ...prev, roles: newRoles };
    });
  };
  
  // State for tracking when "Other" role is selected
  const [showOtherRoleInputs, setShowOtherRoleInputs] = useState<boolean[]>([]);
  
  // Update the showOtherRoleInputs state when raciData changes
  useEffect(() => {
    // Update showOtherRoleInputs based on current roles
    // Show input if role is "Other" or starts with "Other: "
    setShowOtherRoleInputs(raciData.roles.map(role => 
      role.role === "Other" || role.role.startsWith("Other: ")
    ));
  }, [raciData.roles.length]);

  // Update a role's RACI responsibility for a specific phase
  const updateRoleResponsibility = (roleIndex: number, phase: keyof typeof raciData.roles[0]['phases'], value: string) => {
    // Convert "null" string to actual null, otherwise use the value as RaciRole
    const processedValue = value === "null" ? null : value as RaciRole;
    
    setRaciData(prev => {
      const newRoles = [...prev.roles];
      newRoles[roleIndex] = {
        ...newRoles[roleIndex],
        phases: {
          ...newRoles[roleIndex].phases,
          [phase]: processedValue
        }
      };
      return { ...prev, roles: newRoles };
    });
  };

  // Show loading state
  if (isLoading) {
    return <p>Loading RACI matrix...</p>;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Project RACI Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          The RACI matrix defines roles and responsibilities across the DMAIC phases:
          <br />
          <strong>R</strong> = Responsible (does the work), <strong>A</strong> = Accountable (approves the work), 
          <strong>C</strong> = Consulted (provides input), <strong>I</strong> = Informed (kept up-to-date)
        </p>
        
        {/* Headers */}
        <div className="grid grid-cols-12 gap-2 mb-4">
          <div className="col-span-3 p-3 bg-slate-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-slate-700 text-sm">Name</h4>
          </div>
          <div className="col-span-3 p-3 bg-slate-100 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-slate-700 text-sm">Role</h4>
          </div>
          <div className="col-span-1.5 p-3 bg-blue-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-blue-600 text-sm">Define</h4>
          </div>
          <div className="col-span-1.5 p-3 bg-green-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-green-600 text-sm">Measure</h4>
          </div>
          <div className="col-span-1.5 p-3 bg-purple-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-purple-600 text-sm">Analyze</h4>
          </div>
          <div className="col-span-1.5 p-3 bg-amber-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-amber-600 text-sm">Improve</h4>
          </div>
          <div className="col-span-1.5 p-3 bg-emerald-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-emerald-600 text-sm">Control</h4>
          </div>
          <div className="col-span-0.5 p-3 bg-white rounded-md text-center w-[95%]">
            <h4 className="font-medium text-gray-500 text-sm">Action</h4>
          </div>
        </div>
        
        {/* RACI Matrix Rows */}
        {raciData.roles.map((role, roleIndex) => (
          <div key={roleIndex} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <div className="col-span-3 border border-slate-200 rounded-md p-2 bg-white w-[95%] flex items-center">
              <Input
                value={role.name || ""}
                onChange={(e) => updateRoleInfo(roleIndex, 'name', e.target.value)}
                placeholder="Name"
                className="w-full border-0 focus:ring-0 text-sm h-9"
              />
            </div>
            
            {/* Role Dropdown */}
            <div className="col-span-3 border border-slate-200 rounded-md p-2 bg-white w-[95%] flex flex-col justify-center">
              <Select
                value={role.role.startsWith("Other: ") ? "Other" : role.role}
                onValueChange={(value) => {
                  // If the user is switching to "Other", keep the current value but add the input field
                  if (value === "Other") {
                    // Don't change the value yet if switching from an "Other: something" to just "Other"
                    if (!role.role.startsWith("Other: ")) {
                      updateRoleInfo(roleIndex, 'role', "Other");
                    }
                  } else {
                    // If switching away from "Other", update with the new role
                    updateRoleInfo(roleIndex, 'role', value);
                  }
                  
                  // Track if "Other" is selected
                  const newShowOtherInputs = [...showOtherRoleInputs];
                  newShowOtherInputs[roleIndex] = value === "Other";
                  setShowOtherRoleInputs(newShowOtherInputs);
                }}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {roleTypes.map((roleType) => (
                    <SelectItem key={roleType} value={roleType}>
                      {roleType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Show text input for "Other" role */}
              {showOtherRoleInputs[roleIndex] && (
                <Input
                  value={role.role.startsWith("Other: ") ? role.role.substring(7) : ""}
                  onChange={(e) => {
                    // Concatenate "Other: " with the specification
                    const specification = e.target.value.trim();
                    updateRoleInfo(roleIndex, 'role', specification ? `Other: ${specification}` : "Other");
                  }}
                  placeholder="Please specify the role"
                  className="mt-2 w-full text-sm"
                />
              )}
            </div>
            
            {/* Define Phase */}
            <div className="col-span-1.5 w-[95%] text-center">
              <Select
                value={role.phases.define || "null"}
                onValueChange={(value) => updateRoleResponsibility(
                  roleIndex,
                  'define',
                  value
                )}
              >
                <SelectTrigger className="w-12 h-10 mx-auto">
                  <SelectValue placeholder="" />
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
            </div>
            
            {/* Measure Phase */}
            <div className="col-span-1.5 w-[95%] text-center">
              <Select
                value={role.phases.measure || "null"}
                onValueChange={(value) => updateRoleResponsibility(
                  roleIndex,
                  'measure',
                  value
                )}
              >
                <SelectTrigger className="w-12 h-10 mx-auto">
                  <SelectValue placeholder="" />
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
            </div>
            
            {/* Analyze Phase */}
            <div className="col-span-1.5 w-[95%] text-center">
              <Select
                value={role.phases.analyze || "null"}
                onValueChange={(value) => updateRoleResponsibility(
                  roleIndex,
                  'analyze',
                  value
                )}
              >
                <SelectTrigger className="w-12 h-10 mx-auto">
                  <SelectValue placeholder="" />
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
            </div>
            
            {/* Improve Phase */}
            <div className="col-span-1.5 w-[95%] text-center">
              <Select
                value={role.phases.improve || "null"}
                onValueChange={(value) => updateRoleResponsibility(
                  roleIndex,
                  'improve',
                  value
                )}
              >
                <SelectTrigger className="w-12 h-10 mx-auto">
                  <SelectValue placeholder="" />
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
            </div>
            
            {/* Control Phase */}
            <div className="col-span-1.5 w-[95%] text-center">
              <Select
                value={role.phases.control || "null"}
                onValueChange={(value) => updateRoleResponsibility(
                  roleIndex,
                  'control',
                  value
                )}
              >
                <SelectTrigger className="w-12 h-10 mx-auto">
                  <SelectValue placeholder="" />
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
            </div>
            
            {/* Action Column */}
            <div className="col-span-0.5 text-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRole(roleIndex)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6"
                      disabled={false}
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove role</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ))}
        
        {/* Buttons */}
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex justify-start">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={addRole}
            >
              <PlusCircle className="h-4 w-4" />
              Add Role
            </Button>
          </div>
          
          <div className="flex justify-start">
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveRaci}
              disabled={saveRaciMatrixMutation.isPending}
            >
              Save RACI Matrix
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RaciMatrixNew;