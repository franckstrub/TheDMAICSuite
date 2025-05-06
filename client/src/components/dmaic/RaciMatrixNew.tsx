import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash } from "lucide-react";
import { useParams } from "wouter";
import { ProjectRaciMatrix, RaciMatrixData, RaciRole, raciRoleTypes } from "@shared/schema";
import { useAppContext } from "@/store/AppContext";
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
  const charterDataLoaded = useRef(false);
  
  // Default RACI matrix data (empty initial state)
  const defaultRaciData: RaciMatrixData = {
    roles: []
  };
  
  // Get the project charter to populate role names
  const { data: charterData } = useQuery({
    queryKey: ['/api/projects', projectId, 'charter'],
    enabled: !!projectId,
    staleTime: 5000,
  });

  // State for managing RACI matrix data
  const [raciData, setRaciData] = useState<RaciMatrixData>(defaultRaciData);
  
  // Function to clear RACI form initialization state
  const resetRaciFormInitialization = () => {
    raciFormInitialized.current = false;
    charterDataLoaded.current = false;
  };

  // Re-initialize the form when navigating between projects
  useEffect(() => {
    resetRaciFormInitialization();
  }, [projectId]);
  
  // Populate RACI matrix with names from project charter if no existing RACI data
  const populateRaciFromCharter = () => {
    if (!charterData?.charter || charterDataLoaded.current) {
      console.log("Cannot populate RACI: Charter data missing or already loaded");
      return;
    }
    
    console.log("Populating RACI from charter", charterData.charter);
    const charter = charterData.charter;
    const rolesFromCharter = [];
    
    // Add Sponsor (if available)
    if (charter.sponsor) {
      console.log("Adding sponsor:", charter.sponsor);
      rolesFromCharter.push({
        name: charter.sponsor,
        function: "Sponsor",
        phases: { define: "R", measure: "A", analyze: "A", improve: "A", control: "A" }
      });
    }
    
    // Add Project Leader (if available)
    if (charter.projectLeader) {
      console.log("Adding project leader:", charter.projectLeader);
      rolesFromCharter.push({
        name: charter.projectLeader,
        function: "Project Leader",
        phases: { define: "R", measure: "R", analyze: "R", improve: "R", control: "R" }
      });
    }
    
    // Add Financial Controller (if available)
    if (charter.financialController) {
      console.log("Adding financial controller:", charter.financialController);
      rolesFromCharter.push({
        name: charter.financialController,
        function: "Financial Controller", 
        phases: { define: "C", measure: "I", analyze: "I", improve: "C", control: "I" }
      });
    }
    
    // Add Stakeholder (if available)
    if (charter.stakeholder) {
      console.log("Adding stakeholder:", charter.stakeholder);
      rolesFromCharter.push({
        name: charter.stakeholder,
        function: charter.stakeholderFunction || "Stakeholder",
        phases: { define: "C", measure: "C", analyze: "C", improve: "C", control: "I" }
      });
    }
    
    // Add Project Coach (if available)
    if (charter.projectCoach) {
      console.log("Adding project coach:", charter.projectCoach);
      rolesFromCharter.push({
        name: charter.projectCoach,
        function: "Project Coach",
        phases: { define: "A", measure: "C", analyze: "C", improve: "C", control: "C" }
      });
    }
    
    if (rolesFromCharter.length > 0) {
      console.log("Setting RACI data with roles:", rolesFromCharter);
      setRaciData({ roles: rolesFromCharter });
      charterDataLoaded.current = true;
    } else {
      console.log("No roles found in charter to populate RACI matrix");
    }
  };
  
  // Clear the session storage data for testing
  useEffect(() => {
    sessionStorage.removeItem(`project_${projectId}_has_raci_data`);
    
    console.log("Charter data effect running", charterData, "loaded:", charterDataLoaded.current);
    
    // Make sure we auto-populate from charter if it exists
    if (charterData?.charter && !charterDataLoaded.current) {
      console.log("Attempting to populate RACI from charter!");
      populateRaciFromCharter();
    }
  }, [charterData, projectId]);

  // This useEffect is already declared above and accomplishes the same thing

  // Get the RACI matrix data for the project
  const { data: raciMatrixData, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'raci-matrix'],
    enabled: !!projectId,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      console.log("Fetched RACI matrix data:", data);
      if (data && data.raciMatrix) {
        try {
          // The data structure is nested and the raciData field might be an object or string
          const raciData = data.raciMatrix.raciData;
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
    },
    onError: (error) => {
      console.error("Error fetching RACI matrix:", error);
      // If no RACI matrix exists, we'll just use the default
    }
  });

  // Initial setup when component mounts
  useEffect(() => {
    // Check if we have previously loaded RACI data in sessionStorage
    const hasRaciData = sessionStorage.getItem(`project_${projectId}_has_raci_data`);
    
    if (hasRaciData === 'true' && !raciFormInitialized.current) {
      console.log("RACI data flag found in sessionStorage, loading from database");
      // Load data directly from database to ensure we have the latest
      loadRaciDataFromDatabase(true);
    }
  }, [projectId]);

  // Main loading function for RACI matrix data
  const loadRaciDataFromDatabase = async (silent = false) => {
    try {
      console.log("Explicitly loading RACI matrix from database");
      const response = await fetch(`/api/projects/${projectId}/raci-matrix`);
      const data = await response.json();
      console.log("Loaded RACI matrix from database:", data);
      
      // Navigate to the raciMatrix data (if present)
      const raciMatrixObj = data?.raciMatrix || data;
      
      if (raciMatrixObj) {
        try {
          // Get the raciData, which could be a string or an object
          const raciData = raciMatrixObj.raciData || raciMatrixObj.matrixData;
          console.log("RACI data from database:", raciData);
          
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
            
            // Also trigger a query invalidation for React Query
            queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'raci-matrix'] });
            
            if (!silent) {
              toast({
                title: "Data Refreshed",
                description: "RACI matrix loaded successfully",
              });
            }
            
            return parsedData;
          }
        } catch (error) {
          console.error('Error parsing RACI matrix data:', error);
        }
      }
      
      // If no data found or error parsing, try to use charter data
      if (charterData?.charter && !charterDataLoaded.current) {
        // Try to populate from charter data
        populateRaciFromCharter();
        
        if (!silent) {
          toast({
            title: "Auto-populated",
            description: "RACI matrix populated from project charter",
          });
        }
        
        return raciData;
      } else {
        if (!silent) {
          toast({
            title: "No Data",
            description: "Using default RACI matrix template",
          });
        }
        
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
    setRaciData(prev => ({
      ...prev,
      roles: [
        ...prev.roles,
        {
          name: "",
          function: "", // Keep this property for backward compatibility with the schema
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
        <div className="grid grid-cols-7 gap-2 mb-4">
          <div className="p-3 bg-slate-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-slate-700 text-sm">Name</h4>
          </div>
          <div className="p-3 bg-blue-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-blue-600 text-sm">Define</h4>
          </div>
          <div className="p-3 bg-green-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-green-600 text-sm">Measure</h4>
          </div>
          <div className="p-3 bg-purple-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-purple-600 text-sm">Analyze</h4>
          </div>
          <div className="p-3 bg-amber-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-amber-600 text-sm">Improve</h4>
          </div>
          <div className="p-3 bg-emerald-50 rounded-md text-center w-[95%]">
            <h4 className="font-medium text-emerald-600 text-sm">Control</h4>
          </div>
          <div className="p-3 bg-white rounded-md text-center w-[95%]">
            <h4 className="font-medium text-gray-500 text-sm">Action</h4>
          </div>
        </div>
        
        {/* RACI Matrix Rows */}
        {raciData.roles.map((role, roleIndex) => (
          <div key={roleIndex} className="grid grid-cols-7 gap-2 mb-2 items-center">
            <div className="w-[95%]">
              <Input
                value={role.name || ""}
                onChange={(e) => updateRoleInfo(roleIndex, 'name', e.target.value)}
                placeholder="Name"
                className="w-full"
              />
            </div>
            
            {/* DMAIC Phase Columns */}
            {["define", "measure", "analyze", "improve", "control"].map((phase) => (
              <div key={phase} className="w-[95%] text-center">
                <Select
                  value={role.phases[phase as keyof typeof role.phases] || "null"}
                  onValueChange={(value) => updateRoleResponsibility(
                    roleIndex,
                    phase as keyof typeof role.phases,
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
            ))}
            
            {/* Action Column */}
            <div className="text-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRole(roleIndex)}
                      className="h-8 w-8"
                      disabled={false}
                    >
                      <Trash className="h-4 w-4" />
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